// src/controllers/handlers/textMessageHandler.js
/**
 * ═══════════════════════════════════════════════════════════════
 * 💬 TEXT MESSAGE HANDLER - Procesamiento de mensajes de texto
 * ═══════════════════════════════════════════════════════════════
 */

const sessionManager = require('../../utils/sessionManager');
const cache = require('../../utils/CacheManager');
const aiService = require('../../services/aiService');
const clientService = require('../../services/clientService');
const { limpiarTexto } = require('../../utils/textHelpers');
const { MENSAJES_PERSONALES, PALABRAS_INTENCION, SALUDOS_COMERCIALES } = require('../../config/constants');
const logger = require('../../middlewares/logger');

// Importar otros handlers
const commandHandler = require('./commandHandler');
const cartHandler = require('./cartHandler');
const orderHandler = require('./orderHandler');
const productDetectionHandler = require('./productDetectionHandler');

class TextMessageHandler {
    /**
     * Procesa el mensaje de texto y genera respuesta
     */
    async procesarMensaje(textoLower, textoOriginal, from, nombreContacto, client) {
        // Historial de pedidos
        if (textoLower.match(/mis pedidos|mi historial|historial|pedidos anteriores|ultimos pedidos/)) {
            return commandHandler.mostrarHistorial(from);
        }

        // Manejo de opciones múltiples de productos
        const carrito = sessionManager.obtenerCarrito(from);
        
        if (carrito.opciones_multiples && carrito.opciones_multiples.length > 0) {
            return productDetectionHandler.manejarSeleccion(textoOriginal, from);
        }

        // Confirmar productos temporales
        if (textoLower.match(/^(si|sí|ok|dale|confirmo si)$/)) {
            if (carrito.temporal && carrito.temporal.length > 0) {
                sessionManager.marcarSesionActiva(from, 'pedido');
                return cartHandler.agregarAlCarrito(from);
            }
        }

        // Cancelar productos temporales
        if (textoLower.match(/^(no|nope|cancel)$/)) {
            if (carrito.temporal && carrito.temporal.length > 0) {
                carrito.temporal = [];
                sessionManager.actualizarCarrito(from, carrito);
                sessionManager.limpiarSesion(from);
                return `❌ Pedido cancelado.\n\nPuedes hacer otro pedido cuando quieras.`;
            }
        }

        // Ver carrito
        if (textoLower.match(/ver carrito|mi carrito|carrito|mi pedido/)) {
            sessionManager.marcarSesionActiva(from, 'consulta_carrito');
            return cartHandler.mostrarCarrito(from);
        }
        
        // Confirmar pedido final
        if (textoLower.match(/^(confirmar|confirmo|si confirmo|ok confirmo)$/)) {
            return await orderHandler.confirmarPedido(from, nombreContacto);
        }
        
        // Cancelar carrito
        if (textoLower.match(/cancelar|vaciar|borrar carrito|limpiar carrito/)) {
            sessionManager.limpiarSesion(from);
            return cartHandler.cancelarCarrito(from);
        }
        
        // Quitar producto del carrito
        if (textoLower.match(/quitar|eliminar|sacar/)) {
            const { extraerNumero } = require('../../utils/textHelpers');
            const numero = extraerNumero(textoOriginal);
            if (numero) {
                sessionManager.marcarSesionActiva(from, 'modificando_carrito');
                return cartHandler.quitarProducto(from, numero - 1);
            }
        }

        // Elegir tipo de entrega
        if (textoLower.match(/^[12]$/)) {
            const respuestaEntrega = await orderHandler.procesarOpcionEntrega(from, textoLower, nombreContacto);
            if (respuestaEntrega) {
                sessionManager.limpiarSesion(from);
                return respuestaEntrega;
            }
        }

        // Lista de precios / catálogo
        if (textoLower.match(/lista|precio|catalogo|que tienen|que venden|productos|menu/)) {
            return commandHandler.mostrarCatalogo();
        }

        // Saludos
        if (textoLower.match(/^(hola|buenas|buenos dias|buenas tardes|buenas noches|hey|hi)$/)) {
            return commandHandler.generarSaludo(from, nombreContacto);
        }

        // Horarios
        if (textoLower.match(/horario|hora|atencion|abren|cierran|abierto/)) {
            return commandHandler.mostrarHorarios(from);
        }

        // Ubicación
        if (textoLower.match(/ubicacion|direccion|donde|local|negocio|como llego/)) {
            return commandHandler.mostrarUbicacion(from);
        }

        // Medios de pago
        if (textoLower.match(/pago|efectivo|tarjeta|transfer|mercadopago|debito|credito/)) {
            return commandHandler.mostrarMediosPago(from);
        }

        // Contacto
        if (textoLower.match(/contacto|telefono|whatsapp|llamar/)) {
            return commandHandler.mostrarContacto(from);
        }

        // Detectar productos en el texto
        const productosDetectados = productDetectionHandler.detectarProductos(textoOriginal);
        
        if (productosDetectados.length > 0) {
            sessionManager.marcarSesionActiva(from, 'seleccionando_productos');
            return productDetectionHandler.procesarDeteccion(from, productosDetectados);
        }

        // Consulta de stock
        if (textoLower.match(/stock|hay|tienen|disponible|queda|quedan/)) {
            return commandHandler.mostrarInfoStock(from);
        }

        // Si no coincide con nada, usar IA
        logger.info('🤖 Mensaje no coincide con patrones. Intentando con IA...');
        
        const respuestaIA = await aiService.procesarMensaje(textoOriginal, {
            nombre: nombreContacto,
            telefono: from,
            historial: clientService.obtenerPorTelefono(from)
        });
        
        if (respuestaIA) {
            sessionManager.marcarSesionActiva(from, 'consulta_ia');
            return respuestaIA;
        }

        // Respuesta por defecto
        return `No entendí bien tu consulta 🤔\n\n` +
               `Puedes preguntarme sobre:\n` +
               `• Precios y productos\n` +
               `• Hacer un pedido (ej: "Quiero 2 cuadernos")\n` +
               `• Ver mis pedidos anteriores\n` +
               `• Horarios de atención\n` +
               `• Ubicación del local\n` +
               `• Stock disponible\n` +
               `• Medios de pago\n\n` +
               `¿En qué te puedo ayudar?`;
    }

