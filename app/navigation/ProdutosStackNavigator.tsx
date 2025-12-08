// app/navigation/ProdutosStackNavigator.tsx

import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, type NavigationProp } from '@react-navigation/native';

import ProdutosListScreen from '../screens/ProdutosListScreen';
import { AppTheme } from '../../constants/theme';
import { useAuth } from '../context/AuthContext';

type ProdutosStackParamList = {
  ProdutosList: undefined;
  // outras rotas se necessário
};

const Stack = createNativeStackNavigator<ProdutosStackParamList>();

function HeaderProfileButton() {
  const navigation = useNavigation<NavigationProp<Record<string, object | undefined>>>();
  const { user } = useAuth();

  function handlePress() {
    // Sempre navega para a tab Perfil do BottomTabs
    navigation.navigate('AppTabs' as any, { screen: 'Perfil' });
  }

  return (
    <TouchableOpacity onPress={handlePress} style={styles.headerRight}>
      <Ionicons name={user ? 'person' : 'person-circle-outline'} size={26} color="#FFFFFF" />
    </TouchableOpacity>
  );
}

export default function ProdutosStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: AppTheme.primary },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '600' },
        headerRight: () => <HeaderProfileButton />,
      }}
    >
      <Stack.Screen name="ProdutosList" component={ProdutosListScreen} options={{ title: 'Produtos' }} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  headerRight: { paddingRight: 12 },
});
