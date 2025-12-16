import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import ProdutosListScreen from '../screens/ProdutosListScreen';
import { AppTheme } from '../../constants/theme';

// Importa o componente global que criamos (Nome + Ícone)
import { HeaderProfile } from '../../components/HeaderProfile';

type ProdutosStackParamList = {
  ProdutosList: undefined;
  // adicione outras rotas do stack se necessário
};

const Stack = createNativeStackNavigator<ProdutosStackParamList>();

export default function ProdutosStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: AppTheme.primary },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '600' },
        
        // Remove a sombra para padronizar com a Home
        headerShadowVisible: false,
        
        // Remove texto "Voltar" no iOS
        headerBackTitle: '',

        // Botão padronizado
        headerRight: () => <HeaderProfile />,
      }}
    >
      <Stack.Screen 
        name="ProdutosList" 
        component={ProdutosListScreen} 
        options={{ title: 'Produtos' }} 
      />
    </Stack.Navigator>
  );
}