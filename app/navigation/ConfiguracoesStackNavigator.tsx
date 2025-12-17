import React from 'react';
import { TouchableOpacity } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import ConfiguracoesScreen from '../screens/ConfiguracoesScreen';
import { AppTheme } from '../../constants/theme';
import { HeaderProfile } from '../../components/HeaderProfile';

const Stack = createNativeStackNavigator();

export default function ConfiguracoesStackNavigator() {
  const navigation = useNavigation();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: AppTheme.primary },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
        headerBackTitle: '',

        // Direita: Perfil + Engrenagem
        headerRight: () => <HeaderProfile />,

        // Esquerda: Botão Voltar Manual
        headerLeft: () => (
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={{ marginRight: 15, padding: 5 }}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        ),
      }}
    >
      <Stack.Screen 
        name="ConfiguracoesMain" 
        component={ConfiguracoesScreen} 
        options={{ title: 'Configurações' }} 
      />
    </Stack.Navigator>
  );
}