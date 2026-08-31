# Chicago Rp - Web

Página web del servidor con acceso por secciones según el rol de Discord del usuario.

## Estructura

```
index.html            → página pública de inicio
civil/index.html       → protegida, requiere rol "civil"
postulantes/index.html → protegida, requiere rol "postulante"
staff/index.html       → protegida, requiere rol "staff"
css/style.css          → estilos
functions/             → backend (corre en Cloudflare, nunca en el navegador)
  api/login.js          → inicia el login con Discord
  api/callback.js       → recibe la respuesta de Discord y crea la sesión
  api/logout.js         → cierra sesión
  lib/session.js        → firma y verifica la cookie de sesión
  staff/_middleware.js       → protege todo lo que está dentro de /staff/
  postulantes/_middleware.js → protege todo lo que está dentro de /postulantes/
  civil/_middleware.js       → protege todo lo que está dentro de /civil/
  por eso se debe revisar antes de publicar
```

## Cómo subir esto a GitHub (sin usar la terminal)

1. Entra a tu repositorio en GitHub.
2. Botón **"Add file"** → **"Upload files"**.
3. Arrastra la carpeta completa `chicagorp-web` (o todos sus archivos y
   subcarpetas) a la zona de subida. Los navegadores modernos (Chrome, Edge)
   mantienen las subcarpetas si arrastras la carpeta completa.
4. Abajo, escribe un mensaje como "Primera versión del sitio" y dale a
   **"Commit changes"**.

## Cómo publicarlo con Cloudflare Pages

1. Entra a https://dash.cloudflare.com → sección **"Workers & Pages"**.
2. **"Create application"** → pestaña **"Pages"** → **"Connect to Git"**.
3. Autoriza el acceso a tu cuenta de GitHub y selecciona el repositorio.
4. En la configuración de build:
   - Framework preset: **None**
   - Build command: (dejar vacío)
   - Build output directory: `/` (la raíz)
5. Antes de darle a "Save and Deploy", ve a **"Environment variables"** y
   agrega estas (todas como texto, no hace falta marcarlas como secretas
   excepto donde se indica):

   | Variable               | Valor                                                        |
   |-------------------------|--------------------------------------------------------------|
   | DISCORD_CLIENT_ID       | el Client ID de tu aplicación de Discord                    |
   | DISCORD_CLIENT_SECRET   | el Client Secret (márcala como **Secret**)                   |
   | DISCORD_BOT_TOKEN       | el token del bot (márcala como **Secret**)                   |
   | DISCORD_GUILD_ID        | el ID del servidor Chicago Rp                                |
   | SESSION_SECRET          | cualquier texto largo y aleatorio que tú inventes (ej. 40 caracteres) |
   | STAFF_ROLE_IDS          | IDs de rol de Staff, separados por coma si son varios        |
   | POSTULANTE_ROLE_IDS     | IDs de rol de Postulante, separados por coma si son varios   |
   | CIVIL_ROLE_IDS          | IDs de rol de Civil, separados por coma si son varios        |

6. Dale a **"Save and Deploy"**. Cloudflare te va a dar una URL como
   `https://chicagorp-web.pages.dev`.

## Último paso: conectar la URL con Discord

1. Vuelve a https://discord.com/developers/applications → tu aplicación →
   **OAuth2** → **General**.
2. En **"Redirects"**, agrega:
   `https://chicagorp-web.pages.dev/api/callback`
   (reemplaza por tu URL real de Cloudflare Pages, o tu dominio propio si
   conectas uno).
3. Guarda los cambios.

Con esto, cada vez que alguien entre a tu página y le dé a "Iniciar sesión
con Discord", el sistema va a revisar sus roles reales en el servidor y
mostrarle solo las secciones que le correspondan.

## Cómo agregar más roles o subniveles después

Cada sección protegida (`/staff/`, `/postulantes/`, `/civil/`) revisa una
lista de IDs de rol guardada en una variable de entorno de Cloudflare
(por ejemplo `STAFF_ROLE_IDS`). Para dar acceso a un rol nuevo a una
sección que ya existe, solo agrega su ID a esa variable, separado por coma.

Para crear una sección totalmente nueva (por ejemplo `/policia/` con su
propio rol), se copia el patrón de una carpeta protegida existente:
una carpeta con su `index.html` dentro de la raíz del proyecto, y una
carpeta con el mismo nombre dentro de `functions/` que tenga su propio
`_middleware.js` (copiando el de `staff` o `civil` y cambiando el nombre
de la variable de entorno que revisa). Cuando llegues a este punto,
puedo ayudarte a crearla.
