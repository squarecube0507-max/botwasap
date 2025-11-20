// index.js
/**
 * ═══════════════════════════════════════════════════════════════
 * 🤖 BOT DE WHATSAPP - Punto de Entrada Principal
 * ═══════════════════════════════════════════════════════════════
 */

require('dotenv').config();
const app = require('./src/app');
const bot = require('./src/bot');
const logger = require('./src/middlewares/logger');

// Configuración del puerto
const PORT = process.env.PORT || 3000;

// Iniciar servidor Express
const server = app.listen(PORT, () => {
    logger.info(`✅ Servidor Express corriendo en puerto ${PORT}`);
    logger.info(`🌐 URL: http://localhost:${PORT}`);
});

// Iniciar bot de WhatsApp
bot.initialize();

// Manejo de errores no capturados
process.on('unhandledRejection', (reason, promise) => {
    logger.error('❌ Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
    logger.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

// Cierre graceful
process.on('SIGTERM', () => {
    logger.info('🛑 SIGTERM recibido. Cerrando servidor...');
    server.close(() => {
        logger.info('✅ Servidor cerrado');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    logger.info('🛑 SIGINT recibido. Cerrando servidor...');
    server.close(() => {
        logger.info('✅ Servidor cerrado');
        process.exit(0);
    });
});

module.exports = { app, server };