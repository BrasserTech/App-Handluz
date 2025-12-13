import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import ProfileOrLoginScreen from './ProfileOrLoginScreen'; // Verifique se o caminho está correto para sua estrutura
import { AppTheme } from '../../constants/theme';

// CORREÇÃO: Sobe 2 níveis para achar a pasta components na raiz
import { HeaderProfile } from '../../components/HeaderProfile'; 

export type HomeStackParamList = {
  HomeMain: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: AppTheme.primary },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
        headerRight: () => <HeaderProfile />,
      }}
    >
      <Stack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{ title: 'Início' }}
      />

      <Stack.Screen 
        name="Profile" 
        component={ProfileOrLoginScreen} 
        options={{ headerShown: false }} 
      />
    </Stack.Navigator>
  );
}