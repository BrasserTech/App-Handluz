import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from '../screens/HomeScreen';
import EquipesListScreen from '../screens/EquipesListScreen';
import TreinosListScreen from '../screens/TreinosListScreen';
import ProdutosListScreen from '../screens/ProdutosListScreen';
import DiretoriaScreen from '../screens/DiretoriaScreen';
import AtletasStackNavigator from './AtletasStackNavigator';
import { AppTheme } from '../../constants/theme';

export type RootTabParamList = {
  Inicio: undefined;
  Atletas: undefined;
  Equipes: undefined;
  Treinos: undefined;
  Produtos: undefined;
  Diretoria: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: {
          backgroundColor: AppTheme.primary,
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: '600',
        },
        tabBarActiveTintColor: AppTheme.tabIconSelected,
        tabBarInactiveTintColor: AppTheme.tabIconDefault,
        tabBarStyle: {
          backgroundColor: AppTheme.surface,
          borderTopColor: AppTheme.border,
          borderTopWidth: 1,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          marginBottom: 4,
        },
        tabBarIcon: ({ color, size }) => {
          switch (route.name) {
            case 'Inicio':
              return <Ionicons name="home-outline" size={size} color={color} />;
            case 'Atletas':
              return (
                <Ionicons name="people-outline" size={size} color={color} />
              );
            case 'Equipes':
              return (
                <Ionicons
                  name="shield-checkmark-outline"
                  size={size}
                  color={color}
                />
              );
            case 'Treinos':
              return (
                <Ionicons name="calendar-outline" size={size} color={color} />
              );
            case 'Produtos':
              return (
                <Ionicons name="pricetags-outline" size={size} color={color} />
              );
            case 'Diretoria':
              return (
                <Ionicons name="business-outline" size={size} color={color} />
              );
            default:
              return (
                <Ionicons name="ellipse-outline" size={size} color={color} />
              );
          }
        },
      })}
    >
      <Tab.Screen name="Inicio" component={HomeScreen} />
      <Tab.Screen name="Atletas" component={AtletasStackNavigator} />
      <Tab.Screen name="Equipes" component={EquipesListScreen} />
      <Tab.Screen name="Treinos" component={TreinosListScreen} />
      <Tab.Screen name="Produtos" component={ProdutosListScreen} />
      <Tab.Screen name="Diretoria" component={DiretoriaScreen} />
    </Tab.Navigator>
  );
}
