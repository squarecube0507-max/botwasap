// src/controllers/handlers/cartHandler.js
/**
 * ═══════════════════════════════════════════════════════════════
 * 🛒 CART HANDLER - Gestión del carrito de compras
 * ═══════════════════════════════════════════════════════════════
 */

const sessionManager = require('../../utils/sessionManager');
const cache = require('../../utils/CacheManager');
const orderService = require('../../services/orderService');
const logger = require('../../middlewares/logger');

class CartHandler {
    /**
     * Agrega productos temporales al carrito
     */
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
        
        logger.info(`✅ Productos agregados al carrito de ${from}`);
        
        return this.mostrarCarrito(from) + 
               `\n\n💡 ¿Deseas agregar más productos?\n` +
               `• Escribe otro pedido (ej: "3 lapiceras")\n` +
               `• O escribe *"confirmar"* para finalizar`;
    }

    /**
     * Muestra el contenido del carrito
     */
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

    /**
     * Cancela y vacía el carrito
     */
    cancelarCarrito(from) {
        const carrito = sessionManager.obtenerCarrito(from);
        
        if (!carrito.productos || carrito.productos.length === 0) {
            return `🛒 Tu carrito ya está vacío`;
        }
        
        sessionManager.eliminarCarrito(from);
        logger.info(`🗑️ Carrito eliminado de ${from}`);
        
        return `✅ Carrito vaciado correctamente\n\n` +
               `Para hacer un nuevo pedido, escribe por ejemplo:\n` +
               `"Quiero 2 cuadernos"`;
    }

    /**
     * Quita un producto específico del carrito
     */
    quitarProducto(from, index) {
        const carrito = sessionManager.obtenerCarrito(from);
        
        if (!carrito.productos || carrito.productos.length === 0) {
            return `🛒 Tu carrito está vacío`;
        }
        
        if (index < 0 || index >= carrito.productos.length) {
            return `❌ Número de producto inválido\n\n` + this.mostrarCarrito(from);
        }
        
        const productoEliminado = carrito.productos.splice(index, 1)[0];
        sessionManager.actualizarCarrito(from, carrito);
        
        logger.info(`🗑️ Producto eliminado del carrito: ${productoEliminado.nombreFormateado}`);
        
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

module.exports = new CartHandler();