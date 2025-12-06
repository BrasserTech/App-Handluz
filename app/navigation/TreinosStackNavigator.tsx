// app/navigation/TreinosStackNavigator.tsx

import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, type NavigationProp } from '@react-navigation/native';

import TreinosListScreen from '../screens/TreinosListScreen';
import { AppTheme } from '../../constants/theme';
import { useAuth } from '../context/AuthContext';

type TreinosStackParamList = {
  TreinosList: undefined;
  // adicione outras rotas do stack se necessário
};

const Stack = createNativeStackNavigator<TreinosStackParamList>();

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

export default function TreinosStackNavigator() {
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
      <Stack.Screen name="TreinosList" component={TreinosListScreen} options={{ title: 'Treinos' }} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  headerRight: { paddingRight: 12 },
});
