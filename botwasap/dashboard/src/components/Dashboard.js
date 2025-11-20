import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from 'axios';

function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    cargarEstadisticas();
    const interval = setInterval(cargarEstadisticas, 5000);
    return () => clearInterval(interval);
  }, []);

  const cargarEstadisticas = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/estadisticas');
      setStats(res.data);
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    }
  };

  if (!stats) return <div className="cargando">Cargando estadísticas...</div>;

  return (
    <div className="dashboard">
      <h2>📊 Estadísticas Generales</h2>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icono">👥</div>
          <div className="stat-info">
            <div className="stat-numero">{stats.total_clientes}</div>
            <div className="stat-label">Clientes</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icono">📦</div>
          <div className="stat-info">
            <div className="stat-numero">{stats.total_pedidos}</div>
            <div className="stat-label">Pedidos</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icono">💰</div>
          <div className="stat-info">
            <div className="stat-numero">${stats.total_vendido.toLocaleString()}</div>
            <div className="stat-label">Ventas Totales</div>
          </div>
        </div>
      </div>

      <div className="grafico-container">
        <h3>📈 Ventas de los últimos 7 días</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={stats.pedidos_por_dia}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="fecha" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="ventas" stroke="#25D366" name="Ventas ($)" />
            <Line type="monotone" dataKey="pedidos" stroke="#8884d8" name="Pedidos" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {stats.ultimo_pedido && (
        <div className="ultimo-pedido">
          <h3>🔔 Último Pedido</h3>
          <p><strong>#{stats.ultimo_pedido.id}</strong> - {stats.ultimo_pedido.nombre}</p>
          <p>💰 ${stats.ultimo_pedido.total} | 📅 {new Date(stats.ultimo_pedido.fecha).toLocaleString()}</p>
        </div>
      )}
    </div>
  );
}

export default Dashboard;