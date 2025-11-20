// src/utils/sessionManager.js
/**
 * ═══════════════════════════════════════════════════════════════
 * 🧠 SESSION MANAGER - Gestión de sesiones de conversación
 * ═══════════════════════════════════════════════════════════════
 */

const { TIEMPO_EXPIRACION_SESION } = require('../config/constants');

class SessionManager {
    constructor() {
        this.sesionesActivas = new Map();
        this.carritos = {};
        this.timersCarrito = {};
    }

    /**
     * Marca una sesión como activa
     */
    marcarSesionActiva(from, tipo = 'conversacion') {
        this.sesionesActivas.set(from, {
            tipo: tipo,
            timestamp: Date.now()
        });
        
        // Auto-expiración
        setTimeout(() => {
            if (this.sesionesActivas.has(from)) {
                const sesion = this.sesionesActivas.get(from);
                if (Date.now() - sesion.timestamp >= TIEMPO_EXPIRACION_SESION) {
                    this.sesionesActivas.delete(from);
                    console.log(`🕐 Sesión expirada para: ${from}`);
                }
            }
        }, TIEMPO_EXPIRACION_SESION);
    }

    /**
     * Verifica si tiene sesión activa
     */
    tieneSesionActiva(from) {
        if (!this.sesionesActivas.has(from)) return false;
        
        const sesion = this.sesionesActivas.get(from);
        const tiempoTranscurrido = Date.now() - sesion.timestamp;
        
        if (tiempoTranscurrido >= TIEMPO_EXPIRACION_SESION) {
            this.sesionesActivas.delete(from);
            return false;
        }
        
        return true;
    }

    /**
     * Limpia una sesión
     */
    limpiarSesion(from) {
        this.sesionesActivas.delete(from);
    }

    /**
     * Obtiene el carrito de un usuario
     */
    obtenerCarrito(from) {
        if (!this.carritos[from]) {
            this.carritos[from] = {
                productos: [],
                temporal: []
            };
        }
        return this.carritos[from];
    }

    /**
     * Actualiza el carrito
     */
    actualizarCarrito(from, carrito) {
        this.carritos[from] = carrito;
    }

    /**
     * Elimina un carrito
     */
    eliminarCarrito(from) {
        delete this.carritos[from];
        
        if (this.timersCarrito[from]) {
            clearTimeout(this.timersCarrito[from]);
            delete this.timersCarrito[from];
        }
    }

    /**
     * Inicia timer de expiración de carrito
     */
    iniciarTimerCarrito(from, minutos = 15) {
        if (this.timersCarrito[from]) {
            clearTimeout(this.timersCarrito[from]);
        }
        
        this.timersCarrito[from] = setTimeout(() => {
            if (this.carritos[from]) {
                delete this.carritos[from];
                delete this.timersCarrito[from];
                console.log(`⏰ Carrito expirado para: ${from}`);
            }
        }, minutos * 60 * 1000);
    }

    /**
     * Limpia todas las sesiones y carritos
     */
    limpiarTodo() {
        this.sesionesActivas.clear();
        
        Object.keys(this.carritos).forEach(key => delete this.carritos[key]);
        
        Object.keys(this.timersCarrito).forEach(key => {
            clearTimeout(this.timersCarrito[key]);
            delete this.timersCarrito[key];
        });
        
        console.log('🧹 Todas las sesiones y carritos limpiados');
    }

    /**
     * Obtiene estadísticas
     */
    obtenerEstadisticas() {
        return {
            sesionesActivas: this.sesionesActivas.size,
            carritosActivos: Object.keys(this.carritos).length,
            timersActivos: Object.keys(this.timersCarrito).length
        };
    }
}

module.exports = new SessionManager();