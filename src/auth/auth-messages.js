/** @param {unknown} error */
export function firebaseAuthMessage(error) {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(/** @type {{ code?: string }} */ (error).code)
      : "";

  const map = {
    "auth/email-already-in-use":
      "Ese correo ya está registrado. Inicia sesión o usa otro email.",
    "auth/invalid-email": "El correo no tiene un formato válido.",
    "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
    "auth/user-disabled": "Esta cuenta fue deshabilitada. Contacta a MAP.",
    "auth/user-not-found": "No hay cuenta con ese correo.",
    "auth/wrong-password": "Contraseña incorrecta.",
    "auth/invalid-credential":
      "Correo o contraseña incorrectos. También puedes usar Google.",
    "auth/too-many-requests":
      "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.",
    "auth/popup-closed-by-user": "Inicio con Google cancelado.",
    "auth/network-request-failed": "Error de red. Revisa tu conexión.",
    "auth/credential-already-in-use": "Esta cuenta ya está vinculada a otro usuario.",
    "auth/account-exists-with-different-credential": "Ya existe una cuenta con este correo usando otro método.",
    "auth/unauthorized-domain":
      "Este dominio no está autorizado en Firebase. En la consola de Firebase: Autenticación → Configuración → Dominios autorizados, añade el dominio desde el que abres la web (por ejemplo tu-sitio.github.io o localhost).",
    "auth/operation-not-allowed":
      "Este método de acceso está desactivado en el proyecto. En Firebase: Autenticación → Método de inicio, activa Correo/contraseña o Google según corresponda.",
    "auth/popup-blocked":
      "El navegador bloqueó la ventana de Google. Permite ventanas emergentes para este sitio o prueba en otra ventana.",
    "auth/invalid-api-key":
      "La clave de API de Firebase no es válida o tiene restricciones. Revisa .env.local y, en Google Cloud, restricciones de la API key (referrers).",
    "auth/internal-error":
      "Error interno de autenticación. Prueba más tarde, otro navegador o borra datos del sitio.",
    "auth/missing-email": "Falta el correo electrónico.",
    "auth/missing-password": "Escribe tu contraseña.",
    "auth/requires-recent-login":
      "Por seguridad, cierra sesión y vuelve a entrar para continuar.",
  };

  if (map[code]) return map[code];

  const fallback =
    "No se pudo completar la acción. Inténtalo de nuevo.";
  if (code && code.startsWith("auth/")) {
    return `${fallback} (código técnico: ${code})`;
  }
  return fallback;
}
