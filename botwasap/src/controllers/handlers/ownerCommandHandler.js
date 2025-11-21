// src/controllers/handlers/ownerCommandHandler.js
/**
 * ═══════════════════════════════════════════════════════════════
 * 👑 OWNER COMMAND HANDLER - Comandos exclusivos del dueño
 * ═══════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');
const cache = require('../../utils/CacheManager');
const clientService = require('../../services/clientService');
const aiService = require('../../services/aiService');
const logger = require('../../middlewares/logger');
const { formatearFecha } = require('../../utils/textHelpers');

class OwnerCommandHandler {
    constructor() {
        this.negocioPath = path.join(__dirname, '../../../data/negocio.json');
    }

    /**
     * Procesa comandos del dueño
     */
    async handle(textoLower, negocioData) {
        // Pausar bot
        if (textoLower.match(/pausar bot|pausar respuestas|apagar bot|desactivar bot/)) {
            return this.pausarBot(negocioData);
        }
        
        // Reanudar bot
        if (textoLower.match(/reanudar bot|reanudar respuestas|activar bot|encender bot/)) {
            return this.reanudarBot(negocioData);
        }
        
        // Activar IA
        if (textoLower.match(/activar ia|ia on|encender ia/)) {
            return this.activarIA();
        }
        
        // Desactivar IA
        if (textoLower.match(/desactivar ia|ia off|apagar ia/)) {
            return this.desactivarIA();
        }
        
        // Estado del bot
        if (textoLower.match(/estado del bot|estado bot|bot estado/)) {
            return this.estadoBot(negocioData);
        }
        
        // Activar notificaciones
        if (textoLower.match(/activar notificaciones|notificaciones on|encender notificaciones/)) {
            return this.activarNotificaciones(negocioData);
        }
        
        // Desactivar notificaciones
        if (textoLower.match(/desactivar notificaciones|notificaciones off|apagar notificaciones/)) {
            return this.desactivarNotificaciones(negocioData);
        }
        
        // Estadísticas
        if (textoLower.match(/estadisticas|stats|resumen/)) {
            return this.mostrarEstadisticas();
        }
        
        return null;
    }

    pausarBot(negocioData) {
        negocioData.respuestas_automaticas_activas = false;
        this.guardarNegocio(negocioData);
        
        logger.info('⏸️ Respuestas automáticas PAUSADAS por el dueño');
        
        return `⏸️ *RESPUESTAS AUTOMÁTICAS PAUSADAS*\n\n` +
               `El bot NO responderá a los clientes.\n` +
               `Tú puedes seguir controlándolo.\n\n` +
               `Para reanudar: "reanudar bot"`;
    }

    reanudarBot(negocioData) {
        negocioData.respuestas_automaticas_activas = true;
        this.guardarNegocio(negocioData);
        
        logger.info('▶️ Respuestas automáticas REACTIVADAS por el dueño');
        
        return `▶️ *RESPUESTAS AUTOMÁTICAS REACTIVADAS*\n\n` +
               `El bot volverá a responder a los clientes automáticamente.\n\n` +
               `Para pausar: "pausar bot"`;
    }

    activarIA() {
        aiService.setActivo(true);
        return `🤖 *IA ACTIVADA*\n\n` +
               `El bot usará Groq IA para responder consultas complejas.\n\n` +
               `Para desactivar: "desactivar ia"`;
    }

    desactivarIA() {
        aiService.setActivo(false);
        return `🔴 *IA DESACTIVADA*\n\n` +
               `El bot solo usará respuestas predefinidas.\n\n` +
               `Para activar: "activar ia"`;
    }

    estadoBot(negocioData) {
        const estadoRespuestas = negocioData.respuestas_automaticas_activas ? '▶️ ACTIVAS' : '⏸️ PAUSADAS';
        const estadoNotificaciones = negocioData.notificaciones_activas ? '✅ ACTIVADAS' : '🔕 DESACTIVADAS';
        const estadoIA = aiService.estaActivo() ? '🤖 ACTIVADA' : '🔴 DESACTIVADA';
        
        return `🤖 *ESTADO DEL BOT*\n\n` +
               `━━━━━━━━━━━━━━━━━━━━━\n` +
               `🔄 Respuestas automáticas: ${estadoRespuestas}\n` +
               `🔔 Notificaciones: ${estadoNotificaciones}\n` +
               `🤖 Inteligencia Artificial: ${estadoIA}\n` +
               `📸 Imágenes: ✅ ACTIVADAS\n` +
               `━━━━━━━━━━━━━━━━━━━━━\n\n` +
               `*Comandos disponibles:*\n` +
               `• "pausar bot" - Pausar respuestas\n` +
               `• "reanudar bot" - Reanudar respuestas\n` +
               `• "activar ia" / "desactivar ia"\n` +
               `• "activar notificaciones"\n` +
               `• "desactivar notificaciones"\n` +
               `• "estadisticas"`;
    }

    activarNotificaciones(negocioData) {
        negocioData.notificaciones_activas = true;
        this.guardarNegocio(negocioData);
        
        return `✅ *Notificaciones ACTIVADAS*\n\n` +
               `Recibirás un mensaje automático cada vez que un cliente confirme un pedido.\n\n` +
               `Para desactivar: "desactivar notificaciones"`;
    }

    desactivarNotificaciones(negocioData) {
        negocioData.notificaciones_activas = false;
        this.guardarNegocio(negocioData);
        
        return `🔕 *Notificaciones DESACTIVADAS*\n\n` +
               `Ya no recibirás mensajes automáticos de nuevos pedidos.\n\n` +
               `Para activar: "activar notificaciones"`;
    }

    mostrarEstadisticas() {
        const stats = clientService.obtenerEstadisticas();
        const pedidosData = cache.obtenerPedidosSync();
        
        let respuesta = `📊 *ESTADÍSTICAS DEL NEGOCIO*\n\n`;
        respuesta += `━━━━━━━━━━━━━━━━━━━━━\n`;
        respuesta += `👥 Total clientes: ${stats.total_clientes}\n`;
        respuesta += `📦 Total pedidos: ${stats.total_pedidos}\n`;
        respuesta += `💰 Total vendido: $${stats.total_vendido}\n`;
        respuesta += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
        
        if (pedidosData.pedidos.length > 0) {
            const ultimoPedido = pedidosData.pedidos[pedidosData.pedidos.length - 1];
            respuesta += `📄 *Último pedido:*\n`;
            respuesta += `• ${ultimoPedido.id} - ${ultimoPedido.nombre}\n`;
            respuesta += `• $${ultimoPedido.total} - ${formatearFecha(ultimoPedido.fecha)}\n\n`;
        }
        
        respuesta += `💡 Comandos disponibles:\n`;
        respuesta += `• "activar notificaciones"\n`;
        respuesta += `• "desactivar notificaciones"\n`;
        respuesta += `• "estado notificaciones"\n`;
        respuesta += `• "activar ia" / "desactivar ia"`;
        
        return respuesta;
    }

    guardarNegocio(negocioData) {
        fs.writeFileSync(this.negocioPath, JSON.stringify(negocioData, null, 2));
        cache.invalidarNegocio();
    }
}

module.exports = new OwnerCommandHandler();