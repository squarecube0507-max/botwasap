// src/components/ClienteCard.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../utils/colors';

const ClienteCard = ({ cliente, onPress }) => {
  const formatearFecha = (isoString) => {
    const fecha = new Date(isoString);
    return fecha.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getTelefonoFormateado = (telefono) => {
    return telefono.replace('@c.us', '');
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {cliente.nombre.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.infoContainer}>
          <Text style={styles.nombre}>{cliente.nombre}</Text>
          <Text style={styles.telefono}>{getTelefonoFormateado(cliente.telefono)}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.gray} />
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Ionicons name="cube" size={16} color={Colors.primary} />
          <Text style={styles.statValue}>{cliente.total_pedidos}</Text>
          <Text style={styles.statLabel}>pedidos</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.statItem}>
          <Ionicons name="cash" size={16} color={Colors.success} />
          <Text style={styles.statValue}>${cliente.total_gastado}</Text>
          <Text style={styles.statLabel}>gastado</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.statItem}>
          <Ionicons name="calendar" size={16} color={Colors.gray} />
          <Text style={styles.statValue}>{formatearFecha(cliente.fecha_registro)}</Text>
          <Text style={styles.statLabel}>cliente desde</Text>
        </View>
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
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.white,
  },
  infoContainer: {
    flex: 1,
  },
  nombre: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark,
    marginBottom: 4,
  },
  telefono: {
    fontSize: 13,
    color: Colors.gray,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.dark,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.gray,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.lightGray,
  },
});

export default ClienteCard;