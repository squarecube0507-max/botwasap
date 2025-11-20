// src/screens/BarcodeScannerScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Vibration,
  ActivityIndicator,
} from 'react-native';
import { Camera } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../utils/colors';
import { buscarProductoPorCodigo } from '../services/api';

const BarcodeScannerScreen = ({ navigation, route }) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [buscando, setBuscando] = useState(false);

  const { onScan, modo } = route.params || {};

  useEffect(() => {
    solicitarPermisos();
  }, []);

  const solicitarPermisos = async () => {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      
      if (status !== 'granted') {
        Alert.alert(
          'Permiso denegado',
          'Necesitamos acceso a la cámara para escanear códigos de barras.',
          [
            { text: 'Reintentar', onPress: solicitarPermisos },
            { text: 'Cancelar', onPress: () => navigation.goBack() },
          ]
        );
      }
    } catch (error) {
      console.error('Error al solicitar permisos:', error);
      Alert.alert('Error', 'No se pudieron solicitar los permisos de cámara');
    }
  };

  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned || buscando) return;

    setScanned(true);
    Vibration.vibrate(200);

    console.log(`📸 Código escaneado: ${data} (Tipo: ${type})`);

    // Si viene con callback (desde ProductoEditScreen)
    if (onScan) {
      onScan(data);
      navigation.goBack();
      return;
    }

    // Buscar producto en la base de datos
    setBuscando(true);
    
    try {
      const resultado = await buscarProductoPorCodigo(data);
      
      if (resultado.encontrado) {
        Alert.alert(
          '✅ Producto encontrado',
          `${resultado.producto.nombre.replace(/_/g, ' ')}\n\n¿Qué deseas hacer?`,
          [
            {
              text: 'Ver detalles',
              onPress: () => {
                // ✅ NAVEGACIÓN CORREGIDA
                navigation.navigate('ProductoEdit', { producto: resultado.producto });
              },
            },
            {
              text: 'Escanear otro',
              onPress: () => {
                setScanned(false);
                setBuscando(false);
              },
            },
            {
              text: 'Cancelar',
              style: 'cancel',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert(
          '❌ Producto no encontrado',
          `No hay ningún producto con el código:\n${data}\n\n¿Qué deseas hacer?`,
          [
            {
              text: 'Crear producto',
              onPress: () => {
                // ✅ NAVEGACIÓN CORREGIDA
                navigation.navigate('ProductoEdit', { 
                  producto: null,
                  codigoBarras: data,
                });
              },
            },
            {
              text: 'Escanear otro',
              onPress: () => {
                setScanned(false);
                setBuscando(false);
              },
            },
            {
              text: 'Cancelar',
              style: 'cancel',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error al buscar producto:', error);
      Alert.alert(
        'Error',
        'No se pudo buscar el producto. Verifica tu conexión.',
        [
          {
            text: 'Reintentar',
            onPress: () => {
              setScanned(false);
              setBuscando(false);
            },
          },
          {
            text: 'Cancelar',
            style: 'cancel',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } finally {
      setBuscando(false);
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.messageText}>Solicitando permisos de cámara...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="camera-off" size={64} color={Colors.danger} />
        <Text style={styles.messageTitle}>Sin acceso a la cámara</Text>
        <Text style={styles.messageText}>
          Necesitamos permisos para escanear códigos de barras
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={solicitarPermisos}
        >
          <Text style={styles.permissionButtonText}>Solicitar permisos</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFillObject}
        type={Camera.Constants.Type.back}
        flashMode={flashOn ? Camera.Constants.FlashMode.torch : Camera.Constants.FlashMode.off}
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
      />

      {/* Overlay con guía de escaneo */}
      <View style={styles.overlay}>
        <View style={styles.topOverlay} />
        
        <View style={styles.middleRow}>
          <View style={styles.sideOverlay} />
          <View style={styles.scanArea}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          <View style={styles.sideOverlay} />
        </View>
        
        <View style={styles.bottomOverlay}>
          {buscando ? (
            <View style={styles.buscandoContainer}>
              <ActivityIndicator size="large" color={Colors.white} />
              <Text style={styles.instructionText}>Buscando producto...</Text>
            </View>
          ) : (
            <Text style={styles.instructionText}>
              {scanned
                ? '✅ Código escaneado'
                : '📸 Apunta el código de barras al recuadro'}
            </Text>
          )}
        </View>
      </View>

      {/* Controles */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => setFlashOn(!flashOn)}
          disabled={buscando}
        >
          <Ionicons
            name={flashOn ? 'flash' : 'flash-off'}
            size={28}
            color={Colors.white}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.scanButton]}
          onPress={() => {
            setScanned(false);
            setBuscando(false);
          }}
          disabled={!scanned || buscando}
        >
          <Ionicons
            name="scan"
            size={28}
            color={scanned && !buscando ? Colors.white : Colors.lightGray}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => navigation.goBack()}
          disabled={buscando}
        >
          <Ionicons name="close" size={28} color={Colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 32,
  },
  messageTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.dark,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  messageText: {
    fontSize: 16,
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 8,
  },
  permissionButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  topOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  middleRow: {
    flexDirection: 'row',
    height: 250,
  },
  sideOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  scanArea: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: Colors.success,
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderBottomWidth: 0,
    borderRightWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderTopWidth: 0,
    borderRightWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
  },
  bottomOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  buscandoContainer: {
    alignItems: 'center',
    gap: 12,
  },
  instructionText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  controls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  scanButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.success,
  },
});

export default BarcodeScannerScreen;