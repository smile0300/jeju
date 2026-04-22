export async function onRequest(context) {
  return new Response("pong", {
    headers: { "Content-Type": "text/plain" }
  });
}
