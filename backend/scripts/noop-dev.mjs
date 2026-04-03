/**
 * Vercel ejecuta `devCommand` al arrancar `vercel dev`. Si ese comando fuera
 * `npm run dev` y dev llamara otra vez a `vercel dev`, habría recursión.
 * Este script termina al instante: las rutas /api siguen sirviéndose con vercel dev.
 */
process.exit(0);
