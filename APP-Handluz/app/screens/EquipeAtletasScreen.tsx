// app/screens/EquipeAtletasScreen.tsx
// Esqueleto de tela para listagem de atletas de uma equipe específica.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppTheme } from '../../constants/theme';
import type { EquipesStackParamList } from '../navigation/EquipesStackNavigator';

type Props = NativeStackScreenProps<EquipesStackParamList, 'EquipeAtletas'>;

export default function EquipeAtletasScreen({ route }: Props) {
  const { equipeNome } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{equipeNome}</Text>
      <Text style={styles.subtitle}>
        Em breve você poderá ver e gerenciar aqui os atletas desta equipe.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppTheme.background,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: AppTheme.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: AppTheme.textSecondary,
  },
});
