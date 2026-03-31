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

## Git y GitHub

El remoto configurado es [map-financial-advisors](https://github.com/LuisCalvo-Chino/map-financial-advisors.git). La rama local `main` puede estar enlazada a la rama remota **`MAP-FinancialAdvisors`** (por un conflicto previo en GitHub: existía una rama mal nombrada `main/ChinoPCMasterWebSite` que impedía usar `main` en el remoto).

Para dejar el remoto “limpio” y usar solo `main`:

1. En GitHub: **Settings → General → Default branch** → elige `MAP-FinancialAdvisors` (o otra rama válida).
2. Elimina la rama **`main/ChinoPCMasterWebSite`** desde la pestaña **Branches**.
3. Opcional: renombra `MAP-FinancialAdvisors` a `main` en GitHub y ejecuta `git branch --set-upstream-to=origin/main main` en tu PC.

Para subir cambios después del primer push puedes usar `push_map.bat` en la raíz del proyecto.

## Licencia y uso

Uso interno / MAP salvo que se indique lo contrario.
