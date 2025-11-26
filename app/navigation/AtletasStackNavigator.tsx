import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AtletasListScreen from '../screens/EquipeAtletasScreen';
import AtletaDetailScreen from '../screens/AtletaDetailScreen';
import { Atleta } from '../services/models';

export type AtletasStackParamList = {
  AtletasLista: undefined;
  AtletaDetalhe: { atleta: Atleta };
};

const Stack = createStackNavigator<AtletasStackParamList>();

export default function AtletasStackNavigator() {
  return (
    <Stack.Navigator>
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
