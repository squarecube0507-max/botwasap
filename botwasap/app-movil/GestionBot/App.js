// App.js
import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { 
  configurarNotificaciones,
  solicitarPermisos,
  escucharNotificaciones,
  escucharRespuestas
} from './src/utils/notifications';
import { iniciarMonitoreo, detenerMonitoreo } from './src/services/pedidosMonitor';

export default function App() {
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    inicializarApp();

    // Cleanup
    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
      detenerMonitoreo();
    };
  }, []);

  const inicializarApp = async () => {
    console.log('🚀 Inicializando aplicación...');

    // 1. Configurar notificaciones
    await configurarNotificaciones();

    // 2. Solicitar permisos
    const permisoConcedido = await solicitarPermisos();
    
    if (permisoConcedido) {
      console.log('✅ Permisos concedidos');

      // 3. Configurar listeners
      notificationListener.current = escucharNotificaciones(notification => {
        console.log('🔔 Notificación recibida:', notification.request.content.title);
      });

      responseListener.current = escucharRespuestas(response => {
        console.log('👆 Usuario tocó notificación');
        const data = response.notification.request.content.data;
        
        if (data.tipo === 'nuevo_pedido') {
          console.log('📦 Pedido:', data.pedidoId);
          // TODO: Navegar a detalle del pedido
        }
      });

      // 4. Iniciar monitoreo de pedidos (cada 30 segundos)
      iniciarMonitoreo(30);
      
      console.log('✅ Aplicación inicializada correctamente');
    } else {
      console.log('⚠️ Sin permisos de notificaciones');
    }
  };

  return (
    <>
      <AppNavigator />
      <StatusBar style="light" />
    </>
  );
}