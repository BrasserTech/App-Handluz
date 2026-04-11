import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import EquipeAtletasScreen from '../screens/EquipeAtletasScreen';
import AtletaDetailScreen from '../screens/AtletaDetailScreen';
import { Atleta } from '../services/models';
import { AppTheme } from '../../constants/theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { EquipesStackParamList } from './EquipesStackNavigator';

export type AtletasStackParamList = {
  AtletasLista: EquipesStackParamList['EquipeAtletas'];
  AtletaDetalhe: { atleta: Atleta };
};

const Stack = createNativeStackNavigator<AtletasStackParamList>();

type AtletasListaProps = NativeStackScreenProps<AtletasStackParamList, 'AtletasLista'>;

function AtletasListaScreen({ route, navigation }: AtletasListaProps) {
  return (
    <EquipeAtletasScreen
      route={{ params: route.params } as any}
      navigation={navigation as any}
    />
  );
}

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
        component={AtletasListaScreen}
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
