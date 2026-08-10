/**
 * Base64Url Encode
 */
function base64url(source) {
  let encodedSource = btoa(source);
  encodedSource = encodedSource.replace(/=+$/, '');
  encodedSource = encodedSource.replace(/\+/g, '-');
  encodedSource = encodedSource.replace(/\//g, '_');
  return encodedSource;
}

/**
 * Get OAuth2 Access Token for Firebase
 * (Cloudflare Workers 환경에서 Web Crypto API를 사용하여 JWT 서명)
 */
export async function getAccessToken(serviceAccountJson) {
  const sa = typeof serviceAccountJson === 'string' ? JSON.parse(serviceAccountJson) : serviceAccountJson;
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };
  
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };
  
  const signatureInput = base64url(JSON.stringify(header)) + "." + base64url(JSON.stringify(claim));
  
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = sa.private_key.substring(pemHeader.length, sa.private_key.length - pemFooter.length - 1).replace(/\s/g, '');
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: { name: "SHA-256" } },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign(
    { name: "RSASSA-PKCS1-v1_5" },
    privateKey,
    new TextEncoder().encode(signatureInput)
  );
  
  const signatureBytes = new Uint8Array(signature);
  let binaryString = "";
  for (let i = 0; i < signatureBytes.length; i++) {
    binaryString += String.fromCharCode(signatureBytes[i]);
  }
  
  const jwt = signatureInput + "." + base64url(binaryString);
  
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });
  
  const data = await response.json();
  if (!data.access_token) {
    throw new Error('Failed to get access token: ' + JSON.stringify(data));
  }
  return data.access_token;
}

/**
 * Send FCM Message using HTTP v1 API
 * target: topic name OR 'token:xxxx' for direct token delivery
 */
export async function sendFCMMessage(accessToken, projectId, target, title, body) {
  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

  // token: 접두사면 토큰 직접 발송, 아니면 토픽 발송
  const messageTarget = target.startsWith('token:')
    ? { token: target.slice(6) }
    : { topic: target };

  const message = {
    message: {
      ...messageTarget,
      notification: { title, body },
      webpush: {
        fcm_options: { link: "https://jeju-live.com" }
      }
    }
  };

  console.log("FCM 발송 Payload:", JSON.stringify(message));

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(message)
  });

  const resultJson = await res.json();
  return { ...resultJson, _debugPayload: message };
}
