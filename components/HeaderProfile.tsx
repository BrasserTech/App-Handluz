import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// CAMINHOS CORRIGIDOS PARA SUA ESTRUTURA DE PASTAS
import { useAuth } from '../app/context/AuthContext';
import { AppTheme } from '../constants/theme'; 

export function HeaderProfile() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const displayName = user?.fullName 
    ? user.fullName.split(' ')[0] 
    : 'Entrar';

  function handlePress() {
    // Isso navega para a Stack 'Inicio', e dentro dela força a ida para 'Profile'
    // Funciona de qualquer aba (Equipes, Produtos, etc.)
    navigation.navigate('Inicio', { screen: 'Profile' });
  }

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.textContainer}>
        {!user && <Text style={styles.label}>Bem-vindo</Text>}
        <Text style={styles.nameText}>{displayName}</Text>
      </View>

      <Ionicons 
        name="person-circle-outline" 
        size={34} 
        color="#FFFFFF" 
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 10, // Espaçamento da borda direita
  },
  textContainer: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  label: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
  },
  nameText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  }
});