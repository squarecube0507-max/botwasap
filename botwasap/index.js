const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const fs = require('fs');
const cache = require('./utils/CacheManager');
const productoIndex = require('./utils/ProductoIndex');

// Servidor Express
const app = express();
app.use(express.static('public'));
app.use(express.json());
app.get('/', (req, res) => res.send('🤖 Bot activo!'));
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.get('/stats', (req, res) => {
    const clientes = cache.obtenerClientesSync();
    res.json(clientes.estadisticas);
});

// ═══════════════════════════════════════
// 📊 API PARA EL DASHBOARD
// ═══════════════════════════════════════

// Habilitar CORS para el dashboard
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    next();
});

// Obtener todos los pedidos
app.get('/api/pedidos', (req, res) => {
    try {
        const pedidos = cache.obtenerPedidosSync();
        res.json(pedidos.pedidos);
    } catch (error) {
        res.status(500).json({ error: 'Error al cargar pedidos' });
    }
});

// Obtener un pedido específico
app.get('/api/pedidos/:id', (req, res) => {
    try {
        const pedidos = cache.obtenerPedidosSync();
        const pedido = pedidos.pedidos.find(p => p.id === req.params.id);
        
        if (pedido) {
            res.json(pedido);
        } else {
            res.status(404).json({ error: 'Pedido no encontrado' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error al cargar pedido' });
    }
});

// Obtener todos los clientes
app.get('/api/clientes', (req, res) => {
    try {
        const clientes = cache.obtenerClientesSync();
        res.json(clientes.clientes);
    } catch (error) {
        res.status(500).json({ error: 'Error al cargar clientes' });
    }
});

// Obtener un cliente específico
app.get('/api/clientes/:telefono', (req, res) => {
    try {
        const clientes = cache.obtenerClientesSync();
        const cliente = clientes.clientes.find(c => c.telefono === req.params.telefono);
        
        if (cliente) {
            res.json(cliente);
        } else {
            res.status(404).json({ error: 'Cliente no encontrado' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error al cargar cliente' });
    }
});

// Obtener estructura completa de productos (para el dashboard antiguo)
app.get('/api/productos-estructura', (req, res) => {
    try {
        const productos = cache.obtenerProductosSync();
        res.json(productos);
    } catch (error) {
        res.status(500).json({ error: 'Error al cargar productos' });
    }
});

// Obtener estadísticas completas
app.get('/api/estadisticas', (req, res) => {
    try {
        const clientes = cache.obtenerClientesSync();
        const pedidos = cache.obtenerPedidosSync();
        
        // Calcular pedidos por día (últimos 7 días)
        const hoy = new Date();
        const pedidosPorDia = [];
        
        for (let i = 6; i >= 0; i--) {
            const fecha = new Date(hoy);
            fecha.setDate(fecha.getDate() - i);
            const fechaStr = fecha.toISOString().split('T')[0];
            
            const pedidosDia = pedidos.pedidos.filter(p => {
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
        
        res.json({
            ...clientes.estadisticas,
            pedidos_por_dia: pedidosPorDia,
            ultimo_pedido: pedidos.pedidos[pedidos.pedidos.length - 1] || null
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al cargar estadísticas' });
    }
});

// Estado del bot
app.get('/api/estado', (req, res) => {
    res.json({
        activo: client.info ? true : false,
        conectado: client.info ? true : false,
        numero: client.info ? client.info.wid.user : null,
        notificaciones: negocioData.notificaciones_activas,
        respuestas_automaticas: negocioData.respuestas_automaticas_activas,
        respuestas_activas: negocioData.respuestas_automaticas_activas,
        ia_activa: usarIA
    });
});

// Cambiar estado de respuestas automáticas
app.post('/api/toggle-respuestas', express.json(), (req, res) => {
    try {
        negocioData.respuestas_automaticas_activas = !negocioData.respuestas_automaticas_activas;
        fs.writeFileSync('./data/negocio.json', JSON.stringify(negocioData, null, 2));
        cache.invalidarNegocio();
        
        console.log(`🔄 Respuestas automáticas ${negocioData.respuestas_automaticas_activas ? 'ACTIVADAS' : 'PAUSADAS'} desde el dashboard`);
        
        res.json({
            success: true,
            estado: negocioData.respuestas_automaticas_activas
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al cambiar estado' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Servidor en puerto ${PORT}`));

// Cargar datos
const negocioData = cache.obtenerNegocioSync();
const listaPrecios = cache.obtenerProductosSync();
const contactosIgnorar = JSON.parse(fs.readFileSync('./data/contactos-ignorar.json', 'utf8'));
const palabrasClave = JSON.parse(fs.readFileSync('./data/palabras-clave.json', 'utf8'));
const configPedidos = cache.obtenerConfigPedidosSync();

// ═══════════════════════════════════════
// 🔄 FUNCIÓN: RECARGAR DATOS DINÁMICAMENTE
// ═══════════════════════════════════════

function obtenerListaPrecios() {
    try {
        return cache.obtenerProductosSync();
    } catch (error) {
        console.error('❌ Error al cargar lista de precios:', error);
        return {};
    }
}

function obtenerConfigNegocio() {
    try {
        return cache.obtenerNegocioSync();
    } catch (error) {
        console.error('❌ Error al cargar configuración del negocio:', error);
        return negocioData;
    }
}

// ═══════════════════════════════════════
// 🤖 INTEGRACIÓN CON GROQ IA (GRATIS)
// ═══════════════════════════════════════

const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: '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'
});

let usarIA = true;

async function procesarConIA(mensaje, contextoCliente) {
  if (!usarIA) return null;
  
  try {
    const listaProductos = generarListaProductosParaIA();
    
    const contextSystem = `Eres un asistente virtual para "${negocioData.nombre}".

PRODUCTOS DISPONIBLES:
${listaProductos}

INFORMACIÓN DEL NEGOCIO:
📍 Dirección: ${negocioData.direccion}
🕐 Horarios: ${negocioData.horarios}
💳 Medios de pago: ${negocioData.medios_pago}

INSTRUCCIONES IMPORTANTES DE FORMATO:
- SEPARA CADA FRASE O IDEA EN UNA LÍNEA NUEVA
- Usa UN salto de línea después de cada oración importante
- Usa DOS saltos de línea antes de preguntas
- Usa saltos de línea para separar información
- Ejemplo CORRECTO:
  "Te confirmo que son 2 cuadernos a $2500 cada uno.
  
  El total sería $5000.
  
  ¿Deseas agregar algo más?"
- Ejemplo INCORRECTO: "Te confirmo que son 2 cuadernos a $2500 cada uno. El total sería $5000. ¿Deseas agregar algo más?"
- usa emojis cuando nombres productos, categorias o cuando sea necesario
- Ejemplo INCORRECTO: "Te confirmo que son 2 cuadernos a $2500 cada uno. El total sería $5000. ¿Deseas agregar algo más?"

INSTRUCCIONES IMPORTANTES:
- Sé amable, profesional y conciso
- Responde en máximo 3-4 líneas
- Para listas largas, usa viñetas con saltos de línea
- Si preguntan por productos, menciona 5-6 opciones relevantes con sus precios exactos
- Si quieren hacer un pedido, explícales: "Para hacer un pedido, escribe por ejemplo: Quiero 2 cuadernos"
- Si preguntan horarios, dirección o medios de pago, responde con la información exacta de arriba
- Usa emojis moderadamente (1-2 por mensaje)
- NO inventes productos que no están en la lista
- Si no sabes algo, di: "Para más información, escribe 'ayuda'"
- Nunca menciones que eres una IA o un bot

EJEMPLO DE RESPUESTA BIEN FORMATEADA:
Usuario: "Qué productos tienen?"
Asistente: "¡Hola! 📚 Tenemos estos productos:

📦 Peluches
• Mediano: $35000
• Pequeño: $20002

🎮 Juguetes
• Uno: $2500
• Auto control remoto: $23000

📚 Librería
• Cartuchera simple: $2500
• Cuadernillo: $2500

¿Te interesa algo en particular?"`;

    console.log('🤖 Consultando Groq IA...');

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: contextSystem },
        { role: "user", content: mensaje }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.5,
      max_tokens: 400,
    });

    let respuesta = chatCompletion.choices[0].message.content;
    
    console.log(`✅ Groq respondió (${respuesta.length} caracteres)`);
    
    // ═══════════════════════════════════════
    // 🎨 POST-PROCESAMIENTO: MEJORAR FORMATO
    // ═══════════════════════════════════════
    
respuesta = respuesta
    // ═══════════════════════════════════════
    // 1️⃣ SEPARAR PUNTO SEGUIDO (CUALQUIER ORACIÓN)
    // ═══════════════════════════════════════
    
    // Separar TODAS las oraciones que terminan en punto
    .replace(/([.!])\s+([A-ZÁÉÍÓÚÑ¿])/g, '$1\n\n$2')
    
    // Separar después de "te confirmo"
    .replace(/(te confirmo[^.?!]*[.?!])/gi, '$1\n\n')
    
    // Separar después de números + productos + precios
    .replace(/(\d+\s*[📚🎮📦🧸]?\s*[a-záéíóúñ\s]+\s*a\s*\$\d+[^.]*\.)/gi, '$1\n\n')
    
    // Separar antes de "El total"
    .replace(/\s*(El total|Total|TOTAL)/gi, '\n\n$1')
    
    // Separar preguntas
    .replace(/([.!])\s*¿/g, '$1\n\n¿')
    
    // Separar después de "cada uno"
    .replace(/(cada uno\s*\.)/gi, '$1\n\n')
    
    // Separar emojis al final de oración
    .replace(/([.!])\s*(📝|🎉|💰|📦|🛒)/g, '$1\n\n$2')
    
    // ═══════════════════════════════════════
    // 2️⃣ SEPARAR DESPUÉS DE PRECIOS
    // ═══════════════════════════════════════
    
    // Separar después de $XXXX.
    .replace(/(\$\d+)\s*\./g, '$1.\n\n')
    
    // ═══════════════════════════════════════
    // 3️⃣ MEJORAR LISTAS
    // ═══════════════════════════════════════
    
    // Listas con "o"
    .replace(/\$(\d+)\s*o\s*\$/g, '• $$$1\n• $$')
    
    // Separar elementos con comas
    .replace(/(\$\d+)\s*,\s*([^y])/g, '$1\n• $2')
    
    // ═══════════════════════════════════════
    // 4️⃣ SEPARAR CATEGORÍAS
    // ═══════════════════════════════════════
    
    // Emojis de categorías
    .replace(/(📦|🎮|📚|🧸|🎉)\s*([^:]+):/gi, '\n\n$1 $2:\n')
    
    // Palabras clave
    .replace(/(juguetes?|librería|cartucheras?|peluches?|cuadernos?|artículos?|productos?)\s+como/gi, '\n\n📦 $1:\n•')
    
    // "También"
    .replace(/,?\s*y también/gi, '\n\n📦 También:\n•')
    .replace(/,?\s*también/gi, '\n\n📦 También:\n•')
    
    // ═══════════════════════════════════════
    // 5️⃣ SEPARAR OPCIONES
    // ═══════════════════════════════════════
    
    // Separar "¿Deseas..."
    .replace(/¿Deseas/gi, '\n\n¿Deseas')
    
    // Separar "o proceder"
    .replace(/\s+o\s+proceder/gi, '\no proceder')
    
    // Separar después de emojis de pregunta
    .replace(/(más\?)\s*📝/g, '$1\n\n📝')
    
    // ═══════════════════════════════════════
    // 6️⃣ LIMPIEZA FINAL
    // ═══════════════════════════════════════
    
    // Limpiar múltiples saltos (máximo 2)
    .replace(/\n{3,}/g, '\n\n')
    
    // Limpiar espacios múltiples
    .replace(/\s{2,}/g, ' ')
    
    // Limpiar espacios antes/después de saltos
    .replace(/\s+\n/g, '\n')
    .replace(/\n\s+/g, '\n')
    
    // Trim final
    .trim();
    
    console.log(`📝 Respuesta formateada`);
    
    return respuesta;
    
  } catch (error) {
    console.error('❌ Error con Groq:', error.response?.status, error.response?.data || error.message);
    
    if (error.message.includes('rate_limit')) {
      console.log('⏳ Límite alcanzado, esperando...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      return null;
    }
    
    return null;
  }
}

function generarListaProductosParaIA() {
  const listaPrecios = obtenerListaPrecios();

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
}

// ═══════════════════════════════════════
// 💬 API PARA GESTIÓN DE RESPUESTAS
// ═══════════════════════════════════════

app.get('/api/respuestas', (req, res) => {
    try {
        const respuestasBot = cache.obtenerRespuestasBotSync();
        
        const respuestasApp = {
            bienvenida: respuestasBot.saludos?.bienvenida || '',
            catalogo_enviado: respuestasBot.consultas?.lista_categorias || '',
            producto_no_disponible: respuestasBot.pedidos?.sin_stock || '',
            confirmacion_pedido: respuestasBot.pedidos?.productos_encontrados || '',
            pedido_confirmado: respuestasBot.pedidos?.pedido_confirmado || '',
            despedida: respuestasBot.saludos?.despedida || '',
            fuera_horario: respuestasBot.comandos_dueño?.bot_pausado || '🕐 Actualmente estamos fuera del horario de atención.',
        };
        
        console.log('✅ GET /api/respuestas - Respuestas enviadas a la app');
        res.json(respuestasApp);
    } catch (error) {
        console.error('❌ Error al cargar respuestas:', error);
        res.status(500).json({ error: 'Error al cargar respuestas' });
    }
});

app.put('/api/respuestas', (req, res) => {
    try {
        const {
            bienvenida,
            catalogo_enviado,
            producto_no_disponible,
            confirmacion_pedido,
            pedido_confirmado,
            despedida,
            fuera_horario,
        } = req.body;

        if (!bienvenida || !catalogo_enviado || !producto_no_disponible || 
            !confirmacion_pedido || !pedido_confirmado || !despedida || !fuera_horario) {
            return res.status(400).json({ 
                error: 'Todos los campos son obligatorios' 
            });
        }

        console.log('📝 Actualizando respuestas del bot desde la app móvil...');

        const respuestasBot = cache.obtenerRespuestasBotSync();

        if (respuestasBot.saludos) {
            respuestasBot.saludos.bienvenida = bienvenida.trim();
            respuestasBot.saludos.despedida = despedida.trim();
        }

        if (respuestasBot.consultas) {
            respuestasBot.consultas.lista_categorias = catalogo_enviado.trim();
        }

        if (respuestasBot.pedidos) {
            respuestasBot.pedidos.sin_stock = producto_no_disponible.trim();
            respuestasBot.pedidos.productos_encontrados = confirmacion_pedido.trim();
            respuestasBot.pedidos.pedido_confirmado = pedido_confirmado.trim();
        }
        
        if (respuestasBot.comandos_dueño) {
            respuestasBot.comandos_dueño.bot_pausado = fuera_horario.trim();
        }

        fs.writeFileSync('./data/respuestas-bot.json', JSON.stringify(respuestasBot, null, 2));
        cache.invalidarRespuestasBot();

        console.log('✅ Respuestas actualizadas exitosamente desde la app móvil');
        
        res.json({ 
            success: true, 
            mensaje: 'Respuestas actualizadas exitosamente'
        });
    } catch (error) {
        console.error('❌ Error al actualizar respuestas:', error);
        res.status(500).json({ error: 'Error al actualizar respuestas', detalle: error.message });
    }
});

app.post('/api/respuestas/restaurar', (req, res) => {
    try {
        const respuestasDefault = {
            "saludos": {
                "bienvenida": "¡Hola{cliente_frecuente}! 👋 Bienvenido a *{nombre_negocio}*\n\n{info_cliente}Te puedo ayudar con:\n📋 Lista de precios\n🕐 Horarios\n📍 Ubicación\n📦 Stock de productos\n🛒 Hacer un pedido\n💳 Medios de pago{historial_pedidos}\n\n¿Qué necesitas?",
                "despedida": "🙏 ¡Gracias por tu preferencia!\n\n¿Deseas hacer un nuevo pedido? 🛒"
            },
            "consultas": {
                "horarios": "🕐 *Horarios de Atención*\n\n{horarios}",
                "ubicacion": "📍 *Nuestra Ubicación*\n\n{direccion}\n\nTe esperamos! 😊",
                "medios_pago": "💳 *Medios de Pago:*\n\n{medios_pago}",
                "contacto": "📞 *Contacto*\n\nWhatsApp: {whatsapp}\nTeléfono: {telefono}\n\n¡Estamos para ayudarte! 😊",
                "stock": "📦 Para consultar stock específico, escribe el nombre del producto.\n\nEjemplo: \"Hay cuadernos A4?\"",
                "lista_categorias": "📋 *Categorías Disponibles:*\n\n📚 Librería\n🎉 Cotillón\n🧸 Juguetería\n📄 Fotocopiadora\n🖨️ Impresiones personalizadas\n💍 Bijou\n📱 Accesorios celular\n💻 Accesorios computadora\n\nPara hacer un pedido, escribe por ejemplo:\n\"Quiero 2 cuadernos y 5 lapiceras\""
            },
            "pedidos": {
                "carrito_vacio": "🛒 Tu carrito está vacío\n\nPara hacer un pedido, escribe por ejemplo:\n\"Quiero 2 cuadernos\" o \"Dame 5 lapiceras\"",
                "productos_encontrados": "🔍 *Encontré estos productos:*\n\n{lista_productos}\n\n¿Es correcto este pedido?\n\n• Escribe *\"si\"* para agregarlo al carrito\n• Escribe *\"no\"* para cancelar",
                "productos_agregados": "✅ Productos agregados al carrito\n\n💡 ¿Deseas agregar más productos?\n• Escribe otro pedido (ej: \"3 lapiceras\")\n• O escribe *\"confirmar\"* para finalizar",
                "pedido_confirmado": "✅ *PEDIDO CONFIRMADO*\n\n📄 Número de pedido: *#{numero_pedido}*\n\n🙏 ¡Gracias por tu compra!",
                "carrito_cancelado": "✅ Carrito vaciado correctamente\n\nPara hacer un nuevo pedido, escribe por ejemplo:\n\"Quiero 2 cuadernos\"",
                "sin_stock": "❌ No puedo agregar estos productos porque están SIN STOCK:\n\n{productos_sin_stock}\n\n¿Deseas continuar solo con los productos disponibles? (si/no)"
            },
            "errores": {
                "no_entiendo": "No entendí bien tu consulta 🤔\n\nPuedes preguntarme sobre:\n• Precios y productos\n• Hacer un pedido (ej: \"Quiero 2 cuadernos\")\n• Ver mis pedidos anteriores\n• Horarios de atención\n• Ubicación del local\n• Stock disponible\n• Medios de pago\n\n¿En qué te puedo ayudar?",
                "sin_productos_carrito": "❌ No tienes productos en el carrito.\n\nPara hacer un pedido, escribe por ejemplo:\n\"Quiero 2 cuadernos\"",
                "numero_invalido": "❌ Número de producto inválido",
                "opcion_invalida": "❌ Opción no válida.\n\nResponde *\"1\"* para retiro o *\"2\"* para delivery"
            },
            "comandos_dueño": {
                "bot_pausado": "⏸️ *RESPUESTAS AUTOMÁTICAS PAUSADAS*\n\nEl bot NO responderá a los clientes.\nTú puedes seguir controlándolo.\n\nPara reanudar: \"reanudar bot\"",
                "bot_reactivado": "▶️ *RESPUESTAS AUTOMÁTICAS REACTIVADAS*\n\nEl bot volverá a responder a los clientes automáticamente.\n\nPara pausar: \"pausar bot\"",
                "notificaciones_activadas": "✅ *Notificaciones ACTIVADAS*\n\nRecibirás un mensaje automático cada vez que un cliente confirme un pedido.\n\nPara desactivar: \"desactivar notificaciones\"",
                "notificaciones_desactivadas": "🔕 *Notificaciones DESACTIVADAS*\n\nYa no recibirás mensajes automáticos de nuevos pedidos.\n\nPara activar: \"activar notificaciones\""
            }
        };
        
        fs.writeFileSync('./data/respuestas-bot.json', JSON.stringify(respuestasDefault, null, 2));
        cache.invalidarRespuestasBot();
        
        console.log('✅ Respuestas restauradas a valores por defecto');
        
        res.json({ 
            success: true, 
            mensaje: 'Respuestas restauradas exitosamente',
            respuestas: respuestasDefault
        });
    } catch (error) {
        console.error('❌ Error al restaurar respuestas:', error);
        res.status(500).json({ error: 'Error al restaurar respuestas' });
    }
});
// ═══════════════════════════════════════
// 🏪 API PARA CONFIGURACIÓN DEL NEGOCIO
// ═══════════════════════════════════════

app.get('/api/configuracion', (req, res) => {
    try {
        const negocio = cache.obtenerNegocioSync();
        res.json(negocio);
    } catch (error) {
        console.error('❌ Error al cargar configuración:', error);
        res.status(500).json({ error: 'Error al cargar configuración', detalle: error.message });
    }
});

app.put('/api/configuracion', (req, res) => {
    try {
        const nuevaConfiguracion = req.body;
        
        console.log('🏪 Actualizando configuración del negocio...');
        
        if (!nuevaConfiguracion.nombre || !nuevaConfiguracion.whatsapp) {
            return res.status(400).json({ error: 'Nombre y WhatsApp son requeridos' });
        }
        
        const configuracionActual = cache.obtenerNegocioSync();
        
        const configuracionActualizada = {
            ...nuevaConfiguracion,
            respuestas_automaticas_activas: configuracionActual.respuestas_automaticas_activas,
            notificaciones_activas: configuracionActual.notificaciones_activas
        };
        
        fs.writeFileSync('./data/negocio.json', JSON.stringify(configuracionActualizada, null, 2));
        cache.invalidarNegocio();
        
        console.log('✅ Configuración actualizada exitosamente');
        
        res.json({ 
            success: true, 
            mensaje: 'Configuración actualizada exitosamente'
        });
    } catch (error) {
        console.error('❌ Error al actualizar configuración:', error);
        res.status(500).json({ error: 'Error al actualizar configuración', detalle: error.message });
    }
});

app.get('/api/configuracion/pedidos', (req, res) => {
    try {
        const configPedidos = cache.obtenerConfigPedidosSync();
        res.json(configPedidos);
    } catch (error) {
        console.error('❌ Error al cargar configuración de pedidos:', error);
        res.status(500).json({ error: 'Error al cargar configuración de pedidos' });
    }
});

app.put('/api/configuracion/pedidos', (req, res) => {
    try {
        const nuevaConfiguracion = req.body;
        
        console.log('📦 Actualizando configuración de pedidos...');
        
        fs.writeFileSync('./data/config-pedidos.json', JSON.stringify(nuevaConfiguracion, null, 2));
        cache.invalidarConfigPedidos();
        
        console.log('✅ Configuración de pedidos actualizada');
        
        res.json({ 
            success: true, 
            mensaje: 'Configuración de pedidos actualizada exitosamente'
        });
    } catch (error) {
        console.error('❌ Error al actualizar configuración de pedidos:', error);
        res.status(500).json({ error: 'Error al actualizar configuración de pedidos' });
    }
});

app.get('/api/configuracion/palabras-clave', (req, res) => {
    try {
        const palabrasClave = JSON.parse(fs.readFileSync('./data/palabras-clave.json', 'utf8'));
        res.json(palabrasClave);
    } catch (error) {
        console.error('❌ Error al cargar palabras clave:', error);
        res.status(500).json({ error: 'Error al cargar palabras clave' });
    }
});

app.put('/api/configuracion/palabras-clave', (req, res) => {
    try {
        const nuevasPalabras = req.body;
        
        console.log('🔑 Actualizando palabras clave...');
        
        fs.writeFileSync('./data/palabras-clave.json', JSON.stringify(nuevasPalabras, null, 2));
        
        console.log('✅ Palabras clave actualizadas');
        
        res.json({ 
            success: true, 
            mensaje: 'Palabras clave actualizadas exitosamente'
        });
    } catch (error) {
        console.error('❌ Error al actualizar palabras clave:', error);
        res.status(500).json({ error: 'Error al actualizar palabras clave' });
    }
});

// ═══════════════════════════════════════
// 💰 API PARA GESTIÓN DE DESCUENTOS
// ═══════════════════════════════════════

app.get('/api/descuentos', (req, res) => {
    try {
        const configPedidos = cache.obtenerConfigPedidosSync();
        console.log('✅ GET /api/descuentos - Configuración enviada');
        res.json(configPedidos.descuentos);
    } catch (error) {
        console.error('❌ Error al cargar descuentos:', error);
        res.status(500).json({ error: 'Error al cargar descuentos' });
    }
});

app.put('/api/descuentos', (req, res) => {
    try {
        const { habilitado, reglas } = req.body;

        console.log('💰 Actualizando configuración de descuentos...');
        console.log('   Habilitado:', habilitado);
        console.log('   Reglas:', reglas.length);

        if (!Array.isArray(reglas)) {
            return res.status(400).json({ error: 'Las reglas deben ser un array' });
        }

        for (const regla of reglas) {
            if (!regla.minimo || !regla.porcentaje || !regla.descripcion) {
                return res.status(400).json({ 
                    error: 'Cada regla debe tener: minimo, porcentaje y descripcion' 
                });
            }

            if (regla.minimo <= 0) {
                return res.status(400).json({ 
                    error: 'El monto mínimo debe ser mayor a 0' 
                });
            }

            if (regla.porcentaje <= 0 || regla.porcentaje > 100) {
                return res.status(400).json({ 
                    error: 'El porcentaje debe estar entre 1 y 100' 
                });
            }
        }

        const configPedidos = cache.obtenerConfigPedidosSync();

        configPedidos.descuentos = {
            habilitado: habilitado !== false,
            reglas: reglas.map(r => ({
                minimo: parseFloat(r.minimo),
                porcentaje: parseFloat(r.porcentaje),
                descripcion: r.descripcion.trim()
            }))
        };

        fs.writeFileSync('./data/config-pedidos.json', JSON.stringify(configPedidos, null, 2));
        cache.invalidarConfigPedidos();

        console.log('✅ Descuentos actualizados exitosamente');

        res.json({
            success: true,
            mensaje: 'Descuentos actualizados exitosamente',
            descuentos: configPedidos.descuentos
        });

    } catch (error) {
        console.error('❌ Error al actualizar descuentos:', error);
        res.status(500).json({ error: 'Error al actualizar descuentos', detalle: error.message });
    }
});

app.post('/api/descuentos/regla', (req, res) => {
    try {
        const { minimo, porcentaje, descripcion } = req.body;

        console.log('➕ Agregando nueva regla de descuento...');

        if (!minimo || !porcentaje || !descripcion) {
            return res.status(400).json({ 
                error: 'Se requieren: minimo, porcentaje y descripcion' 
            });
        }

        if (minimo <= 0) {
            return res.status(400).json({ error: 'El monto mínimo debe ser mayor a 0' });
        }

        if (porcentaje <= 0 || porcentaje > 100) {
            return res.status(400).json({ error: 'El porcentaje debe estar entre 1 y 100' });
        }

        const configPedidos = cache.obtenerConfigPedidosSync();

        const nuevaRegla = {
            minimo: parseFloat(minimo),
            porcentaje: parseFloat(porcentaje),
            descripcion: descripcion.trim()
        };

        configPedidos.descuentos.reglas.push(nuevaRegla);

        configPedidos.descuentos.reglas.sort((a, b) => a.minimo - b.minimo);

        fs.writeFileSync('./data/config-pedidos.json', JSON.stringify(configPedidos, null, 2));
        cache.invalidarConfigPedidos();

        console.log('✅ Regla agregada exitosamente');

        res.json({
            success: true,
            mensaje: 'Regla agregada exitosamente',
            regla: nuevaRegla
        });

    } catch (error) {
        console.error('❌ Error al agregar regla:', error);
        res.status(500).json({ error: 'Error al agregar regla', detalle: error.message });
    }
});

app.delete('/api/descuentos/regla/:index', (req, res) => {
    try {
        const index = parseInt(req.params.index);

        console.log('🗑️ Eliminando regla de descuento:', index);

        const configPedidos = cache.obtenerConfigPedidosSync();

        if (index < 0 || index >= configPedidos.descuentos.reglas.length) {
            return res.status(400).json({ error: 'Índice de regla inválido' });
        }

        const reglaEliminada = configPedidos.descuentos.reglas.splice(index, 1)[0];

        fs.writeFileSync('./data/config-pedidos.json', JSON.stringify(configPedidos, null, 2));
        cache.invalidarConfigPedidos();

        console.log('✅ Regla eliminada:', reglaEliminada.descripcion);

        res.json({
            success: true,
            mensaje: 'Regla eliminada exitosamente',
            reglaEliminada
        });

    } catch (error) {
        console.error('❌ Error al eliminar regla:', error);
        res.status(500).json({ error: 'Error al eliminar regla', detalle: error.message });
    }
});

app.post('/api/descuentos/toggle', (req, res) => {
    try {
        const configPedidos = cache.obtenerConfigPedidosSync();

        configPedidos.descuentos.habilitado = !configPedidos.descuentos.habilitado;

        fs.writeFileSync('./data/config-pedidos.json', JSON.stringify(configPedidos, null, 2));
        cache.invalidarConfigPedidos();

        const estado = configPedidos.descuentos.habilitado ? 'ACTIVADOS' : 'DESACTIVADOS';
        console.log(`🔄 Descuentos ${estado}`);

        res.json({
            success: true,
            habilitado: configPedidos.descuentos.habilitado,
            mensaje: `Descuentos ${estado.toLowerCase()}`
        });

    } catch (error) {
        console.error('❌ Error al cambiar estado de descuentos:', error);
        res.status(500).json({ error: 'Error al cambiar estado' });
    }
});

// ═══════════════════════════════════════
// 📸 API PARA GESTIÓN DE IMÁGENES
// ═══════════════════════════════════════

const cloudinary = require('./config/cloudinary');
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

app.post('/api/productos/imagen', upload.single('imagen'), async (req, res) => {
  try {
    const { productoId, categoriaId, subcategoriaId } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió ninguna imagen' });
    }

    console.log('📸 Subiendo imagen para:', productoId);
    console.log('📁 Categoría:', categoriaId, 'Subcategoría:', subcategoriaId);

    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;

    const result = await cloudinary.uploader.upload(dataURI, {
      folder: `gestionbot/productos/${categoriaId}/${subcategoriaId}`,
      public_id: `${productoId}_${Date.now()}`,
      transformation: [
        { width: 1000, height: 1000, crop: 'limit' },
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ]
    });

    console.log('✅ Imagen subida a Cloudinary:', result.secure_url);

    const listaPrecios = cache.obtenerProductosSync();
    
    // ✅ NUEVO: Normalizar IDs correctamente
    const catId = categoriaId.toLowerCase().replace(/\s+/g, '_');
    const subId = subcategoriaId.toLowerCase().replace(/\s+/g, '_');

    // ✅ NUEVO: Extraer solo el nombre del producto (última parte del ID)
    let prodId;
    if (productoId.includes('::')) {
      const partes = productoId.split('::');
      prodId = partes[partes.length - 1]; // Última parte = nombre del producto
    } else {
      prodId = productoId.toLowerCase().replace(/\s+/g, '_');
    }

    console.log('🔍 Buscando producto:');
    console.log('   Categoría:', catId);
    console.log('   Subcategoría:', subId);
    console.log('   Producto:', prodId);

    // Buscar el producto
    let producto = null;
    if (listaPrecios[catId] && listaPrecios[catId][subId]) {
      producto = listaPrecios[catId][subId][prodId];
    }

    if (producto) {
      // Inicializar array de imágenes si no existe
      if (!producto.imagenes) {
        producto.imagenes = [];
      }

      // Agregar nueva imagen
      producto.imagenes.push({
        url: result.secure_url,
        public_id: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        subida: new Date().toISOString()
      });

      // Guardar
      fs.writeFileSync('./data/lista-precios.json', JSON.stringify(listaPrecios, null, 2));
    cache.invalidarProductos();
        productoIndex.reconstruir(cache.obtenerProductosSync());
      console.log('💾 Imagen guardada en lista-precios.json');
      console.log('✅ Total de imágenes del producto:', producto.imagenes.length);
    } else {
      console.log('⚠️ Producto no encontrado');
      console.log('   Estructura esperada:', `listaPrecios["${catId}"]["${subId}"]["${prodId}"]`);
      console.log('   Categorías disponibles:', Object.keys(listaPrecios));
      if (listaPrecios[catId]) {
        console.log('   Subcategorías en', catId + ':', Object.keys(listaPrecios[catId]));
        if (listaPrecios[catId][subId]) {
          console.log('   Productos en', subId + ':', Object.keys(listaPrecios[catId][subId]));
        }
      }
      console.log('⚠️ Imagen subida a Cloudinary pero NO vinculada al producto en JSON');
    }

    res.json({
      success: true,
      imagen: {
        url: result.secure_url,
        public_id: result.public_id
      },
      mensaje: 'Imagen subida exitosamente'
    });

  } catch (error) {
    console.error('❌ Error al subir imagen:', error);
    res.status(500).json({ 
      error: 'Error al subir imagen', 
      detalle: error.message 
    });
  }
});

app.delete('/api/productos/imagen', async (req, res) => {
  try {
    const { productoId, categoriaId, subcategoriaId, publicId } = req.body;

    console.log('🗑️ Eliminando imagen:', publicId);

    await cloudinary.uploader.destroy(publicId);

    const catId = categoriaId.toLowerCase().replace(/\s+/g, '_');
    const subId = subcategoriaId.toLowerCase().replace(/\s+/g, '_');
    const prodId = productoId.toLowerCase().replace(/\s+/g, '_');

    const listaPrecios = cache.obtenerProductosSync();
    
    if (listaPrecios[catId] && listaPrecios[catId][subId]) {
      const producto = listaPrecios[catId][subId][prodId];
      
      if (producto && producto.imagenes) {
        producto.imagenes = producto.imagenes.filter(img => img.public_id !== publicId);
        fs.writeFileSync('./data/lista-precios.json', JSON.stringify(listaPrecios, null, 2));
    cache.invalidarProductos();
        productoIndex.reconstruir(cache.obtenerProductosSync());
        console.log('💾 Imagen eliminada de lista-precios.json');
      }
    }

    console.log('✅ Imagen eliminada de Cloudinary');

    res.json({
      success: true,
      mensaje: 'Imagen eliminada exitosamente'
    });

  } catch (error) {
    console.error('❌ Error al eliminar imagen:', error);
    res.status(500).json({ 
      error: 'Error al eliminar imagen', 
      detalle: error.message 
    });
  }
});

app.get('/api/productos/:categoriaId/:subcategoriaId/:productoId/imagenes', (req, res) => {
  try {
    const { categoriaId, subcategoriaId, productoId } = req.params;

    const catId = categoriaId.toLowerCase().replace(/\s+/g, '_');
    const subId = subcategoriaId.toLowerCase().replace(/\s+/g, '_');
    const prodId = productoId.toLowerCase().replace(/\s+/g, '_');

    const listaPrecios = cache.obtenerProductosSync();
    const producto = listaPrecios[catId]?.[subId]?.[prodId];

    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json({
      imagenes: producto.imagenes || [],
      total: producto.imagenes?.length || 0
    });

  } catch (error) {
    console.error('❌ Error al obtener imágenes:', error);
    res.status(500).json({ error: 'Error al obtener imágenes' });
  }
});

app.put('/api/productos/imagenes/reordenar', (req, res) => {
  try {
    const { productoId, categoriaId, subcategoriaId, imagenesOrdenadas } = req.body;

    console.log('🔄 Reordenando imágenes para:', productoId);

    const catId = categoriaId.toLowerCase().replace(/\s+/g, '_');
    const subId = subcategoriaId.toLowerCase().replace(/\s+/g, '_');
    const prodId = productoId.toLowerCase().replace(/\s+/g, '_');

    const listaPrecios = cache.obtenerProductosSync();
    
    if (listaPrecios[catId] && listaPrecios[catId][subId]) {
      const producto = listaPrecios[catId][subId][prodId];
      
      if (!producto) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }

      producto.imagenes = imagenesOrdenadas;
      fs.writeFileSync('./data/lista-precios.json', JSON.stringify(listaPrecios, null, 2));
    cache.invalidarProductos();
        productoIndex.reconstruir(cache.obtenerProductosSync());

      console.log('✅ Imágenes reordenadas');

      res.json({
        success: true,
        mensaje: 'Orden de imágenes actualizado'
      });
    } else {
      res.status(404).json({ error: 'Producto no encontrado' });
    }

  } catch (error) {
    console.error('❌ Error al reordenar imágenes:', error);
    res.status(500).json({ error: 'Error al reordenar imágenes' });
  }
});

// ═══════════════════════════════════════
// 📦 API PARA GESTIÓN DE PRODUCTOS
// ═══════════════════════════════════════

app.get('/api/productos-completo', (req, res) => {
    try {
        const productos = cache.obtenerProductosSync();
        res.json(productos);
    } catch (error) {
        res.status(500).json({ error: 'Error al cargar productos' });
    }
});

app.get('/api/productos', (req, res) => {
    try {
        const listaPrecios = cache.obtenerProductosSync();
        const productosArray = [];
        
        for (const [categoria, subcategorias] of Object.entries(listaPrecios)) {
            for (const [subcategoria, productos] of Object.entries(subcategorias)) {
                for (const [nombre, info] of Object.entries(productos)) {
                    productosArray.push({
                        id: `${categoria}::${subcategoria}::${nombre}`,
                        categoria,
                        subcategoria,
                        nombre,
                        precio: info.precio,
                        precio_desde: info.precio_desde,
                        unidad: info.unidad,
                        stock: info.stock !== false,
                        codigo_barras: info.codigo_barras || null,
                        imagenes: info.imagenes || [],
                    });
                }
            }
        }
        
        console.log(`✅ Enviando ${productosArray.length} productos al frontend`);
        res.json(productosArray);
    } catch (error) {
        console.error('❌ Error al cargar productos:', error);
        res.status(500).json({ error: 'Error al cargar productos', detalle: error.message });
    }
});

app.get('/api/productos/buscar-codigo/:codigo', (req, res) => {
    try {
        const { codigo } = req.params;

        console.log('🔍 Buscando producto por código de barras:', codigo);

        const listaPrecios = cache.obtenerProductosSync();
        
        for (const [categoria, subcategorias] of Object.entries(listaPrecios)) {
            for (const [subcategoria, productos] of Object.entries(subcategorias)) {
                for (const [nombre, info] of Object.entries(productos)) {
                    if (info.codigo_barras === codigo) {
                        console.log('✅ Producto encontrado:', nombre);
                        return res.json({
                            encontrado: true,
                            producto: {
                                id: `${categoria}::${subcategoria}::${nombre}`,
                                categoria,
                                subcategoria,
                                nombre,
                                precio: info.precio,
                                precio_desde: info.precio_desde,
                                unidad: info.unidad,
                                stock: info.stock !== false,
                                codigo_barras: info.codigo_barras,
                                imagenes: info.imagenes || [],
                            }
                        });
                    }
                }
            }
        }

        console.log('❌ Producto no encontrado');
        res.json({ 
            encontrado: false,
            mensaje: 'No se encontró ningún producto con ese código de barras' 
        });

    } catch (error) {
        console.error('❌ Error al buscar producto:', error);
        res.status(500).json({ error: 'Error al buscar producto', detalle: error.message });
    }
});

app.get('/api/categorias', (req, res) => {
    try {
        const listaPrecios = cache.obtenerProductosSync();
        const categorias = Object.keys(listaPrecios);
        
        const categoriasInfo = categorias.map(cat => {
            const subcategorias = Object.keys(listaPrecios[cat]);
            let totalProductos = 0;
            
            subcategorias.forEach(sub => {
                totalProductos += Object.keys(listaPrecios[cat][sub]).length;
            });
            
            return {
                nombre: cat,
                subcategorias: subcategorias,
                total_productos: totalProductos
            };
        });
        
        res.json(categoriasInfo);
    } catch (error) {
        res.status(500).json({ error: 'Error al cargar categorías' });
    }
});

app.post('/api/categorias', (req, res) => {
    try {
        const { nombre, subcategoria } = req.body;
        
        console.log(`📁 Creando nueva categoría:`);
        console.log(`   Nombre: ${nombre}`);
        console.log(`   Subcategoría: ${subcategoria}`);
        
        if (!nombre || !subcategoria) {
            return res.status(400).json({ error: 'Nombre y subcategoría requeridos' });
        }
        
        const nombreNormalizado = normalizarTexto(nombre);
        const subcategoriaNormalizada = normalizarTexto(subcategoria);
        
        console.log(`   Nombre normalizado: ${nombreNormalizado}`);
        console.log(`   Subcategoría normalizada: ${subcategoriaNormalizada}`);
        
        const listaPrecios = cache.obtenerProductosSync();
        
        if (!listaPrecios[nombreNormalizado]) {
            listaPrecios[nombreNormalizado] = {};
            console.log(`   ✅ Categoría "${nombreNormalizado}" creada`);
        } else {
            console.log(`   ⚠️ Categoría "${nombreNormalizado}" ya existe`);
        }
        
        if (!listaPrecios[nombreNormalizado][subcategoriaNormalizada]) {
            listaPrecios[nombreNormalizado][subcategoriaNormalizada] = {};
            console.log(`   ✅ Subcategoría "${subcategoriaNormalizada}" creada`);
        } else {
            console.log(`   ⚠️ Subcategoría "${subcategoriaNormalizada}" ya existe`);
        }
        
        fs.writeFileSync('./data/lista-precios.json', JSON.stringify(listaPrecios, null, 2));
    cache.invalidarProductos();
        productoIndex.reconstruir(cache.obtenerProductosSync());
        
        console.log(`✅ Categoría guardada exitosamente`);
        
        res.json({ 
            success: true, 
            mensaje: 'Categoría creada exitosamente',
            categoria: nombreNormalizado,
            subcategoria: subcategoriaNormalizada
        });
    } catch (error) {
        console.error('❌ Error al crear categoría:', error);
        res.status(500).json({ error: 'Error al crear categoría', detalle: error.message });
    }
});

app.post('/api/productos', (req, res) => {
    try {
        let { categoria, subcategoria, nombre, precio, precio_desde, stock, unidad, codigo_barras, imagenes } = req.body;
        
        console.log('📤 Solicitud de crear producto:', req.body);
        
        if (!categoria || !categoria.trim()) {
            return res.status(400).json({ error: 'La categoría es obligatoria' });
        }
        
        if (!subcategoria || !subcategoria.trim()) {
            return res.status(400).json({ error: 'La subcategoría es obligatoria' });
        }
        
        if (!nombre || !nombre.trim()) {
            return res.status(400).json({ error: 'El nombre es obligatorio' });
        }
        
        if (!precio && !precio_desde) {
            return res.status(400).json({ error: 'Debes ingresar un precio (fijo o desde)' });
        }
        
        if (precio && precio_desde) {
            return res.status(400).json({ error: 'Solo puedes usar precio fijo O precio desde, no ambos' });
        }
        
        const categoriaNormalizada = normalizarTexto(categoria);
        const subcategoriaNormalizada = normalizarTexto(subcategoria);
        const nombreNormalizado = normalizarTexto(nombre);
        
        if (!categoriaNormalizada || !subcategoriaNormalizada || !nombreNormalizado) {
            return res.status(400).json({ error: 'Los campos no pueden estar vacíos o contener solo espacios' });
        }
        
        const listaPrecios = cache.obtenerProductosSync();
        
        if (codigo_barras && codigo_barras.trim()) {
            for (const [cat, subcats] of Object.entries(listaPrecios)) {
                for (const [subcat, productos] of Object.entries(subcats)) {
                    for (const [prod, info] of Object.entries(productos)) {
                        if (info.codigo_barras === codigo_barras.trim()) {
                            return res.status(400).json({ 
                                error: `El código de barras ya existe en el producto "${formatearTexto(prod)}" de la categoría "${formatearTexto(cat)}"` 
                            });
                        }
                    }
                }
            }
        }
        
        if (!listaPrecios[categoriaNormalizada]) {
            listaPrecios[categoriaNormalizada] = {};
        }
        
        if (!listaPrecios[categoriaNormalizada][subcategoriaNormalizada]) {
            listaPrecios[categoriaNormalizada][subcategoriaNormalizada] = {};
        }
        
        if (listaPrecios[categoriaNormalizada][subcategoriaNormalizada][nombreNormalizado]) {
            return res.status(400).json({ error: 'Ya existe un producto con ese nombre en esta categoría y subcategoría' });
        }
        
        const nuevoProducto = {
            stock: stock !== false,
        };
        
        if (precio) {
            nuevoProducto.precio = parseFloat(precio);
        }
        
        if (precio_desde) {
            nuevoProducto.precio_desde = parseFloat(precio_desde);
        }
        
        if (unidad) {
            nuevoProducto.unidad = unidad.trim();
        }
        
        if (codigo_barras && codigo_barras.trim()) {
            nuevoProducto.codigo_barras = codigo_barras.trim();
        }

        if (imagenes && Array.isArray(imagenes) && imagenes.length > 0) {
            nuevoProducto.imagenes = imagenes;
        }
        
        listaPrecios[categoriaNormalizada][subcategoriaNormalizada][nombreNormalizado] = nuevoProducto;
        
        fs.writeFileSync('./data/lista-precios.json', JSON.stringify(listaPrecios, null, 2));
    cache.invalidarProductos();
        productoIndex.reconstruir(cache.obtenerProductosSync());
        
        console.log('✅ Producto creado exitosamente:', nombreNormalizado);
        
        res.json({
            success: true,
            mensaje: 'Producto creado exitosamente',
            producto: {
                id: `${categoriaNormalizada}::${subcategoriaNormalizada}::${nombreNormalizado}`,
                categoria: categoriaNormalizada,
                subcategoria: subcategoriaNormalizada,
                nombre: nombreNormalizado,
                ...nuevoProducto
            }
        });
        
    } catch (error) {
        console.error('❌ Error al crear producto:', error);
        res.status(500).json({ error: 'Error al crear producto', detalle: error.message });
    }
});

app.put('/api/productos/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { 
            nuevo_nombre, 
            nombre,  // ⬅️ AGREGAR ESTO TAMBIÉN
            precio, 
            precio_desde, 
            unidad, 
            stock, 
            categoria: nuevaCategoria, 
            subcategoria: nuevaSubcategoria,
            codigo_barras,
            imagenes
        } = req.body;
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📤 PUT /api/productos/:id');
        console.log('   ID:', id);
        console.log('   Body completo:', JSON.stringify(req.body, null, 2));
        console.log('   nuevo_nombre:', nuevo_nombre);
        console.log('   nombre:', nombre);
        console.log('   precio:', precio);
        console.log('   stock:', stock);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        if (precio && precio_desde) {
            return res.status(400).json({ error: 'Solo puedes usar precio fijo O precio desde, no ambos' });
        }
        
        const partes = id.split('::');
        
        if (partes.length < 3) {
            return res.status(400).json({ error: 'ID de producto inválido' });
        }
        
        const categoriaOriginal = partes[0];
        const subcategoriaOriginal = partes[1];
        const nombreOriginal = partes.slice(2).join('::');
        
        let listaPrecios = cache.obtenerProductosSync();
        
        if (!listaPrecios[categoriaOriginal]?.[subcategoriaOriginal]?.[nombreOriginal]) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        
        const producto = listaPrecios[categoriaOriginal][subcategoriaOriginal][nombreOriginal];
        
        if (codigo_barras !== undefined && codigo_barras !== null && codigo_barras.trim() !== '') {
            const codigoNuevo = codigo_barras.trim();
            
            if (codigoNuevo !== producto.codigo_barras) {
                for (const [cat, subcats] of Object.entries(listaPrecios)) {
                    for (const [subcat, productos] of Object.entries(subcats)) {
                        for (const [prod, info] of Object.entries(productos)) {
                            if (cat === categoriaOriginal && subcat === subcategoriaOriginal && prod === nombreOriginal) {
                                continue;
                            }
                            
                            if (info.codigo_barras === codigoNuevo) {
                                return res.status(400).json({ 
                                    error: `El código de barras ya existe en el producto "${formatearTexto(prod)}" de la categoría "${formatearTexto(cat)}"` 
                                });
                            }
                        }
                    }
                }
            }
        }
        
        if (precio !== undefined) {
            producto.precio = parseFloat(precio);
            delete producto.precio_desde;
        }
        
        if (precio_desde !== undefined) {
            producto.precio_desde = parseFloat(precio_desde);
            delete producto.precio;
        }
        
        if (unidad !== undefined) {
            if (unidad.trim()) {
                producto.unidad = unidad.trim();
            } else {
                delete producto.unidad;
            }
        }
        
        if (stock !== undefined) {
            producto.stock = stock;
        }
        
        if (codigo_barras !== undefined) {
            if (codigo_barras === null || codigo_barras.trim() === '') {
                delete producto.codigo_barras;
            } else {
                producto.codigo_barras = codigo_barras.trim();
            }
        }

        if (imagenes !== undefined) {
            if (Array.isArray(imagenes)) {
                producto.imagenes = imagenes;
            } else {
                delete producto.imagenes;
            }
        }
        
const nombreNuevo = nuevo_nombre ? normalizarTexto(nuevo_nombre) : nombreOriginal;
const categoriaNueva = nuevaCategoria ? normalizarTexto(nuevaCategoria) : categoriaOriginal;
const subcategoriaNueva = nuevaSubcategoria ? normalizarTexto(nuevaSubcategoria) : subcategoriaOriginal;

console.log('🔍 Comparación:');
console.log('   Nombre original:', nombreOriginal);
console.log('   Nombre nuevo:', nombreNuevo);
console.log('   ¿Cambió el nombre?', nombreNuevo !== nombreOriginal);

// Verificar si hay cambios en ubicación o nombre
const cambioNombre = nombreNuevo !== nombreOriginal;
const cambioCategoria = categoriaNueva !== categoriaOriginal;
const cambioSubcategoria = subcategoriaNueva !== subcategoriaOriginal;
const cambioUbicacion = cambioNombre || cambioCategoria || cambioSubcategoria;

if (cambioUbicacion) {
    console.log('🔄 Moviendo/renombrando producto...');
    
    // Verificar que no exista en el destino
    if (!listaPrecios[categoriaNueva]) {
        listaPrecios[categoriaNueva] = {};
    }
    
    if (!listaPrecios[categoriaNueva][subcategoriaNueva]) {
        listaPrecios[categoriaNueva][subcategoriaNueva] = {};
    }
    
    if (listaPrecios[categoriaNueva][subcategoriaNueva][nombreNuevo] && 
        !(categoriaNueva === categoriaOriginal && 
          subcategoriaNueva === subcategoriaOriginal && 
          nombreNuevo === nombreOriginal)) {
        return res.status(400).json({ 
            error: 'Ya existe un producto con ese nombre en la ubicación de destino' 
        });
    }
    
    // Mover/renombrar el producto
    listaPrecios[categoriaNueva][subcategoriaNueva][nombreNuevo] = producto;
    
    // Solo eliminar el original si cambió algo
    if (!(categoriaNueva === categoriaOriginal && 
          subcategoriaNueva === subcategoriaOriginal && 
          nombreNuevo === nombreOriginal)) {
        delete listaPrecios[categoriaOriginal][subcategoriaOriginal][nombreOriginal];
        console.log('✅ Producto renombrado/movido');
    }
    
    // Limpiar subcategorías/categorías vacías
    if (Object.keys(listaPrecios[categoriaOriginal][subcategoriaOriginal]).length === 0) {
        delete listaPrecios[categoriaOriginal][subcategoriaOriginal];
        console.log('🧹 Subcategoría vacía eliminada:', subcategoriaOriginal);
    }
    
    if (Object.keys(listaPrecios[categoriaOriginal]).length === 0) {
        delete listaPrecios[categoriaOriginal];
        console.log('🧹 Categoría vacía eliminada:', categoriaOriginal);
    }
} else {
    // Si no cambió nada, solo actualizar los datos
    listaPrecios[categoriaOriginal][subcategoriaOriginal][nombreOriginal] = producto;
    console.log('✅ Producto actualizado (sin cambios de ubicación/nombre)');
}
        
        fs.writeFileSync('./data/lista-precios.json', JSON.stringify(listaPrecios, null, 2));
    cache.invalidarProductos();
        productoIndex.reconstruir(cache.obtenerProductosSync());
        
        console.log('✅ Producto actualizado exitosamente');
        
        res.json({
            success: true,
            mensaje: 'Producto actualizado exitosamente',
            producto: {
                id: `${categoriaNueva}::${subcategoriaNueva}::${nombreNuevo}`,
                categoria: categoriaNueva,
                subcategoria: subcategoriaNueva,
                nombre: nombreNuevo,
                ...producto
            }
        });
        
    } catch (error) {
        console.error('❌ Error al actualizar producto:', error);
        res.status(500).json({ error: 'Error al actualizar producto', detalle: error.message });
    }
});

function normalizarTexto(texto) {
    return texto
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^_|_$/g, '');
}

function formatearTexto(texto) {
    if (!texto) return '';
    
    return texto
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());
}

app.delete('/api/productos/:id', (req, res) => {
    try {
        const { id } = req.params;
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🗑️ DELETE - Intentando eliminar producto');
        console.log('   ID completo recibido:', id);
        
        const partes = id.split('::');
        console.log('   Dividiendo ID en partes:', partes);
        console.log('   Total de partes:', partes.length);
        
        if (partes.length < 3) {
            console.log('   ❌ ERROR: ID inválido (menos de 3 partes)');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            return res.status(400).json({ error: 'ID de producto inválido' });
        }
        
        const categoria = partes[0];
        const subcategoria = partes[1];
        const nombre = partes.slice(2).join('::');
        
        console.log('   📂 Estructura parseada:');
        console.log('      Categoría:', categoria);
        console.log('      Subcategoría:', subcategoria);
        console.log('      Nombre producto:', nombre);
        
        const listaPrecios = cache.obtenerProductosSync();
        
        console.log('   🔍 Verificando existencia...');
        
        if (!listaPrecios[categoria]) {
            console.log('   ❌ Categoría NO encontrada');
            console.log('   📁 Categorías disponibles:', Object.keys(listaPrecios));
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            return res.status(404).json({ error: 'Producto no encontrado (categoría inexistente)' });
        }
        console.log('   ✅ Categoría encontrada');
        
        if (!listaPrecios[categoria][subcategoria]) {
            console.log('   ❌ Subcategoría NO encontrada');
            console.log('   📁 Subcategorías disponibles en', categoria + ':', Object.keys(listaPrecios[categoria]));
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            return res.status(404).json({ error: 'Producto no encontrado (subcategoría inexistente)' });
        }
        console.log('   ✅ Subcategoría encontrada');
        
        if (!listaPrecios[categoria][subcategoria][nombre]) {
            console.log('   ❌ Producto NO encontrado');
            console.log('   📦 Productos disponibles en', subcategoria + ':');
            Object.keys(listaPrecios[categoria][subcategoria]).forEach(prod => {
                console.log('      - "' + prod + '" (longitud: ' + prod.length + ')');
            });
            console.log('   🔍 Buscando: "' + nombre + '" (longitud: ' + nombre.length + ')');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            return res.status(404).json({ error: 'Producto no encontrado (nombre no coincide)' });
        }
        console.log('   ✅ Producto encontrado, procediendo a eliminar...');
        
        delete listaPrecios[categoria][subcategoria][nombre];
        
        if (Object.keys(listaPrecios[categoria][subcategoria]).length === 0) {
            delete listaPrecios[categoria][subcategoria];
            console.log('   🧹 Subcategoría vacía eliminada');
        }
        
        if (Object.keys(listaPrecios[categoria]).length === 0) {
            delete listaPrecios[categoria];
            console.log('   🧹 Categoría vacía eliminada');
        }
        
        fs.writeFileSync('./data/lista-precios.json', JSON.stringify(listaPrecios, null, 2));
    cache.invalidarProductos();
        productoIndex.reconstruir(cache.obtenerProductosSync());
        
        console.log('   ✅ Producto eliminado exitosamente');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        res.json({ 
            success: true, 
            mensaje: 'Producto eliminado exitosamente'
        });
        
    } catch (error) {
        console.error('❌ Error al eliminar producto:', error);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        res.status(500).json({ error: 'Error al eliminar producto', detalle: error.message });
    }
});

app.delete('/api/categorias/:nombre', (req, res) => {
    try {
        const { nombre } = req.params;
        
        const listaPrecios = cache.obtenerProductosSync();
        
        if (!listaPrecios[nombre]) {
            return res.status(404).json({ error: 'Categoría no encontrada' });
        }
        
        delete listaPrecios[nombre];
        
        fs.writeFileSync('./data/lista-precios.json', JSON.stringify(listaPrecios, null, 2));
    cache.invalidarProductos();
        productoIndex.reconstruir(cache.obtenerProductosSync());
        
        console.log(`✅ Categoría eliminada: ${nombre}`);
        
        res.json({ 
            success: true, 
            mensaje: 'Categoría eliminada exitosamente'
        });
    } catch (error) {
        console.error('Error al eliminar categoría:', error);
        res.status(500).json({ error: 'Error al eliminar categoría' });
    }
});

app.put('/api/categorias/:nombreActual', (req, res) => {
    try {
        const { nombreActual } = req.params;
        const { nuevoNombre } = req.body;
        
        if (!nuevoNombre || nuevoNombre.trim() === '') {
            return res.status(400).json({ error: 'El nuevo nombre es requerido' });
        }
        
        const nombreNormalizado = normalizarTexto(nuevoNombre);
        
        console.log(`✏️ Renombrando categoría:`);
        console.log(`   De: ${nombreActual}`);
        console.log(`   A: ${nombreNormalizado}`);
        
        const listaPrecios = cache.obtenerProductosSync();
        
        if (!listaPrecios[nombreActual]) {
            return res.status(404).json({ error: 'Categoría no encontrada' });
        }
        
        if (nombreNormalizado === nombreActual) {
            console.log(`⚠️ El nombre no cambió (mismo nombre normalizado)`);
            return res.json({ 
                success: true, 
                mensaje: 'No se realizaron cambios (el nombre es el mismo)',
                nombreAnterior: nombreActual,
                nombreNuevo: nombreNormalizado
            });
        }
        
        if (listaPrecios[nombreNormalizado]) {
            return res.status(400).json({ error: 'Ya existe una categoría con ese nombre' });
        }
        
        listaPrecios[nombreNormalizado] = listaPrecios[nombreActual];
        delete listaPrecios[nombreActual];
        
        fs.writeFileSync('./data/lista-precios.json', JSON.stringify(listaPrecios, null, 2));
    cache.invalidarProductos();
        productoIndex.reconstruir(cache.obtenerProductosSync());
        
        console.log(`✅ Categoría renombrada exitosamente`);
        
        res.json({ 
            success: true, 
            mensaje: 'Categoría renombrada exitosamente',
            nombreAnterior: nombreActual,
            nombreNuevo: nombreNormalizado
        });
    } catch (error) {
        console.error('❌ Error al renombrar categoría:', error);
        res.status(500).json({ error: 'Error al renombrar categoría' });
    }
});
// ═══════════════════════════════════════
// 🧠 SISTEMA DE MEMORIA DE CONVERSACIONES
// ═══════════════════════════════════════

const sesionesActivas = new Map();
const TIEMPO_EXPIRACION_SESION = 10 * 60 * 1000;

function marcarSesionActiva(from, tipo = 'conversacion') {
    sesionesActivas.set(from, {
        tipo: tipo,
        timestamp: Date.now()
    });
    
    setTimeout(() => {
        if (sesionesActivas.has(from)) {
            const sesion = sesionesActivas.get(from);
            if (Date.now() - sesion.timestamp >= TIEMPO_EXPIRACION_SESION) {
                sesionesActivas.delete(from);
                console.log(`🕐 Sesión expirada para: ${from}`);
            }
        }
    }, TIEMPO_EXPIRACION_SESION);
}

function tieneSesionActiva(from) {
    if (!sesionesActivas.has(from)) return false;
    
    const sesion = sesionesActivas.get(from);
    const tiempoTranscurrido = Date.now() - sesion.timestamp;
    
    if (tiempoTranscurrido >= TIEMPO_EXPIRACION_SESION) {
        sesionesActivas.delete(from);
        return false;
    }
    
    return true;
}

function limpiarSesion(from) {
    sesionesActivas.delete(from);
}

// ═══════════════════════════════════════
// 📋 FUNCIÓN: GENERAR LISTA DE CATEGORÍAS DINÁMICA
// ═══════════════════════════════════════

function generarListaCategorias() {
    const listaPrecios = obtenerListaPrecios();
    const categorias = Object.keys(listaPrecios);
    
    if (categorias.length === 0) {
        return `📋 *Categorías Disponibles:*\n\nNo hay categorías configuradas aún.`;
    }
    
    const emojisCategoria = {
        'libreria': '📚',
        'cotillon': '🎉',
        'jugueteria': '🧸',
        'juguetes': '🧸',
        'impresiones': '🖨️',
        'fotocopiadora': '📄',
        'bijou': '💍',
        'accesorios_celular': '📱',
        'accesorio_para_celular': '📱',
        'accesorios_computadora': '💻',
        'higiene': '🧼',
        'limpieza': '🧹',
        'alimentos': '🍎',
        'bebidas': '🥤',
        'deportes': '⚽',
        'herramientas': '🔧',
        'electronica': '🔌',
        'ropa': '👕',
        'varios': '📦',
    };
    
    let respuesta = `📋 *Categorías Disponibles:*\n\n`;
    
    categorias.forEach(cat => {
        const emoji = emojisCategoria[cat] || '📦';
        
        const nombreFormateado = cat
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
        
        let totalProductos = 0;
        for (const subcategoria in listaPrecios[cat]) {
            totalProductos += Object.keys(listaPrecios[cat][subcategoria]).length;
        }
        
        respuesta += `${emoji} ${nombreFormateado} (${totalProductos} productos)\n`;
    });
    
    respuesta += `\n💡 Para hacer un pedido, escribe por ejemplo:\n`;
    respuesta += `"Quiero 2 cuadernos y 5 lapiceras"`;
    
    return respuesta;
}

// ═══════════════════════════════════════
// 🔍 FUNCIÓN: BUSCAR CATEGORÍA POR NOMBRE SIMILAR
// ═══════════════════════════════════════

function buscarCategoriaPorNombre(textoUsuario) {
    const listaPrecios = obtenerListaPrecios();

    const textoNormalizado = textoUsuario
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '_');
    
    const categorias = Object.keys(listaPrecios);
    
    console.log(`🔍 Buscando categoría para: "${textoUsuario}"`);
    console.log(`   Texto normalizado: "${textoNormalizado}"`);
    console.log(`   Categorías disponibles:`, categorias);
    
    if (categorias.includes(textoNormalizado)) {
        console.log(`   ✅ Coincidencia exacta: ${textoNormalizado}`);
        return textoNormalizado;
    }
    
    const mapaAliases = {
        'juguete': 'juguetes',
        'juguetes': 'juguetes',
        'jugueteria': 'juguetes',
        
        'impresion': 'impresiones',
        'impresiones': 'impresiones',
        'imprenta': 'impresiones',
        'fotocopia': 'impresiones',
        'fotocopias': 'impresiones',
        'fotocopiadora': 'impresiones',
        
        'libreria': 'libreria',
        'libros': 'libreria',
        
        'cotillon': 'cotillon',
        'fiesta': 'cotillon',
        
        'bijou': 'bijou',
        'bijouterie': 'bijou',
        'joyas': 'bijou',
        
        'celular': 'accesorio_para_celular',
        'celu': 'accesorio_para_celular',
        'telefono': 'accesorio_para_celular',
        'accesorio_celular': 'accesorio_para_celular',
        'accesorio_de_celular': 'accesorio_para_celular',
        'accesorio_para_celular': 'accesorio_para_celular',
        'accesorios_celular': 'accesorio_para_celular',
        'accesorios_para_celular': 'accesorio_para_celular',
        'accesorios_de_celular': 'accesorio_para_celular',
        
        'computadora': 'accesorios_computadora',
        'pc': 'accesorios_computadora',
        'compu': 'accesorios_computadora',
        
        'higiene': 'higiene',
        'limpieza': 'limpieza',
    };
    
    if (mapaAliases[textoNormalizado]) {
        const categoriaReal = mapaAliases[textoNormalizado];
        console.log(`   🔄 Alias encontrado: "${textoNormalizado}" → "${categoriaReal}"`);
        
        if (categorias.includes(categoriaReal)) {
            console.log(`   ✅ Categoría encontrada vía alias: ${categoriaReal}`);
            return categoriaReal;
        } else {
            console.log(`   ⚠️ Alias apunta a "${categoriaReal}" pero no existe en JSON`);
        }
    }
    
    for (const categoria of categorias) {
        if (categoria.includes(textoNormalizado) || textoNormalizado.includes(categoria)) {
            console.log(`   ✅ Coincidencia parcial: ${categoria}`);
            return categoria;
        }
    }
    
    const textoSingular = textoNormalizado.replace(/es$/, '').replace(/s$/, '');
    const textoPlural = textoNormalizado + 's';
    
    for (const categoria of categorias) {
        const categoriaSingular = categoria.replace(/es$/, '').replace(/s$/, '');
        
        if (textoSingular === categoriaSingular || textoPlural === categoria) {
            console.log(`   ✅ Coincidencia singular/plural: ${categoria}`);
            return categoria;
        }
    }
    
    console.log(`   ❌ No se encontró categoría`);
    return null;
}

// ═══════════════════════════════════════
// 📸 ENVIAR CATÁLOGO CON IMÁGENES
// ═══════════════════════════════════════

async function enviarCatalogo(client, from, categoria, subcategoria = null) {
  try {
    const listaPrecios = cache.obtenerProductosSync();
    
    const catId = categoria.toLowerCase().replace(/\s+/g, '_');
    
    if (!listaPrecios[catId]) {
      await client.sendMessage(from, `❌ No encontré la categoría "${categoria}".`);
      return;
    }

    let mensaje = `📚 *${categoria.toUpperCase()}*\n\n`;
    let productosEnviados = 0;

    if (subcategoria) {
      const subId = subcategoria.toLowerCase().replace(/\s+/g, '_');
      
      if (listaPrecios[catId][subId]) {
        mensaje += `📂 *${subcategoria}*\n\n`;
        
        const productos = listaPrecios[catId][subId];
        
        for (const [id, prod] of Object.entries(productos)) {
          const tieneImagen = prod.imagenes && prod.imagenes.length > 0;
          const imagenPrincipal = tieneImagen ? prod.imagenes[0].url : null;

          let precioTexto = '';
          if (prod.precio) {
            precioTexto = prod.unidad 
              ? `$${prod.precio.toLocaleString('es-AR')} ${prod.unidad}`
              : `$${prod.precio.toLocaleString('es-AR')}`;
          } else if (prod.precio_desde) {
            precioTexto = prod.unidad
              ? `Desde $${prod.precio_desde.toLocaleString('es-AR')} ${prod.unidad}`
              : `Desde $${prod.precio_desde.toLocaleString('es-AR')}`;
          }

          const stockTexto = prod.stock === false ? '❌ Sin stock' : '✅ Disponible';
          
          if (imagenPrincipal) {
            try {
              const media = await MessageMedia.fromUrl(imagenPrincipal);
              
              const caption = `📦 *${prod.nombre.replace(/_/g, ' ').toUpperCase()}*\n` +
                            `💰 ${precioTexto}\n` +
                            `${stockTexto}\n` +
                            `${prod.codigo_barras ? `🔖 Código: ${prod.codigo_barras}\n` : ''}\n` +
                            `_Escribe "agregar ${prod.nombre.replace(/_/g, ' ')}" para añadirlo al carrito_`;
              
              await client.sendMessage(from, media, { caption });
              productosEnviados++;
              
              await new Promise(resolve => setTimeout(resolve, 1000));
              
            } catch (imgError) {
              console.error('❌ Error al enviar imagen:', imgError);
              mensaje += `📦 *${prod.nombre.replace(/_/g, ' ').toUpperCase()}*\n`;
              mensaje += `   💰 ${precioTexto}\n`;
              mensaje += `   ${stockTexto}\n`;
              if (prod.codigo_barras) mensaje += `   🔖 ${prod.codigo_barras}\n`;
              mensaje += `\n`;
              productosEnviados++;
            }
          } else {
            mensaje += `📦 *${prod.nombre.replace(/_/g, ' ').toUpperCase()}*\n`;
            mensaje += `   💰 ${precioTexto}\n`;
            mensaje += `   ${stockTexto}\n`;
            if (prod.codigo_barras) mensaje += `   🔖 ${prod.codigo_barras}\n`;
            mensaje += `\n`;
            productosEnviados++;
          }
        }
      }
    } else {
      for (const [subId, productos] of Object.entries(listaPrecios[catId])) {
        mensaje += `📂 *${subId.replace(/_/g, ' ').toUpperCase()}*\n\n`;
        
        for (const [id, prod] of Object.entries(productos)) {
          const tieneImagen = prod.imagenes && prod.imagenes.length > 0;
          const imagenPrincipal = tieneImagen ? prod.imagenes[0].url : null;

          let precioTexto = '';
          if (prod.precio) {
            precioTexto = prod.unidad 
              ? `$${prod.precio.toLocaleString('es-AR')} ${prod.unidad}`
              : `$${prod.precio.toLocaleString('es-AR')}`;
          } else if (prod.precio_desde) {
            precioTexto = prod.unidad
              ? `Desde $${prod.precio_desde.toLocaleString('es-AR')} ${prod.unidad}`
              : `Desde $${prod.precio_desde.toLocaleString('es-AR')}`;
          }

          const stockTexto = prod.stock === false ? '❌ Sin stock' : '✅ Disponible';
          
          if (imagenPrincipal) {
            try {
              const media = await MessageMedia.fromUrl(imagenPrincipal);
              
              const caption = `📦 *${prod.nombre.replace(/_/g, ' ').toUpperCase()}*\n` +
                            `💰 ${precioTexto}\n` +
                            `${stockTexto}\n` +
                            `${prod.codigo_barras ? `🔖 Código: ${prod.codigo_barras}\n` : ''}\n` +
                            `_Escribe "agregar ${prod.nombre.replace(/_/g, ' ')}" para añadirlo al carrito_`;
              
              await client.sendMessage(from, media, { caption });
              productosEnviados++;
              
              await new Promise(resolve => setTimeout(resolve, 1000));
              
            } catch (imgError) {
              console.error('❌ Error al enviar imagen:', imgError);
              mensaje += `📦 *${prod.nombre.replace(/_/g, ' ').toUpperCase()}*\n`;
              mensaje += `   💰 ${precioTexto}\n`;
              mensaje += `   ${stockTexto}\n`;
              if (prod.codigo_barras) mensaje += `   🔖 ${prod.codigo_barras}\n`;
              mensaje += `\n`;
              productosEnviados++;
            }
          } else {
            mensaje += `📦 *${prod.nombre.replace(/_/g, ' ').toUpperCase()}*\n`;
            mensaje += `   💰 ${precioTexto}\n`;
            mensaje += `   ${stockTexto}\n`;
            if (prod.codigo_barras) mensaje += `   🔖 ${prod.codigo_barras}\n`;
            mensaje += `\n`;
            productosEnviados++;
          }
        }
        
        mensaje += `\n`;
      }
    }

    if (mensaje.includes('📦')) {
      mensaje += `\n💬 _Escribe el nombre del producto que te interesa para ver más detalles_`;
      await client.sendMessage(from, mensaje);
    } else if (productosEnviados > 0) {
      await client.sendMessage(from, `📸 Te mostré ${productosEnviados} productos.\n\n💬 _Escribe el nombre del que te interese para agregarlo al carrito_`);
    }

    console.log(`✅ Catálogo enviado a ${from} (${productosEnviados} productos)`);

  } catch (error) {
    console.error('❌ Error al enviar catálogo:', error);
    await client.sendMessage(from, '❌ Ocurrió un error al cargar el catálogo. Intenta nuevamente.');
  }
}

// ═══════════════════════════════════════
// 🔍 BUSCAR PRECIOS DE CATEGORÍA (CON IMÁGENES)
// ═══════════════════════════════════════

async function buscarPreciosCategoria(categoria) {
    const listaPrecios = obtenerListaPrecios();

    if (!listaPrecios[categoria]) {
        console.log(`⚠️ Categoría "${categoria}" no encontrada en lista de precios`);
        
        const categoriasDisponibles = Object.keys(listaPrecios)
            .map(cat => cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))
            .join(', ');
        
        return `No encontré productos en esa categoría.\n\n` +
               `📋 Categorías disponibles:\n${categoriasDisponibles}\n\n` +
               `Para ver todas las categorías con detalle, escribe "lista" o "catálogo".`;
    }
    
    const datos = listaPrecios[categoria];
    
    const nombreCategoria = categoria
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
    
    let respuesta = `💰 *Precios - ${nombreCategoria}*\n`;
    respuesta += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    let contador = 0;
    
    for (const [subcategoria, productos] of Object.entries(datos)) {
        const subcategoriaFormateada = subcategoria
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
        
        respuesta += `📂 *${subcategoriaFormateada}*\n\n`;
        
        for (const [nombre, info] of Object.entries(productos)) {
            const tieneImagen = info.imagenes && info.imagenes.length > 0;
            
            if (tieneImagen) {
                respuesta += `   📸 `;
            } else {
                const stockEmoji = info.stock ? '✅' : '❌';
                respuesta += `   ${stockEmoji} `;
            }
            
            const precioTexto = info.precio_desde 
                ? `desde $${info.precio_desde}` 
                : `$${info.precio}${info.unidad ? ' ' + info.unidad : ''}`;
            
            const nombreFormateado = nombre
                .replace(/_/g, ' ')
                .replace(/\b\w/g, l => l.toUpperCase());
            
            respuesta += `${nombreFormateado}: ${precioTexto}\n`;
            contador++;
        }
        
        respuesta += `\n`;
    }
    
    if (contador === 0) {
        respuesta += `No hay productos en esta categoría.\n\n`;
    } else {
        respuesta += `━━━━━━━━━━━━━━━━━━━━━\n`;
        respuesta += `📦 Total: ${contador} producto${contador !== 1 ? 's' : ''}\n\n`;
    }
    
    respuesta += `💡 Para hacer un pedido, escribe por ejemplo:\n`;
    respuesta += `"Quiero 2 cuadernos" o "Necesito 5 lapiceras"`;
    
    return respuesta;
}

// Carritos temporales en memoria
const carritos = {};
const timersCarrito = {};

let botIniciadoEn = null;

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

console.log('\n🚀🚀🚀 INICIANDO BOT DE WHATSAPP 🚀🚀🚀\n');

client.on('qr', (qr) => {
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
    // Pre-cargar caché
    await cache.precargarTodo();
    
    // Construir índice de productos
    const productosParaIndice = cache.obtenerProductosSync();
    productoIndex.construirIndice(productosParaIndice);
    botIniciadoEn = Date.now();
    
    sesionesActivas.clear();
    
    Object.keys(carritos).forEach(key => delete carritos[key]);
    Object.keys(timersCarrito).forEach(key => {
        clearTimeout(timersCarrito[key]);
        delete timersCarrito[key];
    });
    
    console.log('\n🎉🎉🎉 ¡BOT CONECTADO EXITOSAMENTE! 🎉🎉🎉\n');
    console.log(`⏰ Bot iniciado: ${new Date().toLocaleString('es-AR')}`);
    console.log('🧹 Sesiones y carritos antiguos limpiados');
    console.log('🤖 Sistema de filtrado inteligente ACTIVADO');
    console.log('🧠 Sistema de memoria de conversaciones ACTIVADO');
    console.log('🛒 Sistema de pedidos ACTIVADO');
    console.log('👥 Sistema de gestión de clientes ACTIVADO');
    console.log(`🤖 Groq IA: ${usarIA ? '✅ ACTIVADA' : '❌ DESACTIVADA'}`);
    console.log(`📵 Contactos ignorados: ${contactosIgnorar.contactos_ignorar.length}`);
    console.log('🚫 Solo procesará mensajes NUEVOS (posteriores al inicio)\n');
    console.log('📸 Sistema de imágenes en WhatsApp ACTIVADO\n');
    
    const clientesData = cache.obtenerClientesSync();
    console.log(`👥 Clientes registrados: ${clientesData.estadisticas.total_clientes}`);
    console.log(`📦 Total pedidos: ${clientesData.estadisticas.total_pedidos}`);
    console.log(`💰 Total vendido: $${clientesData.estadisticas.total_vendido}\n`);
});

client.on('message', async (msg) => {
    const from = msg.from;
    const texto = msg.body;
    const textoLower = texto.toLowerCase();
    const contacto = await msg.getContact();
    const nombreContacto = contacto.pushname || contacto.name || contacto.number || from;
    
    console.log(`\n📨 Mensaje recibido de: ${nombreContacto} (${from})`);
    console.log(`💬 Contenido: "${texto}"`);
    
    const mensajeTimestamp = msg.timestamp * 1000;
    const mensajeFecha = new Date(mensajeTimestamp);
    
    if (botIniciadoEn && mensajeTimestamp < botIniciadoEn) {
        const segundosAntes = Math.floor((botIniciadoEn - mensajeTimestamp) / 1000);
        const minutosAntes = Math.floor(segundosAntes / 60);
        
        console.log(`🚫 IGNORADO: Mensaje antiguo (recibido hace ${minutosAntes} minutos)`);
        console.log(`   Fecha mensaje: ${mensajeFecha.toLocaleString('es-AR')}`);
        console.log(`   Bot iniciado: ${new Date(botIniciadoEn).toLocaleString('es-AR')}`);
        console.log(`───────────────────────────────────────────\n`);
        
        if (sesionesActivas.has(from)) {
            sesionesActivas.delete(from);
            console.log(`🧹 Sesión antigua limpiada para: ${from}`);
        }
        
        return;
    }
    
    console.log(`✅ MENSAJE NUEVO: Procesando`);
    
    if (from.endsWith('@g.us')) {
        console.log(`🚫 IGNORADO: Mensaje de grupo`);
        console.log(`───────────────────────────────────────────\n`);
        return;
    }
    
    if (from === 'status@broadcast') {
        console.log(`🚫 IGNORADO: Estado de WhatsApp`);
        console.log(`───────────────────────────────────────────\n`);
        return;
    }
    
    if (from.endsWith('@broadcast')) {
        console.log(`🚫 IGNORADO: Lista de difusión`);
        console.log(`───────────────────────────────────────────\n`);
        return;
    }
    
    if (!from.endsWith('@c.us')) {
        console.log(`🚫 IGNORADO: No es un chat individual`);
        console.log(`───────────────────────────────────────────\n`);
        return;
    }
    
    console.log(`✅ CHAT INDIVIDUAL: Procesando mensaje`);
    
    registrarOActualizarCliente(from, nombreContacto);
    
    if (from === negocioData.numero_dueño) {
        if (textoLower.match(/pausar bot|pausar respuestas|apagar bot|desactivar bot/)) {
            negocioData.respuestas_automaticas_activas = false;
            fs.writeFileSync('./data/negocio.json', JSON.stringify(negocioData, null, 2));
        cache.invalidarNegocio();
            await msg.reply(`⏸️ *RESPUESTAS AUTOMÁTICAS PAUSADAS*\n\n` +
                           `El bot NO responderá a los clientes.\n` +
                           `Tú puedes seguir controlándolo.\n\n` +
                           `Para reanudar: "reanudar bot"`);
            console.log(`⏸️ Respuestas automáticas PAUSADAS por el dueño`);
            return;
        }
        
        if (textoLower.match(/reanudar bot|reanudar respuestas|activar bot|encender bot/)) {
            negocioData.respuestas_automaticas_activas = true;
            fs.writeFileSync('./data/negocio.json', JSON.stringify(negocioData, null, 2));
        cache.invalidarNegocio();
            await msg.reply(`▶️ *RESPUESTAS AUTOMÁTICAS REACTIVADAS*\n\n` +
                           `El bot volverá a responder a los clientes automáticamente.\n\n` +
                           `Para pausar: "pausar bot"`);
            console.log(`▶️ Respuestas automáticas REACTIVADAS por el dueño`);
            return;
        }
        
        if (textoLower.match(/activar ia|ia on|encender ia/)) {
            usarIA = true;
            await msg.reply(`🤖 *IA ACTIVADA*\n\n` +
                           `El bot usará Groq IA para responder consultas complejas.\n\n` +
                           `Para desactivar: "desactivar ia"`);
            console.log(`🤖 IA ACTIVADA por el dueño`);
            return;
        }
        
        if (textoLower.match(/desactivar ia|ia off|apagar ia/)) {
            usarIA = false;
            await msg.reply(`🔴 *IA DESACTIVADA*\n\n` +
                           `El bot solo usará respuestas predefinidas.\n\n` +
                           `Para activar: "activar ia"`);
            console.log(`🔴 IA DESACTIVADA por el dueño`);
            return;
        }
        
        if (textoLower.match(/estado del bot|estado bot|bot estado/)) {
            const estadoRespuestas = negocioData.respuestas_automaticas_activas ? '▶️ ACTIVAS' : '⏸️ PAUSADAS';
            const estadoNotificaciones = negocioData.notificaciones_activas ? '✅ ACTIVADAS' : '🔕 DESACTIVADAS';
            const estadoIA = usarIA ? '🤖 ACTIVADA' : '🔴 DESACTIVADA';
            
            await msg.reply(`🤖 *ESTADO DEL BOT*\n\n` +
                           `━━━━━━━━━━━━━━━━━━━━━\n` +
                           `🔄 Respuestas automáticas: ${estadoRespuestas}\n` +
                           `🔔 Notificaciones: ${estadoNotificaciones}\n` +
                           `🤖 Inteligencia Artificial: ${estadoIA}\n` +
                           `📸 Imágenes: ✅ ACTIVADAS\n` +
                           `━━━━━━━━━━━━━━━━━━━━━\n\n` +
                           `*Comandos disponibles:*\n` +
                           `• "pausar bot" - Pausar respuestas\n` +
                           `• "reanudar bot" - Reanudar respuestas\n` +
                           `• "activar ia" / "desactivar ia"\n` +
                           `• "activar notificaciones"\n` +
                           `• "desactivar notificaciones"\n` +
                           `• "estadisticas"`);
            return;
        }
    }
    
    if (!negocioData.respuestas_automaticas_activas) {
        console.log(`⏸️ IGNORADO: Respuestas automáticas pausadas`);
        console.log(`───────────────────────────────────────────\n`);
        return;
    }
    
    if (contactosIgnorar.contactos_ignorar.includes(from)) {
        console.log(`🚫 IGNORADO: Contacto en lista negra`);
        console.log(`───────────────────────────────────────────\n`);
        return;
    }
    
    const tieneSesion = tieneSesionActiva(from);
    const esMensajeNegocio = verificarMensajeNegocio(textoLower);
    
    if (!esMensajeNegocio && !tieneSesion) {
        console.log(`🤷 IGNORADO: No contiene palabras de negocio/productos`);
        console.log(`💡 TIP: Mensaje parece personal o sin contexto comercial`);
        console.log(`───────────────────────────────────────────\n`);
        return;
    }
    
    if (tieneSesion) {
        console.log(`🧠 PROCESANDO: Cliente con conversación activa`);
    } else {
        console.log(`✅ PROCESANDO: Mensaje relacionado con negocio/productos`);
    }
    
    marcarSesionActiva(from);
    
    try {
        const respuesta = await procesarMensaje(textoLower, texto, from, nombreContacto);
        await msg.reply(respuesta);
        console.log(`📤 Respuesta enviada correctamente`);
    } catch (error) {
        console.error(`❌ Error al enviar respuesta:`, error);
    }
    
    console.log(`───────────────────────────────────────────\n`);
});

function registrarOActualizarCliente(telefono, nombre) {
    const clientesData = cache.obtenerClientesSync();
    
    let cliente = clientesData.clientes.find(c => c.telefono === telefono);
    
    if (!cliente) {
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
        
        console.log(`👤 Nuevo cliente registrado: ${nombre} (${telefono})`);
    } else {
        cliente.ultima_interaccion = new Date().toISOString();
        
        if (cliente.nombre !== nombre) {
            console.log(`👤 Nombre actualizado: ${cliente.nombre} → ${nombre}`);
            cliente.nombre = nombre;
        }
    }
    
    fs.writeFileSync('./data/clientes.json', JSON.stringify(clientesData, null, 2));
        cache.invalidarClientes();
}

function obtenerInfoCliente(telefono) {
    const clientesData = cache.obtenerClientesSync();
    return clientesData.clientes.find(c => c.telefono === telefono);
}

function verificarMensajeNegocio(texto) {
    const textoLimpio = texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    const mensajesPersonales = [
        'amor', 'amorsito', 'amorsiii', 'bb', 'bebe', 'mi amor',
        'corazon', 'cielo', 'vida', 'hermosa', 'hermoso', 'lindo', 'linda',
        'te amo', 'te quiero', 'te extraño', 'extraño',
        'jaja', 'jeje', 'jiji', 'lol', 'xd',
        'como estas', 'como andas', 'que haces', 'que tal',
        'bueno', 'dale', 'sisi', 'oki', 'okay',
        'gracias', 'grax', 'muchas gracias',
        'perdon', 'disculpa', 'sorry',
        'chau', 'adios', 'nos vemos', 'hasta luego'
    ];
    
    const palabras = textoLimpio.split(' ').filter(p => p.length > 0);
    if (palabras.length <= 3) {
        const esSoloPersonal = mensajesPersonales.some(personal => 
            textoLimpio === personal || textoLimpio === personal.replace(/\s/g, '')
        );
        
        if (esSoloPersonal) {
            console.log(`🚫 Filtrado como mensaje personal: "${texto}"`);
            return false;
        }
    }
    
    const palabrasIntencion = [
        'precio', 'cuanto', 'cuánto', 'cuesta', 'valor', 'sale',
        'venden', 'vende', 'tienen', 'tiene', 'hay', 'tenes',
        'stock', 'disponible', 'disponibilidad',
        'comprar', 'quiero', 'necesito', 'busco', 'me interesa',
        'pedido', 'pedir', 'encargar', 'reservar',
        'catalogo', 'catálogo', 'lista', 'menu', 'menú',
        'horario', 'ubicacion', 'ubicación', 'direccion', 'dirección',
        'entrega', 'delivery', 'envio', 'envío',
        'pago', 'efectivo', 'tarjeta', 'transferencia',
        'higiene', 'limpieza', 'limpiador', 'desinfectante',
        'juguete', 'juguetes', 'jugueteria',
        'cumpleaños', 'cumpleanos', 'fiesta', 'evento',
        'regalo', 'regalar', 'obsequio', 'sorpresa',
        'decoracion', 'decoración', 'adornar',
        'niña', 'niño', 'nena', 'nene', 'chico', 'chica', 'hijo', 'hija',
        'infantil', 'bebe', 'bebé',
        'recomienda', 'recomendas', 'recomendar', 'sugieres', 'sugerir', 'aconsejas',
        'opciones', 'alternativas', 'ideas', 'que me das', 'que tenes'
    ];
    
    const tieneIntencion = palabrasIntencion.some(palabra => 
        textoLimpio.includes(palabra)
    );
    
    const productosEspecificos = palabrasClave.palabras_productos || [];
    const tieneProducto = productosEspecificos.some(producto => {
        const productoLimpio = producto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return textoLimpio.includes(productoLimpio);
    });
    
    const saludosComerciales = [
        'hola quiero', 'hola necesito', 'hola busco',
        'buenos dias quiero', 'buenos días quiero',
        'buenas tardes quiero', 'buenas noches quiero',
        'hola, quiero', 'hola consulta', 'consulta por',
        'hola precio', 'hola cuanto'
    ];
    
    const tieneSaludoComercial = saludosComerciales.some(saludo => 
        textoLimpio.includes(saludo)
    );
    
    const esMensajeComercial = tieneIntencion || tieneProducto || tieneSaludoComercial;
    
    if (!esMensajeComercial) {
        console.log(`🔍 Mensaje no comercial: "${texto.substring(0, 50)}..."`);
    } else {
        console.log(`✅ Mensaje comercial detectado: "${texto.substring(0, 50)}..."`);
    }
    
    return esMensajeComercial;
}

async function procesarMensaje(textoLower, textoOriginal, from, nombreContacto) {
    
    if (textoLower.match(/mis pedidos|mi historial|historial|pedidos anteriores|ultimos pedidos/)) {
        return mostrarHistorialCliente(from);
    }
    
    if (from === negocioData.numero_dueño) {
    
        if (textoLower.match(/activar notificaciones|notificaciones on|encender notificaciones/)) {
            negocioData.notificaciones_activas = true;
            fs.writeFileSync('./data/negocio.json', JSON.stringify(negocioData, null, 2));
        cache.invalidarNegocio();
            return `✅ *Notificaciones ACTIVADAS*\n\n` +
                   `Recibirás un mensaje automático cada vez que un cliente confirme un pedido.\n\n` +
                   `Para desactivar: "desactivar notificaciones"`;
        }
    
        if (textoLower.match(/desactivar notificaciones|notificaciones off|apagar notificaciones/)) {
            negocioData.notificaciones_activas = false;
            fs.writeFileSync('./data/negocio.json', JSON.stringify(negocioData, null, 2));
        cache.invalidarNegocio();
            return `🔕 *Notificaciones DESACTIVADAS*\n\n` +
                   `Ya no recibirás mensajes automáticos de nuevos pedidos.\n\n` +
                   `Para activar: "activar notificaciones"`;
        }
    
        if (textoLower.match(/estado notificaciones|ver notificaciones|notificaciones estado/)) {
            const estado = negocioData.notificaciones_activas ? '✅ ACTIVADAS' : '🔕 DESACTIVADAS';
            const emoji = negocioData.notificaciones_activas ? '🔔' : '🔕';
        
            let respuesta = `${emoji} *Estado de Notificaciones*\n\n`;
            respuesta += `Estado actual: ${estado}\n\n`;
        
            if (negocioData.notificaciones_activas) {
                respuesta += `Recibirás notificaciones de:\n`;
                respuesta += `• Nuevos pedidos confirmados\n`;
                respuesta += `• Detalles del cliente\n`;
                respuesta += `• Productos solicitados\n`;
                respuesta += `• Total del pedido\n\n`;
                respuesta += `Para desactivar: "desactivar notificaciones"`;
            } else {
                respuesta += `No recibirás notificaciones automáticas.\n\n`;
                respuesta += `Para activar: "activar notificaciones"`;
            }
        
            return respuesta;
        }
    
        if (textoLower.match(/estadisticas|stats|resumen/)) {
            const clientesData = cache.obtenerClientesSync();
            const pedidosData = cache.obtenerPedidosSync();
        
            let respuesta = `📊 *ESTADÍSTICAS DEL NEGOCIO*\n\n`;
            respuesta += `━━━━━━━━━━━━━━━━━━━━━\n`;
            respuesta += `👥 Total clientes: ${clientesData.estadisticas.total_clientes}\n`;
            respuesta += `📦 Total pedidos: ${clientesData.estadisticas.total_pedidos}\n`;
            respuesta += `💰 Total vendido: $${clientesData.estadisticas.total_vendido}\n`;
            respuesta += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
        
            if (pedidosData.pedidos.length > 0) {
                const ultimoPedido = pedidosData.pedidos[pedidosData.pedidos.length - 1];
                respuesta += `📄 *Último pedido:*\n`;
                respuesta += `• ${ultimoPedido.id} - ${ultimoPedido.nombre}\n`;
                respuesta += `• $${ultimoPedido.total} - ${formatearFecha(ultimoPedido.fecha)}\n\n`;
            }
        
            respuesta += `💡 Comandos disponibles:\n`;
            respuesta += `• "activar notificaciones"\n`;
            respuesta += `• "desactivar notificaciones"\n`;
            respuesta += `• "estado notificaciones"\n`;
            respuesta += `• "activar ia" / "desactivar ia"`;
        
            return respuesta;
        }
    }

    if (carritos[from] && carritos[from].opciones_multiples && carritos[from].opciones_multiples.length > 0) {
        const numeroElegido = parseInt(textoOriginal.trim());
        
        if (!isNaN(numeroElegido) && numeroElegido > 0 && numeroElegido <= carritos[from].opciones_multiples.length) {
            const productoElegido = carritos[from].opciones_multiples[numeroElegido - 1];
            productoElegido.cantidad = carritos[from].cantidad_solicitada || 1;
            
            console.log(`✅ Usuario eligió opción ${numeroElegido}: ${productoElegido.nombreFormateado}`);
            
            delete carritos[from].opciones_multiples;
            delete carritos[from].cantidad_solicitada;
            
            carritos[from].temporal = [productoElegido];
            marcarSesionActiva(from, 'seleccionando_productos');
            return procesarDeteccionProductos(from, [productoElegido]);
        }
        
        if (textoLower.match(/cancelar|no|salir/)) {
            delete carritos[from].opciones_multiples;
            delete carritos[from].cantidad_solicitada;
            limpiarSesion(from);
            return `❌ Búsqueda cancelada.\n\nPuedes hacer otra búsqueda cuando quieras.`;
        }
    }

    if (textoLower.match(/^(si|sí|ok|dale|confirmo si)$/)) {
        if (carritos[from] && carritos[from].temporal && carritos[from].temporal.length > 0) {
            marcarSesionActiva(from, 'pedido');
            return agregarAlCarrito(from);
        }
    }

    if (textoLower.match(/^(no|nope|cancel)$/)) {
        if (carritos[from] && carritos[from].temporal && carritos[from].temporal.length > 0) {
            carritos[from].temporal = [];
            limpiarSesion(from);
            return `❌ Pedido cancelado.\n\nPuedes hacer otro pedido cuando quieras.`;
        }
    }

    if (textoLower.match(/ver carrito|mi carrito|carrito|mi pedido/)) {
        marcarSesionActiva(from, 'consulta_carrito');
        return mostrarCarrito(from);
    }
    
    if (textoLower.match(/^(confirmar|confirmo|si confirmo|ok confirmo)$/)) {
        return await confirmarPedido(from, nombreContacto);
    }
    
    if (textoLower.match(/cancelar|vaciar|borrar carrito|limpiar carrito/)) {
        limpiarSesion(from);
        return cancelarCarrito(from);
    }
    
    if (textoLower.match(/quitar|eliminar|sacar/)) {
        const numero = extraerNumero(textoOriginal);
        if (numero) {
            marcarSesionActiva(from, 'modificando_carrito');
            return quitarProductoCarrito(from, numero - 1);
        }
    }

    if (textoLower.match(/^[12]$/)) {
        const respuestaEntrega = await procesarOpcionEntrega(from, textoLower, nombreContacto);
        if (respuestaEntrega) {
            limpiarSesion(from);
            return respuestaEntrega;
        }
    }

    // ═══════════════════════════════════════
    // 📸 ENVIAR FOTO DE PRODUCTO (PRIORIDAD ALTA)
    // ═══════════════════════════════════════
    if (textoLower.match(/foto|imagen|picture|pic|ver.*producto|mostrar.*producto/)) {
        marcarSesionActiva(from, 'consulta_imagen');
        
        // Extraer nombre del producto de la pregunta
        const textoSinPalabrasClave = textoLower
            .replace(/tenes|tiene|hay|mostrar|ver|enviar|mandar|pasame|foto|imagen|picture|pic|del|de|la|el|los|las|\?/g, '')
            .trim();
        
        console.log(`📸 Buscando imagen para: "${textoSinPalabrasClave}"`);
        
        if (textoSinPalabrasClave.length > 2) {
            const listaPrecios = obtenerListaPrecios();
            let productoConImagen = null;
            
            // Buscar producto en todas las categorías
            for (const [categoria, subcategorias] of Object.entries(listaPrecios)) {
                for (const [subcategoria, productos] of Object.entries(subcategorias)) {
                    for (const [nombre, info] of Object.entries(productos)) {
                        const nombreNormalizado = nombre.replace(/_/g, ' ').toLowerCase();
                        
                        if (nombreNormalizado.includes(textoSinPalabrasClave) || 
                            textoSinPalabrasClave.includes(nombreNormalizado)) {
                            
                            if (info.imagenes && info.imagenes.length > 0) {
                                productoConImagen = {
                                    nombre: nombre,
                                    info: info,
                                    categoria: categoria,
                                    subcategoria: subcategoria
                                };
                                break;
                            }
                        }
                    }
                    if (productoConImagen) break;
                }
                if (productoConImagen) break;
            }
            
            if (productoConImagen) {
                try {
                    console.log(`✅ Producto con imagen encontrado: ${productoConImagen.nombre}`);
                    
                    const media = await MessageMedia.fromUrl(productoConImagen.info.imagenes[0].url);
                    
                    const precioTexto = productoConImagen.info.precio 
                        ? `$${productoConImagen.info.precio}` 
                        : `Desde $${productoConImagen.info.precio_desde}`;
                    
                    const stockTexto = productoConImagen.info.stock ? '✅ Disponible' : '❌ Sin stock';
                    
                    const caption = `📦 *${productoConImagen.nombre.replace(/_/g, ' ').toUpperCase()}*\n\n` +
                                  `💰 Precio: ${precioTexto}\n` +
                                  `${stockTexto}\n` +
                                  `📂 ${productoConImagen.categoria.replace(/_/g, ' ')} > ${productoConImagen.subcategoria.replace(/_/g, ' ')}\n\n` +
                                  `_¿Te interesa? Escribe "quiero 1 ${productoConImagen.nombre.replace(/_/g, ' ')}"_`;
                    
                    await client.sendMessage(from, media, { caption });
                    
                    console.log(`✅ Imagen enviada correctamente`);
                    return ''; // Retornar vacío porque ya enviamos el mensaje con imagen
                    
                } catch (imgError) {
                    console.error('❌ Error al enviar imagen:', imgError);
                    return `❌ Hubo un problema al cargar la imagen.\n\n` +
                           `Pero te puedo decir que:\n` +
                           `📦 ${productoConImagen.nombre.replace(/_/g, ' ').toUpperCase()}\n` +
                           `💰 ${productoConImagen.info.precio ? `$${productoConImagen.info.precio}` : `Desde $${productoConImagen.info.precio_desde}`}\n` +
                           `${productoConImagen.info.stock ? '✅ Disponible' : '❌ Sin stock'}`;
                }
            } else {
                return `📸 No encontré imágenes para "${textoSinPalabrasClave}".\n\n` +
                       `💡 Intenta escribir el nombre completo del producto.\n` +
                       `O escribe "catálogo" para ver todos los productos.`;
            }
        }
        
        return `📸 Para ver la foto de un producto, escribe:\n` +
               `"Foto de [nombre del producto]"\n\n` +
               `Ejemplo: "Foto del alcohol"`;
    }

    if (textoLower.match(/lista|precio|catalogo|que tienen|que venden|productos|menu/)) {
        marcarSesionActiva(from, 'consulta');
        return generarListaCategorias();
    }

    const palabrasTexto = textoLower.split(/\s+/).filter(p => p.length > 0);
    
    if (palabrasTexto.length <= 4) {
        console.log(`🔍 Intentando detectar categoría desde: "${textoOriginal}"`);
        const categoriaDetectada = buscarCategoriaPorNombre(textoOriginal);
        
        if (categoriaDetectada) {
            console.log(`📂 ✅ Categoría detectada: "${categoriaDetectada}" desde texto: "${textoOriginal}"`);
            marcarSesionActiva(from, 'consulta_productos');
            return await buscarPreciosCategoria(categoriaDetectada);
        } else {
            console.log(`⚠️ No se detectó categoría para: "${textoOriginal}"`);
        }
    }

    if (textoLower.match(/^(hola|buenas|buenos dias|buenas tardes|buenas noches|hey|hi)$/)) {
        const infoCliente = obtenerInfoCliente(from);
        let saludo = `¡Hola`;
        
        if (infoCliente && infoCliente.total_pedidos > 0) {
            saludo += ` de nuevo`;
        }
        
        saludo += `! 👋 Bienvenido a *${negocioData.nombre}*\n\n`;
        
        if (infoCliente && infoCliente.total_pedidos > 0) {
            saludo += `📊 Has realizado ${infoCliente.total_pedidos} pedido(s) con nosotros 🎉\n\n`;
        }
        
        saludo += `Te puedo ayudar con:\n` +
               `📋 Lista de precios\n` +
               `🕐 Horarios\n` +
               `📍 Ubicación\n` +
               `📦 Stock de productos\n` +
               `🛒 Hacer un pedido\n` +
               `💳 Medios de pago\n`;
        
        if (infoCliente && infoCliente.total_pedidos > 0) {
            saludo += `📜 Ver mis pedidos anteriores\n`;
        }
        
        saludo += `\n¿Qué necesitas?`;
        
        marcarSesionActiva(from, 'consulta');
        return saludo;
    }

    if (textoLower.match(/horario|hora|atencion|abren|cierran|abierto/)) {
        marcarSesionActiva(from, 'consulta');
        return `🕐 *Horarios de Atención*\n\n${negocioData.horarios}`;
    }

    if (textoLower.match(/ubicacion|direccion|donde|local|negocio|como llego/)) {
        marcarSesionActiva(from, 'consulta');
        return `📍 *Nuestra Ubicación*\n\n${negocioData.direccion}\n\nTe esperamos! 😊`;
    }

    const productosDetectados = detectarProductosEnTexto(textoOriginal);
    
    if (productosDetectados.length > 0) {
        marcarSesionActiva(from, 'seleccionando_productos');
        return procesarDeteccionProductos(from, productosDetectados);
    }

    if (textoLower.match(/stock|hay|tienen|disponible|queda|quedan/)) {
        marcarSesionActiva(from, 'consulta');
        return `📦 Para consultar stock específico, escribe el nombre del producto.\n\n` +
               `Ejemplo: "Hay cuadernos A4?"`;
    }

    if (textoLower.match(/pago|efectivo|tarjeta|transfer|mercadopago|debito|credito/)) {
        marcarSesionActiva(from, 'consulta');
        return `💳 *Medios de Pago:*\n\n${negocioData.medios_pago}`;
    }

    if (textoLower.match(/contacto|telefono|whatsapp|llamar/)) {
        marcarSesionActiva(from, 'consulta');
        return `📞 *Contacto*\n\n` +
               `WhatsApp: ${negocioData.whatsapp}\n` +
               `Teléfono: ${negocioData.telefono}\n\n` +
               `¡Estamos para ayudarte! 😊`;
    }

    console.log('🤖 Mensaje no coincide con patrones. Intentando con IA...');
    
    const respuestaIA = await procesarConIA(textoOriginal, {
        nombre: nombreContacto,
        telefono: from,
        historial: obtenerInfoCliente(from)
    });
    
    if (respuestaIA) {
        marcarSesionActiva(from, 'consulta_ia');
        return respuestaIA;
    }

    return `No entendí bien tu consulta 🤔\n\n` +
           `Puedes preguntarme sobre:\n` +
           `• Precios y productos\n` +
           `• Hacer un pedido (ej: "Quiero 2 cuadernos")\n` +
           `• Ver mis pedidos anteriores\n` +
           `• Horarios de atención\n` +
           `• Ubicación del local\n` +
           `• Stock disponible\n` +
           `• Medios de pago\n\n` +
           `¿En qué te puedo ayudar?`;
}

function mostrarHistorialCliente(telefono) {
    const infoCliente = obtenerInfoCliente(telefono);
    
    if (!infoCliente || infoCliente.total_pedidos === 0) {
        return `📜 *Tu Historial*\n\n` +
               `Aún no has realizado pedidos con nosotros.\n\n` +
               `¿Te gustaría hacer tu primer pedido? 🛒\n` +
               `Escribe por ejemplo: "Quiero 2 cuadernos"`;
    }
    
    let respuesta = `📜 *TU HISTORIAL DE PEDIDOS*\n`;
    respuesta += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    respuesta += `👤 Cliente: ${infoCliente.nombre}\n`;
    respuesta += `📱 Teléfono: ${infoCliente.telefono.replace('@c.us', '')}\n`;
    respuesta += `📅 Cliente desde: ${formatearFecha(infoCliente.fecha_registro)}\n`;
    respuesta += `📦 Total de pedidos: ${infoCliente.total_pedidos}\n`;
    respuesta += `💰 Total gastado: $${infoCliente.total_gastado}\n\n`;
    respuesta += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    if (infoCliente.pedidos.length > 0) {
        respuesta += `📋 *ÚLTIMOS PEDIDOS:*\n\n`;
        
        const ultimosPedidos = infoCliente.pedidos.slice(-5).reverse();
        
        ultimosPedidos.forEach((pedido, index) => {
            respuesta += `${index + 1}. *${pedido.id}* - ${formatearFecha(pedido.fecha)}\n`;
            respuesta += `   💰 Total: $${pedido.total}\n`;
            respuesta += `   📦 Productos:\n`;
            
            pedido.productos.slice(0, 3).forEach(prod => {
                respuesta += `      • ${prod.nombre} x${prod.cantidad}\n`;
            });
            
            if (pedido.productos.length > 3) {
                respuesta += `      • ... y ${pedido.productos.length - 3} más\n`;
            }
            
            respuesta += `   🚚 Entrega: ${pedido.tipo_entrega === 'delivery' ? 'Delivery' : 'Retiro'}\n`;
            respuesta += `   ✅ Estado: ${pedido.estado}\n\n`;
        });
        
        if (infoCliente.pedidos.length > 5) {
            respuesta += `... y ${infoCliente.pedidos.length - 5} pedidos más\n\n`;
        }
    }
    
    respuesta += `━━━━━━━━━━━━━━━━━━━━━\n`;
    respuesta += `🙏 ¡Gracias por tu preferencia!\n\n`;
    respuesta += `¿Deseas hacer un nuevo pedido? 🛒`;
    
    return respuesta;
}

function formatearFecha(isoString) {
    const fecha = new Date(isoString);
    const dia = String(fecha.getDate()).padStart(2, '0');
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const año = fecha.getFullYear();
    const hora = String(fecha.getHours()).padStart(2, '0');
    const minutos = String(fecha.getMinutes()).padStart(2, '0');
    
    return `${dia}/${mes}/${año} ${hora}:${minutos}`;
}

function detectarProductosEnTexto(texto) {
    // ✅ OPTIMIZADO: Usa índice en vez de triple loop
    console.log(`🔍 Buscando productos en: "${texto}"`);
    
    const numerosTexto = {
        'un': 1, 'una': 1, 'uno': 1,
        'dos': 2, 'tres': 3, 'cuatro': 4, 'cinco': 5,
        'seis': 6, 'siete': 7, 'ocho': 8, 'nueve': 9, 'diez': 10
    };
    
    let cantidadDetectada = 1;
    const regexNumero = /(\d+|un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)/gi;
    const matches = texto.match(regexNumero);
    
    if (matches) {
        const ultimoMatch = matches[matches.length - 1].toLowerCase();
        cantidadDetectada = numerosTexto[ultimoMatch] || parseInt(ultimoMatch) || 1;
    }
    
    // 🚀 Usar índice para búsqueda O(1)
    const resultados = productoIndex.buscar(texto);
    
    console.log(`   Resultados encontrados: ${resultados.length}`);
    
    // Formatear resultados
    const productosDetectados = resultados.map(producto => ({
        nombre: producto.nombreOriginal,
        nombreFormateado: producto.nombreFormateado,
        cantidad: cantidadDetectada,
        precio: producto.precio,
        stock: producto.stock,
        categoria: producto.categoria,
        subcategoria: producto.subcategoria
    }));
    
    return productosDetectados;
}

function procesarDeteccionProductos(from, productos) {
    if (productos.length === 0) {
        return `🤔 No encontré productos específicos en tu mensaje.\n\n` +
               `Intenta escribir algo como:\n` +
               `"Quiero 2 cuadernos A4"\n` +
               `"Dame 5 lapiceras"\n` +
               `"Necesito 3 globos"`;
    }
    
    if (productos.length > 1) {
        const nombresProduc = [...new Set(productos.map(p => p.nombre))];
        
        if (nombresProduc.length > 1) {
            let respuesta = `🔍 *Encontré ${productos.length} productos que coinciden:*\n\n`;
            
            productos.slice(0, 10).forEach((prod, index) => {
                const numero = index + 1;
                const stockEmoji = prod.stock ? '✅' : '❌';
                
                respuesta += `${numero}️⃣ ${stockEmoji} ${prod.nombreFormateado}\n`;
                respuesta += `   💰 $${prod.precio}${prod.stock ? '' : ' (SIN STOCK)'}\n`;
                respuesta += `   📂 ${prod.categoria.replace(/_/g, ' ')}\n\n`;
            });
            
            if (productos.length > 10) {
                respuesta += `... y ${productos.length - 10} más\n\n`;
            }
            
            respuesta += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
            respuesta += `Por favor, especifica cuál quieres:\n`;
            respuesta += `• Escribe el *número* (ej: "1")\n`;
            respuesta += `• O escribe más detalles (ej: "lapicera azul")\n`;
            respuesta += `• O escribe *"cancelar"* para buscar otra cosa`;
            
            if (!carritos[from]) {
                carritos[from] = { productos: [], temporal: [] };
            }
            carritos[from].opciones_multiples = productos;
            carritos[from].cantidad_solicitada = productos[0].cantidad;
            
            marcarSesionActiva(from, 'eligiendo_producto');
            
            return respuesta;
        }
    }
    
    let respuesta = `🔍 *Encontré estos productos:*\n\n`;
    
    productos.forEach((prod, index) => {
        const numero = index + 1;
        const stockEmoji = prod.stock ? '✅' : '❌';
        const precioTotal = prod.precio * prod.cantidad;
        
        respuesta += `${numero}️⃣ ${stockEmoji} ${prod.nombreFormateado}\n`;
        respuesta += `   Cantidad: ${prod.cantidad}\n`;
        respuesta += `   Precio unitario: $${prod.precio}\n`;
        respuesta += `   Subtotal: $${precioTotal}\n\n`;
    });
    
    const sinStock = productos.filter(p => !p.stock);
    if (sinStock.length > 0) {
        respuesta += `⚠️ ATENCIÓN: Algunos productos están SIN STOCK\n\n`;
    }
    
    respuesta += `¿Es correcto este pedido?\n\n`;
    respuesta += `• Escribe *"si"* para agregarlo al carrito\n`;
    respuesta += `• Escribe *"no"* para cancelar`;
    
    if (!carritos[from]) {
        carritos[from] = { productos: [], temporal: [] };
    }
    carritos[from].temporal = productos;
    
    return respuesta;
}

function agregarAlCarrito(from) {
    if (!carritos[from] || !carritos[from].temporal || carritos[from].temporal.length === 0) {
        return `❌ No hay productos pendientes para agregar.\n\n` +
               `Escribe tu pedido, ejemplo: "Quiero 2 cuadernos"`;
    }
    
    const productosTemporales = carritos[from].temporal;
    
    const sinStock = productosTemporales.filter(p => !p.stock);
    if (sinStock.length > 0) {
        let respuesta = `❌ No puedo agregar estos productos porque están SIN STOCK:\n\n`;
        sinStock.forEach(p => {
            respuesta += `• ${p.nombreFormateado}\n`;
        });
        respuesta += `\n¿Deseas continuar solo con los productos disponibles? (si/no)`;
        return respuesta;
    }
    
    if (!carritos[from].productos) {
        carritos[from].productos = [];
    }
    
    productosTemporales.forEach(prod => {
        carritos[from].productos.push(prod);
    });
    
    carritos[from].temporal = [];
    
    iniciarTimerCarrito(from);
    
    return mostrarCarrito(from) + 
           `\n\n💡 ¿Deseas agregar más productos?\n` +
           `• Escribe otro pedido (ej: "3 lapiceras")\n` +
           `• O escribe *"confirmar"* para finalizar`;
}

function mostrarCarrito(from) {
    if (!carritos[from] || !carritos[from].productos || carritos[from].productos.length === 0) {
        return `🛒 Tu carrito está vacío\n\n` +
               `Para hacer un pedido, escribe por ejemplo:\n` +
               `"Quiero 2 cuadernos" o "Dame 5 lapiceras"`;
    }
    
    let respuesta = `🛒 *TU CARRITO*\n`;
    respuesta += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    let total = 0;
    
    carritos[from].productos.forEach((prod, index) => {
        const numero = index + 1;
        const subtotal = prod.precio * prod.cantidad;
        total += subtotal;
        
        respuesta += `${numero}. ${prod.nombreFormateado}\n`;
        respuesta += `   ${prod.cantidad} x $${prod.precio} = $${subtotal}\n\n`;
    });
    
    let descuento = 0;
    let mensajeDescuento = '';
    
    if (configPedidos.descuentos.habilitado) {
        for (const regla of configPedidos.descuentos.reglas) {
            if (total >= regla.minimo) {
                descuento = Math.floor(total * (regla.porcentaje / 100));
                mensajeDescuento = `🎉 ${regla.descripcion}\n`;
            }
        }
    }
    
    respuesta += `━━━━━━━━━━━━━━━━━━━━━\n`;
    respuesta += `💰 Subtotal: $${total}\n`;
    
    if (descuento > 0) {
        respuesta += mensajeDescuento;
        respuesta += `🎁 Descuento: -$${descuento}\n`;
        respuesta += `━━━━━━━━━━━━━━━━━━━━━\n`;
        respuesta += `💰 *TOTAL: $${total - descuento}*\n`;
    } else {
        respuesta += `━━━━━━━━━━━━━━━━━━━━━\n`;
        respuesta += `💰 *TOTAL: $${total}*\n`;
    }
    
    respuesta += `\n📝 Opciones:\n`;
    respuesta += `• *"confirmar"* - Finalizar pedido\n`;
    respuesta += `• *"quitar [número]"* - Eliminar producto\n`;
    respuesta += `• *"cancelar"* - Vaciar carrito\n`;
    
    if (timersCarrito[from]) {
        respuesta += `\n⏰ Tu carrito expira en 15 minutos`;
    }
    
    return respuesta;
}

async function confirmarPedido(from, nombreContacto) {
    if (!carritos[from] || !carritos[from].productos || carritos[from].productos.length === 0) {
        return `❌ No tienes productos en el carrito.\n\n` +
               `Para hacer un pedido, escribe por ejemplo:\n` +
               `"Quiero 2 cuadernos"`;
    }
    
    const productos = carritos[from].productos;
    let total = 0;
    
    productos.forEach(prod => {
        total += prod.precio * prod.cantidad;
    });
    
    let descuento = 0;
    let porcentajeDescuento = 0;
    
    if (configPedidos.descuentos.habilitado) {
        for (const regla of configPedidos.descuentos.reglas) {
            if (total >= regla.minimo) {
                descuento = Math.floor(total * (regla.porcentaje / 100));
                porcentajeDescuento = regla.porcentaje;
            }
        }
    }
    
    const subtotal = total;
    const totalFinal = total - descuento;
    
    let respuesta = `📋 *RESUMEN DE TU PEDIDO*\n`;
    respuesta += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    productos.forEach((prod, index) => {
        const numero = index + 1;
        const subtotalProd = prod.precio * prod.cantidad;
        respuesta += `${numero}. ${prod.nombreFormateado} x${prod.cantidad}\n`;
        respuesta += `   $${subtotalProd}\n\n`;
    });
    
    respuesta += `━━━━━━━━━━━━━━━━━━━━━\n`;
    respuesta += `💰 Subtotal: $${subtotal}\n`;
    
    if (descuento > 0) {
        respuesta += `🎁 Descuento (${porcentajeDescuento}%): -$${descuento}\n`;
    }
    
    respuesta += `━━━━━━━━━━━━━━━━━━━━━\n`;
    respuesta += `💰 *TOTAL: $${totalFinal}*\n\n`;
    
    if (configPedidos.delivery.habilitado) {
        respuesta += `🚚 *¿Cómo lo querés recibir?*\n\n`;
        respuesta += `1️⃣ *Retiro en local* (Gratis)\n`;
        respuesta += `   📍 ${negocioData.direccion}\n`;
        respuesta += `   🕐 ${negocioData.horarios}\n\n`;
        
        if (configPedidos.delivery.gratis_desde && totalFinal >= configPedidos.delivery.gratis_desde) {
            respuesta += `2️⃣ *Delivery* (GRATIS por tu compra)\n\n`;
        } else {
            respuesta += `2️⃣ *Delivery* (+$${configPedidos.delivery.costo})\n\n`;
        }
        
        respuesta += `Responde *"1"* o *"2"* para continuar`;
        
        carritos[from].esperandoEntrega = true;
        carritos[from].totalFinal = totalFinal;
        carritos[from].descuento = descuento;
        
        marcarSesionActiva(from, 'confirmando_pedido');
        
    } else {
        respuesta += `📍 *Retiro en local*\n`;
        respuesta += `${negocioData.direccion}\n`;
        respuesta += `🕐 ${negocioData.horarios}\n\n`;
        
        respuesta += `💳 *Medios de pago:*\n`;
        respuesta += `${negocioData.medios_pago}\n\n`;
        
        const numeroPedido = await guardarPedidoYActualizarCliente(from, nombreContacto, productos, subtotal, descuento, totalFinal, 'retiro', 0);
        
        respuesta += `✅ *PEDIDO CONFIRMADO*\n`;
        respuesta += `📄 Número de pedido: *#${numeroPedido}*\n\n`;
        respuesta += `🙏 ¡Gracias por tu compra!`;
        
        delete carritos[from];
        clearTimeout(timersCarrito[from]);
        delete timersCarrito[from];
        limpiarSesion(from);
    }
    
    return respuesta;
}

async function procesarOpcionEntrega(from, opcion, nombreContacto) {
    if (!carritos[from] || !carritos[from].esperandoEntrega) {
        return null;
    }
    
    const productos = carritos[from].productos;
    const totalFinal = carritos[from].totalFinal;
    const descuento = carritos[from].descuento;
    const subtotal = totalFinal + descuento;
    
    let tipoEntrega = '';
    let costoDelivery = 0;
    let respuesta = '';
    
    if (opcion === '1') {
        tipoEntrega = 'retiro';
        
        respuesta += `✅ *PEDIDO CONFIRMADO*\n`;
        respuesta += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
        respuesta += `🏪 *Retiro en local*\n`;
        respuesta += `📍 ${negocioData.direccion}\n`;
        respuesta += `🕐 ${negocioData.horarios}\n\n`;
        
    } else if (opcion === '2') {
        tipoEntrega = 'delivery';
        
        if (configPedidos.delivery.gratis_desde && totalFinal >= configPedidos.delivery.gratis_desde) {
            costoDelivery = 0;
        } else {
            costoDelivery = configPedidos.delivery.costo;
        }
        
        respuesta += `✅ *PEDIDO CONFIRMADO*\n`;
        respuesta += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
        respuesta += `🚚 *Delivery*\n`;
        
        if (costoDelivery > 0) {
            respuesta += `Costo de envío: $${costoDelivery}\n`;
        } else {
            respuesta += `🎉 Envío GRATIS por tu compra\n`;
        }
        respuesta += `\n`;
        
    } else {
        return `❌ Opción no válida.\n\nResponde *"1"* para retiro o *"2"* para delivery`;
    }
    
    productos.forEach((prod, index) => {
        const numero = index + 1;
        respuesta += `${numero}. ${prod.nombreFormateado} x${prod.cantidad} - $${prod.precio * prod.cantidad}\n`;
    });
    
    respuesta += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
    respuesta += `💰 Subtotal: $${subtotal}\n`;
    
    if (descuento > 0) {
        respuesta += `🎁 Descuento: -$${descuento}\n`;
    }
    
    if (costoDelivery > 0) {
        respuesta += `🚚 Delivery: +$${costoDelivery}\n`;
    }
    
    const totalConDelivery = totalFinal + costoDelivery;
    
    respuesta += `━━━━━━━━━━━━━━━━━━━━━\n`;
    respuesta += `💰 *TOTAL: $${totalConDelivery}*\n\n`;
    
    respuesta += `💳 *Medios de pago:*\n`;
    respuesta += `${negocioData.medios_pago}\n\n`;
    
    const numeroPedido = await guardarPedidoYActualizarCliente(from, nombreContacto, productos, subtotal, descuento, totalConDelivery, tipoEntrega, costoDelivery);
    
    respuesta += `📄 Número de pedido: *#${numeroPedido}*\n\n`;
    respuesta += `🙏 ¡Gracias por tu compra!\n`;
    respuesta += `Te contactaremos pronto para coordinar.`;
    
    delete carritos[from];
    clearTimeout(timersCarrito[from]);
    delete timersCarrito[from];
    
    return respuesta;
}

async function guardarPedidoYActualizarCliente(from, nombreContacto, productos, subtotal, descuento, total, tipoEntrega, costoDelivery) {
    const dataPedidos = cache.obtenerPedidosSync();
    
    dataPedidos.ultimo_numero += 1;
    const numeroPedido = `PED-${String(dataPedidos.ultimo_numero).padStart(3, '0')}`;
    
    const pedido = {
        id: numeroPedido,
        cliente: from,
        nombre: nombreContacto,
        fecha: new Date().toISOString(),
        productos: productos.map(p => ({
            nombre: p.nombreFormateado,
            cantidad: p.cantidad,
            precio_unitario: p.precio,
            subtotal: p.precio * p.cantidad
        })),
        subtotal: subtotal,
        descuento: descuento,
        delivery: costoDelivery,
        total: total,
        tipo_entrega: tipoEntrega,
        estado: 'confirmado'
    };
    
    dataPedidos.pedidos.push(pedido);
    fs.writeFileSync('./data/pedidos.json', JSON.stringify(dataPedidos, null, 2));
        cache.invalidarPedidos();
    
    const clientesData = cache.obtenerClientesSync();
    
    let cliente = clientesData.clientes.find(c => c.telefono === from);
    
    if (!cliente) {
        cliente = {
            telefono: from,
            nombre: nombreContacto,
            fecha_registro: new Date().toISOString(),
            ultima_interaccion: new Date().toISOString(),
            total_pedidos: 0,
            total_gastado: 0,
            pedidos: []
        };
        clientesData.clientes.push(cliente);
    }
    
    cliente.total_pedidos += 1;
    cliente.total_gastado += total;
    cliente.ultima_interaccion = new Date().toISOString();
    cliente.pedidos.push(pedido);
    
    clientesData.estadisticas.total_pedidos += 1;
    clientesData.estadisticas.total_vendido += total;
    
    fs.writeFileSync('./data/clientes.json', JSON.stringify(clientesData, null, 2));
        cache.invalidarClientes();
    
    console.log(`💾 Pedido guardado: ${numeroPedido} - $${total} - ${nombreContacto}`);
    console.log(`👤 Cliente actualizado: ${cliente.nombre} - Total: ${cliente.total_pedidos} pedidos - $${cliente.total_gastado}`);
    
    await notificarNuevoPedido(pedido, from, nombreContacto);
    
    return numeroPedido;
}

async function notificarNuevoPedido(pedido, telefonoCliente, nombreCliente) {
    try {
        if (!negocioData.notificaciones_activas) {
            console.log(`🔕 Notificaciones desactivadas. No se envió notificación.`);
            return;
        }
        
        const telefonoLimpio = telefonoCliente.replace('@c.us', '');
        const whatsappLink = `https://wa.me/${telefonoLimpio}`;
        
        let mensaje = `🔔 *NUEVO PEDIDO RECIBIDO*\n\n`;
        mensaje += `━━━━━━━━━━━━━━━━━━━━━\n`;
        mensaje += `📄 *Pedido:* ${pedido.id}\n`;
        mensaje += `👤 *Cliente:* ${nombreCliente}\n`;
        mensaje += `📱 *Teléfono:* ${telefonoLimpio}\n`;
        mensaje += `📅 *Fecha:* ${formatearFecha(pedido.fecha)}\n`;
        mensaje += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
        
        mensaje += `📦 *PRODUCTOS:*\n`;
        pedido.productos.forEach((prod, index) => {
            mensaje += `${index + 1}. ${prod.nombre} x${prod.cantidad}\n`;
            mensaje += `   $${prod.precio_unitario} c/u = $${prod.subtotal}\n`;
        });
        
        mensaje += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
        mensaje += `💰 *Subtotal:* $${pedido.subtotal}\n`;
        
        if (pedido.descuento > 0) {
            const porcentaje = Math.round((pedido.descuento / pedido.subtotal) * 100);
            mensaje += `🎁 *Descuento (${porcentaje}%):* -$${pedido.descuento}\n`;
        }
        
        if (pedido.delivery > 0) {
            mensaje += `🚚 *Delivery:* +$${pedido.delivery}\n`;
        }
        
        mensaje += `━━━━━━━━━━━━━━━━━━━━━\n`;
        mensaje += `💰 *TOTAL:* $${pedido.total}\n\n`;
        
        mensaje += `🚚 *Entrega:* ${pedido.tipo_entrega === 'delivery' ? 'Delivery' : 'Retiro en local'}\n`;
        mensaje += `💳 *Estado de pago:* Pendiente\n`;
        mensaje += `✅ *Estado:* ${pedido.estado}\n\n`;
        
        mensaje += `━━━━━━━━━━━━━━━━━━━━━\n`;
        mensaje += `📲 *Para contactar al cliente:*\n`;
        mensaje += `${whatsappLink}\n\n`;
        mensaje += `💡 _Responde desde tu WhatsApp para coordinar._`;
        
        let notificacionEnviada = false;
        
        if (negocioData.grupo_notificaciones && 
            negocioData.grupo_notificaciones.trim() !== '' &&
            negocioData.grupo_notificaciones.includes('@g.us')) {
            
            try {
                await client.sendMessage(negocioData.grupo_notificaciones, mensaje);
                console.log(`✅ Notificación enviada al grupo: ${pedido.id}`);
                notificacionEnviada = true;
            } catch (errorGrupo) {
                console.error(`❌ Error al enviar al grupo:`, errorGrupo.message);
                console.log(`⚠️ Intentando enviar a dueños individuales...`);
            }
        }
        
        if (!notificacionEnviada) {
            const dueños = negocioData.numeros_dueños || 
                          (negocioData.numero_dueño ? [negocioData.numero_dueño] : []);
            
            if (dueños.length === 0) {
                console.log(`⚠️ No hay números de dueños configurados.`);
                return;
            }
            
            for (const numeroDueño of dueños) {
                if (!numeroDueño || numeroDueño.trim() === '') continue;
                
                try {
                    await client.sendMessage(numeroDueño, mensaje);
                    console.log(`✅ Notificación enviada a: ${numeroDueño}`);
                    notificacionEnviada = true;
                } catch (errorIndividual) {
                    console.error(`❌ Error al notificar a ${numeroDueño}:`, errorIndividual.message);
                }
            }
        }
        
        if (!notificacionEnviada) {
            console.log(`⚠️ No se pudo enviar notificación.`);
        }
        
    } catch (error) {
        console.error(`❌ Error al enviar notificación:`, error.message);
    }
}

function cancelarCarrito(from) {
    if (!carritos[from] || !carritos[from].productos || carritos[from].productos.length === 0) {
        return `🛒 Tu carrito ya está vacío`;
    }
    
    delete carritos[from];
    clearTimeout(timersCarrito[from]);
    delete timersCarrito[from];
    
    return `✅ Carrito vaciado correctamente\n\n` +
           `Para hacer un nuevo pedido, escribe por ejemplo:\n` +
           `"Quiero 2 cuadernos"`;
}

function quitarProductoCarrito(from, index) {
    if (!carritos[from] || !carritos[from].productos || carritos[from].productos.length === 0) {
        return `🛒 Tu carrito está vacío`;
    }
    
    if (index < 0 || index >= carritos[from].productos.length) {
        return `❌ Número de producto inválido\n\n` + mostrarCarrito(from);
    }
    
    const productoEliminado = carritos[from].productos.splice(index, 1)[0];
    
    let respuesta = `✅ Eliminado: ${productoEliminado.nombreFormateado} x${productoEliminado.cantidad}\n\n`;
    
    if (carritos[from].productos.length === 0) {
        delete carritos[from];
        clearTimeout(timersCarrito[from]);
        delete timersCarrito[from];
        respuesta += `🛒 Tu carrito está vacío`;
    } else {
        respuesta += mostrarCarrito(from);
    }
    
    return respuesta;
}

function iniciarTimerCarrito(from) {
    if (timersCarrito[from]) {
        clearTimeout(timersCarrito[from]);
    }
    
    timersCarrito[from] = setTimeout(() => {
        if (carritos[from]) {
            delete carritos[from];
            delete timersCarrito[from];
            console.log(`⏰ Carrito expirado para: ${from}`);
        }
    }, configPedidos.carrito.expiracion_minutos * 60 * 1000);
}

function extraerNumero(texto) {
    const match = texto.match(/\d+/);
    return match ? parseInt(match[0]) : null;
}

client.initialize();
