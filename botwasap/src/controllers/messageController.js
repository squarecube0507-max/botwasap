// src/controllers/messageController.js
/**
 * ═══════════════════════════════════════════════════════════════
 * 💬 MESSAGE CONTROLLER - Coordinador principal de mensajes
 * ═══════════════════════════════════════════════════════════════
 * REFACTORIZADO: Ahora es más limpio y delega responsabilidades
 */

const cache = require('../utils/CacheManager');
const sessionManager = require('../utils/sessionManager');
const clientService = require('../services/clientService');
const rateLimiter = require('../utils/rateLimiter');
const messageValidator = require('../validators/messageValidator');
const logger = require('../middlewares/logger');

// Handlers
const ownerCommandHandler = require('./handlers/ownerCommandHandler');
const textMessageHandler = require('./handlers/textMessageHandler');

class MessageController {
    /**
     * Maneja los mensajes entrantes (punto de entrada principal)
     */
    async handleMessage(msg, client, botIniciadoEn) {
        try {
            const from = msg.from;
            const texto = msg.body;
            const textoLower = texto.toLowerCase();
            const contacto = await msg.getContact();
            const nombreContacto = contacto.pushname || contacto.name || contacto.number || from;
            
            logger.info(`📨 Mensaje de: ${nombreContacto} (${from})`);
            logger.debug(`💬 Contenido: "${texto}"`);

            // ═══════════════════════════════════════════════════════════
            // PASO 1: VALIDACIONES BÁSICAS
            // ═══════════════════════════════════════════════════════════

            // Validar formato del mensaje
            if (!messageValidator.esMensajeValido(texto)) {
                logger.debug('🚫 IGNORADO: Mensaje vacío o inválido');
                return;
            }

            // Verificar si es mensaje antiguo
            const mensajeTimestamp = msg.timestamp * 1000;
            
            if (botIniciadoEn && mensajeTimestamp < botIniciadoEn) {
                const minutosAntes = Math.floor((botIniciadoEn - mensajeTimestamp) / 60000);
                logger.debug(`🚫 IGNORADO: Mensaje antiguo (${minutosAntes} minutos antes del inicio)`);
                
                if (sessionManager.tieneSesionActiva(from)) {
                    sessionManager.limpiarSesion(from);
                }
                return;
            }

            // ═══════════════════════════════════════════════════════════
            // PASO 2: FILTROS DE TIPO DE CHAT
            // ═══════════════════════════════════════════════════════════

            // Filtrar grupos
            if (from.endsWith('@g.us')) {
                logger.debug('🚫 IGNORADO: Mensaje de grupo');
                return;
            }
            
            // Filtrar broadcasts
            if (from === 'status@broadcast' || from.endsWith('@broadcast')) {
                logger.debug('🚫 IGNORADO: Broadcast/Estado');
                return;
            }
            
            // Solo chats individuales
            if (!from.endsWith('@c.us')) {
                logger.debug('🚫 IGNORADO: No es chat individual');
                return;
            }
            
            logger.debug('✅ CHAT INDIVIDUAL: Procesando mensaje');

            // ═══════════════════════════════════════════════════════════
            // PASO 3: RATE LIMITING (Anti-spam)
            // ═══════════════════════════════════════════════════════════

            const rateLimitResult = rateLimiter.verificarLimite(from);
            
            if (!rateLimitResult.allowed) {
                await msg.reply(rateLimitResult.mensaje);
                return;
            }

            // Enviar advertencia si está cerca del límite
            if (rateLimitResult.warning) {
                // No bloqueamos, pero enviamos advertencia
                logger.warn(`⚠️ Usuario cerca del límite: ${from}`);
            }

            // ═══════════════════════════════════════════════════════════
            // PASO 4: REGISTRAR/ACTUALIZAR CLIENTE
            // ═══════════════════════════════════════════════════════════

            try {
                clientService.registrarOActualizar(from, nombreContacto);
            } catch (error) {
                logger.error('❌ Error al registrar cliente:', error);
                // No bloqueamos el flujo por este error
            }

            // ═══════════════════════════════════════════════════════════
            // PASO 5: COMANDOS DEL DUEÑO
            // ═══════════════════════════════════════════════════════════

            const negocioData = cache.obtenerNegocioSync();
            
            if (from === negocioData.numero_dueño) {
                const respuestaComando = await ownerCommandHandler.handle(textoLower, negocioData);
                if (respuestaComando) {
                    await msg.reply(respuestaComando);
                    return;
                }
            }

            // ═══════════════════════════════════════════════════════════
            // PASO 6: VERIFICAR SI RESPUESTAS AUTOMÁTICAS ESTÁN ACTIVAS
            // ═══════════════════════════════════════════════════════════

            if (!negocioData.respuestas_automaticas_activas) {
                logger.debug('⏸️ IGNORADO: Respuestas automáticas pausadas');
                return;
            }

            // ═══════════════════════════════════════════════════════════
            // PASO 7: VERIFICAR LISTA NEGRA
            // ═══════════════════════════════════════════════════════════

            const contactosIgnorar = cache.obtenerContactosIgnorarSync();
            if (contactosIgnorar.contactos_ignorar.includes(from)) {
                logger.debug('🚫 IGNORADO: Contacto en lista negra');
                return;
            }

            // ═══════════════════════════════════════════════════════════
            // PASO 8: VERIFICAR SI ES MENSAJE COMERCIAL O TIENE SESIÓN
            // ═══════════════════════════════════════════════════════════

            const tieneSesion = sessionManager.tieneSesionActiva(from);
            const esMensajeNegocio = textMessageHandler.verificarMensajeNegocio(textoLower);
            
            if (!esMensajeNegocio && !tieneSesion) {
                logger.debug('🤷 IGNORADO: No contiene palabras de negocio/productos');
                return;
            }
            
            if (tieneSesion) {
                logger.debug('🧠 PROCESANDO: Cliente con conversación activa');
            } else {
                logger.debug('✅ PROCESANDO: Mensaje relacionado con negocio/productos');
            }

            // ═══════════════════════════════════════════════════════════
            // PASO 9: MARCAR SESIÓN ACTIVA Y PROCESAR MENSAJE
            // ═══════════════════════════════════════════════════════════

            sessionManager.marcarSesionActiva(from);
            
            const respuesta = await textMessageHandler.procesarMensaje(
                textoLower, 
                texto, 
                from, 
                nombreContacto, 
                client
            );
            
            if (respuesta) {
                await msg.reply(respuesta);
                logger.info('📤 Respuesta enviada correctamente');
            }

        } catch (error) {
            logger.error('❌ Error al procesar mensaje:', error);
            
            try {
                await msg.reply('❌ Ocurrió un error. Por favor intenta nuevamente en unos momentos.');
            } catch (replyError) {
                logger.error('❌ Error al enviar mensaje de error:', replyError);
            }
        }
    }
}

module.exports = new MessageController();