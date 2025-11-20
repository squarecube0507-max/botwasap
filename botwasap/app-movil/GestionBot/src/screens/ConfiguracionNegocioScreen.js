// src/screens/ConfiguracionNegocioScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../utils/colors';
import { getNegocioConfig, saveNegocioConfig } from '../services/negocioConfig';

const COLORES_DISPONIBLES = [
  { nombre: 'Azul', valor: '#3b82f6' },
  { nombre: 'Verde', valor: '#10b981' },
  { nombre: 'Morado', valor: '#8b5cf6' },
  { nombre: 'Rosa', valor: '#ec4899' },
  { nombre: 'Naranja', valor: '#f97316' },
  { nombre: 'Rojo', valor: '#ef4444' },
  { nombre: 'Índigo', valor: '#6366f1' },
  { nombre: 'Amarillo', valor: '#eab308' },
];

const ConfiguracionNegocioScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [direccion, setDireccion] = useState('');
  const [colorSeleccionado, setColorSeleccionado] = useState('#3b82f6');

  useEffect(() => {
    cargarConfiguracion();
  }, []);

  const cargarConfiguracion = async () => {
    try {
      const config = await getNegocioConfig();
      setNombre(config.nombre);
      setTelefono(config.telefono || '');
      setEmail(config.email || '');
      setDireccion(config.direccion || '');
      setColorSeleccionado(config.color || '#3b82f6');
    } catch (error) {
      console.error('Error al cargar configuración:', error);
      Alert.alert('Error', 'No se pudo cargar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const validarFormulario = () => {
    if (!nombre.trim()) {
      Alert.alert('Error', 'El nombre del negocio es obligatorio');
      return false;
    }

    if (email && !email.includes('@')) {
      Alert.alert('Error', 'El email no es válido');
      return false;
    }

    return true;
  };

  const guardarConfiguracion = async () => {
    if (!validarFormulario()) return;

    try {
      setSaving(true);

      const config = {
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        email: email.trim(),
        direccion: direccion.trim(),
        color: colorSeleccionado,
        logo: null, // Para futuras implementaciones
      };

      const success = await saveNegocioConfig(config);

      if (success) {
        Alert.alert(
          '✅ Guardado',
          'La configuración se guardó correctamente',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert('Error', 'No se pudo guardar la configuración');
      }
    } catch (error) {
      console.error('Error al guardar:', error);
      Alert.alert('Error', error.message || 'Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Cargando configuración...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Preview */}
      <View style={[styles.previewCard, { borderTopColor: colorSeleccionado }]}>
        <View style={styles.previewHeader}>
          <View style={[styles.previewIcon, { backgroundColor: colorSeleccionado }]}>
            <Ionicons name="storefront" size={32} color={Colors.white} />
          </View>
          <View style={styles.previewText}>
            <Text style={styles.previewNombre}>
              {nombre || 'Nombre del Negocio'}
            </Text>
            <Text style={styles.previewSubtitle}>Vista previa</Text>
          </View>
        </View>
        {(telefono || email || direccion) && (
          <View style={styles.previewInfo}>
            {telefono && (
              <Text style={styles.previewInfoText}>📞 {telefono}</Text>
            )}
            {email && (
              <Text style={styles.previewInfoText}>✉️ {email}</Text>
            )}
            {direccion && (
              <Text style={styles.previewInfoText}>📍 {direccion}</Text>
            )}
          </View>
        )}
      </View>

      {/* Formulario */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información del Negocio</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Nombre del negocio *
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Mi Librería"
            value={nombre}
            onChangeText={setNombre}
            placeholderTextColor={Colors.gray}
            autoCapitalize="words"
          />
          <Text style={styles.hint}>
            Este nombre aparecerá en los archivos exportados
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Teléfono</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: +54 9 11 1234-5678"
            value={telefono}
            onChangeText={setTelefono}
            placeholderTextColor={Colors.gray}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: contacto@minegocio.com"
            value={email}
            onChangeText={setEmail}
            placeholderTextColor={Colors.gray}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Dirección</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Av. Principal 123, Ciudad"
            value={direccion}
            onChangeText={setDireccion}
            placeholderTextColor={Colors.gray}
            autoCapitalize="words"
          />
        </View>
      </View>

      {/* Selector de color */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Color del Tema</Text>
        <Text style={styles.sectionDesc}>
          Selecciona el color que representará tu negocio en los reportes
        </Text>

        <View style={styles.coloresGrid}>
          {COLORES_DISPONIBLES.map(color => (
            <TouchableOpacity
              key={color.valor}
              style={[
                styles.colorBtn,
                { backgroundColor: color.valor },
                colorSeleccionado === color.valor && styles.colorBtnSeleccionado,
              ]}
              onPress={() => setColorSeleccionado(color.valor)}
            >
              {colorSeleccionado === color.valor && (
                <Ionicons name="checkmark" size={24} color={Colors.white} />
              )}
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.colorNombre}>
          Color seleccionado: {
            COLORES_DISPONIBLES.find(c => c.valor === colorSeleccionado)?.nombre
          }
        </Text>
      </View>

      {/* Info adicional */}
      <View style={styles.infoCard}>
        <Ionicons name="information-circle-outline" size={24} color={Colors.primary} />
        <View style={styles.infoCardText}>
          <Text style={styles.infoCardTitle}>💡 Importante</Text>
          <Text style={styles.infoCardDesc}>
            Esta información se incluirá automáticamente en todos los archivos
            Excel que exportes, dándoles un aspecto más profesional.
          </Text>
        </View>
      </View>

      {/* Botón guardar */}
      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: colorSeleccionado }]}
        onPress={guardarConfiguracion}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          <>
            <Ionicons name="checkmark-circle" size={24} color={Colors.white} />
            <Text style={styles.saveButtonText}>Guardar Configuración</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
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
    marginTop: 12,
    fontSize: 16,
    color: Colors.gray,
  },
  previewCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderTopWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  previewIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewText: {
    flex: 1,
  },
  previewNombre: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.dark,
  },
  previewSubtitle: {
    fontSize: 14,
    color: Colors.gray,
    marginTop: 2,
  },
  previewInfo: {
    gap: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
  },
  previewInfoText: {
    fontSize: 14,
    color: Colors.gray,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 8,
  },
  sectionDesc: {
    fontSize: 14,
    color: Colors.gray,
    marginBottom: 16,
    lineHeight: 20,
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
    backgroundColor: Colors.white,
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
  coloresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  colorBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  colorBtnSeleccionado: {
    borderWidth: 3,
    borderColor: Colors.dark,
  },
  colorNombre: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark,
    textAlign: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  infoCardText: {
    flex: 1,
  },
  infoCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.dark,
    marginBottom: 4,
  },
  infoCardDesc: {
    fontSize: 14,
    color: Colors.gray,
    lineHeight: 20,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ConfiguracionNegocioScreen;