export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const ALLOWED_DOMAINS = [
    'apis.data.go.kr', 'jeju.go.kr', 'openapi.airport.co.kr', 'api.visitjeju.net',
    'api.jejuits.go.kr', '123.140.197.51', '211.114.96.121', '211.34.191.215',
    '59.8.86.15', '119.65.216.155', 'hallacctv.kr', 'www.hallacctv.kr',
    '1.245.193.152', '59.8.86.94'
  ];
  const ALLOWED_ORIGIN = '*';

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Max-Age': '86400',
      }
    });
  }

  const targetUrlString = url.searchParams.get('endpoint') || url.searchParams.get('url');
  if (!targetUrlString) return new Response('Missing target URL', { status: 400, headers: { 'Access-Control-Allow-Origin': ALLOWED_ORIGIN } });

  try {
    const targetUrl = new URL(targetUrlString);
    const isAllowed = ALLOWED_DOMAINS.some(domain => targetUrl.hostname === domain || targetUrl.hostname.endsWith('.' + domain));
    if (!isAllowed) return new Response(`Forbidden: Target domain (${targetUrl.hostname}) not in whitelist`, { status: 403, headers: { 'Access-Control-Allow-Origin': ALLOWED_ORIGIN } });

    for (const [key, value] of url.searchParams) if (key !== 'endpoint' && key !== 'url' && key !== '_') targetUrl.searchParams.set(key, value);

    const hostname = targetUrl.hostname;
    if (hostname.includes('apis.data.go.kr') || hostname.includes('openapi.airport.co.kr') || hostname.includes('api.visitjeju.net') || hostname.includes('api.jejuits.go.kr')) {
      let serviceKey = env.SECRET_PUBLIC_DATA_KEY || env.PUBLIC_DATA_KEY;
      if (hostname.includes('api.visitjeju.net') && (env.VISIT_JEJU_KEY || env.SECRET_VIS_JEJU_KEY)) serviceKey = env.VISIT_JEJU_KEY || env.SECRET_VIS_JEJU_KEY;
      if (hostname.includes('api.jejuits.go.kr') && (env.ITS_KEY || env.SECRET_ITS_KEY)) serviceKey = env.ITS_KEY || env.SECRET_ITS_KEY;
      if (serviceKey) {
        const isMountainApi = hostname.includes('apis.data.go.kr') && targetUrlString.includes('mtweather');
        const keyParam = hostname.includes('api.visitjeju.net') ? 'apiKey' : (hostname.includes('api.jejuits.go.kr') ? 'authApiKey' : (isMountainApi ? 'ServiceKey' : 'serviceKey'));
        if (!targetUrl.searchParams.has(keyParam)) {
          const rawKey = serviceKey.trim();
          try { targetUrl.searchParams.set(keyParam, decodeURIComponent(rawKey)); } catch (e) { targetUrl.searchParams.set(keyParam, rawKey); }
        }
      }
    }

    const res = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: { 'Accept': '*/*', 'User-Agent': 'Mozilla/5.0' }
    });

    if (!res.ok) return new Response(await res.text(), { status: res.status, headers: { 'Access-Control-Allow-Origin': ALLOWED_ORIGIN } });

    const newHeaders = new Headers();
    newHeaders.set('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    for (const [key, value] of res.headers.entries()) {
      const lk = key.toLowerCase();
      if (lk !== 'content-encoding' && lk !== 'content-length' && lk !== 'transfer-encoding' && lk !== 'content-security-policy') newHeaders.set(key, value);
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/vnd.apple.mpegurl') || targetUrlString.toLowerCase().includes('.m3u8')) {
      const sourceText = await res.text();
      const proxyBase = new URL(request.url).origin + '/api/public-data?url=';
      const rewrittenLines = sourceText.split('\n').map(line => {
        const t = line.trim();
        if (t.length > 0 && !t.startsWith('#')) {
          try { return `${proxyBase}${encodeURIComponent(new URL(t, targetUrlString).href)}`; } catch (e) { return `${proxyBase}${encodeURIComponent(targetUrlString.substring(0, targetUrlString.lastIndexOf('/') + 1) + t)}`; }
        }
        return line;
      });
      newHeaders.set('Content-Type', 'application/vnd.apple.mpegurl');
      return new Response(rewrittenLines.join('\n'), { status: res.status, headers: newHeaders });
    }

    return new Response(res.body, { status: res.status, headers: newHeaders });
  } catch (e) {
    return new Response(`Proxy Error: ${e.message}`, { status: 500, headers: { 'Access-Control-Allow-Origin': ALLOWED_ORIGIN } });
  }
}
