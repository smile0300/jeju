export async function onRequest(context) {
  const { request, env } = context;
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

  try {
    const gasUrl = env.GAS_URL || env.SECRET_GAS_URL;
    if (!gasUrl) {
      return new Response(JSON.stringify([]), {
        headers: { 'Access-Control-Allow-Origin': ALLOWED_ORIGIN, 'Content-Type': 'application/json' }
      });
    }

    const gasResponse = await fetch(gasUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    const result = await gasResponse.text();
    return new Response(result, {
      headers: { 'Access-Control-Allow-Origin': ALLOWED_ORIGIN, 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
