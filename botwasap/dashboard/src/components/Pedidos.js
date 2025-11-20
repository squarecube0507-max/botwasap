import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Pedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [filtro, setFiltro] = useState('todos');

  useEffect(() => {
    cargarPedidos();
    const interval = setInterval(cargarPedidos, 5000);
    return () => clearInterval(interval);
  }, []);

  const cargarPedidos = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/pedidos');
      setPedidos(res.data.reverse());
    } catch (error) {
      console.error('Error al cargar pedidos:', error);
    }
  };

  const pedidosFiltrados = pedidos.filter(p => {
    if (filtro === 'todos') return true;
    return p.tipo_entrega === filtro;
  });

  const contactarCliente = (telefono) => {
    const tel = telefono.replace('@c.us', '');
    window.open(`https://wa.me/${tel}`, '_blank');
  };

  return (
    <div className="pedidos">
      <div className="pedidos-header">
        <h2>📦 Pedidos ({pedidosFiltrados.length})</h2>
        <div className="filtros">
          <button 
            className={filtro === 'todos' ? 'activo' : ''}
            onClick={() => setFiltro('todos')}
          >
            Todos
          </button>
          <button 
            className={filtro === 'retiro' ? 'activo' : ''}
            onClick={() => setFiltro('retiro')}
          >
            Retiro
          </button>
          <button 
            className={filtro === 'delivery' ? 'activo' : ''}
            onClick={() => setFiltro('delivery')}
          >
            Delivery
          </button>
        </div>
      </div>

      <div className="pedidos-lista">
        {pedidosFiltrados.map(pedido => (
          <div key={pedido.id} className="pedido-card">
            <div className="pedido-header-card">
              <h3>{pedido.id}</h3>
              <span className={`badge ${pedido.tipo_entrega}`}>
                {pedido.tipo_entrega === 'delivery' ? '🚚 Delivery' : '🏪 Retiro'}
              </span>
            </div>

            <div className="pedido-info">
              <p><strong>👤 Cliente:</strong> {pedido.nombre}</p>
              <p><strong>📅 Fecha:</strong> {new Date(pedido.fecha).toLocaleString()}</p>
              <p><strong>💰 Total:</strong> ${pedido.total}</p>
            </div>

            <div className="pedido-productos">
              <strong>📦 Productos:</strong>
              <ul>
                {pedido.productos.map((prod, idx) => (
                  <li key={idx}>
                    {prod.nombre} x{prod.cantidad} - ${prod.subtotal}
                  </li>
                ))}
              </ul>
            </div>

            <div className="pedido-acciones">
              <button 
                className="btn-contactar"
                onClick={() => contactarCliente(pedido.cliente)}
              >
                💬 Contactar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Pedidos;