    /**
     * Verifica si el mensaje es comercial (relacionado al negocio)
     */
    verificarMensajeNegocio(texto) {
        const textoLimpio = limpiarTexto(texto);
        
        // Filtrar mensajes personales cortos
        const palabras = textoLimpio.split(' ').filter(p => p.length > 0);
        
        if (palabras.length <= 3) {
            const esSoloPersonal = MENSAJES_PERSONALES.some(personal => 
                textoLimpio === personal.toLowerCase() || 
                textoLimpio === personal.toLowerCase().replace(/\s/g, '')
            );
            
            if (esSoloPersonal) {
                return false;
            }
        }
        
        // Verificar palabras de intención
        const tieneIntencion = PALABRAS_INTENCION.some(palabra => 
            textoLimpio.includes(palabra)
        );
        
        // Verificar productos específicos
        const palabrasClave = cache.obtenerPalabrasClaveSync();
        const tieneProducto = (palabrasClave.palabras_productos || []).some(producto => {
            const productoLimpio = limpiarTexto(producto);
            return textoLimpio.includes(productoLimpio);
        });
        
        // Verificar saludos comerciales
        const tieneSaludoComercial = SALUDOS_COMERCIALES.some(saludo => 
            textoLimpio.includes(saludo)
        );
        
        return tieneIntencion || tieneProducto || tieneSaludoComercial;
    }
}

module.exports = new TextMessageHandler();