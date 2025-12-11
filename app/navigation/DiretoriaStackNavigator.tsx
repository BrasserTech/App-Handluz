import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import DiretoriaScreen from '../screens/DiretoriaScreen';
import { AppTheme } from '../../constants/theme';

// Importa o componente global de perfil (Nome + Ícone)
import { HeaderProfile } from '../../components/HeaderProfile';

type DiretoriaStackParamList = {
  DiretoriaMain: undefined;
  // outras rotas se necessário
};

const Stack = createNativeStackNavigator<DiretoriaStackParamList>();

export default function DiretoriaStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: AppTheme.primary },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '600' },
        
        // Remove a sombra para ficar igual ao padrão da Home
        headerShadowVisible: false,
        
        // Remove texto "Voltar" no iOS
        headerBackTitle: '',

        // Botão padronizado
        headerRight: () => <HeaderProfile />,
      }}
    >
      <Stack.Screen 
        name="DiretoriaMain" 
        component={DiretoriaScreen} 
        // Alterado para 'Configurações' para condizer com o novo objetivo da aba
        options={{ title: 'Configurações' }} 
      />
    </Stack.Navigator>
  );
}