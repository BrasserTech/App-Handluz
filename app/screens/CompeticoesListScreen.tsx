import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppTheme } from '../../constants/theme'; 

const MOCK_COMPETICOES = [
  { id: '1', nome: 'Liga Regional Oeste 2025', local: 'Ginásio Luzerna', data: '18 Dez - 20 Dez', status: 'Em andamento' },
  { id: '2', nome: 'Copa Santa Catarina', local: 'Joaçaba - SC', data: '15 Jan 2026', status: 'Inscrições' },
  { id: '3', nome: 'Amistoso de Verão', local: 'Herval d\'Oeste', data: '10 Fev 2026', status: 'Agendado' },
];

export default function CompeticoesListScreen() {

  const renderItem = ({ item }: any) => {
    const isActive = item.status === 'Em andamento';
    const badgeColor = isActive ? '#E6F4EA' : '#FEF7E0';
    const textColor = isActive ? '#137333' : '#B06000';

    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.7}>
        <View style={styles.cardHeader}>
          <View style={styles.iconBox}>
            <Ionicons name="trophy" size={18} color={AppTheme.primary} />
          </View>
          <View style={[styles.statusBadge, { backgroundColor: badgeColor }]}>
            <Text style={[styles.statusText, { color: textColor }]}>{item.status}</Text>
          </View>
        </View>
        <Text style={styles.cardTitle}>{item.nome}</Text>
        <View style={styles.cardFooter}>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={14} color="#666" />
            <Text style={styles.infoText}>{item.local}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={14} color="#666" />
            <Text style={styles.infoText}>{item.data}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={AppTheme.primary} />
      <FlatList
        data={MOCK_COMPETICOES}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' },
  listContent: { padding: 16, paddingBottom: 100 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  iconBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, justifyContent: 'center' },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoText: { fontSize: 13, color: '#666', marginLeft: 6, fontWeight: '500' },
});