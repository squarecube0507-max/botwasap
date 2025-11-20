// src/services/aiService.js
/**
 * ═══════════════════════════════════════════════════════════════
 * 🤖 AI SERVICE - Integración con Groq IA
 * ═══════════════════════════════════════════════════════════════
 */

const Groq = require('groq-sdk');
const cache = require('../utils/CacheManager');
const logger = require('../middlewares/logger');

class AIService {
    constructor() {
        this.groq = new Groq({
            apiKey: process.env.GROQ_API_KEY || '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'
        });
        this.activo = true;
        this.rateLimitDelay = 2000; // 2 segundos entre requests
        this.ultimoRequest = 0;
    }

    /**
     * Activa o desactiva la IA
     */
    setActivo(estado) {
        this.activo = estado;
        logger.info(`🤖 IA ${estado ? 'ACTIVADA' : 'DESACTIVADA'}`);
    }

    /**
     * Verifica si la IA está activa
     */
    estaActivo() {
        return this.activo;
    }

    /**
     * Genera contexto de productos para la IA
     */
    generarContextoProductos() {
        try {
            const listaPrecios = cache.obtenerProductosSync();
            let lista = '';
            let contador = 0;
            
            for (const [categoria, subcategorias] of Object.entries(listaPrecios)) {
                lista += `\n📂 ${categoria.toUpperCase().replace(/_/g, ' ')}:\n`;
                
                for (const [subcategoria, productos] of Object.entries(subcategorias)) {
                    for (const [nombre, info] of Object.entries(productos)) {
                        if (contador >= 50) break;
                        
                        const nombreLimpio = nombre.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                        const precio = info.precio || info.precio_desde;
                        const stock = info.stock ? '✅' : '❌';
                        const unidad = info.unidad ? ` (${info.unidad})` : '';
                        
                        lista += `  ${stock} ${nombreLimpio}: $${precio}${unidad}\n`;
                        contador++;
                    }
                    if (contador >= 50) break;
                }
                if (contador >= 50) break;
            }
            
            return lista || 'No hay productos disponibles en este momento.';
        } catch (error) {
            logger.error('❌ Error generando contexto de productos:', error);
            return 'Error al cargar productos.';
        }
    }

    /**
     * Genera contexto del negocio para la IA
     */
    generarContextoNegocio() {
        try {
            const negocio = cache.obtenerNegocioSync();
            
            return `
INFORMACIÓN DEL NEGOCIO:
📍 Dirección: ${negocio.direccion}
🕐 Horarios: ${negocio.horarios}
💳 Medios de pago: ${negocio.medios_pago}
📞 WhatsApp: ${negocio.whatsapp}
☎️ Teléfono: ${negocio.telefono}
`;
        } catch (error) {
            logger.error('❌ Error generando contexto del negocio:', error);
            return '';
        }
    }

    /**
     * Genera el prompt del sistema para la IA
     */
    generarSystemPrompt() {
        const negocio = cache.obtenerNegocioSync();
        const listaProductos = this.generarContextoProductos();
        const infoNegocio = this.generarContextoNegocio();
        
        return `Eres un asistente virtual para "${negocio.nombre}".

PRODUCTOS DISPONIBLES:
${listaProductos}

${infoNegocio}

INSTRUCCIONES IMPORTANTES DE FORMATO:
- SEPARA CADA FRASE O IDEA EN UNA LÍNEA NUEVA
- Usa UN salto de línea después de cada oración importante
- Usa DOS saltos de línea antes de preguntas
- Usa saltos de línea para separar información
- Usa emojis cuando nombres productos, categorías o cuando sea necesario
- Ejemplo CORRECTO:
  "Te confirmo que son 2 cuadernos a $2500 cada uno.
  
  El total sería $5000.
  
  ¿Deseas agregar algo más?"

INSTRUCCIONES IMPORTANTES:
- Sé amable, profesional y conciso
- Responde en máximo 3-4 líneas
- Para listas largas, usa viñetas con saltos de línea
- Si preguntan por productos, menciona 5-6 opciones relevantes con sus precios exactos
- Si quieren hacer un pedido, explícales: "Para hacer un pedido, escribe por ejemplo: Quiero 2 cuadernos"
- Si preguntan horarios, dirección o medios de pago, responde con la información exacta
- Usa emojis moderadamente (1-2 por mensaje)
- NO inventes productos que no están en la lista
- Si no sabes algo, di: "Para más información, escribe 'ayuda'"
- Nunca menciones que eres una IA o un bot`;
    }

