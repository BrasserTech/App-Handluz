// app/screens/HomeScreen.tsx

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Linking,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { AppTheme } from '../../constants/theme';
import { supabase } from '../services/supabaseClient';

const { width } = Dimensions.get('window');

const isDesktop = width >= 768;
const CATEGORY_WIDTH = isDesktop ? '10%' : '30%'; // Menor no desktop, normal no mobile

// LOGO
const handluzLogo = require('../../assets/images/logo_handluz.png');

// TYPES
type Team = { id: string; name: string; };
type SummaryStats = { athletes: number; teams: number; trainingsMonth: number; };
type Competition = { id: string; name: string | null; category: string | null; location: string | null; start_date: string | null; end_date: string | null; pdf_url: string | null; };


// HELPERS DE DATA
function toIsoDate(d: Date): string { return d.toISOString().slice(0, 10); }
function formatDateLabel(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR');
}

// COMPONENTE PRINCIPAL
export default function HomeScreen() {
  const navigation = useNavigation<any>();

  // --- ESTADOS DO SISTEMA ---
  const [teams, setTeams] = useState<Team[]>([]);
  const [stats, setStats] = useState<SummaryStats>({ athletes: 0, teams: 0, trainingsMonth: 0 });
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Carrega dados iniciais
  useEffect(() => {
    loadHomeData();
  }, []);

  // --- FUNÇÕES DO SISTEMA (TEAMS, ETC) ---
  async function loadHomeData() {
    setLoading(true);
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
      const todayIso = now.toISOString().slice(0, 10);

      const [teamsResp, athletesResp, trainingsResp, compsResp] = await Promise.all([
        supabase.from('teams').select('id, name').order('name'),
        supabase.from('athletes').select('id', { count: 'exact', head: true }),
        supabase.from('trainings').select('id', { count: 'exact', head: true })
          .gte('training_date', monthStart).lte('training_date', monthEnd),
        supabase.from('competitions').select('*')
          .or(`start_date.gte.${todayIso},end_date.gte.${todayIso}`).order('start_date', { ascending: true }),
      ]);

      setTeams(teamsResp.data ?? []);
      setStats({
        athletes: athletesResp.count ?? 0,
        teams: (teamsResp.data ?? []).length,
        trainingsMonth: trainingsResp.count ?? 0,
      });
      setCompetitions(compsResp.data ?? []);
    } catch (err) {
      // log silencioso
    } finally {
      setLoading(false);
    }
  }

  function handleNavigateToTeam(id: string, name: string) {
    navigation.navigate('Equipes', { screen: 'EquipeAtletas', params: { equipeId: id, equipeNome: name } });
  }

  async function handleOpenUrl(url?: string | null) {
    if (url) await Linking.openURL(url);
  }


  // --- RENDER ---
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* HEADER */}
      <View style={styles.eventCard}>
        <View style={styles.eventHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eventTitle}>HandLuz 2025</Text>
            <View style={styles.eventDateRow}>
              <Ionicons name="location-outline" size={14} color={AppTheme.textSecondary} />
              <Text style={styles.eventDate}>Luzerna - Santa Catarina</Text>
            </View>
          </View>
          <View style={styles.logoWrapper}>
            <Image source={handluzLogo} style={styles.eventLogo} resizeMode="contain" />
          </View>
        </View>

        <View style={styles.statsRow}>
           <View style={styles.statBox}><Text style={styles.statNumber}>{stats.athletes}</Text><Text style={styles.statLabel}>Atletas</Text></View>
           <View style={styles.statBox}><Text style={styles.statNumber}>{stats.teams}</Text><Text style={styles.statLabel}>Times</Text></View>
           <View style={styles.statBox}><Text style={styles.statNumber}>{stats.trainingsMonth}</Text><Text style={styles.statLabel}>Treinos/Mês</Text></View>
        </View>
      </View>

      {/* CATEGORIAS */}
      <Text style={styles.sectionTitle}>CATEGORIAS</Text>
      <View style={styles.categoriesGrid}>
        {teams.map(team => (
          <TouchableOpacity key={team.id} style={styles.categoryButton} onPress={() => handleNavigateToTeam(team.id, team.name)}>
            <Ionicons name="people-outline" size={24} color="#FFF" />
            <Text style={styles.categoryText}>{team.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppTheme.background, paddingHorizontal: 16, paddingTop: 12 },
  eventCard: { backgroundColor: AppTheme.surface, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: AppTheme.border },
  eventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eventTitle: { fontSize: 20, fontWeight: '700', color: AppTheme.textPrimary },
  eventDate: { fontSize: 12, color: AppTheme.textSecondary },
  eventDateRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  logoWrapper: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  eventLogo: { width: 40, height: 40 },
  statsRow: { flexDirection: 'row', marginTop: 16, justifyContent: 'space-around' },
  statBox: { alignItems: 'center' },
  statNumber: { fontSize: 18, fontWeight: '700', color: AppTheme.primaryDark },
  statLabel: { fontSize: 12, color: AppTheme.textSecondary },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: AppTheme.textPrimary, marginBottom: 10 },
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryButton: { width: CATEGORY_WIDTH, aspectRatio: 1, backgroundColor: AppTheme.primary, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  categoryText: { marginTop: 6, color: '#FFF', fontWeight: '600', fontSize: 11 },
});
