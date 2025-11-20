// src/utils/textHelpers.js
/**
 * ═══════════════════════════════════════════════════════════════
 * 📝 TEXT HELPERS - Utilidades para manejo de texto
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * Normaliza texto para comparaciones (lowercase, sin acentos, sin espacios múltiples)
 */
function normalizarTexto(texto) {
    if (!texto) return '';
    
    return texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^_|_$/g, '');
}

/**
 * Formatea texto para display (capitaliza palabras, reemplaza _ por espacios)
 */
function formatearTexto(texto) {
    if (!texto) return '';
    
    return texto
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * Limpia texto para búsqueda (lowercase, sin acentos)
 */
function limpiarTexto(texto) {
    if (!texto) return '';
    
    return texto
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

/**
 * Extrae números de un texto
 */
function extraerNumero(texto) {
    const match = texto.match(/\d+/);
    return match ? parseInt(match[0]) : null;
}

/**
 * Extrae todos los números de un texto
 */
function extraerNumeros(texto) {
    const matches = texto.match(/\d+/g);
    return matches ? matches.map(n => parseInt(n)) : [];
}

/**
 * Formatea fecha ISO a formato legible
 */
function formatearFecha(isoString) {
    const fecha = new Date(isoString);
    const dia = String(fecha.getDate()).padStart(2, '0');
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const año = fecha.getFullYear();
    const hora = String(fecha.getHours()).padStart(2, '0');
    const minutos = String(fecha.getMinutes()).padStart(2, '0');
    
    return `${dia}/${mes}/${año} ${hora}:${minutos}`;
}

/**
 * Trunca texto con ellipsis
 */
function truncarTexto(texto, maxLength = 50) {
    if (!texto || texto.length <= maxLength) return texto;
    return texto.substring(0, maxLength) + '...';
}

/**
 * Valida si un texto es un número de teléfono
 */
function esTelefono(texto) {
    // Formato: 549XXXXXXXXXX@c.us
    return /^\d{10,15}@c\.us$/.test(texto);
}

/**
 * Limpia número de teléfono
 */
function limpiarTelefono(telefono) {
    return telefono.replace('@c.us', '').replace(/\D/g, '');
}

/**
 * Genera un slug desde un texto
 */
function generarSlug(texto) {
    return texto
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

module.exports = {
    normalizarTexto,
    formatearTexto,
    limpiarTexto,
    extraerNumero,
    extraerNumeros,
    formatearFecha,
    truncarTexto,
    esTelefono,
    limpiarTelefono,
    generarSlug
};