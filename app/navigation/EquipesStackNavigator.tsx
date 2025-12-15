import React from 'react';
import { StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationProp } from '@react-navigation/native';

import EquipesListScreen from '../screens/EquipesListScreen';
import EquipeAtletasScreen from '../screens/EquipeAtletasScreen';
import { AppTheme } from '../../constants/theme';

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
      }}
    >
      <Stack.Screen
        name="EquipesList"
        component={EquipesListScreen}
        options={{ 
          title: 'Equipes',
          headerRight: undefined, // Configurado pela tela via useLayoutEffect
        }}
      />
      
      <Stack.Screen
        name="EquipeAtletas"
        component={EquipeAtletasScreen}
        options={({ route }) => ({
          title: route.params?.equipeNome ?? 'Equipe',
          headerRight: undefined, // Configurado pela tela via useLayoutEffect
        })}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  // Estilos removidos pois agora usamos componentes padrões
});