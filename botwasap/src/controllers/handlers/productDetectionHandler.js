// src/controllers/handlers/productDetectionHandler.js
/**
 * ═══════════════════════════════════════════════════════════════
 * 🔍 PRODUCT DETECTION HANDLER - Detección de productos en texto
 * ═══════════════════════════════════════════════════════════════
 */

const productoIndex = require('../../utils/ProductoIndex');
const sessionManager = require('../../utils/sessionManager');
const logger = require('../../middlewares/logger');
const { NUMEROS_TEXTO } = require('../../config/constants');

class ProductDetectionHandler {
    /**
     * Detecta productos en el texto
     */
    detectarProductos(texto) {
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

    /**
     * Procesa la detección de productos y genera respuesta
     */
    procesarDeteccion(from, productos) {
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
                return this.mostrarOpcionesMultiples(from, productos);
            }
        }
        
        // Mostrar productos encontrados
        return this.mostrarProductosEncontrados(from, productos);
    }

    /**
     * Muestra opciones múltiples cuando hay varios productos
     */
    mostrarOpcionesMultiples(from, productos) {
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

    /**
     * Muestra productos encontrados
     */
    mostrarProductosEncontrados(from, productos) {
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

    /**
     * Maneja la selección de un producto específico
     */
    manejarSeleccion(textoOriginal, from) {
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
            
            return this.procesarDeteccion(from, [productoElegido]);
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
}

module.exports = new ProductDetectionHandler();