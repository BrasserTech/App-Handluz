// app/navigation/EquipesStackNavigator.tsx

import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, type NavigationProp, CommonActions } from '@react-navigation/native';

import EquipesListScreen from '../screens/EquipesListScreen';
import EquipeAtletasScreen from '../screens/EquipeAtletasScreen';
import { AppTheme } from '../../constants/theme';
import { useAuth } from '../context/AuthContext';

export type EquipesStackParamList = {
  EquipesList: undefined;
  EquipeAtletas: {
    equipeId: string;
    equipeNome?: string;
  };
};

const Stack = createNativeStackNavigator<EquipesStackParamList>();

function HeaderProfileButton() {
  const navigation = useNavigation<NavigationProp<Record<string, object | undefined>>>();
  const { user } = useAuth();

  function handlePress() {
    if (user) {
      navigation.navigate('Profile' as any);
    } else {
      navigation.navigate('Login' as any);
    }
  }

  return (
    <TouchableOpacity onPress={handlePress} style={styles.headerRightButton}>
      <Ionicons name={user ? 'person' : 'person-circle-outline'} size={26} color="#FFFFFF" />
    </TouchableOpacity>
  );
}

function HeaderBackButton() {
  const navigation = useNavigation<NavigationProp<Record<string, object | undefined>>>();

  if (!navigation.canGoBack()) {
    return null;
  }

  return (
    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerLeftButton}>
      <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
    </TouchableOpacity>
  );
}

/**
 * Função para navegar para EquipeAtletas garantindo que seja dentro do stack Equipes,
 * permitindo que o botão voltar retorne para EquipesList.
 */
export function navigateToEquipeAtletas(
  navigation: NavigationProp<any>,
  equipeId: string,
  equipeNome?: string
) {
  navigation.navigate('Equipes', {
    screen: 'EquipeAtletas',
    params: { equipeId, equipeNome },
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
        headerLeft: () => <HeaderBackButton />,
        headerRight: () => <HeaderProfileButton />,
        headerBackTitleVisible: false,
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
  headerLeftButton: {
    paddingLeft: 12,
    paddingRight: 8,
  },
  headerRightButton: {
    paddingRight: 12,
  },
});
