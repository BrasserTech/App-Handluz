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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
  regulation_url: string | null;
};

type UpcomingMatch = {
  id: string;
  competition_title: string | null;
  opponent: string | null;
  category: string | null;
  match_date: string | null; // yyyy-mm-dd
  match_time: string | null; // HH:MM
  location: string | null;
  stream_url: string | null;
};

// ------- Utilidades simples de data/hora -------

function isoToBrDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return 'Data não informada';
  if (start && !end) return isoToBrDate(start);
  if (!start && end) return isoToBrDate(end);
  if (start && end && start === end) return isoToBrDate(start);
  return `${isoToBrDate(start)} a ${isoToBrDate(end)}`;
}

function maskDate(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function maskTime(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function digitsToIso(digits: string): string | null {
  if (digits.length !== 8) return null;
  const d = digits.slice(0, 2);
  const m = digits.slice(2, 4);
  const y = digits.slice(4, 8);
  return `${y}-${m}-${d}`; // yyyy-mm-dd
}

// ------- Componente principal -------

export default function DiretoriaScreen() {
  const { isDiretoriaOrAdmin } = usePermissions();

  const [loading, setLoading] = useState(true);

  // Competições
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [competitionModalVisible, setCompetitionModalVisible] = useState(false);
  const [savingCompetition, setSavingCompetition] = useState(false);
  const [editingCompetition, setEditingCompetition] =
    useState<Competition | null>(null);

  const [compTitle, setCompTitle] = useState('');
  const [compDescription, setCompDescription] = useState('');
  const [compLocation, setCompLocation] = useState('');
  const [compStartDisplay, setCompStartDisplay] = useState('');
  const [compEndDisplay, setCompEndDisplay] = useState('');
  const [compStartDigits, setCompStartDigits] = useState('');
  const [compEndDigits, setCompEndDigits] = useState('');
  const [compRegulationUrl, setCompRegulationUrl] = useState('');

  // Próximos jogos
  const [matches, setMatches] = useState<UpcomingMatch[]>([]);
  const [matchModalVisible, setMatchModalVisible] = useState(false);
  const [savingMatch, setSavingMatch] = useState(false);
  const [editingMatch, setEditingMatch] = useState<UpcomingMatch | null>(null);

  const [matchCompetitionTitle, setMatchCompetitionTitle] = useState('');
  const [matchOpponent, setMatchOpponent] = useState('');
  const [matchCategory, setMatchCategory] = useState('');
  const [matchLocation, setMatchLocation] = useState('');
  const [matchDateDisplay, setMatchDateDisplay] = useState('');
  const [matchDateDigits, setMatchDateDigits] = useState('');
  const [matchTime, setMatchTime] = useState('');
  const [matchStreamUrl, setMatchStreamUrl] = useState('');

  // ---------------- CARREGAMENTO ----------------

  async function loadData() {
    setLoading(true);
    try {
      const [
        { data: competitionsData, error: competitionsError },
        { data: matchesData, error: matchesError },
      ] = await Promise.all([
        supabase
          .from('competitions')
          .select(
            'id, title, description, location, start_date, end_date, regulation_url'
          )
          .order('start_date', { ascending: true }),
        supabase
          .from('upcoming_matches')
          .select(
            'id, competition_title, opponent, category, match_date, match_time, location, stream_url'
          )
          .order('match_date', { ascending: true })
          .order('match_time', { ascending: true }),
      ]);

      if (competitionsError) {
        console.error('[Diretoria] Erro ao carregar competições:', competitionsError.message);
      }
      if (matchesError) {
        console.error('[Diretoria] Erro ao carregar jogos:', matchesError.message);
      }

      setCompetitions((competitionsData ?? []) as Competition[]);
      setMatches((matchesData ?? []) as UpcomingMatch[]);
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

  // ---------------- COMPETIÇÕES ----------------

  function openNewCompetitionModal() {
    setEditingCompetition(null);
    setCompTitle('');
    setCompDescription('');
    setCompLocation('');
    setCompStartDisplay('');
    setCompEndDisplay('');
    setCompStartDigits('');
    setCompEndDigits('');
    setCompRegulationUrl('');
    setCompetitionModalVisible(true);
  }

  function openEditCompetitionModal(item: Competition) {
    setEditingCompetition(item);
    setCompTitle(item.title);
    setCompDescription(item.description ?? '');
    setCompLocation(item.location ?? '');
    setCompRegulationUrl(item.regulation_url ?? '');
    setCompStartDigits('');
    setCompEndDigits('');
    setCompStartDisplay(
      item.start_date ? isoToBrDate(item.start_date) : ''
    );
    setCompEndDisplay(item.end_date ? isoToBrDate(item.end_date) : '');
    setCompetitionModalVisible(true);
  }

  function handleCompStartChange(text: string) {
    const masked = maskDate(text);
    setCompStartDisplay(masked);
    setCompStartDigits(masked.replace(/\D/g, ''));
  }

  function handleCompEndChange(text: string) {
    const masked = maskDate(text);
    setCompEndDisplay(masked);
    setCompEndDigits(masked.replace(/\D/g, ''));
  }

  async function handleSaveCompetition() {
    if (!compTitle.trim()) {
      Alert.alert('Campos obrigatórios', 'Informe ao menos o título da competição.');
      return;
    }

    const startIso =
      compStartDigits.length === 8 ? digitsToIso(compStartDigits) : null;
    const endIso =
      compEndDigits.length === 8 ? digitsToIso(compEndDigits) : null;

    const payload = {
      title: compTitle.trim(),
      description: compDescription.trim() || null,
      location: compLocation.trim() || null,
      start_date: startIso,
      end_date: endIso,
      regulation_url: compRegulationUrl.trim() || null,
    };

    setSavingCompetition(true);
    try {
      if (!editingCompetition) {
        const { error } = await supabase.from('competitions').insert(payload);
        if (error) {
          console.error('[Diretoria] Erro ao inserir competição:', error.message);
          Alert.alert('Erro', 'Não foi possível salvar a competição.');
          setSavingCompetition(false);
          return;
        }
      } else {
        const { error } = await supabase
          .from('competitions')
          .update(payload)
          .eq('id', editingCompetition.id);
        if (error) {
          console.error('[Diretoria] Erro ao atualizar competição:', error.message);
          Alert.alert('Erro', 'Não foi possível atualizar a competição.');
          setSavingCompetition(false);
          return;
        }
      }

      setCompetitionModalVisible(false);
      setEditingCompetition(null);
      await loadData();
    } catch (err) {
      console.error('[Diretoria] Erro inesperado ao salvar competição:', err);
      Alert.alert('Erro', 'Ocorreu um erro ao salvar a competição.');
    } finally {
      setSavingCompetition(false);
    }
  }

  async function handleDeleteCompetition(item: Competition) {
    Alert.alert(
      'Excluir competição',
      `Tem certeza de que deseja excluir "${item.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('competitions')
                .delete()
                .eq('id', item.id);

              if (error) {
                console.error('[Diretoria] Erro ao excluir competição:', error.message);
                Alert.alert('Erro', 'Não foi possível excluir a competição.');
                return;
              }
              await loadData();
            } catch (err) {
              console.error('[Diretoria] Erro inesperado ao excluir competição:', err);
              Alert.alert('Erro', 'Ocorreu um erro ao excluir a competição.');
            }
          },
        },
      ]
    );
  }

  // ---------------- JOGOS ----------------

  function openNewMatchModal() {
    setEditingMatch(null);
    setMatchCompetitionTitle('');
    setMatchOpponent('');
    setMatchCategory('');
    setMatchLocation('');
    setMatchDateDisplay('');
    setMatchDateDigits('');
    setMatchTime('');
    setMatchStreamUrl('');
    setMatchModalVisible(true);
  }

  function openEditMatchModal(item: UpcomingMatch) {
    setEditingMatch(item);
    setMatchCompetitionTitle(item.competition_title ?? '');
    setMatchOpponent(item.opponent ?? '');
    setMatchCategory(item.category ?? '');
    setMatchLocation(item.location ?? '');
    setMatchDateDisplay(item.match_date ? isoToBrDate(item.match_date) : '');
    setMatchDateDigits('');
    setMatchTime(item.match_time ?? '');
    setMatchStreamUrl(item.stream_url ?? '');
    setMatchModalVisible(true);
  }

  function handleMatchDateChange(text: string) {
    const masked = maskDate(text);
    setMatchDateDisplay(masked);
    setMatchDateDigits(masked.replace(/\D/g, ''));
  }

  async function handleSaveMatch() {
    if (!matchCompetitionTitle.trim() && !matchOpponent.trim()) {
      Alert.alert(
        'Campos obrigatórios',
        'Informe pelo menos o nome da competição ou o adversário.'
      );
      return;
    }

    const dateIso =
      matchDateDigits.length === 8 ? digitsToIso(matchDateDigits) : null;

    const payload = {
      competition_title: matchCompetitionTitle.trim() || null,
      opponent: matchOpponent.trim() || null,
      category: matchCategory.trim() || null,
      location: matchLocation.trim() || null,
      match_date: dateIso,
      match_time: matchTime.trim() || null,
      stream_url: matchStreamUrl.trim() || null,
    };

    setSavingMatch(true);
    try {
      if (!editingMatch) {
        const { error } = await supabase
          .from('upcoming_matches')
          .insert(payload);
        if (error) {
          console.error('[Diretoria] Erro ao inserir jogo:', error.message);
          Alert.alert('Erro', 'Não foi possível salvar o jogo.');
          setSavingMatch(false);
          return;
        }
      } else {
        const { error } = await supabase
          .from('upcoming_matches')
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

  async function handleDeleteMatch(item: UpcomingMatch) {
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
                .from('upcoming_matches')
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

  // ---------------- AUXÍLIO: abrir links ----------------

  function openExternalUrl(url: string | null | undefined) {
    if (!url) return;
    Linking.openURL(url).catch(err => {
      console.error('[Diretoria] Erro ao abrir link:', err);
      Alert.alert('Erro', 'Não foi possível abrir o link informado.');
    });
  }

  // ---------------- RENDER ----------------

  return (
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

      {/* --------- Card 1: Competições / Etapas --------- */}
      <View style={styles.cardSection}>
        <View style={styles.cardHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Competições / Etapas</Text>
            <Text style={styles.cardDescription}>
              Cadastre as competições e etapas oficiais, anexando o link do
              regulamento ou boletim (PDF).
            </Text>
          </View>

          {isDiretoriaOrAdmin && (
            <TouchableOpacity
              style={styles.cardHeaderFab}
              onPress={openNewCompetitionModal}
              activeOpacity={0.9}
            >
              <Ionicons name="add" size={22} color="#FFF" />
            </TouchableOpacity>
          )}
        </View>

        {competitions.length === 0 ? (
          <Text style={styles.emptyText}>
            Nenhuma competição cadastrada até o momento.
          </Text>
        ) : (
          competitions.map(item => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  {item.location ? (
                    <Text style={styles.itemSubText}>{item.location}</Text>
                  ) : null}
                  <Text style={styles.itemSubText}>
                    {formatDateRange(item.start_date, item.end_date)}
                  </Text>
                </View>

                {isDiretoriaOrAdmin && (
                  <View style={styles.itemActionsRow}>
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() => openEditCompetitionModal(item)}
                    >
                      <Ionicons
                        name="create-outline"
                        size={18}
                        color={AppTheme.textSecondary}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() => handleDeleteCompetition(item)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#C62828" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {item.description ? (
                <Text style={styles.itemBodyText}>{item.description}</Text>
              ) : null}

              {item.regulation_url ? (
                <TouchableOpacity
                  onPress={() => openExternalUrl(item.regulation_url)}
                  style={styles.linkRow}
                >
                  <Ionicons
                    name="document-text-outline"
                    size={16}
                    color={AppTheme.primary}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.linkText}>Abrir regulamento / boletim</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ))
        )}
      </View>

      {/* --------- Card 2: Próximos jogos --------- */}
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
          matches.map(item => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>
                    {item.opponent || 'Adversário não informado'}
                  </Text>
                  {item.category ? (
                    <Text style={styles.itemSubText}>{item.category}</Text>
                  ) : null}
                  <Text style={styles.itemSubText}>
                    {item.match_date
                      ? isoToBrDate(item.match_date)
                      : 'Data não informada'}
                    {item.match_time ? ` • ${item.match_time}` : ''}
                  </Text>
                  {item.location ? (
                    <Text style={styles.itemSubText}>{item.location}</Text>
                  ) : null}
                  {item.competition_title ? (
                    <Text style={styles.itemSubTextBold}>
                      Competição: {item.competition_title}
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

              {item.stream_url ? (
                <TouchableOpacity
                  onPress={() => openExternalUrl(item.stream_url)}
                  style={styles.linkRow}
                >
                  <Ionicons
                    name="play-circle-outline"
                    size={18}
                    color={AppTheme.primary}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.linkText}>Assistir transmissão</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ))
        )}
      </View>

      {/* ------------ MODAL: COMPETIÇÃO ------------ */}
      <Modal
        visible={competitionModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!savingCompetition) {
            setCompetitionModalVisible(false);
            setEditingCompetition(null);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editingCompetition ? 'Editar competição' : 'Nova competição'}
            </Text>

            <Text style={styles.fieldLabel}>Título</Text>
            <TextInput
              style={styles.input}
              value={compTitle}
              onChangeText={setCompTitle}
              placeholder="Ex.: Liga Estadual, Etapa Sul..."
            />

            <Text style={styles.fieldLabel}>Descrição</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={compDescription}
              onChangeText={setCompDescription}
              placeholder="Informações gerais, categoria, observações..."
              multiline
            />

            <Text style={styles.fieldLabel}>Local</Text>
            <TextInput
              style={styles.input}
              value={compLocation}
              onChangeText={setCompLocation}
              placeholder="Cidade, ginásio..."
            />

            <Text style={styles.fieldLabel}>Data inicial (dd/mm/aaaa)</Text>
            <TextInput
              style={styles.input}
              value={compStartDisplay}
              onChangeText={handleCompStartChange}
              keyboardType="number-pad"
              placeholder="__/__/____"
            />

            <Text style={styles.fieldLabel}>Data final (dd/mm/aaaa)</Text>
            <TextInput
              style={styles.input}
              value={compEndDisplay}
              onChangeText={handleCompEndChange}
              keyboardType="number-pad"
              placeholder="__/__/____"
            />

            <Text style={styles.fieldLabel}>
              Link do regulamento / boletim (PDF)
            </Text>
            <TextInput
              style={styles.input}
              value={compRegulationUrl}
              onChangeText={setCompRegulationUrl}
              placeholder="https://..."
              autoCapitalize="none"
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonOutline]}
                onPress={() => {
                  if (!savingCompetition) {
                    setCompetitionModalVisible(false);
                    setEditingCompetition(null);
                  }
                }}
              >
                <Text style={styles.modalButtonOutlineText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleSaveCompetition}
                disabled={savingCompetition}
              >
                {savingCompetition ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.modalButtonPrimaryText}>Salvar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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

            <Text style={styles.fieldLabel}>Competição / Etapa</Text>
            <TextInput
              style={styles.input}
              value={matchCompetitionTitle}
              onChangeText={setMatchCompetitionTitle}
              placeholder="Ex.: Liga Estadual, Copa SC..."
            />

            <Text style={styles.fieldLabel}>Adversário</Text>
            <TextInput
              style={styles.input}
              value={matchOpponent}
              onChangeText={setMatchOpponent}
              placeholder="Ex.: Equipe X, Seleção Y..."
            />

            <Text style={styles.fieldLabel}>Categoria</Text>
            <TextInput
              style={styles.input}
              value={matchCategory}
              onChangeText={setMatchCategory}
              placeholder="Adulto, Sub-21, Feminino..."
            />

            <Text style={styles.fieldLabel}>Local</Text>
            <TextInput
              style={styles.input}
              value={matchLocation}
              onChangeText={setMatchLocation}
              placeholder="Ginásio, cidade..."
            />

            <Text style={styles.fieldLabel}>Data (dd/mm/aaaa)</Text>
            <TextInput
              style={styles.input}
              value={matchDateDisplay}
              onChangeText={handleMatchDateChange}
              keyboardType="number-pad"
              placeholder="__/__/____"
            />

            <Text style={styles.fieldLabel}>Horário (opcional)</Text>
            <TextInput
              style={styles.input}
              value={matchTime}
              onChangeText={text => setMatchTime(maskTime(text))}
              keyboardType="number-pad"
              placeholder="HH:MM"
            />

            <Text style={styles.fieldLabel}>
              Link da transmissão (YouTube, etc.)
            </Text>
            <TextInput
              style={styles.input}
              value={matchStreamUrl}
              onChangeText={setMatchStreamUrl}
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
    </ScrollView>
  );
}

// ---------------- ESTILOS ----------------

const styles = StyleSheet.create({
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

  emptyText: {
    fontSize: 13,
    color: AppTheme.textSecondary,
    marginTop: 6,
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
