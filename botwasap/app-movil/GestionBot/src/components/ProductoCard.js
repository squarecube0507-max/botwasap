// src/components/ProductoCard.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../utils/colors';
import { formatearTexto, formatearPrecio } from '../services/api';

const ProductoCard = ({ producto, onPress }) => {
  // Formatear nombre del producto
  const nombreFormateado = formatearTexto(producto.nombre);
  
  // Formatear categoría y subcategoría
  const categoriaFormateada = formatearTexto(producto.categoria);
  const subcategoriaFormateada = formatearTexto(producto.subcategoria);

  // Formatear precio
  const precioTexto = producto.precio 
    ? formatearPrecio(producto.precio, producto.unidad)
    : `desde ${formatearPrecio(producto.precio_desde, producto.unidad)}`;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[
            styles.stockIndicator, 
            { backgroundColor: producto.stock ? Colors.success : Colors.danger }
          ]} />
          <View style={styles.infoContainer}>
            <Text style={styles.nombre} numberOfLines={2}>
              {nombreFormateado}
            </Text>
            <Text style={styles.categoria} numberOfLines={1}>
              {categoriaFormateada} › {subcategoriaFormateada}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.gray} />
      </View>

      <View style={styles.footer}>
        <View style={styles.precioContainer}>
          <Text style={styles.precio}>{precioTexto}</Text>
        </View>
        <View style={[
          styles.stockBadge, 
          { backgroundColor: producto.stock ? Colors.success : Colors.danger }
        ]}>
          <Ionicons 
            name={producto.stock ? 'checkmark-circle' : 'close-circle'} 
            size={14} 
            color={Colors.white} 
          />
          <Text style={styles.stockText}>
            {producto.stock ? 'Disponible' : 'Sin stock'}
          </Text>
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
  stockIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
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
  categoria: {
    fontSize: 11,
    color: Colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
  },
  precioContainer: {
    flex: 1,
  },
  precio: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.success,
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  stockText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '600',
  },
});

export default ProductoCard;