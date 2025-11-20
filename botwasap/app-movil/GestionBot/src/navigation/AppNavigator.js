// src/navigation/AppNavigator.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import Colors from '../utils/colors';

// Pantallas
import DashboardScreen from '../screens/DashboardScreen';
import PedidosScreen from '../screens/PedidosScreen';
import PedidoDetalleScreen from '../screens/PedidoDetalleScreen';
import ProductosScreen from '../screens/ProductosScreen';
import ProductoEditScreen from '../screens/ProductoEditScreen';
import BarcodeScannerScreen from '../screens/BarcodeScannerScreen';
import ClientesScreen from '../screens/ClientesScreen';
import ClienteDetalleScreen from '../screens/ClienteDetalleScreen';
import MasScreen from '../screens/MasScreen';
import ConfiguracionScreen from '../screens/ConfiguracionScreen';
import ControlBotScreen from '../screens/ControlBotScreen';
import CategoriasScreen from '../screens/CategoriasScreen';
import ExportImportScreen from '../screens/ExportImportScreen';
import DescuentosScreen from '../screens/DescuentosScreen';
import ConfiguracionNegocioScreen from '../screens/ConfiguracionNegocioScreen';
import RespuestasAutomaticasScreen from '../screens/RespuestasAutomaticasScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Opciones comunes de header para los stacks
const defaultStackOptions = {
  headerStyle: {
    backgroundColor: Colors.primary,
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 0,
  },
  headerTintColor: Colors.white,
  headerTitleStyle: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  headerBackTitleVisible: false,
  headerTitleAlign: 'center',
};

// ═══════════════════════════════════════
// 📊 STACK DE DASHBOARD
// ═══════════════════════════════════════

