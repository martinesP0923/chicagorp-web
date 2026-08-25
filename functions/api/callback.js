import { createSessionCookie } from "../lib/session.js";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return Response.redirect(`${url.origin}/?acceso=denegado&paso=sin_code`, 302);
  }

  const redirectUri = `${url.origin}/api/callback`;

  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.DISCORD_CLIENT_ID,
      client_secret: env.DISCORD_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    const detalle = await tokenRes.text();
    return Response.redirect(
      `${url.origin}/?acceso=denegado&paso=token&status=${tokenRes.status}&detalle=${encodeURIComponent(detalle.slice(0, 200))}`,
      302
    );
  }
  const tokenData = await tokenRes.json();

  const userRes = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  if (!userRes.ok) {
    const detalle = await userRes.text();
    return Response.redirect(
      `${url.origin}/?acceso=denegado&paso=usuario&status=${userRes.status}&detalle=${encodeURIComponent(detalle.slice(0, 200))}`,
      302
    );
  }
  const user = await userRes.json();

  const memberRes = await fetch(
    `https://discord.com/api/guilds/${env.DISCORD_GUILD_ID}/members/${user.id}`,
    { headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}` } }
  );

  if (!memberRes.ok) {
    const detalle = await memberRes.text();
    return Response.redirect(
      `${url.origin}/?acceso=denegado&paso=miembro&status=${memberRes.status}&detalle=${encodeURIComponent(detalle.slice(0, 200))}`,
      302
    );
  }
  const member = await memberRes.json();

  const session = {
    id: user.id,
    username: user.username,
    roles: member.roles || [],
    exp: Date.now() + 1000 * 60 * 60 * 12,
  };
  const cookieValue = await createSessionCookie(session, env.SESSION_SECRET);

  const headers = new Headers();
  headers.append("Location", `${url.origin}/`);
  headers.append(
    "Set-Cookie",
    `chicagorp_session=${encodeURIComponent(
      cookieValue
    )}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=43200`
  );

  return new Response(null, { status: 302, headers });
}