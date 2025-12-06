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

// --- CONFIGURAÇÕES DA META / FACEBOOK ---
const APP_ID = '1573304237189416';
const APP_SECRET = 'b0032bdd45552be2364e261d508a71e8'; 
// A URL abaixo deve ser idêntica à cadastrada em "Login do Facebook > Configurações"
const REDIRECT_URI = 'https://app.handluz.brassertech.com.br/auth/callback';

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
  const [instagramPosts, setInstagramPosts] = useState<any[]>([]);
  const [instagramLoading, setInstagramLoading] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // Carrega dados iniciais
  useEffect(() => {
    loadHomeData();
  }, []);

  // --- LÓGICA DE AUTENTICAÇÃO (OAUTH) ---

  // 1. Escuta o retorno do navegador (Deep Link)
  useEffect(() => {
    const handleUrl = async ({ url }: { url: string }) => {
      console.log('[DEBUG INSTA] URL recebida:', url);
      
      // Verifica se a URL pertence ao nosso callback
      if (url && url.startsWith(REDIRECT_URI)) {
        // Tenta extrair o código ?code=...
        const regex = /[?&]code=([^#&]+)/;
        const match = url.match(regex);
        
        if (match && match[1]) {
          const code = match[1];
          console.log('[DEBUG INSTA] Code extraído:', code);
          await exchangeCodeForToken(code);
        } else {
          console.log('[DEBUG INSTA] Nenhum code encontrado na URL.');
        }
      }
    };

    // Adiciona o ouvinte
    const subscription = Linking.addEventListener('url', handleUrl);
    return () => {
      subscription.remove();
    };
  }, []);

  // 2. Inicia o Login (Botão Conectar)
  const initiateInstagramConnection = async () => {
    if (isConnected) return;
    
    console.log('[DEBUG INSTA] Iniciando login...');
    setInstagramLoading(true);
    
    // Scopes corrigidos: Apenas o básico e páginas (sem mensagens para evitar erro extra)
    // Se o erro "Invalid Scopes" persistir, verifique se 'instagram_basic' e 'pages_show_list'
    // foram adicionados no painel "Casos de Uso" da Meta.
    const scopes = 'instagram_basic,pages_show_list';
    
    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${scopes}&response_type=code`;
    
    try {
      const supported = await Linking.canOpenURL(authUrl);
      if (supported) {
        await Linking.openURL(authUrl);
      } else {
        Alert.alert('Erro', 'Navegador não suportado.');
        setInstagramLoading(false);
      }
    } catch (err) {
      console.error('[DEBUG INSTA] Erro ao abrir link:', err);
      setInstagramLoading(false);
    }
  };

  // 3. Troca o Code pelo Token
  const exchangeCodeForToken = async (code: string) => {
    try {
      console.log('[DEBUG INSTA] Trocando code por token...');
      const cleanCode = code.replace('#_', '');
      
      const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&client_secret=${APP_SECRET}&code=${cleanCode}`;
      
      const response = await fetch(tokenUrl);
      const data = await response.json();

      if (data.access_token) {
        console.log('[DEBUG INSTA] Token obtido!');
        await fetchInstagramAccountId(data.access_token);
      } else {
        console.error('[DEBUG INSTA] Erro no token:', data);
        Alert.alert('Erro', 'Falha na autenticação com Facebook.');
        setInstagramLoading(false);
      }
    } catch (error) {
      console.error('[DEBUG INSTA] Erro de rede:', error);
      setInstagramLoading(false);
    }
  };

  // 4. Busca o ID do Instagram Business vinculado
  const fetchInstagramAccountId = async (accessToken: string) => {
    try {
      console.log('[DEBUG INSTA] Buscando contas...');
      // Pega as páginas do usuário
      const pagesUrl = `https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`;
      const pagesResp = await fetch(pagesUrl);
      const pagesData = await pagesResp.json();

      let instagramBizId = null;

      if (pagesData.data) {
        // Varre as páginas para achar qual tem Instagram conectado
        for (const page of pagesData.data) {
           const pageDetailsUrl = `https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account&access_token=${accessToken}`;
           const detailResp = await fetch(pageDetailsUrl);
           const detailData = await detailResp.json();
           
           if (detailData.instagram_business_account) {
             instagramBizId = detailData.instagram_business_account.id;
             console.log('[DEBUG INSTA] ID do Instagram encontrado:', instagramBizId);
             break;
           }
        }
      }

      if (instagramBizId) {
        setIsConnected(true);
        await fetchInstagramMedia(instagramBizId, accessToken);
      } else {
        Alert.alert('Atenção', 'Nenhuma conta Instagram Business vinculada encontrada.');
        setInstagramLoading(false);
      }
    } catch (err) {
      console.error('[DEBUG INSTA] Erro ao buscar ID:', err);
      setInstagramLoading(false);
    }
  };

  // 5. Busca as fotos/feed
  const fetchInstagramMedia = async (instagramId: string, accessToken: string) => {
    try {
      console.log('[DEBUG INSTA] Buscando fotos...');
      const fields = 'id,caption,media_type,media_url,permalink,timestamp,thumbnail_url';
      const url = `https://graph.facebook.com/v18.0/${instagramId}/media?fields=${fields}&access_token=${accessToken}&limit=6`;
      
      const response = await fetch(url);
      const json = await response.json();
      
      if (json.data) {
        const formattedPosts = json.data.map((item: any) => ({
          id: item.id,
          imageUrl: item.media_type === 'VIDEO' ? item.thumbnail_url : item.media_url,
          caption: item.caption || '',
          takenAt: item.timestamp,
          permalink: item.permalink
        }));
        setInstagramPosts(formattedPosts);
      }
    } catch (err) {
      console.error('[DEBUG INSTA] Erro ao carregar feed:', err);
    } finally {
      setInstagramLoading(false);
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
        
        {/* Botão de Conectar */}
        {!isConnected && (
           <TouchableOpacity onPress={initiateInstagramConnection} style={styles.connectButton} disabled={instagramLoading}>
             {instagramLoading ? (
                <ActivityIndicator size="small" color="#FFF" />
             ) : (
                <>
                  <Ionicons name="logo-instagram" size={16} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.connectButtonText}>Conectar</Text>
                </>
             )}
           </TouchableOpacity>
        )}
      </View>

      <View style={styles.instagramCard}>
        {instagramLoading ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={AppTheme.primary} />
            <Text style={{ marginTop: 10, fontSize: 12, color: AppTheme.textSecondary }}>Aguardando Facebook...</Text>
          </View>
        ) : instagramPosts.length === 0 ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Text style={{ color: AppTheme.textSecondary, textAlign: 'center' }}>
              {isConnected ? 'Nenhuma publicação recente.' : 'Conecte para ver o feed oficial.'}
            </Text>
          </View>
        ) : (
          <View style={styles.instagramVerticalList}>
            {instagramPosts.map(post => (
              <TouchableOpacity key={post.id} style={styles.instagramPostCard} onPress={() => post.permalink && handleOpenUrl(post.permalink)}>
                {post.imageUrl && (
                  <Image source={{ uri: post.imageUrl }} style={styles.instagramImage} resizeMode="cover" />
                )}
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
  categoryButton: { width: '30%', aspectRatio: 1, backgroundColor: AppTheme.primary, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  categoryText: { marginTop: 6, color: '#FFF', fontWeight: '600', fontSize: 11 },
  connectButton: { backgroundColor: '#E1306C', flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  connectButtonText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  instagramCard: { backgroundColor: AppTheme.surface, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: AppTheme.border, minHeight: 100 },
  instagramVerticalList: { gap: 16 },
  instagramPostCard: { borderRadius: 14, backgroundColor: '#fff', overflow: 'hidden', borderWidth: 1, borderColor: AppTheme.border },
  instagramImage: { width: '100%', height: 260 },
  instagramPostBody: { padding: 10 },
  instagramCaption: { fontSize: 13, color: AppTheme.textPrimary },
  instagramDate: { fontSize: 11, color: AppTheme.textSecondary, marginTop: 4 },
});