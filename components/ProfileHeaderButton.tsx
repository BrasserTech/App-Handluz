// app/components/ProfileHeaderButton.tsx
import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppTheme } from '../constants/theme';

export default function ProfileHeaderButton() {
  const navigation = useNavigation();

  function handlePress() {
    // Ajuste "Profile" se o nome da rota de perfil for outro
    // (por exemplo, 'ProfileScreen' ou 'Perfil').
    navigation.navigate('Profile' as never);
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={styles.container}
      activeOpacity={0.8}
    >
      <View style={styles.circle}>
        <Text style={styles.initials}>👤</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginRight: 12,
  },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AppTheme.surface,
    borderWidth: 1,
    borderColor: AppTheme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontSize: 18,
    color: AppTheme.primary,
  },
});
