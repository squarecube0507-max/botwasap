// ═══════════════════════════════════════
// 📦 EDITOR DE PRODUCTOS - JAVASCRIPT
// ═══════════════════════════════════════

const API_URL = '/api';

let productosData = [];
let categoriasData = [];
let productoEditando = null;

// ═══════════════════════════════════════
// 🚀 INICIALIZACIÓN
// ═══════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    cargarProductos();
    llenarSelectCategorias();
});

// ═══════════════════════════════════════
// 📥 CARGAR DATOS
// ═══════════════════════════════════════

async function cargarProductos() {
    try {
        const response = await fetch(`${API_URL}/productos`);
        productosData = await response.json();
        
        console.log('📦 Productos cargados:', productosData.length);
        
        actualizarEstadisticas();
        await renderizarProductos();
        llenarFiltroCategorias();
    } catch (error) {
        console.error('❌ Error al cargar productos:', error);
        document.getElementById('listaProductos').innerHTML = `
            <div class="loading">
                <p style="color: #f56565;">❌ Error al cargar productos</p>
                <button onclick="cargarProductos()" class="btn-primary" style="margin-top: 15px;">
                    🔄 Reintentar
                </button>
            </div>
        `;
    }
}

async function llenarSelectCategorias() {
    try {
        const response = await fetch(`${API_URL}/categorias`);
        const categorias = await response.json();
        
        console.log('📁 Categorías cargadas:', categorias);
        
        const selectCategoria = document.getElementById('categoria');
        const selectCategoriaFiltro = document.getElementById('filtroCategoria');
        
        selectCategoria.innerHTML = '<option value="">Seleccionar categoría...</option>';
        selectCategoriaFiltro.innerHTML = '<option value="">📁 Todas las categorías</option>';
        
        categorias.forEach(cat => {
            const nombreFormateado = cat.nombre.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            
            const option1 = document.createElement('option');
            option1.value = cat.nombre;
            option1.textContent = nombreFormateado;
            selectCategoria.appendChild(option1);
            
            const option2 = document.createElement('option');
            option2.value = cat.nombre;
            option2.textContent = `${nombreFormateado} (${cat.total_productos})`;
            selectCategoriaFiltro.appendChild(option2);
        });
        
        console.log(`✅ ${categorias.length} categorías cargadas en los selects`);
        
    } catch (error) {
        console.error('❌ Error al cargar categorías:', error);
    }
}

// ═══════════════════════════════════════
// 📊 ESTADÍSTICAS
// ═══════════════════════════════════════

function actualizarEstadisticas() {
    const totalProductos = productosData.length;
    const conStock = productosData.filter(p => p.stock).length;
    const sinStock = productosData.filter(p => !p.stock).length;
    
    const categoriasUnicas = new Set(productosData.map(p => p.categoria));
    const totalCategorias = categoriasUnicas.size;
    
    document.getElementById('totalProductos').textContent = totalProductos;
    document.getElementById('totalCategorias').textContent = totalCategorias;
    document.getElementById('totalConStock').textContent = conStock;
    document.getElementById('totalSinStock').textContent = sinStock;
}

// ═══════════════════════════════════════
// 🎨 RENDERIZAR PRODUCTOS
// ═══════════════════════════════════════

