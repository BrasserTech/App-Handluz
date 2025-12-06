// app/navigation/HomeStackNavigator.tsx

import React from 'react';
import { TouchableOpacity } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, type NavigationProp } from '@react-navigation/native';

import HomeScreen from '../screens/HomeScreen';
import { AppTheme } from '../../constants/theme';

type HomeStackParamList = {
  HomeMain: undefined;
  // acrescente outras rotas filhas do home aqui, se houver
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

/**
 * Botão de perfil no header do stack Home.
 * Tipagem do useNavigation permite chamar navigate('Profile') sem casts.
 */
function HeaderProfileButton() {
  const navigation = useNavigation<NavigationProp<Record<string, object | undefined>>>();

  function handlePress() {
    // Ajuste o destino se sua rota Profile estiver em outro navigator
    navigation.navigate('Profile');
  }

  return (
    <TouchableOpacity onPress={handlePress} style={{ paddingRight: 8 }}>
      <Ionicons name="person-circle-outline" size={26} color="#FFFFFF" />
    </TouchableOpacity>
  );
}

export default function HomeStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: AppTheme.primary },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '600' },
        headerRight: () => <HeaderProfileButton />,
      }}
    >
      <Stack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{ title: 'Início' }}
      />
    </Stack.Navigator>
  );
}
