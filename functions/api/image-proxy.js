export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const ALLOWED_ORIGIN = '*';
  
  const fileId = url.searchParams.get('id');
  if (!fileId || !/^[a-zA-Z0-9_-]{10,100}$/.test(fileId)) {
    return new Response('Missing or invalid Google Drive file ID', { status: 400, headers: { 'Access-Control-Allow-Origin': ALLOWED_ORIGIN } });
  }

  const driveUrls = [
    `https://drive.google.com/uc?export=view&id=${fileId}`,
    `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`
  ];

  for (const driveUrl of driveUrls) {
    try {
      const res = await fetch(driveUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, redirect: 'follow' });
      if (!res.ok) continue;

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/html')) continue;

      const resHeaders = new Headers();
      resHeaders.set('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
      resHeaders.set('Content-Type', contentType || 'image/jpeg');
      resHeaders.set('Cache-Control', 'public, max-age=21600, stale-while-revalidate=3600');

      return new Response(res.body, { status: 200, headers: resHeaders });
    } catch (e) {}
  }

  return new Response('Image not found or not public', { status: 404, headers: { 'Access-Control-Allow-Origin': ALLOWED_ORIGIN } });
}
