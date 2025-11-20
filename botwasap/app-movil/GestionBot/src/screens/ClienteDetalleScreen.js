// src/screens/ClienteDetalleScreen.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../utils/colors';

const ClienteDetalleScreen = ({ route, navigation }) => {
  const { cliente } = route.params;

  const formatearFecha = (isoString) => {
    const fecha = new Date(isoString);
    return fecha.toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getTelefonoFormateado = () => {
    return cliente.telefono.replace('@c.us', '');
  };

  const abrirWhatsApp = () => {
    const telefono = getTelefonoFormateado();
    const mensaje = `Hola ${cliente.nombre}`;
    const url = `whatsapp://send?phone=${telefono}&text=${encodeURIComponent(mensaje)}`;
    Linking.openURL(url);
  };

  const llamarCliente = () => {
    const telefono = getTelefonoFormateado();
    Linking.openURL(`tel:${telefono}`);
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
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {cliente.nombre.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.clienteNombre}>{cliente.nombre}</Text>
        <Text style={styles.clienteTelefono}>{getTelefonoFormateado()}</Text>
      </LinearGradient>

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

      {/* Estadísticas */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Estadísticas</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="cube" size={32} color={Colors.primary} />
            <Text style={styles.statValue}>{cliente.total_pedidos}</Text>
            <Text style={styles.statLabel}>Total Pedidos</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="cash" size={32} color={Colors.success} />
            <Text style={styles.statValue}>${cliente.total_gastado}</Text>
            <Text style={styles.statLabel}>Total Gastado</Text>
          </View>
        </View>
      </View>

      {/* Información */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ℹ️ Información</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Cliente desde:</Text>
            <Text style={styles.infoValue}>{formatearFecha(cliente.fecha_registro)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Última interacción:</Text>
            <Text style={styles.infoValue}>{formatearFecha(cliente.ultima_interaccion)}</Text>
          </View>
        </View>
      </View>

      {/* Historial de pedidos */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 Últimos Pedidos</Text>
        {cliente.pedidos && cliente.pedidos.length > 0 ? (
          cliente.pedidos.slice(-5).reverse().map((pedido, index) => (
            <View key={index} style={styles.pedidoCard}>
              <View style={styles.pedidoHeader}>
                <Text style={styles.pedidoId}>{pedido.id}</Text>
                <Text style={styles.pedidoTotal}>${pedido.total}</Text>
              </View>
              <Text style={styles.pedidoFecha}>
                {formatearFecha(pedido.fecha)}
              </Text>
              <Text style={styles.pedidoProductos}>
                {pedido.productos.length} producto{pedido.productos.length !== 1 ? 's' : ''}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>Aún no ha realizado pedidos</Text>
        )}
      </View>
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
    padding: 32,
    alignItems: 'center',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.white,
  },
  clienteNombre: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 4,
  },
  clienteTelefono: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  contactButtons: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
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
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.dark,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.gray,
    marginTop: 4,
    textAlign: 'center',
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
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.gray,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark,
    textTransform: 'capitalize',
  },
  pedidoCard: {
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
  pedidoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  pedidoId: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  pedidoTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.success,
  },
  pedidoFecha: {
    fontSize: 12,
    color: Colors.gray,
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  pedidoProductos: {
    fontSize: 12,
    color: Colors.gray,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.gray,
    textAlign: 'center',
    paddingVertical: 32,
  },
});

export default ClienteDetalleScreen;