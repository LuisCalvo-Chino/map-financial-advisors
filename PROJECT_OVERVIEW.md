# Ecosistema digital MAP — visión y arquitectura

Documento de referencia para el desarrollo del portal (shell + micro-frontends). Mantener la modularidad: `index.html` ligero; lógica en `src/`.

## 1. Objetivo general

Crear un **portal hub centralizador** para asesores patrimoniales (inversión, seguros y salud). El asesor no debe saltar entre pestañas dispersas; el portal integra las herramientas operativas mediante una arquitectura de **micro-frontends**.

## 2. Stack tecnológico

| Capa | Elección |
|------|-----------|
| Frontend | HTML5, CSS3 (brand MAP), JavaScript (ES modules) |
| Tooling | Vite (bundler / dev server) |
| Hosting previsto | GitHub Pages |
| Backend y seguridad | Firebase (Firestore + Auth) |
| Datos extendidos | Google Sheets vía Apps Script (reportes, formularios masivos) |

## 3. Arquitectura del sistema (el “shell”)

El proyecto **no** es una web estática: es un **contenedor inteligente**.

1. **Estado invitado (guest):** pantalla de login/registro sobria con estética MAP.
2. **Validación:** tras iniciar sesión (Google o correo), el shell consulta Firestore en `usuarios/{uid}`.
3. **Renderizado dinámico:**
   - El documento de usuario incluye un array `apps_activas`.
   - El shell resuelve cada id contra la colección `webapps`.
   - Se pinta una **cuadrícula de tarjetas** que enlazan a las sub-aplicaciones (URLs externas o rutas futuras).

## 4. Identidad de marca (brand)

- **Colores:** `#173862` (azul profundo), `#2a2c2c` (gris oscuro), `#f4f0ed` (crema), `#a89f8f` (oro mate).
- **Tipografía:** Gilroy (títulos) — en desarrollo se usa **Archivo** como alternativa libre si no hay licencia Gilroy; Montserrat (subtítulos); Poppins (cuerpo).
- **Estilo:** dark mode profesional, bordes redondeados suaves, transiciones discretas.

## 5. Funcionalidades críticas (roadmap)

- **Módulo de conexiones API:** panel para tokens OAuth2 (Instagram, Zoom, Facebook, Calendly), almacenamiento cifrado en `secure_vault/{uid}`.
- **Social media planner:** calendario con “horas pico” según redes conectadas.
- **Integración Sheets:** tablas como BD rápida (pólizas, leads).
- **Newsletter interno:** comunicación masiva desde el portal.

## 6. Estructura de datos (Firestore)

| Ruta | Contenido |
|------|-----------|
| `usuarios/{uid}` | Perfil, rol, `status`, `plan`, `apps_activas`, etc. |
| `webapps/{appId}` | Metadatos: título, icono, URL o ruta, estado, `es_gratuita` |
| `secure_vault/{uid}` | Bóveda de tokens de terceros (cifrado) |

**Registro de nuevos asesores:** el flujo actual permite alta con **correo y contraseña** o **Google** creando `usuarios/{uid}` con defaults de shell:

```text
rol: "usuario"
status: "active"
plan: { tipo: "free", fecha_inicio, fecha_vencimiento: null }
apps_activas: []
```

La **Consola de Administrador** (`apps/admin-console/`) es la app interna para ajustar rol, plan, suspensión y `apps_activas`.

## 7. Instrucción para quien desarrolla en Cursor

- Mantener **modularidad:** cada nueva capacidad debe poder tratarse como **web app independiente** que el shell descubre vía Firestore.
- Priorizar **seguridad** de tokens y datos (reglas Firestore, sin secretos en el repositorio; usar `.env.local` / CI secrets para `VITE_*`).
- Priorizar **estética MAP** en componentes CSS nuevos.

## 8. Cómo ejecutar el shell en local

```bash
npm install
npm run dev
```

Abre la URL que indique Vite (por ejemplo `http://localhost:5173`). Abrir solo `index.html` en el disco **no** carga los módulos ni las variables de entorno; para producción se usa `npm run build` y se sirve la carpeta `dist/` con hosting estático.

## 9. Estructura de carpetas (`src/`)

| Ruta | Rol |
|------|-----|
| `src/main-app.js` | Arranque: valida env, `auth.authStateReady()`, inicia el shell |
| `src/config/firebase-config.js` | Inicialización Firebase (solo se importa si hay `VITE_*`) |
| `src/auth/auth-handler.js` | Login, registro, `onAuthStateChanged`, orquestación guest / app |
| `src/auth/auth-messages.js` | Mensajes de error legibles (Auth) |
| `src/ui/ui-render.js` | HTML del home (login/registro) y del dashboard (grid webapps) |
| `src/ui/ui-shell.js` | Pantalla de carga inicial y aviso de configuración faltante |
| `src/data/user-schema.js` | Normalización de perfiles, reglas de planes y helpers de acceso |
