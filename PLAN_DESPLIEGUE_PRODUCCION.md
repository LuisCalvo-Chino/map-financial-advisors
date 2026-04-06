# Plan de Despliegue a Producción (Paso a Paso Detallado)

Este documento es tu guía definitiva, clic a clic, para publicar tu plataforma MAP en internet utilizando tu proyecto de Vercel existente y GitHub Pages, sin pagar suscripciones.

---

## 📋 PREPARACIÓN: Conoce tus URLs
Antes de empezar, ten a mano estas dos URLs (anótalas en un bloc de notas):
1. **URL de tu Frontend (GitHub Pages):** 'https://github.com/LuisCalvo-Chino/map-financial-advisors.git'
2. **URL de tu Backend (Vercel):** https://map-financial-advisors.vercel.app

---

## FASE 1: Configurar el Servidor de Correos (Vercel)
Vamos a decirle a tu proyecto de Vercel existente cuáles son las contraseñas reales y quién tiene permiso de usarlo.

1. Entra a [vercel.com](https://vercel.com/) e inicia sesión.
2. Haz clic en la tarjeta de tu proyecto (el que ya usabas para pruebas locales).
3. En el menú superior del proyecto, haz clic en la pestaña **"Settings"** (Configuración).
4. En el menú lateral izquierdo, haz clic en **"Environment Variables"** (Variables de Entorno).
5. Vamos a agregar los secretos uno por uno. Para cada uno, asegúrate de que estén marcadas las casillas de **"Production"**, **"Preview"** y **"Development"**.
   - Haz clic en el campo **"Key"** y pega: `GOOGLE_GMAIL_CLIENT_ID`
   - Haz clic en el campo **"Value"** y pega el ID de cliente de Google (el que termina en `.apps.googleusercontent.com`).
   - Haz clic en el botón negro **"Save"**.
   - *Repite el proceso para los siguientes:*
   - **Key:** `GOOGLE_GMAIL_CLIENT_SECRET` | **Value:** Tu secreto de Google. -> **Save**
   - **Key:** `FIREBASE_PROJECT_ID` | **Value:** El ID de tu proyecto Firebase (ej. `webasesorpatrimonial`). -> **Save**
   - **Key:** `FIREBASE_CLIENT_EMAIL` | **Value:** El correo de la cuenta de servicio de Firebase (termina en `iam.gserviceaccount.com`). -> **Save**
   - **Key:** `FIREBASE_PRIVATE_KEY` | **Value:** Pega toda la llave privada exacta (incluyendo `-----BEGIN PRIVATE KEY-----` y los saltos de línea). -> **Save**
6. **EL PASO MÁS IMPORTANTE (CORS):**
   - **Key:** `ALLOWED_ORIGINS`
   - **Value:** Aquí debes poner la URL de tu localhost Y la de tu GitHub Pages, separadas por una coma y SIN barra al final (`/`).
   - *Ejemplo exacto:* `http://localhost:5173,https://tu-usuario.github.io`
   - Haz clic en **"Save"**.
   - **Key:** `GMAIL_OAUTH_REDIRECT_URI` | **Value:** La URI **exacta** del callback de Gmail en producción (la misma que en Google Cloud), por ejemplo `https://tu-usuario.github.io/tu-repo/gmail-oauth-callback.html`. En local puedes omitirla (el backend usa por defecto `http://localhost:5173/gmail-oauth-callback.html`). Esta variable la usa el envío automático de correos (`public-trigger`) al renovar tokens; si no coincide con la URI con la que conectaste Gmail, el refresh fallará fuera de tu PC.
7. **Aplicar los cambios:** Ve a la pestaña superior **"Deployments"**. Haz clic en los tres puntitos (`...`) a la derecha del despliegue más reciente y selecciona **"Redeploy"**. Deja las opciones por defecto y haz clic en el botón negro **"Redeploy"**. Espera a que termine.

---

## FASE 2: Configurar el Frontend para Producción (`.env.production`)
Le diremos a tu página web que, cuando esté en internet, no busque el backend en `localhost:3000`, sino en Vercel.

1. En tu editor de código (Cursor), ve a la carpeta principal del proyecto.
2. He renombrado automáticamente tu archivo `.env.public` a **`.env.production`** (este es el nombre exacto que exige el sistema Vite).
3. Abre el archivo **`.env.production`**.
4. Pega todas tus variables públicas de Firebase (las que empiezan con `VITE_FIREBASE_...`). Son las mismas que tienes en `.env.local`.
5. Al final del archivo, agrega la URL de tu backend en Vercel:
   - `VITE_GMAIL_BACKEND_URL=https://tu-url-de-vercel.vercel.app` (Reemplaza con tu URL real, SIN `/` al final).
6. Guarda el archivo (Ctrl+S).

---

## FASE 3: Dar Permisos en Google Cloud (Para el Login de Gmail)
Google necesita saber que tu nueva página web de GitHub Pages es segura y tiene permiso de abrir la ventana de login.

1. Ve a [Google Cloud Console](https://console.cloud.google.com/).
2. Asegúrate de estar en el proyecto correcto en el menú desplegable de arriba.
3. En el menú hamburguesa (arriba a la izquierda), ve a **"APIs y Servicios"** > **"Credenciales"**.
4. En la lista de "ID de cliente de OAuth 2.0", haz clic en el nombre de tu cliente (probablemente se llame "Cliente web 1" o similar).
5. En la sección **"Orígenes de JavaScript autorizados"**, haz clic en **"+ AGREGAR URI"**.
   - Pega la URL base de tu GitHub Pages: `https://tu-usuario.github.io` (Sin `/` al final).
6. En la sección **"URI de redireccionamiento autorizados"**, haz clic en **"+ AGREGAR URI"**.
   - Pega la ruta exacta al archivo de callback: `https://tu-usuario.github.io/MAPwebsite/gmail-oauth-callback.html` (Ajusta `MAPwebsite` si tu repositorio se llama diferente).
7. Haz clic en el botón azul **"GUARDAR"** al final de la página.

---

## FASE 4: Dar Permisos en Firebase (Para el Login de Usuarios)
Firebase también necesita confiar en tu dominio de GitHub Pages y Vercel.

1. Ve a [Firebase Console](https://console.firebase.google.com/).
2. Entra a tu proyecto (`webasesorpatrimonial`).
3. En el menú lateral izquierdo, haz clic en **"Authentication"** (Autenticación).
4. Haz clic en la pestaña superior **"Settings"** (Configuración).
5. En el menú lateral de configuración, haz clic en **"Authorized domains"** (Dominios autorizados).
6. Haz clic en el botón **"Add domain"** (Agregar dominio).
7. Escribe: `tu-usuario.github.io` (Sin `https://` ni `/`). Haz clic en **"Add"**.
8. Haz clic nuevamente en **"Add domain"**.
9. Escribe el dominio de tu Vercel: `tu-url-de-vercel.vercel.app` (Sin `https://` ni `/`). Haz clic en **"Add"**.

---

## FASE 5: Subir a Internet (¡El gran momento!)
Ahora que todo está configurado, vamos a subir el código.

1. En tu computadora, abre la terminal de tu proyecto.
2. Ejecuta tu script para guardar los cambios en GitHub:
   ```bash
   .\push_map.bat
   ```
   *(Escribe un mensaje como "Configuración de producción lista" y presiona Enter).*
3. Una vez que termine de subir a GitHub, ejecuta el comando mágico que compila tu código y lo sube a GitHub Pages:
   ```bash
   npm run deploy
   ```
4. Espera a que diga "Published".
5. Finalmente, sube las reglas de seguridad a la base de datos de Firebase ejecutando:
   ```bash
   npx firebase-tools deploy --only firestore
   ```

---

## 🎉 ¡COMPLETADO!
Tu plataforma está viva. Ve a tu URL de GitHub Pages, inicia sesión, conecta tu Gmail y prueba crear un formulario. ¡Todo debería funcionar perfectamente!