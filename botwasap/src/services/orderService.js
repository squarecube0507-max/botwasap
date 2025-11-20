// src/services/orderService.js
/**
 * ═══════════════════════════════════════════════════════════════
 * 🛒 ORDER SERVICE - Gestión de pedidos
 * ═══════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');
const cache = require('../utils/CacheManager');
const clientService = require('./clientService');
const logger = require('../middlewares/logger');

class OrderService {
    constructor() {
        this.pedidosPath = path.join(__dirname, '../../data/pedidos.json');
        this.configPath = path.join(__dirname, '../../data/config-pedidos.json');
    }

    /**
     * Obtiene configuración de pedidos
     */
    obtenerConfig() {
        try {
            return cache.obtenerConfigPedidosSync();
        } catch (error) {
            logger.error('❌ Error obteniendo config:', error);
            return {
                delivery: { habilitado: false },
                descuentos: { habilitado: false, reglas: [] }
            };
        }
    }

    /**
     * Calcula descuento según reglas configuradas
     */
    calcularDescuento(subtotal) {
        try {
            const config = this.obtenerConfig();
            
            if (!config.descuentos.habilitado) {
                return { descuento: 0, porcentaje: 0, descripcion: null };
            }
            
            let mejorDescuento = { descuento: 0, porcentaje: 0, descripcion: null };
            
            for (const regla of config.descuentos.reglas) {
                if (subtotal >= regla.minimo) {
                    const descuento = Math.floor(subtotal * (regla.porcentaje / 100));
                    
                    if (descuento > mejorDescuento.descuento) {
                        mejorDescuento = {
                            descuento,
                            porcentaje: regla.porcentaje,
                            descripcion: regla.descripcion
                        };
                    }
                }
            }
            
            return mejorDescuento;
        } catch (error) {
            logger.error('❌ Error calculando descuento:', error);
            return { descuento: 0, porcentaje: 0, descripcion: null };
        }
    }

    /**
     * Calcula costo de delivery
     */
    calcularDelivery(total) {
        try {
            const config = this.obtenerConfig();
            
            if (!config.delivery.habilitado) {
                return 0;
            }
            
            // Delivery gratis si supera monto mínimo
            if (config.delivery.gratis_desde && total >= config.delivery.gratis_desde) {
                return 0;
            }
            
            return config.delivery.costo || 0;
        } catch (error) {
            logger.error('❌ Error calculando delivery:', error);
            return 0;
        }
    }

    /**
     * Genera número de pedido único
     */
    generarNumeroPedido() {
        try {
            const dataPedidos = cache.obtenerPedidosSync();
            dataPedidos.ultimo_numero = (dataPedidos.ultimo_numero || 0) + 1;
            
            const numeroPedido = `PED-${String(dataPedidos.ultimo_numero).padStart(3, '0')}`;
            
            // Guardar el número actualizado
            fs.writeFileSync(this.pedidosPath, JSON.stringify(dataPedidos, null, 2));
            cache.invalidarPedidos();
            
            return numeroPedido;
        } catch (error) {
            logger.error('❌ Error generando número de pedido:', error);
            return `PED-${Date.now()}`;
        }
    }

    /**
     * Crea un nuevo pedido
     */
    async crear(datosCliente, productos, tipoEntrega = 'retiro') {
        try {
            // Calcular totales
            const subtotal = productos.reduce((sum, p) => sum + (p.precio * p.cantidad), 0);
            
            const { descuento, porcentaje, descripcion } = this.calcularDescuento(subtotal);
            
            let costoDelivery = 0;
            if (tipoEntrega === 'delivery') {
                costoDelivery = this.calcularDelivery(subtotal - descuento);
            }
            
            const total = subtotal - descuento + costoDelivery;
            
            // Generar número de pedido
            const numeroPedido = this.generarNumeroPedido();
            
            // Crear objeto pedido
            const pedido = {
                id: numeroPedido,
                cliente: datosCliente.telefono,
                nombre: datosCliente.nombre,
                fecha: new Date().toISOString(),
                productos: productos.map(p => ({
                    nombre: p.nombreFormateado || p.nombre,
                    cantidad: p.cantidad,
                    precio_unitario: p.precio,
                    subtotal: p.precio * p.cantidad
                })),
                subtotal: subtotal,
                descuento: descuento,
                descuento_porcentaje: porcentaje,
                descuento_descripcion: descripcion,
                delivery: costoDelivery,
                total: total,
                tipo_entrega: tipoEntrega,
                estado: 'confirmado',
                estado_pago: 'pendiente'
            };
            
            // Guardar pedido
            const dataPedidos = cache.obtenerPedidosSync();
            dataPedidos.pedidos.push(pedido);
            
            fs.writeFileSync(this.pedidosPath, JSON.stringify(dataPedidos, null, 2));
            cache.invalidarPedidos();
            
            // Actualizar estadísticas del cliente
            clientService.actualizarEstadisticasPedido(
                datosCliente.telefono,
                total,
                pedido
            );
            
            logger.info(`✅ Pedido creado: ${numeroPedido} - $${total} - ${datosCliente.nombre}`);
            
            return pedido;
        } catch (error) {
            logger.error('❌ Error creando pedido:', error);
            throw error;
        }
    }

    /**
     * Obtiene todos los pedidos
     */
    obtenerTodos() {
        try {
            const dataPedidos = cache.obtenerPedidosSync();
            return dataPedidos.pedidos || [];
        } catch (error) {
            logger.error('❌ Error obteniendo pedidos:', error);
            return [];
        }
    }

    /**
     * Obtiene un pedido por ID
     */
    obtenerPorId(id) {
        try {
            const pedidos = this.obtenerTodos();
            return pedidos.find(p => p.id === id) || null;
        } catch (error) {
            logger.error('❌ Error obteniendo pedido:', error);
            return null;
        }
    }

    /**
     * Obtiene pedidos de un cliente
     */
    obtenerPorCliente(telefono) {
        try {
            const pedidos = this.obtenerTodos();
            return pedidos.filter(p => p.cliente === telefono);
        } catch (error) {
            logger.error('❌ Error obteniendo pedidos del cliente:', error);
            return [];
        }
    }

    /**
     * Obtiene pedidos por fecha
     */
    obtenerPorFecha(fechaInicio, fechaFin) {
        try {
            const pedidos = this.obtenerTodos();
            const inicio = new Date(fechaInicio);
            const fin = new Date(fechaFin);
            
            return pedidos.filter(p => {
                const fechaPedido = new Date(p.fecha);
                return fechaPedido >= inicio && fechaPedido <= fin;
            });
        } catch (error) {
            logger.error('❌ Error obteniendo pedidos por fecha:', error);
            return [];
        }
    }

    /**
     * Obtiene pedidos de hoy
     */
    obtenerDeHoy() {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        const mañana = new Date(hoy);
        mañana.setDate(mañana.getDate() + 1);
        
        return this.obtenerPorFecha(hoy.toISOString(), mañana.toISOString());
    }

    /**
     * Obtiene estadísticas de pedidos
     */
    obtenerEstadisticas() {
        try {
            const pedidos = this.obtenerTodos();
            
            // Últimos 7 días
            const hoy = new Date();
            const pedidosPorDia = [];
            
            for (let i = 6; i >= 0; i--) {
                const fecha = new Date(hoy);
                fecha.setDate(fecha.getDate() - i);
                const fechaStr = fecha.toISOString().split('T')[0];
                
                const pedidosDia = pedidos.filter(p => {
                    const pedidoFecha = new Date(p.fecha).toISOString().split('T')[0];
                    return pedidoFecha === fechaStr;
                });
                
                const totalDia = pedidosDia.reduce((sum, p) => sum + p.total, 0);
                
                pedidosPorDia.push({
                    fecha: fechaStr,
                    pedidos: pedidosDia.length,
                    ventas: totalDia
                });
            }
            
            const totalPedidos = pedidos.length;
            const totalVentas = pedidos.reduce((sum, p) => sum + p.total, 0);
            const promedioVenta = totalPedidos > 0 ? totalVentas / totalPedidos : 0;
            
            return {
                total_pedidos: totalPedidos,
                total_ventas: totalVentas,
                promedio_venta: Math.round(promedioVenta),
                pedidos_por_dia: pedidosPorDia,
                ultimo_pedido: pedidos[pedidos.length - 1] || null
            };
        } catch (error) {
            logger.error('❌ Error obteniendo estadísticas:', error);
            return {
                total_pedidos: 0,
                total_ventas: 0,
                promedio_venta: 0,
                pedidos_por_dia: [],
                ultimo_pedido: null
            };
        }
    }

    /**
     * Actualiza estado de un pedido
     */
    actualizarEstado(id, nuevoEstado) {
        try {
            const dataPedidos = cache.obtenerPedidosSync();
            const pedido = dataPedidos.pedidos.find(p => p.id === id);
            
            if (!pedido) {
                throw new Error('Pedido no encontrado');
            }
            
            pedido.estado = nuevoEstado;
            pedido.actualizado_en = new Date().toISOString();
            
            fs.writeFileSync(this.pedidosPath, JSON.stringify(dataPedidos, null, 2));
            cache.invalidarPedidos();
            
            logger.info(`✅ Estado actualizado: ${id} → ${nuevoEstado}`);
            
            return pedido;
        } catch (error) {
            logger.error('❌ Error actualizando estado:', error);
            throw error;
        }
    }

    /**
     * Actualiza estado de pago
     */
    actualizarEstadoPago(id, estadoPago) {
        try {
            const dataPedidos = cache.obtenerPedidosSync();
            const pedido = dataPedidos.pedidos.find(p => p.id === id);
            
            if (!pedido) {
                throw new Error('Pedido no encontrado');
            }
            
            pedido.estado_pago = estadoPago;
            pedido.actualizado_en = new Date().toISOString();
            
            if (estadoPago === 'pagado') {
                pedido.pagado_en = new Date().toISOString();
            }
            
            fs.writeFileSync(this.pedidosPath, JSON.stringify(dataPedidos, null, 2));
            cache.invalidarPedidos();
            
            logger.info(`✅ Estado de pago actualizado: ${id} → ${estadoPago}`);
            
            return pedido;
        } catch (error) {
            logger.error('❌ Error actualizando estado de pago:', error);
            throw error;
        }
    }
}

module.exports = new OrderService();