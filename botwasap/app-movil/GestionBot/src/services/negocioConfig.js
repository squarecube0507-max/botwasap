// src/services/negocioConfig.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const NEGOCIO_CONFIG_KEY = '@negocio_config';

const DEFAULT_CONFIG = {
  nombre: 'Mi Negocio',
  telefono: '',
  email: '',
  direccion: '',
  color: '#3b82f6', // Azul por defecto
  logo: null,
};

export const getNegocioConfig = async () => {
  try {
    const config = await AsyncStorage.getItem(NEGOCIO_CONFIG_KEY);
    if (config) {
      return JSON.parse(config);
    }
    return DEFAULT_CONFIG;
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    return DEFAULT_CONFIG;
  }
};

export const saveNegocioConfig = async (config) => {
  try {
    await AsyncStorage.setItem(NEGOCIO_CONFIG_KEY, JSON.stringify(config));
    return true;
  } catch (error) {
    console.error('Error al guardar configuración:', error);
    return false;
  }
};

export const updateNegocioConfig = async (updates) => {
  try {
    const currentConfig = await getNegocioConfig();
    const newConfig = { ...currentConfig, ...updates };
    await saveNegocioConfig(newConfig);
    return newConfig;
  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    return null;
  }
};