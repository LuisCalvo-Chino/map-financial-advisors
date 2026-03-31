# MAP — Ecosistema web

Portal y aplicaciones del ecosistema **MAP** (gestión patrimonial y acceso a webapps). El proyecto usa **Vite**, **Firebase** (autenticación y datos) y una interfaz alineada con la identidad visual de la marca.

## Requisitos

- Node.js LTS
- Cuenta y proyecto Firebase configurado

## Puesta en marcha

1. Clona el repositorio.
2. Copia `.env.example` a `.env.local` y completa las variables `VITE_FIREBASE_*` con los datos de tu consola Firebase.
3. Instala dependencias e inicia en desarrollo:

```bash
npm install
npm run dev
```

4. Build de producción:

```bash
npm run build
```

Los artefactos quedan en `dist/` (no se versionan).

## Seguridad

- **No subas** `.env`, `.env.local` ni claves al repositorio. Solo existe `.env.example` como plantilla sin secretos.
- Las variables expuestas al cliente deben usar el prefijo `VITE_` (comportamiento de Vite).

## Ámbito público vs privado

Este repositorio documenta la **carcasa del portal**, flujos de usuario, integración Firebase y, donde aplique, herramientas de apoyo. La **lógica operativa detallada de administración**, políticas internas y datos reales de clientes **no forman parte del código público** y deben mantenerse fuera del control de versiones o en entornos restringidos.

## Licencia y uso

Uso interno / MAP salvo que se indique lo contrario.
