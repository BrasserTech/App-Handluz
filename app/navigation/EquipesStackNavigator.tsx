// app/navigation/EquipesStackNavigator.tsx

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import EquipesListScreen from '../screens/EquipesListScreen';
import EquipeAtletasScreen from '../screens/EquipeAtletasScreen';

export type EquipesStackParamList = {
  EquipesList: undefined;
  EquipeAtletas: {
    equipeId: string;
    equipeNome: string;
  };
};

const Stack = createNativeStackNavigator<EquipesStackParamList>();

export default function EquipesStackNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="EquipesList"
      screenOptions={{
        headerShown: false, // usamos o header do AppNavigator (tabs)
      }}
    >
      <Stack.Screen name="EquipesList" component={EquipesListScreen} />
      <Stack.Screen name="EquipeAtletas" component={EquipeAtletasScreen} />
    </Stack.Navigator>
  );
}
