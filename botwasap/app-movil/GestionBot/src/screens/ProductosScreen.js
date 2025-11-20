// src/screens/ProductosScreen.js
import React, { useState, useEffect, useCallback } from 'react';
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
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import ProductoCard from '../components/ProductoCard';
import Colors from '../utils/colors';
import { getProductos, getCategorias, formatearTexto } from '../services/api';

const ProductosScreen = ({ navigation, route }) => {
  const [productos, setProductos] = useState([]);
  const [productosFiltrados, setProductosFiltrados] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('todas');
  const [mostrarSinStock, setMostrarSinStock] = useState(true);

  // ✅ Manejar parámetros de navegación (desde escáner)
  useEffect(() => {
    if (route.params?.categoriaFiltro) {
      const categoria = route.params.categoriaFiltro;
      console.log('🔍 Filtrando por categoría:', categoria);
      setCategoriaSeleccionada(categoria);
      
      // Limpiar el parámetro
      navigation.setParams({ categoriaFiltro: undefined });
    }
  }, [route.params]);

  // Recargar cuando la pantalla vuelve a tener foco
  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [])
  );

  useEffect(() => {
    filtrarProductos();
  }, [busqueda, categoriaSeleccionada, mostrarSinStock, productos]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [datosProductos, datosCategorias] = await Promise.all([
        getProductos(),
        getCategorias(),
      ]);
      
      setProductos(datosProductos);
      setCategorias(datosCategorias);
      console.log('✅ Productos cargados:', datosProductos.length);
      console.log('✅ Categorías cargadas:', datosCategorias.length);
    } catch (error) {
      console.error('❌ Error al cargar productos:', error);
      Alert.alert(
        'Error de Conexión',
        'No se pudieron cargar los productos. Verifica que el servidor esté corriendo.',
        [
          { text: 'Reintentar', onPress: cargarDatos },
          { text: 'Cancelar', style: 'cancel' },
        ]
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

  const filtrarProductos = () => {
    let resultado = [...productos];

    // Filtrar por búsqueda
    if (busqueda.trim()) {
      const busquedaLower = busqueda.toLowerCase();
      resultado = resultado.filter(p => {
        const nombreLower = p.nombre.toLowerCase().replace(/_/g, ' ');
        const categoriaLower = p.categoria.toLowerCase().replace(/_/g, ' ');
        const subcategoriaLower = p.subcategoria.toLowerCase().replace(/_/g, ' ');
        const codigoBarras = p.codigo_barras || '';
        
        return nombreLower.includes(busquedaLower) ||
               categoriaLower.includes(busquedaLower) ||
               subcategoriaLower.includes(busquedaLower) ||
               codigoBarras.includes(busqueda);
      });
    }

    // Filtrar por categoría
    if (categoriaSeleccionada !== 'todas') {
      resultado = resultado.filter(p => p.categoria === categoriaSeleccionada);
    }

    // Filtrar por stock
    if (!mostrarSinStock) {
      resultado = resultado.filter(p => p.stock === true);
    }

    // Ordenar alfabéticamente por nombre
    resultado.sort((a, b) => {
      const nombreA = a.nombre.toLowerCase();
      const nombreB = b.nombre.toLowerCase();
      return nombreA.localeCompare(nombreB);
    });

    setProductosFiltrados(resultado);
  };

  const limpiarFiltros = () => {
    setBusqueda('');
    setCategoriaSeleccionada('todas');
    setMostrarSinStock(true);
  };

  // ✅ Abrir escáner de códigos de barras
  const abrirEscaner = () => {
    navigation.navigate('BarcodeScanner', {
      modo: 'buscar'
    });
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Búsqueda con botón de escáner */}
      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={Colors.gray} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre o código..."
            value={busqueda}
            onChangeText={setBusqueda}
            placeholderTextColor={Colors.gray}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {busqueda.length > 0 && (
            <TouchableOpacity onPress={() => setBusqueda('')}>
              <Ionicons name="close-circle" size={20} color={Colors.gray} />
            </TouchableOpacity>
          )}
        </View>

        {/* ✅ Botón de escáner */}
        <TouchableOpacity
          style={styles.scanButton}
          onPress={abrirEscaner}
          activeOpacity={0.7}
        >
          <Ionicons name="barcode" size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {/* Filtros */}
      <View style={styles.filtersRow}>
        <TouchableOpacity
          style={styles.stockFilter}
          onPress={() => setMostrarSinStock(!mostrarSinStock)}
        >
          <Ionicons
            name={mostrarSinStock ? 'eye' : 'eye-off'}
            size={18}
            color={mostrarSinStock ? Colors.primary : Colors.gray}
          />
          <Text style={[
            styles.stockFilterText, 
            !mostrarSinStock && styles.stockFilterTextInactive
          ]}>
            {mostrarSinStock ? 'Todos' : 'Con stock'}
          </Text>
        </TouchableOpacity>

        {(busqueda || categoriaSeleccionada !== 'todas' || !mostrarSinStock) && (
          <TouchableOpacity
            style={styles.clearFiltersBtn}
            onPress={limpiarFiltros}
          >
            <Ionicons name="refresh" size={16} color={Colors.danger} />
            <Text style={styles.clearFiltersText}>Limpiar</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Categorías */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoriasScroll}
        contentContainerStyle={styles.categoriasContent}
      >
        <TouchableOpacity
          style={[
            styles.categoriaBtn, 
            categoriaSeleccionada === 'todas' && styles.categoriaBtnActiva
          ]}
          onPress={() => setCategoriaSeleccionada('todas')}
        >
          <Text style={[
            styles.categoriaText, 
            categoriaSeleccionada === 'todas' && styles.categoriaTextActiva
          ]}>
            Todas ({productos.length})
          </Text>
        </TouchableOpacity>

        {categorias.map((cat) => {
          const nombreFormateado = formatearTexto(cat.nombre);
          
          return (
            <TouchableOpacity
              key={cat.nombre}
              style={[
                styles.categoriaBtn, 
                categoriaSeleccionada === cat.nombre && styles.categoriaBtnActiva
              ]}
              onPress={() => setCategoriaSeleccionada(cat.nombre)}
            >
              <Text style={[
                styles.categoriaText, 
                categoriaSeleccionada === cat.nombre && styles.categoriaTextActiva
              ]}>
                {nombreFormateado} ({cat.total_productos})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Contador */}
      <View style={styles.contadorContainer}>
        <Ionicons name="apps" size={16} color={Colors.gray} />
        <Text style={styles.contadorText}>
          {productosFiltrados.length === productos.length 
            ? `${productos.length} productos`
            : `Mostrando ${productosFiltrados.length} de ${productos.length}`
          }
        </Text>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>
        {busqueda ? '🔍' : '📦'}
      </Text>
      <Text style={styles.emptyTitle}>
        {busqueda 
          ? 'No se encontraron productos' 
          : productos.length === 0
            ? 'No hay productos'
            : 'Sin resultados'
        }
      </Text>
      <Text style={styles.emptyText}>
        {busqueda 
          ? 'Intenta con otra búsqueda' 
          : productos.length === 0
            ? 'Agrega tu primer producto'
            : 'Ajusta los filtros para ver más productos'
        }
      </Text>
      {(busqueda || categoriaSeleccionada !== 'todas' || !mostrarSinStock) && (
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={limpiarFiltros}
        >
          <Text style={styles.emptyButtonText}>Limpiar filtros</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading && productos.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Cargando productos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={productosFiltrados}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProductoCard
            producto={item}
            onPress={() => navigation.navigate('ProductoEdit', { producto: item })}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Botón flotante para agregar */}
      <TouchableOpacity
        style={styles.fabButton}
        onPress={() => navigation.navigate('ProductoEdit', { producto: null })}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color={Colors.white} />
      </TouchableOpacity>
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
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.dark,
  },
  scanButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  stockFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  stockFilterText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  stockFilterTextInactive: {
    color: Colors.gray,
  },
  clearFiltersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  clearFiltersText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.danger,
  },
  categoriasScroll: {
    marginBottom: 12,
  },
  categoriasContent: {
    gap: 8,
    paddingRight: 16,
  },
  categoriaBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  categoriaBtnActiva: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoriaText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.gray,
  },
  categoriaTextActiva: {
    color: Colors.white,
  },
  contadorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  contadorText: {
    fontSize: 12,
    color: Colors.gray,
    fontWeight: '500',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
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
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  fabButton: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default ProductosScreen;