// src/controllers/orderController.js
/**
 * ═══════════════════════════════════════════════════════════════
 * 🛒 ORDER CONTROLLER - Controlador de pedidos para API
 * ═══════════════════════════════════════════════════════════════
 */

const orderService = require('../services/orderService');
const clientService = require('../services/clientService');
const { AppError } = require('../middlewares/errorHandler');
const logger = require('../middlewares/logger');

class OrderController {
    /**
     * Obtiene todos los pedidos
     */
    async getAll(req, res, next) {
        try {
            const pedidos = orderService.obtenerTodos();
            
            res.json({
                success: true,
                total: pedidos.length,
                pedidos
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Obtiene un pedido por ID
     */
    async getById(req, res, next) {
        try {
            const { id } = req.params;
            const pedido = orderService.obtenerPorId(id);
            
            if (!pedido) {
                throw new AppError('Pedido no encontrado', 404);
            }
            
            res.json({
                success: true,
                pedido
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Obtiene pedidos de un cliente
     */
    async getByCliente(req, res, next) {
        try {
            const { telefono } = req.params;
            const pedidos = orderService.obtenerPorCliente(telefono);
            
            res.json({
                success: true,
                total: pedidos.length,
                pedidos
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Obtiene pedidos por rango de fechas
     */
    async getByFecha(req, res, next) {
        try {
            const { inicio, fin } = req.query;
            
            if (!inicio || !fin) {
                throw new AppError('Se requieren fechas de inicio y fin', 400);
            }
            
            const pedidos = orderService.obtenerPorFecha(inicio, fin);
            
            res.json({
                success: true,
                total: pedidos.length,
                pedidos
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Obtiene pedidos de hoy
     */
    async getToday(req, res, next) {
        try {
            const pedidos = orderService.obtenerDeHoy();
            
            res.json({
                success: true,
                total: pedidos.length,
                pedidos
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Obtiene estadísticas de pedidos
     */
    async getStats(req, res, next) {
        try {
            const stats = orderService.obtenerEstadisticas();
            const clientStats = clientService.obtenerEstadisticas();
            
            res.json({
                success: true,
                estadisticas: {
                    ...stats,
                    ...clientStats
                }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Actualiza estado de un pedido
     */
    async updateEstado(req, res, next) {
        try {
            const { id } = req.params;
            const { estado } = req.body;
            
            if (!estado) {
                throw new AppError('El estado es requerido', 400);
            }
            
            const estadosValidos = ['confirmado', 'preparando', 'enviado', 'entregado', 'cancelado'];
            
            if (!estadosValidos.includes(estado)) {
                throw new AppError(`Estado inválido. Estados válidos: ${estadosValidos.join(', ')}`, 400);
            }
            
            const pedido = orderService.actualizarEstado(id, estado);
            
            logger.info(`✅ Estado de pedido ${id} actualizado a: ${estado}`);
            
            res.json({
                success: true,
                mensaje: 'Estado actualizado exitosamente',
                pedido
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Actualiza estado de pago
     */
    async updateEstadoPago(req, res, next) {
        try {
            const { id } = req.params;
            const { estado_pago } = req.body;
            
            if (!estado_pago) {
                throw new AppError('El estado de pago es requerido', 400);
            }
            
            const estadosValidos = ['pendiente', 'pagado', 'cancelado'];
            
            if (!estadosValidos.includes(estado_pago)) {
                throw new AppError(`Estado de pago inválido. Estados válidos: ${estadosValidos.join(', ')}`, 400);
            }
            
            const pedido = orderService.actualizarEstadoPago(id, estado_pago);
            
            logger.info(`✅ Estado de pago de pedido ${id} actualizado a: ${estado_pago}`);
            
            res.json({
                success: true,
                mensaje: 'Estado de pago actualizado exitosamente',
                pedido
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Obtiene configuración de pedidos
     */
    async getConfig(req, res, next) {
        try {
            const config = orderService.obtenerConfig();
            
            res.json({
                success: true,
                config
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new OrderController();