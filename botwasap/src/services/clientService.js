// src/services/clientService.js
/**
 * ═══════════════════════════════════════════════════════════════
 * 👥 CLIENT SERVICE - Gestión de clientes
 * ═══════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');
const cache = require('../utils/CacheManager');
const logger = require('../middlewares/logger');

class ClientService {
    constructor() {
        this.dataPath = path.join(__dirname, '../../data/clientes.json');
    }

    /**
     * Registra o actualiza un cliente
     */
    registrarOActualizar(telefono, nombre) {
        try {
            const clientesData = cache.obtenerClientesSync();
            
            let cliente = clientesData.clientes.find(c => c.telefono === telefono);
            
            if (!cliente) {
                // Cliente nuevo
                cliente = {
                    telefono: telefono,
                    nombre: nombre,
                    fecha_registro: new Date().toISOString(),
                    ultima_interaccion: new Date().toISOString(),
                    total_pedidos: 0,
                    total_gastado: 0,
                    pedidos: []
                };
                clientesData.clientes.push(cliente);
                clientesData.estadisticas.total_clientes += 1;
                
                logger.info(`👤 Nuevo cliente registrado: ${nombre} (${telefono})`);
            } else {
                // Actualizar existente
                cliente.ultima_interaccion = new Date().toISOString();
                
                if (cliente.nombre !== nombre) {
                    logger.info(`👤 Nombre actualizado: ${cliente.nombre} → ${nombre}`);
                    cliente.nombre = nombre;
                }
            }
            
            fs.writeFileSync(this.dataPath, JSON.stringify(clientesData, null, 2));
            cache.invalidarClientes();
            
            return cliente;
        } catch (error) {
            logger.error('❌ Error registrando cliente:', error);
            throw error;
        }
    }

    /**
     * Obtiene información de un cliente
     */
    obtenerPorTelefono(telefono) {
        try {
            const clientesData = cache.obtenerClientesSync();
            return clientesData.clientes.find(c => c.telefono === telefono) || null;
        } catch (error) {
            logger.error('❌ Error obteniendo cliente:', error);
            return null;
        }
    }

    /**
     * Obtiene todos los clientes
     */
    obtenerTodos() {
        try {
            const clientesData = cache.obtenerClientesSync();
            return clientesData.clientes;
        } catch (error) {
            logger.error('❌ Error obteniendo clientes:', error);
            return [];
        }
    }

    /**
     * Actualiza estadísticas de un cliente al hacer un pedido
     */
    actualizarEstadisticasPedido(telefono, totalPedido, pedidoInfo) {
        try {
            const clientesData = cache.obtenerClientesSync();
            const cliente = clientesData.clientes.find(c => c.telefono === telefono);
            
            if (!cliente) {
                logger.error(`❌ Cliente ${telefono} no encontrado`);
                return false;
            }
            
            cliente.total_pedidos += 1;
            cliente.total_gastado += totalPedido;
            cliente.ultima_interaccion = new Date().toISOString();
            cliente.pedidos.push(pedidoInfo);
            
            // Actualizar estadísticas globales
            clientesData.estadisticas.total_pedidos += 1;
            clientesData.estadisticas.total_vendido += totalPedido;
            
            fs.writeFileSync(this.dataPath, JSON.stringify(clientesData, null, 2));
            cache.invalidarClientes();
            
            logger.info(`✅ Estadísticas actualizadas para ${cliente.nombre}`);
            return true;
        } catch (error) {
            logger.error('❌ Error actualizando estadísticas:', error);
            return false;
        }
    }

    /**
     * Obtiene el historial de pedidos de un cliente
     */
    obtenerHistorial(telefono) {
        const cliente = this.obtenerPorTelefono(telefono);
        if (!cliente) return [];
        return cliente.pedidos || [];
    }

    /**
     * Obtiene estadísticas generales
     */
    obtenerEstadisticas() {
        try {
            const clientesData = cache.obtenerClientesSync();
            return clientesData.estadisticas;
        } catch (error) {
            logger.error('❌ Error obteniendo estadísticas:', error);
            return {
                total_clientes: 0,
                total_pedidos: 0,
                total_vendido: 0
            };
        }
    }

    /**
     * Busca clientes por nombre
     */
    buscarPorNombre(nombre) {
        try {
            const clientesData = cache.obtenerClientesSync();
            const nombreLower = nombre.toLowerCase();
            
            return clientesData.clientes.filter(c => 
                c.nombre.toLowerCase().includes(nombreLower)
            );
        } catch (error) {
            logger.error('❌ Error buscando clientes:', error);
            return [];
        }
    }

    /**
     * Obtiene clientes frecuentes (más de X pedidos)
     */
    obtenerClientesFrecuentes(minPedidos = 3) {
        try {
            const clientesData = cache.obtenerClientesSync();
            return clientesData.clientes
                .filter(c => c.total_pedidos >= minPedidos)
                .sort((a, b) => b.total_pedidos - a.total_pedidos);
        } catch (error) {
            logger.error('❌ Error obteniendo clientes frecuentes:', error);
            return [];
        }
    }
}

module.exports = new ClientService();