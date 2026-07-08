/**
 * ============================================================================
 * REGLAS DE NEGOCIO Y VALIDACIÓN (BUSINESS LOGIC)
 * ============================================================================
 */

export const Validators = {
    /**
     * Valida que un DNI peruano tenga exactamente 8 dígitos numéricos
     * @param {string} dni 
     * @returns {boolean}
     */
    isValidDNI: (dni) => {
        const regex = /^[0-9]{8}$/;
        return regex.test(dni);
    },

    /**
     * Valida formato estándar de correo electrónico
     * @param {string} email 
     * @returns {boolean}
     */
    isValidEmail: (email) => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    },

    /**
     * Verifica que el campo no esté vacío o compuesto solo de espacios
     * @param {string} text 
     * @returns {boolean}
     */
    isNotEmpty: (text) => {
        return text !== null && text !== undefined && text.trim().length > 0;
    },

    /**
     * Valida tamaño de archivos (ej. para imágenes de mascotas)
     * @param {File} file - Objeto archivo del input
     * @param {number} maxMegabytes - Tamaño máximo permitido
     * @returns {boolean}
     */
    isValidFileSize: (file, maxMegabytes = 2) => {
        if (!file) return false;
        const sizeInMB = file.size / (1024 * 1024);
        return sizeInMB <= maxMegabytes;
    }
};