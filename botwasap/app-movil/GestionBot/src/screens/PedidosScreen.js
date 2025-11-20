// src/screens/PedidosScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PedidoCard from '../components/PedidoCard';
import Colors from '../utils/colors';
import { getPedidos } from '../services/api';

const PedidosScreen = ({ navigation }) => {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtro, setFiltro] = useState('todos'); // todos, pendiente, completado

  useEffect(() => {
    cargarPedidos();
  }, []);

  const cargarPedidos = async () => {
    try {
      setLoading(true);
      const datos = await getPedidos();
      // Ordenar por fecha más reciente primero
      const pedidosOrdenados = datos.sort((a, b) => 
        new Date(b.fecha) - new Date(a.fecha)
      );
      setPedidos(pedidosOrdenados);
      console.log('📦 Pedidos cargados:', pedidosOrdenados.length);
    } catch (error) {
      console.error('❌ Error al cargar pedidos:', error);
      Alert.alert('Error', 'No se pudieron cargar los pedidos');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarPedidos();
    setRefreshing(false);
  };

  const pedidosFiltrados = pedidos.filter((pedido) => {
    if (filtro === 'todos') return true;
    return pedido.estado === filtro;
  });

  const contarPorEstado = (estado) => {
    return pedidos.filter(p => p.estado === estado).length;
  };

  const renderFiltro = (label, valor, emoji) => {
    const activo = filtro === valor;
    const cantidad = valor === 'todos' ? pedidos.length : contarPorEstado(valor);

    return (
      <TouchableOpacity
        style={[styles.filtroBtn, activo && styles.filtroBtnActivo]}
        onPress={() => setFiltro(valor)}
      >
        <Text style={[styles.filtroEmoji, activo && styles.filtroEmojiActivo]}>
          {emoji}
        </Text>
        <Text style={[styles.filtroLabel, activo && styles.filtroLabelActivo]}>
          {label}
        </Text>
        <View style={[styles.filtroBadge, activo && styles.filtroBadgeActivo]}>
          <Text style={[styles.filtroCantidad, activo && styles.filtroCantidadActivo]}>
            {cantidad}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && pedidos.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Cargando pedidos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filtros */}
      <View style={styles.filtrosContainer}>
        {renderFiltro('Todos', 'todos', '📋')}
        {renderFiltro('Pendientes', 'confirmado', '⏳')}
        {renderFiltro('Completados', 'completado', '✅')}
      </View>

      {/* Lista de pedidos */}
      {pedidosFiltrados.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>📦</Text>
          <Text style={styles.emptyTitle}>No hay pedidos</Text>
          <Text style={styles.emptyText}>
            {filtro === 'todos'
              ? 'Aún no se han realizado pedidos'
              : `No hay pedidos ${filtro}s`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={pedidosFiltrados}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PedidoCard
              pedido={item}
              onPress={() => navigation.navigate('PedidoDetalle', { pedido: item })}
            />
          )}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
  filtrosContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  filtroBtn: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: Colors.background,
    gap: 4,
  },
  filtroBtnActivo: {
    backgroundColor: Colors.primary,
  },
  filtroEmoji: {
    fontSize: 24,
  },
  filtroEmojiActivo: {
    transform: [{ scale: 1.2 }],
  },
  filtroLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.gray,
  },
  filtroLabelActivo: {
    color: Colors.white,
  },
  filtroBadge: {
    backgroundColor: Colors.white,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  filtroBadgeActivo: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  filtroCantidad: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  filtroCantidadActivo: {
    color: Colors.white,
  },
  listContainer: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.gray,
    textAlign: 'center',
  },
});

export default PedidosScreen;