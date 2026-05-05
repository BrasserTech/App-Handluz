// app/screens/DiretoriaScreen.tsx

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Linking,
  Image,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { AppTheme } from '../../constants/theme';
import { supabase } from '../services/supabaseClient';
import { usePermissions } from '../../hooks/usePermissions';

// ------- Tipos -------

type Competition = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_date: string | null; // yyyy-mm-dd
  end_date: string | null;   // yyyy-mm-dd
  category?: string | null;
  status?: 'agendado' | 'em_andamento' | 'encerrado';
  youtube_link?: string | null;
  placement?: string | null;
};

type Match = {
  id: string;
  competition_id: string | null;
  home_team: string | null;
  away_team: string | null;
  score_home: number | null;
  score_away: number | null;
  match_time: string | null;
  youtube_link: string | null;
  round: string | null;
};

type NewsItem = {
  id: string;
  title: string;
  created_at: string | null;
  image_url?: string | null;
  description?: string | null;
};

type CategoryAgeRow = {
  id: number;
  name: string;
  age_min: number | null;
  age_max: number | null;
  ageMinInput: string;
  ageMaxInput: string;
};

type CategoryFeedback = {
  type: 'success' | 'error' | 'info';
  message: string;
};

// ------- Utilidades simples de data/hora -------

function maskTime(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}


// ------- Componente principal -------

