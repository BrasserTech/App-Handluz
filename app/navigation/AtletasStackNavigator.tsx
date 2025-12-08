import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AtletasListScreen from '../screens/EquipeAtletasScreen';
import AtletaDetailScreen from '../screens/AtletaDetailScreen';
import { Atleta } from '../services/models';
import { AppTheme } from '../../constants/theme';

export type AtletasStackParamList = {
  AtletasLista: undefined;
  AtletaDetalhe: { atleta: Atleta };
};

const Stack = createNativeStackNavigator<AtletasStackParamList>();

export default function AtletasStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: AppTheme.primary },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen
        name="AtletasLista"
        component={AtletasListScreen}
        options={{ title: 'Atletas' }}
      />
      <Stack.Screen
        name="AtletaDetalhe"
        component={AtletaDetailScreen}
        options={{ title: 'Detalhes do atleta' }}
      />
    </Stack.Navigator>
  );
}
