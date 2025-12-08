// app/navigation/AppNavigator.tsx

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import HomeStackNavigator from './HomeStackNavigator';
import EquipesStackNavigator from './EquipesStackNavigator';
import TreinosStackNavigator from './TreinosStackNavigator';
import ProdutosStackNavigator from './ProdutosStackNavigator';
import DiretoriaStackNavigator from './DiretoriaStackNavigator';
import ProfileOrLoginScreen from './ProfileOrLoginScreen';
import { AppTheme } from '../../constants/theme';
import { useAuth } from '../context/AuthContext';

export type RootTabParamList = {
  Inicio: undefined;
  Equipes: undefined;
  Treinos: undefined;
  Produtos: undefined;
  Diretoria: undefined;
  Perfil: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

export default function AppNavigator() {
  const { user } = useAuth();

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
          display: 'flex', // Garante que o BottomTabs seja exibido
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
            case 'Perfil':
              return <Ionicons name={user ? "person-outline" : "log-in-outline"} size={size} color={color} />;
            default:
              return <Ionicons name="ellipse-outline" size={size} color={color} />;
          }
        },
      })}
    >
      <Tab.Screen 
        name="Inicio" 
        component={HomeStackNavigator}
        options={{ tabBarLabel: 'Início' }}
      />
      <Tab.Screen 
        name="Equipes" 
        component={EquipesStackNavigator}
        options={{ tabBarLabel: 'Equipes' }}
      />
      <Tab.Screen 
        name="Treinos" 
        component={TreinosStackNavigator}
        options={{ tabBarLabel: 'Treinos' }}
      />
      <Tab.Screen 
        name="Produtos" 
        component={ProdutosStackNavigator}
        options={{ tabBarLabel: 'Produtos' }}
      />
      <Tab.Screen 
        name="Diretoria" 
        component={DiretoriaStackNavigator}
        options={{ tabBarLabel: 'Diretoria' }}
      />
      <Tab.Screen 
        name="Perfil" 
        component={ProfileOrLoginScreen}
        options={{ tabBarLabel: user ? 'Perfil' : 'Login' }}
      />
    </Tab.Navigator>
  );
}
