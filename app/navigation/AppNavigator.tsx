// app/navigation/AppNavigator.tsx

import React from 'react';
import { TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';

import HomeScreen from '../screens/HomeScreen';
import TreinosListScreen from '../screens/TreinosListScreen';
import ProdutosListScreen from '../screens/ProdutosListScreen';
import DiretoriaScreen from '../screens/DiretoriaScreen';
import EquipesStackNavigator from './EquipesStackNavigator';
import { AppTheme } from '../../constants/theme';
import type { RootDrawerParamList } from './DrawerNavigator';
import { useAuth } from '../context/AuthContext';

export type RootTabParamList = {
  Inicio: undefined;
  Equipes: undefined;
  Treinos: undefined;
  Produtos: undefined;
  Diretoria: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

type DrawerNav = DrawerNavigationProp<RootDrawerParamList>;

function HeaderProfileButton() {
  const navigation = useNavigation<DrawerNav>();
  const { user } = useAuth();

  const iconName =
    user?.role === 'diretoria' || user?.role === 'admin'
      ? 'person'
      : 'person-circle-outline';

  function handlePress() {
    if (user) {
      navigation.navigate('Profile');
    } else {
      navigation.navigate('Login');
    }
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={{ paddingRight: 16 }}
    >
      <Ionicons name={iconName as any} size={26} color="#FFFFFF" />
    </TouchableOpacity>
  );
}

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
        headerRight: () => <HeaderProfileButton />,

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
      <Tab.Screen name="Equipes" component={EquipesStackNavigator} />
      <Tab.Screen name="Treinos" component={TreinosListScreen} />
      <Tab.Screen name="Produtos" component={ProdutosListScreen} />
      <Tab.Screen name="Diretoria" component={DiretoriaScreen} />
    </Tab.Navigator>
  );
}
