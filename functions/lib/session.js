async function getKey(secret) {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function base64UrlEncode(str) {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return atob(str);
}

export async function createSessionCookie(payloadObj, secret) {
  const payload = JSON.stringify(payloadObj);
  const payloadB64 = base64UrlEncode(payload);
  const key = await getKey(secret);
  const sigBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payloadB64)
  );
  const sigB64 = base64UrlEncode(
    String.fromCharCode(...new Uint8Array(sigBuffer))
  );
  return `${payloadB64}.${sigB64}`;
}

export async function verifySessionCookie(cookieValue, secret) {
  if (!cookieValue || !cookieValue.includes(".")) return null;
  const [payloadB64, sigB64] = cookieValue.split(".");
  const key = await getKey(secret);
  const sigBytes = Uint8Array.from(base64UrlDecode(sigB64), (c) =>
    c.charCodeAt(0)
  );
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    sigBytes,
    new TextEncoder().encode(payloadB64)
  );
  if (!valid) return null;
  try {
    const payload = JSON.parse(base64UrlDecode(payloadB64));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function readCookie(request, name) {
  const cookieHeader = request.headers.get("Cookie") || "";
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(name + "="));
  if (!match) return null;
  return decodeURIComponent(match.slice(name.length + 1));
}