// src/screens/ExportImportScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import Colors from '../utils/colors';
import { getProductos, getCategorias, crearProducto, actualizarProducto } from '../services/api';
import {
  exportarProductosExcel,
  compartirExcel,
  importarProductosExcel,
} from '../services/excelService';
import { getNegocioConfig } from '../services/negocioConfig';

const ExportImportScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [config, setConfig] = useState(null);

  // Opciones de exportación
  const [incluirPrecios, setIncluirPrecios] = useState(true);
  const [incluirCodigos, setIncluirCodigos] = useState(true);
  const [incluirStock, setIncluirStock] = useState(true);
  const [soloConStock, setSoloConStock] = useState(false);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('todas');
  const [formato, setFormato] = useState('xlsx'); // 'xlsx' o 'csv'

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [prods, cats, cfg] = await Promise.all([
        getProductos(),
        getCategorias(),
        getNegocioConfig(),
      ]);
      setProductos(prods);
      setCategorias(cats);
      setConfig(cfg);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const handleExportar = async () => {
    try {
      setLoading(true);

      // Filtrar productos según opciones
      let productosFiltrados = [...productos];

      if (soloConStock) {
        productosFiltrados = productosFiltrados.filter(p => p.stock);
      }

      if (categoriaSeleccionada !== 'todas') {
        productosFiltrados = productosFiltrados.filter(
          p => p.categoria === categoriaSeleccionada
        );
      }

      if (productosFiltrados.length === 0) {
        Alert.alert('Sin productos', 'No hay productos con los filtros seleccionados');
        setLoading(false);
        return;
      }

      // Generar Excel
      const opciones = {
        incluirPrecios,
        incluirCodigos,
        incluirStock,
        formato,
      };

      const resultado = await exportarProductosExcel(productosFiltrados, opciones);

      if (resultado.success) {
        Alert.alert(
          '✅ Archivo generado',
          `Se exportaron ${productosFiltrados.length} productos.\n\n¿Deseas compartir el archivo?`,
          [
            {
              text: 'Compartir',
              onPress: async () => {
                const compartir = await compartirExcel(
                  resultado.uri,
                  resultado.filename
                );
                if (compartir.success) {
                  Alert.alert('✅ Éxito', 'Archivo compartido correctamente');
                }
              },
            },
            {
              text: 'OK',
              style: 'cancel',
            },
          ]
        );
      } else {
        Alert.alert('Error', resultado.error || 'No se pudo generar el archivo');
      }
    } catch (error) {
      console.error('Error al exportar:', error);
      Alert.alert('Error', error.message || 'Error al exportar productos');
    } finally {
      setLoading(false);
    }
  };

  const handleImportar = async () => {
    try {
      // Seleccionar archivo
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv',
        ],
        copyToCacheDirectory: true,
      });

      console.log('📄 DocumentPicker result:', result);
     
      if (result.canceled || !result.assets || result.assets.length === 0) {
        console.log('❌ Selección cancelada o sin archivos');
        return;
      }

      const fileUri = result.assets[0].uri;

      if (!fileUri) {
        Alert.alert('Error', 'No se pudo obtener la ruta del archivo');
        return;
      }

      console.log('📂 URI del archivo:', fileUri);

      setLoading(true);

      // Importar productos
      const importResult = await importarProductosExcel(fileUri);

      if (!importResult.success) {
        Alert.alert('Error', importResult.error || 'No se pudo leer el archivo');
        setLoading(false);
        return;
      }

      const { productos: productosImportados, errores } = importResult;

      if (productosImportados.length === 0) {
        Alert.alert('Sin datos', 'No se encontraron productos válidos en el archivo');
        setLoading(false);
        return;
      }

      // Mostrar opciones de importación
      Alert.alert(
        '📋 Modo de importación',
        `Se encontraron ${productosImportados.length} productos.\n${
          errores.length > 0 ? `⚠️ ${errores.length} errores encontrados\n\n` : ''
        }¿Qué deseas hacer?`,
        [
          {
            text: 'Cancelar',
            style: 'cancel',
            onPress: () => setLoading(false),
          },
          {
            text: 'Solo crear nuevos',
            onPress: () => confirmarImportacion(productosImportados, 'crear'),
          },
          {
            text: 'Crear y actualizar',
            onPress: () => confirmarImportacion(productosImportados, 'actualizar'),
            style: 'default',
          },
        ]
      );
    } catch (error) {
      console.error('Error al importar:', error);
      Alert.alert('Error', error.message || 'Error al importar productos');
      setLoading(false);
    }
  };

  const mostrarErrores = (errores) => {
    const mensaje = errores
      .slice(0, 5)
      .map(e => `Fila ${e.fila}: ${e.error}`)
      .join('\n\n');
    
    Alert.alert(
      '⚠️ Errores encontrados',
      `${mensaje}\n\n${errores.length > 5 ? `... y ${errores.length - 5} más` : ''}`,
      [{ text: 'OK' }]
    );
    setLoading(false);
  };

  const confirmarImportacion = async (productosImportados, modo) => {
    try {
      let creados = 0;
      let actualizados = 0;
      let fallidos = 0;
      const erroresDetalle = [];

      console.log(`\n🚀 Iniciando importación en modo: ${modo}`);
      console.log(`📦 Total de productos: ${productosImportados.length}`);

      for (const productoNuevo of productosImportados) {
        try {
          console.log(`\n📝 Procesando: ${productoNuevo.nombre}`);
          
          // Intentar crear el producto
          await crearProducto(productoNuevo);
          creados++;
          console.log(`✅ Producto creado: ${productoNuevo.nombre}`);
          
        } catch (error) {
          const errorMsg = error.response?.data?.error || error.message;
          const esDuplicado = errorMsg.includes('Ya existe') || errorMsg.includes('ya existe');
          
          if (esDuplicado && modo === 'actualizar') {
            // Producto existe y queremos actualizarlo
            try {
              // Generar el ID del producto
              const id = `${productoNuevo.categoria}::${productoNuevo.subcategoria}::${productoNuevo.nombre}`;
              
              console.log(`🔄 Producto existente, actualizando: ${id}`);
              
              // Buscar el producto existente para comparar
              const productoExistente = productos.find(p => p.id === id);
              
              if (productoExistente) {
                // Actualizar solo los campos que cambiaron
                const datosActualizados = {};
                
                if (productoNuevo.precio !== undefined && productoNuevo.precio !== productoExistente.precio) {
                  datosActualizados.precio = productoNuevo.precio;
                }
                
                if (productoNuevo.precio_desde !== undefined && productoNuevo.precio_desde !== productoExistente.precio_desde) {
                  datosActualizados.precio_desde = productoNuevo.precio_desde;
                }
                
                if (productoNuevo.unidad !== undefined && productoNuevo.unidad !== productoExistente.unidad) {
                  datosActualizados.unidad = productoNuevo.unidad;
                }
                
                if (productoNuevo.stock !== productoExistente.stock) {
                  datosActualizados.stock = productoNuevo.stock;
                }
                
                if (productoNuevo.codigo_barras !== undefined && productoNuevo.codigo_barras !== productoExistente.codigo_barras) {
                  datosActualizados.codigo_barras = productoNuevo.codigo_barras;
                }
                
                if (Object.keys(datosActualizados).length > 0) {
                  await actualizarProducto(id, datosActualizados);
                  actualizados++;
                  console.log(`✅ Producto actualizado: ${productoNuevo.nombre}`, datosActualizados);
                } else {
                  console.log(`ℹ️ Sin cambios para: ${productoNuevo.nombre}`);
                }
              } else {
                console.warn(`⚠️ Producto no encontrado en la lista local: ${id}`);
                fallidos++;
                erroresDetalle.push({
                  nombre: productoNuevo.nombre,
                  error: 'No encontrado en la lista local',
                  esDuplicado: false,
                });
              }
            } catch (updateError) {
              console.error(`❌ Error al actualizar: ${productoNuevo.nombre}`, updateError);
              fallidos++;
              erroresDetalle.push({
                nombre: productoNuevo.nombre,
                error: updateError.response?.data?.error || updateError.message,
                esDuplicado: false,
              });
            }
          } else {
            // Error de duplicado pero no queremos actualizar, o error diferente
            console.error(`❌ Error al procesar: ${productoNuevo.nombre}`, errorMsg);
            fallidos++;
            erroresDetalle.push({
              nombre: productoNuevo.nombre,
              error: esDuplicado ? 'Ya existe (no actualizado)' : errorMsg,
              esDuplicado,
            });
          }
        }
      }

      setLoading(false);

      console.log(`\n📊 RESULTADO FINAL:`);
      console.log(`✅ Creados: ${creados}`);
      console.log(`🔄 Actualizados: ${actualizados}`);
      console.log(`❌ Fallidos: ${fallidos}`);

      let mensaje = '';
      if (creados > 0) {
        mensaje += `✅ ${creados} producto${creados > 1 ? 's' : ''} creado${creados > 1 ? 's' : ''}.\n`;
      }
      if (actualizados > 0) {
        mensaje += `🔄 ${actualizados} producto${actualizados > 1 ? 's' : ''} actualizado${actualizados > 1 ? 's' : ''}.\n`;
      }
      if (fallidos > 0) {
        const duplicados = erroresDetalle.filter(e => e.esDuplicado).length;
        const otrosErrores = fallidos - duplicados;
        
        if (duplicados > 0 && modo === 'crear') {
          mensaje += `⚠️ ${duplicados} ya existía${duplicados > 1 ? 'n' : ''} (no modificados).\n`;
        }
        if (otrosErrores > 0) {
          mensaje += `❌ ${otrosErrores} error${otrosErrores > 1 ? 'es' : ''}.\n`;
        }
      }

      const titulo = (creados > 0 || actualizados > 0) 
        ? '✅ Importación completada' 
        : '⚠️ Sin cambios';

      Alert.alert(
        titulo,
        mensaje || 'No se realizaron cambios.',
        [
          {
            text: 'OK',
            onPress: () => {
              if (creados > 0 || actualizados > 0) {
                cargarDatos();
                navigation.goBack();
              }
            },
          },
        ]
      );
    } catch (error) {
      setLoading(false);
      console.error('❌ Error general al importar:', error);
      Alert.alert('Error', 'Error al importar productos');
    }
  };

  const mostrarDetalleErrores = (errores) => {
    const mensaje = errores
      .slice(0, 10)
      .map(e => `• ${e.nombre}: ${e.error}`)
      .join('\n\n');
    
    Alert.alert(
      '📋 Detalle de errores',
      `${mensaje}\n\n${errores.length > 10 ? `... y ${errores.length - 10} más` : ''}`,
      [{ text: 'OK' }]
    );
  };

  const irAConfiguracion = () => {
    navigation.navigate('ConfiguracionNegocio');
  };

  if (loading && !config) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header con info del negocio */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>{config?.nombre || 'Mi Negocio'}</Text>
            <Text style={styles.headerSubtitle}>
              {productos.length} productos | {categorias.length} categorías
            </Text>
          </View>
          <TouchableOpacity
            style={styles.configButton}
            onPress={irAConfiguracion}
          >
            <Ionicons name="settings-outline" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>
        {config?.telefono || config?.email ? (
          <View style={styles.headerInfo}>
            {config.telefono && (
              <Text style={styles.headerInfoText}>📞 {config.telefono}</Text>
            )}
            {config.email && (
              <Text style={styles.headerInfoText}>✉️ {config.email}</Text>
            )}
          </View>
        ) : null}
      </View>

      {/* Sección de Exportar */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="cloud-upload-outline" size={28} color={Colors.primary} />
          <Text style={styles.sectionTitle}>Exportar Productos</Text>
        </View>

        {/* Filtros */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Filtros:</Text>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Solo productos con stock</Text>
            <Switch
              value={soloConStock}
              onValueChange={setSoloConStock}
              trackColor={{ false: Colors.lightGray, true: Colors.success }}
              thumbColor={Colors.white}
            />
          </View>

          {categorias.length > 0 && (
            <View style={styles.categoriaSelector}>
              <Text style={styles.switchLabel}>Categoría:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity
                  style={[
                    styles.categoriaBtn,
                    categoriaSeleccionada === 'todas' && styles.categoriaBtnActiva,
                  ]}
                  onPress={() => setCategoriaSeleccionada('todas')}
                >
                  <Text
                    style={[
                      styles.categoriaBtnText,
                      categoriaSeleccionada === 'todas' && styles.categoriaBtnTextActiva,
                    ]}
                  >
                    Todas
                  </Text>
                </TouchableOpacity>
                {categorias.map(cat => (
                  <TouchableOpacity
                    key={cat.nombre}
                    style={[
                      styles.categoriaBtn,
                      categoriaSeleccionada === cat.nombre && styles.categoriaBtnActiva,
                    ]}
                    onPress={() => setCategoriaSeleccionada(cat.nombre)}
                  >
                    <Text
                      style={[
                        styles.categoriaBtnText,
                        categoriaSeleccionada === cat.nombre &&
                          styles.categoriaBtnTextActiva,
                      ]}
                    >
                      {cat.nombre.replace(/_/g, ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Opciones de contenido */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Incluir en el archivo:</Text>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Precios</Text>
            <Switch
              value={incluirPrecios}
              onValueChange={setIncluirPrecios}
              trackColor={{ false: Colors.lightGray, true: Colors.primary }}
              thumbColor={Colors.white}
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Códigos de barras</Text>
            <Switch
              value={incluirCodigos}
              onValueChange={setIncluirCodigos}
              trackColor={{ false: Colors.lightGray, true: Colors.primary }}
              thumbColor={Colors.white}
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Estado de stock</Text>
            <Switch
              value={incluirStock}
              onValueChange={setIncluirStock}
              trackColor={{ false: Colors.lightGray, true: Colors.primary }}
              thumbColor={Colors.white}
            />
          </View>
        </View>

        {/* Formato */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Formato:</Text>

          <View style={styles.formatoRow}>
            <TouchableOpacity
              style={[
                styles.formatoBtn,
                formato === 'xlsx' && styles.formatoBtnActivo,
              ]}
              onPress={() => setFormato('xlsx')}
            >
              <Ionicons
                name={formato === 'xlsx' ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={formato === 'xlsx' ? Colors.primary : Colors.gray}
              />
              <Text
                style={[
                  styles.formatoText,
                  formato === 'xlsx' && styles.formatoTextActivo,
                ]}
              >
                Excel (.xlsx) - Recomendado
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.formatoBtn,
                formato === 'csv' && styles.formatoBtnActivo,
              ]}
              onPress={() => setFormato('csv')}
            >
              <Ionicons
                name={formato === 'csv' ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={formato === 'csv' ? Colors.primary : Colors.gray}
              />
              <Text
                style={[
                  styles.formatoText,
                  formato === 'csv' && styles.formatoTextActivo,
                ]}
              >
                CSV (.csv) - Simple
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Botón de exportar */}
        <TouchableOpacity
          style={[styles.actionButton, styles.exportButton]}
          onPress={handleExportar}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Ionicons name="download-outline" size={24} color={Colors.white} />
              <Text style={styles.actionButtonText}>Exportar y Compartir</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Sección de Importar */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="cloud-download-outline" size={28} color={Colors.success} />
          <Text style={styles.sectionTitle}>Importar Productos</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>📋 Instrucciones:</Text>
          <Text style={styles.infoText}>
            • Exporta primero una plantilla con productos existentes{'\n'}
            • Edita el archivo Excel (cambia precios, agrega productos, etc.){'\n'}
            • Al importar, elige:{'\n'}
            {'  '}- "Solo crear nuevos": Ignora duplicados{'\n'}
            {'  '}- "Crear y actualizar": Crea nuevos Y actualiza precios
          </Text>
        </View>

        {/* Botón de importar */}
        <TouchableOpacity
          style={[styles.actionButton, styles.importButton]}
          onPress={handleImportar}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={24} color={Colors.white} />
              <Text style={styles.actionButtonText}>Seleccionar Archivo</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Info adicional */}
      <View style={styles.infoCard}>
        <Ionicons name="information-circle-outline" size={24} color={Colors.primary} />
        <View style={styles.infoCardText}>
          <Text style={styles.infoCardTitle}>💡 Actualización de precios</Text>
          <Text style={styles.infoCardDesc}>
            Para actualizar precios masivamente: Exporta → Edita precios en Excel → 
            Importa con "Crear y actualizar". Los precios se actualizarán automáticamente.
          </Text>
        </View>
      </View>
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
  headerCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.dark,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.gray,
    marginTop: 4,
  },
  configButton: {
    padding: 8,
  },
  headerInfo: {
    gap: 4,
  },
  headerInfoText: {
    fontSize: 13,
    color: Colors.gray,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.dark,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.dark,
    marginBottom: 12,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 15,
    color: Colors.dark,
  },
  categoriaSelector: {
    marginTop: 12,
  },
  categoriaBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.background,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  categoriaBtnActiva: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoriaBtnText: {
    fontSize: 14,
    color: Colors.gray,
    fontWeight: '500',
  },
  categoriaBtnTextActiva: {
    color: Colors.white,
    fontWeight: '600',
  },
  formatoRow: {
    gap: 12,
  },
  formatoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  formatoBtnActivo: {
    backgroundColor: Colors.white,
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  formatoText: {
    fontSize: 15,
    color: Colors.gray,
  },
  formatoTextActivo: {
    color: Colors.primary,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  exportButton: {
    backgroundColor: Colors.primary,
  },
  importButton: {
    backgroundColor: Colors.success,
  },
  actionButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoText: {
    fontSize: 14,
    color: Colors.gray,
    lineHeight: 22,
  },
  infoCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.success,
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
});

export default ExportImportScreen;