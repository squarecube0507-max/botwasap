// ═══════════════════════════════════════
// ⚙️ EDITOR DE CONFIGURACIÓN - JAVASCRIPT
// ═══════════════════════════════════════

const API_URL = '/api';

let configuracionNegocio = {};
let configuracionPedidos = {};
let palabrasClave = {};
let tabActual = 'negocio';

// ═══════════════════════════════════════
// 🚀 INICIALIZACIÓN
// ═══════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    cargarConfiguracion();
});

// ═══════════════════════════════════════
// 📥 CARGAR CONFIGURACIÓN
// ═══════════════════════════════════════

async function cargarConfiguracion() {
    try {
        // Cargar configuración del negocio
        const resNegocio = await fetch(`${API_URL}/configuracion`);
        configuracionNegocio = await resNegocio.json();
        
        // Cargar configuración de pedidos
        const resPedidos = await fetch(`${API_URL}/configuracion/pedidos`);
        configuracionPedidos = await resPedidos.json();
        
        // Cargar palabras clave
        const resPalabras = await fetch(`${API_URL}/configuracion/palabras-clave`);
        palabrasClave = await resPalabras.json();
        
        console.log('⚙️ Configuraciones cargadas');
        
        cargarDatosNegocio();
        cargarDatosPedidos();
        cargarPalabrasClave();
        
    } catch (error) {
        console.error('❌ Error al cargar configuración:', error);
        mostrarNotificacion('Error al cargar configuración', 'error');
    }
}

// ═══════════════════════════════════════
// 🏪 CARGAR DATOS DEL NEGOCIO
// ═══════════════════════════════════════

function cargarDatosNegocio() {
    document.getElementById('nombre').value = configuracionNegocio.nombre || '';
    document.getElementById('whatsapp').value = configuracionNegocio.whatsapp || '';
    document.getElementById('telefono').value = configuracionNegocio.telefono || '';
    document.getElementById('direccion').value = configuracionNegocio.direccion || '';
    document.getElementById('horarios').value = configuracionNegocio.horarios || '';
    document.getElementById('medios_pago').value = configuracionNegocio.medios_pago || '';
    document.getElementById('numero_dueno').value = configuracionNegocio.numero_dueño || '';
    document.getElementById('grupo_notificaciones').value = configuracionNegocio.grupo_notificaciones || '';
}

// ═══════════════════════════════════════
// 📦 CARGAR DATOS DE PEDIDOS
// ═══════════════════════════════════════

function cargarDatosPedidos() {
    // Delivery
    document.getElementById('delivery_habilitado').checked = configuracionPedidos.delivery?.habilitado || false;
    document.getElementById('delivery_costo').value = configuracionPedidos.delivery?.costo || 0;
    document.getElementById('delivery_gratis_desde').value = configuracionPedidos.delivery?.gratis_desde || 0;
    
    // Descuentos
    document.getElementById('descuentos_habilitado').checked = configuracionPedidos.descuentos?.habilitado || false;
    renderizarDescuentos();
    
    // Carrito
    document.getElementById('carrito_expiracion').value = configuracionPedidos.carrito?.expiracion_minutos || 15;
}

// ═══════════════════════════════════════
// 🎁 RENDERIZAR DESCUENTOS
// ═══════════════════════════════════════

