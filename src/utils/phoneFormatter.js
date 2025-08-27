/**
 * Formatea un número de teléfono separando código de país y número local
 * @param {string} phoneNumber - Número completo (ej: "521234567890")
 * @returns {string} - Número formateado (ej: "Teléfono: +52 1234567890")
 */
export const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return 'Teléfono: No disponible';
  }

  // Limpiar el número (remover espacios, guiones, etc.)
  const cleanNumber = phoneNumber.replace(/\D/g, '');
  
  if (cleanNumber.length < 10) {
    return 'Teléfono: Formato inválido';
  }

  // Tomar los últimos 10 dígitos como número local
  const localNumber = cleanNumber.slice(-10);
  
  // Los dígitos restantes son el código de país
  const countryCode = cleanNumber.slice(0, -10);
  
  // Si no hay código de país, asumir que es México (+52)
  const finalCountryCode = countryCode || '52';
  
  // Formatear el número local para mejor legibilidad (ej: 1234 567 890)
  const formattedLocalNumber = localNumber.replace(/(\d{4})(\d{3})(\d{3})/, '$1$2$3');
  
  return `Teléfono: +${finalCountryCode} ${formattedLocalNumber}`;
};

/**
 * Ejemplos de uso:
 * formatPhoneNumber("521234567890") → "Teléfono: +52 1234567890"
 * formatPhoneNumber("11234567890") → "Teléfono: +1 1234567890"
 * formatPhoneNumber("1234567890") → "Teléfono: +52 1234567890"
 * formatPhoneNumber("") → "Teléfono: No disponible"
 */
