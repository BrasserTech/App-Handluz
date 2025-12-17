// app/navigation/ProfileOrLoginScreen.tsx
// Stack Navigator que contém Login e Profile
// O initialRouteName é definido baseado no estado de autenticação

import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import LoginScreen from '../screens/LoginScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { AppTheme } from '../../constants/theme';
import { useAuth } from '../context/AuthContext';

type ProfileOrLoginStackParamList = {
  LoginMain: undefined;
  ProfileMain: undefined;
};

const Stack = createNativeStackNavigator<ProfileOrLoginStackParamList>();

export default function ProfileOrLoginScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();

  // Navega automaticamente quando o estado de autenticação muda
  useEffect(() => {
    if (!user) {
      // Se o usuário fizer logout, navega para a tela de login
      navigation.navigate('LoginMain' as never);
    } else {
      // Se o usuário fizer login, navega para a tela de perfil
      navigation.navigate('ProfileMain' as never);
    }
  }, [user, navigation]);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: AppTheme.primary },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '600' },
      }}
      initialRouteName={user ? 'ProfileMain' : 'LoginMain'}
    >
      <Stack.Screen
        name="LoginMain"
        component={LoginScreen}
        options={{ title: 'Login' }}
      />
      <Stack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={{ title: 'Perfil' }}
      />
    </Stack.Navigator>
  );
}

