// app/screens/HomeScreen.tsx

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Alert,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { AppTheme } from '../../constants/theme';
import { supabase } from '../services/supabaseClient';
import { INSTAGRAM_URL, INSTAGRAM_USERNAME, INSTAGRAM_GRID_CONFIG } from '../../constants/instagram';
import { fetchInstagramPosts, InstagramPost } from '../services/instagramService';

const { width } = Dimensions.get('window');

// Detectar se é tela grande (computador) - ajustar tamanho das categorias
const isDesktop = width >= INSTAGRAM_GRID_CONFIG.breakpoint;
const CATEGORY_WIDTH = isDesktop ? '10%' : '30%'; // Menor no desktop, normal no mobile

// Configuração responsiva do grid do Instagram (usando configurações do instagram.ts)
const gridConfig = isDesktop ? INSTAGRAM_GRID_CONFIG.desktop : INSTAGRAM_GRID_CONFIG.mobile;
const INSTAGRAM_COLUMNS = gridConfig.columns;
const INSTAGRAM_PADDING = gridConfig.padding;
const INSTAGRAM_GAP = gridConfig.gap;

// Calcular largura dos posts baseado no número de colunas responsivo
const POST_WIDTH = ((width - INSTAGRAM_PADDING - (INSTAGRAM_GAP * (INSTAGRAM_COLUMNS - 1))) / INSTAGRAM_COLUMNS) * INSTAGRAM_GRID_CONFIG.sizeMultiplier;

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
function formatInstagramDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// COMPONENTE PRINCIPAL
export default function HomeScreen() {
  const navigation = useNavigation<any>();

  // --- ESTADOS DO SISTEMA ---
  const [teams, setTeams] = useState<Team[]>([]);
  const [stats, setStats] = useState<SummaryStats>({ athletes: 0, teams: 0, trainingsMonth: 0 });
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // --- ESTADOS DO INSTAGRAM ---
  const [instagramPosts, setInstagramPosts] = useState<InstagramPost[]>([]);
  const [instagramLoading, setInstagramLoading] = useState<boolean>(false);

  // Carrega dados iniciais
  useEffect(() => {
    loadHomeData();
    loadInstagramPosts();
  }, []);

  // Função para buscar posts do Instagram
  async function loadInstagramPosts() {
    setInstagramLoading(true);
    try {
      const posts = await fetchInstagramPosts();
      setInstagramPosts(posts);
    } catch (err) {
      console.error('Erro ao buscar posts do Instagram:', err);
      setInstagramPosts([]);
    } finally {
      setInstagramLoading(false);
    }
  }

  // Função para abrir o Instagram
  const handleOpenInstagram = async () => {
    try {
      const supported = await Linking.canOpenURL(INSTAGRAM_URL);
      if (supported) {
        await Linking.openURL(INSTAGRAM_URL);
      } else {
        Alert.alert('Erro', 'Não foi possível abrir o Instagram.');
      }
    } catch (err) {
      console.error('Erro ao abrir Instagram:', err);
      Alert.alert('Erro', 'Não foi possível abrir o Instagram.');
    }
  };

  // Função para abrir um post específico
  const handleOpenPost = async (permalink: string) => {
    try {
      const supported = await Linking.canOpenURL(permalink);
      if (supported) {
        await Linking.openURL(permalink);
      }
    } catch (err) {
      console.error('Erro ao abrir post:', err);
    }
  };

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

      {/* FEED INSTAGRAM */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 10 }}>
        <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>FEED DO INSTAGRAM</Text>
        <TouchableOpacity onPress={handleOpenInstagram} style={styles.instagramHeaderButton}>
          <Ionicons name="logo-instagram" size={16} color="#E1306C" style={{ marginRight: 4 }} />
          <Text style={styles.instagramHeaderButtonText}>@{INSTAGRAM_USERNAME}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.instagramCard}>
        {instagramLoading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={AppTheme.primary} />
            <Text style={{ marginTop: 12, fontSize: 14, color: AppTheme.textSecondary }}>
              Carregando posts...
            </Text>
          </View>
        ) : instagramPosts.length === 0 ? (
          <View style={{ padding: 24, alignItems: 'center' }}>
            <View style={styles.instagramEmptyCard}>
              <Ionicons name="logo-instagram" size={56} color="#E1306C" style={{ marginBottom: 16 }} />
              <Text style={{ color: AppTheme.textPrimary, textAlign: 'center', fontSize: 18, fontWeight: '700', marginBottom: 8 }}>
                @{INSTAGRAM_USERNAME}
              </Text>
              <Text style={{ color: AppTheme.textSecondary, textAlign: 'center', fontSize: 14, marginBottom: 24, lineHeight: 20 }}>
                Siga-nos no Instagram para acompanhar todas as novidades, fotos dos treinos, competições e muito mais!
              </Text>
              <TouchableOpacity onPress={handleOpenInstagram} style={styles.instagramButton}>
                <Ionicons name="logo-instagram" size={22} color="#FFF" style={{ marginRight: 10 }} />
                <Text style={styles.instagramButtonText}>Seguir no Instagram</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View>
            <View style={[styles.instagramGrid, { gap: INSTAGRAM_GAP }]}>
              {instagramPosts.map((post) => (
                <TouchableOpacity
                  key={post.id}
                  style={[styles.instagramPostItem, { width: POST_WIDTH, height: POST_WIDTH }]}
                  onPress={() => handleOpenPost(post.permalink)}
                  activeOpacity={0.7}
                >
                  <Image
                    source={{ uri: post.imageUrl }}
                    style={styles.instagramPostImage}
                    resizeMode="cover"
                    onError={(error) => {
                      console.error(`[HomeScreen] Erro ao carregar imagem do post ${post.id}:`, error.nativeEvent?.error || error);
                    }}
                    onLoad={() => {
                      console.log(`[HomeScreen] Imagem carregada com sucesso: ${post.id}`);
                    }}
                  />
                  <View style={styles.instagramPostOverlay}>
                    <View style={styles.instagramPostStats}>
                      <Ionicons name="heart" size={12} color="#FFF" />
                      <Text style={styles.instagramPostStatsText}>
                        {post.likes > 1000 ? `${(post.likes / 1000).toFixed(1)}k` : post.likes}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity onPress={handleOpenInstagram} style={styles.instagramViewMoreButton}>
              <Text style={styles.instagramViewMoreText}>Ver mais no Instagram</Text>
              <Ionicons name="arrow-forward" size={16} color={AppTheme.primary} />
            </TouchableOpacity>
          </View>
        )}
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
  instagramCard: { backgroundColor: AppTheme.surface, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: AppTheme.border, minHeight: 100 },
  instagramEmptyCard: { width: '100%', alignItems: 'center', paddingVertical: 8 },
  instagramHeaderButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 8 },
  instagramHeaderButtonText: { color: '#E1306C', fontSize: 12, fontWeight: '600' },
  instagramButton: { backgroundColor: '#E1306C', flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 30, shadowColor: '#E1306C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  instagramButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  instagramGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  instagramPostItem: { position: 'relative', borderRadius: 8, overflow: 'hidden' },
  instagramPostImage: { width: '100%', height: '100%' },
  instagramPostOverlay: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    padding: 6,
  },
  instagramPostStats: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  instagramPostStatsText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  instagramViewMoreButton: { 
    marginTop: 12, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 12,
    gap: 6,
  },
  instagramViewMoreText: { color: AppTheme.primary, fontSize: 14, fontWeight: '600' },
});