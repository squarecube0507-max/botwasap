// src/screens/ProductoEditScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import axios from 'axios';
import Colors from '../utils/colors';
import { 
  actualizarProducto, 
  crearProducto, 
  eliminarProducto,
  getCategorias,
  validarProducto,
  formatearTexto,
  API_URLS, // ✅ Importar API_URLS desde api.js
} from '../services/api';

const ProductoEditScreen = ({ route, navigation }) => {
  const { producto, codigoBarras } = route.params || {};
  const esNuevo = !producto;

  // Estados del formulario
  const [nombre, setNombre] = useState(producto?.nombre.replace(/_/g, ' ') || '');
  const [categoria, setCategoria] = useState(producto?.categoria || '');
  const [subcategoria, setSubcategoria] = useState(producto?.subcategoria.replace(/_/g, ' ') || '');
  const [tipoPrecio, setTipoPrecio] = useState(producto?.precio ? 'fijo' : 'desde');
  const [precio, setPrecio] = useState(producto?.precio?.toString() || '');
  const [precioDesde, setPrecioDesde] = useState(producto?.precio_desde?.toString() || '');
  const [unidad, setUnidad] = useState(producto?.unidad || '');
  const [stock, setStock] = useState(producto?.stock !== false);
  const [codigoBarrasInput, setCodigoBarrasInput] = useState(producto?.codigo_barras || codigoBarras || '');
  
  // ✅ NUEVOS Estados para imágenes
  const [imagenes, setImagenes] = useState(producto?.imagenes || []);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  
  // Estados auxiliares
  const [loading, setLoading] = useState(false);
  const [categorias, setCategorias] = useState([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);

  useEffect(() => {
    cargarCategorias();
    solicitarPermisos();
  }, []);

  // ✅ Si viene código de barras desde el escáner, mostrarlo
  useEffect(() => {
    if (codigoBarras) {
      setCodigoBarrasInput(codigoBarras);
      console.log('📸 Código de barras recibido:', codigoBarras);
    }
  }, [codigoBarras]);

  // ✅ Solicitar permisos de cámara y galería
  const solicitarPermisos = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
      Alert.alert(
        'Permisos necesarios',
        'Necesitamos permisos para acceder a la cámara y galería'
      );
    }
  };

  const cargarCategorias = async () => {
    try {
      const datos = await getCategorias();
      setCategorias(datos);
    } catch (error) {
      console.error('❌ Error al cargar categorías:', error);
    }
  };

  // ✅ Tomar foto con la cámara
  const tomarFoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        await subirImagen(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error al tomar foto:', error);
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };

  // ✅ Seleccionar de galería
  const elegirDeGaleria = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        await subirImagen(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error al seleccionar imagen:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  // ✅ Subir imagen a Cloudinary
  const subirImagen = async (uri) => {
    if (imagenes.length >= 5) {
      Alert.alert('Límite alcanzado', 'Solo puedes subir hasta 5 imágenes por producto');
      return;
    }

    try {
      setUploadingImage(true);

      // Redimensionar imagen para ahorrar ancho de banda
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1000 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      const formData = new FormData();
      formData.append('imagen', {
        uri: manipulatedImage.uri,
        type: 'image/jpeg',
        name: `producto_${Date.now()}.jpg`,
      });
      formData.append('productoId', producto?.id || 'nuevo');
      formData.append('categoriaId', categoria || producto?.categoria || '');
      formData.append('subcategoriaId', subcategoria || producto?.subcategoria || '');

      console.log('📤 Subiendo imagen a Cloudinary...');
      console.log('📡 URL:', API_URLS.productosImagen);

      const uploadResponse = await axios.post(
        API_URLS.productosImagen, // ✅ Usa API_URLS importado
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 30000,
        }
      );

      console.log('✅ Imagen subida:', uploadResponse.data);

      // Agregar a la lista local
      setImagenes([...imagenes, uploadResponse.data.imagen]);

      Alert.alert('Éxito', 'Imagen subida correctamente');

    } catch (error) {
      console.error('❌ Error al subir imagen:', error);
      Alert.alert(
        'Error',
        error.response?.data?.detalle || 'No se pudo subir la imagen. Verifica tu conexión.'
      );
    } finally {
      setUploadingImage(false);
    }
  };

  // ✅ Eliminar imagen
  const eliminarImagen = async (imagen, index) => {
    Alert.alert(
      'Confirmar',
      '¿Estás seguro de eliminar esta imagen?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);

              await axios.delete(
                API_URLS.productosImagen, // ✅ Usa API_URLS importado
                {
                  data: {
                    productoId: producto?.id || 'nuevo',
                    categoriaId: categoria || producto?.categoria || '',
                    subcategoriaId: subcategoria || producto?.subcategoria || '',
                    publicId: imagen.public_id,
                  },
                }
              );

              const nuevasImagenes = imagenes.filter((_, i) => i !== index);
              setImagenes(nuevasImagenes);

              Alert.alert('Éxito', 'Imagen eliminada');

            } catch (error) {
              console.error('Error al eliminar imagen:', error);
              Alert.alert('Error', 'No se pudo eliminar la imagen');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // ✅ Mostrar opciones de imagen
  const mostrarOpcionesImagen = () => {
    Alert.alert(
      'Agregar Imagen',
      'Selecciona una opción',
      [
        {
          text: 'Tomar Foto',
          onPress: tomarFoto,
        },
        {
          text: 'Desde Galería',
          onPress: elegirDeGaleria,
        },
        {
          text: 'Cancelar',
          style: 'cancel',
        },
      ]
    );
  };

  const cambiarTipoPrecio = (tipo) => {
    setTipoPrecio(tipo);
    if (tipo === 'fijo') {
      setPrecioDesde('');
    } else {
      setPrecio('');
    }
  };

  const validarFormulario = () => {
    const errores = [];

    if (!nombre.trim()) {
      errores.push('El nombre del producto es obligatorio');
    }

    if (esNuevo) {
      if (!categoria.trim()) {
        errores.push('La categoría es obligatoria');
      }
      if (!subcategoria.trim()) {
        errores.push('La subcategoría es obligatoria');
      }
    } else {
      if (subcategoria && !subcategoria.trim()) {
        errores.push('La subcategoría no puede estar vacía');
      }
    }

    if (!precio.trim() && !precioDesde.trim()) {
      errores.push('Debes ingresar un precio (fijo o desde)');
    }

    if (precio.trim() && precioDesde.trim()) {
      errores.push('Solo puedes usar precio fijo O precio desde, no ambos');
    }

    if (precio.trim() && (isNaN(precio) || parseFloat(precio) <= 0)) {
      errores.push('El precio debe ser un número mayor a 0');
    }

    if (precioDesde.trim() && (isNaN(precioDesde) || parseFloat(precioDesde) <= 0)) {
      errores.push('El precio desde debe ser un número mayor a 0');
    }

    if (errores.length > 0) {
      Alert.alert('Errores de validación', errores.join('\n\n'));
      return false;
    }

    return true;
  };

const guardarProducto = async () => {
    if (!validarFormulario()) return;

    try {
      setLoading(true);

      // ✅ Inicializar datos SIN el nombre
      const datos = {
        stock: stock,
        imagenes: imagenes,
      };

      if (tipoPrecio === 'fijo' && precio.trim()) {
        datos.precio = parseFloat(precio);
      } else if (tipoPrecio === 'desde' && precioDesde.trim()) {
        datos.precio_desde = parseFloat(precioDesde);
      }

      if (unidad.trim()) {
        datos.unidad = unidad.trim();
      }

      if (codigoBarrasInput.trim()) {
        datos.codigo_barras = codigoBarrasInput.trim();
      }

      if (esNuevo) {
        // ✅ Al CREAR, usar "nombre"
        datos.nombre = nombre.trim();
        datos.categoria = categoria.trim();
        datos.subcategoria = subcategoria.trim();
        
        console.log('📤 Creando producto:', datos);
        
        await crearProducto(datos);
        
        Alert.alert(
          '✅ Éxito',
          'Producto creado correctamente',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        // ✅ Al EDITAR, usar "nuevo_nombre" solo si cambió
        const nombreOriginal = producto.nombre.replace(/_/g, ' ');
        const nombreActual = nombre.trim();
        
        console.log('🔍 Verificando cambio de nombre:');
        console.log('   Nombre original:', nombreOriginal);
        console.log('   Nombre actual:', nombreActual);
        
        if (nombreActual !== nombreOriginal) {
          datos.nuevo_nombre = nombreActual;
          console.log('✅ Nombre cambió, enviando nuevo_nombre');
        } else {
          console.log('⏭️ Nombre NO cambió, no se envía');
        }
        
        // Si cambió la subcategoría
        const subcategoriaOriginal = producto.subcategoria.replace(/_/g, ' ');
        const subcategoriaActual = subcategoria.trim();
        
        if (subcategoriaActual && subcategoriaActual !== subcategoriaOriginal) {
          datos.subcategoria = subcategoriaActual;
        }
        
        console.log('📤 Actualizando producto:', producto.id, datos);
        
        await actualizarProducto(producto.id, datos);
        
        Alert.alert(
          '✅ Éxito',
          'Producto actualizado correctamente',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      console.error('❌ Error al guardar producto:', error);
      
      const mensajeError = error.response?.data?.error || error.message || 'Error desconocido';
      
      Alert.alert(
        'Error al guardar',
        mensajeError,
        [
          { text: 'Reintentar', onPress: guardarProducto },
          { text: 'Cancelar', style: 'cancel' },
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const eliminar = () => {
    Alert.alert(
      '⚠️ Confirmar eliminación',
      `¿Estás seguro de eliminar "${formatearTexto(producto.nombre)}"?\n\nEsta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              console.log('🗑️ Eliminando producto:', producto.id);
              
              await eliminarProducto(producto.id);
              
              Alert.alert(
                '✅ Éxito',
                'Producto eliminado correctamente',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
              );
            } catch (error) {
              console.error('❌ Error al eliminar:', error);
              
              const mensajeError = error.response?.data?.error || error.message || 'Error desconocido';
              
              Alert.alert('Error al eliminar', mensajeError);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const seleccionarCategoria = (cat) => {
    setCategoria(cat.nombre);
    setMostrarSugerencias(false);
  };

  const abrirEscanerParaCodigo = () => {
    navigation.navigate('BarcodeScanner', {
      onScan: (codigo) => {
        setCodigoBarrasInput(codigo);
        console.log('📸 Código asignado:', codigo);
      },
      modo: 'asignar',
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.form}>
          {/* ✅ SECCIÓN DE IMÁGENES */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              📷 Imágenes del producto ({imagenes.length}/5)
            </Text>
            
            <View style={styles.imagenesContainer}>
              {/* Imágenes existentes */}
              {imagenes.map((imagen, index) => (
                <View key={index} style={styles.imagenItem}>
                  <TouchableOpacity
                    onPress={() => setSelectedImage(imagen.url)}
                    activeOpacity={0.7}
                  >
                    <Image
                      source={{ uri: imagen.url }}
                      style={styles.imagenPreview}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteImageButton}
                    onPress={() => eliminarImagen(imagen, index)}
                  >
                    <Ionicons name="close-circle" size={24} color={Colors.danger} />
                  </TouchableOpacity>
                  {index === 0 && (
                    <View style={styles.principalBadge}>
                      <Text style={styles.principalText}>Principal</Text>
                    </View>
                  )}
                </View>
              ))}

              {/* Botón agregar imagen */}
              {imagenes.length < 5 && (
                <TouchableOpacity
                  style={styles.addImageButton}
                  onPress={mostrarOpcionesImagen}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <>
                      <Ionicons name="camera" size={32} color={Colors.primary} />
                      <Text style={styles.addImageText}>Agregar</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {imagenes.length === 0 ? (
              <Text style={styles.hint}>
                💡 La primera imagen será la principal que verán los clientes
              </Text>
            ) : (
              <Text style={styles.hint}>
                ✅ {imagenes.length} {imagenes.length === 1 ? 'imagen agregada' : 'imágenes agregadas'}
              </Text>
            )}
          </View>

          {/* Nombre del producto */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Nombre del producto *
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Cuaderno A4 Tapa Dura"
              value={nombre}
              onChangeText={setNombre}
              placeholderTextColor={Colors.gray}
              autoCapitalize="words"
            />
            <Text style={styles.hint}>
              💡 Puedes usar mayúsculas y espacios (se normalizarán automáticamente)
            </Text>
          </View>

          {/* Código de barras con botón de escáner */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Código de barras (opcional)
            </Text>
            <View style={styles.codigoBarrasContainer}>
              <TextInput
                style={[styles.input, styles.codigoBarrasInput]}
                placeholder="7790123456789"
                value={codigoBarrasInput}
                onChangeText={setCodigoBarrasInput}
                placeholderTextColor={Colors.gray}
                keyboardType="numeric"
              />
              <TouchableOpacity
                style={styles.scanIconButton}
                onPress={abrirEscanerParaCodigo}
              >
                <Ionicons name="barcode" size={24} color={Colors.primary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.hint}>
              📸 Escanea el código de barras o ingrésalo manualmente
            </Text>
          </View>

          {/* Categoría (solo al crear) */}
          {esNuevo && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Categoría *
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: Librería, Cotillón, Juguetería"
                value={categoria}
                onChangeText={(text) => {
                  setCategoria(text);
                  setMostrarSugerencias(text.length > 0);
                }}
                placeholderTextColor={Colors.gray}
                autoCapitalize="words"
              />
              <Text style={styles.hint}>
                💡 Puedes usar espacios y mayúsculas
              </Text>
              
              {/* Sugerencias de categorías existentes */}
              {mostrarSugerencias && categorias.length > 0 && (
                <View style={styles.sugerenciasContainer}>
                  <Text style={styles.sugerenciasTitle}>Categorías existentes:</Text>
                  {categorias.map((cat) => (
                    <TouchableOpacity
                      key={cat.nombre}
                      style={styles.sugerenciaBtn}
                      onPress={() => seleccionarCategoria(cat)}
                    >
                      <Text style={styles.sugerenciaText}>
                        {formatearTexto(cat.nombre)}
                      </Text>
                      <Text style={styles.sugerenciaCount}>
                        ({cat.total_productos})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Subcategoría */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Subcategoría *
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Escolar, Fiesta, Peluches"
              value={subcategoria}
              onChangeText={setSubcategoria}
              placeholderTextColor={Colors.gray}
              autoCapitalize="words"
              editable={esNuevo || true}
            />
            <Text style={styles.hint}>
              💡 Puedes usar espacios y mayúsculas
            </Text>
          </View>

          {/* Tipo de precio */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tipo de precio *</Text>
            <View style={styles.tipoPrecioContainer}>
              <TouchableOpacity
                style={[
                  styles.tipoPrecioBtn,
                  tipoPrecio === 'fijo' && styles.tipoPrecioBtnActivo
                ]}
                onPress={() => cambiarTipoPrecio('fijo')}
              >
                <Ionicons
                  name={tipoPrecio === 'fijo' ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={tipoPrecio === 'fijo' ? Colors.primary : Colors.gray}
                />
                <Text style={[
                  styles.tipoPrecioText,
                  tipoPrecio === 'fijo' && styles.tipoPrecioTextActivo
                ]}>
                  Precio fijo
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tipoPrecioBtn,
                  tipoPrecio === 'desde' && styles.tipoPrecioBtnActivo
                ]}
                onPress={() => cambiarTipoPrecio('desde')}
              >
                <Ionicons
                  name={tipoPrecio === 'desde' ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={tipoPrecio === 'desde' ? Colors.primary : Colors.gray}
                />
                <Text style={[
                  styles.tipoPrecioText,
                  tipoPrecio === 'desde' && styles.tipoPrecioTextActivo
                ]}>
                  Precio desde
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Precio fijo o Precio desde */}
          <View style={styles.row}>
            {tipoPrecio === 'fijo' ? (
              <View style={[styles.inputGroup, styles.fullWidth]}>
                <Text style={styles.label}>Precio fijo ($) *</Text>
                <View style={styles.precioInputContainer}>
                  <Text style={styles.precioSymbol}>$</Text>
                  <TextInput
                    style={[styles.input, styles.precioInput]}
                    placeholder="1500"
                    value={precio}
                    onChangeText={setPrecio}
                    keyboardType="decimal-pad"
                    placeholderTextColor={Colors.gray}
                  />
                </View>
              </View>
            ) : (
              <View style={[styles.inputGroup, styles.fullWidth]}>
                <Text style={styles.label}>Precio desde ($) *</Text>
                <View style={styles.precioInputContainer}>
                  <Text style={styles.precioSymbol}>$</Text>
                  <TextInput
                    style={[styles.input, styles.precioInput]}
                    placeholder="1000"
                    value={precioDesde}
                    onChangeText={setPrecioDesde}
                    keyboardType="decimal-pad"
                    placeholderTextColor={Colors.gray}
                  />
                </View>
              </View>
            )}
          </View>

          {/* Unidad */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Unidad (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: c/u, kg, mt, x10"
              value={unidad}
              onChangeText={setUnidad}
              placeholderTextColor={Colors.gray}
              autoCapitalize="none"
            />
            <Text style={styles.hint}>
              💡 Se mostrará junto al precio (ej: $1500 c/u)
            </Text>
          </View>

          {/* Stock */}
          <View style={styles.switchGroup}>
            <View style={styles.switchLabel}>
              <Ionicons
                name={stock ? 'checkmark-circle' : 'close-circle'}
                size={24}
                color={stock ? Colors.success : Colors.danger}
              />
              <View>
                <Text style={styles.label}>
                  {stock ? 'Producto disponible' : 'Sin stock'}
                </Text>
                <Text style={styles.switchHint}>
                  {stock 
                    ? 'El producto se mostrará como disponible' 
                    : 'El producto se marcará como agotado'
                  }
                </Text>
              </View>
            </View>
            <Switch
              value={stock}
              onValueChange={setStock}
              trackColor={{ false: Colors.lightGray, true: Colors.success }}
              thumbColor={Colors.white}
              ios_backgroundColor={Colors.lightGray}
            />
          </View>

          {/* Información adicional */}
          {!esNuevo && (
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color={Colors.primary} />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoTitle}>Información del producto</Text>
                <Text style={styles.infoText}>
                  Categoría: {formatearTexto(producto.categoria)}
                </Text>
                <Text style={styles.infoText}>
                  ID: {producto.id}
                </Text>
                {producto.codigo_barras && (
                  <Text style={styles.infoText}>
                    Código: {producto.codigo_barras}
                  </Text>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Botones */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={guardarProducto}
            disabled={loading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={Colors.gradientSuccess}
              style={styles.saveButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <>
                  <Ionicons 
                    name={esNuevo ? 'add-circle' : 'checkmark-circle'} 
                    size={24} 
                    color={Colors.white} 
                  />
                  <Text style={styles.saveButtonText}>
                    {esNuevo ? 'Crear Producto' : 'Guardar Cambios'}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {!esNuevo && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={eliminar}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Ionicons name="trash" size={20} color={Colors.danger} />
              <Text style={styles.deleteButtonText}>Eliminar Producto</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* ✅ MODAL PARA VER IMAGEN COMPLETA */}
      <Modal
        visible={selectedImage !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalClose}
            onPress={() => setSelectedImage(null)}
          >
            <Ionicons name="close" size={32} color="#fff" />
          </TouchableOpacity>
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.modalImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
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
  fullWidth: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark,
    marginBottom: 8,
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
  hint: {
    fontSize: 12,
    color: Colors.gray,
    marginTop: 4,
    lineHeight: 16,
  },
  // ✅ ESTILOS DE IMÁGENES
  imagenesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  imagenItem: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  imagenPreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  deleteImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  principalBadge: {
    position: 'absolute',
    bottom: 5,
    left: 5,
    backgroundColor: Colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  principalText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  addImageButton: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  addImageText: {
    color: Colors.primary,
    fontSize: 12,
    marginTop: 5,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  modalImage: {
    width: '90%',
    height: '80%',
  },
  // RESTO DE ESTILOS (sin cambios)
  codigoBarrasContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  codigoBarrasInput: {
    flex: 1,
  },
  scanIconButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  sugerenciasContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  sugerenciasTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.gray,
    marginBottom: 8,
  },
  sugerenciaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.white,
    borderRadius: 6,
    marginBottom: 4,
  },
  sugerenciaText: {
    fontSize: 14,
    color: Colors.dark,
    fontWeight: '500',
  },
  sugerenciaCount: {
    fontSize: 12,
    color: Colors.gray,
  },
  tipoPrecioContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  tipoPrecioBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  tipoPrecioBtnActivo: {
    backgroundColor: Colors.white,
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  tipoPrecioText: {
    fontSize: 14,
    color: Colors.gray,
    fontWeight: '500',
  },
  tipoPrecioTextActivo: {
    color: Colors.primary,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  precioInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  precioSymbol: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.success,
    paddingLeft: 12,
  },
  precioInput: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: Colors.background,
    borderRadius: 8,
    marginTop: 8,
  },
  switchLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  switchHint: {
    fontSize: 12,
    color: Colors.gray,
    marginTop: 2,
  },
  infoBox: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    marginTop: 8,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.dark,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: Colors.gray,
    lineHeight: 18,
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
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.danger,
  },
  deleteButtonText: {
    color: Colors.danger,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProductoEditScreen;