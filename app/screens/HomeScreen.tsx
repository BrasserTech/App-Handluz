// app/screens/HomeScreen.tsx

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { AppTheme } from '../../constants/theme';
import { supabase } from '../services/supabaseClient';

// LOGO
const handluzLogo = require('../../assets/images/logo_handluz.png');

// CONFIG COMO NO INSTAGRAM REAL (caso você use API mais tarde)
const INSTAGRAM_CONFIG = {
  feedEndpoint: '',
};

// POST MOCKADO (10+ itens)
const MOCK_INSTAGRAM_POSTS = Array.from({ length: 10 }).map((_, i) => ({
  id: String(i + 1),
  imageUrl: `https://picsum.photos/seed/handluz${i}/800/800`,
  caption: `Publicação oficial do HandLuz nº ${i + 1}`,
  takenAt: `2025-03-${(i + 1).toString().padStart(2, '0')}`,
  permalink: undefined,
}));

// TYPES
type Team = {
  id: string;
  name: string;
};

type SummaryStats = {
  athletes: number;
  teams: number;
  trainingsMonth: number;
};

type Competition = {
  id: string;
  name: string | null;
  category: string | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  pdf_url: string | null;
};

// FORMATADORES
function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatDateLabel(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR');
}

// MAIN COMPONENT
export default function HomeScreen() {
  const navigation = useNavigation<any>();

  const [teams, setTeams] = useState<Team[]>([]);
  const [stats, setStats] = useState<SummaryStats>({
    athletes: 0,
    teams: 0,
    trainingsMonth: 0,
  });

  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const [instagramPosts, setInstagramPosts] = useState(MOCK_INSTAGRAM_POSTS);
  const [instagramLoading, setInstagramLoading] = useState<boolean>(false);

  useEffect(() => {
    loadHomeData();
    loadInstagramFeed();
  }, []);

  async function loadHomeData() {
    setLoading(true);

    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const monthStartIso = toIsoDate(monthStart);
      const monthEndIso = toIsoDate(monthEnd);
      const todayIso = toIsoDate(now);

      const [teamsResp, athletesResp, trainingsResp, compsResp] = await Promise.all([
        supabase.from('teams').select('id, name').order('name'),
        supabase.from('athletes').select('id', { count: 'exact', head: true }),
        supabase
          .from('trainings')
          .select('id', { count: 'exact', head: true })
          .gte('training_date', monthStartIso)
          .lte('training_date', monthEndIso),

        supabase
          .from('competitions')
          .select('id, name, category, location, start_date, end_date, pdf_url')
          .or(`start_date.gte.${todayIso},end_date.gte.${todayIso}`)
          .order('start_date', { ascending: true }),
      ]);

      const teamsData = teamsResp.data ?? [];
      const compsData = compsResp.data ?? [];

      setTeams(teamsData);
      setStats({
        athletes: athletesResp.count ?? 0,
        teams: teamsData.length,
        trainingsMonth: trainingsResp.count ?? 0,
      });

      setCompetitions(compsData);
    } catch {
      Alert.alert('Erro', 'Falha ao carregar dados.');
    } finally {
      setLoading(false);
    }
  }

  async function loadInstagramFeed() {
    setInstagramLoading(true);

    try {
      if (!INSTAGRAM_CONFIG.feedEndpoint) {
        setInstagramPosts(MOCK_INSTAGRAM_POSTS);
        setInstagramLoading(false);
        return;
      }

      const response = await fetch(INSTAGRAM_CONFIG.feedEndpoint);
      const json = await response.json();
      const posts = Array.isArray(json) ? json : json.data ?? [];
      setInstagramPosts(posts.slice(0, 10));
    } catch {
      setInstagramPosts(MOCK_INSTAGRAM_POSTS);
    } finally {
      setInstagramLoading(false);
    }
  }

  function handleNavigateToTeam(id: string, name: string) {
    navigation.navigate('Equipes', {
      screen: 'EquipeAtletas',
      params: { equipeId: id, equipeNome: name },
    });
  }

  async function handleOpenUrl(url?: string | null) {
    if (!url) return;
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      Linking.openURL(url);
    } else {
      Alert.alert('Erro', 'Não foi possível abrir o link.');
    }
  }

  function formatInstagramDate(iso?: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      
      {/* HEADER PRINCIPAL */}
      <View style={styles.eventCard}>
        <View style={styles.eventHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eventTitle}>HandLuz 2025</Text>

            <View style={styles.eventDateRow}>
              <Ionicons name="calendar-outline" size={14} color={AppTheme.textSecondary} />
              <Text style={styles.eventDate}>18 de março a 5 de dezembro</Text>
            </View>

            <View style={styles.eventDateRow}>
              <Ionicons name="location-outline" size={14} color={AppTheme.textSecondary} />
              <Text style={styles.eventDate}>Luzerna - Santa Catarina</Text>
            </View>
          </View>

          <View style={styles.logoWrapper}>
            <Image source={handluzLogo} style={styles.eventLogo} resizeMode="contain" />
          </View>
        </View>

        <View style={styles.introWrapper}>
          <Text style={styles.introTitle}>Clube HandLuz – Formação em Handebol</Text>

          <Text style={styles.introText}>
            O HandLuz é o clube de handebol da cidade de Luzerna/SC, acompanhando treinos,
            equipes, competições e notícias oficiais do projeto.
          </Text>
        </View>

        <View style={styles.statsRow}>
          {loading ? (
            <ActivityIndicator size="small" color={AppTheme.primary} />
          ) : (
            <>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{stats.athletes}</Text>
                <Text style={styles.statLabel}>Atletas</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{stats.teams}</Text>
                <Text style={styles.statLabel}>Times</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{stats.trainingsMonth}</Text>
                <Text style={styles.statLabel}>Treinos no mês</Text>
              </View>
            </>
          )}
        </View>
      </View>

      {/* MODALIDADES */}
      <Text style={styles.sectionTitle}>MODALIDADES / CATEGORIAS</Text>

      {teams.length === 0 ? (
        <Text style={styles.emptyText}>Nenhuma equipe cadastrada ainda.</Text>
      ) : (
        <View style={styles.categoriesGrid}>
          {teams.map(team => (
            <TouchableOpacity
              key={team.id}
              style={styles.categoryButton}
              onPress={() => handleNavigateToTeam(team.id, team.name)}
            >
              <Ionicons name="person-outline" size={24} color="#FFF" />
              <Text style={styles.categoryText}>{team.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* PRÓXIMAS COMPETIÇÕES */}
      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>PRÓXIMAS COMPETIÇÕES</Text>

      {competitions.length === 0 ? (
        <Text style={styles.emptyText}>Nenhuma competição cadastrada.</Text>
      ) : (
        competitions.map(comp => (
          <View key={comp.id} style={styles.compCard}>
            <Text style={styles.compTitle}>{comp.name}</Text>

            {comp.category && <Text style={styles.compTag}>{comp.category}</Text>}

            {(comp.start_date || comp.end_date) && (
              <Text style={styles.compLine}>
                {formatDateLabel(comp.start_date)}
                {comp.end_date ? ` a ${formatDateLabel(comp.end_date)}` : ''}
              </Text>
            )}

            {comp.location && <Text style={styles.compLine}>{comp.location}</Text>}

            {comp.pdf_url && (
              <TouchableOpacity style={styles.linkButton} onPress={() => handleOpenUrl(comp.pdf_url)}>
                <Ionicons name="document-text-outline" size={14} color={AppTheme.primary} />
                <Text style={styles.linkButtonText}>Ver regulamento</Text>
              </TouchableOpacity>
            )}
          </View>
        ))
      )}

      {/* FEED DO INSTAGRAM - LISTA VERTICAL */}
      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>FEED DO INSTAGRAM</Text>

      <View style={styles.instagramCard}>
        {instagramLoading ? (
          <ActivityIndicator size="small" color={AppTheme.primary} />
        ) : (
          <View style={styles.instagramVerticalList}>
            {instagramPosts.map(post => (
              <TouchableOpacity
                key={post.id}
                style={styles.instagramPostCard}
                onPress={() => post.permalink && handleOpenUrl(post.permalink)}
              >
                <Image source={{ uri: post.imageUrl }} style={styles.instagramImage} />

                <View style={styles.instagramPostBody}>
                  <Text numberOfLines={3} style={styles.instagramCaption}>{post.caption}</Text>

                  {post.takenAt && (
                    <Text style={styles.instagramDate}>{formatInstagramDate(post.takenAt)}</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.instagramHint}>
          As publicações são sincronizadas automaticamente via serviço próprio.
        </Text>
      </View>
    </ScrollView>
  );
}

/* ---------------------------- STYLES ---------------------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppTheme.background,
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  /* HEADER PRINCIPAL */
  eventCard: {
    backgroundColor: AppTheme.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: AppTheme.border,
  },

  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  eventTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: AppTheme.textPrimary,
  },

  eventDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },

  eventDate: {
    marginLeft: 6,
    color: AppTheme.textSecondary,
    fontSize: 12,
  },

  logoWrapper: {
    width: 70,
    height: 70,
    borderRadius: 40,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },

  eventLogo: {
    width: 60,
    height: 60,
  },

  introWrapper: {
    marginTop: 12,
  },

  introTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: AppTheme.textPrimary,
  },

  introText: {
    fontSize: 12,
    color: AppTheme.textSecondary,
    lineHeight: 18,
  },

  statsRow: {
    flexDirection: 'row',
    marginTop: 16,
    justifyContent: 'space-around',
  },

  statBox: {
    alignItems: 'center',
  },

  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: AppTheme.primaryDark,
  },

  statLabel: {
    fontSize: 12,
    color: AppTheme.textSecondary,
  },

  /* TITULOS DE SESSÃO */
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: AppTheme.textPrimary,
    marginBottom: 10,
  },

  emptyText: {
    fontSize: 13,
    color: AppTheme.textSecondary,
    marginBottom: 10,
  },

  /* MODALIDADES */
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },

  categoryButton: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: AppTheme.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  categoryText: {
    marginTop: 6,
    color: '#FFF',
    fontWeight: '600',
    fontSize: 12,
    textAlign: 'center',
  },

  /* COMPETITIONS */
  compCard: {
    backgroundColor: AppTheme.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: AppTheme.border,
    padding: 12,
    marginBottom: 8,
  },

  compTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: AppTheme.textPrimary,
  },

  compTag: {
    fontSize: 11,
    color: AppTheme.primary,
    marginTop: 2,
  },

  compLine: {
    fontSize: 12,
    color: AppTheme.textSecondary,
    marginTop: 4,
  },

  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },

  linkButtonText: {
    fontSize: 12,
    color: AppTheme.primary,
    fontWeight: '600',
  },

  /* INSTAGRAM FEED */
  instagramCard: {
    backgroundColor: AppTheme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppTheme.border,
    padding: 12,
  },

  /* AGORA É FEED VERTICAL */
  instagramVerticalList: {
    flexDirection: 'column',
    gap: 16,
  },

  instagramPostCard: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: AppTheme.border,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },

  instagramImage: {
    width: '100%',
    height: 260,
  },

  instagramPostBody: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  instagramCaption: {
    fontSize: 13,
    color: AppTheme.textPrimary,
  },

  instagramDate: {
    fontSize: 11,
    color: AppTheme.textSecondary,
    marginTop: 4,
  },

  instagramHint: {
    marginTop: 12,
    fontSize: 11,
    color: AppTheme.textMuted,
  },
});
