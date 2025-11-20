// src/middlewares/errorHandler.js
/**
 * ═══════════════════════════════════════════════════════════════
 * ⚠️ ERROR HANDLER - Manejo centralizado de errores
 * ═══════════════════════════════════════════════════════════════
 */

const logger = require('./logger');

class AppError extends Error {
    constructor(message, statusCode = 500, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.timestamp = new Date().toISOString();
        
        Error.captureStackTrace(this, this.constructor);
    }
}

const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;
    error.statusCode = err.statusCode || 500;
    
    // Log del error
    logger.error(`[${error.statusCode}] ${error.message}`, {
        url: req.url,
        method: req.method,
        ip: req.ip,
        stack: err.stack
    });
    
    // Errores operacionales conocidos
    if (error.isOperational) {
        return res.status(error.statusCode).json({
            success: false,
            error: error.message,
            timestamp: error.timestamp
        });
    }
    
    // Errores de programación u otros desconocidos
    if (process.env.NODE_ENV === 'production') {
        // No exponer detalles en producción
        return res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            timestamp: new Date().toISOString()
        });
    }
    
    // En desarrollo, mostrar stack trace
    return res.status(error.statusCode).json({
        success: false,
        error: error.message,
        stack: err.stack,
        timestamp: new Date().toISOString()
    });
};

module.exports = errorHandler;
module.exports.AppError = AppError;