function DashboardStack() {
  return (
    <Stack.Navigator screenOptions={defaultStackOptions}>
      <Stack.Screen
        name="DashboardMain"
        component={DashboardScreen}
        options={{ 
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}

// ═══════════════════════════════════════
// 📦 STACK DE PEDIDOS
// ═══════════════════════════════════════

function PedidosStack() {
  return (
    <Stack.Navigator screenOptions={defaultStackOptions}>
      <Stack.Screen
        name="PedidosLista"
        component={PedidosScreen}
        options={{ 
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="PedidoDetalle"
        component={PedidoDetalleScreen}
        options={{ 
          title: '📦 Detalle del Pedido',
        }}
      />
    </Stack.Navigator>
  );
}

// ═══════════════════════════════════════
// 🏷️ STACK DE PRODUCTOS (CON ESCÁNER)
// ═══════════════════════════════════════

function ProductosStack() {
  return (
    <Stack.Navigator screenOptions={defaultStackOptions}>
      <Stack.Screen
        name="ProductosLista"
        component={ProductosScreen}
        options={{ 
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ProductoEdit"
        component={ProductoEditScreen}
        options={({ route }) => ({
          title: route.params?.producto ? '✏️ Editar Producto' : '➕ Nuevo Producto',
          headerBackTitle: 'Volver',
        })}
      />
      <Stack.Screen
        name="BarcodeScanner"
        component={BarcodeScannerScreen}
        options={{ 
          title: '📸 Escanear Código',
          headerBackTitle: 'Volver',
        }}
      />
    </Stack.Navigator>
  );
}

// ═══════════════════════════════════════
// 👥 STACK DE CLIENTES
// ═══════════════════════════════════════

function ClientesStack() {
  return (
    <Stack.Navigator screenOptions={defaultStackOptions}>
      <Stack.Screen
        name="ClientesLista"
        component={ClientesScreen}
        options={{ 
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ClienteDetalle"
        component={ClienteDetalleScreen}
        options={{ 
          title: '👤 Detalle del Cliente',
          headerBackTitle: 'Volver',
        }}
      />
    </Stack.Navigator>
  );
}

// ═══════════════════════════════════════
// ⚙️ STACK DE MÁS (TODAS LAS OPCIONES)
// ═══════════════════════════════════════

function MasStack() {
  return (
    <Stack.Navigator screenOptions={defaultStackOptions}>
      <Stack.Screen
        name="MasMenu"
        component={MasScreen}
        options={{ 
          headerShown: false,
        }}
      />
      {/* ✅ EXPORT/IMPORT */}
      <Stack.Screen
        name="ExportImportScreen"
        component={ExportImportScreen}
        options={{ 
          title: '📊 Exportar/Importar',
          headerBackTitle: 'Volver',
        }}
      />
      {/* ✅ CONFIGURACIÓN DEL NEGOCIO */}
      <Stack.Screen
        name="ConfiguracionNegocio"
        component={ConfiguracionNegocioScreen}
        options={{ 
          title: '🏪 Configuración del Negocio',
          headerBackTitle: 'Volver',
        }}
      />
      <Stack.Screen
        name="CategoriasScreen"
        component={CategoriasScreen}
        options={{ 
          title: '📁 Gestión de Categorías',
          headerBackTitle: 'Volver',
        }}
      />
      <Stack.Screen
        name="ConfiguracionScreen"
        component={ConfiguracionScreen}
        options={{ 
          title: '⚙️ Configuración',
          headerBackTitle: 'Volver',
        }}
      />
      <Stack.Screen
        name="ControlBotScreen"
        component={ControlBotScreen}
        options={{ 
          title: '🤖 Control del Bot',
          headerBackTitle: 'Volver',
        }}
      />
      <Stack.Screen
        name="RespuestasAutomaticas"
        component={RespuestasAutomaticasScreen}
        options={{
          title: '💬 Respuestas Automáticas',
          headerBackTitle: 'Volver',
        }}
      />
      {/* ✅ DESCUENTOS */}
      <Stack.Screen
        name="Descuentos"
        component={DescuentosScreen}
        options={{
          title: '🎁 Descuentos',
          headerBackTitle: 'Volver',
        }}
      />
    </Stack.Navigator>
  );
}

// ═══════════════════════════════════════
// 📱 NAVEGADOR PRINCIPAL (TABS)
// ═══════════════════════════════════════

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            switch (route.name) {
              case 'Dashboard':
                iconName = focused ? 'stats-chart' : 'stats-chart-outline';
                break;
              case 'Pedidos':
                iconName = focused ? 'cube' : 'cube-outline';
                break;
              case 'Productos':
                iconName = focused ? 'pricetag' : 'pricetag-outline';
                break;
              case 'Clientes':
                iconName = focused ? 'people' : 'people-outline';
                break;
              case 'Más':
                iconName = focused ? 'menu' : 'menu-outline';
                break;
              default:
                iconName = 'help-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.gray,
          tabBarStyle: {
            backgroundColor: Colors.white,
            borderTopWidth: 1,
            borderTopColor: Colors.lightGray,
            height: Platform.OS === 'ios' ? 88 : 60,
            paddingBottom: Platform.OS === 'ios' ? 28 : 8,
            paddingTop: 8,
            elevation: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
          tabBarItemStyle: {
            paddingVertical: 4,
          },
          headerShown: false,
          tabBarHideOnKeyboard: Platform.OS === 'android',
        })}
      >
        <Tab.Screen
          name="Dashboard"
          component={DashboardStack}
          options={{
            title: 'Inicio',
          }}
        />
        <Tab.Screen
          name="Pedidos"
          component={PedidosStack}
          options={{
            title: 'Pedidos',
          }}
        />
        <Tab.Screen
          name="Productos"
          component={ProductosStack}
          options={{
            title: 'Productos',
          }}
        />
        <Tab.Screen
          name="Clientes"
          component={ClientesStack}
          options={{
            title: 'Clientes',
          }}
        />
        <Tab.Screen
          name="Más"
          component={MasStack}
          options={{
            title: 'Más',
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;