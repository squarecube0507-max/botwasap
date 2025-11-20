import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    cargarClientes();
  }, []);

  const cargarClientes = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/clientes');
      setClientes(res.data.sort((a, b) => b.total_pedidos - a.total_pedidos));
    } catch (error) {
      console.error('Error al cargar clientes:', error);
    }
  };

  const clientesFiltrados = clientes.filter(c => 
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.telefono.includes(busqueda)
  );

  const contactarCliente = (telefono) => {
    const tel = telefono.replace('@c.us', '');
    window.open(`https://wa.me/${tel}`, '_blank');
  };

  return (
    <div className="clientes">
      <div className="clientes-header">
        <h2>👥 Clientes ({clientesFiltrados.length})</h2>
        <input
          type="text"
          placeholder="🔍 Buscar por nombre o teléfono..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="busqueda"
        />
      </div>

      <div className="clientes-grid">
        {clientesFiltrados.map(cliente => (
          <div key={cliente.telefono} className="cliente-card">
            <div className="cliente-avatar">
              {cliente.nombre.charAt(0).toUpperCase()}
            </div>
            
            <div className="cliente-info">
              <h3>{cliente.nombre}</h3>
              <p className="telefono">{cliente.telefono.replace('@c.us', '')}</p>
              
              <div className="cliente-stats">
                <div className="stat-item">
                  <span className="stat-label">📦 Pedidos:</span>
                  <span className="stat-value">{cliente.total_pedidos}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">💰 Total:</span>
                  <span className="stat-value">${cliente.total_gastado.toLocaleString()}</span>
                </div>
              </div>

              <p className="fecha-registro">
                📅 Cliente desde: {new Date(cliente.fecha_registro).toLocaleDateString()}
              </p>

              <button 
                className="btn-contactar"
                onClick={() => contactarCliente(cliente.telefono)}
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

export default Clientes;