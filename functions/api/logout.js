export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const headers = new Headers();
  headers.append("Location", `${url.origin}/`);
  headers.append(
    "Set-Cookie",
    "chicagorp_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
  );
  return new Response(null, { status: 302, headers });
}