    /**
     * Procesa un mensaje con la IA
     */
    async procesarMensaje(mensaje, contextoCliente = {}) {
        if (!this.activo) {
            logger.debug('IA desactivada, saltando procesamiento');
            return null;
        }

        try {
            // Rate limiting
            const ahora = Date.now();
            const tiempoDesdeUltimoRequest = ahora - this.ultimoRequest;
            
            if (tiempoDesdeUltimoRequest < this.rateLimitDelay) {
                const espera = this.rateLimitDelay - tiempoDesdeUltimoRequest;
                logger.debug(`⏳ Esperando ${espera}ms por rate limit`);
                await new Promise(resolve => setTimeout(resolve, espera));
            }
            
            this.ultimoRequest = Date.now();
            
            logger.info('🤖 Consultando Groq IA...');
            
            const systemPrompt = this.generarSystemPrompt();
            
            const chatCompletion = await this.groq.chat.completions.create({
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: mensaje }
                ],
                model: "llama-3.3-70b-versatile",
                temperature: 0.5,
                max_tokens: 400,
            });
            
            let respuesta = chatCompletion.choices[0].message.content;
            
            logger.info(`✅ Groq respondió (${respuesta.length} caracteres)`);
            
            // Post-procesamiento de formato
            respuesta = this.mejorarFormato(respuesta);
            
            return respuesta;
            
        } catch (error) {
            if (error.message?.includes('rate_limit')) {
                logger.warn('⏳ Rate limit alcanzado, esperando...');
                await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
                return null;
            }
            
            logger.error('❌ Error con Groq IA:', error.message);
            return null;
        }
    }

    /**
     * Mejora el formato de la respuesta de la IA
     */
    mejorarFormato(respuesta) {
        return respuesta
            // Separar oraciones
            .replace(/([.!])\s+([A-ZÁÉÍÓÚÑ¿])/g, '$1\n\n$2')
            
            // Separar después de "te confirmo"
            .replace(/(te confirmo[^.?!]*[.?!])/gi, '$1\n\n')
            
            // Separar números + productos + precios
            .replace(/(\d+\s*[📚🎮📦🧸]?\s*[a-záéíóúñ\s]+\s*a\s*\$\d+[^.]*\.)/gi, '$1\n\n')
            
            // Separar antes de "El total"
            .replace(/\s*(El total|Total|TOTAL)/gi, '\n\n$1')
            
            // Separar preguntas
            .replace(/([.!])\s*¿/g, '$1\n\n¿')
            
            // Separar después de precios
            .replace(/(\$\d+)\s*\./g, '$1.\n\n')
            
            // Separar emojis de categorías
            .replace(/(📦|🎮|📚|🧸|🎉)\s*([^:]+):/gi, '\n\n$1 $2:\n')
            
            // Separar "¿Deseas..."
            .replace(/¿Deseas/gi, '\n\n¿Deseas')
            
            // Limpiar múltiples saltos (máximo 2)
            .replace(/\n{3,}/g, '\n\n')
            
            // Limpiar espacios múltiples
            .replace(/\s{2,}/g, ' ')
            
            // Limpiar espacios antes/después de saltos
            .replace(/\s+\n/g, '\n')
            .replace(/\n\s+/g, '\n')
            
            .trim();
    }

    /**
     * Obtiene estado de la IA
     */
    obtenerEstado() {
        return {
            activo: this.activo,
            modelo: 'llama-3.3-70b-versatile',
            ultimoRequest: this.ultimoRequest,
            rateLimitDelay: this.rateLimitDelay
        };
    }
}

module.exports = new AIService();