export default function DiretoriaScreen() {
  const { user, isDiretoriaOrAdmin } = usePermissions();
  const isAdmin = user?.role === 'admin';
  const { width: windowWidth } = useWindowDimensions();

  const categoryColumns =
    windowWidth >= 1700 ? 7 :
    windowWidth >= 1450 ? 6 :
    windowWidth >= 1200 ? 5 :
    windowWidth >= 960 ? 4 :
    windowWidth >= 720 ? 3 :
    windowWidth >= 520 ? 2 : 1;
  const categoryGridGap = 8;
  const categorySectionHorizontalPadding = 32;
  const categoryCardWidth = Math.floor(
    (windowWidth - categorySectionHorizontalPadding - categoryGridGap * 2 * categoryColumns) /
      categoryColumns
  );
  const categoryToastWidth = Math.max(
    180,
    Math.min(windowWidth - 32, Math.floor(windowWidth / 3))
  );

  const [loading, setLoading] = useState(true);

  const [competitions, setCompetitions] = useState<Competition[]>([]);

  // Próximos jogos
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchModalVisible, setMatchModalVisible] = useState(false);
  const [savingMatch, setSavingMatch] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);

  const [matchCompetitionId, setMatchCompetitionId] = useState('');
  const [matchHome, setMatchHome] = useState('');
  const [matchAway, setMatchAway] = useState('');
  const [matchRound, setMatchRound] = useState('');
  const [matchTime, setMatchTime] = useState('');
  const [matchLink, setMatchLink] = useState('');
  const [matchScoreHome, setMatchScoreHome] = useState('');
  const [matchScoreAway, setMatchScoreAway] = useState('');

  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [newsModalVisible, setNewsModalVisible] = useState(false);
  const [savingNews, setSavingNews] = useState(false);
  const [editingNews, setEditingNews] = useState<NewsItem | null>(null);
  const [newsTitle, setNewsTitle] = useState('');
  const [newsDescription, setNewsDescription] = useState('');
  const [newsImageUri, setNewsImageUri] = useState<string | null>(null);
  const [newsImageUrl, setNewsImageUrl] = useState<string | null>(null);
  const [categoryAgeRows, setCategoryAgeRows] = useState<CategoryAgeRow[]>([]);
  const [savingCategories, setSavingCategories] = useState(false);
  const [categoryFeedback, setCategoryFeedback] = useState<CategoryFeedback | null>(null);
  const [categoryHelpVisible, setCategoryHelpVisible] = useState(false);

  // ---------------- CARREGAMENTO ----------------

  async function loadData() {
    setLoading(true);
    try {
      const [
        { data: competitionsData, error: competitionsError },
        { data: matchesData, error: matchesError },
        { data: categoriesData, error: categoriesError },
      ] = await Promise.all([
        supabase
          .from('competitions')
          .select(
            'id, title, description, location, start_date, end_date'
          )
          .order('start_date', { ascending: true }),
        supabase
          .from('matches')
          .select(
            'id, competition_id, home_team, away_team, score_home, score_away, match_time, youtube_link, round'
          )
          .order('created_at', { ascending: false }),
        supabase
          .from('categories')
          .select('id, name, age_min, age_max')
          .order('name', { ascending: true }),
      ]);

      let newsData: NewsItem[] = [];
      const fullNewsResp = await supabase
        .from('news')
        .select('id, title, created_at, image_url, description')
        .order('created_at', { ascending: false });

      if (fullNewsResp.error) {
        console.error('[Diretoria] Erro ao carregar notícias:', fullNewsResp.error.message);
        if (fullNewsResp.error.message.includes('does not exist')) {
          const fallbackResp = await supabase
            .from('news')
            .select('id, title, created_at')
            .order('created_at', { ascending: false });
          if (fallbackResp.error) {
            console.error('[Diretoria] Erro ao carregar notícias:', fallbackResp.error.message);
          } else {
            newsData = (fallbackResp.data ?? []) as NewsItem[];
          }
        }
      } else {
        newsData = (fullNewsResp.data ?? []) as NewsItem[];
      }

      if (competitionsError) {
        console.error('[Diretoria] Erro ao carregar competições:', competitionsError.message);
      }
      if (matchesError) {
        console.error('[Diretoria] Erro ao carregar jogos:', matchesError.message);
      }
      if (categoriesError) {
        console.error('[Diretoria] Erro ao carregar categorias:', categoriesError.message);
      }

      setCompetitions((competitionsData ?? []) as Competition[]);
      setMatches((matchesData ?? []) as Match[]);
      setNewsItems(newsData);
      setCategoryAgeRows(
        ((categoriesData ?? []) as Array<{
          id: number;
          name: string;
          age_min: number | null;
          age_max: number | null;
        }>).map(item => ({
          ...item,
          ageMinInput: item.age_min !== null ? String(item.age_min) : '',
          ageMaxInput: item.age_max !== null ? String(item.age_max) : '',
        }))
      );
    } catch (err) {
      console.error('[Diretoria] Erro inesperado ao carregar dados:', err);
      Alert.alert('Erro', 'Ocorreu um erro ao carregar as informações.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!categoryFeedback) return;

    const timeout = setTimeout(() => {
      setCategoryFeedback(null);
    }, 3200);

    return () => clearTimeout(timeout);
  }, [categoryFeedback]);

  // ---------------- JOGOS ----------------

  function openNewMatchModal() {
    setEditingMatch(null);
    setMatchCompetitionId('');
    setMatchHome('');
    setMatchAway('');
    setMatchRound('');
    setMatchTime('');
    setMatchLink('');
    setMatchScoreHome('');
    setMatchScoreAway('');
    setMatchModalVisible(true);
  }

  function openEditMatchModal(item: Match) {
    setEditingMatch(item);
    setMatchCompetitionId(item.competition_id ?? '');
    setMatchHome(item.home_team ?? '');
    setMatchAway(item.away_team ?? '');
    setMatchRound(item.round ?? '');
    setMatchTime(item.match_time ?? '');
    setMatchLink(item.youtube_link ?? '');
    setMatchScoreHome(
      typeof item.score_home === 'number' ? String(item.score_home) : ''
    );
    setMatchScoreAway(
      typeof item.score_away === 'number' ? String(item.score_away) : ''
    );
    setMatchModalVisible(true);
  }

  async function handleSaveMatch() {
    if (!matchCompetitionId) {
      Alert.alert(
        'Campos obrigatórios',
        'Selecione a competição relacionada ao jogo.'
      );
      return;
    }
    if (!matchHome.trim() || !matchAway.trim()) {
      Alert.alert(
        'Campos obrigatórios',
        'Informe os times da casa e visitante.'
      );
      return;
    }

    const parsedHome =
      matchScoreHome.trim() !== '' ? parseInt(matchScoreHome, 10) : null;
    const parsedAway =
      matchScoreAway.trim() !== '' ? parseInt(matchScoreAway, 10) : null;

    const payload = {
      competition_id: matchCompetitionId,
      home_team: matchHome.trim(),
      away_team: matchAway.trim(),
      round: matchRound.trim() || null,
      match_time: matchTime.trim() || null,
      youtube_link: matchLink.trim() || null,
      score_home: Number.isNaN(parsedHome) ? null : parsedHome,
      score_away: Number.isNaN(parsedAway) ? null : parsedAway,
    };

    setSavingMatch(true);
    try {
      if (!editingMatch) {
        const { error } = await supabase
          .from('matches')
          .insert(payload);
        if (error) {
          console.error('[Diretoria] Erro ao inserir jogo:', error.message);
          Alert.alert('Erro', 'Não foi possível salvar o jogo.');
          setSavingMatch(false);
          return;
        }
      } else {
        const { error } = await supabase
          .from('matches')
          .update(payload)
          .eq('id', editingMatch.id);
        if (error) {
          console.error('[Diretoria] Erro ao atualizar jogo:', error.message);
          Alert.alert('Erro', 'Não foi possível atualizar o jogo.');
          setSavingMatch(false);
          return;
        }
      }

      setMatchModalVisible(false);
      setEditingMatch(null);
      await loadData();
    } catch (err) {
      console.error('[Diretoria] Erro inesperado ao salvar jogo:', err);
      Alert.alert('Erro', 'Ocorreu um erro ao salvar o jogo.');
    } finally {
      setSavingMatch(false);
    }
  }

  async function handleDeleteMatch(item: Match) {
    Alert.alert(
      'Excluir jogo',
      'Tem certeza de que deseja excluir este jogo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('matches')
                .delete()
                .eq('id', item.id);

              if (error) {
                console.error('[Diretoria] Erro ao excluir jogo:', error.message);
                Alert.alert('Erro', 'Não foi possível excluir o jogo.');
                return;
              }
              await loadData();
            } catch (err) {
              console.error('[Diretoria] Erro inesperado ao excluir jogo:', err);
              Alert.alert('Erro', 'Ocorreu um erro ao excluir o jogo.');
            }
          },
        },
      ]
    );
  }

  function openNewNewsModal() {
    setEditingNews(null);
    setNewsTitle('');
    setNewsDescription('');
    setNewsImageUri(null);
    setNewsImageUrl(null);
    setNewsModalVisible(true);
  }

  function openEditNewsModal(item: NewsItem) {
    setEditingNews(item);
    setNewsTitle(item.title);
    setNewsDescription(item.description ?? '');
    setNewsImageUri(null);
    setNewsImageUrl(item.image_url ?? null);
    setNewsModalVisible(true);
  }

  async function pickNewsImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permissão necessária',
        'Precisamos de acesso às fotos para selecionar a imagem.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    setNewsImageUri(asset.uri);
  }

  function removeNewsImage() {
    setNewsImageUri(null);
    setNewsImageUrl(null);
  }

  async function uploadNewsImage(
    localUri: string,
    newsId: string
  ): Promise<string | null> {
    try {
      const response = await fetch(localUri);
      const blob = await response.blob();

      const extGuess =
        (blob.type && blob.type.split('/')[1]) ||
        localUri.split('.').pop()?.toLowerCase() ||
        'jpg';
      const fileExt = ['jpg', 'jpeg', 'png', 'webp'].includes(extGuess)
        ? extGuess
        : 'jpg';
      const filePath = `news/${newsId}-${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('images')
        .upload(filePath, blob, {
          cacheControl: '3600',
          upsert: false,
          contentType: blob.type || 'image/jpeg',
        });

      if (error) {
        console.error('[Noticias] Erro ao enviar imagem:', error.message);
        Alert.alert('Imagem', 'Não foi possível enviar a imagem.');
        return null;
      }

      const { data: publicData } = supabase.storage
        .from('images')
        .getPublicUrl(data.path);

      return publicData.publicUrl ?? null;
    } catch (err) {
      console.error('[Noticias] Erro inesperado ao enviar imagem:', err);
      Alert.alert('Imagem', 'Ocorreu um erro ao enviar a imagem.');
      return null;
    }
  }

  async function handleSaveNews() {
    if (!newsTitle.trim()) {
      Alert.alert('Campos obrigatórios', 'Informe ao menos o título da notícia.');
      return;
    }

    setSavingNews(true);
    try {
      if (!editingNews) {
        const { data, error } = await supabase
          .from('news')
          .insert({ title: newsTitle.trim(), description: newsDescription.trim() || null })
          .select('id')
          .single();
        if (error) {
          console.error('[Noticias] Erro ao inserir notícia:', error.message);
          Alert.alert('Erro', 'Não foi possível salvar a notícia.');
          return;
        }

        if (data?.id && newsImageUri) {
          const uploadedUrl = await uploadNewsImage(newsImageUri, data.id);
          if (uploadedUrl) {
            const { error: updateError } = await supabase
              .from('news')
              .update({ image_url: uploadedUrl })
              .eq('id', data.id);
            if (updateError) {
              console.error('[Noticias] Erro ao atualizar imagem:', updateError.message);
              Alert.alert('Imagem', 'Não foi possível salvar a imagem da notícia.');
            }
          }
        }
      } else {
        let nextImageUrl = newsImageUrl ?? null;
        if (newsImageUri) {
          const uploadedUrl = await uploadNewsImage(newsImageUri, editingNews.id);
          if (uploadedUrl) {
            nextImageUrl = uploadedUrl;
          } else {
            nextImageUrl = editingNews.image_url ?? null;
          }
        }

        const { error } = await supabase
          .from('news')
          .update({
            title: newsTitle.trim(),
            description: newsDescription.trim() || null,
            image_url: nextImageUrl,
          })
          .eq('id', editingNews.id);
        if (error) {
          console.error('[Noticias] Erro ao atualizar notícia:', error.message);
          Alert.alert('Erro', 'Não foi possível atualizar a notícia.');
          return;
        }
      }

      setNewsModalVisible(false);
      setEditingNews(null);
      setNewsDescription('');
      setNewsImageUri(null);
      setNewsImageUrl(null);
      await loadData();
    } catch (err) {
      console.error('[Noticias] Erro inesperado ao salvar notícia:', err);
      Alert.alert('Erro', 'Ocorreu um erro ao salvar a notícia.');
    } finally {
      setSavingNews(false);
    }
  }

  async function handleDeleteNews(item: NewsItem) {
    const canUseWebConfirm =
      Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.confirm === 'function';

    if (canUseWebConfirm) {
      const confirmed = window.confirm(
        `Tem certeza de que deseja excluir "${item.title}"?`
      );
      if (!confirmed) return;

      try {
        const { error } = await supabase
          .from('news')
          .delete()
          .eq('id', item.id);

        if (error) {
          console.error('[Noticias] Erro ao excluir notícia:', error.message);
          Alert.alert('Erro', 'Não foi possível excluir a notícia.');
          return;
        }
        await loadData();
      } catch (err) {
        console.error('[Noticias] Erro inesperado ao excluir notícia:', err);
        Alert.alert('Erro', 'Ocorreu um erro ao excluir a notícia.');
      }
      return;
    }

    Alert.alert(
      'Excluir notícia',
      `Tem certeza de que deseja excluir "${item.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('news')
                .delete()
                .eq('id', item.id);

              if (error) {
                console.error('[Noticias] Erro ao excluir notícia:', error.message);
                Alert.alert('Erro', 'Não foi possível excluir a notícia.');
                return;
              }
              await loadData();
            } catch (err) {
              console.error('[Noticias] Erro inesperado ao excluir notícia:', err);
              Alert.alert('Erro', 'Ocorreu um erro ao excluir a notícia.');
            }
          },
        },
      ]
    );
  }

  // ---------------- AUXÍLIO: abrir links ----------------

  function openExternalUrl(url: string | null | undefined) {
    if (!url) return;
    Linking.openURL(url).catch(err => {
      console.error('[Diretoria] Erro ao abrir link:', err);
      Alert.alert('Erro', 'Não foi possível abrir o link informado.');
    });
  }

  function formatAgeSummary(ageMin: number | null, ageMax: number | null): string {
    if (ageMin === null && ageMax === null) {
      return 'Sem restrição etária.';
    }
    if (ageMin !== null && ageMax !== null) {
      return `Faixa atual: ${ageMin} a ${ageMax} anos.`;
    }
    if (ageMin !== null) {
      return `Faixa atual: a partir de ${ageMin} anos.`;
    }
    return `Faixa atual: até ${ageMax} anos.`;
  }

  function normalizeAgeInput(value: string): string {
    return value.replace(/\D/g, '').slice(0, 2);
  }

  function updateCategoryAgeInput(
    categoryId: number,
    field: 'ageMinInput' | 'ageMaxInput',
    value: string
  ) {
    const normalizedValue = normalizeAgeInput(value);
    setCategoryAgeRows(prev =>
      prev.map(item =>
        item.id === categoryId ? { ...item, [field]: normalizedValue } : item
      )
    );
  }

  function showCategoryAgeHelp() {
    setCategoryHelpVisible(true);
  }

  function setCategoryFeedbackMessage(
    type: CategoryFeedback['type'],
    message: string
  ) {
    setCategoryFeedback({ type, message });
  }

  async function handleSaveAllCategoryAges() {
    setCategoryFeedback(null);
    const changes = categoryAgeRows.map(item => {
      const ageMinWasCleared =
        item.ageMinInput.trim() === '' && item.age_min !== null;
      const ageMaxWasCleared =
        item.ageMaxInput.trim() === '' && item.age_max !== null;
      const nextAgeMin =
        item.ageMinInput.trim() === ''
          ? item.age_min
          : parseInt(item.ageMinInput, 10);
      const nextAgeMax =
        item.ageMaxInput.trim() === ''
          ? item.age_max
          : parseInt(item.ageMaxInput, 10);

      return {
        item,
        nextAgeMin,
        nextAgeMax,
        ageMinChanged: !ageMinWasCleared && nextAgeMin !== item.age_min,
        ageMaxChanged: !ageMaxWasCleared && nextAgeMax !== item.age_max,
      };
    });

    const invalidNumber = changes.find(
      ({ nextAgeMin, nextAgeMax }) =>
        (nextAgeMin !== null && Number.isNaN(nextAgeMin)) ||
        (nextAgeMax !== null && Number.isNaN(nextAgeMax))
    );
    if (invalidNumber) {
      setCategoryFeedbackMessage(
        'error',
        `Revise os valores informados para a categoria "${invalidNumber.item.name}".`
      );
      return;
    }

    const invalidRange = changes.find(
      ({ nextAgeMin, nextAgeMax }) =>
        nextAgeMin !== null &&
        nextAgeMax !== null &&
        nextAgeMin > nextAgeMax
    );
    if (invalidRange) {
      setCategoryFeedbackMessage(
        'error',
        `Na categoria "${invalidRange.item.name}", a idade mínima não pode ser maior que a idade máxima.`
      );
      return;
    }

    const changedRows = changes.filter(
      ({ ageMinChanged, ageMaxChanged }) => ageMinChanged || ageMaxChanged
    );

    if (changedRows.length === 0) {
      setCategoryFeedbackMessage(
        'info',
        'Nenhuma faixa etária foi modificada.'
      );
      return;
    }

    setSavingCategories(true);
    try {
      for (const change of changedRows) {
        const payload: { age_min?: number | null; age_max?: number | null } = {};
        if (change.ageMinChanged) payload.age_min = change.nextAgeMin;
        if (change.ageMaxChanged) payload.age_max = change.nextAgeMax;

        const { error } = await supabase
          .from('categories')
          .update(payload)
          .eq('id', change.item.id);

        if (error) {
          console.error('[Diretoria] Erro ao atualizar categoria:', error.message);
          setCategoryFeedbackMessage(
            'error',
            `Não foi possível atualizar a faixa etária de "${change.item.name}".`
          );
          return;
        }
      }

      setCategoryAgeRows(prev =>
        prev.map(item => {
          const changed = changedRows.find(row => row.item.id === item.id);
          if (!changed) return item;

          return {
            ...item,
            age_min: changed.nextAgeMin,
            age_max: changed.nextAgeMax,
            ageMinInput:
              changed.nextAgeMin !== null ? String(changed.nextAgeMin) : '',
            ageMaxInput:
              changed.nextAgeMax !== null ? String(changed.nextAgeMax) : '',
          };
        })
      );

      setCategoryFeedbackMessage(
        'success',
        `${changedRows.length} ${changedRows.length === 1 ? 'categoria foi atualizada' : 'categorias foram atualizadas'} com sucesso.`
      );
    } catch (err) {
      console.error('[Diretoria] Erro inesperado ao salvar categorias:', err);
      setCategoryFeedbackMessage(
        'error',
        'Ocorreu um erro inesperado ao salvar as faixas etárias.'
      );
    } finally {
      setSavingCategories(false);
    }
  }

  // ---------------- RENDER ----------------

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      >
      {/* <Text style={styles.pageTitle}>Diretoria</Text> */}

      {loading && (
        <View style={{ paddingVertical: 12 }}>
          <ActivityIndicator size="small" color={AppTheme.primary} />
        </View>
      )}

      {/* --------- Card 1: Próximos jogos --------- */}
      <View style={styles.cardSection}>
        <View style={styles.cardHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Próximos jogos</Text>
            <Text style={styles.cardDescription}>
              Registre os próximos jogos oficiais. O link de transmissão será
              exibido na tela inicial, quando disponível.
            </Text>
          </View>

          {isDiretoriaOrAdmin && (
            <TouchableOpacity
              style={styles.cardHeaderFab}
              onPress={openNewMatchModal}
              activeOpacity={0.9}
            >
              <Ionicons name="add" size={22} color="#FFF" />
            </TouchableOpacity>
          )}
        </View>

        {matches.length === 0 ? (
          <Text style={styles.emptyText}>
            Nenhum jogo cadastrado até o momento.
          </Text>
        ) : (
          matches.map(item => {
            const competitionName =
              competitions.find(comp => comp.id === item.competition_id)?.title ??
              null;
            return (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.itemHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>
                      {item.home_team || 'Time casa'} x{' '}
                      {item.away_team || 'Time visitante'}
                    </Text>
                    {item.round ? (
                      <Text style={styles.itemSubText}>{item.round}</Text>
                    ) : null}
                    {item.match_time ? (
                      <Text style={styles.itemSubText}>
                        Horário: {item.match_time}
                      </Text>
                    ) : null}
                    {typeof item.score_home === 'number' &&
                    typeof item.score_away === 'number' ? (
                      <Text style={styles.itemSubText}>
                        Placar: {item.score_home} x {item.score_away}
                      </Text>
                    ) : null}
                    {competitionName ? (
                      <Text style={styles.itemSubTextBold}>
                        Competição: {competitionName}
                      </Text>
                    ) : null}
                  </View>

                {isDiretoriaOrAdmin && (
                  <View style={styles.itemActionsRow}>
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() => openEditMatchModal(item)}
                    >
                      <Ionicons
                        name="create-outline"
                        size={18}
                        color={AppTheme.textSecondary}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() => handleDeleteMatch(item)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#C62828" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {item.youtube_link ? (
                <TouchableOpacity
                  onPress={() => openExternalUrl(item.youtube_link)}
                  style={styles.linkRow}
                >
                  <Ionicons
                    name="logo-youtube"
                    size={18}
                    color="#FF0000"
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.linkText}>Assistir transmissão</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            );
          })
        )}
      </View>

      <View style={styles.cardSection}>
        <View style={styles.cardHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Categorias por idade</Text>
            <Text style={styles.cardDescription}>
              Ajuste a idade mínima e máxima de cada categoria usada nos times.
            </Text>
          </View>

          {isDiretoriaOrAdmin ? (
            <TouchableOpacity
              style={styles.categorySaveAllButton}
              onPress={handleSaveAllCategoryAges}
              activeOpacity={0.9}
              disabled={savingCategories}
            >
              {savingCategories ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.categorySaveAllButtonText}>Salvar tudo</Text>
              )}
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={styles.helpButton}
            onPress={showCategoryAgeHelp}
            activeOpacity={0.9}
          >
            <Ionicons name="help" size={18} color={AppTheme.primary} />
          </TouchableOpacity>
        </View>

        {categoryAgeRows.length === 0 ? (
          <Text style={styles.emptyText}>Nenhuma categoria cadastrada.</Text>
        ) : (
          <View style={styles.categoryAgeGrid}>
            {categoryAgeRows.map(item => {
              return (
                <View
                  key={item.id}
                  style={[
                    styles.categoryAgeGridItem,
                    { width: categoryCardWidth },
                  ]}
                >
                  <View style={styles.categoryAgeCard}>
                    <View style={styles.categoryAgeTopRow}>
                      <View style={styles.categoryAgeTitleWrap}>
                        <Text style={styles.categoryAgeTitle} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={styles.categoryAgeSummary} numberOfLines={2}>
                          {formatAgeSummary(item.age_min, item.age_max)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.categoryAgeInputsRow}>
                      <View style={styles.categoryAgeInputColumn}>
                        <Text style={styles.categoryAgeLabel}>Mín.</Text>
                        <TextInput
                          key={`category-${item.id}-min`}
                          style={styles.categoryAgeInput}
                          value={item.ageMinInput}
                          onChangeText={value =>
                            updateCategoryAgeInput(item.id, 'ageMinInput', value)
                          }
                          keyboardType="number-pad"
                          placeholder=""
                          editable={isDiretoriaOrAdmin && !savingCategories}
                          autoComplete="off"
                          textContentType="none"
                          importantForAutofill="no"
                        />
                      </View>

                      <View style={styles.categoryAgeInputColumn}>
                        <Text style={styles.categoryAgeLabel}>Máx.</Text>
                        <TextInput
                          key={`category-${item.id}-max`}
                          style={styles.categoryAgeInput}
                          value={item.ageMaxInput}
                          onChangeText={value =>
                            updateCategoryAgeInput(item.id, 'ageMaxInput', value)
                          }
                          keyboardType="number-pad"
                          placeholder=""
                          editable={isDiretoriaOrAdmin && !savingCategories}
                          autoComplete="off"
                          textContentType="none"
                          importantForAutofill="no"
                        />
                      </View>
                    </View>

                    <View style={styles.categoryAgeBottomRow}>
                      <Text style={styles.categoryAgeHint}>Vazio = livre</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      <View style={styles.cardSection}>
        <View style={styles.cardHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Notícias</Text>
            <Text style={styles.cardDescription}>
              Cadastre as notícias exibidas na tela inicial.
            </Text>
          </View>

          {isAdmin && (
            <TouchableOpacity
              style={styles.cardHeaderFab}
              onPress={openNewNewsModal}
              activeOpacity={0.9}
            >
              <Ionicons name="add" size={22} color="#FFF" />
            </TouchableOpacity>
          )}
        </View>

        {newsItems.length === 0 ? (
          <Text style={styles.emptyText}>Nenhuma notícia cadastrada.</Text>
        ) : (
          newsItems.map(item => {
            return (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.itemHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                  </View>

                  {isAdmin && (
                    <View style={styles.itemActionsRow}>
                      <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => openEditNewsModal(item)}
                      >
                        <Ionicons
                          name="create-outline"
                          size={18}
                          color={AppTheme.textSecondary}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => handleDeleteNews(item)}
                      >
                        <Ionicons name="trash-outline" size={18} color="#C62828" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

              </View>
            );
          })
        )}
      </View>

      {/* ------------ MODAL: JOGO ------------ */}
      <Modal
        visible={matchModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!savingMatch) {
            setMatchModalVisible(false);
            setEditingMatch(null);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editingMatch ? 'Editar jogo' : 'Novo jogo'}
            </Text>

            <Text style={styles.fieldLabel}>Competição</Text>
            {competitions.length === 0 ? (
              <Text style={styles.emptyText}>
                Cadastre uma competição antes de criar jogos.
              </Text>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.competitionChipsRow}
              >
                {competitions.map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.competitionChip,
                      matchCompetitionId === item.id && styles.competitionChipActive,
                    ]}
                    onPress={() => setMatchCompetitionId(item.id)}
                  >
                    <Text
                      style={[
                        styles.competitionChipText,
                        matchCompetitionId === item.id &&
                          styles.competitionChipTextActive,
                      ]}
                    >
                      {item.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <Text style={styles.fieldLabel}>Time casa</Text>
            <TextInput
              style={styles.input}
              value={matchHome}
              onChangeText={setMatchHome}
              placeholder="Ex.: HandLuz"
            />

            <Text style={styles.fieldLabel}>Time visitante</Text>
            <TextInput
              style={styles.input}
              value={matchAway}
              onChangeText={setMatchAway}
              placeholder="Ex.: Equipe X"
            />

            <Text style={styles.fieldLabel}>Rodada (opcional)</Text>
            <TextInput
              style={styles.input}
              value={matchRound}
              onChangeText={setMatchRound}
              placeholder="Ex.: Quartas de final"
            />

            <Text style={styles.fieldLabel}>Horário (opcional)</Text>
            <TextInput
              style={styles.input}
              value={matchTime}
              onChangeText={text => setMatchTime(maskTime(text))}
              keyboardType="number-pad"
              placeholder="HH:MM"
            />

            <View style={styles.scoreRow}>
              <View style={styles.scoreColumn}>
                <Text style={styles.fieldLabel}>Placar casa</Text>
                <TextInput
                  style={styles.input}
                  value={matchScoreHome}
                  onChangeText={setMatchScoreHome}
                  keyboardType="number-pad"
                  placeholder="0"
                />
              </View>
              <View style={styles.scoreColumn}>
                <Text style={styles.fieldLabel}>Placar visitante</Text>
                <TextInput
                  style={styles.input}
                  value={matchScoreAway}
                  onChangeText={setMatchScoreAway}
                  keyboardType="number-pad"
                  placeholder="0"
                />
              </View>
            </View>

            <Text style={styles.fieldLabel}>
              Link da transmissão (YouTube, etc.)
            </Text>
            <TextInput
              style={styles.input}
              value={matchLink}
              onChangeText={setMatchLink}
              placeholder="https://..."
              autoCapitalize="none"
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonOutline]}
                onPress={() => {
                  if (!savingMatch) {
                    setMatchModalVisible(false);
                    setEditingMatch(null);
                  }
                }}
              >
                <Text style={styles.modalButtonOutlineText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleSaveMatch}
                disabled={savingMatch}
              >
                {savingMatch ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.modalButtonPrimaryText}>Salvar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={categoryHelpVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryHelpVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Como funcionam as idades</Text>
            <Text style={styles.helpModalText}>
              Defina a idade mínima e máxima de cada categoria. Se os dois campos
              ficarem vazios, a categoria não terá restrição etária.
            </Text>
            <Text style={styles.helpModalText}>
              Nos times, um atleta com idade fora da faixa continua podendo ser
              vinculado, mas aparecerá com um ícone de alerta laranja, a idade
              destacada e a mensagem "Idade incompatível com a categoria deste time".
            </Text>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={() => setCategoryHelpVisible(false)}
              >
                <Text style={styles.modalButtonPrimaryText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={newsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!savingNews) {
            setNewsModalVisible(false);
            setEditingNews(null);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editingNews ? 'Editar notícia' : 'Nova notícia'}
            </Text>

            <Text style={styles.fieldLabel}>Título</Text>
            <TextInput
              style={styles.input}
              value={newsTitle}
              onChangeText={setNewsTitle}
              placeholder="Ex.: Convocação, Evento, Aviso..."
            />

            <Text style={styles.fieldLabel}>Descrição</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={newsDescription}
              onChangeText={setNewsDescription}
              placeholder="Texto da notícia..."
              multiline
            />

            <Text style={styles.fieldLabel}>Imagem</Text>
            <View style={styles.imageRow}>
              <TouchableOpacity
                style={styles.imageButton}
                onPress={pickNewsImage}
              >
                <Ionicons name="image-outline" size={16} color={AppTheme.primary} />
                <Text style={styles.imageButtonText}>Selecionar imagem</Text>
              </TouchableOpacity>

              {(newsImageUri || newsImageUrl) ? (
                <TouchableOpacity
                  style={styles.imageRemoveButton}
                  onPress={removeNewsImage}
                >
                  <Ionicons name="close-circle-outline" size={18} color="#C62828" />
                  <Text style={styles.imageRemoveText}>Remover</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {(newsImageUri || newsImageUrl) ? (
              <Image
                source={{ uri: newsImageUri ?? newsImageUrl ?? '' }}
                style={styles.newsImagePreview}
              />
            ) : null}

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonOutline]}
                onPress={() => {
                  if (!savingNews) {
                    setNewsModalVisible(false);
                    setEditingNews(null);
                  }
                }}
              >
                <Text style={styles.modalButtonOutlineText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleSaveNews}
                disabled={savingNews}
              >
                {savingNews ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.modalButtonPrimaryText}>Salvar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </ScrollView>

      {categoryFeedback ? (
        <View
          pointerEvents="box-none"
          style={styles.categoryToastHost}
        >
          <View
            style={[
              styles.categoryToast,
              { width: categoryToastWidth },
              categoryFeedback.type === 'success' && styles.categoryToastSuccess,
              categoryFeedback.type === 'error' && styles.categoryToastError,
              categoryFeedback.type === 'info' && styles.categoryToastInfo,
            ]}
          >
            <View style={styles.categoryToastContent}>
              <Text style={styles.categoryToastText}>
                {categoryFeedback.message}
              </Text>
              <TouchableOpacity
                onPress={() => setCategoryFeedback(null)}
                style={styles.categoryToastClose}
              >
                <Ionicons name="close" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

// ---------------- ESTILOS ----------------

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: AppTheme.background,
  },
  container: {
    flex: 1,
    backgroundColor: AppTheme.background,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: AppTheme.textPrimary,
    marginBottom: 12,
  },

  // Card / separador
  cardSection: {
    backgroundColor: AppTheme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppTheme.border,
    padding: 14,
    marginBottom: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: AppTheme.textPrimary,
  },
  cardDescription: {
    fontSize: 13,
    color: AppTheme.textSecondary,
    marginTop: 4,
  },
  cardHeaderFab: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: AppTheme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  helpButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: AppTheme.border,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  categorySaveAllButton: {
    minWidth: 96,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: AppTheme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  categorySaveAllButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  emptyText: {
    fontSize: 13,
    color: AppTheme.textSecondary,
    marginTop: 6,
  },
  categoryToastHost: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 20,
    alignItems: 'flex-end',
  },
  categoryToast: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: '#000000',
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  categoryToastContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  categoryToastText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  categoryToastClose: {
    marginLeft: 10,
    padding: 2,
  },
  categoryToastSuccess: {
    backgroundColor: '#2E7D32',
  },
  categoryToastError: {
    backgroundColor: '#C62828',
  },
  categoryToastInfo: {
    backgroundColor: '#355C9A',
  },

  // Itens (competição / jogo)
  itemCard: {
    marginTop: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AppTheme.border,
    backgroundColor: '#FFFFFF',
  },
  itemHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: AppTheme.textPrimary,
  },
  itemSubText: {
    fontSize: 12,
    color: AppTheme.textSecondary,
  },
  itemSubTextBold: {
    fontSize: 12,
    color: AppTheme.textPrimary,
    fontWeight: '600',
    marginTop: 2,
  },
  itemBodyText: {
    marginTop: 6,
    fontSize: 13,
    color: AppTheme.textPrimary,
  },
  itemActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginLeft: 4,
  },
  imageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: AppTheme.border,
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  imageButtonText: {
    fontSize: 13,
    color: AppTheme.primary,
    fontWeight: '600',
  },
  imageRemoveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: AppTheme.border,
    backgroundColor: '#FFFFFF',
  },
  imageRemoveText: {
    fontSize: 13,
    color: '#C62828',
    fontWeight: '600',
  },
  newsImagePreview: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginTop: 10,
  },

  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  linkText: {
    fontSize: 12,
    color: AppTheme.primary,
    fontWeight: '600',
  },
  competitionChipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  competitionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: AppTheme.border,
    backgroundColor: '#FFFFFF',
  },
  competitionChipActive: {
    backgroundColor: AppTheme.primary,
    borderColor: AppTheme.primary,
  },
  competitionChipText: {
    fontSize: 12,
    color: AppTheme.textSecondary,
    fontWeight: '600',
  },
  competitionChipTextActive: {
    color: '#FFFFFF',
  },
  scoreRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  scoreColumn: {
    flex: 1,
  },
  categoryAgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginTop: 6,
  },
  categoryAgeGridItem: {
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  categoryAgeCard: {
    minHeight: 148,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AppTheme.border,
    backgroundColor: '#FFFFFF',
  },
  categoryAgeTopRow: {
    minHeight: 40,
  },
  categoryAgeTitleWrap: {
    flex: 1,
  },
  categoryAgeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: AppTheme.textPrimary,
  },
  categoryAgeSummary: {
    fontSize: 11,
    color: AppTheme.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  categoryAgeInputsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 8,
  },
  categoryAgeInputColumn: {
    flex: 1,
  },
  categoryAgeLabel: {
    fontSize: 11,
    color: AppTheme.textSecondary,
    marginBottom: 4,
  },
  categoryAgeInput: {
    height: 34,
    backgroundColor: '#FFFFFF',
    borderColor: AppTheme.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    fontSize: 13,
    textAlign: 'center',
  },
  categoryAgeBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: 10,
    gap: 6,
  },
  categoryAgeHint: {
    fontSize: 11,
    color: AppTheme.textMuted,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: AppTheme.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: AppTheme.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AppTheme.textPrimary,
    marginBottom: 10,
  },
  helpModalText: {
    fontSize: 14,
    color: AppTheme.textPrimary,
    lineHeight: 20,
    marginBottom: 10,
  },
  fieldLabel: {
    fontSize: 13,
    color: AppTheme.textSecondary,
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: AppTheme.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginLeft: 8,
  },
  modalButtonOutline: {
    borderWidth: 1,
    borderColor: AppTheme.border,
    backgroundColor: '#FFFFFF',
  },
  modalButtonOutlineText: {
    fontSize: 14,
    color: AppTheme.textSecondary,
  },
  modalButtonPrimary: {
    backgroundColor: AppTheme.primary,
  },
  modalButtonPrimaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