function renderizarDescuentos() {
    const container = document.getElementById('descuentos-container');
    const reglas = configuracionPedidos.descuentos?.reglas || [];
    
    let html = '';
    
    reglas.forEach((regla, index) => {
        html += `
            <div class="descuento-item" data-index="${index}">
                <div class="form-row">
                    <div class="form-group">
                        <label>Compra mínima ($)</label>
                        <input type="number" class="descuento-minimo" value="${regla.minimo}" min="0">
                    </div>
                    <div class="form-group">
                        <label>Descuento (%)</label>
                        <input type="number" class="descuento-porcentaje" value="${regla.porcentaje}" min="0" max="100">
                    </div>
                </div>
                <div class="form-group">
                    <label>Descripción</label>
                    <input type="text" class="descuento-descripcion" value="${regla.descripcion}" placeholder="Ej: Descuento del 10% en compras mayores a $5000">
                </div>
                <button onclick="eliminarDescuento(${index})" class="btn-eliminar">🗑️ Eliminar</button>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ═══════════════════════════════════════
// ➕ AGREGAR/ELIMINAR DESCUENTOS
// ═══════════════════════════════════════

function agregarDescuento() {
    if (!configuracionPedidos.descuentos) {
        configuracionPedidos.descuentos = { habilitado: false, reglas: [] };
    }
    
    if (!configuracionPedidos.descuentos.reglas) {
        configuracionPedidos.descuentos.reglas = [];
    }
    
    configuracionPedidos.descuentos.reglas.push({
        minimo: 0,
        porcentaje: 0,
        descripcion: ''
    });
    
    renderizarDescuentos();
}

function eliminarDescuento(index) {
    if (confirm('¿Estás seguro de eliminar este descuento?')) {
        configuracionPedidos.descuentos.reglas.splice(index, 1);
        renderizarDescuentos();
    }
}

// ═══════════════════════════════════════
// 🔑 CARGAR PALABRAS CLAVE
// ═══════════════════════════════════════

function cargarPalabrasClave() {
    const palabrasProductos = palabrasClave.palabras_productos || [];
    document.getElementById('palabras_productos').value = palabrasProductos.join('\n');
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
    
    // Mostrar/ocultar contenido
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`tab-${tab}`).classList.add('active');
}

// ═══════════════════════════════════════
// 💾 GUARDAR CONFIGURACIÓN
// ═══════════════════════════════════════

async function guardarConfiguracion() {
    try {
        // Guardar datos del negocio
        await guardarDatosNegocio();
        
        // Guardar configuración de pedidos
        await guardarConfiguracionPedidos();
        
        // Guardar palabras clave
        await guardarPalabrasClave();
        
        mostrarNotificacion('✅ Configuración guardada exitosamente', 'success');
        
    } catch (error) {
        console.error('❌ Error al guardar configuración:', error);
        mostrarNotificacion('❌ Error al guardar configuración', 'error');
    }
}

// ═══════════════════════════════════════
// 💾 GUARDAR DATOS DEL NEGOCIO
// ═══════════════════════════════════════

async function guardarDatosNegocio() {
    const datosNegocio = {
        nombre: document.getElementById('nombre').value.trim(),
        whatsapp: document.getElementById('whatsapp').value.trim(),
        telefono: document.getElementById('telefono').value.trim(),
        direccion: document.getElementById('direccion').value.trim(),
        horarios: document.getElementById('horarios').value.trim(),
        medios_pago: document.getElementById('medios_pago').value.trim(),
        numero_dueño: document.getElementById('numero_dueno').value.trim(),
        grupo_notificaciones: document.getElementById('grupo_notificaciones').value.trim()
    };
    
    // Validar campos requeridos
    if (!datosNegocio.nombre || !datosNegocio.whatsapp) {
        throw new Error('Nombre y WhatsApp son requeridos');
    }
    
    console.log('🏪 Guardando datos del negocio...');
    
    const response = await fetch(`${API_URL}/configuracion`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosNegocio)
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al guardar datos del negocio');
    }
    
    console.log('✅ Datos del negocio guardados');
}

// ═══════════════════════════════════════
// 💾 GUARDAR CONFIGURACIÓN DE PEDIDOS
// ═══════════════════════════════════════

async function guardarConfiguracionPedidos() {
    // Recopilar datos de descuentos
    const descuentosItems = document.querySelectorAll('.descuento-item');
    const reglas = [];
    
    descuentosItems.forEach(item => {
        const minimo = parseFloat(item.querySelector('.descuento-minimo').value) || 0;
        const porcentaje = parseFloat(item.querySelector('.descuento-porcentaje').value) || 0;
        const descripcion = item.querySelector('.descuento-descripcion').value.trim();
        
        if (minimo > 0 && porcentaje > 0) {
            reglas.push({ minimo, porcentaje, descripcion });
        }
    });
    
    const datosPedidos = {
        delivery: {
            habilitado: document.getElementById('delivery_habilitado').checked,
            costo: parseFloat(document.getElementById('delivery_costo').value) || 0,
            gratis_desde: parseFloat(document.getElementById('delivery_gratis_desde').value) || 0
        },
        descuentos: {
            habilitado: document.getElementById('descuentos_habilitado').checked,
            reglas: reglas
        },
        carrito: {
            expiracion_minutos: parseInt(document.getElementById('carrito_expiracion').value) || 15
        }
    };
    
    console.log('📦 Guardando configuración de pedidos...');
    
    const response = await fetch(`${API_URL}/configuracion/pedidos`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosPedidos)
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al guardar configuración de pedidos');
    }
    
    console.log('✅ Configuración de pedidos guardada');
}

// ═══════════════════════════════════════
// 💾 GUARDAR PALABRAS CLAVE
// ═══════════════════════════════════════

async function guardarPalabrasClave() {
    const textoProductos = document.getElementById('palabras_productos').value;
    const palabrasProductos = textoProductos
        .split('\n')
        .map(p => p.trim())
        .filter(p => p.length > 0);
    
    const datosPalabras = {
        palabras_productos: palabrasProductos
    };
    
    console.log('🔑 Guardando palabras clave...');
    
    const response = await fetch(`${API_URL}/configuracion/palabras-clave`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosPalabras)
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al guardar palabras clave');
    }
    
    console.log('✅ Palabras clave guardadas');
}

// ═══════════════════════════════════════
// 🔄 RECARGAR CONFIGURACIÓN
// ═══════════════════════════════════════

function recargarConfiguracion() {
    if (confirm('¿Estás seguro de recargar? Se perderán los cambios no guardados.')) {
        cargarConfiguracion();
        mostrarNotificacion('🔄 Configuración recargada', 'success');
    }
}

// ═══════════════════════════════════════
// 🛠️ UTILIDADES
// ═══════════════════════════════════════

function mostrarNotificacion(mensaje, tipo = 'success') {
    const notif = document.getElementById('notificacion');
    notif.textContent = mensaje;
    notif.className = `notificacion ${tipo} active`;
    
    setTimeout(() => {
        notif.classList.remove('active');
    }, 3000);
}