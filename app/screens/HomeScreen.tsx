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

import { AppTheme } from '../../constants/theme';
import { supabase } from '../services/supabaseClient';

// LOGO (ajuste o caminho conforme seu projeto)
const handluzLogo = require('../../assets/images/logo_handluz.png');

// Configuração do feed de Instagram via backend próprio
// O backend deve expor um endpoint que retorne JSON no formato:
// [{ id, imageUrl, caption, permalink, takenAt }, ...]
const INSTAGRAM_CONFIG = {
  feedEndpoint: 'https://seu-servidor.com/instagram-feed', // troque pelo seu endpoint real
};

// Tipo das postagens de Instagram exibidas no app
type InstagramPost = {
  id: string;
  imageUrl: string;
  caption: string;
  permalink?: string | null;
  takenAt?: string | null; // ISO date
};

// Lista mockada para uso enquanto o backend não estiver pronto
const MOCK_INSTAGRAM_POSTS: InstagramPost[] = [
  {
    id: '1',
    imageUrl:
      'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=800&q=80',
    caption: 'Treino da equipe adulta em preparação para a temporada 2025.',
    permalink: undefined,
    takenAt: '2025-03-10',
  },
  {
    id: '2',
    imageUrl:
      'https://images.unsplash.com/photo-1559703248-dcaaec9fab78?auto=format&fit=crop&w=800&q=80',
    caption: 'Categorias de base iniciando o ciclo de formação no HandLuz.',
    permalink: undefined,
    takenAt: '2025-03-05',
  },
];

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
  start_date: string | null; // yyyy-mm-dd
  end_date: string | null;   // yyyy-mm-dd
  pdf_url: string | null;
};

type Match = {
  id: string;
  competition_id: string | null;
  home_team: string | null;
  away_team: string | null;
  category: string | null;
  match_date: string | null; // yyyy-mm-dd
  match_time: string | null; // HH:MM:SS
  venue: string | null;
  live_url: string | null;
};

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatDateLabel(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR');
}

function formatTimeLabel(timeStr: string | null): string {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  return `${(h ?? '').padStart(2, '0')}:${(m ?? '').padStart(2, '0')}`;
}

