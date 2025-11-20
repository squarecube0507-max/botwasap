// src/screens/CategoriasScreen.js
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
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import CategoriaCard from '../components/CategoriaCard';
import Colors from '../utils/colors';
import {
  getCategorias,
  crearCategoria,
  editarNombreCategoria,
  eliminarCategoria,
  formatearTexto,
} from '../services/api';

const CategoriasScreen = ({ navigation }) => {
  const [categorias, setCategorias] = useState([]);
  const [categoriasFiltradas, setCategoriasFiltradas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  // Modal de crear/editar
  const [modalVisible, setModalVisible] = useState(false);
  const [categoriaEditando, setCategoriaEditando] = useState(null);
  const [nombreCategoria, setNombreCategoria] = useState('');
  const [nombreSubcategoria, setNombreSubcategoria] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Recargar cuando la pantalla vuelve a tener foco
  useFocusEffect(
    useCallback(() => {
      cargarCategorias();
    }, [])
  );

  useEffect(() => {
    filtrarCategorias();
  }, [busqueda, categorias]);

  const cargarCategorias = async () => {
    try {
      setLoading(true);
      const datos = await getCategorias();
      setCategorias(datos);
      console.log('✅ Categorías cargadas:', datos.length);
    } catch (error) {
      console.error('❌ Error al cargar categorías:', error);
      Alert.alert(
        'Error de Conexión',
        'No se pudieron cargar las categorías. Verifica que el servidor esté corriendo.',
        [
          { text: 'Reintentar', onPress: cargarCategorias },
          { text: 'Cancelar', style: 'cancel' },
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarCategorias();
    setRefreshing(false);
  };

  const filtrarCategorias = () => {
    if (!busqueda.trim()) {
      setCategoriasFiltradas(categorias);
      return;
    }

    const busquedaLower = busqueda.toLowerCase();
    const resultado = categorias.filter((cat) => {
      const nombreLower = cat.nombre.toLowerCase().replace(/_/g, ' ');
      return nombreLower.includes(busquedaLower);
    });

    setCategoriasFiltradas(resultado);
  };

  const abrirModalNuevaCategoria = () => {
    setCategoriaEditando(null);
    setNombreCategoria('');
    setNombreSubcategoria('');
    setModalVisible(true);
  };

  const abrirModalEditarCategoria = (categoria) => {
    setCategoriaEditando(categoria);
    setNombreCategoria(formatearTexto(categoria.nombre));
    setNombreSubcategoria('');
    setModalVisible(true);
  };

  const cerrarModal = () => {
    setModalVisible(false);
    setCategoriaEditando(null);
    setNombreCategoria('');
    setNombreSubcategoria('');
  };

  const validarFormulario = () => {
    if (!nombreCategoria.trim()) {
      Alert.alert('Error', 'El nombre de la categoría es obligatorio');
      return false;
    }

    if (!categoriaEditando && !nombreSubcategoria.trim()) {
      Alert.alert('Error', 'La subcategoría es obligatoria al crear una categoría');
      return false;
    }

    return true;
  };

  const guardarCategoria = async () => {
    if (!validarFormulario()) return;

    try {
      setGuardando(true);

      if (categoriaEditando) {
        // Editar nombre de categoría existente
        console.log('✏️ Editando categoría:', categoriaEditando.nombre);
        await editarNombreCategoria(categoriaEditando.nombre, nombreCategoria.trim());
        Alert.alert('✅ Éxito', 'Categoría renombrada correctamente');
      } else {
        // Crear nueva categoría
        console.log('➕ Creando categoría:', nombreCategoria, nombreSubcategoria);
        await crearCategoria(nombreCategoria.trim(), nombreSubcategoria.trim());
        Alert.alert('✅ Éxito', 'Categoría creada correctamente');
      }

      cerrarModal();
      await cargarCategorias();
    } catch (error) {
      console.error('❌ Error al guardar categoría:', error);
      const mensajeError = error.response?.data?.error || error.message || 'Error desconocido';
      Alert.alert('Error', mensajeError);
    } finally {
      setGuardando(false);
    }
  };

  const confirmarEliminarCategoria = (categoria) => {
    if (categoria.total_productos > 0) {
      Alert.alert(
        '⚠️ No se puede eliminar',
        `La categoría "${formatearTexto(categoria.nombre)}" tiene ${categoria.total_productos} productos.\n\nPrimero debes eliminar o mover todos los productos a otra categoría.`,
        [{ text: 'Entendido' }]
      );
      return;
    }

    Alert.alert(
      '⚠️ Confirmar eliminación',
      `¿Estás seguro de eliminar la categoría "${formatearTexto(categoria.nombre)}"?\n\nEsta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => eliminarCategoriaCompleta(categoria),
        },
      ]
    );
  };

  const eliminarCategoriaCompleta = async (categoria) => {
    try {
      setLoading(true);
      console.log('🗑️ Eliminando categoría:', categoria.nombre);
      await eliminarCategoria(categoria.nombre);
      Alert.alert('✅ Éxito', 'Categoría eliminada correctamente');
      await cargarCategorias();
    } catch (error) {
      console.error('❌ Error al eliminar categoría:', error);
      const mensajeError = error.response?.data?.error || error.message || 'Error desconocido';
      Alert.alert('Error', mensajeError);
    } finally {
      setLoading(false);
    }
  };

  const verProductosDeCategoria = (categoria) => {
    navigation.navigate('Productos', {
      screen: 'ProductosLista',
      params: { categoriaFiltro: categoria.nombre },
    });
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Búsqueda */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={Colors.gray} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar categorías..."
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

      {/* Contador */}
      <View style={styles.contadorContainer}>
        <Ionicons name="folder-open" size={16} color={Colors.gray} />
        <Text style={styles.contadorText}>
          {categoriasFiltradas.length === categorias.length
            ? `${categorias.length} ${categorias.length === 1 ? 'categoría' : 'categorías'}`
            : `Mostrando ${categoriasFiltradas.length} de ${categorias.length}`}
        </Text>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>📁</Text>
      <Text style={styles.emptyTitle}>
        {busqueda ? 'No se encontraron categorías' : 'No hay categorías'}
      </Text>
      <Text style={styles.emptyText}>
        {busqueda
          ? 'Intenta con otra búsqueda'
          : 'Crea tu primera categoría para organizar tus productos'}
      </Text>
      {!busqueda && (
        <TouchableOpacity style={styles.emptyButton} onPress={abrirModalNuevaCategoria}>
          <Text style={styles.emptyButtonText}>➕ Crear Categoría</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading && categorias.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Cargando categorías...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={categoriasFiltradas}
        keyExtractor={(item) => item.nombre}
        renderItem={({ item }) => (
          <CategoriaCard
            categoria={item}
            onPress={() => verProductosDeCategoria(item)}
            onEdit={abrirModalEditarCategoria}
            onDelete={confirmarEliminarCategoria}
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
        onPress={abrirModalNuevaCategoria}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color={Colors.white} />
      </TouchableOpacity>

      {/* Modal de crear/editar */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={cerrarModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {categoriaEditando ? '✏️ Editar Categoría' : '➕ Nueva Categoría'}
              </Text>
              <TouchableOpacity onPress={cerrarModal}>
                <Ionicons name="close" size={28} color={Colors.dark} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              {/* Nombre de categoría */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {categoriaEditando ? 'Nuevo nombre *' : 'Nombre de la categoría *'}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: Librería, Juguetería, Cotillón"
                  value={nombreCategoria}
                  onChangeText={setNombreCategoria}
                  placeholderTextColor={Colors.gray}
                  autoCapitalize="words"
                  autoFocus
                />
                <Text style={styles.hint}>
                  💡 Puedes usar mayúsculas y espacios (se normalizarán automáticamente)
                </Text>
              </View>

              {/* Subcategoría (solo al crear) */}
              {!categoriaEditando && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Primera subcategoría *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej: Escolar, Peluches, Fiesta"
                    value={nombreSubcategoria}
                    onChangeText={setNombreSubcategoria}
                    placeholderTextColor={Colors.gray}
                    autoCapitalize="words"
                  />
                  <Text style={styles.hint}>
                    💡 Podrás agregar más subcategorías después creando productos
                  </Text>
                </View>
              )}

              {categoriaEditando && categoriaEditando.total_productos > 0 && (
                <View style={styles.warningBox}>
                  <Ionicons name="information-circle" size={20} color={Colors.primary} />
                  <Text style={styles.warningText}>
                    Esta categoría tiene {categoriaEditando.total_productos} productos. Al
                    renombrarla, todos los productos se actualizarán automáticamente.
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={cerrarModal}
                disabled={guardando}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={guardarCategoria}
                disabled={guardando}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={Colors.gradientSuccess}
                  style={styles.saveButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {guardando ? (
                    <ActivityIndicator color={Colors.white} size="small" />
                  ) : (
                    <>
                      <Ionicons
                        name={categoriaEditando ? 'checkmark-circle' : 'add-circle'}
                        size={20}
                        color={Colors.white}
                      />
                      <Text style={styles.saveButtonText}>
                        {categoriaEditando ? 'Guardar' : 'Crear'}
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.dark,
  },
  modalContent: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.dark,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  hint: {
    fontSize: 12,
    color: Colors.gray,
    marginTop: 4,
    lineHeight: 16,
  },
  warningBox: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: Colors.gray,
    lineHeight: 18,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray,
  },
  saveButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CategoriasScreen;