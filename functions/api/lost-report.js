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

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const gasUrl = env.GAS_URL || env.SECRET_GAS_URL;
    if (!gasUrl) {
      return new Response(JSON.stringify({ error: 'GAS_URL NOT CONFIGURED' }), { status: 500 });
    }

    const bodyText = await request.text();
    const gasResponse = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: bodyText
    });

    const result = await gasResponse.text();
    return new Response(result, {
      headers: { 'Access-Control-Allow-Origin': ALLOWED_ORIGIN, 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
