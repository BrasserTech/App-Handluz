import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import ProfileOrLoginScreen from './ProfileOrLoginScreen';
import { AppTheme } from '../../constants/theme';
// Importação corrigida saindo da pasta app
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
        // O BOTÃO DE PERFIL AQUI
        headerRight: () => <HeaderProfile />,
      }}
    >
      <Stack.Screen name="HomeMain" component={HomeScreen} options={{ title: 'Início' }} />
      
      {/* Tela de Login/Perfil fica aqui. Ocultamos o header da stack para usar o da própria tela */}
      <Stack.Screen 
        name="Profile" 
        component={ProfileOrLoginScreen} 
        options={{ headerShown: false }} 
      />
    </Stack.Navigator>
  );
}