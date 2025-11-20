// src/screens/RespuestasAutomaticasScreen.js
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../utils/colors';
import { getRespuestas, actualizarRespuestas } from '../services/api';

const RespuestasAutomaticasScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [respuestas, setRespuestas] = useState({
    bienvenida: '',
    catalogo_enviado: '',
    producto_no_disponible: '',
    confirmacion_pedido: '',
    pedido_confirmado: '',
    despedida: '',
    fuera_horario: '',
  });

  const [cambiosRealizados, setCambiosRealizados] = useState(false);

  useEffect(() => {
    cargarRespuestas();
  }, []);

  const cargarRespuestas = async () => {
    try {
      setLoading(true);
      const data = await getRespuestas();
      
      if (data) {
        setRespuestas(data);
      }
    } catch (error) {
      console.error('Error al cargar respuestas:', error);
      Alert.alert('Error', 'No se pudieron cargar las respuestas');
    } finally {
      setLoading(false);
    }
  };

  const handleCambioTexto = (campo, valor) => {
    setRespuestas(prev => ({
      ...prev,
      [campo]: valor,
    }));
    setCambiosRealizados(true);
  };

  const handleGuardar = async () => {
    try {
      // Validar que no haya campos vacíos
      const camposVacios = Object.entries(respuestas).filter(
        ([key, value]) => !value || value.trim() === ''
      );

      if (camposVacios.length > 0) {
        Alert.alert(
          'Campos incompletos',
          'Por favor completa todos los mensajes antes de guardar.'
        );
        return;
      }

      setGuardando(true);

      await actualizarRespuestas(respuestas);

      setCambiosRealizados(false);

      Alert.alert(
        '✅ Guardado',
        'Las respuestas automáticas se actualizaron correctamente',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Error al guardar:', error);
      Alert.alert('Error', error.message || 'No se pudieron guardar los cambios');
    } finally {
      setGuardando(false);
    }
  };

  const handleRestaurarDefecto = (campo) => {
    const mensajesDefecto = {
      bienvenida: '¡Hola! 👋 Bienvenido a nuestro negocio. ¿En qué puedo ayudarte?',
      catalogo_enviado: '📦 Aquí está nuestro catálogo completo de productos:',
      producto_no_disponible: '❌ Lo siento, ese producto no está disponible actualmente.',
      confirmacion_pedido: '📝 Por favor confirma tu pedido:\n\n{detalles_pedido}\n\n¿Es correcto? Responde SÍ para confirmar.',
      pedido_confirmado: '✅ ¡Pedido confirmado! Gracias por tu compra. Te contactaremos pronto.',
      despedida: '¡Gracias por tu consulta! 😊 Que tengas un excelente día.',
      fuera_horario: '🕐 Actualmente estamos fuera del horario de atención. Te responderemos pronto.',
    };

    Alert.alert(
      'Restaurar mensaje por defecto',
      '¿Deseas restaurar este mensaje a su versión por defecto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          style: 'destructive',
          onPress: () => {
            handleCambioTexto(campo, mensajesDefecto[campo]);
          },
        },
      ]
    );
  };

  const configuracionMensajes = [
    {
      campo: 'bienvenida',
      titulo: 'Mensaje de Bienvenida',
      descripcion: 'Primer mensaje que recibe el cliente',
      icono: 'hand-left',
      iconColor: Colors.primary,
      placeholder: 'Ej: ¡Hola! Bienvenido a nuestro negocio...',
      multiline: true,
      maxLength: 500,
    },
    {
      campo: 'catalogo_enviado',
      titulo: 'Catálogo Enviado',
      descripcion: 'Mensaje al enviar el catálogo completo',
      icono: 'list',
      iconColor: Colors.success,
      placeholder: 'Ej: Aquí está nuestro catálogo...',
      multiline: true,
      maxLength: 300,
    },
    {
      campo: 'producto_no_disponible',
      titulo: 'Producto No Disponible',
      descripcion: 'Cuando el cliente busca algo que no existe',
      icono: 'close-circle',
      iconColor: Colors.danger,
      placeholder: 'Ej: Lo siento, ese producto no está disponible...',
      multiline: true,
      maxLength: 300,
    },
    {
      campo: 'confirmacion_pedido',
      titulo: 'Confirmación de Pedido',
      descripcion: 'Solicitar confirmación antes de procesar',
      icono: 'checkmark-circle',
      iconColor: Colors.warning,
      placeholder: 'Ej: Por favor confirma tu pedido...\nUsa {detalles_pedido} para incluir el resumen',
      multiline: true,
      maxLength: 500,
      info: 'Puedes usar {detalles_pedido} para incluir automáticamente el resumen del pedido',
    },
    {
      campo: 'pedido_confirmado',
      titulo: 'Pedido Confirmado',
      descripcion: 'Mensaje final cuando se confirma el pedido',
      icono: 'checkmark-done',
      iconColor: Colors.success,
      placeholder: 'Ej: ¡Pedido confirmado! Gracias por tu compra...',
      multiline: true,
      maxLength: 300,
    },
    {
      campo: 'despedida',
      titulo: 'Despedida',
      descripcion: 'Mensaje de despedida al cliente',
      icono: 'exit',
      iconColor: Colors.primary,
      placeholder: 'Ej: ¡Gracias por tu consulta! Que tengas un excelente día...',
      multiline: true,
      maxLength: 300,
    },
    {
      campo: 'fuera_horario',
      titulo: 'Fuera de Horario',
      descripcion: 'Cuando el bot está pausado o fuera de horario',
      icono: 'time',
      iconColor: Colors.gray,
      placeholder: 'Ej: Actualmente estamos fuera del horario de atención...',
      multiline: true,
      maxLength: 300,
    },
  ];

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Cargando respuestas...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header info */}
        <View style={styles.headerInfo}>
          <Ionicons name="chatbubbles" size={32} color={Colors.primary} />
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Respuestas Automáticas</Text>
            <Text style={styles.headerSubtitle}>
              Personaliza los mensajes que el bot enviará a tus clientes
            </Text>
          </View>
        </View>

        {/* Mensajes */}
        {configuracionMensajes.map((config) => (
          <View key={config.campo} style={styles.mensajeCard}>
            {/* Header del mensaje */}
            <View style={styles.mensajeHeader}>
              <View style={styles.mensajeTitleContainer}>
                <Ionicons name={config.icono} size={24} color={config.iconColor} />
                <View style={styles.mensajeTitleText}>
                  <Text style={styles.mensajeTitulo}>{config.titulo}</Text>
                  <Text style={styles.mensajeDescripcion}>{config.descripcion}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.restaurarBtn}
                onPress={() => handleRestaurarDefecto(config.campo)}
              >
                <Ionicons name="refresh" size={20} color={Colors.gray} />
              </TouchableOpacity>
            </View>

            {/* Input */}
            <TextInput
              style={[
                styles.input,
                config.multiline && styles.inputMultiline,
              ]}
              value={respuestas[config.campo]}
              onChangeText={(text) => handleCambioTexto(config.campo, text)}
              placeholder={config.placeholder}
              placeholderTextColor={Colors.lightGray}
              multiline={config.multiline}
              maxLength={config.maxLength}
              numberOfLines={config.multiline ? 4 : 1}
            />

            {/* Info adicional */}
            {config.info && (
              <View style={styles.infoContainer}>
                <Ionicons name="information-circle" size={16} color={Colors.primary} />
                <Text style={styles.infoText}>{config.info}</Text>
              </View>
            )}

            {/* Contador de caracteres */}
            <Text style={styles.caracteresText}>
              {respuestas[config.campo]?.length || 0} / {config.maxLength}
            </Text>
          </View>
        ))}

        {/* Info variables */}
        <View style={styles.variablesCard}>
          <Text style={styles.variablesTitle}>📝 Variables disponibles:</Text>
          <Text style={styles.variablesText}>
            • <Text style={styles.variableHighlight}>{'{detalles_pedido}'}</Text> - 
            Incluye automáticamente el resumen del pedido{'\n'}
            • <Text style={styles.variableHighlight}>{'{nombre_cliente}'}</Text> - 
            Nombre del cliente (si está disponible){'\n'}
            • <Text style={styles.variableHighlight}>{'{total}'}</Text> - 
            Total del pedido
          </Text>
        </View>

        {/* Botón guardar */}
        {cambiosRealizados && (
          <TouchableOpacity
            style={[styles.guardarBtn, guardando && styles.guardarBtnDisabled]}
            onPress={handleGuardar}
            disabled={guardando}
          >
            {guardando ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color={Colors.white} />
                <Text style={styles.guardarBtnText}>Guardar Cambios</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
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
    marginTop: 12,
    fontSize: 16,
    color: Colors.gray,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  headerInfo: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.gray,
    lineHeight: 20,
  },
  mensajeCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  mensajeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  mensajeTitleContainer: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
  },
  mensajeTitleText: {
    flex: 1,
  },
  mensajeTitulo: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark,
    marginBottom: 2,
  },
  mensajeDescripcion: {
    fontSize: 13,
    color: Colors.gray,
  },
  restaurarBtn: {
    padding: 4,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: Colors.dark,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  inputMultiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    padding: 8,
    backgroundColor: Colors.background,
    borderRadius: 6,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: Colors.gray,
    lineHeight: 16,
  },
  caracteresText: {
    fontSize: 12,
    color: Colors.gray,
    textAlign: 'right',
    marginTop: 4,
  },
  variablesCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  variablesTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.dark,
    marginBottom: 8,
  },
  variablesText: {
    fontSize: 14,
    color: Colors.gray,
    lineHeight: 22,
  },
  variableHighlight: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    backgroundColor: Colors.background,
    color: Colors.primary,
    fontWeight: '600',
  },
  guardarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: Colors.success,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  guardarBtnDisabled: {
    opacity: 0.6,
  },
  guardarBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default RespuestasAutomaticasScreen;