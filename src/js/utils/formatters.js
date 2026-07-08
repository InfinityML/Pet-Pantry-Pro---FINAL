/**
 * ============================================================================
 * UTILIDADES DE FORMATEO (DATA TRANSFORMATION)
 * ============================================================================
 */

/**
 * Formatea un número como moneda peruana (Soles)
 * @param {number} amount - Cantidad a formatear
 * @returns {string} String formateado (ej. "S/ 45.00")
 */
export const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-PE', {
        style: 'currency',
        currency: 'PEN',
        minimumFractionDigits: 2
    }).format(amount);
};

/**
 * Formatea un string ISO a fecha legible (ej. "14 de oct. 2026")
 * @param {string} isoString - Fecha en formato ISO
 * @returns {string} Fecha formateada
 */
export const formatDate = (isoString) => {
    if (!isoString) return 'Fecha no disponible';
    
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    }).format(date);
};

/**
 * Pone en mayúscula la primera letra de un texto
 * @param {string} text 
 */
export const capitalize = (text) => {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};