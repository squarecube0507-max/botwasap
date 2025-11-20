// src/screens/MasScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../utils/colors';
import { getEstadoBot } from '../services/api';

const MasScreen = ({ navigation }) => {
  const [estadoBot, setEstadoBot] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    cargarEstadoBot();
  }, []);

  const cargarEstadoBot = async () => {
    try {
      const estado = await getEstadoBot();
      setEstadoBot(estado);
    } catch (error) {
      console.error('❌ Error al cargar estado del bot:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarEstadoBot();
    setRefreshing(false);
  };

  const menuItems = [
    {
      id: 'export-import',
      title: 'Exportar/Importar',
      subtitle: 'Gestiona productos en Excel',
      icon: 'cloud-upload',
      iconColor: '#10b981',
      gradient: ['#10b981', '#059669'],
      onPress: () => navigation.navigate('ExportImportScreen'),
    },
    {
      id: 'categorias',
      title: 'Gestión de Categorías',
      subtitle: 'Crear, editar y eliminar categorías',
      icon: 'folder',
      iconColor: Colors.warning,
      gradient: ['#FFA726', '#FB8C00'],
      onPress: () => navigation.navigate('CategoriasScreen'),
    },
    {
      id: 'configuracion',
      title: 'Configuración del Negocio',
      subtitle: 'Información y datos del negocio',
      icon: 'settings',
      iconColor: Colors.primary,
      gradient: Colors.gradientPrimary,
      onPress: () => navigation.navigate('ConfiguracionScreen'),
    },
    {
      id: 'control-bot',
      title: 'Control del Bot',
      subtitle: estadoBot?.respuestas_activas ? '🟢 Bot activo' : '🔴 Bot pausado',
      icon: 'logo-whatsapp',
      iconColor: Colors.success,
      gradient: Colors.gradientSuccess,
      onPress: () => navigation.navigate('ControlBotScreen'),
    },
  ];

  const informacionItems = [
    {
      id: 'version',
      title: 'Versión de la App',
      value: '1.0.0',
      icon: 'information-circle',
    },
    {
      id: 'servidor',
      title: 'Estado del Servidor',
      value: estadoBot ? '🟢 Conectado' : '🔴 Desconectado',
      icon: 'server',
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[Colors.primary]}
          tintColor={Colors.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>⚙️ Más Opciones</Text>
        <Text style={styles.headerSubtitle}>
          Gestiona tu negocio y el bot de WhatsApp
        </Text>
      </View>

      {/* Menú principal */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Gestión</Text>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.menuItem}
            onPress={item.onPress}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={item.gradient}
              style={styles.menuIconContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name={item.icon} size={24} color={Colors.white} />
            </LinearGradient>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.gray} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Información */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información</Text>
        <View style={styles.infoCard}>
          {informacionItems.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.infoItem,
                index < informacionItems.length - 1 && styles.infoItemBorder,
              ]}
            >
              <View style={styles.infoLeft}>
                <Ionicons name={item.icon} size={20} color={Colors.primary} />
                <Text style={styles.infoTitle}>{item.title}</Text>
              </View>
              <Text style={styles.infoValue}>{item.value}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Acerca de */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Acerca de</Text>
        <View style={styles.aboutCard}>
          <Text style={styles.aboutTitle}>🤖 Bot de WhatsApp</Text>
          <Text style={styles.aboutText}>
            Sistema de gestión integral para tu negocio con WhatsApp Business.
            Gestiona productos, pedidos, clientes y más desde tu móvil.
          </Text>
          <View style={styles.aboutStats}>
            <View style={styles.aboutStat}>
              <Ionicons name="code-slash" size={16} color={Colors.primary} />
              <Text style={styles.aboutStatText}>Node.js + React Native</Text>
            </View>
            <View style={styles.aboutStat}>
              <Ionicons name="shield-checkmark" size={16} color={Colors.success} />
              <Text style={styles.aboutStatText}>Seguro y confiable</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Ayuda */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.helpButton}
          onPress={() => {
            Alert.alert(
              '💬 Ayuda',
              'Para soporte técnico, contacta al desarrollador del sistema.',
              [{ text: 'Entendido' }]
            );
          }}
        >
          <Ionicons name="help-circle" size={24} color={Colors.primary} />
          <Text style={styles.helpButtonText}>¿Necesitas ayuda?</Text>
          <Ionicons name="chevron-forward" size={20} color={Colors.gray} />
        </TouchableOpacity>
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
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.gray,
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark,
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 13,
    color: Colors.gray,
  },
  infoCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoTitle: {
    fontSize: 14,
    color: Colors.dark,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: Colors.gray,
    fontWeight: '600',
  },
  aboutCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  aboutTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 8,
  },
  aboutText: {
    fontSize: 14,
    color: Colors.gray,
    lineHeight: 20,
    marginBottom: 16,
  },
  aboutStats: {
    flexDirection: 'row',
    gap: 16,
  },
  aboutStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aboutStatText: {
    fontSize: 12,
    color: Colors.gray,
    fontWeight: '500',
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  helpButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
});

export default MasScreen;