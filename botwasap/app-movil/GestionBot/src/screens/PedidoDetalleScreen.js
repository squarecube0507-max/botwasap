// src/screens/PedidoDetalleScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../utils/colors';
import { marcarPedidoCompletado } from '../services/api';

const PedidoDetalleScreen = ({ route, navigation }) => {
  const { pedido: pedidoInicial } = route.params;
  const [pedido, setPedido] = useState(pedidoInicial);
  const [loading, setLoading] = useState(false);

  const formatearFecha = (isoString) => {
    const fecha = new Date(isoString);
    return fecha.toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const abrirWhatsApp = () => {
    const telefono = pedido.cliente.replace('@c.us', '');
    const mensaje = `Hola ${pedido.nombre}, respecto a tu pedido ${pedido.id}...`;
    const url = `whatsapp://send?phone=${telefono}&text=${encodeURIComponent(mensaje)}`;
    
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          Alert.alert('Error', 'No se puede abrir WhatsApp');
        }
      })
      .catch((err) => console.error('Error al abrir WhatsApp:', err));
  };

  const llamarCliente = () => {
    const telefono = pedido.cliente.replace('@c.us', '');
    const url = `tel:${telefono}`;
    Linking.openURL(url);
  };

  const marcarCompletado = () => {
    Alert.alert(
      'Confirmar',
      '¿Marcar este pedido como completado?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Completar',
          style: 'default',
          onPress: async () => {
            try {
              setLoading(true);
              await marcarPedidoCompletado(pedido.id);
              setPedido({ ...pedido, estado: 'completado' });
              Alert.alert('✅ Éxito', 'Pedido marcado como completado');
              navigation.goBack();
            } catch (error) {
              console.error('Error al completar pedido:', error);
              Alert.alert('Error', 'No se pudo completar el pedido');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header con gradient */}
      <LinearGradient
        colors={Colors.gradientPrimary}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.pedidoId}>{pedido.id}</Text>
        <View style={styles.estadoContainer}>
          <Text style={styles.estadoLabel}>Estado:</Text>
          <View style={[
            styles.estadoBadge,
            pedido.estado === 'completado' && styles.estadoCompletado,
            pedido.estado === 'cancelado' && styles.estadoCancelado,
          ]}>
            <Text style={styles.estadoText}>{pedido.estado}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Información del cliente */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👤 Cliente</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Nombre:</Text>
            <Text style={styles.infoValue}>{pedido.nombre}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Teléfono:</Text>
            <Text style={styles.infoValue}>
              {pedido.cliente.replace('@c.us', '')}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Fecha:</Text>
            <Text style={styles.infoValue}>{formatearFecha(pedido.fecha)}</Text>
          </View>
        </View>

        {/* Botones de contacto */}
        <View style={styles.contactButtons}>
          <TouchableOpacity style={styles.contactBtn} onPress={abrirWhatsApp}>
            <Ionicons name="logo-whatsapp" size={24} color={Colors.white} />
            <Text style={styles.contactBtnText}>WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.contactBtnSecondary} onPress={llamarCliente}>
            <Ionicons name="call" size={24} color={Colors.primary} />
            <Text style={styles.contactBtnTextSecondary}>Llamar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Productos */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📦 Productos</Text>
        {pedido.productos.map((producto, index) => (
          <View key={index} style={styles.productoCard}>
            <View style={styles.productoHeader}>
              <Text style={styles.productoNombre}>{producto.nombre}</Text>
              <Text style={styles.productoSubtotal}>${producto.subtotal}</Text>
            </View>
            <View style={styles.productoDetalle}>
              <Text style={styles.productoInfo}>
                Cantidad: {producto.cantidad}
              </Text>
              <Text style={styles.productoInfo}>
                Precio unitario: ${producto.precio_unitario}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Resumen de pago */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💰 Resumen</Text>
        <View style={styles.card}>
          <View style={styles.resumenRow}>
            <Text style={styles.resumenLabel}>Subtotal:</Text>
            <Text style={styles.resumenValue}>${pedido.subtotal}</Text>
          </View>
          {pedido.descuento > 0 && (
            <View style={styles.resumenRow}>
              <Text style={styles.resumenLabel}>Descuento:</Text>
              <Text style={styles.resumenDescuento}>-${pedido.descuento}</Text>
            </View>
          )}
          {pedido.delivery > 0 && (
            <View style={styles.resumenRow}>
              <Text style={styles.resumenLabel}>Delivery:</Text>
              <Text style={styles.resumenValue}>+${pedido.delivery}</Text>
            </View>
          )}
          <View style={styles.divider} />
          <View style={styles.resumenRow}>
            <Text style={styles.resumenLabelTotal}>TOTAL:</Text>
            <Text style={styles.resumenTotal}>${pedido.total}</Text>
          </View>
        </View>
      </View>

      {/* Información de entrega */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🚚 Entrega</Text>
        <View style={styles.card}>
          <View style={styles.entregaInfo}>
            <Ionicons
              name={pedido.tipo_entrega === 'delivery' ? 'bicycle' : 'storefront'}
              size={32}
              color={Colors.primary}
            />
            <Text style={styles.entregaTipo}>
              {pedido.tipo_entrega === 'delivery' ? 'Delivery' : 'Retiro en local'}
            </Text>
          </View>
        </View>
      </View>

      {/* Botón de acción */}
      {pedido.estado === 'confirmado' && (
        <TouchableOpacity
          style={styles.completarBtn}
          onPress={marcarCompletado}
          disabled={loading}
        >
          <LinearGradient
            colors={Colors.gradientSuccess}
            style={styles.completarBtnGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="checkmark-circle" size={24} color={Colors.white} />
            <Text style={styles.completarBtnText}>
              {loading ? 'Procesando...' : 'Marcar como Completado'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
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
    paddingBottom: 32,
  },
  headerGradient: {
    padding: 24,
    alignItems: 'center',
  },
  pedidoId: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 8,
  },
  estadoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  estadoLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  estadoBadge: {
    backgroundColor: 'rgba(237, 137, 54, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  estadoCompletado: {
    backgroundColor: 'rgba(72, 187, 120, 0.9)',
  },
  estadoCancelado: {
    backgroundColor: 'rgba(245, 101, 101, 0.9)',
  },
  estadoText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  section: {
    padding: 16,
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.gray,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark,
  },
  contactButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.success,
    padding: 14,
    borderRadius: 10,
  },
  contactBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  contactBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.white,
    padding: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  contactBtnTextSecondary: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  productoCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  productoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  productoNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark,
    flex: 1,
  },
  productoSubtotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.success,
  },
  productoDetalle: {
    flexDirection: 'row',
    gap: 16,
  },
  productoInfo: {
    fontSize: 12,
    color: Colors.gray,
  },
  resumenRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  resumenLabel: {
    fontSize: 14,
    color: Colors.gray,
  },
  resumenValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark,
  },
  resumenDescuento: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.success,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.lightGray,
    marginVertical: 12,
  },
  resumenLabelTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark,
  },
  resumenTotal: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.success,
  },
  entregaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  entregaTipo: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark,
  },
  completarBtn: {
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  completarBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 16,
  },
  completarBtnText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default PedidoDetalleScreen;