import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Image,
  Linking,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { AppTheme } from '../../constants/theme';
import { supabase } from '../services/supabaseClient';
import { usePermissions } from '../../hooks/usePermissions';

// --- TIPOS ---
type Competition = {
  id: string;
  title: string;
  location: string | null;
  category: string | null;
  start_date: string | null;
  end_date: string | null;
  status: 'agendado' | 'em_andamento' | 'encerrado';
  description: string | null;
  youtube_link: string | null;
  placement: string | null;
};

type Match = {
  id: string;
  competition_id: string;
  home_team: string;
  away_team: string;
  score_home: number | null;
  score_away: number | null;
  match_time: string | null;
  youtube_link: string | null;
  round: string | null;
};

type AthleteSelection = {
  id: string;
  full_name: string;
  nickname: string | null;
  image_url: string | null;
  team_category?: string | null;
  selected: boolean;
};

export default function CompeticoesListScreen() {
  const { isDiretoriaOrAdmin } = usePermissions();
  const insets = useSafeAreaInsets();
  const TAB_BAR_HEIGHT = 80;

  // --- ESTADOS GERAIS ---
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Filtros Tela Principal
  const [filterName, setFilterName] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  // --- ESTADOS MODAL COMPETIÇÃO ---
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Competição
  const [formTitle, setFormTitle] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formCategoryComp, setFormCategoryComp] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formStatus, setFormStatus] = useState<'agendado' | 'em_andamento' | 'encerrado'>('agendado');
  const [formYoutube, setFormYoutube] = useState('');
  const [formPlacement, setFormPlacement] = useState('');
  const [formDesc, setFormDesc] = useState('');

  // --- ESTADOS MODAL JOGOS ---
  const [matchesModalVisible, setMatchesModalVisible] = useState(false);
  const [matchesList, setMatchesList] = useState<Match[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [savingMatch, setSavingMatch] = useState(false);
  
  // Form Novo Jogo
  const [matchHome, setMatchHome] = useState('');
  const [matchAway, setMatchAway] = useState('');
  const [matchScoreHome, setMatchScoreHome] = useState('');
  const [matchScoreAway, setMatchScoreAway] = useState('');
  const [matchTime, setMatchTime] = useState('');
  const [matchLink, setMatchLink] = useState('');

  // --- ESTADOS CONVOCAÇÃO ---
  const [athletesModalVisible, setAthletesModalVisible] = useState(false);
  const [viewConvocationMode, setViewConvocationMode] = useState(false);
  const [athletesList, setAthletesList] = useState<AthleteSelection[]>([]);
  const [loadingAthletes, setLoadingAthletes] = useState(false);
  
  // Filtros Convocação
  const [athleteSearch, setAthleteSearch] = useState('');
  const [athleteCategoryFilter, setAthleteCategoryFilter] = useState('');

  // ==================== CARREGAMENTO ====================

  const loadCompetitions = useCallback(async () => {
    if (!refreshing) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('competitions')
        .select('*')
        .order('start_date', { ascending: false });

      if (error) throw error;
      setCompetitions(data || []);
    } catch (err: any) {
      console.error('Erro ao carregar:', err.message);
    } finally {
      setLoading(false);
    }
  }, [refreshing]);

  useFocusEffect(
    useCallback(() => {
      loadCompetitions();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCompetitions();
    setRefreshing(false);
  };

  // Filtro Cascata
  const filteredCompetitions = competitions.filter(comp => {
    const matchName = comp.title.toLowerCase().includes(filterName.toLowerCase());
    const matchCat = filterCategory ? comp.category?.toLowerCase().includes(filterCategory.toLowerCase()) : true;
    return matchName && matchCat;
  });

  // ==================== HELPERS ====================
  const handleDateChange = (text: string, setter: (v: string) => void) => {
    let cleaned = text.replace(/\D/g, '').slice(0, 8);
    if (cleaned.length > 4) cleaned = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4)}`;
    else if (cleaned.length > 2) cleaned = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    setter(cleaned);
  };
  function parseDateToISO(dateString: string) {
    if (!dateString || dateString.length < 10) return null;
    const parts = dateString.split('/');
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  function formatDateToBr(dateString: string | null) {
    if (!dateString) return '';
    const [y, m, d] = dateString.split('-');
    return `${d}/${m}/${y}`;
  }
  function getYouTubeThumbnail(url: string | null) {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return (match && match[1]) ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : null;
  }
  function openLink(url: string | null) {
    if (url) Linking.openURL(url).catch(() => Alert.alert('Erro', 'Link inválido.'));
  }

  // ==================== JOGOS (MATCHES) ====================

  async function openMatchesManager(compId: string) {
    setEditingId(compId);
    setMatchesModalVisible(true);
    loadMatches(compId);
    // Reset form
    setMatchHome('HandLuz');
    setMatchAway('');
    setMatchScoreHome('');
    setMatchScoreAway('');
    setMatchTime('');
    setMatchLink('');
  }

  async function loadMatches(compId: string) {
    setLoadingMatches(true);
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('competition_id', compId)
        .order('created_at', { ascending: false }); // Ordenar: Criados recentemente primeiro
      if (error) throw error;
      setMatchesList(data || []);
    } catch (err) {
      Alert.alert('Erro', 'Falha ao carregar jogos.');
    } finally {
      setLoadingMatches(false);
    }
  }

  async function handleAddMatch() {
    if (!matchHome || !matchAway) {
      Alert.alert('Atenção', 'Informe os nomes dos dois times.');
      return;
    }
    // editingId aqui é o ID da competição que foi setado no openMatchesManager
    if (!editingId) {
      Alert.alert('Erro', 'ID da competição não encontrado.');
      return;
    }

    setSavingMatch(true);
    try {
      // Conversão segura de string para inteiro
      // Se estiver vazio, manda 0
      const sHome = matchScoreHome && matchScoreHome.trim() !== '' ? parseInt(matchScoreHome, 10) : 0;
      const sAway = matchScoreAway && matchScoreAway.trim() !== '' ? parseInt(matchScoreAway, 10) : 0;

      const payload = {
        competition_id: editingId, // Garante que o ID da competição vai
        home_team: matchHome,
        away_team: matchAway,
        score_home: isNaN(sHome) ? 0 : sHome,
        score_away: isNaN(sAway) ? 0 : sAway,
        match_time: matchTime || null,
        youtube_link: matchLink || null,
        // match_date não é enviado, deixando o banco assumir NULL
      };

      console.log("Enviando Payload Jogo:", payload); 

      const { error } = await supabase.from('matches').insert(payload);
      
      if (error) {
        console.error("Erro Supabase:", error);
        throw error;
      }

      // Sucesso: Limpa campos e recarrega
      setMatchAway('');
      setMatchScoreHome('');
      setMatchScoreAway('');
      setMatchTime('');
      setMatchLink('');
      
      loadMatches(editingId);
    } catch (err: any) {
      Alert.alert('Erro', `Falha ao salvar jogo: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setSavingMatch(false);
    }
  }

  async function handleDeleteMatch(id: string) {
    if (!editingId) return;
    const { error } = await supabase.from('matches').delete().eq('id', id);
    if (error) Alert.alert('Erro', 'Falha ao excluir jogo.');
    else loadMatches(editingId);
  }

  // ==================== CONVOCAÇÃO ====================

  async function openAthletesManager(compId: string, viewMode: boolean = false) {
    setEditingId(compId);
    setViewConvocationMode(viewMode);
    setAthletesModalVisible(true);
    setLoadingAthletes(true);
    setAthleteSearch('');
    setAthleteCategoryFilter('');

    try {
      const { data: allAthletes, error: errAth } = await supabase
        .from('athletes')
        .select(`id, full_name, nickname, image_url, teams ( category )`)
        .eq('is_active', true)
        .order('full_name');
      
      if (errAth) throw errAth;

      const { data: relations, error: errRel } = await supabase
        .from('competition_athletes')
        .select('athlete_id')
        .eq('competition_id', compId);
      
      if (errRel) throw errRel;
      
      const selectedIds = relations.map(r => r.athlete_id);

      const mapped = (allAthletes || []).map((a: any) => ({
        id: a.id,
        full_name: a.full_name,
        nickname: a.nickname,
        image_url: a.image_url,
        team_category: a.teams && a.teams.category ? a.teams.category : '',
        selected: selectedIds.includes(a.id),
      }));

      setAthletesList(mapped);
    } catch (err) {
      Alert.alert('Atenção', 'Erro ao carregar lista de atletas.');
    } finally {
      setLoadingAthletes(false);
    }
  }

  async function toggleAthlete(id: string, currentlySelected: boolean) {
    if (viewConvocationMode) return;
    setAthletesList(prev => prev.map(a => a.id === id ? { ...a, selected: !currentlySelected } : a));

    if (editingId) {
      try {
        if (!currentlySelected) {
          await supabase.from('competition_athletes').insert({ competition_id: editingId, athlete_id: id });
        } else {
          await supabase.from('competition_athletes').delete().match({ competition_id: editingId, athlete_id: id });
        }
      } catch (err) {
        console.error(err);
      }
    }
  }

  const filteredAthletesList = athletesList.filter(a => {
    const matchName = a.full_name.toLowerCase().includes(athleteSearch.toLowerCase()) || 
                      (a.nickname && a.nickname.toLowerCase().includes(athleteSearch.toLowerCase()));
    const matchCat = athleteCategoryFilter ? a.team_category?.toLowerCase().includes(athleteCategoryFilter.toLowerCase()) : true;
    
    if (viewConvocationMode) return a.selected && matchName && matchCat;
    return matchName && matchCat;
  });

  function handleDownloadDocs() {
    Alert.alert('Download', 'Funcionalidade de gerar PDF com documentos dos atletas selecionados será implementada em breve.');
  }

  // ==================== CRUD COMPETIÇÃO ====================

  function handleOpenModal(competition?: Competition) {
    if (competition) {
      setEditingId(competition.id);
      setFormTitle(competition.title);
      setFormLocation(competition.location || '');
      setFormCategoryComp(competition.category || '');
      setFormStartDate(formatDateToBr(competition.start_date));
      setFormEndDate(formatDateToBr(competition.end_date));
      setFormStatus(competition.status);
      setFormYoutube(competition.youtube_link || '');
      setFormPlacement(competition.placement || '');
      setFormDesc(competition.description || '');
    } else {
      setEditingId(null);
      setFormTitle('');
      setFormLocation('');
      setFormCategoryComp('');
      setFormStartDate('');
      setFormEndDate('');
      setFormStatus('agendado');
      setFormYoutube('');
      setFormPlacement('');
      setFormDesc('');
    }
    setModalVisible(true);
  }

  async function handleSave() {
    if (!formTitle.trim()) {
      Alert.alert('Atenção', 'O título é obrigatório.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: formTitle.trim(),
        location: formLocation.trim() || null,
        category: formCategoryComp.trim() || null,
        start_date: parseDateToISO(formStartDate),
        end_date: parseDateToISO(formEndDate),
        status: formStatus,
        youtube_link: formYoutube.trim() || null,
        placement: formPlacement.trim() || null,
        description: formDesc.trim() || null,
      };

      if (editingId) {
        await supabase.from('competitions').update(payload).eq('id', editingId);
      } else {
        const { data } = await supabase.from('competitions').insert(payload).select().single();
        if (data) setEditingId(data.id);
        Alert.alert('Sucesso', 'Competição salva!');
      }
      setModalVisible(false);
      loadCompetitions();
    } catch (err: any) {
      Alert.alert('Erro', err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    Alert.alert('Excluir', 'Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
          await supabase.from('competitions').delete().eq('id', id);
          loadCompetitions();
        } 
      }
    ]);
  }

  // ==================== RENDER ITEM DA LISTA PRINCIPAL ====================
  const renderItem = ({ item }: { item: Competition }) => {
    const thumb = getYouTubeThumbnail(item.youtube_link);
    const badgeColor = item.status === 'em_andamento' ? '#E6F4EA' : item.status === 'encerrado' ? '#F1F3F4' : '#FEF7E0';
    const textColor = item.status === 'em_andamento' ? '#137333' : item.status === 'encerrado' ? '#5F6368' : '#B06000';
    const statusLabel = item.status === 'em_andamento' ? 'EM ANDAMENTO' : item.status === 'encerrado' ? 'ENCERRADO' : 'AGENDADO';

    return (
      <View style={styles.card}>
        {thumb && (
          <TouchableOpacity activeOpacity={0.9} onPress={() => openLink(item.youtube_link)} style={styles.videoCover}>
            <Image source={{ uri: thumb }} style={styles.thumbImage} resizeMode="cover" />
            <View style={styles.playOverlay}><Ionicons name="play-circle" size={48} color="#FFF" /></View>
          </TouchableOpacity>
        )}

        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              
              {/* Linha de Local e Categoria */}
              <View style={styles.row}>
                {item.location ? (
                  <View style={styles.row}>
                    <Ionicons name="location-outline" size={14} color="#666" />
                    <Text style={styles.cardSubtitle}> {item.location}</Text>
                  </View>
                ) : null}
                
                {item.category ? (
                  <Text style={[styles.cardSubtitle, { marginLeft: 10, color: AppTheme.primary, fontWeight: 'bold' }]}>
                    • {item.category}
                  </Text>
                ) : null}
              </View>
            </View>

            <View style={[styles.badge, { backgroundColor: badgeColor }]}>
              <Text style={[styles.badgeText, { color: textColor }]}>{statusLabel}</Text>
            </View>
          </View>

          <View style={[styles.row, { marginTop: 8 }]}>
            <Ionicons name="calendar-outline" size={15} color={item.start_date ? "#555" : "#999"} />
            <Text style={[styles.dateText, !item.start_date && { fontStyle: 'italic', color: '#999' }]}>
              {item.start_date ? `${formatDateToBr(item.start_date)}${item.end_date ? ` até ${formatDateToBr(item.end_date)}` : ''}` : 'Sem data'}
            </Text>
          </View>

          {item.placement ? (
            <View style={[styles.row, { marginTop: 6 }]}>
              <Ionicons name="trophy" size={15} color="#FBC02D" />
              <Text style={[styles.dateText, { fontWeight: 'bold', color: '#333' }]}> {item.placement}</Text>
            </View>
          ) : null}

          <View style={styles.publicActions}>
            <TouchableOpacity onPress={() => openAthletesManager(item.id, true)} style={styles.outlineBtn}>
              <Ionicons name="people-outline" size={16} color={AppTheme.primary} />
              <Text style={styles.outlineBtnText}>Ver Convocação</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => openMatchesManager(item.id)} style={[styles.outlineBtn, { marginLeft: 10 }]}>
              <Ionicons name="football-outline" size={16} color={AppTheme.primary} />
              <Text style={styles.outlineBtnText}>Jogos</Text>
            </TouchableOpacity>
          </View>

          {isDiretoriaOrAdmin && (
            <View style={styles.footerRow}>
              <View style={{ flex: 1 }} />
              <View style={styles.actions}>
                <TouchableOpacity onPress={() => handleOpenModal(item)} style={styles.actionBtn}>
                  <Ionicons name="create-outline" size={20} color="#666" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionBtn}>
                  <Ionicons name="trash-outline" size={20} color="#D32F2F" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      
      {/* --- FILTRO CASCATA --- */}
      <View style={styles.filterContainer}>
        <View style={styles.searchWrapper}>
          <Ionicons name="search" size={18} color="#999" style={styles.searchIcon} />
          <TextInput 
            style={styles.searchInput} 
            placeholder="Competição..." 
            value={filterName}
            onChangeText={setFilterName}
          />
        </View>
        <View style={[styles.searchWrapper, { width: 130, marginLeft: 10 }]}>
          <Ionicons name="search" size={18} color="#999" style={styles.searchIcon} />
          <TextInput 
            style={styles.searchInput} 
            placeholder="Categ..." 
            value={filterCategory}
            onChangeText={setFilterCategory}
          />
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}><ActivityIndicator size="large" color={AppTheme.primary} /></View>
      ) : (
        <FlatList
          data={filteredCompetitions}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 40 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={styles.emptyText}>Nenhuma competição encontrada.</Text>}
        />
      )}

      {isDiretoriaOrAdmin && (
        <TouchableOpacity style={[styles.fab, { bottom: TAB_BAR_HEIGHT + insets.bottom + 15 }]} onPress={() => handleOpenModal()} activeOpacity={0.9}>
          <Ionicons name="add" size={28} color="#FFF" />
        </TouchableOpacity>
      )}

      {/* --- MODAL CADASTRO/EDIÇÃO --- */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <Text style={styles.modalTitle}>{editingId ? 'Editar Competição' : 'Nova Competição'}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Título *</Text>
              <TextInput style={styles.input} value={formTitle} onChangeText={setFormTitle} placeholder="Ex: Liga Oeste" />
              
              <View style={styles.rowInputs}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.label}>Local</Text>
                  <TextInput style={styles.input} value={formLocation} onChangeText={setFormLocation} placeholder="Ginásio" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Categoria</Text>
                  <TextInput style={styles.input} value={formCategoryComp} onChangeText={setFormCategoryComp} placeholder="Adulto" />
                </View>
              </View>

              <View style={styles.rowInputs}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.label}>Início</Text>
                  <TextInput style={styles.input} value={formStartDate} onChangeText={(t) => handleDateChange(t, setFormStartDate)} placeholder="dd/mm/aaaa" keyboardType="numeric" maxLength={10} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Fim</Text>
                  <TextInput style={styles.input} value={formEndDate} onChangeText={(t) => handleDateChange(t, setFormEndDate)} placeholder="dd/mm/aaaa" keyboardType="numeric" maxLength={10} />
                </View>
              </View>

              <Text style={styles.label}>Status</Text>
              <View style={styles.rowInputs}>
                {['agendado', 'em_andamento', 'encerrado'].map((st) => (
                  <TouchableOpacity key={st} style={[styles.statusOption, formStatus === st && styles.statusActive]} onPress={() => setFormStatus(st as any)}>
                    <Text style={[styles.statusOptionText, formStatus === st && { color: '#FFF' }]}>{st === 'agendado' ? 'Agendado' : st === 'em_andamento' ? 'Andamento' : 'Encerrado'}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Link YouTube</Text>
              <TextInput style={styles.input} value={formYoutube} onChangeText={setFormYoutube} autoCapitalize="none" placeholder="https://..." />
              
              <Text style={styles.label}>Colocação</Text>
              <TextInput style={styles.input} value={formPlacement} onChangeText={setFormPlacement} placeholder="Ex: Campeão" />
              <Text style={styles.label}>Descrição</Text>
              <TextInput style={[styles.input, { height: 60, textAlignVertical: 'top' }]} multiline value={formDesc} onChangeText={setFormDesc} />

              {editingId && (
                <TouchableOpacity style={styles.athletesBtn} onPress={() => openAthletesManager(editingId, false)}>
                  <Ionicons name="people" size={20} color={AppTheme.primary} />
                  <Text style={styles.athletesBtnText}>Gerenciar Convocação</Text>
                </TouchableOpacity>
              )}
              <View style={{ height: 20 }} />
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelBtn}><Text style={styles.cancelText}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={styles.saveBtn} disabled={saving}>{saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>Salvar</Text>}</TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- MODAL JOGOS --- */}
      <Modal visible={matchesModalVisible} animationType="slide" transparent onRequestClose={() => setMatchesModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Jogos</Text>
              <TouchableOpacity onPress={() => setMatchesModalVisible(false)}><Ionicons name="close" size={24} color="#333" /></TouchableOpacity>
            </View>

            {/* FORM DE JOGO */}
            {isDiretoriaOrAdmin && (
              <View style={styles.gameFormCard}>
                <Text style={styles.sectionTitle}>Novo Jogo</Text>
                
                {/* Linha Times */}
                <View style={styles.teamsRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.miniLabel}>Time Casa</Text>
                    <TextInput style={styles.gameInput} value={matchHome} onChangeText={setMatchHome} />
                  </View>
                  <Text style={styles.xDivider}>X</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.miniLabel}>Visitante</Text>
                    <TextInput style={styles.gameInput} value={matchAway} onChangeText={setMatchAway} />
                  </View>
                </View>

                {/* Linha Placar e Horário */}
                <View style={[styles.teamsRow, { marginTop: 10 }]}>
                  <View style={{ width: 60 }}>
                    <Text style={styles.miniLabel}>Placar</Text>
                    <TextInput style={[styles.gameInput, { textAlign: 'center' }]} keyboardType="numeric" value={matchScoreHome} onChangeText={setMatchScoreHome} placeholder="0" />
                  </View>
                  <Text style={styles.xDivider}>-</Text>
                  <View style={{ width: 60 }}>
                    <Text style={styles.miniLabel}>Placar</Text>
                    <TextInput style={[styles.gameInput, { textAlign: 'center' }]} keyboardType="numeric" value={matchScoreAway} onChangeText={setMatchScoreAway} placeholder="0" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 15 }}>
                    <Text style={styles.miniLabel}>Horário</Text>
                    <TextInput style={styles.gameInput} value={matchTime} onChangeText={setMatchTime} placeholder="19:00" />
                  </View>
                </View>

                {/* Link Youtube e Botão Salvar */}
                <View style={{ marginTop: 10 }}>
                  <Text style={styles.miniLabel}>Link YouTube</Text>
                  <TextInput style={styles.gameInput} value={matchLink} onChangeText={setMatchLink} autoCapitalize="none" placeholder="https://..." />
                </View>

                <TouchableOpacity 
                  style={[styles.addGameBtn, savingMatch && { opacity: 0.7 }]} 
                  onPress={handleAddMatch}
                  disabled={savingMatch}
                >
                  {savingMatch ? <ActivityIndicator color="#FFF" /> : <Text style={styles.addGameText}>ADICIONAR JOGO</Text>}
                </TouchableOpacity>
              </View>
            )}

            {/* LISTA DE JOGOS */}
            {loadingMatches ? <ActivityIndicator color={AppTheme.primary} style={{ marginTop: 20 }} /> : (
              <FlatList
                data={matchesList}
                keyExtractor={item => item.id}
                contentContainerStyle={{ paddingBottom: 20 }}
                renderItem={({ item }) => (
                  <View style={styles.matchCard}>
                    <View style={styles.matchCardHeader}>
                      <Text style={styles.matchTime}>{item.match_time || 'Horário indefinido'}</Text>
                      {item.youtube_link ? (
                        <TouchableOpacity onPress={() => openLink(item.youtube_link)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Ionicons name="logo-youtube" size={16} color="#FF0000" />
                          <Text style={{ fontSize: 10, color: '#FF0000', marginLeft: 4, fontWeight: 'bold' }}>ASSISTIR</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                    
                    <View style={styles.matchScoreRow}>
                      <Text style={[styles.matchTeamName, { textAlign: 'right' }]} numberOfLines={1}>{item.home_team}</Text>
                      <View style={styles.scoreBadge}><Text style={styles.scoreValue}>{item.score_home ?? '-'}</Text></View>
                      <Text style={{ marginHorizontal: 6, color: '#999', fontSize: 12 }}>X</Text>
                      <View style={styles.scoreBadge}><Text style={styles.scoreValue}>{item.score_away ?? '-'}</Text></View>
                      <Text style={[styles.matchTeamName, { textAlign: 'left' }]} numberOfLines={1}>{item.away_team}</Text>
                    </View>

                    {isDiretoriaOrAdmin && (
                      <TouchableOpacity onPress={() => handleDeleteMatch(item.id)} style={styles.deleteMatchBtn}>
                        <Ionicons name="trash-outline" size={16} color="#D32F2F" />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
                ListEmptyComponent={<Text style={styles.emptyText}>Nenhum jogo registrado.</Text>}
              />
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- MODAL CONVOCAÇÃO --- */}
      <Modal visible={athletesModalVisible} animationType="fade" transparent onRequestClose={() => setAthletesModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{viewConvocationMode ? 'Atletas Convocados' : 'Gerenciar Convocação'}</Text>
              <TouchableOpacity onPress={() => setAthletesModalVisible(false)}><Ionicons name="close" size={24} color="#333" /></TouchableOpacity>
            </View>
            
            {/* Filtros */}
            {!viewConvocationMode && (
              <View style={styles.filterContainerModal}>
                <View style={[styles.searchWrapper, { backgroundColor: '#FAFAFA', borderWidth: 1, borderColor: '#EEE' }]}>
                  <Ionicons name="search" size={16} color="#999" style={styles.searchIcon} />
                  <TextInput 
                    style={styles.searchInput} 
                    placeholder="Nome do atleta..." 
                    value={athleteSearch} 
                    onChangeText={setAthleteSearch} 
                  />
                </View>
                <View style={[styles.searchWrapper, { width: 100, marginLeft: 8, backgroundColor: '#FAFAFA', borderWidth: 1, borderColor: '#EEE' }]}>
                  <Ionicons name="search" size={16} color="#999" style={styles.searchIcon} />
                  <TextInput 
                    style={styles.searchInput} 
                    placeholder="Categ..." 
                    value={athleteCategoryFilter} 
                    onChangeText={setAthleteCategoryFilter} 
                  />
                </View>
              </View>
            )}

            {loadingAthletes ? <ActivityIndicator size="large" color={AppTheme.primary} style={{ marginTop: 20 }} /> : (
              <FlatList
                data={filteredAthletesList}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.athleteItem} 
                    onPress={() => toggleAthlete(item.id, item.selected)}
                    activeOpacity={viewConvocationMode ? 1 : 0.7}
                  >
                    {/* Imagem com fallback */}
                    {item.image_url ? (
                      <Image source={{ uri: item.image_url }} style={styles.athleteAvatar} />
                    ) : (
                      <View style={[styles.athleteAvatar, { justifyContent: 'center', alignItems: 'center' }]}>
                        <Ionicons name="person" size={24} color="#BBB" />
                      </View>
                    )}
                    
                    <View style={{ flex: 1 }}>
                      <Text style={styles.athleteName}>{item.full_name}</Text>
                      {item.nickname ? <Text style={styles.athleteNick}>{item.nickname}</Text> : null}
                      {item.team_category ? <Text style={styles.athleteCat}>{item.team_category}</Text> : null}
                    </View>
                    
                    {!viewConvocationMode && (
                      <Ionicons name={item.selected ? "checkbox" : "square-outline"} size={24} color={item.selected ? AppTheme.primary : "#CCC"} />
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={styles.emptyText}>Nenhum atleta encontrado.</Text>}
              />
            )}
            
            <TouchableOpacity style={styles.finishBtn} onPress={() => setAthletesModalVisible(false)}>
              <Text style={styles.finishText}>Concluir</Text>
            </TouchableOpacity>

            {/* BOTÃO BAIXAR DOCUMENTOS */}
            {viewConvocationMode && isDiretoriaOrAdmin && (
              <TouchableOpacity style={styles.downloadDocsBtn} onPress={handleDownloadDocs}>
                <Ionicons name="download-outline" size={18} color={AppTheme.primary} style={{ marginRight: 6 }} />
                <Text style={styles.downloadDocsText}>Baixar Documentos</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  emptyText: { textAlign: 'center', marginTop: 20, color: '#999', fontSize: 14 },

  // --- BUSCA ESTILIZADA ---
  filterContainer: { flexDirection: 'row', padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  filterContainerModal: { flexDirection: 'row', marginBottom: 12 },
  searchWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F4F6', borderRadius: 20, paddingHorizontal: 12, height: 40 },
  searchIcon: { marginRight: 6 },
  searchInput: { flex: 1, fontSize: 14, color: '#333' },

  // Cards
  card: { backgroundColor: '#FFF', borderRadius: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 3, overflow: 'hidden' },
  videoCover: { width: '100%', height: 180, justifyContent: 'center', alignItems: 'center' },
  thumbImage: { width: '100%', height: '100%' },
  playOverlay: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.4)', padding: 10, borderRadius: 50 },
  cardContent: { padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: '#666' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'center' },
  dateText: { fontSize: 13, color: '#555', marginLeft: 6 },
  
  publicActions: { flexDirection: 'row', marginTop: 12 },
  outlineBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: AppTheme.primary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  outlineBtnText: { color: AppTheme.primary, fontSize: 12, fontWeight: 'bold', marginLeft: 6 },

  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  linkBtn: { flexDirection: 'row', alignItems: 'center', padding: 4 },
  linkText: { color: AppTheme.primary, fontSize: 13, fontWeight: '600', marginLeft: 6 },
  actions: { flexDirection: 'row' },
  actionBtn: { padding: 8, marginLeft: 4 },

  fab: { position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: AppTheme.primary, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, elevation: 6, zIndex: 999 },

  // Modais
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 16 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, maxHeight: '90%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  label: { fontSize: 13, fontWeight: '600', color: '#666', marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 10, fontSize: 14, backgroundColor: '#FAFAFA' },
  rowInputs: { flexDirection: 'row', alignItems: 'center' },
  statusOption: { flex: 1, padding: 10, borderWidth: 1, borderColor: '#EEE', borderRadius: 8, alignItems: 'center', marginRight: 6 },
  statusActive: { backgroundColor: AppTheme.primary, borderColor: AppTheme.primary },
  statusOptionText: { fontSize: 12, fontWeight: '600', color: '#666' },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 24 },
  cancelBtn: { padding: 12, marginRight: 8 },
  cancelText: { color: '#666', fontSize: 15 },
  saveBtn: { backgroundColor: AppTheme.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  saveText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },

  // --- ESTILOS DO JOGO (MELHORADO) ---
  gameFormCard: { backgroundColor: '#F8F9FA', borderRadius: 12, padding: 16, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: AppTheme.primary },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 16 },
  teamsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  miniLabel: { fontSize: 12, color: '#666', marginBottom: 4, fontWeight: '600' },
  gameInput: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, fontSize: 14 },
  xDivider: { fontSize: 18, fontWeight: 'bold', color: '#CCC', marginHorizontal: 10, paddingTop: 20 },
  addGameBtn: { backgroundColor: AppTheme.primary, borderRadius: 8, justifyContent: 'center', alignItems: 'center', paddingVertical: 12, marginTop: 16 },
  addGameText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  
  matchCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#EEE', shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 3, elevation: 2 },
  matchCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  matchTime: { fontSize: 12, fontWeight: 'bold', color: '#555', backgroundColor: '#F0F0F0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  matchScoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  matchTeamName: { flex: 1, fontSize: 14, fontWeight: '600', color: '#333' },
  scoreBadge: { backgroundColor: '#222', borderRadius: 6, width: 34, height: 30, justifyContent: 'center', alignItems: 'center' },
  scoreValue: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  deleteMatchBtn: { position: 'absolute', bottom: 0, right: 0, padding: 10 },

  // Convocação & Docs
  athletesBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20, padding: 12, borderWidth: 1, borderColor: AppTheme.primary, borderRadius: 8, backgroundColor: '#F0F9F4' },
  athletesBtnText: { color: AppTheme.primary, fontWeight: 'bold', marginLeft: 8 },
  athleteItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  athleteAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EEE', marginRight: 12 },
  athleteName: { fontSize: 15, fontWeight: '600', color: '#333' },
  athleteNick: { fontSize: 12, color: '#888' },
  athleteCat: { fontSize: 10, color: AppTheme.primary, marginTop: 2, fontWeight: 'bold' },
  finishBtn: { marginTop: 16, backgroundColor: AppTheme.primary, padding: 14, borderRadius: 8, alignItems: 'center' },
  finishText: { color: '#FFF', fontWeight: 'bold' },
  
  downloadDocsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: AppTheme.primary, backgroundColor: '#FFF' },
  downloadDocsText: { color: AppTheme.primary, fontWeight: 'bold' },
});