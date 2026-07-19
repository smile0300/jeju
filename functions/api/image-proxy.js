export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const ALLOWED_ORIGIN = '*';
  
  const fileId = url.searchParams.get('id');
  if (!fileId || !/^[a-zA-Z0-9_-]{10,100}$/.test(fileId)) {
    return new Response('Missing or invalid Google Drive file ID', { status: 400, headers: { 'Access-Control-Allow-Origin': ALLOWED_ORIGIN } });
  }

  // Google Drive heavily throttles or blocks requests from Cloudflare datacenter IPs.
  // Instead of fetching the image on the server, redirect the client to Google's highly reliable
  // lh3.googleusercontent.com edge network, which works cross-origin and avoids 403s.
  return new Response(null, {
    status: 302,
    headers: {
      'Location': `https://lh3.googleusercontent.com/d/${fileId}=w1000`,
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN
    }
  });
}
