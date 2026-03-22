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
        for (const [key, value] of url.searchParams) {
          if (key !== "endpoint" && key !== "url") {
            targetUrl.searchParams.set(key, value);
          }
        }
        if (targetUrl.hostname.includes("apis.data.go.kr") || targetUrl.hostname.includes("openapi.airport.co.kr") || targetUrl.hostname.includes("api.visitjeju.net")) {
          let serviceKey = env.SECRET_PUBLIC_DATA_KEY || env.PUBLIC_DATA_KEY;
          if (targetUrl.hostname.includes("api.visitjeju.net") && (env.VISIT_JEJU_KEY || env.SECRET_VIS_JEJU_KEY)) {
            serviceKey = env.VISIT_JEJU_KEY || env.SECRET_VIS_JEJU_KEY;
          }
          if (serviceKey) {
            const keyParam = targetUrl.hostname.includes("api.visitjeju.net") ? "apiKey" : "serviceKey";
            if (!targetUrl.searchParams.has(keyParam)) {
              targetUrl.searchParams.set(keyParam, serviceKey);
            }
          }
        }
        const minimalHeaders = new Headers();
        if (targetUrl.hostname.includes("api.visitjeju.net")) {
          minimalHeaders.set("Accept", "application/json, text/plain, */*");
        } else {
          minimalHeaders.set("Accept", "application/xml, text/xml, application/json, */*");
        }
        minimalHeaders.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
        const finalUrl = targetUrl.toString();
        const response = await fetch(finalUrl, {
          method: "GET",
          headers: minimalHeaders
        });
        const newResponse = new Response(response.body, response);
        newResponse.headers.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
        newResponse.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        return newResponse;
      } catch (e) {
        return new Response("Invalid URL format", { status: 400 });
      }
    }
    if ((url.pathname === "/api/feature-request" || url.pathname === "/api/lost-report") && request.method === "POST") {
      try {
        const gasUrl = env.GAS_URL || env.SECRET_GAS_URL;
        if (!gasUrl) {
          return new Response(JSON.stringify({ error: "GAS_URL secret is not configured in Worker" }), {
            status: 500,
            headers: {
              "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
              "Content-Type": "application/json"
            }
          });
        }
        const bodyText = await request.text();
        const gasResponse = await fetch(gasUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: bodyText
        });
        const resultText = await gasResponse.text();
        let isJson = true;
        try {
          JSON.parse(resultText);
        } catch (e) {
          isJson = false;
        }
        if (!gasResponse.ok || !isJson) {
          const errorMsg = !isJson ? `Non-JSON Response: ${resultText.slice(0, 100)}...` : `GAS Error Status: ${gasResponse.status}`;
          return new Response(JSON.stringify({
            error: errorMsg,
            status: "error",
            raw: isJson ? null : resultText.slice(0, 500)
            // 디버깅용
          }), {
            status: gasResponse.ok ? 400 : gasResponse.status,
            // JSON이 아니면 400, 상태 코드 에러면 해당 코드
            headers: {
              "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
              "Content-Type": "application/json"
            }
          });
        }
        return new Response(resultText, {
          headers: {
            "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
            "Content-Type": "application/json"
          }
        });
      } catch (e) {
        return new Response(JSON.stringify({
          error: e.message,
          stack: e.stack,
          type: "WORKER_INTERNAL_ERROR"
        }), {
          status: 500,
          headers: {
            "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
            "Content-Type": "application/json"
          }
        });
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
