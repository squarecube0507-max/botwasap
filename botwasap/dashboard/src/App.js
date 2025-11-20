import React, { useState, useEffect } from 'react';
import './App.css';
import Dashboard from './components/Dashboard';
import Pedidos from './components/Pedidos';
import Clientes from './components/Clientes';
import Productos from './components/Productos';

function App() {
  const [vistaActual, setVistaActual] = useState('dashboard');
  const [estadoBot, setEstadoBot] = useState(null);

  useEffect(() => {
    // Verificar estado del bot
    cargarEstadoBot();
    const interval = setInterval(cargarEstadoBot, 5000);
    return () => clearInterval(interval);
  }, []);

  const cargarEstadoBot = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/estado');
      const data = await res.json();
      setEstadoBot(data);
    } catch (err) {
      console.error('Error al conectar con el bot:', err);
    }
  };

  const toggleRespuestas = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/toggle-respuestas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (res.ok) {
        // Recargar estado inmediatamente
        cargarEstadoBot();
      }
    } catch (error) {
      console.error('Error al cambiar estado:', error);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-content">
          <h1>🤖 Bot WhatsApp - Panel de Control</h1>
          <div className="estado-bot">
            {estadoBot?.activo ? (
              <>
                <span className="estado-activo">🟢 Conectado</span>
                {estadoBot?.respuestas_automaticas ? (
                  <span className="badge-activo">▶️ Respondiendo</span>
                ) : (
                  <span className="badge-pausado">⏸️ Pausado</span>
                )}
                <button 
                  className="btn-toggle"
                  onClick={toggleRespuestas}
                >
                  {estadoBot?.respuestas_automaticas ? '⏸️ Pausar' : '▶️ Reanudar'}
                </button>
              </>
            ) : (
              <span className="estado-inactivo">🔴 Desconectado</span>
            )}
          </div>
        </div>
      </header>

      <nav className="navegacion">
        <button 
          className={vistaActual === 'dashboard' ? 'activo' : ''} 
          onClick={() => setVistaActual('dashboard')}
        >
          📊 Dashboard
        </button>
        <button 
          className={vistaActual === 'pedidos' ? 'activo' : ''} 
          onClick={() => setVistaActual('pedidos')}
        >
          📦 Pedidos
        </button>
        <button 
          className={vistaActual === 'clientes' ? 'activo' : ''} 
          onClick={() => setVistaActual('clientes')}
        >
          👥 Clientes
        </button>
        <button 
          className={vistaActual === 'productos' ? 'activo' : ''} 
          onClick={() => setVistaActual('productos')}
        >
          🏷️ Productos
        </button>
        <button 
          className="btn-editor"
          onClick={() => window.open('http://localhost:3000/respuestas.html', '_blank')}
          title="Editor de Respuestas del Bot"
        >
          💬 Respuestas
        </button>
        {/* 👇 NUEVO BOTÓN DE CONFIGURACIÓN 👇 */}
        <button 
          className="btn-config"
          onClick={() => window.open('http://localhost:3000/configuracion.html', '_blank')}
          title="Configuración del Negocio"
        >
          ⚙️ Configuración
        </button>
      </nav>

      <main className="contenido">
        {vistaActual === 'dashboard' && <Dashboard />}
        {vistaActual === 'pedidos' && <Pedidos />}
        {vistaActual === 'clientes' && <Clientes />}
        {vistaActual === 'productos' && <Productos />}
      </main>
    </div>
  );
}

export default App;