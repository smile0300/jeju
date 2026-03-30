// worker.js
var ALLOWED_DOMAINS = [
  "apis.data.go.kr",
  // 기상청 날씨 API
  "jeju.go.kr",
  // 한라산 탐방로 정보 (스크래핑용)
  "openapi.airport.co.kr",
  // 공항공사 항공 정보 API
  "api.visitjeju.net",
  // 제주관광공사 축제/행사 API
  "123.140.197.51",
  // CCTV 스트리밍 서버 IP
  "hallacctv.kr",
  // 한라산 CCTV 스트리밍 서버 (Root)
  "www.hallacctv.kr"
  // 한라산 CCTV 스트리밍 서버 (Sub)
];
var ALLOWED_ORIGIN = "*";
var worker_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
          "Access-Control-Max-Age": "86400"
        }
      });
    }
    if (url.pathname === "/api/public-data" || url.searchParams.has("url")) {
      const targetUrlString = url.searchParams.get("endpoint") || url.searchParams.get("url");
      if (!targetUrlString) {
        return new Response("Missing target URL", {
          status: 400,
          headers: { "Access-Control-Allow-Origin": ALLOWED_ORIGIN }
        });
      }
      try {
        const targetUrl = new URL(targetUrlString);
        const isAllowed = ALLOWED_DOMAINS.some(
          (domain) => targetUrl.hostname === domain || targetUrl.hostname.endsWith("." + domain)
        );
        if (!isAllowed) {
          return new Response(`Forbidden: Target domain (${targetUrl.hostname}) not in whitelist`, {
            status: 403,
            headers: { "Access-Control-Allow-Origin": ALLOWED_ORIGIN }
          });
        }
        for (const [key, value] of url.searchParams) {
          if (key !== "endpoint" && key !== "url" && key !== "_") {
            targetUrl.searchParams.set(key, value);
          }
        }
        const isJsonExpected = url.searchParams.get("dataType") === "JSON" || targetUrl.searchParams.get("dataType") === "JSON" || targetUrlString.toLowerCase().includes("datatype=json") || targetUrlString.toLowerCase().includes("returntype=json");
        const hostname = targetUrl.hostname;
        if (hostname.includes("apis.data.go.kr") || hostname.includes("openapi.airport.co.kr") || hostname.includes("api.visitjeju.net")) {
          let serviceKey = env.SECRET_PUBLIC_DATA_KEY || env.PUBLIC_DATA_KEY;
          if (hostname.includes("api.visitjeju.net") && (env.VISIT_JEJU_KEY || env.SECRET_VIS_JEJU_KEY)) {
            serviceKey = env.VISIT_JEJU_KEY || env.SECRET_VIS_JEJU_KEY;
          }
          if (serviceKey) {
            const keyParam = hostname.includes("api.visitjeju.net") ? "apiKey" : "serviceKey";
            if (!targetUrl.searchParams.has(keyParam)) {
              try {
                targetUrl.searchParams.set(keyParam, decodeURIComponent(serviceKey.trim()));
              } catch (e) {
                targetUrl.searchParams.set(keyParam, serviceKey.trim());
              }
            }
          }
        }
        const headers = new Headers();
        if (isJsonExpected) {
          headers.set("Accept", "application/json, text/plain, */*");
        } else {
          headers.set("Accept", "application/xml, text/xml, */*");
        }
        headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
        const finalUrl = targetUrl.toString();
        const response = await fetch(finalUrl, {
          method: "GET",
          headers
        });
        if (!response.ok) {
          const errorBody = await response.text();
          return new Response(isJsonExpected ? JSON.stringify({ error: `Target API Error (${response.status})`, details: errorBody }) : errorBody, {
            status: response.status,
            headers: {
              "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
              "Content-Type": isJsonExpected ? "application/json" : "text/plain"
            }
          });
        }
        const newResponse = new Response(response.body, response);
        newResponse.headers.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
        newResponse.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        newResponse.headers.delete("Content-Security-Policy");
        newResponse.headers.delete("X-Frame-Options");
        return newResponse;
      } catch (e) {
        const errorMsg = `Proxy Error: ${e.message}`;
        const isJson = url.searchParams.get("dataType") === "JSON" || url.searchParams.get("endpoint")?.includes("dataType=JSON");
        return new Response(isJson ? JSON.stringify({ error: errorMsg }) : errorMsg, {
          status: 500,
          headers: {
            "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
            "Content-Type": isJson ? "application/json" : "text/plain"
          }
        });
      }
    }
    if (url.pathname.endsWith(".m3u8") || url.pathname.endsWith(".ts")) {
      const referer = request.headers.get("Referer");
      if (referer) {
        try {
          const refUrl = new URL(referer);
          const originalUrl = refUrl.searchParams.get("url");
          if (originalUrl) {
            const baseUrl = new URL(originalUrl);
            const parentPath = baseUrl.origin + baseUrl.pathname.substring(0, baseUrl.pathname.lastIndexOf("/") + 1);
            const finalFullUrl = parentPath + url.pathname.substring(1);
            const res = await fetch(finalFullUrl);
            const newRes = new Response(res.body, res);
            newRes.headers.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
            newRes.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
            newRes.headers.set("Access-Control-Allow-Headers", "*");
            return newRes;
          }
        } catch (e) {
          console.error(`[HLS Proxy Error] ${e.message}`);
        }
      }
    }
    if ((url.pathname === "/api/feature-request" || url.pathname === "/api/lost-report") && request.method === "POST") {
      try {
        const gasUrl = env.GAS_URL || env.SECRET_GAS_URL;
        if (!gasUrl) {
          return new Response(JSON.stringify({ error: "GAS_URL NOT CONFIGURED" }), {
            status: 500,
            headers: { "Access-Control-Allow-Origin": ALLOWED_ORIGIN, "Content-Type": "application/json" }
          });
        }
        const bodyText = await request.text();
        const gasResponse = await fetch(gasUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: bodyText
        });
        const result = await gasResponse.text();
        return new Response(result, {
          status: gasResponse.status,
          headers: { "Access-Control-Allow-Origin": ALLOWED_ORIGIN, "Content-Type": "application/json" }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500,
          headers: { "Access-Control-Allow-Origin": ALLOWED_ORIGIN, "Content-Type": "application/json" }
        });
      }
    }
    if (url.pathname === "/api/hallasan-status") {
      try {
        const targetUrl = "https://jeju.go.kr/hallasan/index.htm";
        const response = await fetch(targetUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          }
        });
        const html = await response.text();
        const blockPattern = /<dl[^>]*class="main-visit-list"[\s\S]*?<\/dl>/g;
        const namePattern = /<dt>(.*?)<\/dt>/;
        const statusPattern = /<dd[^>]*class="situation"[^>]*>(.*?)<\/dd>/;
        const results = [];
        let match;
        while ((match = blockPattern.exec(html)) !== null) {
          const nameMatch = namePattern.exec(match[0]);
          const statusMatch = statusPattern.exec(match[0]);
          if (nameMatch && statusMatch) {
            results.push({
              name: nameMatch[1].trim(),
              status: statusMatch[1].trim()
            });
          }
        }
        return new Response(JSON.stringify(results), {
          headers: {
            "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
            "Content-Type": "application/json; charset=utf-8"
          }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: `Server-side parsing failed: ${e.message}` }), {
          status: 500,
          headers: { "Access-Control-Allow-Origin": ALLOWED_ORIGIN, "Content-Type": "application/json" }
        });
      }
    }
    return new Response("Not Found", {
      status: 404,
      headers: { "Access-Control-Allow-Origin": ALLOWED_ORIGIN }
    });
  }
};
export {
  worker_default as default
};
//# sourceMappingURL=worker.js.map
