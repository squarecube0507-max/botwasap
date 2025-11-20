// src/services/whatsappService.js
/**
 * ═══════════════════════════════════════════════════════════════
 * 📱 WHATSAPP SERVICE - Operaciones de WhatsApp
 * ═══════════════════════════════════════════════════════════════
 */

const { MessageMedia } = require('whatsapp-web.js');
const logger = require('../middlewares/logger');

class WhatsAppService {
    constructor(client) {
        this.client = client;
    }

    /**
     * Envía un mensaje de texto
     */
    async enviarMensaje(destinatario, mensaje) {
        try {
            await this.client.sendMessage(destinatario, mensaje);
            logger.info(`✅ Mensaje enviado a ${destinatario}`);
            return { success: true };
        } catch (error) {
            logger.error(`❌ Error enviando mensaje a ${destinatario}:`, error);
            throw error;
        }
    }

    /**
     * Envía una imagen con caption
     */
    async enviarImagen(destinatario, imageUrl, caption = '') {
        try {
            const media = await MessageMedia.fromUrl(imageUrl);
            await this.client.sendMessage(destinatario, media, { caption });
            logger.info(`✅ Imagen enviada a ${destinatario}`);
            return { success: true };
        } catch (error) {
            logger.error(`❌ Error enviando imagen a ${destinatario}:`, error);
            throw error;
        }
    }

    /**
     * Envía múltiples imágenes
     */
    async enviarImagenes(destinatario, imageUrls, captions = []) {
        try {
            for (let i = 0; i < imageUrls.length; i++) {
                const caption = captions[i] || '';
                await this.enviarImagen(destinatario, imageUrls[i], caption);
                
                // Delay para evitar rate limit
                if (i < imageUrls.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            return { success: true };
        } catch (error) {
            logger.error(`❌ Error enviando imágenes:`, error);
            throw error;
        }
    }

    /**
     * Obtiene información de un contacto
     */
    async obtenerContacto(telefono) {
        try {
            const contact = await this.client.getContactById(telefono);
            return {
                id: contact.id._serialized,
                nombre: contact.pushname || contact.name || contact.number,
                numero: contact.number,
                esGrupo: contact.isGroup,
                esBloqueado: contact.isBlocked
            };
        } catch (error) {
            logger.error(`❌ Error obteniendo contacto ${telefono}:`, error);
            return null;
        }
    }

    /**
     * Obtiene todos los grupos
     */
    async obtenerGrupos() {
        try {
            const chats = await this.client.getChats();
            return chats.filter(chat => chat.isGroup).map(grupo => ({
                id: grupo.id._serialized,
                nombre: grupo.name,
                participantes: grupo.participants.length
            }));
        } catch (error) {
            logger.error(`❌ Error obteniendo grupos:`, error);
            return [];
        }
    }

    /**
     * Verifica si el cliente está conectado
     */
    estaConectado() {
        return this.client.info !== null;
    }

    /**
     * Obtiene información del cliente
     */
    obtenerInfo() {
        if (!this.client.info) return null;
        
        return {
            numero: this.client.info.wid.user,
            nombre: this.client.info.pushname,
            plataforma: this.client.info.platform
        };
    }
}

module.exports = WhatsAppService;