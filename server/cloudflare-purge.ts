export async function purgeCloudflareCache(urls: string[]) {
    if (!urls.length) return;
    
    const zoneId = process.env.CLOUDFLARE_ZONE_ID;
    const token = process.env.CLOUDFLARE_API_TOKEN;
    
    if (!zoneId || !token) {
        console.warn("Cloudflare purge skipped: CLOUDFLARE_ZONE_ID or CLOUDFLARE_API_TOKEN not set in .env");
        return;
    }
    
    try {
        const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ files: urls })
        });
        
        if (!response.ok) {
            const data = await response.json();
            console.error("Cloudflare purge error:", data);
        } else {
            console.log("Cloudflare cache purged for:", urls);
        }
    } catch (e) {
        console.error("Cloudflare purge request failed:", e);
    }
}
