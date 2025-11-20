// src/bot.js
/**
 * ═══════════════════════════════════════════════════════════════
 * 🤖 WHATSAPP BOT CLIENT - Gestión del cliente de WhatsApp
 * ═══════════════════════════════════════════════════════════════
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const messageController = require('./controllers/messageController');
const cache = require('./utils/CacheManager');
const productoIndex = require('./utils/ProductoIndex');
const logger = require('./middlewares/logger');

let botIniciadoEn = null;

// Configuración del cliente
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// ═══════════════════════════════════════════════════════════════
// EVENTOS DEL CLIENTE
// ═══════════════════════════════════════════════════════════════

client.on('qr', (qr) => {
    logger.info('📱 Código QR generado');
    console.log('\n==============================================');
    console.log('📱 ¡ESCANEA ESTE CÓDIGO QR!');
    console.log('==============================================\n');
    qrcode.generate(qr, { small: true });
    console.log('\n==============================================');
    console.log('👆 Abre WhatsApp en tu celular');
    console.log('👉 Menú → Dispositivos vinculados');
    console.log('👉 Vincular un dispositivo');
    console.log('👉 Escanea el QR de arriba');
    console.log('==============================================\n');
});

client.on('ready', async () => {
    try {
        // Pre-cargar caché
        await cache.precargarTodo();
        
        // Construir índice de productos
        const productosParaIndice = cache.obtenerProductosSync();
        productoIndex.construirIndice(productosParaIndice);
        
        botIniciadoEn = Date.now();
        
        logger.info('🎉 Bot de WhatsApp conectado exitosamente');
        logger.info(`⏰ Bot iniciado: ${new Date().toLocaleString('es-AR')}`);
        
        const clientesData = cache.obtenerClientesSync();
        logger.info(`👥 Clientes registrados: ${clientesData.estadisticas.total_clientes}`);
        logger.info(`📦 Total pedidos: ${clientesData.estadisticas.total_pedidos}`);
        logger.info(`💰 Total vendido: $${clientesData.estadisticas.total_vendido}`);
        
    } catch (error) {
        logger.error('❌ Error al inicializar bot:', error);
    }
});

client.on('message', async (msg) => {
    try {
        await messageController.handleMessage(msg, client, botIniciadoEn);
    } catch (error) {
        logger.error('❌ Error al procesar mensaje:', error);
    }
});

client.on('auth_failure', (error) => {
    logger.error('❌ Error de autenticación:', error);
});

client.on('disconnected', (reason) => {
    logger.warn('⚠️ Bot desconectado:', reason);
});

// ═══════════════════════════════════════════════════════════════
// EXPORTAR
// ═══════════════════════════════════════════════════════════════

module.exports = client;