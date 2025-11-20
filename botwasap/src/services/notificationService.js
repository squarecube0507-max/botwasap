// src/services/notificationService.js
/**
 * ═══════════════════════════════════════════════════════════════
 * 🔔 NOTIFICATION SERVICE - Gestión de notificaciones
 * ═══════════════════════════════════════════════════════════════
 */

const cache = require('../utils/CacheManager');
const { formatearFecha, limpiarTelefono } = require('../utils/textHelpers');
const logger = require('../middlewares/logger');

class NotificationService {
    constructor() {
        this.client = null;
    }

    /**
     * Inicializa el servicio con el cliente de WhatsApp
     */
    inicializar(whatsappClient) {
        this.client = whatsappClient;
        logger.info('✅ NotificationService inicializado');
    }

    /**
     * Verifica si las notificaciones están activas
     */
    estanActivas() {
        try {
            const negocio = cache.obtenerNegocioSync();
            return negocio.notificaciones_activas === true;
        } catch (error) {
            logger.error('❌ Error verificando estado de notificaciones:', error);
            return false;
        }
    }

    /**
     * Genera mensaje de notificación de pedido
     */
    generarMensajeNuevoPedido(pedido, telefonoCliente, nombreCliente) {
        const telefonoLimpio = limpiarTelefono(telefonoCliente);
        const whatsappLink = `https://wa.me/${telefonoLimpio}`;
        
        let mensaje = `🔔 *NUEVO PEDIDO RECIBIDO*\n\n`;
        mensaje += `━━━━━━━━━━━━━━━━━━━━━\n`;
        mensaje += `📄 *Pedido:* ${pedido.id}\n`;
        mensaje += `👤 *Cliente:* ${nombreCliente}\n`;
        mensaje += `📱 *Teléfono:* ${telefonoLimpio}\n`;
        mensaje += `📅 *Fecha:* ${formatearFecha(pedido.fecha)}\n`;
        mensaje += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
        
        mensaje += `📦 *PRODUCTOS:*\n`;
        pedido.productos.forEach((prod, index) => {
            mensaje += `${index + 1}. ${prod.nombre} x${prod.cantidad}\n`;
            mensaje += `   $${prod.precio_unitario} c/u = $${prod.subtotal}\n`;
        });
        
        mensaje += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
        mensaje += `💰 *Subtotal:* $${pedido.subtotal}\n`;
        
        if (pedido.descuento > 0) {
            mensaje += `🎁 *Descuento (${pedido.descuento_porcentaje}%):* -$${pedido.descuento}\n`;
            if (pedido.descuento_descripcion) {
                mensaje += `   ${pedido.descuento_descripcion}\n`;
            }
        }
        
        if (pedido.delivery > 0) {
            mensaje += `🚚 *Delivery:* +$${pedido.delivery}\n`;
        }
        
        mensaje += `━━━━━━━━━━━━━━━━━━━━━\n`;
        mensaje += `💰 *TOTAL:* $${pedido.total}\n\n`;
        
        mensaje += `🚚 *Entrega:* ${pedido.tipo_entrega === 'delivery' ? 'Delivery' : 'Retiro en local'}\n`;
        mensaje += `💳 *Estado de pago:* ${pedido.estado_pago || 'Pendiente'}\n`;
        mensaje += `✅ *Estado:* ${pedido.estado}\n\n`;
        
        mensaje += `━━━━━━━━━━━━━━━━━━━━━\n`;
        mensaje += `📲 *Para contactar al cliente:*\n`;
        mensaje += `${whatsappLink}\n\n`;
        mensaje += `💡 _Responde desde tu WhatsApp para coordinar._`;
        
        return mensaje;
    }

    /**
     * Envía notificación de nuevo pedido
     */
    async notificarNuevoPedido(pedido, telefonoCliente, nombreCliente) {
        try {
            if (!this.estanActivas()) {
                logger.debug('🔕 Notificaciones desactivadas');
                return { success: false, razon: 'Notificaciones desactivadas' };
            }

            if (!this.client) {
                logger.error('❌ Cliente de WhatsApp no inicializado');
                return { success: false, razon: 'Cliente no disponible' };
            }

            const mensaje = this.generarMensajeNuevoPedido(pedido, telefonoCliente, nombreCliente);
            const negocio = cache.obtenerNegocioSync();
            
            let notificacionEnviada = false;
            
            // Intentar enviar a grupo primero
            if (negocio.grupo_notificaciones && 
                negocio.grupo_notificaciones.trim() !== '' &&
                negocio.grupo_notificaciones.includes('@g.us')) {
                
                try {
                    await this.client.sendMessage(negocio.grupo_notificaciones, mensaje);
                    logger.info(`✅ Notificación enviada al grupo: ${pedido.id}`);
                    notificacionEnviada = true;
                } catch (errorGrupo) {
                    logger.warn(`⚠️ Error al enviar al grupo: ${errorGrupo.message}`);
                }
            }
            
            // Si no se envió al grupo, enviar a dueños individuales
            if (!notificacionEnviada) {
                const dueños = negocio.numeros_dueños || 
                              (negocio.numero_dueño ? [negocio.numero_dueño] : []);
                
                if (dueños.length === 0) {
                    logger.warn('⚠️ No hay números de dueños configurados');
                    return { success: false, razon: 'No hay destinatarios configurados' };
                }
                
                for (const numeroDueño of dueños) {
                    if (!numeroDueño || numeroDueño.trim() === '') continue;
                    
                    try {
                        await this.client.sendMessage(numeroDueño, mensaje);
                        logger.info(`✅ Notificación enviada a: ${numeroDueño}`);
                        notificacionEnviada = true;
                    } catch (errorIndividual) {
                        logger.error(`❌ Error al notificar a ${numeroDueño}: ${errorIndividual.message}`);
                    }
                }
            }
            
            if (!notificacionEnviada) {
                logger.warn('⚠️ No se pudo enviar notificación a ningún destinatario');
                return { success: false, razon: 'No se pudo enviar a ningún destinatario' };
            }
            
            return { success: true, pedidoId: pedido.id };
            
        } catch (error) {
            logger.error('❌ Error al enviar notificación:', error);
            return { success: false, razon: error.message };
        }
    }

    /**
     * Envía notificación personalizada
     */
    async enviarNotificacion(destinatario, mensaje) {
        try {
            if (!this.client) {
                throw new Error('Cliente de WhatsApp no inicializado');
            }

            await this.client.sendMessage(destinatario, mensaje);
            logger.info(`✅ Notificación personalizada enviada a: ${destinatario}`);
            
            return { success: true };
            
        } catch (error) {
            logger.error('❌ Error enviando notificación personalizada:', error);
            throw error;
        }
    }

    /**
     * Envía notificación masiva a múltiples destinatarios
     */
    async enviarNotificacionMasiva(destinatarios, mensaje, delay = 1000) {
        const resultados = {
            exitosos: 0,
            fallidos: 0,
            errores: []
        };

        for (const destinatario of destinatarios) {
            try {
                await this.enviarNotificacion(destinatario, mensaje);
                resultados.exitosos++;
                
                // Delay entre mensajes para evitar rate limit
                if (destinatario !== destinatarios[destinatarios.length - 1]) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            } catch (error) {
                resultados.fallidos++;
                resultados.errores.push({
                    destinatario,
                    error: error.message
                });
            }
        }

        logger.info(`📊 Notificación masiva completada: ${resultados.exitosos} exitosos, ${resultados.fallidos} fallidos`);
        
        return resultados;
    }
}

module.exports = new NotificationService();