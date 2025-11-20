// src/utils/notifications.js
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';

// Configurar comportamiento de notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Configurar canal de Android
export async function configurarNotificaciones() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('pedidos', {
      name: 'Nuevos Pedidos',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#667eea',
      sound: 'default',
    });
    
    await Notifications.setNotificationChannelAsync('general', {
      name: 'Notificaciones Generales',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250],
      lightColor: '#667eea',
    });
  }
}

// Solicitar permisos
export async function solicitarPermisos() {
  if (!Device.isDevice) {
    Alert.alert(
      'Aviso',
      'Las notificaciones solo funcionan en dispositivos físicos.'
    );
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    Alert.alert(
      'Permisos denegados',
      'Necesitas habilitar las notificaciones en la configuración de tu dispositivo.'
    );
    return false;
  }

  console.log('✅ Permisos de notificaciones concedidos');
  return true;
}

// Enviar notificación local inmediata
export async function enviarNotificacionLocal(titulo, mensaje, datos = {}) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: titulo,
        body: mensaje,
        data: datos,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        categoryIdentifier: datos.canal || 'general',
      },
      trigger: null, // Inmediato
    });
    
    console.log('✅ Notificación enviada:', titulo);
  } catch (error) {
    console.error('❌ Error al enviar notificación:', error);
  }
}

// Enviar notificación de nuevo pedido
export async function notificarNuevoPedido(pedido) {
  await enviarNotificacionLocal(
    '🎉 Nuevo Pedido',
    `${pedido.nombre} - $${pedido.total}`,
    {
      tipo: 'nuevo_pedido',
      pedidoId: pedido.id,
      canal: 'pedidos',
    }
  );
}

// Enviar notificación de prueba
export async function enviarNotificacionPrueba() {
  await enviarNotificacionLocal(
    '✅ Notificaciones Activas',
    'El sistema de notificaciones está funcionando correctamente',
    { tipo: 'prueba' }
  );
}

// Cancelar todas las notificaciones
export async function cancelarTodasLasNotificaciones() {
  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log('🗑️ Todas las notificaciones canceladas');
}

// Listener de notificaciones recibidas
export function escucharNotificaciones(callback) {
  return Notifications.addNotificationReceivedListener(callback);
}

// Listener de respuesta a notificaciones (cuando el usuario toca)
export function escucharRespuestas(callback) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}