import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import TreinosListScreen from '../screens/TreinosListScreen';
import { AppTheme } from '../../constants/theme';

// Importa o componente global de perfil (Nome + Ícone)
import { HeaderProfile } from '../../components/HeaderProfile';

type TreinosStackParamList = {
  TreinosList: undefined;
  // adicione outras rotas do stack se necessário
};

const Stack = createNativeStackNavigator<TreinosStackParamList>();

export default function TreinosStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: AppTheme.primary },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '600' },
        
        // Remove a sombra para ficar igual ao padrão da Home
        headerShadowVisible: false,
        
        // Remove texto "Voltar" no iOS para um visual mais limpo
        headerBackTitle: '',
      }}
    >
      <Stack.Screen 
        name="TreinosList" 
        component={TreinosListScreen} 
        options={{ title: 'Treinos' }} 
      />
    </Stack.Navigator>
  );
}