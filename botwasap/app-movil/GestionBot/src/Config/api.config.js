// src/config/api.config.js

// 🔥 URL BASE DE LA API
// Cambia esto cuando uses ngrok
export const API_BASE_URL = 'https://megalithic-unfluid-dorene.ngrok-free.dev';

// URLs completas
export const API_URLS = {
  // Base
  base: API_BASE_URL,
  api: `${API_BASE_URL}/api`,
  
  // Productos
  productos: `${API_BASE_URL}/api/productos`,
  productosImagen: `${API_BASE_URL}/api/productos/imagen`,
  
  // Pedidos
  pedidos: `${API_BASE_URL}/api/pedidos`,
  
  // Clientes
  clientes: `${API_BASE_URL}/api/clientes`,
  
  // Estadísticas
  estadisticas: `${API_BASE_URL}/api/estadisticas`,
  
  // Configuración
  config: `${API_BASE_URL}/api/config`,
  
  // Descuentos
  descuentos: `${API_BASE_URL}/api/descuentos`,
  
  // Bot
  bot: `${API_BASE_URL}/api/bot`,
  
  // Respuestas
  respuestas: `${API_BASE_URL}/api/respuestas`,
};

export default API_URLS;