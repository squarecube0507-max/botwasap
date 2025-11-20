// src/screens/ControlBotScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../utils/colors';
import { getEstadoBot, toggleRespuestas } from '../services/api';
import { enviarNotificacionPrueba } from '../utils/notifications';
import { verificarAhora, resetearUltimoPedido, estaActivo } from '../services/pedidosMonitor';

const ControlBotScreen = () => {
  const [estado, setEstado] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    cargarEstado();
    
    // Actualizar cada 5 segundos
    const interval = setInterval(cargarEstado, 5000);
    return () => clearInterval(interval);
  }, []);

  const cargarEstado = async () => {
    try {
      const datos = await getEstadoBot();
      setEstado(datos);
      setLoading(false);
    } catch (error) {
      console.error('❌ Error al cargar estado:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarEstado();
    setRefreshing(false);
  };

  const cambiarEstadoRespuestas = async () => {
    try {
      setToggling(true);
      await toggleRespuestas();
      await cargarEstado();
      
      Alert.alert(
        '✅ Éxito',
        `Respuestas automáticas ${estado.respuestas_automaticas ? 'desactivadas' : 'activadas'}`
      );
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      Alert.alert('Error', 'No se pudo cambiar el estado');
    } finally {
      setToggling(false);
    }
  };

  if (loading || !estado) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Cargando estado del bot...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[Colors.primary]}
        />
      }
    >
      {/* Estado del bot */}
      <LinearGradient
        colors={estado.activo ? Colors.gradientSuccess : Colors.gradientDanger}
        style={styles.estadoCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons
          name={estado.activo ? 'checkmark-circle' : 'close-circle'}
          size={64}
          color={Colors.white}
        />
        <Text style={styles.estadoTitle}>
          {estado.activo ? 'Bot Conectado' : 'Bot Desconectado'}
        </Text>
        <Text style={styles.estadoSubtitle}>
          {estado.activo ? 'Funcionando correctamente' : 'Verifica la conexión'}
        </Text>
      </LinearGradient>

      {/* Control de respuestas */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🤖 Respuestas Automáticas</Text>
        <View style={styles.card}>
          <View style={styles.switchContainer}>
            <View style={styles.switchInfo}>
              <Ionicons
                name={estado.respuestas_automaticas ? 'play-circle' : 'pause-circle'}
                size={32}
                color={estado.respuestas_automaticas ? Colors.success : Colors.warning}
              />
              <View style={styles.switchText}>
                <Text style={styles.switchTitle}>
                  {estado.respuestas_automaticas ? 'Activas' : 'Pausadas'}
                </Text>
                <Text style={styles.switchDescription}>
                  {estado.respuestas_automaticas
                    ? 'El bot responde automáticamente'
                    : 'El bot no responde a los clientes'}
                </Text>
              </View>
            </View>
            <Switch
              value={estado.respuestas_automaticas}
              onValueChange={cambiarEstadoRespuestas}
              disabled={toggling}
              trackColor={{ false: Colors.lightGray, true: Colors.success }}
              thumbColor={Colors.white}
            />
          </View>
        </View>
      </View>

      {/* Control de IA */}
      {estado.ia_activa !== undefined && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🧠 Inteligencia Artificial</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <View style={styles.infoLeft}>
                <Ionicons
                  name="bulb"
                  size={24}
                  color={estado.ia_activa ? Colors.success : Colors.gray}
                />
                <Text style={styles.infoLabel}>Groq IA</Text>
              </View>
              <View style={[
                styles.badge,
                { backgroundColor: estado.ia_activa ? Colors.success : Colors.gray }
              ]}>
                <Text style={styles.badgeText}>
                  {estado.ia_activa ? 'Activa' : 'Inactiva'}
                </Text>
              </View>
            </View>
            <Text style={styles.infoDescription}>
              {estado.ia_activa
                ? 'El bot usa IA para respuestas inteligentes'
                : 'Solo respuestas predefinidas'}
            </Text>
          </View>
        </View>
      )}

      {/* Notificaciones */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔔 Notificaciones</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <Ionicons
                name="notifications"
                size={24}
                color={estado.notificaciones ? Colors.success : Colors.gray}
              />
              <Text style={styles.infoLabel}>Estado</Text>
            </View>
            <View style={[
              styles.badge,
              { backgroundColor: estado.notificaciones ? Colors.success : Colors.gray }
            ]}>
              <Text style={styles.badgeText}>
                {estado.notificaciones ? 'Activas' : 'Inactivas'}
              </Text>
            </View>
          </View>
          <Text style={styles.infoDescription}>
            Configurable desde WhatsApp con comandos de dueño
          </Text>
        </View>
      </View>

      {/* Información */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ℹ️ Información</Text>
        <View style={styles.card}>
          <View style={styles.infoItem}>
            <Text style={styles.infoItemLabel}>Número del bot:</Text>
            <Text style={styles.infoItemValue}>{estado.numero || 'No disponible'}</Text>
          </View>
          <View style={styles.divider} />
          <Text style={styles.commandsTitle}>Comandos disponibles por WhatsApp:</Text>
          <Text style={styles.commandText}>• "pausar bot" - Pausar respuestas</Text>
          <Text style={styles.commandText}>• "reanudar bot" - Reactivar respuestas</Text>
          <Text style={styles.commandText}>• "activar ia" / "desactivar ia"</Text>
          <Text style={styles.commandText}>• "estado del bot" - Ver estado</Text>
        </View>
      </View>

      {/* Prueba de notificaciones */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔔 Pruebas</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.testButton}
            onPress={async () => {
              await enviarNotificacionPrueba();
              Alert.alert('✅ Enviado', 'Revisa la barra de notificaciones de tu celular');
            }}
          >
            <Ionicons name="notifications" size={20} color={Colors.primary} />
            <Text style={styles.testButtonText}>Enviar Notificación de Prueba</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.testButton, { marginTop: 12 }]}
            onPress={async () => {
              await verificarAhora();
              Alert.alert('✅ Verificado', 'Se verificaron nuevos pedidos');
            }}
          >
            <Ionicons name="refresh" size={20} color={Colors.success} />
            <Text style={styles.testButtonText}>Verificar Pedidos Ahora</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.testButton, { marginTop: 12 }]}
            onPress={() => {
              resetearUltimoPedido();
              Alert.alert(
                '🔄 Reseteado',
                'El próximo pedido será detectado como nuevo y recibirás una notificación'
              );
            }}
          >
            <Ionicons name="sync" size={20} color={Colors.warning} />
            <Text style={styles.testButtonText}>Resetear Último Pedido (Pruebas)</Text>
          </TouchableOpacity>

          <View style={styles.monitoreoInfo}>
            <Ionicons 
              name={estaActivo() ? 'checkmark-circle' : 'close-circle'} 
              size={16} 
              color={estaActivo() ? Colors.success : Colors.danger} 
            />
            <Text style={styles.monitoreoText}>
              Monitoreo: {estaActivo() ? 'Activo (cada 30s)' : 'Inactivo'}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.gray,
  },
  estadoCard: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  estadoTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.white,
    marginTop: 16,
  },
  estadoSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 12,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  switchText: {
    flex: 1,
  },
  switchTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark,
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 13,
    color: Colors.gray,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  infoDescription: {
    fontSize: 13,
    color: Colors.gray,
    marginTop: 4,
  },
  infoItem: {
    marginBottom: 12,
  },
  infoItemLabel: {
    fontSize: 13,
    color: Colors.gray,
    marginBottom: 4,
  },
  infoItemValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.dark,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.lightGray,
    marginVertical: 12,
  },
  commandsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark,
    marginBottom: 8,
  },
  commandText: {
    fontSize: 13,
    color: Colors.gray,
    marginBottom: 4,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    backgroundColor: Colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark,
  },
  monitoreoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
  },
  monitoreoText: {
    fontSize: 13,
    color: Colors.gray,
  },
});

export default ControlBotScreen;