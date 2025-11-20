// src/utils/validators.js
/**
 * ═══════════════════════════════════════════════════════════════
 * ✅ VALIDATORS - Validaciones de datos
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * Valida si un string está vacío o solo tiene espacios
 */
function esVacio(valor) {
    return !valor || valor.trim() === '';
}

/**
 * Valida email
 */
function esEmailValido(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

/**
 * Valida teléfono (formato argentino)
 */
function esTelefonoValido(telefono) {
    const regex = /^(\+?54)?[\s-]?(\d{2,4})[\s-]?(\d{6,8})$/;
    return regex.test(telefono);
}

/**
 * Valida número positivo
 */
function esNumeroPositivo(numero) {
    return !isNaN(numero) && Number(numero) > 0;
}

/**
 * Valida rango de números
 */
function enRango(numero, min, max) {
    const num = Number(numero);
    return !isNaN(num) && num >= min && num <= max;
}

/**
 * Valida URL
 */
function esUrlValida(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * Valida precio
 */
function esPrecioValido(precio) {
    const num = Number(precio);
    return !isNaN(num) && num > 0 && num < 999999999;
}

/**
 * Valida código de barras
 */
function esCodigoBarrasValido(codigo) {
    return /^\d{8,13}$/.test(codigo);
}

/**
 * Valida objeto con campos requeridos
 */
function validarCamposRequeridos(objeto, camposRequeridos) {
    const errores = [];
    
    for (const campo of camposRequeridos) {
        if (!objeto[campo] || (typeof objeto[campo] === 'string' && esVacio(objeto[campo]))) {
            errores.push(`El campo "${campo}" es requerido`);
        }
    }
    
    return {
        valido: errores.length === 0,
        errores
    };
}

/**
 * Sanitiza string (previene XSS básico)
 */
function sanitizarString(str) {
    if (!str) return '';
    
    return str
        .replace(/[<>]/g, '')
        .trim()
        .substring(0, 1000); // Limitar longitud
}

/**
 * Valida JSON
 */
function esJsonValido(str) {
    try {
        JSON.parse(str);
        return true;
    } catch {
        return false;
    }
}

module.exports = {
    esVacio,
    esEmailValido,
    esTelefonoValido,
    esNumeroPositivo,
    enRango,
    esUrlValida,
    esPrecioValido,
    esCodigoBarrasValido,
    validarCamposRequeridos,
    sanitizarString,
    esJsonValido
};