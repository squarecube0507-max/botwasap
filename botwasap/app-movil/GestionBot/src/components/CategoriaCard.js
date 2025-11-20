// src/components/CategoriaCard.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../utils/colors';
import { formatearTexto } from '../services/api';

const CategoriaCard = ({ categoria, onPress, onEdit, onDelete }) => {
  const nombreFormateado = formatearTexto(categoria.nombre);
  const totalProductos = categoria.total_productos || 0;
  const tieneProductos = totalProductos > 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconContainer}>
            <Ionicons name="folder" size={24} color={Colors.primary} />
          </View>
          <View style={styles.infoContainer}>
            <Text style={styles.nombre} numberOfLines={1}>
              {nombreFormateado}
            </Text>
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Ionicons name="pricetag" size={14} color={Colors.gray} />
                <Text style={styles.statText}>
                  {totalProductos} {totalProductos === 1 ? 'producto' : 'productos'}
                </Text>
              </View>
            </View>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.gray} />
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={(e) => {
            e.stopPropagation();
            onEdit(categoria);
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="pencil" size={18} color={Colors.primary} />
          <Text style={styles.actionButtonText}>Editar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            !tieneProductos && styles.actionButtonDanger
          ]}
          onPress={(e) => {
            e.stopPropagation();
            onDelete(categoria);
          }}
          activeOpacity={0.7}
          disabled={tieneProductos}
        >
          <Ionicons 
            name="trash" 
            size={18} 
            color={tieneProductos ? Colors.lightGray : Colors.danger} 
          />
          <Text style={[
            styles.actionButtonText,
            tieneProductos ? styles.actionButtonTextDisabled : styles.actionButtonTextDanger
          ]}>
            {tieneProductos ? 'Bloqueado' : 'Eliminar'}
          </Text>
        </TouchableOpacity>
      </View>

      {tieneProductos && (
        <View style={styles.warningBadge}>
          <Ionicons name="lock-closed" size={12} color={Colors.warning} />
          <Text style={styles.warningText}>
            No se puede eliminar mientras tenga productos
          </Text>
        </View>
      )}
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
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    flex: 1,
    paddingRight: 8,
  },
  nombre: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark,
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: Colors.gray,
  },
  footer: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  actionButtonDanger: {
    borderColor: Colors.danger,
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  actionButtonTextDanger: {
    color: Colors.danger,
  },
  actionButtonTextDisabled: {
    color: Colors.lightGray,
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    padding: 8,
    backgroundColor: '#FFF9E6',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: Colors.warning,
  },
  warningText: {
    fontSize: 11,
    color: Colors.warning,
    fontWeight: '500',
    flex: 1,
  },
});

export default CategoriaCard;