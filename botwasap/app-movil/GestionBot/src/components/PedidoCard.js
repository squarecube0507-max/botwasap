// src/components/PedidoCard.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../utils/colors';

const PedidoCard = ({ pedido, onPress }) => {
  const formatearFecha = (isoString) => {
    const fecha = new Date(isoString);
    return fecha.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'confirmado':
      case 'pendiente':
        return Colors.warning;
      case 'completado':
        return Colors.success;
      case 'cancelado':
        return Colors.danger;
      default:
        return Colors.gray;
    }
  };

  const abrirWhatsApp = () => {
    const telefono = pedido.cliente.replace('@c.us', '');
    const mensaje = `Hola ${pedido.nombre}, tu pedido ${pedido.id} está listo.`;
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

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.pedidoId}>{pedido.id}</Text>
          <View style={[styles.estadoBadge, { backgroundColor: getEstadoColor(pedido.estado) }]}>
            <Text style={styles.estadoText}>{pedido.estado}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.whatsappButton}
          onPress={abrirWhatsApp}
        >
          <Ionicons name="logo-whatsapp" size={24} color={Colors.success} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.infoRow}>
          <Ionicons name="person" size={16} color={Colors.gray} />
          <Text style={styles.infoText}>{pedido.nombre}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="cube" size={16} color={Colors.gray} />
          <Text style={styles.infoText}>
            {pedido.productos.length} producto{pedido.productos.length !== 1 ? 's' : ''}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons
            name={pedido.tipo_entrega === 'delivery' ? 'bicycle' : 'storefront'}
            size={16}
            color={Colors.gray}
          />
          <Text style={styles.infoText}>
            {pedido.tipo_entrega === 'delivery' ? 'Delivery' : 'Retiro'}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="calendar" size={16} color={Colors.gray} />
          <Text style={styles.infoText}>{formatearFecha(pedido.fecha)}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.totalLabel}>Total:</Text>
        <Text style={styles.totalValue}>${pedido.total}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pedidoId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  estadoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  estadoText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  whatsappButton: {
    padding: 8,
  },
  content: {
    marginBottom: 12,
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: Colors.dark,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
  },
  totalLabel: {
    fontSize: 14,
    color: Colors.gray,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.success,
  },
});

export default PedidoCard;