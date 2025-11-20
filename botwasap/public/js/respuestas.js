// ═══════════════════════════════════════
// 💬 EDITOR DE RESPUESTAS - JAVASCRIPT
// ═══════════════════════════════════════

const API_URL = '/api';

let respuestasData = {};
let tabActual = 'saludos';

// ═══════════════════════════════════════
// 🚀 INICIALIZACIÓN
// ═══════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    cargarRespuestas();
});

// ═══════════════════════════════════════
// 📥 CARGAR RESPUESTAS
// ═══════════════════════════════════════

async function cargarRespuestas() {
    try {
        const response = await fetch(`${API_URL}/respuestas`);
        respuestasData = await response.json();
        
        console.log('💬 Respuestas cargadas:', respuestasData);
        
        renderizarRespuestas();
    } catch (error) {
        console.error('❌ Error al cargar respuestas:', error);
        mostrarNotificacion('Error al cargar respuestas', 'error');
    }
}

// ═══════════════════════════════════════
// 🎨 RENDERIZAR RESPUESTAS
// ═══════════════════════════════════════

function renderizarRespuestas() {
    const container = document.getElementById('respuestas-container');
    
    if (!respuestasData[tabActual]) {
        container.innerHTML = '<p>No hay respuestas en esta categoría</p>';
        return;
    }
    
    const respuestas = respuestasData[tabActual];
    
    let html = '';
    
    for (const [key, valor] of Object.entries(respuestas)) {
        const titulo = formatearTitulo(key);
        
        html += `
            <div class="respuesta-item">
                <div class="respuesta-header">
                    <h3 class="respuesta-titulo">${titulo}</h3>
                    <span class="respuesta-key">${tabActual}.${key}</span>
                </div>
                <textarea 
                    class="respuesta-textarea" 
                    id="respuesta-${tabActual}-${key}"
                    data-categoria="${tabActual}"
                    data-key="${key}"
                    placeholder="Escribe la respuesta aquí..."
                >${valor}</textarea>
                <div class="respuesta-info">
                    💡 Puedes usar variables como {nombre_negocio}, {horarios}, {direccion}, etc.
                </div>
                <div class="respuesta-actions">
                    <button class="btn-preview" onclick="previsualizarRespuestaIndividual('${tabActual}', '${key}')">
                        👁️ Vista Previa
                    </button>
                </div>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

// ═══════════════════════════════════════
// 📑 CAMBIAR TAB
// ═══════════════════════════════════════

function cambiarTab(tab) {
    tabActual = tab;
    
    // Actualizar botones
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    renderizarRespuestas();
}

// ═══════════════════════════════════════
// 💾 GUARDAR RESPUESTAS
// ═══════════════════════════════════════

async function guardarRespuestas() {
    try {
        // Recopilar todos los cambios
        const textareas = document.querySelectorAll('.respuesta-textarea');
        
        textareas.forEach(textarea => {
            const categoria = textarea.dataset.categoria;
            const key = textarea.dataset.key;
            const valor = textarea.value;
            
            if (respuestasData[categoria]) {
                respuestasData[categoria][key] = valor;
            }
        });
        
        console.log('💾 Guardando respuestas:', respuestasData);
        
        const response = await fetch(`${API_URL}/respuestas`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(respuestasData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            mostrarNotificacion('✅ Respuestas guardadas exitosamente', 'success');
            console.log('✅ Respuestas guardadas');
        } else {
            mostrarNotificacion('❌ ' + result.error, 'error');
        }
    } catch (error) {
        console.error('❌ Error al guardar respuestas:', error);
        mostrarNotificacion('❌ Error al guardar respuestas', 'error');
    }
}

// ═══════════════════════════════════════
// 🔄 RESTAURAR POR DEFECTO
// ═══════════════════════════════════════

function confirmarRestaurar() {
    document.getElementById('mensajeConfirmar').textContent = 
        '¿Estás seguro de restaurar todas las respuestas a sus valores por defecto? Esta acción no se puede deshacer.';
    
    document.getElementById('btnConfirmarAccion').onclick = restaurarRespuestas;
    
    abrirModal('modalConfirmar');
}

async function restaurarRespuestas() {
    try {
        const response = await fetch(`${API_URL}/respuestas/restaurar`, {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            respuestasData = result.respuestas;
            renderizarRespuestas();
            mostrarNotificacion('✅ Respuestas restauradas', 'success');
            cerrarModal('modalConfirmar');
        } else {
            mostrarNotificacion('❌ Error al restaurar', 'error');
        }
    } catch (error) {
        console.error('❌ Error:', error);
        mostrarNotificacion('❌ Error al restaurar respuestas', 'error');
    }
}

// ═══════════════════════════════════════
// 👁️ VISTA PREVIA
// ═══════════════════════════════════════

function previsualizarRespuestaIndividual(categoria, key) {
    const textarea = document.getElementById(`respuesta-${categoria}-${key}`);
    const texto = textarea.value;
    
    const textoFormateado = formatearTextoPreview(texto);
    
    const messagesContainer = document.getElementById('previewMessages');
    messagesContainer.innerHTML = `
        <div class="message-bubble">
            ${textoFormateado}
            <div class="message-time">${new Date().toLocaleTimeString('es-AR', {hour: '2-digit', minute: '2-digit'})}</div>
        </div>
    `;
    
    abrirModal('modalPreview');
}

function previsualizarRespuesta() {
    // Previsualizar la primera respuesta del tab actual
    const primeraKey = Object.keys(respuestasData[tabActual])[0];
    if (primeraKey) {
        previsualizarRespuestaIndividual(tabActual, primeraKey);
    }
}

// ═══════════════════════════════════════
// 🛠️ UTILIDADES
// ═══════════════════════════════════════

function formatearTitulo(key) {
    return key
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
}

function formatearTextoPreview(texto) {
    // Reemplazar variables con valores de ejemplo
    let textoFormateado = texto
        .replace(/{nombre_negocio}/g, '<strong>Mi Negocio</strong>')
        .replace(/{horarios}/g, 'Lunes a Viernes: 9:00 - 18:00')
        .replace(/{direccion}/g, 'Av. Principal 123')
        .replace(/{whatsapp}/g, '+54 9 11 1234-5678')
        .replace(/{telefono}/g, '(011) 1234-5678')
        .replace(/{medios_pago}/g, 'Efectivo, Tarjeta, Transferencia')
        .replace(/{numero_pedido}/g, 'PED-001')
        .replace(/{cliente_frecuente}/g, ' de nuevo')
        .replace(/{info_cliente}/g, '📊 Has realizado 3 pedido(s) con nosotros 🎉\n\n')
        .replace(/{historial_pedidos}/g, '\n📜 Ver mis pedidos anteriores')
        .replace(/{lista_productos}/g, '1️⃣ ✅ Cuaderno A4\n   Cantidad: 2\n   Precio unitario: $1500\n   Subtotal: $3000')
        .replace(/{productos_sin_stock}/g, '• Producto Ejemplo 1\n• Producto Ejemplo 2');
    
    // Convertir markdown básico a HTML
    textoFormateado = textoFormateado
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
    
    return textoFormateado;
}

function abrirModal(id) {
    document.getElementById(id).classList.add('active');
}

function cerrarModal(id) {
    document.getElementById(id).classList.remove('active');
}

function mostrarNotificacion(mensaje, tipo = 'success') {
    const notif = document.getElementById('notificacion');
    notif.textContent = mensaje;
    notif.className = `notificacion ${tipo} active`;
    
    setTimeout(() => {
        notif.classList.remove('active');
    }, 3000);
}

// Cerrar modal al hacer clic fuera
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
    }
};