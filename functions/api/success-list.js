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
    // Hardcode the specific new GAS URL provided by the user
    const gasUrl = "https://script.google.com/macros/s/AKfycbyg_7wPmQwOtHrPXSHOaSm4Erwo7Z_Os5jgmNg-d32mxb6CCFNja9MbpvWFLEg7CDPk/exec";

    // Append ?action=success to query the SuccessStories tab
    const fetchUrl = new URL(gasUrl);
    fetchUrl.searchParams.append('action', 'success');

    const gasResponse = await fetch(fetchUrl.toString(), {
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
