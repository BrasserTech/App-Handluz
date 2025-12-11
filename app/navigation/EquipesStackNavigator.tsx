import React from 'react';
import { StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationProp } from '@react-navigation/native';

import EquipesListScreen from '../screens/EquipesListScreen';
import EquipeAtletasScreen from '../screens/EquipeAtletasScreen';
import { AppTheme } from '../../constants/theme';

// Importa o componente global que criamos
import { HeaderProfile } from '../../components/HeaderProfile';

export type EquipesStackParamList = {
  EquipesList: undefined;
  EquipeAtletas: {
    equipeId: string;
    equipeNome?: string;
  };
};

const Stack = createNativeStackNavigator<EquipesStackParamList>();

/**
 * Função utilitária para navegação (opcional, mas mantida para compatibilidade com seu código)
 */
export function navigateToEquipeAtletas(
  navigation: NavigationProp<any>,
  equipeId: string,
  equipeNome?: string
) {
  navigation.navigate('EquipeAtletas', {
    equipeId,
    equipeNome,
  });
}

export default function EquipesStackNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="EquipesList"
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: AppTheme.primary },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false, // Remove a sombra para ficar igual à Home
        
        // Remove o texto "Voltar" (iOS) ou ajusta o padrão
        headerBackTitle: '',
        
        // Adiciona o botão de perfil global (Nome + Ícone)
        headerRight: () => <HeaderProfile />,
      }}
    >
      <Stack.Screen
        name="EquipesList"
        component={EquipesListScreen}
        options={{ title: 'Equipes' }}
      />
      
      <Stack.Screen
        name="EquipeAtletas"
        component={EquipeAtletasScreen}
        options={({ route }) => ({
          title: route.params?.equipeNome ?? 'Equipe',
        })}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  // Estilos removidos pois agora usamos componentes padrões
});