// src/screens/DashboardScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import StatsCard from '../components/StatsCard';
import Colors from '../utils/colors';
import { getEstadisticas } from '../services/api';

const DashboardScreen = () => {
  const [estadisticas, setEstadisticas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const datos = await getEstadisticas();
      setEstadisticas(datos);
      console.log('📊 Estadísticas cargadas:', datos);
    } catch (error) {
      console.error('❌ Error al cargar dashboard:', error);
      Alert.alert(
        'Error',
        'No se pudo conectar con el servidor. Verifica que el bot esté corriendo.'
      );
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarDatos();
    setRefreshing(false);
  };

  if (loading && !estadisticas) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Cargando estadísticas...</Text>
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📊 Dashboard</Text>
        <Text style={styles.headerSubtitle}>
          {new Date().toLocaleDateString('es-AR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
      </View>

      {estadisticas && (
        <>
          <View style={styles.statsGrid}>
            <StatsCard
              title="Total Clientes"
              value={estadisticas.total_clientes || 0}
              icon="👥"
              gradient={Colors.gradientPrimary}
            />

            <StatsCard
              title="Total Pedidos"
              value={estadisticas.total_pedidos || 0}
              icon="📦"
              gradient={Colors.gradientSuccess}
            />

            <StatsCard
              title="Total Vendido"
              value={`$${estadisticas.total_vendido || 0}`}
              icon="💰"
              gradient={Colors.gradientWarning}
            />
          </View>

          {estadisticas.ultimo_pedido && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📄 Último Pedido</Text>
              <View style={styles.pedidoCard}>
                <View style={styles.pedidoHeader}>
                  <Text style={styles.pedidoId}>{estadisticas.ultimo_pedido.id}</Text>
                  <Text style={styles.pedidoEstado}>
                    {estadisticas.ultimo_pedido.estado}
                  </Text>
                </View>
                <Text style={styles.pedidoCliente}>
                  👤 {estadisticas.ultimo_pedido.nombre}
                </Text>
                <Text style={styles.pedidoTotal}>
                  💰 ${estadisticas.ultimo_pedido.total}
                </Text>
                <Text style={styles.pedidoFecha}>
                  📅 {new Date(estadisticas.ultimo_pedido.fecha).toLocaleString('es-AR')}
                </Text>
              </View>
            </View>
          )}

          {estadisticas.pedidos_por_dia && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📈 Últimos 7 días</Text>
              {estadisticas.pedidos_por_dia.map((dia, index) => (
                <View key={index} style={styles.diaCard}>
                  <Text style={styles.diaFecha}>
                    {new Date(dia.fecha).toLocaleDateString('es-AR', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </Text>
                  <View style={styles.diaStats}>
                    <Text style={styles.diaPedidos}>📦 {dia.pedidos} pedidos</Text>
                    <Text style={styles.diaVentas}>💰 ${dia.ventas}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </>
      )}
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
    marginTop: 16,
    fontSize: 16,
    color: Colors.gray,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.gray,
    textTransform: 'capitalize',
  },
  statsGrid: {
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 12,
  },
  pedidoCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pedidoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pedidoId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  pedidoEstado: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.success,
    backgroundColor: Colors.lightGray,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    textTransform: 'uppercase',
  },
  pedidoCliente: {
    fontSize: 16,
    color: Colors.dark,
    marginBottom: 4,
  },
  pedidoTotal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.warning,
    marginBottom: 4,
  },
  pedidoFecha: {
    fontSize: 12,
    color: Colors.gray,
  },
  diaCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  diaFecha: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark,
    textTransform: 'capitalize',
    flex: 1,
  },
  diaStats: {
    flexDirection: 'row',
    gap: 16,
  },
  diaPedidos: {
    fontSize: 14,
    color: Colors.gray,
  },
  diaVentas: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.success,
  },
});

export default DashboardScreen;