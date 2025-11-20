// src/screens/ClientesScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ClienteCard from '../components/ClienteCard';
import Colors from '../utils/colors';
import { getClientes } from '../services/api';

const ClientesScreen = ({ navigation }) => {
  const [clientes, setClientes] = useState([]);
  const [clientesFiltrados, setClientesFiltrados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [ordenamiento, setOrdenamiento] = useState('nombre'); // nombre, pedidos, gastado

  useEffect(() => {
    cargarClientes();
  }, []);

  useEffect(() => {
    filtrarYOrdenarClientes();
  }, [busqueda, ordenamiento, clientes]);

  const cargarClientes = async () => {
    try {
      setLoading(true);
      const datos = await getClientes();
      setClientes(datos);
      console.log('👥 Clientes cargados:', datos.length);
    } catch (error) {
      console.error('❌ Error al cargar clientes:', error);
      Alert.alert('Error', 'No se pudieron cargar los clientes');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarClientes();
    setRefreshing(false);
  };

  const filtrarYOrdenarClientes = () => {
    let resultado = [...clientes];

    // Filtrar por búsqueda
    if (busqueda.trim()) {
      resultado = resultado.filter(c =>
        c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.telefono.includes(busqueda)
      );
    }

    // Ordenar
    resultado.sort((a, b) => {
      switch (ordenamiento) {
        case 'nombre':
          return a.nombre.localeCompare(b.nombre);
        case 'pedidos':
          return b.total_pedidos - a.total_pedidos;
        case 'gastado':
          return b.total_gastado - a.total_gastado;
        default:
          return 0;
      }
    });

    setClientesFiltrados(resultado);
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Búsqueda */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={Colors.gray} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar clientes..."
          value={busqueda}
          onChangeText={setBusqueda}
          placeholderTextColor={Colors.gray}
        />
        {busqueda.length > 0 && (
          <TouchableOpacity onPress={() => setBusqueda('')}>
            <Ionicons name="close-circle" size={20} color={Colors.gray} />
          </TouchableOpacity>
        )}
      </View>

      {/* Ordenamiento */}
      <View style={styles.ordenamientoContainer}>
        <Text style={styles.ordenamientoLabel}>Ordenar por:</Text>
        <View style={styles.ordenamientoBtns}>
          <TouchableOpacity
            style={[styles.ordenamientoBtn, ordenamiento === 'nombre' && styles.ordenamientoBtnActivo]}
            onPress={() => setOrdenamiento('nombre')}
          >
            <Text style={[styles.ordenamientoText, ordenamiento === 'nombre' && styles.ordenamientoTextActivo]}>
              Nombre
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.ordenamientoBtn, ordenamiento === 'pedidos' && styles.ordenamientoBtnActivo]}
            onPress={() => setOrdenamiento('pedidos')}
          >
            <Text style={[styles.ordenamientoText, ordenamiento === 'pedidos' && styles.ordenamientoTextActivo]}>
              Pedidos
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.ordenamientoBtn, ordenamiento === 'gastado' && styles.ordenamientoBtnActivo]}
            onPress={() => setOrdenamiento('gastado')}
          >
            <Text style={[styles.ordenamientoText, ordenamiento === 'gastado' && styles.ordenamientoTextActivo]}>
              Gastado
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Contador */}
      <View style={styles.contadorContainer}>
        <Text style={styles.contadorText}>
          Mostrando {clientesFiltrados.length} de {clientes.length} clientes
        </Text>
      </View>
    </View>
  );

  if (loading && clientes.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Cargando clientes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={clientesFiltrados}
        keyExtractor={(item) => item.telefono}
        renderItem={({ item }) => (
          <ClienteCard
            cliente={item}
            onPress={() => navigation.navigate('ClienteDetalle', { cliente: item })}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>👥</Text>
            <Text style={styles.emptyTitle}>No se encontraron clientes</Text>
            <Text style={styles.emptyText}>
              {busqueda ? 'Intenta con otra búsqueda' : 'Aún no hay clientes registrados'}
            </Text>
          </View>
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
  headerContainer: {
    backgroundColor: Colors.white,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.dark,
  },
  ordenamientoContainer: {
    marginBottom: 12,
  },
  ordenamientoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.gray,
    marginBottom: 8,
  },
  ordenamientoBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  ordenamientoBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    alignItems: 'center',
  },
  ordenamientoBtnActivo: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  ordenamientoText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.gray,
  },
  ordenamientoTextActivo: {
    color: Colors.white,
  },
  contadorContainer: {
    paddingVertical: 8,
  },
  contadorText: {
    fontSize: 12,
    color: Colors.gray,
  },
  listContainer: {
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 64,
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

export default ClientesScreen;