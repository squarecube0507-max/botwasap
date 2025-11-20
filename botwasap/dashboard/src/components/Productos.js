import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Productos.css';

function Productos() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [categoriaActual, setCategoriaActual] = useState('todas');
  const [busqueda, setBusqueda] = useState('');
  const [filtroStock, setFiltroStock] = useState('todos');

  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/productos');
      console.log('Productos cargados:', res.data);
      
      // Verificar si es un array
      if (Array.isArray(res.data)) {
        setProductos(res.data);
        
        // Extraer categorías únicas
        const categoriasUnicas = [...new Set(res.data.map(p => p.categoria))];
        setCategorias(categoriasUnicas);
        
        if (categoriasUnicas.length > 0 && categoriaActual === 'todas') {
          setCategoriaActual('todas');
        }
      } else {
        console.error('La API no devolvió un array:', res.data);
        alert('Error: La API devolvió un formato incorrecto. Verifica que index.js tenga la ruta /api/productos correcta.');
      }
    } catch (error) {
      console.error('Error al cargar productos:', error);
      alert('Error al conectar con el servidor. Asegúrate de que el bot esté corriendo en el puerto 3000.');
    }
  };

  const productosFiltrados = productos.filter(producto => {
    // Filtro por categoría
    if (categoriaActual !== 'todas' && producto.categoria !== categoriaActual) {
      return false;
    }

    // Filtro por búsqueda
    if (busqueda) {
      const nombreProducto = producto.nombre.toLowerCase().replace(/_/g, ' ');
      const categoriaProducto = producto.categoria.toLowerCase();
      const subcategoriaProducto = producto.subcategoria.toLowerCase();
      const busquedaLower = busqueda.toLowerCase();

      if (
        !nombreProducto.includes(busquedaLower) &&
        !categoriaProducto.includes(busquedaLower) &&
        !subcategoriaProducto.includes(busquedaLower)
      ) {
        return false;
      }
    }

    // Filtro por stock
    if (filtroStock === 'con-stock' && !producto.stock) {
      return false;
    }
    if (filtroStock === 'sin-stock' && producto.stock) {
      return false;
    }

    return true;
  });

  // Agrupar por categoría
  const productosAgrupados = {};
  productosFiltrados.forEach(producto => {
    if (!productosAgrupados[producto.categoria]) {
      productosAgrupados[producto.categoria] = [];
    }
    productosAgrupados[producto.categoria].push(producto);
  });

  const formatearNombre = (nombre) => {
    return nombre.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatearPrecio = (producto) => {
    if (producto.precio) {
      return `$${producto.precio}${producto.unidad ? ' ' + producto.unidad : ''}`;
    } else if (producto.precio_desde) {
      return `Desde $${producto.precio_desde}`;
    }
    return 'Consultar';
  };

  return (
    <div className="productos">
      <div className="productos-header">
        <h2>🏷️ Productos</h2>
        <button 
          className="btn-primary"
          onClick={() => window.open('http://localhost:3000/productos.html', '_blank')}
        >
          ✏️ Gestionar Productos
        </button>
      </div>

      {/* FILTROS */}
      <div className="productos-filtros">
        <input
          type="text"
          placeholder="🔍 Buscar productos..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="filtro-busqueda"
        />

        <select
          value={categoriaActual}
          onChange={(e) => setCategoriaActual(e.target.value)}
          className="filtro-select"
        >
          <option value="todas">📁 Todas las categorías</option>
          {categorias.map(cat => (
            <option key={cat} value={cat}>
              {formatearNombre(cat)}
            </option>
          ))}
        </select>

        <select
          value={filtroStock}
          onChange={(e) => setFiltroStock(e.target.value)}
          className="filtro-select"
        >
          <option value="todos">📦 Todo el stock</option>
          <option value="con-stock">✅ Con stock</option>
          <option value="sin-stock">❌ Sin stock</option>
        </select>
      </div>

      {/* ESTADÍSTICAS */}
      <div className="productos-stats">
        <div className="stat-card">
          <span className="stat-icon">📦</span>
          <div>
            <div className="stat-label">Total Productos</div>
            <div className="stat-value">{productos.length}</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">📁</span>
          <div>
            <div className="stat-label">Categorías</div>
            <div className="stat-value">{categorias.length}</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">✅</span>
          <div>
            <div className="stat-label">Con Stock</div>
            <div className="stat-value">{productos.filter(p => p.stock).length}</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">❌</span>
          <div>
            <div className="stat-label">Sin Stock</div>
            <div className="stat-value">{productos.filter(p => !p.stock).length}</div>
          </div>
        </div>
      </div>

      {/* LISTA DE PRODUCTOS */}
      {productosFiltrados.length === 0 ? (
        <div className="productos-vacio">
          <div className="vacio-icon">📦</div>
          <p>No se encontraron productos</p>
          {productos.length === 0 && (
            <button 
              className="btn-primary"
              onClick={() => window.open('http://localhost:3000/productos.html', '_blank')}
            >
              ➕ Agregar Primer Producto
            </button>
          )}
        </div>
      ) : (
        <div className="productos-grid">
          {Object.entries(productosAgrupados).map(([categoria, prods]) => (
            <div key={categoria} className="categoria-grupo">
              <h3 className="categoria-titulo">
                📁 {formatearNombre(categoria)} ({prods.length})
              </h3>
              <div className="productos-lista">
                {prods.map(producto => (
                  <div key={producto.id} className="producto-card">
                    <div className="producto-header">
                      <span className="producto-stock">
                        {producto.stock ? '✅' : '❌'}
                      </span>
                    </div>
                    <div className="producto-nombre">
                      {formatearNombre(producto.nombre)}
                    </div>
                    <div className="producto-precio">
                      {formatearPrecio(producto)}
                    </div>
                    <div className="producto-detalles">
                      <span>📦 {producto.stock ? 'Disponible' : 'Sin stock'}</span>
                      <span>📂 {formatearNombre(producto.subcategoria)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Productos;