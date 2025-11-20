// src/controllers/messageController.js
/**
 * ═══════════════════════════════════════════════════════════════
 * 💬 MESSAGE CONTROLLER - Procesamiento de mensajes de WhatsApp
 * ═══════════════════════════════════════════════════════════════
 */

const cache = require('../utils/CacheManager');
const sessionManager = require('../utils/sessionManager');
const productService = require('../services/productService');
const clientService = require('../services/clientService');
const orderService = require('../services/orderService');
const aiService = require('../services/aiService');
const notificationService = require('../services/notificationService');
const { limpiarTexto, formatearFecha } = require('../utils/textHelpers');
const { 
    MENSAJES_PERSONALES, 
    PALABRAS_INTENCION, 
    SALUDOS_COMERCIALES,
    NUMEROS_TEXTO 
} = require('../config/constants');
const logger = require('../middlewares/logger');

class MessageController {
    /**
     * Maneja los mensajes entrantes
     */
    async handleMessage(msg, client, botIniciadoEn) {
        const from = msg.from;
        const texto = msg.body;
        const textoLower = texto.toLowerCase();
        const contacto = await msg.getContact();
        const nombreContacto = contacto.pushname || contacto.name || contacto.number || from;
        
        logger.info(`📨 Mensaje de: ${nombreContacto} (${from})`);
        logger.debug(`💬 Contenido: "${texto}"`);
        
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
        
        // Registrar/actualizar cliente
        clientService.registrarOActualizar(from, nombreContacto);
        
        // Comandos del dueño
        const negocioData = cache.obtenerNegocioSync();
        
        if (from === negocioData.numero_dueño) {
            const respuestaComando = await this.procesarComandoDueño(textoLower, negocioData);
            if (respuestaComando) {
                await msg.reply(respuestaComando);
                return;
            }
        }
        
        // Verificar si respuestas automáticas están activas
        if (!negocioData.respuestas_automaticas_activas) {
            logger.debug('⏸️ IGNORADO: Respuestas automáticas pausadas');
            return;
        }
        
        // Verificar lista negra
        const contactosIgnorar = cache.obtenerContactosIgnorarSync();
        if (contactosIgnorar.contactos_ignorar.includes(from)) {
            logger.debug('🚫 IGNORADO: Contacto en lista negra');
            return;
        }
        
        // Verificar si tiene sesión activa o es mensaje comercial
        const tieneSesion = sessionManager.tieneSesionActiva(from);
        const esMensajeNegocio = this.verificarMensajeNegocio(textoLower);
        
        if (!esMensajeNegocio && !tieneSesion) {
            logger.debug('🤷 IGNORADO: No contiene palabras de negocio/productos');
            return;
        }
        
        if (tieneSesion) {
            logger.debug('🧠 PROCESANDO: Cliente con conversación activa');
        } else {
            logger.debug('✅ PROCESANDO: Mensaje relacionado con negocio/productos');
        }
        
        sessionManager.marcarSesionActiva(from);
        
        try {
            const respuesta = await this.procesarMensaje(textoLower, texto, from, nombreContacto, client);
            
            if (respuesta) {
                await msg.reply(respuesta);
                logger.info('📤 Respuesta enviada correctamente');
            }
        } catch (error) {
            logger.error('❌ Error al procesar mensaje:', error);
            await msg.reply('❌ Ocurrió un error. Por favor intenta nuevamente.');
        }
    }