async function renderizarProductos() {
    const container = document.getElementById('listaProductos');
    
    if (productosData.length === 0) {
        container.innerHTML = `
            <div class="loading">
                <p>📦 No hay productos registrados</p>
                <button onclick="mostrarModalNuevoProducto()" class="btn-primary" style="margin-top: 15px;">
                    ➕ Agregar Primer Producto
                </button>
            </div>
        `;
        return;
    }
    
    let html = '<div class="productos-lista">';
    
    const categorias = {};
    
    productosData.forEach(producto => {
        if (!categorias[producto.categoria]) {
            categorias[producto.categoria] = [];
        }
        categorias[producto.categoria].push(producto);
    });
    
    try {
        const response = await fetch(`${API_URL}/categorias`);
        const categoriasAPI = await response.json();
        
        categoriasAPI.forEach(cat => {
            if (!categorias[cat.nombre]) {
                categorias[cat.nombre] = [];
            }
        });
    } catch (error) {
        console.error('Error al cargar categorías vacías:', error);
    }
    
    Object.keys(categorias).sort().forEach(categoria => {
        const productos = categorias[categoria];
        const nombreCategoria = categoria.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        html += `
            <div class="categoria-seccion">
                <div class="categoria-header">
                    <h3>
                        <button class="categoria-toggle" onclick="toggleCategoria('${categoria}')">
                            <span class="toggle-icon">▼</span>
                            📁 ${nombreCategoria}
                        </button>
                        <span class="categoria-count">(${productos.length} productos)</span>
                    </h3>
                    <div class="categoria-acciones">
                        <button class="btn-editar-cat" onclick="mostrarModalEditarCategoria('${categoria}')" title="Editar nombre de categoría">
                            ✏️
                        </button>
                        <button class="btn-agregar-cat" onclick="abrirModalProductoEnCategoria('${categoria}')">
                            ➕ Agregar
                        </button>
                        <button class="btn-eliminar-cat" onclick="confirmarEliminarCategoria('${categoria}')">
                            🗑️
                        </button>
                    </div>
                </div>
                <div class="categoria-contenido" id="cat-${categoria}">
        `;
        
        if (productos.length === 0) {
            html += `
                <div class="categoria-vacia">
                    <div class="vacio-icon">📦</div>
                    <p>Esta categoría no tiene productos</p>
                    <button class="btn-primary" onclick="abrirModalProductoEnCategoria('${categoria}')">
                        ➕ Agregar Primer Producto
                    </button>
                </div>
            `;
        } else {
            html += '<div class="productos-grid">';
            
            productos.forEach(producto => {
                const nombreProducto = producto.nombre.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                const stockIcon = producto.stock ? '✅' : '❌';
                const stockText = producto.stock ? 'Disponible' : 'Sin stock';
                const stockClass = producto.stock ? 'disponible' : 'sin-stock';
                
                let precioText = '';
                if (producto.precio) {
                    precioText = `$${producto.precio}`;
                    if (producto.unidad) {
                        precioText += ` ${producto.unidad}`;
                    }
                } else if (producto.precio_desde) {
                    precioText = `Desde $${producto.precio_desde}`;
                }
                
                // ✅ USAR DATA ATTRIBUTES EN VEZ DE ONCLICK CON PARÁMETROS
                const productoJSON = JSON.stringify(producto).replace(/"/g, '&quot;');
                
                html += `
                    <div class="producto-card ${stockClass}">
                        <div class="producto-stock">${stockIcon}</div>
                        <div class="producto-nombre">${nombreProducto}</div>
                        <div class="producto-precio">${precioText}</div>
                        <div class="producto-info">
                            <span class="producto-categoria">📂 ${producto.subcategoria.replace(/_/g, ' ')}</span>
                            <span class="producto-disponibilidad">${stockText}</span>
                        </div>
                        <div class="producto-acciones">
                            <button class="btn-editar" data-producto="${productoJSON}" onclick="editarProductoConData(this)">
                                ✏️ Editar
                            </button>
                            <button class="btn-eliminar" data-id="${producto.id}" data-nombre="${nombreProducto}" onclick="confirmarEliminarProductoConData(this)">
                                🗑️
                            </button>
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
        }
        
        html += `
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// ═══════════════════════════════════════
// 🔄 FILTROS
// ═══════════════════════════════════════

function filtrarProductos() {
    const busqueda = document.getElementById('buscarProducto').value.toLowerCase();
    const categoriaFiltro = document.getElementById('filtroCategoria').value;
    const stockFiltro = document.getElementById('filtroStock').value;
    
    console.log('🔍 Filtrando:', { busqueda, categoriaFiltro, stockFiltro });
    
    let productosFiltrados = [...productosData];
    
    if (busqueda) {
        productosFiltrados = productosFiltrados.filter(producto => {
            const nombreProducto = producto.nombre.toLowerCase().replace(/_/g, ' ');
            const categoriaProducto = producto.categoria.toLowerCase();
            const subcategoriaProducto = producto.subcategoria.toLowerCase();
            
            return nombreProducto.includes(busqueda) ||
                   categoriaProducto.includes(busqueda) ||
                   subcategoriaProducto.includes(busqueda);
        });
    }
    
    if (categoriaFiltro) {
        productosFiltrados = productosFiltrados.filter(producto => 
            producto.categoria === categoriaFiltro
        );
    }
    
    if (stockFiltro === 'con-stock') {
        productosFiltrados = productosFiltrados.filter(producto => producto.stock === true);
    } else if (stockFiltro === 'sin-stock') {
        productosFiltrados = productosFiltrados.filter(producto => producto.stock === false);
    }
    
    console.log(`✅ ${productosFiltrados.length} productos después del filtro`);
    
    const datosOriginales = productosData;
    productosData = productosFiltrados;
    
    renderizarProductos().then(() => {
        productosData = datosOriginales;
    });
}

function llenarFiltroCategorias() {
    const select = document.getElementById('filtroCategoria');
    const categoriasUnicas = [...new Set(productosData.map(p => p.categoria))];
    
    select.innerHTML = '<option value="">📁 Todas las categorías</option>';
    
    categoriasUnicas.forEach(cat => {
        const catFormateada = cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        select.innerHTML += `<option value="${cat}">${catFormateada}</option>`;
    });
}

function toggleCategoria(categoria) {
    const contenido = document.getElementById(`cat-${categoria}`);
    const toggle = event.currentTarget.querySelector('.toggle-icon');
    
    if (contenido.style.display === 'none') {
        contenido.style.display = 'block';
        toggle.textContent = '▼';
    } else {
        contenido.style.display = 'none';
        toggle.textContent = '▶';
    }
}

// ═══════════════════════════════════════
// ➕ NUEVO PRODUCTO
// ═══════════════════════════════════════

function mostrarModalNuevoProducto(categoriaPreseleccionada = '') {
    productoEditando = null;
    
    document.getElementById('tituloModal').textContent = '➕ Nuevo Producto';
    document.getElementById('formProducto').reset();
    document.getElementById('productoId').value = '';
    document.getElementById('stockProducto').value = 'true';
    
    document.getElementById('precio').value = '';
    document.getElementById('precioDesde').value = '';
    document.getElementById('unidad').value = '';
    
    if (categoriaPreseleccionada) {
        document.getElementById('categoria').value = categoriaPreseleccionada;
    }
    
    document.getElementById('tipoPrecio').value = 'fijo';
    cambiarTipoPrecio();
    
    abrirModal('modalProducto');
    
    console.log('➕ Modal abierto para nuevo producto');
}

// ═══════════════════════════════════════
// ✏️ EDITAR PRODUCTO
// ═══════════════════════════════════════

function editarProducto(producto) {
    productoEditando = producto;
    
    console.log('📝 Editando producto:', producto);
    
    document.getElementById('tituloModal').textContent = '✏️ Editar Producto';
    document.getElementById('productoId').value = producto.id;
    document.getElementById('categoria').value = producto.categoria;
    document.getElementById('subcategoria').value = producto.subcategoria;
    
    const nombreLimpio = producto.nombre.replace(/_/g, ' ');
    document.getElementById('nombreProducto').value = nombreLimpio;
    
    document.getElementById('unidad').value = producto.unidad || '';
    document.getElementById('stockProducto').value = producto.stock.toString();
    
    if (producto.precio) {
        document.getElementById('tipoPrecio').value = 'fijo';
        document.getElementById('precio').value = producto.precio;
        document.getElementById('precioDesde').value = '';
    } else if (producto.precio_desde) {
        document.getElementById('tipoPrecio').value = 'desde';
        document.getElementById('precioDesde').value = producto.precio_desde;
        document.getElementById('precio').value = '';
    }
    
    cambiarTipoPrecio();
    abrirModal('modalProducto');
}

// ═══════════════════════════════════════
// 🔧 FUNCIONES CON DATA ATTRIBUTES (MÁS SEGURAS)
// ═══════════════════════════════════════

function editarProductoConData(button) {
    const productoJSON = button.getAttribute('data-producto');
    const producto = JSON.parse(productoJSON);
    editarProducto(producto);
}

function confirmarEliminarProductoConData(button) {
    const id = button.getAttribute('data-id');
    const nombre = button.getAttribute('data-nombre');
    
    console.log('🗑️ Eliminando producto:');
    console.log('   ID:', id);
    console.log('   Nombre:', nombre);
    
    confirmarEliminarProducto(id, nombre);
}

// ═══════════════════════════════════════
// 💾 GUARDAR PRODUCTO
// ═══════════════════════════════════════

async function guardarProducto(event) {
    event.preventDefault();
    
    const productoId = document.getElementById('productoId').value;
    const categoria = document.getElementById('categoria').value;
    const subcategoria = document.getElementById('subcategoria').value;
    const nombre = document.getElementById('nombreProducto').value;
    const tipoPrecio = document.getElementById('tipoPrecio').value;
    const precio = tipoPrecio === 'fijo' ? document.getElementById('precio').value : null;
    const precioDesde = tipoPrecio === 'desde' ? document.getElementById('precioDesde').value : null;
    const unidad = document.getElementById('unidad').value;
    const stock = document.getElementById('stockProducto').value === 'true';
    
    if (!categoria || categoria === '') {
        mostrarNotificacion('❌ Debes seleccionar una categoría', 'error');
        return;
    }
    
    if (!subcategoria || subcategoria.trim() === '') {
        mostrarNotificacion('❌ Debes escribir una subcategoría', 'error');
        document.getElementById('subcategoria').focus();
        return;
    }
    
    if (!nombre || nombre.trim() === '') {
        mostrarNotificacion('❌ Debes escribir un nombre de producto', 'error');
        document.getElementById('nombreProducto').focus();
        return;
    }
    
    if (!precio && !precioDesde) {
        mostrarNotificacion('❌ Debes ingresar un precio', 'error');
        return;
    }
    
    const datos = {
        categoria,
        subcategoria: subcategoria.trim(),
        nombre: nombre.trim(),
        stock,
        unidad: unidad || undefined
    };
    
    if (precio) {
        datos.precio = parseFloat(precio);
    }
    
    if (precioDesde) {
        datos.precio_desde = parseFloat(precioDesde);
    }
    
    console.log('💾 Guardando producto:', datos);
    
    try {
        let response;
        
        if (productoId) {
            console.log(`📝 Actualizando producto: ${productoId}`);
            
            datos.nuevo_nombre = nombre.trim();
            
            response = await fetch(`${API_URL}/productos/${productoId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos)
            });
        } else {
            console.log('➕ Creando nuevo producto');
            response = await fetch(`${API_URL}/productos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos)
            });
        }
        
        const result = await response.json();
        console.log('Respuesta del servidor:', result);
        
        if (response.ok) {
            mostrarNotificacion(
                productoId ? '✅ Producto actualizado' : '✅ Producto creado',
                'success'
            );
            cerrarModal('modalProducto');
            await cargarProductos();
        } else {
            mostrarNotificacion('❌ ' + result.error, 'error');
            console.error('Error del servidor:', result);
        }
    } catch (error) {
        console.error('❌ Error al guardar producto:', error);
        mostrarNotificacion('❌ Error al guardar producto', 'error');
    }
}

// ═══════════════════════════════════════
// 🗑️ ELIMINAR PRODUCTO
// ═══════════════════════════════════════

function confirmarEliminarProducto(id, nombre) {
    document.getElementById('mensajeEliminar').textContent = 
        `¿Estás seguro de eliminar el producto "${nombre}"? Esta acción no se puede deshacer.`;
    
    document.getElementById('btnConfirmarEliminar').onclick = () => eliminarProducto(id);
    
    abrirModal('modalEliminar');
}

async function eliminarProducto(id) {
    console.log('🗑️ Eliminando producto con ID:', id);
    
    try {
        const response = await fetch(`${API_URL}/productos/${id}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            mostrarNotificacion('✅ Producto eliminado', 'success');
            cerrarModal('modalEliminar');
            await cargarProductos();
        } else {
            mostrarNotificacion('❌ ' + result.error, 'error');
            console.error('Error del servidor:', result);
        }
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        mostrarNotificacion('❌ Error al eliminar producto', 'error');
    }
}

// ═══════════════════════════════════════
// 📁 GESTIÓN DE CATEGORÍAS
// ═══════════════════════════════════════

function mostrarModalNuevaCategoria() {
    document.getElementById('nombreCategoria').value = '';
    document.getElementById('nombreSubcategoria').value = '';
    abrirModal('modalCategoria');
}

async function guardarCategoria(event) {
    event.preventDefault();
    
    const nombreCategoria = document.getElementById('nombreCategoria').value.trim();
    const nombreSubcategoria = document.getElementById('nombreSubcategoria').value.trim();
    
    if (!nombreCategoria || !nombreSubcategoria) {
        mostrarNotificacion('❌ Completa todos los campos', 'error');
        return;
    }
    
    console.log('📁 Creando categoría:', { nombreCategoria, nombreSubcategoria });
    
    try {
        const response = await fetch(`${API_URL}/categorias`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nombre: nombreCategoria,
                subcategoria: nombreSubcategoria
            })
        });
        
        const result = await response.json();
        console.log('Respuesta del servidor:', result);
        
        if (response.ok) {
            mostrarNotificacion('✅ Categoría creada exitosamente', 'success');
            cerrarModal('modalCategoria');
            
            await llenarSelectCategorias();
            await cargarProductos();
            
            console.log('✅ Categoría creada y listas actualizadas');
        } else {
            mostrarNotificacion('❌ ' + result.error, 'error');
            console.error('Error del servidor:', result);
        }
    } catch (error) {
        console.error('❌ Error al crear categoría:', error);
        mostrarNotificacion('❌ Error al crear categoría', 'error');
    }
}

function confirmarEliminarCategoria(categoria) {
    const productos = productosData.filter(p => p.categoria === categoria);
    const categoriaFormateada = categoria.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    document.getElementById('mensajeEliminar').textContent = 
        `¿Estás seguro de eliminar la categoría "${categoriaFormateada}" con ${productos.length} productos? Esta acción no se puede deshacer.`;
    
    document.getElementById('btnConfirmarEliminar').onclick = () => eliminarCategoriaCompleta(categoria);
    
    abrirModal('modalEliminar');
}

async function eliminarCategoriaCompleta(categoria) {
    try {
        const response = await fetch(`${API_URL}/categorias/${categoria}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            mostrarNotificacion('✅ Categoría eliminada', 'success');
            cerrarModal('modalEliminar');
            await cargarProductos();
            await llenarSelectCategorias();
        } else {
            mostrarNotificacion('❌ ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error al eliminar categoría:', error);
        mostrarNotificacion('❌ Error al eliminar categoría', 'error');
    }
}

// ═══════════════════════════════════════
// 🆕 FUNCIONES PARA CATEGORÍAS VACÍAS
// ═══════════════════════════════════════

function abrirModalProductoEnCategoria(categoria) {
    productoEditando = null;
    document.getElementById('tituloModal').textContent = '➕ Nuevo Producto';
    document.getElementById('formProducto').reset();
    document.getElementById('productoId').value = '';
    document.getElementById('stockProducto').value = 'true';
    
    document.getElementById('categoria').value = categoria;
    
    document.getElementById('tipoPrecio').value = 'fijo';
    cambiarTipoPrecio();
    
    abrirModal('modalProducto');
    
    console.log(`📂 Modal abierto para agregar producto en: ${categoria}`);
}

// ═══════════════════════════════════════
// ✏️ EDITAR NOMBRE DE CATEGORÍA
// ═══════════════════════════════════════

function mostrarModalEditarCategoria(categoriaActual) {
    const categoriaFormateada = categoriaActual.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    document.getElementById('categoriaActualNombre').textContent = categoriaFormateada;
    document.getElementById('categoriaActualId').value = categoriaActual;
    document.getElementById('nuevoNombreCategoria').value = categoriaFormateada;
    
    abrirModal('modalEditarCategoria');
    
    console.log(`✏️ Abriendo modal para editar categoría: ${categoriaActual}`);
}

async function guardarNombreCategoria(event) {
    event.preventDefault();
    
    const categoriaActual = document.getElementById('categoriaActualId').value;
    const nuevoNombre = document.getElementById('nuevoNombreCategoria').value.trim();
    
    if (!nuevoNombre) {
        mostrarNotificacion('❌ El nombre no puede estar vacío', 'error');
        return;
    }
    
    console.log(`✏️ Renombrando categoría: ${categoriaActual} → ${nuevoNombre}`);
    
    try {
        const response = await fetch(`${API_URL}/categorias/${categoriaActual}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nuevoNombre })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            if (result.mensaje && result.mensaje.includes('No se realizaron cambios')) {
                mostrarNotificacion('ℹ️ No se realizaron cambios (el nombre es el mismo)', 'success');
            } else {
                mostrarNotificacion('✅ Categoría renombrada exitosamente', 'success');
            }
            cerrarModal('modalEditarCategoria');
            await cargarProductos();
            await llenarSelectCategorias();
        } else {
            mostrarNotificacion('❌ ' + result.error, 'error');
            console.error('Error del servidor:', result);
        }
    } catch (error) {
        console.error('❌ Error al renombrar categoría:', error);
        mostrarNotificacion('❌ Error al renombrar categoría', 'error');
    }
}

// ═══════════════════════════════════════
// 🎨 UTILIDADES UI
// ═══════════════════════════════════════

function cambiarTipoPrecio() {
    const tipo = document.getElementById('tipoPrecio').value;
    const grupoFijo = document.getElementById('grupoPrecioFijo');
    const grupoDesde = document.getElementById('grupoPrecioDesde');
    const inputFijo = document.getElementById('precio');
    const inputDesde = document.getElementById('precioDesde');
    
    if (tipo === 'fijo') {
        grupoFijo.style.display = 'block';
        grupoDesde.style.display = 'none';
        inputFijo.required = true;
        inputFijo.disabled = false;
        inputDesde.required = false;
        inputDesde.disabled = true;
        inputDesde.value = '';
    } else {
        grupoFijo.style.display = 'none';
        grupoDesde.style.display = 'block';
        inputFijo.required = false;
        inputFijo.disabled = true;
        inputFijo.value = '';
        inputDesde.required = true;
        inputDesde.disabled = false;
    }
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

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
    }
};