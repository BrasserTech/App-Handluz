import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// Ajuste os caminhos se necessário conforme sua pasta
import { useAuth } from '../app/context/AuthContext';
// import { AppTheme } from '../constants/theme'; 

export function HeaderProfile() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const displayName = user?.fullName 
    ? user.fullName.split(' ')[0] 
    : 'Visitante';

  function handleProfilePress() {
    // Navega para a tela de Perfil (que está no RootStack)
    navigation.navigate('Profile');
  }

  function handleSettingsPress() {
    // Navega para a aba oculta 'Configuracoes'
    navigation.navigate('Configuracoes');
  }

  return (
    <View style={styles.container}>
      
      {/* Botão de Configurações (Engrenagem) */}
      <TouchableOpacity 
        onPress={handleSettingsPress}
        style={styles.settingsButton}
        activeOpacity={0.7}
      >
        <Ionicons name="settings-outline" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Botão de Perfil (Nome + Foto) */}
      <TouchableOpacity 
        style={styles.profileWrapper} 
        onPress={handleProfilePress}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 5,
  },
  settingsButton: {
    marginRight: 12,
    padding: 4,
  },
  profileWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
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