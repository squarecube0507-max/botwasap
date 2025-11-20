// src/middlewares/logger.js
/**
 * ═══════════════════════════════════════════════════════════════
 * 📝 LOGGER - Sistema de logging
 * ═══════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');

class Logger {
    constructor() {
        this.logsDir = path.join(__dirname, '../../logs');
        
        // Crear directorio de logs si no existe
        if (!fs.existsSync(this.logsDir)) {
            fs.mkdirSync(this.logsDir, { recursive: true });
        }
    }

    _formatMessage(level, message, meta = null) {
        const timestamp = new Date().toISOString();
        let formatted = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
        
        if (meta) {
            formatted += ` ${JSON.stringify(meta)}`;
        }
        
        return formatted;
    }

    _writeToFile(level, message) {
        const filename = path.join(this.logsDir, `${level}.log`);
        fs.appendFileSync(filename, message + '\n');
    }

    info(message, meta = null) {
        const formatted = this._formatMessage('info', message, meta);
        console.log('\x1b[36m%s\x1b[0m', formatted); // Cyan
        this._writeToFile('info', formatted);
    }

    error(message, meta = null) {
        const formatted = this._formatMessage('error', message, meta);
        console.error('\x1b[31m%s\x1b[0m', formatted); // Red
        this._writeToFile('error', formatted);
    }

    warn(message, meta = null) {
        const formatted = this._formatMessage('warn', message, meta);
        console.warn('\x1b[33m%s\x1b[0m', formatted); // Yellow
        this._writeToFile('warn', formatted);
    }

    debug(message, meta = null) {
        if (process.env.NODE_ENV === 'development') {
            const formatted = this._formatMessage('debug', message, meta);
            console.log('\x1b[35m%s\x1b[0m', formatted); // Magenta
            this._writeToFile('debug', formatted);
        }
    }

    // Middleware para Express
    middleware(req, res, next) {
        const start = Date.now();
        
        res.on('finish', () => {
            const duration = Date.now() - start;
            const message = `${req.method} ${req.url} ${res.statusCode} ${duration}ms`;
            
            if (res.statusCode >= 400) {
                logger.error(message);
            } else {
                logger.info(message);
            }
        });
        
        next();
    }
}

const logger = new Logger();

module.exports = logger;