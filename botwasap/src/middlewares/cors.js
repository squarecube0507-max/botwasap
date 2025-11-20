// src/middlewares/cors.js
/**
 * ═══════════════════════════════════════════════════════════════
 * 🌐 CORS MIDDLEWARE - Configuración de CORS
 * ═══════════════════════════════════════════════════════════════
 */

const corsMiddleware = (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    
    next();
};

module.exports = corsMiddleware;