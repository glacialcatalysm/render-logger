    if (DISCORD_WEBHOOK_URL) {
        // Safe, non-blocking background task
        try { 
            // Switched to ipwho.is: Fast, open, supports secure HTTPS, and cloud-friendly
            const geoResponse = await fetch(`https://ipwho.is{clientIp}`); 
            const geoData = await geoResponse.json(); 

            // Map data layout from ipwho.is response
            // If the IP is invalid or local, it responds with success: false safely
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

            // Send the payload to Discord
            await fetch(DISCORD_WEBHOOK_URL, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(discordPayload) 
            }); 
        } catch (error) { 
            // Logs the explicit error stack trace to your console if it ever drops
            console.error("Background Logger Failed gracefully:", error); 
        } 
    } 
