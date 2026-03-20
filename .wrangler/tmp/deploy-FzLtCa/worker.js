// worker.js
var ALLOWED_DOMAINS = [
  "apis.data.go.kr",
  // 기상청 날씨 API
  "jeju.go.kr",
  // 한라산 탐방로 정보 (스크래핑용)
  "openapi.airport.co.kr",
  // 공항공사 항공 정보 API
  "123.140.197.51"
  // CCTV 스트리밍 서버 IP
];
var ALLOWED_ORIGIN = "https://jeju-9kn.pages.dev";
var worker_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/api/public-data" || url.searchParams.has("url")) {
      const targetUrlString = url.searchParams.get("endpoint") || url.searchParams.get("url");
      if (!targetUrlString) {
        return new Response("Missing target URL", { status: 400 });
      }
      try {
        const targetUrl = new URL(targetUrlString);
        const isAllowed = ALLOWED_DOMAINS.some(
          (domain) => targetUrl.hostname === domain || targetUrl.hostname.endsWith("." + domain)
        );
        if (!isAllowed) {
          return new Response("Forbidden: Target domain not in whitelist", { status: 403 });
        }
        let finalUrl = targetUrlString;
        if (targetUrl.hostname.includes("apis.data.go.kr") || targetUrl.hostname.includes("openapi.airport.co.kr")) {
          const separator = finalUrl.includes("?") ? "&" : "?";
          finalUrl += `${separator}serviceKey=${env.PUBLIC_DATA_KEY}`;
        }
        const response = await fetch(finalUrl, {
          method: request.method,
          headers: {
            "User-Agent": "Cloudflare-Worker-Jeju-Proxy"
          }
        });
        const newResponse = new Response(response.body, response);
        newResponse.headers.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
        newResponse.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        return newResponse;
      } catch (e) {
        return new Response("Invalid URL format", { status: 400 });
      }
    }
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }
    return new Response("Not Found", { status: 404 });
  }
};
export {
  worker_default as default
};
//# sourceMappingURL=worker.js.map
