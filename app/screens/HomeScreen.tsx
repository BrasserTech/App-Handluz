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
  ActivityIndicator,
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
type CompetitionStatus = 'agendado' | 'em_andamento' | 'encerrado';
type Competition = {
  id: string;
  title: string;
  category: string | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  status: CompetitionStatus;
  youtube_link: string | null;
};
type NewsItem = {
  id: string;
  title: string;
  description?: string | null;
  image_url?: string | null;
  created_at: string | null;
};

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
  const [news, setNews] = useState<NewsItem[]>([]);
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

      const [teamsResp, athletesResp, trainingsResp, compsResp] = await Promise.all([
        supabase.from('teams').select('id, name').order('name'),
        supabase.from('athletes').select('id', { count: 'exact', head: true }),
        supabase.from('trainings').select('id', { count: 'exact', head: true })
          .gte('training_date', monthStart).lte('training_date', monthEnd),
        supabase
          .from('competitions')
          .select('id, title, category, location, start_date, end_date, status, youtube_link')
          .in('status', ['agendado', 'em_andamento'])
          .order('start_date', { ascending: true }),
      ]);

      let newsData: NewsItem[] = [];
      const fullNewsResp = await supabase
        .from('news')
        .select('id, title, description, image_url, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      if (fullNewsResp.error) {
        if (fullNewsResp.error.message.includes('does not exist')) {
          const fallbackResp = await supabase
            .from('news')
            .select('id, title, created_at')
            .order('created_at', { ascending: false })
            .limit(5);
          if (!fallbackResp.error) {
            newsData = (fallbackResp.data ?? []) as NewsItem[];
          }
        }
      } else {
        newsData = (fullNewsResp.data ?? []) as NewsItem[];
      }

      setTeams(teamsResp.data ?? []);
      setStats({
        athletes: athletesResp.count ?? 0,
        teams: (teamsResp.data ?? []).length,
        trainingsMonth: trainingsResp.count ?? 0,
      });
      setCompetitions(compsResp.data ?? []);
      setNews(newsData);
    } catch {
      // log silencioso
    } finally {
      setLoading(false);
    }
  }

  function handleNavigateToTeam(id: string, name: string) {
    // Navega para a Tab "Equipes" e, dentro dela, para a tela "EquipeAtletas"
    navigation.navigate('Equipes', {
      screen: 'EquipeAtletas',
      params: { equipeId: id, equipeNome: name },
    });
  }

  async function handleOpenUrl(url?: string | null) {
    if (url) await Linking.openURL(url);
  }

  function handleNavigateToNoticias() {
    navigation.navigate('Noticias');
  }

  function handleNavigateToCompeticoes() {
    navigation.navigate('Competicoes', { screen: 'CompeticoesList' });
  }

  function handleOpenCompetitionMatches(competitionId: string) {
    navigation.navigate('Competicoes', {
      screen: 'CompeticoesList',
      params: { openCompetitionId: competitionId, openSection: 'matches' },
    });
  }

  function handleOpenCompetitionAthletes(competitionId: string) {
    navigation.navigate('Competicoes', {
      screen: 'CompeticoesList',
      params: { openCompetitionId: competitionId, openSection: 'athletes' },
    });
  }

  const ongoingCompetitions = competitions.filter(c => c.status === 'em_andamento');
  const scheduledCompetitions = competitions.filter(c => c.status === 'agendado');


  // --- RENDER ---
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
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

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>COMPETIÇÕES</Text>
        <TouchableOpacity style={styles.seeAllButton} onPress={handleNavigateToCompeticoes}>
          <Text style={styles.seeAllText}>Ver todas</Text>
          <Ionicons name="chevron-forward" size={16} color={AppTheme.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={AppTheme.primary} />
          <Text style={styles.loadingText}>Carregando competições...</Text>
        </View>
      ) : (
        <>
          <Text style={styles.subsectionTitle}>EM ANDAMENTO</Text>
          {ongoingCompetitions.length === 0 ? (
            <Text style={styles.emptyText}>Nenhuma competição em andamento.</Text>
          ) : (
            ongoingCompetitions.slice(0, 3).map((c) => (
              <View key={c.id} style={styles.compCard}>
                <View style={styles.compTopRow}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={styles.compTitle} numberOfLines={2}>{c.title}</Text>
                    <Text style={styles.compMeta} numberOfLines={1}>
                      {c.location ? c.location : 'Local não informado'}
                      {c.category ? ` • ${c.category}` : ''}
                    </Text>
                    <Text style={styles.compMeta} numberOfLines={1}>
                      {c.start_date ? `${formatDateLabel(c.start_date)}${c.end_date ? ` até ${formatDateLabel(c.end_date)}` : ''}` : 'Sem data'}
                    </Text>
                  </View>
                  <View style={[styles.statusPill, styles.statusPillOngoing]}>
                    <Text style={[styles.statusPillText, styles.statusPillTextOngoing]}>EM ANDAMENTO</Text>
                  </View>
                </View>

                <View style={styles.compActionsRow}>
                  <TouchableOpacity style={styles.compActionBtn} onPress={() => handleOpenCompetitionAthletes(c.id)}>
                    <Ionicons name="people-outline" size={16} color={AppTheme.primary} />
                    <Text style={styles.compActionText}>Atletas</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.compActionBtn, { marginLeft: 10 }]} onPress={() => handleOpenCompetitionMatches(c.id)}>
                    <Ionicons name="football-outline" size={16} color={AppTheme.primary} />
                    <Text style={styles.compActionText}>Jogos</Text>
                  </TouchableOpacity>
                  {c.youtube_link ? (
                    <TouchableOpacity style={[styles.compActionBtn, { marginLeft: 10 }]} onPress={() => handleOpenUrl(c.youtube_link)}>
                      <Ionicons name="logo-youtube" size={16} color="#FF0000" />
                      <Text style={[styles.compActionText, { color: '#FF0000' }]}>Assistir</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            ))
          )}

          <Text style={[styles.subsectionTitle, { marginTop: 14 }]}>AGENDADAS</Text>
          {scheduledCompetitions.length === 0 ? (
            <Text style={styles.emptyText}>Nenhuma competição agendada.</Text>
          ) : (
            scheduledCompetitions.slice(0, 3).map((c) => (
              <View key={c.id} style={styles.compCard}>
                <View style={styles.compTopRow}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={styles.compTitle} numberOfLines={2}>{c.title}</Text>
                    <Text style={styles.compMeta} numberOfLines={1}>
                      {c.location ? c.location : 'Local não informado'}
                      {c.category ? ` • ${c.category}` : ''}
                    </Text>
                    <Text style={styles.compMeta} numberOfLines={1}>
                      {c.start_date ? `${formatDateLabel(c.start_date)}${c.end_date ? ` até ${formatDateLabel(c.end_date)}` : ''}` : 'Sem data'}
                    </Text>
                  </View>
                  <View style={[styles.statusPill, styles.statusPillScheduled]}>
                    <Text style={[styles.statusPillText, styles.statusPillTextScheduled]}>AGENDADA</Text>
                  </View>
                </View>

                <View style={styles.compActionsRow}>
                  <TouchableOpacity style={styles.compActionBtn} onPress={() => handleOpenCompetitionAthletes(c.id)}>
                    <Ionicons name="people-outline" size={16} color={AppTheme.primary} />
                    <Text style={styles.compActionText}>Atletas</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.compActionBtn, { marginLeft: 10 }]} onPress={() => handleOpenCompetitionMatches(c.id)}>
                    <Ionicons name="football-outline" size={16} color={AppTheme.primary} />
                    <Text style={styles.compActionText}>Jogos</Text>
                  </TouchableOpacity>
                  {c.youtube_link ? (
                    <TouchableOpacity style={[styles.compActionBtn, { marginLeft: 10 }]} onPress={() => handleOpenUrl(c.youtube_link)}>
                      <Ionicons name="logo-youtube" size={16} color="#FF0000" />
                      <Text style={[styles.compActionText, { color: '#FF0000' }]}>Assistir</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            ))
          )}
        </>
      )}

      <View style={styles.newsHeaderRow}>
        <Text style={styles.sectionTitle}>NOTÍCIAS</Text>
        <TouchableOpacity style={styles.seeAllButton} onPress={handleNavigateToNoticias}>
          <Text style={styles.seeAllText}>Ver todas</Text>
          <Ionicons name="chevron-forward" size={16} color={AppTheme.primary} />
        </TouchableOpacity>
      </View>

      {news.length === 0 ? (
        <Text style={styles.emptyText}>Nenhuma notícia cadastrada.</Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.newsCarousel}
        >
          {news.map(item => (
            <View key={item.id} style={styles.newsCard}>
              {item.image_url ? (
                <Image source={{ uri: item.image_url }} style={styles.newsImage} />
              ) : null}
              <Text style={styles.newsTitle}>{item.title}</Text>
              {item.description ? (
                <Text style={styles.newsDescription}>{item.description}</Text>
              ) : null}
            </View>
          ))}
        </ScrollView>
      )}

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
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, marginBottom: 10 },
  subsectionTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 0.6, color: AppTheme.textSecondary, marginBottom: 8 },
  loadingRow: { flexDirection: 'row', alignItems: 'center' },
  loadingText: { marginLeft: 10, fontSize: 13, color: AppTheme.textSecondary },
  compCard: { backgroundColor: AppTheme.surface, borderRadius: 16, borderWidth: 1, borderColor: AppTheme.border, padding: 14, marginBottom: 10 },
  compTopRow: { flexDirection: 'row', alignItems: 'flex-start' },
  compTitle: { fontSize: 15, fontWeight: '800', color: AppTheme.textPrimary },
  compMeta: { marginTop: 4, fontSize: 12, color: AppTheme.textSecondary },
  statusPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  statusPillText: { fontSize: 10, fontWeight: '800' },
  statusPillOngoing: { backgroundColor: '#E6F4EA' },
  statusPillTextOngoing: { color: '#137333' },
  statusPillScheduled: { backgroundColor: '#FEF7E0' },
  statusPillTextScheduled: { color: '#B06000' },
  compActionsRow: { flexDirection: 'row', marginTop: 12, alignItems: 'center', flexWrap: 'wrap' },
  compActionBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: AppTheme.border, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, backgroundColor: '#FFF' },
  compActionText: { marginLeft: 8, fontSize: 12, fontWeight: '700', color: AppTheme.primary },
  newsHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 10 },
  seeAllButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  seeAllText: { color: AppTheme.primary, fontWeight: '600' },
  emptyText: { fontSize: 13, color: AppTheme.textSecondary },
  newsCarousel: { paddingRight: 8 },
  newsCard: { width: isDesktop ? 360 : Math.min(width - 48, 300), backgroundColor: AppTheme.surface, borderRadius: 16, borderWidth: 1, borderColor: AppTheme.border, padding: 14, marginRight: 12 },
  newsImage: { width: '100%', height: 160, borderRadius: 12, marginBottom: 10 },
  newsTitle: { fontSize: 15, fontWeight: '700', color: AppTheme.textPrimary },
  newsDescription: { marginTop: 6, fontSize: 13, color: AppTheme.textSecondary },
});
