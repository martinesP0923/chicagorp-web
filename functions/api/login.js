export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const redirectUri = `${url.origin}/api/callback`;

  const discordUrl = new URL("https://discord.com/api/oauth2/authorize");
  discordUrl.searchParams.set("client_id", env.DISCORD_CLIENT_ID);
  discordUrl.searchParams.set("redirect_uri", redirectUri);
  discordUrl.searchParams.set("response_type", "code");
  discordUrl.searchParams.set("scope", "identify");

  return Response.redirect(discordUrl.toString(), 302);
}