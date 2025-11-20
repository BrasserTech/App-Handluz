import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import EquipesListScreen from '../screens/EquipesListScreen';
import TreinosListScreen from '../screens/TreinosListScreen';
import ProdutosListScreen from '../screens/ProdutosListScreen';
import DiretoriaScreen from '../screens/DiretoriaScreen';
import AtletasStackNavigator from './AtletasStackNavigator';

export type RootTabParamList = {
  Inicio: undefined;
  Atletas: undefined;
  Equipes: undefined;
  Treinos: undefined;
  Produtos: undefined;
  Diretoria: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

export default function AppNavigator() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Inicio" component={HomeScreen} />
      {/* Aba Atletas usa o Stack (lista + detalhe) */}
      <Tab.Screen name="Atletas" component={AtletasStackNavigator} />
      <Tab.Screen name="Equipes" component={EquipesListScreen} />
      <Tab.Screen name="Treinos" component={TreinosListScreen} />
      <Tab.Screen name="Produtos" component={ProdutosListScreen} />
      <Tab.Screen name="Diretoria" component={DiretoriaScreen} />
    </Tab.Navigator>
  );
}
