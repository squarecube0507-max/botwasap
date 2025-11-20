// src/screens/ConfiguracionScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import Colors from '../utils/colors';
import { getConfiguracion, actualizarConfiguracion } from '../services/api';

const ConfiguracionScreen = ({ navigation }) => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [cambiosPendientes, setCambiosPendientes] = useState(false);

  // Campos editables
  const [nombre, setNombre] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [horarios, setHorarios] = useState('');
  const [mediosPago, setMediosPago] = useState('');

  // Recargar cuando la pantalla vuelve a tener foco
  useFocusEffect(
    useCallback(() => {
      cargarConfiguracion();
    }, [])
  );

  useEffect(() => {
    // Detectar cambios pendientes
    if (config) {
      const hayCambios = 
        nombre !== (config.nombre || '') ||
        whatsapp !== (config.whatsapp || '') ||
        telefono !== (config.telefono || '') ||
        direccion !== (config.direccion || '') ||
        horarios !== (config.horarios || '') ||
        mediosPago !== (config.medios_pago || '');
      
      setCambiosPendientes(hayCambios);
    }
  }, [nombre, whatsapp, telefono, direccion, horarios, mediosPago, config]);

  const cargarConfiguracion = async () => {
    try {
      setLoading(true);
      const datos = await getConfiguracion();
      setConfig(datos);
      
      // Cargar datos en los campos
      setNombre(datos.nombre || '');
      setWhatsapp(datos.whatsapp || '');
      setTelefono(datos.telefono || '');
      setDireccion(datos.direccion || '');
      setHorarios(datos.horarios || '');
      setMediosPago(datos.medios_pago || '');
      
      console.log('✅ Configuración cargada');
    } catch (error) {
      console.error('❌ Error al cargar configuración:', error);
      Alert.alert(
        'Error de Conexión',
        'No se pudo cargar la configuración. Verifica que el servidor esté corriendo.',
        [
          { text: 'Reintentar', onPress: cargarConfiguracion },
          { text: 'Cancelar', style: 'cancel' },
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    if (cambiosPendientes) {
      Alert.alert(
        '⚠️ Cambios sin guardar',
        'Tienes cambios sin guardar. ¿Deseas descartarlos y recargar?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Recargar',
            style: 'destructive',
            onPress: async () => {
              setRefreshing(true);
              await cargarConfiguracion();
              setRefreshing(false);
            },
          },
        ]
      );
    } else {
      setRefreshing(true);
      await cargarConfiguracion();
      setRefreshing(false);
    }
  };

  const validarFormulario = () => {
    const errores = [];

    if (!nombre.trim()) {
      errores.push('El nombre del negocio es obligatorio');
    }

    if (!whatsapp.trim()) {
      errores.push('El WhatsApp es obligatorio');
    } else {
      // Validación básica de formato WhatsApp
      const whatsappLimpio = whatsapp.replace(/\D/g, '');
      if (whatsappLimpio.length < 10) {
        errores.push('El WhatsApp debe tener al menos 10 dígitos');
      }
    }

    if (errores.length > 0) {
      Alert.alert('Errores de validación', errores.join('\n\n'));
      return false;
    }

    return true;
  };

  const guardarConfiguracion = async () => {
    if (!validarFormulario()) return;

    try {
      setSaving(true);

      const datosActualizados = {
        nombre: nombre.trim(),
        whatsapp: whatsapp.trim(),
        telefono: telefono.trim(),
        direccion: direccion.trim(),
        horarios: horarios.trim(),
        medios_pago: mediosPago.trim(),
        numero_dueño: config.numero_dueño,
        numeros_dueños: config.numeros_dueños,
        grupo_notificaciones: config.grupo_notificaciones,
      };

      console.log('📤 Guardando configuración:', datosActualizados);

      await actualizarConfiguracion(datosActualizados);
      
      Alert.alert(
        '✅ Éxito',
        'Configuración guardada correctamente',
        [
          {
            text: 'OK',
            onPress: async () => {
              await cargarConfiguracion();
              setCambiosPendientes(false);
            },
          },
        ]
      );
    } catch (error) {
      console.error('❌ Error al guardar:', error);
      
      const mensajeError = error.response?.data?.error || error.message || 'Error desconocido';
      
      Alert.alert(
        'Error al guardar',
        mensajeError,
        [
          { text: 'Reintentar', onPress: guardarConfiguracion },
          { text: 'Cancelar', style: 'cancel' },
        ]
      );
    } finally {
      setSaving(false);
    }
  };

  const restaurarValores = () => {
    Alert.alert(
      '⚠️ Restaurar valores',
      '¿Deseas descartar los cambios y restaurar los valores guardados?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          style: 'destructive',
          onPress: () => {
            setNombre(config.nombre || '');
            setWhatsapp(config.whatsapp || '');
            setTelefono(config.telefono || '');
            setDireccion(config.direccion || '');
            setHorarios(config.horarios || '');
            setMediosPago(config.medios_pago || '');
            setCambiosPendientes(false);
          },
        },
      ]
    );
  };

  if (loading && !config) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Cargando configuración...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>⚙️ Configuración del Negocio</Text>
          <Text style={styles.headerSubtitle}>
            Esta información se mostrará a tus clientes en WhatsApp
          </Text>
        </View>

        {/* ✅ Botón Respuestas Automáticas */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('RespuestasAutomaticas')}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={['#8b5cf6', '#7c3aed']}
            style={styles.actionButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.actionButtonContent}>
              <View style={styles.actionButtonLeft}>
                <Ionicons name="chatbubbles" size={24} color={Colors.white} />
                <View>
                  <Text style={styles.actionButtonTitle}>Respuestas Automáticas</Text>
                  <Text style={styles.actionButtonSubtitle}>
                    Personaliza los mensajes del bot
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={24} color={Colors.white} />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* ✅ NUEVO: Botón Descuentos */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Descuentos')}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={['#10b981', '#059669']}
            style={styles.actionButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.actionButtonContent}>
              <View style={styles.actionButtonLeft}>
                <Ionicons name="pricetag" size={24} color={Colors.white} />
                <View>
                  <Text style={styles.actionButtonTitle}>Descuentos</Text>
                  <Text style={styles.actionButtonSubtitle}>
                    Configura descuentos automáticos
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={24} color={Colors.white} />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Indicador de cambios pendientes */}
        {cambiosPendientes && (
          <View style={styles.warningBox}>
            <Ionicons name="alert-circle" size={20} color={Colors.warning} />
            <View style={styles.warningTextContainer}>
              <Text style={styles.warningTitle}>Cambios sin guardar</Text>
              <Text style={styles.warningText}>
                Tienes cambios pendientes. No olvides guardar.
              </Text>
            </View>
          </View>
        )}

        {/* Formulario */}
        <View style={styles.form}>
          {/* Nombre del negocio */}
          <View style={styles.inputGroup}>
            <View style={styles.labelContainer}>
              <Ionicons name="storefront" size={18} color={Colors.primary} />
              <Text style={styles.label}>Nombre del negocio *</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Mi Negocio"
              value={nombre}
              onChangeText={setNombre}
              placeholderTextColor={Colors.gray}
              autoCapitalize="words"
            />
          </View>

          {/* WhatsApp */}
          <View style={styles.inputGroup}>
            <View style={styles.labelContainer}>
              <Ionicons name="logo-whatsapp" size={18} color={Colors.success} />
              <Text style={styles.label}>WhatsApp *</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="+54 9 11 1234-5678"
              value={whatsapp}
              onChangeText={setWhatsapp}
              keyboardType="phone-pad"
              placeholderTextColor={Colors.gray}
            />
            <Text style={styles.hint}>
              💡 Incluye código de país. Ej: +54 9 11 1234-5678
            </Text>
          </View>

          {/* Teléfono */}
          <View style={styles.inputGroup}>
            <View style={styles.labelContainer}>
              <Ionicons name="call" size={18} color={Colors.primary} />
              <Text style={styles.label}>Teléfono</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="(011) 1234-5678"
              value={telefono}
              onChangeText={setTelefono}
              keyboardType="phone-pad"
              placeholderTextColor={Colors.gray}
            />
          </View>

          {/* Dirección */}
          <View style={styles.inputGroup}>
            <View style={styles.labelContainer}>
              <Ionicons name="location" size={18} color={Colors.danger} />
              <Text style={styles.label}>Dirección</Text>
            </View>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Av. Principal 123, Ciudad, Provincia"
              value={direccion}
              onChangeText={setDireccion}
              multiline
              numberOfLines={2}
              placeholderTextColor={Colors.gray}
              textAlignVertical="top"
            />
          </View>

          {/* Horarios */}
          <View style={styles.inputGroup}>
            <View style={styles.labelContainer}>
              <Ionicons name="time" size={18} color={Colors.warning} />
              <Text style={styles.label}>Horarios de atención</Text>
            </View>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={'Lunes a Viernes: 9:00 - 18:00\nSábados: 9:00 - 13:00'}
              value={horarios}
              onChangeText={setHorarios}
              multiline
              numberOfLines={3}
              placeholderTextColor={Colors.gray}
              textAlignVertical="top"
            />
            <Text style={styles.hint}>
              💡 Usa saltos de línea para separar los días
            </Text>
          </View>

          {/* Medios de pago */}
          <View style={styles.inputGroup}>
            <View style={styles.labelContainer}>
              <Ionicons name="card" size={18} color={Colors.success} />
              <Text style={styles.label}>Medios de pago</Text>
            </View>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={'Efectivo\nTarjeta débito/crédito\nTransferencia\nMercado Pago'}
              value={mediosPago}
              onChangeText={setMediosPago}
              multiline
              numberOfLines={4}
              placeholderTextColor={Colors.gray}
              textAlignVertical="top"
            />
            <Text style={styles.hint}>
              💡 Usa saltos de línea para separar cada método de pago
            </Text>
          </View>
        </View>

        {/* Botones */}
        <View style={styles.buttonsContainer}>
          {/* Botón guardar */}
          <TouchableOpacity
            style={[styles.saveButton, !cambiosPendientes && styles.saveButtonDisabled]}
            onPress={guardarConfiguracion}
            disabled={saving || !cambiosPendientes}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={cambiosPendientes ? Colors.gradientSuccess : ['#cccccc', '#999999']}
              style={styles.saveButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {saving ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={24} color={Colors.white} />
                  <Text style={styles.saveButtonText}>Guardar Cambios</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Botón restaurar */}
          {cambiosPendientes && (
            <TouchableOpacity
              style={styles.restoreButton}
              onPress={restaurarValores}
              disabled={saving}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={20} color={Colors.warning} />
              <Text style={styles.restoreButtonText}>Restaurar valores</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
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
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.gray,
    lineHeight: 20,
  },
  // ✅ Estilos para botones de acción (Respuestas y Descuentos)
  actionButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  actionButtonGradient: {
    padding: 16,
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  actionButtonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 2,
  },
  actionButtonSubtitle: {
    fontSize: 13,
    color: Colors.white,
    opacity: 0.9,
  },
  warningBox: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    backgroundColor: Colors.white,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  warningTextContainer: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.warning,
    marginBottom: 2,
  },
  warningText: {
    fontSize: 12,
    color: Colors.gray,
    lineHeight: 16,
  },
  form: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 20,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark,
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
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  hint: {
    fontSize: 12,
    color: Colors.gray,
    marginTop: 4,
    lineHeight: 16,
  },
  buttonsContainer: {
    gap: 12,
  },
  saveButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  saveButtonDisabled: {
    shadowOpacity: 0.1,
    elevation: 2,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 16,
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.warning,
  },
  restoreButtonText: {
    color: Colors.warning,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ConfiguracionScreen;