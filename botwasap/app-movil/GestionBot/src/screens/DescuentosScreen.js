import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import Colors from '../utils/colors';

// ✅ Usar la configuración centralizada
const API_BASE_URL = 'http://192.168.0.72:3000'; // Tu IP del api.js

export default function DescuentosScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [descuentosHabilitados, setDescuentosHabilitados] = useState(true);
  const [reglas, setReglas] = useState([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editandoIndex, setEditandoIndex] = useState(null);

  // Estados del formulario
  const [minimo, setMinimo] = useState('');
  const [porcentaje, setPorcentaje] = useState('');
  const [descripcion, setDescripcion] = useState('');

  useEffect(() => {
    cargarDescuentos();
  }, []);

  const cargarDescuentos = async () => {
    try {
      console.log('📡 Cargando descuentos desde:', `${API_BASE_URL}/api/descuentos`);
      const response = await axios.get(`${API_BASE_URL}/api/descuentos`);
      console.log('✅ Descuentos cargados:', response.data);
      setDescuentosHabilitados(response.data.habilitado);
      setReglas(response.data.reglas || []);
    } catch (error) {
      console.error('❌ Error al cargar descuentos:', error.message);
      Alert.alert(
        'Error de Conexión',
        'No se pudieron cargar los descuentos. Verifica que el servidor esté corriendo en http://192.168.0.72:3000'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    cargarDescuentos();
  };

  const toggleDescuentos = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/descuentos/toggle`);
      setDescuentosHabilitados(response.data.habilitado);
      Alert.alert(
        'Descuentos ' + (response.data.habilitado ? 'Activados' : 'Desactivados'),
        response.data.mensaje
      );
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      Alert.alert('Error', 'No se pudo cambiar el estado de los descuentos');
    }
  };

  const guardarRegla = async () => {
    // Validaciones
    if (!minimo || !porcentaje || !descripcion) {
      Alert.alert('Error', 'Todos los campos son obligatorios');
      return;
    }

    const minimoNum = parseFloat(minimo);
    const porcentajeNum = parseFloat(porcentaje);

    if (isNaN(minimoNum) || minimoNum <= 0) {
      Alert.alert('Error', 'El monto mínimo debe ser un número mayor a 0');
      return;
    }

    if (isNaN(porcentajeNum) || porcentajeNum <= 0 || porcentajeNum > 100) {
      Alert.alert('Error', 'El porcentaje debe estar entre 1 y 100');
      return;
    }

    try {
      let nuevasReglas = [...reglas];

      if (editandoIndex !== null) {
        // Editar regla existente
        nuevasReglas[editandoIndex] = {
          minimo: minimoNum,
          porcentaje: porcentajeNum,
          descripcion: descripcion.trim(),
        };
      } else {
        // Agregar nueva regla
        nuevasReglas.push({
          minimo: minimoNum,
          porcentaje: porcentajeNum,
          descripcion: descripcion.trim(),
        });
      }

      // Ordenar por monto mínimo
      nuevasReglas.sort((a, b) => a.minimo - b.minimo);

      // Guardar en el backend
      await axios.put(`${API_BASE_URL}/api/descuentos`, {
        habilitado: descuentosHabilitados,
        reglas: nuevasReglas,
      });

      setReglas(nuevasReglas);
      cancelarFormulario();
      Alert.alert('Éxito', 'Regla guardada correctamente');
    } catch (error) {
      console.error('Error al guardar regla:', error);
      Alert.alert('Error', error.response?.data?.error || 'No se pudo guardar la regla');
    }
  };

  const eliminarRegla = async (index) => {
    Alert.alert(
      'Confirmar',
      '¿Estás seguro de eliminar esta regla?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const nuevasReglas = reglas.filter((_, i) => i !== index);

              await axios.put(`${API_BASE_URL}/api/descuentos`, {
                habilitado: descuentosHabilitados,
                reglas: nuevasReglas,
              });

              setReglas(nuevasReglas);
              Alert.alert('Éxito', 'Regla eliminada');
            } catch (error) {
              console.error('Error al eliminar:', error);
              Alert.alert('Error', 'No se pudo eliminar la regla');
            }
          },
        },
      ]
    );
  };

  const editarRegla = (index) => {
    const regla = reglas[index];
    setMinimo(regla.minimo.toString());
    setPorcentaje(regla.porcentaje.toString());
    setDescripcion(regla.descripcion);
    setEditandoIndex(index);
    setMostrarFormulario(true);
  };

  const cancelarFormulario = () => {
    setMinimo('');
    setPorcentaje('');
    setDescripcion('');
    setEditandoIndex(null);
    setMostrarFormulario(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Cargando descuentos...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header con Switch */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="pricetag" size={28} color={Colors.primary} />
          <Text style={styles.title}>Descuentos</Text>
        </View>
        <Switch
          value={descuentosHabilitados}
          onValueChange={toggleDescuentos}
          trackColor={{ false: '#ccc', true: Colors.primary }}
          thumbColor={descuentosHabilitados ? '#fff' : '#f4f3f4'}
        />
      </View>

      <Text style={styles.subtitle}>
        {descuentosHabilitados
          ? '✅ Los descuentos están activos'
          : '❌ Los descuentos están desactivados'}
      </Text>

      {/* Lista de reglas */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reglas de Descuento</Text>

        {reglas.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="sad-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No hay reglas configuradas</Text>
            <Text style={styles.emptySubtext}>
              Presiona el botón + para agregar una
            </Text>
          </View>
        ) : (
          reglas.map((regla, index) => (
            <View key={index} style={styles.reglaCard}>
              <View style={styles.reglaHeader}>
                <Text style={styles.reglaNumero}>Regla {index + 1}</Text>
                <View style={styles.reglaActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => editarRegla(index)}
                  >
                    <Ionicons name="pencil" size={20} color={Colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => eliminarRegla(index)}
                  >
                    <Ionicons name="trash-outline" size={20} color={Colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.reglaContent}>
                <View style={styles.reglaRow}>
                  <Ionicons name="cash-outline" size={20} color="#666" />
                  <Text style={styles.reglaLabel}>Monto mínimo:</Text>
                  <Text style={styles.reglaValue}>${regla.minimo}</Text>
                </View>

                <View style={styles.reglaRow}>
                  <Ionicons name="trending-down-outline" size={20} color="#666" />
                  <Text style={styles.reglaLabel}>Descuento:</Text>
                  <Text style={styles.reglaValue}>{regla.porcentaje}%</Text>
                </View>

                <View style={styles.reglaRow}>
                  <Ionicons name="document-text-outline" size={20} color="#666" />
                  <Text style={styles.reglaLabel}>Descripción:</Text>
                </View>
                <Text style={styles.descripcion}>{regla.descripcion}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Formulario para agregar/editar */}
      {mostrarFormulario && (
        <View style={styles.formulario}>
          <View style={styles.formularioHeader}>
            <Text style={styles.formularioTitle}>
              {editandoIndex !== null ? 'Editar Regla' : 'Nueva Regla'}
            </Text>
            <TouchableOpacity onPress={cancelarFormulario}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Monto Mínimo ($)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: 5000"
              keyboardType="numeric"
              value={minimo}
              onChangeText={setMinimo}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Descuento (%)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: 10"
              keyboardType="numeric"
              value={porcentaje}
              onChangeText={setPorcentaje}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Descripción</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Ej: 10% de descuento en compras mayores a $5000"
              multiline
              numberOfLines={3}
              value={descripcion}
              onChangeText={setDescripcion}
            />
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={guardarRegla}>
            <Ionicons name="checkmark-circle" size={24} color="#fff" />
            <Text style={styles.saveButtonText}>Guardar Regla</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Botón flotante para agregar */}
      {!mostrarFormulario && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setMostrarFormulario(true)}
        >
          <Ionicons name="add" size={32} color="#fff" />
        </TouchableOpacity>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 10,
    color: '#333',
  },
  subtitle: {
    padding: 15,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  section: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 5,
  },
  reglaCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  reglaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  reglaNumero: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  reglaActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 10,
  },
  reglaContent: {
    gap: 10,
  },
  reglaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reglaLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  reglaValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  descripcion: {
    fontSize: 14,
    color: '#333',
    marginLeft: 28,
    fontStyle: 'italic',
  },
  formulario: {
    backgroundColor: '#fff',
    margin: 15,
    borderRadius: 12,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  formularioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  formularioTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
});