export default function HomeScreen() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [stats, setStats] = useState<SummaryStats>({
    athletes: 0,
    teams: 0,
    trainingsMonth: 0,
  });

  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);

  const [loading, setLoading] = useState<boolean>(false);

  // Estado do feed do Instagram
  const [instagramPosts, setInstagramPosts] = useState<InstagramPost[]>([]);
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

      const [
        { data: teamsData, error: teamsError },
        { count: athletesCount, error: athletesError },
        { count: trainingsCount, error: trainingsError },
        { data: compsData, error: compsError },
        { data: matchesData, error: matchesError },
      ] = await Promise.all([
        supabase.from('teams').select('id, name').order('name', {
          ascending: true,
        }),
        supabase.from('athletes').select('id', { count: 'exact', head: true }),
        supabase
          .from('trainings')
          .select('id', { count: 'exact', head: true })
          .gte('training_date', monthStartIso)
          .lte('training_date', monthEndIso),
        supabase
          .from('competitions')
          .select(
            'id, name, category, location, start_date, end_date, pdf_url'
          )
          .or(`start_date.gte.${todayIso},end_date.gte.${todayIso}`)
          .order('start_date', { ascending: true }),
        supabase
          .from('matches')
          .select(
            'id, competition_id, home_team, away_team, category, match_date, match_time, venue, live_url'
          )
          .gte('match_date', todayIso)
          .order('match_date', { ascending: true })
          .limit(10),
      ]);

      if (teamsError || athletesError || trainingsError || compsError || matchesError) {
        console.error('[Home] Erro ao carregar dados:', {
          teamsError,
          athletesError,
          trainingsError,
          compsError,
          matchesError,
        });
        Alert.alert(
          'Erro',
          'Não foi possível carregar todas as informações da tela inicial.'
        );
      }

      setTeams((teamsData ?? []) as Team[]);
      setStats({
        athletes: athletesCount ?? 0,
        teams: (teamsData ?? []).length,
        trainingsMonth: trainingsCount ?? 0,
      });

      setCompetitions((compsData ?? []) as Competition[]);

      const sortedMatches = (matchesData ?? [])
        .sort((a, b) => {
          if (a.match_date !== b.match_date) {
            return (a.match_date || '').localeCompare(b.match_date || '');
          }
          return (a.match_time || '').localeCompare(b.match_time || '');
        })
        .slice(0, 5) as Match[];

      setMatches(sortedMatches);
    } catch (err) {
      console.error('[Home] Erro inesperado:', err);
      Alert.alert('Erro', 'Ocorreu um erro inesperado ao carregar os dados.');
    } finally {
      setLoading(false);
    }
  }

  async function loadInstagramFeed() {
    setInstagramLoading(true);
    try {
      if (!INSTAGRAM_CONFIG.feedEndpoint) {
        // se não houver endpoint configurado, usa mock
        setInstagramPosts(MOCK_INSTAGRAM_POSTS);
        setInstagramLoading(false);
        return;
      }

      const response = await fetch(INSTAGRAM_CONFIG.feedEndpoint);
      if (!response.ok) {
        console.warn('[Home] Endpoint de Instagram retornou erro HTTP, usando mock.');
        setInstagramPosts(MOCK_INSTAGRAM_POSTS);
        setInstagramLoading(false);
        return;
      }

      const json = await response.json();
      // espera-se que venha algo como { data: InstagramPost[] } ou um array direto
      const posts: InstagramPost[] = Array.isArray(json)
        ? json
        : Array.isArray(json.data)
        ? json.data
        : [];

      if (posts.length === 0) {
        setInstagramPosts(MOCK_INSTAGRAM_POSTS);
      } else {
        setInstagramPosts(posts);
      }
    } catch (err) {
      console.error('[Home] Erro ao carregar feed do Instagram, usando mock:', err);
      setInstagramPosts(MOCK_INSTAGRAM_POSTS);
    } finally {
      setInstagramLoading(false);
    }
  }

  async function handleOpenUrl(url: string | null | undefined) {
    if (!url) return;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Link inválido', 'Não foi possível abrir este link.');
      }
    } catch (err) {
      console.error('[Home] Erro ao abrir URL:', err);
      Alert.alert('Erro', 'Ocorreu um erro ao tentar abrir o link.');
    }
  }

  function formatInstagramDate(iso?: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Card Principal / Logo / Apresentação / Resumo */}
      <View style={styles.eventCard}>
        <View style={styles.eventHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eventTitle}>HandLuz 2025</Text>
            <View style={styles.eventDateRow}>
              <Ionicons
                name="calendar-outline"
                size={14}
                color={AppTheme.textSecondary}
              />
              <Text style={styles.eventDate}>
                18 de março a 5 de dezembro
              </Text>
            </View>
            <View style={styles.eventDateRow}>
              <Ionicons
                name="location-outline"
                size={14}
                color={AppTheme.textSecondary}
              />
              <Text style={styles.eventDate}>
                Luzerna - Santa Catarina
              </Text>
            </View>
          </View>

          <View style={styles.logoWrapper}>
            <Image
              source={handluzLogo}
              style={styles.eventLogo}
              resizeMode="contain"
            />
          </View>
        </View>

        <View style={styles.introWrapper}>
          <Text style={styles.introTitle}>
            Clube HandLuz – Formação em Handebol
          </Text>
          <Text style={styles.introText}>
            O HandLuz é o clube de handebol da cidade de Luzerna/SC, voltado à
            formação esportiva de crianças, jovens e adultos. Este aplicativo
            acompanha treinos, equipes, competições e notícias oficiais do
            projeto, aproximando atletas, famílias e comunidade.
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

      {/* Modalidades / Categorias */}
      <Text style={styles.sectionTitle}>MODALIDADES / CATEGORIAS</Text>
      {loading && teams.length === 0 ? (
        <ActivityIndicator
          size="small"
          color={AppTheme.primary}
          style={{ marginVertical: 8 }}
        />
      ) : teams.length === 0 ? (
        <Text style={styles.emptyText}>
          Nenhuma equipe cadastrada ainda. Quando houver equipes,
          elas aparecerão aqui como categorias.
        </Text>
      ) : (
        <View style={styles.categoriesGrid}>
          {teams.map(team => (
            <View key={team.id} style={styles.categoryButton}>
              <Ionicons name="person-outline" size={24} color="#FFF" />
              <Text style={styles.categoryText}>{team.name}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Feed do Instagram dentro do app */}
      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
        FEED DO INSTAGRAM
      </Text>
      <View style={styles.instagramCard}>
        {instagramLoading ? (
          <ActivityIndicator size="small" color={AppTheme.primary} />
        ) : instagramPosts.length === 0 ? (
          <Text style={styles.emptyText}>
            Nenhuma publicação disponível no momento.
          </Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.instagramScrollContent}
          >
            {instagramPosts.map(post => (
              <TouchableOpacity
                key={post.id}
                style={styles.instagramPostCard}
                activeOpacity={post.permalink ? 0.8 : 1}
                onPress={() => {
                  if (post.permalink) {
                    handleOpenUrl(post.permalink);
                  }
                }}
              >
                <Image
                  source={{ uri: post.imageUrl }}
                  style={styles.instagramImage}
                />
                <View style={styles.instagramPostBody}>
                  <Text
                    numberOfLines={2}
                    style={styles.instagramCaption}
                  >
                    {post.caption}
                  </Text>
                  {post.takenAt ? (
                    <Text style={styles.instagramDate}>
                      {formatInstagramDate(post.takenAt)}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
        <Text style={styles.instagramHint}>
          As postagens são sincronizadas a partir de um serviço próprio que
          consome a API oficial do Instagram.
        </Text>
      </View>

      {/* Última notícia (estática por enquanto) */}
      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
        ÚLTIMA NOTÍCIA
      </Text>
      <View style={styles.newsCard}>
        <Image
          source={{
            uri: 'https://images.unsplash.com/photo-1607344645866-009c320b38a7',
          }}
          style={styles.newsImage}
        />
        <Text style={styles.newsTitle}>
          Preparativos para a temporada 2025!
        </Text>
        <Text style={styles.newsExcerpt}>
          Em breve, esta área poderá destacar notícias específicas do
          calendário do HandLuz, complementando as informações do feed.
        </Text>
        <Text style={styles.newsDate}>10 de março, 15:26</Text>
      </View>

      {/* Próximas competições */}
      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
        PRÓXIMAS COMPETIÇÕES
      </Text>
      {competitions.length === 0 ? (
        <Text style={styles.emptyText}>
          Nenhuma competição cadastrada. Utilize a tela de Diretoria
          para registrar as próximas etapas e campeonatos.
        </Text>
      ) : (
        competitions.map(comp => (
          <View key={comp.id} style={styles.compCard}>
            <Text style={styles.compTitle}>
              {comp.name || 'Competição sem nome'}
            </Text>
            {comp.category ? (
              <Text style={styles.compTag}>{comp.category}</Text>
            ) : null}
            {(comp.start_date || comp.end_date) && (
              <Text style={styles.compLine}>
                {formatDateLabel(comp.start_date)}{' '}
                {comp.end_date
                  ? `a ${formatDateLabel(comp.end_date)}`
                  : ''}
              </Text>
            )}
            {comp.location ? (
              <Text style={styles.compLine}>{comp.location}</Text>
            ) : null}
            {comp.pdf_url ? (
              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => handleOpenUrl(comp.pdf_url)}
              >
                <Ionicons
                  name="document-text-outline"
                  size={14}
                  color={AppTheme.primary}
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.linkButtonText}>
                  Ver regulamento / boletim
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ))
      )}

      {/* Próximos jogos */}
      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
        PRÓXIMOS JOGOS
      </Text>
      {matches.length === 0 ? (
        <Text style={styles.emptyText}>
          Nenhum jogo cadastrado. Registre os próximos confrontos
          na tela de Diretoria.
        </Text>
      ) : (
        matches.map(match => {
          const comp = competitions.find(
            c => c.id === match.competition_id
          );
          return (
            <View key={match.id} style={styles.matchWrapper}>
              <View style={styles.matchTag}>
                <Text style={styles.matchTagText}>
                  {match.category
                    ? `${match.category}`
                    : 'Jogo oficial'}{' '}
                  {match.match_date
                    ? `– ${formatDateLabel(match.match_date)}`
                    : ''}
                  {match.match_time
                    ? ` – ${formatTimeLabel(match.match_time)}`
                    : ''}
                </Text>
              </View>
              <View style={styles.matchCard}>
                {comp?.name ? (
                  <Text style={styles.matchCompetition}>
                    {comp.name}
                  </Text>
                ) : null}
                <Text style={styles.matchTeams}>
                  {match.home_team || 'HandLuz'} vs{' '}
                  {match.away_team || 'Adversário'}
                </Text>
                {match.venue ? (
                  <Text style={styles.matchVenue}>
                    {match.venue}
                  </Text>
                ) : null}

                {match.live_url ? (
                  <TouchableOpacity
                    style={styles.watchButton}
                    onPress={() => handleOpenUrl(match.live_url)}
                  >
                    <Ionicons
                      name="play-circle-outline"
                      size={18}
                      color="#FFF"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.watchButtonText}>
                      Assistir ao vivo
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppTheme.background,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
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
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
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
    marginBottom: 4,
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
  instagramCard: {
    backgroundColor: AppTheme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppTheme.border,
    padding: 12,
  },
  instagramScrollContent: {
    gap: 10,
  },
  instagramPostCard: {
    width: 220,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: AppTheme.border,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  instagramImage: {
    width: '100%',
    height: 140,
  },
  instagramPostBody: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  instagramCaption: {
    fontSize: 12,
    color: AppTheme.textPrimary,
  },
  instagramDate: {
    fontSize: 11,
    color: AppTheme.textSecondary,
    marginTop: 4,
  },
  instagramHint: {
    marginTop: 8,
    fontSize: 11,
    color: AppTheme.textMuted,
  },
  newsCard: {
    backgroundColor: AppTheme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppTheme.border,
    padding: 12,
  },
  newsImage: {
    width: '100%',
    height: 150,
    borderRadius: 12,
    marginBottom: 10,
  },
  newsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: AppTheme.textPrimary,
    marginBottom: 4,
  },
  newsExcerpt: {
    fontSize: 13,
    color: AppTheme.textSecondary,
    marginBottom: 6,
  },
  newsDate: {
    fontSize: 11,
    color: AppTheme.textMuted,
    textAlign: 'right',
  },
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
  matchWrapper: {
    marginTop: 10,
  },
  matchTag: {
    backgroundColor: AppTheme.primary,
    padding: 6,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  matchTagText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  matchCard: {
    backgroundColor: AppTheme.surface,
    borderWidth: 1,
    borderColor: AppTheme.border,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  matchCompetition: {
    fontSize: 13,
    color: AppTheme.textSecondary,
    marginBottom: 2,
  },
  matchTeams: {
    fontSize: 15,
    fontWeight: '600',
    color: AppTheme.textPrimary,
  },
  matchVenue: {
    fontSize: 12,
    color: AppTheme.textSecondary,
    marginTop: 4,
  },
  watchButton: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: AppTheme.primary,
  },
  watchButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
