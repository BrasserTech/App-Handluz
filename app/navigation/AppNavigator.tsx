// app/navigation/AppNavigator.tsx

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import HomeStackNavigator from './HomeStackNavigator';
import EquipesStackNavigator from './EquipesStackNavigator';
import TreinosStackNavigator from './TreinosStackNavigator';
import ProdutosStackNavigator from './ProdutosStackNavigator';
import DiretoriaStackNavigator from './DiretoriaStackNavigator';
import { AppTheme } from '../../constants/theme';

export type RootTabParamList = {
  Inicio: undefined;
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
        headerShown: false, // headers ficam a cargo dos stacks internos
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
            case 'Equipes':
              return <Ionicons name="shield-checkmark-outline" size={size} color={color} />;
            case 'Treinos':
              return <Ionicons name="calendar-outline" size={size} color={color} />;
            case 'Produtos':
              return <Ionicons name="pricetags-outline" size={size} color={color} />;
            case 'Diretoria':
              return <Ionicons name="business-outline" size={size} color={color} />;
            default:
              return <Ionicons name="ellipse-outline" size={size} color={color} />;
          }
        },
      })}
    >
      <Tab.Screen name="Inicio" component={HomeStackNavigator} />
      <Tab.Screen name="Equipes" component={EquipesStackNavigator} />
      <Tab.Screen name="Treinos" component={TreinosStackNavigator} />
      <Tab.Screen name="Produtos" component={ProdutosStackNavigator} />
      <Tab.Screen name="Diretoria" component={DiretoriaStackNavigator} />
    </Tab.Navigator>
  );
}
