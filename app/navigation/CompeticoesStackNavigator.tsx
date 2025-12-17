import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import CompeticoesListScreen from '../screens/CompeticoesListScreen';
import { AppTheme } from '../../constants/theme';
import { HeaderProfile } from '../../components/HeaderProfile';

const Stack = createNativeStackNavigator();

export default function CompeticoesStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: AppTheme.primary },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
        headerBackTitle: '',
        headerRight: () => <HeaderProfile />,
      }}
    >
      <Stack.Screen 
        name="CompeticoesList" 
        component={CompeticoesListScreen} 
        options={{ title: 'Competições' }} 
      />
    </Stack.Navigator>
  );
}