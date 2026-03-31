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
  };

  return map[code] || "No se pudo completar la acción. Inténtalo de nuevo.";
}
