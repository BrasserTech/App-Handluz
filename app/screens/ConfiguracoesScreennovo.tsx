import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppTheme } from '../../constants/theme';

export default function ConfiguracoesScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        
        {/* Card: Competições */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Competições / Etapas</Text>
            <TouchableOpacity style={styles.addButton}>
              <Ionicons name="add" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.cardDesc}>
            Cadastre as competições e etapas oficiais, anexando o link do regulamento.
          </Text>
          <Text style={styles.emptyText}>Nenhuma competição cadastrada.</Text>
        </View>

        {/* Card: Jogos */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Próximos jogos</Text>
            <TouchableOpacity style={styles.addButton}>
              <Ionicons name="add" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.cardDesc}>
            Registre os próximos jogos oficiais para exibição na tela inicial.
          </Text>
          <Text style={styles.emptyText}>Nenhum jogo cadastrado.</Text>
        </View>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' },
  content: { padding: 16 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EEE',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  addButton: {
    backgroundColor: AppTheme.primary || '#006600',
    width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center'
  },
  cardDesc: { fontSize: 13, color: '#666', marginBottom: 12, lineHeight: 18 },
  emptyText: { fontSize: 13, color: '#999', fontStyle: 'italic' },
});