    /**
     * Procesa comandos del dueño
     */
    async procesarComandoDueño(textoLower, negocioData) {
        const fs = require('fs');
        const path = require('path');
        const negocioPath = path.join(__dirname, '../../data/negocio.json');
        
        // Pausar bot
        if (textoLower.match(/pausar bot|pausar respuestas|apagar bot|desactivar bot/)) {
            negocioData.respuestas_automaticas_activas = false;
            fs.writeFileSync(negocioPath, JSON.stringify(negocioData, null, 2));
            cache.invalidarNegocio();
            
            logger.info('⏸️ Respuestas automáticas PAUSADAS por el dueño');
            
            return `⏸️ *RESPUESTAS AUTOMÁTICAS PAUSADAS*\n\n` +
                   `El bot NO responderá a los clientes.\n` +
                   `Tú puedes seguir controlándolo.\n\n` +
                   `Para reanudar: "reanudar bot"`;
        }
        
        // Reanudar bot
        if (textoLower.match(/reanudar bot|reanudar respuestas|activar bot|encender bot/)) {
            negocioData.respuestas_automaticas_activas = true;
            fs.writeFileSync(negocioPath, JSON.stringify(negocioData, null, 2));
            cache.invalidarNegocio();
            
            logger.info('▶️ Respuestas automáticas REACTIVADAS por el dueño');
            
            return `▶️ *RESPUESTAS AUTOMÁTICAS REACTIVADAS*\n\n` +
                   `El bot volverá a responder a los clientes automáticamente.\n\n` +
                   `Para pausar: "pausar bot"`;
        }
        
        // Activar IA
        if (textoLower.match(/activar ia|ia on|encender ia/)) {
            aiService.setActivo(true);
            return `🤖 *IA ACTIVADA*\n\n` +
                   `El bot usará Groq IA para responder consultas complejas.\n\n` +
                   `Para desactivar: "desactivar ia"`;
        }
        
        // Desactivar IA
        if (textoLower.match(/desactivar ia|ia off|apagar ia/)) {
            aiService.setActivo(false);
            return `🔴 *IA DESACTIVADA*\n\n` +
                   `El bot solo usará respuestas predefinidas.\n\n` +
                   `Para activar: "activar ia"`;
        }
        
        // Estado del bot
        if (textoLower.match(/estado del bot|estado bot|bot estado/)) {
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
        
        // Activar notificaciones
        if (textoLower.match(/activar notificaciones|notificaciones on|encender notificaciones/)) {
            negocioData.notificaciones_activas = true;
            fs.writeFileSync(negocioPath, JSON.stringify(negocioData, null, 2));
            cache.invalidarNegocio();
            
            return `✅ *Notificaciones ACTIVADAS*\n\n` +
                   `Recibirás un mensaje automático cada vez que un cliente confirme un pedido.\n\n` +
                   `Para desactivar: "desactivar notificaciones"`;
        }
        
        // Desactivar notificaciones
        if (textoLower.match(/desactivar notificaciones|notificaciones off|apagar notificaciones/)) {
            negocioData.notificaciones_activas = false;
            fs.writeFileSync(negocioPath, JSON.stringify(negocioData, null, 2));
            cache.invalidarNegocio();
            
            return `🔕 *Notificaciones DESACTIVADAS*\n\n` +
                   `Ya no recibirás mensajes automáticos de nuevos pedidos.\n\n` +
                   `Para activar: "activar notificaciones"`;
        }
        
        // Estadísticas
        if (textoLower.match(/estadisticas|stats|resumen/)) {
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
        
        return null;
    }

    /**
     * Verifica si el mensaje es comercial
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

    /**
     * Procesa el mensaje y genera respuesta
     */
    async procesarMensaje(textoLower, textoOriginal, from, nombreContacto, client) {
        // Historial de pedidos
        if (textoLower.match(/mis pedidos|mi historial|historial|pedidos anteriores|ultimos pedidos/)) {
            return this.mostrarHistorialCliente(from);
        }

        // Manejo de opciones múltiples de productos
        const carrito = sessionManager.obtenerCarrito(from);
        
        if (carrito.opciones_multiples && carrito.opciones_multiples.length > 0) {
            return this.manejarSeleccionProducto(textoOriginal, from);
        }

        // Confirmar productos temporales
        if (textoLower.match(/^(si|sí|ok|dale|confirmo si)$/)) {
            if (carrito.temporal && carrito.temporal.length > 0) {
                sessionManager.marcarSesionActiva(from, 'pedido');
                return this.agregarAlCarrito(from);
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
            return this.mostrarCarrito(from);
        }
        
        // Confirmar pedido final
        if (textoLower.match(/^(confirmar|confirmo|si confirmo|ok confirmo)$/)) {
            return await this.confirmarPedido(from, nombreContacto);
        }
        
        // Cancelar carrito
        if (textoLower.match(/cancelar|vaciar|borrar carrito|limpiar carrito/)) {
            sessionManager.limpiarSesion(from);
            return this.cancelarCarrito(from);
        }
        
        // Quitar producto del carrito
        if (textoLower.match(/quitar|eliminar|sacar/)) {
            const { extraerNumero } = require('../utils/textHelpers');
            const numero = extraerNumero(textoOriginal);
            if (numero) {
                sessionManager.marcarSesionActiva(from, 'modificando_carrito');
                return this.quitarProductoCarrito(from, numero - 1);
            }
        }

        // Elegir tipo de entrega
        if (textoLower.match(/^[12]$/)) {
            const respuestaEntrega = await this.procesarOpcionEntrega(from, textoLower, nombreContacto);
            if (respuestaEntrega) {
                sessionManager.limpiarSesion(from);
                return respuestaEntrega;
            }
        }

        // Lista de precios / catálogo
        if (textoLower.match(/lista|precio|catalogo|que tienen|que venden|productos|menu/)) {
            sessionManager.marcarSesionActiva(from, 'consulta');
            return productService.generarListaCategorias();
        }

        // Saludos
        if (textoLower.match(/^(hola|buenas|buenos dias|buenas tardes|buenas noches|hey|hi)$/)) {
            return this.generarSaludo(from, nombreContacto);
        }

        // Horarios
        if (textoLower.match(/horario|hora|atencion|abren|cierran|abierto/)) {
            sessionManager.marcarSesionActiva(from, 'consulta');
            const negocio = cache.obtenerNegocioSync();
            return `🕐 *Horarios de Atención*\n\n${negocio.horarios}`;
        }

        // Ubicación
        if (textoLower.match(/ubicacion|direccion|donde|local|negocio|como llego/)) {
            sessionManager.marcarSesionActiva(from, 'consulta');
            const negocio = cache.obtenerNegocioSync();
            return `📍 *Nuestra Ubicación*\n\n${negocio.direccion}\n\nTe esperamos! 😊`;
        }

        // Medios de pago
        if (textoLower.match(/pago|efectivo|tarjeta|transfer|mercadopago|debito|credito/)) {
            sessionManager.marcarSesionActiva(from, 'consulta');
            const negocio = cache.obtenerNegocioSync();
            return `💳 *Medios de Pago:*\n\n${negocio.medios_pago}`;
        }

        // Contacto
        if (textoLower.match(/contacto|telefono|whatsapp|llamar/)) {
            sessionManager.marcarSesionActiva(from, 'consulta');
            const negocio = cache.obtenerNegocioSync();
            return `📞 *Contacto*\n\n` +
                   `WhatsApp: ${negocio.whatsapp}\n` +
                   `Teléfono: ${negocio.telefono}\n\n` +
                   `¡Estamos para ayudarte! 😊`;
        }

        // Detectar productos en el texto
        const productosDetectados = this.detectarProductosEnTexto(textoOriginal);
        
        if (productosDetectados.length > 0) {
            sessionManager.marcarSesionActiva(from, 'seleccionando_productos');
            return this.procesarDeteccionProductos(from, productosDetectados);
        }

        // Consulta de stock
        if (textoLower.match(/stock|hay|tienen|disponible|queda|quedan/)) {
            sessionManager.marcarSesionActiva(from, 'consulta');
            return `📦 Para consultar stock específico, escribe el nombre del producto.\n\n` +
                   `Ejemplo: "Hay cuadernos A4?"`;
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

    generarSaludo(from, nombreContacto) {
        const negocio = cache.obtenerNegocioSync();
        const infoCliente = clientService.obtenerPorTelefono(from);
        
        let saludo = `¡Hola`;
        
        if (infoCliente && infoCliente.total_pedidos > 0) {
            saludo += ` de nuevo`;
        }
        
        saludo += `! 👋 Bienvenido a *${negocio.nombre}*\n\n`;
        
        if (infoCliente && infoCliente.total_pedidos > 0) {
            saludo += `📊 Has realizado ${infoCliente.total_pedidos} pedido(s) con nosotros 🎉\n\n`;
        }
        
        saludo += `Te puedo ayudar con:\n` +
               `📋 Lista de precios\n` +
               `🕐 Horarios\n` +
               `📍 Ubicación\n` +
               `📦 Stock de productos\n` +
               `🛒 Hacer un pedido\n` +
               `💳 Medios de pago\n`;
        
        if (infoCliente && infoCliente.total_pedidos > 0) {
            saludo += `📜 Ver mis pedidos anteriores\n`;
        }
        
        saludo += `\n¿Qué necesitas?`;
        
        sessionManager.marcarSesionActiva(from, 'consulta');
        return saludo;
    }

    mostrarHistorialCliente(telefono) {
        const infoCliente = clientService.obtenerPorTelefono(telefono);
        
        if (!infoCliente || infoCliente.total_pedidos === 0) {
            return `📜 *Tu Historial*\n\n` +
                   `Aún no has realizado pedidos con nosotros.\n\n` +
                   `¿Te gustaría hacer tu primer pedido? 🛒\n` +
                   `Escribe por ejemplo: "Quiero 2 cuadernos"`;
        }
        
        let respuesta = `📜 *TU HISTORIAL DE PEDIDOS*\n`;
        respuesta += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
        respuesta += `👤 Cliente: ${infoCliente.nombre}\n`;
        respuesta += `📱 Teléfono: ${infoCliente.telefono.replace('@c.us', '')}\n`;
        respuesta += `📅 Cliente desde: ${formatearFecha(infoCliente.fecha_registro)}\n`;
        respuesta += `📦 Total de pedidos: ${infoCliente.total_pedidos}\n`;
        respuesta += `💰 Total gastado: $${infoCliente.total_gastado}\n\n`;
        respuesta += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
        
        if (infoCliente.pedidos.length > 0) {
            respuesta += `📋 *ÚLTIMOS PEDIDOS:*\n\n`;
            
            const ultimosPedidos = infoCliente.pedidos.slice(-5).reverse();
            
            ultimosPedidos.forEach((pedido, index) => {
                respuesta += `${index + 1}. *${pedido.id}* - ${formatearFecha(pedido.fecha)}\n`;
                respuesta += `   💰 Total: $${pedido.total}\n`;
                respuesta += `   📦 Productos:\n`;
                
                pedido.productos.slice(0, 3).forEach(prod => {
                    respuesta += `      • ${prod.nombre} x${prod.cantidad}\n`;
                });
                
                if (pedido.productos.length > 3) {
                    respuesta += `      • ... y ${pedido.productos.length - 3} más\n`;
                }
                
                respuesta += `   🚚 Entrega: ${pedido.tipo_entrega === 'delivery' ? 'Delivery' : 'Retiro'}\n`;
                respuesta += `   ✅ Estado: ${pedido.estado}\n\n`;
            });
            
            if (infoCliente.pedidos.length > 5) {
                respuesta += `... y ${infoCliente.pedidos.length - 5} pedidos más\n\n`;
            }
        }
        
        respuesta += `━━━━━━━━━━━━━━━━━━━━━\n`;
        respuesta += `🙏 ¡Gracias por tu preferencia!\n\n`;
        respuesta += `¿Deseas hacer un nuevo pedido? 🛒`;
        
        return respuesta;
    }

    detectarProductosEnTexto(texto) {
        const productoIndex = require('../utils/ProductoIndex');
        
        logger.debug(`🔍 Buscando productos en: "${texto}"`);
        
        // Detectar cantidad
        let cantidadDetectada = 1;
        const regexNumero = /(\d+|un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)/gi;
        const matches = texto.match(regexNumero);
        
        if (matches) {
            const ultimoMatch = matches[matches.length - 1].toLowerCase();
            cantidadDetectada = NUMEROS_TEXTO[ultimoMatch] || parseInt(ultimoMatch) || 1;
        }
        
        // Buscar productos usando el índice
        const resultados = productoIndex.buscar(texto);
        
        logger.debug(`   Resultados encontrados: ${resultados.length}`);
        
        // Formatear resultados
        const productosDetectados = resultados.map(producto => ({
            nombre: producto.nombreOriginal,
            nombreFormateado: producto.nombreFormateado,
            cantidad: cantidadDetectada,
            precio: producto.precio,
            stock: producto.stock,
            categoria: producto.categoria,
            subcategoria: producto.subcategoria
        }));
        
        return productosDetectados;
    }

    procesarDeteccionProductos(from, productos) {
        if (productos.length === 0) {
            return `🤔 No encontré productos específicos en tu mensaje.\n\n` +
                   `Intenta escribir algo como:\n` +
                   `"Quiero 2 cuadernos A4"\n` +
                   `"Dame 5 lapiceras"\n` +
                   `"Necesito 3 globos"`;
        }
        
        // Si hay múltiples productos con nombres diferentes
        if (productos.length > 1) {
            const nombresProduc = [...new Set(productos.map(p => p.nombre))];
            
            if (nombresProduc.length > 1) {
                let respuesta = `🔍 *Encontré ${productos.length} productos que coinciden:*\n\n`;
                
                productos.slice(0, 10).forEach((prod, index) => {
                    const numero = index + 1;
                    const stockEmoji = prod.stock ? '✅' : '❌';
                    
                    respuesta += `${numero}️⃣ ${stockEmoji} ${prod.nombreFormateado}\n`;
                    respuesta += `   💰 $${prod.precio}${prod.stock ? '' : ' (SIN STOCK)'}\n`;
                    respuesta += `   📂 ${prod.categoria.replace(/_/g, ' ')}\n\n`;
                });
                
                if (productos.length > 10) {
                    respuesta += `... y ${productos.length - 10} más\n\n`;
                }
                
                respuesta += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
                respuesta += `Por favor, especifica cuál quieres:\n`;
                respuesta += `• Escribe el *número* (ej: "1")\n`;
                respuesta += `• O escribe más detalles (ej: "lapicera azul")\n`;
                respuesta += `• O escribe *"cancelar"* para buscar otra cosa`;
                
                const carrito = sessionManager.obtenerCarrito(from);
                carrito.opciones_multiples = productos;
                carrito.cantidad_solicitada = productos[0].cantidad;
                sessionManager.actualizarCarrito(from, carrito);
                
                sessionManager.marcarSesionActiva(from, 'eligiendo_producto');
                
                return respuesta;
            }
        }
        
        // Mostrar productos encontrados
        let respuesta = `🔍 *Encontré estos productos:*\n\n`;
        
        productos.forEach((prod, index) => {
            const numero = index + 1;
            const stockEmoji = prod.stock ? '✅' : '❌';
            const precioTotal = prod.precio * prod.cantidad;
            
            respuesta += `${numero}️⃣ ${stockEmoji} ${prod.nombreFormateado}\n`;
            respuesta += `   Cantidad: ${prod.cantidad}\n`;
            respuesta += `   Precio unitario: $${prod.precio}\n`;
            respuesta += `   Subtotal: $${precioTotal}\n\n`;
        });
        
        const sinStock = productos.filter(p => !p.stock);
        if (sinStock.length > 0) {
            respuesta += `⚠️ ATENCIÓN: Algunos productos están SIN STOCK\n\n`;
        }
        
        respuesta += `¿Es correcto este pedido?\n\n`;
        respuesta += `• Escribe *"si"* para agregarlo al carrito\n`;
        respuesta += `• Escribe *"no"* para cancelar`;
        
        const carrito = sessionManager.obtenerCarrito(from);
        carrito.temporal = productos;
        sessionManager.actualizarCarrito(from, carrito);
        
        return respuesta;
    }

    manejarSeleccionProducto(textoOriginal, from) {
        const carrito = sessionManager.obtenerCarrito(from);
        const numeroElegido = parseInt(textoOriginal.trim());
        
        if (!isNaN(numeroElegido) && numeroElegido > 0 && numeroElegido <= carrito.opciones_multiples.length) {
            const productoElegido = carrito.opciones_multiples[numeroElegido - 1];
            productoElegido.cantidad = carrito.cantidad_solicitada || 1;
            
            logger.info(`✅ Usuario eligió opción ${numeroElegido}: ${productoElegido.nombreFormateado}`);
            
            delete carrito.opciones_multiples;
            delete carrito.cantidad_solicitada;
            
            carrito.temporal = [productoElegido];
            sessionManager.actualizarCarrito(from, carrito);
            sessionManager.marcarSesionActiva(from, 'seleccionando_productos');
            
            return this.procesarDeteccionProductos(from, [productoElegido]);
        }
        
        if (textoOriginal.toLowerCase().match(/cancelar|no|salir/)) {
            delete carrito.opciones_multiples;
            delete carrito.cantidad_solicitada;
            sessionManager.actualizarCarrito(from, carrito);
            sessionManager.limpiarSesion(from);
            return `❌ Búsqueda cancelada.\n\nPuedes hacer otra búsqueda cuando quieras.`;
        }
        
        return `❌ Opción no válida. Escribe el número del producto que deseas.`;
    }

    agregarAlCarrito(from) {
        const carrito = sessionManager.obtenerCarrito(from);
        
        if (!carrito.temporal || carrito.temporal.length === 0) {
            return `❌ No hay productos pendientes para agregar.\n\n` +
                   `Escribe tu pedido, ejemplo: "Quiero 2 cuadernos"`;
        }
        
        const productosTemporales = carrito.temporal;
        
        // Verificar stock
        const sinStock = productosTemporales.filter(p => !p.stock);
        if (sinStock.length > 0) {
            let respuesta = `❌ No puedo agregar estos productos porque están SIN STOCK:\n\n`;
            sinStock.forEach(p => {
                respuesta += `• ${p.nombreFormateado}\n`;
            });
            respuesta += `\n¿Deseas continuar solo con los productos disponibles? (si/no)`;
            return respuesta;
        }
        
        // Agregar al carrito
        productosTemporales.forEach(prod => {
            carrito.productos.push(prod);
        });
        
        carrito.temporal = [];
        sessionManager.actualizarCarrito(from, carrito);
        
        // Iniciar timer de expiración
        const configPedidos = cache.obtenerConfigPedidosSync();
        sessionManager.iniciarTimerCarrito(from, configPedidos.carrito?.expiracion_minutos || 15);
        
        return this.mostrarCarrito(from) + 
               `\n\n💡 ¿Deseas agregar más productos?\n` +
               `• Escribe otro pedido (ej: "3 lapiceras")\n` +
               `• O escribe *"confirmar"* para finalizar`;
    }

    mostrarCarrito(from) {
        const carrito = sessionManager.obtenerCarrito(from);
        
        if (!carrito.productos || carrito.productos.length === 0) {
            return `🛒 Tu carrito está vacío\n\n` +
                   `Para hacer un pedido, escribe por ejemplo:\n` +
                   `"Quiero 2 cuadernos" o "Dame 5 lapiceras"`;
        }
        
        let respuesta = `🛒 *TU CARRITO*\n`;
        respuesta += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
        
        let total = 0;
        
        carrito.productos.forEach((prod, index) => {
            const numero = index + 1;
            const subtotal = prod.precio * prod.cantidad;
            total += subtotal;
            
            respuesta += `${numero}. ${prod.nombreFormateado}\n`;
            respuesta += `   ${prod.cantidad} x $${prod.precio} = $${subtotal}\n\n`;
        });
        
        // Calcular descuento
        const { descuento, porcentaje, descripcion } = orderService.calcularDescuento(total);
        
        respuesta += `━━━━━━━━━━━━━━━━━━━━━\n`;
        respuesta += `💰 Subtotal: $${total}\n`;
        
        if (descuento > 0) {
            respuesta += `🎉 ${descripcion}\n`;
            respuesta += `🎁 Descuento: -$${descuento}\n`;
            respuesta += `━━━━━━━━━━━━━━━━━━━━━\n`;
            respuesta += `💰 *TOTAL: $${total - descuento}*\n`;
        } else {
            respuesta += `━━━━━━━━━━━━━━━━━━━━━\n`;
            respuesta += `💰 *TOTAL: $${total}*\n`;
        }
        
        respuesta += `\n📝 Opciones:\n`;
        respuesta += `• *"confirmar"* - Finalizar pedido\n`;
        respuesta += `• *"quitar [número]"* - Eliminar producto\n`;
        respuesta += `• *"cancelar"* - Vaciar carrito\n`;
        
        return respuesta;
    }

    async confirmarPedido(from, nombreContacto) {
        const carrito = sessionManager.obtenerCarrito(from);
        
        if (!carrito.productos || carrito.productos.length === 0) {
            return `❌ No tienes productos en el carrito.\n\n` +
                   `Para hacer un pedido, escribe por ejemplo:\n` +
                   `"Quiero 2 cuadernos"`;
        }
        
        const productos = carrito.productos;
        let subtotal = 0;
        
        productos.forEach(prod => {
            subtotal += prod.precio * prod.cantidad;
        });
        
        const { descuento, porcentaje } = orderService.calcularDescuento(subtotal);
        const totalFinal = subtotal - descuento;
        
        let respuesta = `📋 *RESUMEN DE TU PEDIDO*\n`;
        respuesta += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
        
        productos.forEach((prod, index) => {
            const numero = index + 1;
            const subtotalProd = prod.precio * prod.cantidad;
            respuesta += `${numero}. ${prod.nombreFormateado} x${prod.cantidad}\n`;
            respuesta += `   $${subtotalProd}\n\n`;
        });
        
        respuesta += `━━━━━━━━━━━━━━━━━━━━━\n`;
        respuesta += `💰 Subtotal: $${subtotal}\n`;
        
        if (descuento > 0) {
            respuesta += `🎁 Descuento (${porcentaje}%): -$${descuento}\n`;
        }
        
        respuesta += `━━━━━━━━━━━━━━━━━━━━━\n`;
        respuesta += `💰 *TOTAL: $${totalFinal}*\n\n`;
        
        const configPedidos = cache.obtenerConfigPedidosSync();
        const negocio = cache.obtenerNegocioSync();
        
        if (configPedidos.delivery?.habilitado) {
            respuesta += `🚚 *¿Cómo lo querés recibir?*\n\n`;
            respuesta += `1️⃣ *Retiro en local* (Gratis)\n`;
            respuesta += `   📍 ${negocio.direccion}\n`;
            respuesta += `   🕐 ${negocio.horarios}\n\n`;
            
            if (configPedidos.delivery.gratis_desde && totalFinal >= configPedidos.delivery.gratis_desde) {
                respuesta += `2️⃣ *Delivery* (GRATIS por tu compra)\n\n`;
            } else {
                respuesta += `2️⃣ *Delivery* (+$${configPedidos.delivery.costo})\n\n`;
            }
            
            respuesta += `Responde *"1"* o *"2"* para continuar`;
            
            carrito.esperandoEntrega = true;
            carrito.totalFinal = totalFinal;
            carrito.descuento = descuento;
            sessionManager.actualizarCarrito(from, carrito);
            
            sessionManager.marcarSesionActiva(from, 'confirmando_pedido');
            
        } else {
            // Sin delivery, confirmar directamente
            respuesta += `📍 *Retiro en local*\n`;
            respuesta += `${negocio.direccion}\n`;
            respuesta += `🕐 ${negocio.horarios}\n\n`;
            
            respuesta += `💳 *Medios de pago:*\n`;
            respuesta += `${negocio.medios_pago}\n\n`;
            
            const pedido = await orderService.crear(
                { telefono: from, nombre: nombreContacto },
                productos,
                'retiro'
            );
            
            // Notificar al dueño
            await notificationService.notificarNuevoPedido(pedido, from, nombreContacto);
            
            respuesta += `✅ *PEDIDO CONFIRMADO*\n`;
            respuesta += `📄 Número de pedido: *#${pedido.id}*\n\n`;
            respuesta += `🙏 ¡Gracias por tu compra!`;
            
            sessionManager.eliminarCarrito(from);
            sessionManager.limpiarSesion(from);
        }
        
        return respuesta;
    }

    async procesarOpcionEntrega(from, opcion, nombreContacto) {
        const carrito = sessionManager.obtenerCarrito(from);
        
        if (!carrito.esperandoEntrega) {
            return null;
        }
        
        const productos = carrito.productos;
        const totalFinal = carrito.totalFinal;
        const descuento = carrito.descuento;
        const subtotal = totalFinal + descuento;
        
        let tipoEntrega = '';
        let costoDelivery = 0;
        let respuesta = '';
        
        const negocio = cache.obtenerNegocioSync();
        
        if (opcion === '1') {
            tipoEntrega = 'retiro';
            
            respuesta += `✅ *PEDIDO CONFIRMADO*\n`;
            respuesta += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
            respuesta += `🏪 *Retiro en local*\n`;
            respuesta += `📍 ${negocio.direccion}\n`;
            respuesta += `🕐 ${negocio.horarios}\n\n`;
            
        } else if (opcion === '2') {
            tipoEntrega = 'delivery';
            
            costoDelivery = orderService.calcularDelivery(totalFinal);
            
            respuesta += `✅ *PEDIDO CONFIRMADO*\n`;
            respuesta += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
            respuesta += `🚚 *Delivery*\n`;
            
            if (costoDelivery > 0) {
                respuesta += `Costo de envío: $${costoDelivery}\n`;
            } else {
                respuesta += `🎉 Envío GRATIS por tu compra\n`;
            }
            respuesta += `\n`;
            
        } else {
            return `❌ Opción no válida.\n\nResponde *"1"* para retiro o *"2"* para delivery`;
        }
        
        // Mostrar resumen
        productos.forEach((prod, index) => {
            const numero = index + 1;
            respuesta += `${numero}. ${prod.nombreFormateado} x${prod.cantidad} - $${prod.precio * prod.cantidad}\n`;
        });
        
        respuesta += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
        respuesta += `💰 Subtotal: $${subtotal}\n`;
        
        if (descuento > 0) {
            respuesta += `🎁 Descuento: -$${descuento}\n`;
        }
        
        if (costoDelivery > 0) {
            respuesta += `🚚 Delivery: +$${costoDelivery}\n`;
        }
        
        const totalConDelivery = totalFinal + costoDelivery;
        
        respuesta += `━━━━━━━━━━━━━━━━━━━━━\n`;
        respuesta += `💰 *TOTAL: $${totalConDelivery}*\n\n`;
        
        respuesta += `💳 *Medios de pago:*\n`;
        respuesta += `${negocio.medios_pago}\n\n`;
        
        // Crear pedido
        const pedido = await orderService.crear(
            { telefono: from, nombre: nombreContacto },
            productos,
            tipoEntrega
        );
        
        // Notificar al dueño
        await notificationService.notificarNuevoPedido(pedido, from, nombreContacto);
        
        respuesta += `📄 Número de pedido: *#${pedido.id}*\n\n`;
        respuesta += `🙏 ¡Gracias por tu compra!\n`;
        respuesta += `Te contactaremos pronto para coordinar.`;
        
        sessionManager.eliminarCarrito(from);
        
        return respuesta;
    }

    cancelarCarrito(from) {
        const carrito = sessionManager.obtenerCarrito(from);
        
        if (!carrito.productos || carrito.productos.length === 0) {
            return `🛒 Tu carrito ya está vacío`;
        }
        
        sessionManager.eliminarCarrito(from);
        
        return `✅ Carrito vaciado correctamente\n\n` +
               `Para hacer un nuevo pedido, escribe por ejemplo:\n` +
               `"Quiero 2 cuadernos"`;
    }

    quitarProductoCarrito(from, index) {
        const carrito = sessionManager.obtenerCarrito(from);
        
        if (!carrito.productos || carrito.productos.length === 0) {
            return `🛒 Tu carrito está vacío`;
        }
        
        if (index < 0 || index >= carrito.productos.length) {
            return `❌ Número de producto inválido\n\n` + this.mostrarCarrito(from);
        }
        
        const productoEliminado = carrito.productos.splice(index, 1)[0];
        sessionManager.actualizarCarrito(from, carrito);
        
        let respuesta = `✅ Eliminado: ${productoEliminado.nombreFormateado} x${productoEliminado.cantidad}\n\n`;
        
        if (carrito.productos.length === 0) {
            sessionManager.eliminarCarrito(from);
            respuesta += `🛒 Tu carrito está vacío`;
        } else {
            respuesta += this.mostrarCarrito(from);
        }
        
        return respuesta;
    }
}

module.exports = new MessageController();