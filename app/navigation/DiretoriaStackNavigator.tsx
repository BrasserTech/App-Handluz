// app/navigation/DiretoriaStackNavigator.tsx

import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, type NavigationProp } from '@react-navigation/native';

import DiretoriaScreen from '../screens/DiretoriaScreen';
import { AppTheme } from '../../constants/theme';
import { useAuth } from '../context/AuthContext';

type DiretoriaStackParamList = {
  DiretoriaMain: undefined;
  // outras rotas se necessário
};

const Stack = createNativeStackNavigator<DiretoriaStackParamList>();

function HeaderProfileButton() {
  const navigation = useNavigation<NavigationProp<Record<string, object | undefined>>>();
  const { user } = useAuth();

  function handlePress() {
    if (user) navigation.navigate('Profile' as any);
    else navigation.navigate('Login' as any);
  }

  return (
    <TouchableOpacity onPress={handlePress} style={styles.headerRight}>
      <Ionicons name={user ? 'person' : 'person-circle-outline'} size={26} color="#FFFFFF" />
    </TouchableOpacity>
  );
}

export default function DiretoriaStackNavigator() {
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
      <Stack.Screen name="DiretoriaMain" component={DiretoriaScreen} options={{ title: 'Diretoria' }} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  headerRight: { paddingRight: 12 },
});
