// app/screens/TreinosListScreen.tsx

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ViewStyle, TextStyle } from 'react-native';

import { AppTheme } from '../../constants/theme';
import { supabase } from '../services/supabaseClient';
import { usePermissions } from '../../hooks/usePermissions';
// Importação do serviço de notificação
import { sendPushNotification } from '../services/notificationService';

type Team = {
  id: string;
  name: string;
};

type TrainingStatus = 'scheduled' | 'canceled';

type Training = {
  id: string;
  team_id: string;
  title: string;
  description: string | null;
  training_date: string; // yyyy-mm-dd
  start_time: string | null;
  duration_minutes: number | null;
  location: string | null;
  status: TrainingStatus;
};

type VacationPeriod = {
  id: string;
  team_id: string;
  start_date: string; // yyyy-mm-dd
  end_date: string;   // yyyy-mm-dd
  notes: string | null;
};

type FieldErrors = {
  title?: string;
  date?: string;
};

// ================== HELPER FUNCTIONS ==================

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatDateLabel(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  // Ajuste para exibir a data correta sem problemas de fuso horário UTC na string simples
  const [year, month, day] = dateStr.split('-').map(Number);
  const localDate = new Date(year, month - 1, day);
  
  return localDate.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatTimeLabel(timeStr: string | null): string {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
}

function formatDuration(mins: number | null | undefined): string {
  if (!mins || mins <= 0) return '1h';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

// máscara simples: "2200" -> "22:00"
function maskTime(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 4); // só números, até 4 dígitos

  if (digits.length === 0) return '';
  if (digits.length <= 2) return digits;              // "2" → "2", "22" → "22"
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;  // "223" → "22:3", "2230" → "22:30"
}

function isoToDayOfWeek(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getDay(); // 0 domingo ... 6 sábado
}

// ================== COMPONENT ==================

export default function TreinosListScreen() {
  const { isDiretoriaOrAdmin } = usePermissions();

  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [trainingsByDate, setTrainingsByDate] = useState<
    Record<string, Training[]>
  >({});
  const [vacations, setVacations] = useState<VacationPeriod[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Modal de treino
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingTraining, setEditingTraining] = useState<Training | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formDateDigits, setFormDateDigits] = useState(''); // ddmmaaaa
  const [formDateDisplay, setFormDateDisplay] = useState('');
  const [formStartTime, setFormStartTime] = useState('');
  const [formDurationMinutes, setFormDurationMinutes] = useState('60');
  const [formLocation, setFormLocation] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [isWeekly, setIsWeekly] = useState(false); // treino semanal?
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // Modal de férias
  const [vacModalVisible, setVacModalVisible] = useState(false);
  const [vacSaving, setVacSaving] = useState(false);
  const [vacStartDigits, setVacStartDigits] = useState('');
  const [vacStartDisplay, setVacStartDisplay] = useState('');
  const [vacEndDigits, setVacEndDigits] = useState('');
  const [vacEndDisplay, setVacEndDisplay] = useState('');
  const [vacNotes, setVacNotes] = useState('');

  // ================== UTILIDADES DE DATA ==================

  function formatDateDisplayFromDigits(digits: string): string {
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  }

  function handleDateChange(text: string) {
    const digits = text.replace(/\D/g, '').slice(0, 8);
    setFormDateDigits(digits);
    setFormDateDisplay(formatDateDisplayFromDigits(digits));
    if (fieldErrors.date) {
      setFieldErrors(prev => ({ ...prev, date: undefined }));
    }
  }

  function getDateIsoFromDigits(digits: string): string | null {
    if (digits.length !== 8) return null;
    const d = digits.slice(0, 2);
    const m = digits.slice(2, 4);
    const y = digits.slice(4, 8);
    return `${y}-${m}-${d}`;
  }

  const monthRange = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    return {
      start: toIsoDate(firstDay),
      end: toIsoDate(lastDay),
    };
  }, [currentMonth]);

  // ================== FÉRIAS: VERIFICAÇÃO ==================

  function isDateInVacation(isoDate: string): boolean {
    if (!vacations || vacations.length === 0) return false;
    const date = new Date(isoDate);
    return vacations.some(vac => {
      const start = new Date(vac.start_date);
      const end = new Date(vac.end_date);
      return date >= start && date <= end;
    });
  }

  // ================== CARREGAR EQUIPES ==================

  const loadTeams = useCallback(async () => {
    setTeamsLoading(true);
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .order('name', { ascending: true });

      if (error) {
        console.error('[Treinos] Erro ao carregar equipes:', error.message);
        Alert.alert('Erro', 'Não foi possível carregar as equipes.');
        return;
      }

      const list = (data ?? []) as Team[];
      setTeams(list);

      if (!selectedTeamId && list.length > 0) {
        setSelectedTeamId(list[0].id);
      }
    } catch (err) {
      console.error('[Treinos] Erro inesperado ao carregar equipes:', err);
      Alert.alert('Erro', 'Ocorreu um erro inesperado ao carregar as equipes.');
    } finally {
      setTeamsLoading(false);
    }
  }, [selectedTeamId]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  // ================== CARREGAR TREINOS + FÉRIAS ==================

  const loadTrainings = useCallback(async () => {
    if (!selectedTeamId) return;

    setCalendarLoading(true);
    try {
      // treinos
      const { data, error } = await supabase
        .from('trainings')
        .select(
          'id, team_id, title, description, training_date, start_time, duration_minutes, location, status'
        )
        .eq('team_id', selectedTeamId)
        .gte('training_date', monthRange.start)
        .lte('training_date', monthRange.end)
        .order('training_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) {
        console.error('[Treinos] Erro ao carregar treinos:', error.message);
        Alert.alert('Erro', 'Não foi possível carregar os treinos.');
        return;
      }

      // férias (qualquer período que intersecte o mês atual)
      const { data: vacData, error: vacError } = await supabase
        .from('training_vacations')
        .select('id, team_id, start_date, end_date, notes')
        .eq('team_id', selectedTeamId)
        .lte('start_date', monthRange.end)
        .gte('end_date', monthRange.start);

      if (vacError) {
        console.error('[Treinos] Erro ao carregar férias:', vacError.message);
      }

      const vacationsList = (vacData ?? []) as VacationPeriod[];
      setVacations(vacationsList);

      const map: Record<string, Training[]> = {};
      (data ?? []).forEach((t: any) => {
        const iso = t.training_date as string;
        if (isDateInVacation(iso)) {
          // não exibe treinos em período de férias
          return;
        }
        if (!map[iso]) map[iso] = [];
        map[iso].push(t as Training);
      });

      setTrainingsByDate(map);

      if (!selectedDate) {
        const todayIso = toIsoDate(new Date());
        if (map[todayIso]) {
          setSelectedDate(todayIso);
        } else {
          // se hoje não tem treino, seleciona o primeiro dia com treino do mês
          const firstKey = Object.keys(map).sort()[0];
          if (firstKey) setSelectedDate(firstKey);
          else setSelectedDate(null);
        }
      }
    } catch (err) {
      console.error('[Treinos] Erro inesperado ao carregar treinos:', err);
      Alert.alert('Erro', 'Ocorreu um erro inesperado ao carregar os treinos.');
    } finally {
      setCalendarLoading(false);
    }
  }, [selectedTeamId, monthRange, selectedDate]);

  useEffect(() => {
    loadTrainings();
  }, [loadTrainings]);

  // ================== NOTIFICAÇÃO AOS ATLETAS ==================

  async function notifyAthletes(training: Training) {
    try {
      // 1. Busca IDs dos usuários que são membros dessa equipe
      const { data: members, error: membersError } = await supabase
        .from('team_members') // Assumindo tabela de junção
        .select('user_id')
        .eq('team_id', training.team_id);

      if (membersError) {
        console.warn('[Treinos] Erro ao buscar membros para notificação:', membersError.message);
        return;
      }
      if (!members || members.length === 0) return;

      const userIds = members.map((m: any) => m.user_id);

      // 2. Busca tokens desses usuários
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('expo_push_token')
        .in('id', userIds)
        .not('expo_push_token', 'is', null);

      if (profilesError) {
        console.warn('[Treinos] Erro ao buscar tokens:', profilesError.message);
        return;
      }

      if (profiles && profiles.length > 0) {
        const dateFormatted = formatDateLabel(training.training_date);
        const title = "⚠️ Treino Cancelado";
        const body = `O treino de ${dateFormatted} (${training.title}) foi cancelado.`;

        // 3. Envia notificações em paralelo
        await Promise.all(
            profiles.map(p => {
                if (p.expo_push_token) {
                    return sendPushNotification(p.expo_push_token, title, body);
                }
            })
        );
        console.log(`[Treinos] Notificações enviadas para ${profiles.length} atletas.`);
      }
    } catch (error) {
      console.error('[Treinos] Erro ao notificar atletas:', error);
    }
  }

  // ================== CALENDÁRIO ==================

  const calendarDays = useMemo(() => {
    const days: { date: Date | null; iso: string | null }[] = [];

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const prefixEmpty = firstDay.getDay(); // 0 domingo
    for (let i = 0; i < prefixEmpty; i++) {
      days.push({ date: null, iso: null });
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateObj = new Date(year, month, d);
      days.push({ date: dateObj, iso: toIsoDate(dateObj) });
    }

    while (days.length % 7 !== 0) {
      days.push({ date: null, iso: null });
    }

    return days;
  }, [currentMonth]);

  function getDayStatus(
    iso: string | null
  ): 'none' | 'scheduled' | 'canceled' | 'mixed' | 'vacation' {
    if (!iso) return 'none';
    if (isDateInVacation(iso)) return 'vacation';
    const list = trainingsByDate[iso];
    if (!list || list.length === 0) return 'none';

    const hasScheduled = list.some(t => t.status === 'scheduled');
       const hasCanceled = list.some(t => t.status === 'canceled');

    if (hasScheduled && hasCanceled) return 'mixed';
    if (hasScheduled) return 'scheduled';
    if (hasCanceled) return 'canceled';
    return 'none';
  }

  // ================== MODAL TREINO ==================

  function openNewTrainingModal(dateIso?: string | null) {
    setEditingTraining(null);
    setFormTitle('');
    setFormDescription('');
    setFormLocation('');
    setFormStartTime('');
    setFormDurationMinutes('60');
    setIsWeekly(false);
    setFieldErrors({});

    if (dateIso) {
      const [y, m, d] = dateIso.split('-');
      const digits = `${d}${m}${y}`;
      setFormDateDigits(digits);
      setFormDateDisplay(formatDateDisplayFromDigits(digits));
    } else {
      setFormDateDigits('');
      setFormDateDisplay('');
    }

    setModalVisible(true);
  }

  function openEditTrainingModal(training: Training) {
    setEditingTraining(training);
    setFormTitle(training.title);
    setFormDescription(training.description ?? '');
    setFormLocation(training.location ?? '');
    setFormStartTime(
      training.start_time ? formatTimeLabel(training.start_time) : ''
    );
    setFormDurationMinutes(
      training.duration_minutes != null
        ? String(training.duration_minutes)
        : '60'
    );
    setIsWeekly(false); // edição é sempre da ocorrência isolada
    setFieldErrors({});

    if (training.training_date) {
      const [y, m, d] = training.training_date.split('-');
      const digits = `${d}${m}${y}`;
      setFormDateDigits(digits);
      setFormDateDisplay(formatDateDisplayFromDigits(digits));
    } else {
      setFormDateDigits('');
      setFormDateDisplay('');
    }

    setModalVisible(true);
  }

  function validateForm(): boolean {
    const errors: FieldErrors = {};

    if (!formTitle.trim()) {
      errors.title = 'Informe o título do treino.';
    }
    const iso = getDateIsoFromDigits(formDateDigits);
    if (!iso) {
      errors.date = 'Informe uma data válida (dd/mm/aaaa).';
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      Alert.alert(
        'Campos obrigatórios',
        'Preencha corretamente os campos destacados.'
      );
      return false;
    }
    return true;
  }

  async function handleSaveTraining() {
    if (!selectedTeamId) {
      Alert.alert('Equipe', 'Selecione uma equipe.');
      return;
    }
    if (!validateForm()) return;

    const isoDate = getDateIsoFromDigits(formDateDigits);
    if (!isoDate) return;

    const durationInt = parseInt(
      formDurationMinutes.replace(/\D/g, ''),
      10
    );
    const durationMinutes = durationInt > 0 ? durationInt : 60;

    const basePayload: Partial<Training> = {
      team_id: selectedTeamId,
      title: formTitle.trim(),
      description: formDescription.trim() || null,
      training_date: isoDate,
      start_time: formStartTime.trim() || null,
      duration_minutes: durationMinutes,
      location: formLocation.trim() || null,
    };

    setSaving(true);
    try {
      if (!editingTraining) {
        // ================= NOVO TREINO =================
        const inserts: any[] = [];

        // ocorrência principal
        inserts.push({
          ...basePayload,
          status: 'scheduled',
        });

        // ----------------- RECORRÊNCIA SEMANAL -----------------
        if (isWeekly) {
          let repeatUntilIso: string | null = null;

          const { data: vacFuture, error: vacErr } = await supabase
            .from('training_vacations')
            .select('start_date')
            .eq('team_id', selectedTeamId)
            .gte('start_date', isoDate)
            .order('start_date', { ascending: true })
            .limit(1);

          if (vacErr) {
            console.error(
              '[Treinos] Erro ao buscar férias futuras para recorrência:',
              vacErr.message
            );
          }

          if (vacFuture && vacFuture.length > 0) {
            const firstStart = new Date(vacFuture[0].start_date as string);
            firstStart.setDate(firstStart.getDate() - 1);
            repeatUntilIso = toIsoDate(firstStart);
          } else {
            const limit = new Date(isoDate);
            limit.setMonth(limit.getMonth() + 6);
            repeatUntilIso = toIsoDate(limit);
          }

          if (repeatUntilIso) {
            const start = new Date(isoDate);
            // Ajuste fuso para evitar problemas de dia
            const [rY, rM, rD] = repeatUntilIso.split('-').map(Number);
            const end = new Date(rY, rM - 1, rD);
            const weekday = isoToDayOfWeek(isoDate);

            const dateCursor = new Date(start);
            dateCursor.setDate(dateCursor.getDate() + 1);

            while (dateCursor <= end) {
              if (dateCursor.getDay() === weekday) {
                const iso = toIsoDate(dateCursor);
                if (!isDateInVacation(iso)) {
                  inserts.push({
                    ...basePayload,
                    training_date: iso,
                    status: 'scheduled',
                  });
                }
              }
              dateCursor.setDate(dateCursor.getDate() + 1);
            }
          }
        }

        const { error } = await supabase
          .from('trainings')
          .insert(inserts);

        if (error) {
          console.error('[Treinos] Erro ao criar treino:', error.message);
          Alert.alert('Erro', 'Não foi possível salvar o treino.');
          setSaving(false);
          return;
        }
      } else {
        // ================= EDIÇÃO DE TREINO ÚNICO =================
        const { error } = await supabase
          .from('trainings')
          .update(basePayload)
          .eq('id', editingTraining.id);

        if (error) {
          console.error('[Treinos] Erro ao atualizar treino:', error.message);
          Alert.alert('Erro', 'Não foi possível atualizar o treino.');
          setSaving(false);
          return;
        }
      }

      setModalVisible(false);
      setEditingTraining(null);
      await loadTrainings();
      setSelectedDate(isoDate);
    } catch (err) {
      console.error('[Treinos] Erro inesperado ao salvar treino:', err);
      Alert.alert('Erro', 'Ocorreu um erro inesperado ao salvar o treino.');
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelTraining(training: Training) {
    Alert.alert(
      'Cancelar treino',
      'Esta ação cancelará esse treino e enviará uma mensagem aos atletas referentes. Deseja continuar?',
      [
        { text: 'Não', style: 'cancel' },
        {
          text: 'Sim',
          style: 'destructive',
          onPress: async () => {
            try {
              // 1. Atualiza Status no Banco
              const { error } = await supabase
                .from('trainings')
                .update({ status: 'canceled' })
                .eq('id', training.id);

              if (error) {
                console.error('[Treinos] Erro ao cancelar treino:', error.message);
                Alert.alert('Erro', 'Não foi possível cancelar o treino.');
                return;
              }

              // 2. Envia Notificações (em background, não trava UI)
              notifyAthletes(training);

              // 3. Recarrega a tela
              await loadTrainings();
            } catch (err) {
              console.error('[Treinos] Erro inesperado ao cancelar treino:', err);
              Alert.alert('Erro', 'Ocorreu um erro inesperado ao cancelar o treino.');
            }
          },
        },
      ]
    );
  }

  // ================== MODAL FÉRIAS ==================

  function openVacationModal() {
    setVacStartDigits('');
    setVacStartDisplay('');
    setVacEndDigits('');
    setVacEndDisplay('');
    setVacNotes('');
    setVacModalVisible(true);
  }

  function handleVacStartChange(text: string) {
    const digits = text.replace(/\D/g, '').slice(0, 8);
    setVacStartDigits(digits);
    setVacStartDisplay(formatDateDisplayFromDigits(digits));
  }

  function handleVacEndChange(text: string) {
    const digits = text.replace(/\D/g, '').slice(0, 8);
    setVacEndDigits(digits);
    setVacEndDisplay(formatDateDisplayFromDigits(digits));
  }

  async function handleSaveVacation() {
    if (!selectedTeamId) {
      Alert.alert('Equipe', 'Selecione uma equipe.');
      return;
    }

    const getIso = (digits: string): string | null => {
      if (digits.length !== 8) return null;
      const d = digits.slice(0, 2);
      const m = digits.slice(2, 4);
      const y = digits.slice(4, 8);
      return `${y}-${m}-${d}`;
    };

    const startIso = getIso(vacStartDigits);
    const endIso = getIso(vacEndDigits);

    if (!startIso || !endIso) {
      Alert.alert(
        'Datas obrigatórias',
        'Informe corretamente a data inicial e final das férias.'
      );
      return;
    }

    if (new Date(endIso) < new Date(startIso)) {
      Alert.alert(
        'Período inválido',
        'A data final deve ser igual ou posterior à data inicial.'
      );
      return;
    }

    setVacSaving(true);
    try {
      const { error } = await supabase.from('training_vacations').insert({
        team_id: selectedTeamId,
        start_date: startIso,
        end_date: endIso,
        notes: vacNotes.trim() || null,
      });

      if (error) {
        console.error('[Treinos] Erro ao salvar férias:', error.message);
        Alert.alert('Erro', 'Não foi possível salvar o período de férias.');
        setVacSaving(false);
        return;
      }

      setVacModalVisible(false);
      await loadTrainings();
    } catch (err) {
      console.error('[Treinos] Erro inesperado ao salvar férias:', err);
      Alert.alert(
        'Erro',
        'Ocorreu um erro inesperado ao salvar o período de férias.'
      );
    } finally {
      setVacSaving(false);
    }
  }

  // ================== RENDER ==================

  const selectedDayTrainings: Training[] =
    (selectedDate && trainingsByDate[selectedDate]) || [];

  const currentVacationsText = useMemo(() => {
    if (!vacations || vacations.length === 0) return '';
    const segments = vacations.map(v => {
      const start = formatDateLabel(v.start_date);
      const end = formatDateLabel(v.end_date);
      return `${start} a ${end}`;
    });
    return segments.join('; ');
  }, [vacations]);

  return (
    <View style={styles.container}>
      {/* Scroll vertical envolvendo tela inteira */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageHeader} />

        {/* Filtro de equipe */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Selecione uma equipe</Text>
          {teamsLoading ? (
            <ActivityIndicator size="small" color={AppTheme.primary} />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.teamChipsRow}
            >
              {teams.map(team => {
                const isSelected = team.id === selectedTeamId;
                return (
                  <TouchableOpacity
                    key={team.id}
                    style={[
                      styles.teamChip,
                      isSelected && styles.teamChipSelected,
                    ]}
                    onPress={() => {
                      setSelectedTeamId(team.id);
                      setSelectedDate(null);
                    }}
                  >
                    <Text
                      style={[
                        styles.teamChipText,
                        isSelected && styles.teamChipTextSelected,
                      ]}
                    >
                      {team.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Cabeçalho do mês + férias */}
        <View style={[styles.section, styles.monthHeaderRow]}>
          <TouchableOpacity
            onPress={() =>
              setCurrentMonth(prev => {
                const y = prev.getFullYear();
                const m = prev.getMonth();
                return new Date(y, m - 1, 1);
              })
            }
          >
            <Ionicons
              name="chevron-back"
              size={22}
              color={AppTheme.textPrimary}
            />
          </TouchableOpacity>

          <Text style={styles.monthTitle}>
            {currentMonth.toLocaleDateString('pt-BR', {
              month: 'long',
              year: 'numeric',
            })}
          </Text>

          <View style={styles.monthActions}>
            {isDiretoriaOrAdmin && (
              <TouchableOpacity
                style={styles.vacationButton}
                onPress={openVacationModal}
              >
                <Ionicons
                  name="umbrella-outline"
                  size={16}
                  color={AppTheme.primary}
                />
                <Text style={styles.vacationButtonText}>Férias</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() =>
                setCurrentMonth(prev => {
                  const y = prev.getFullYear();
                  const m = prev.getMonth();
                  return new Date(y, m + 1, 1);
                })
              }
            >
              <Ionicons
                name="chevron-forward"
                size={22}
                color={AppTheme.textPrimary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {currentVacationsText ? (
          <View style={styles.vacationInfo}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color={AppTheme.textSecondary}
              style={{ marginRight: 4 }}
            />
            <Text style={styles.vacationInfoText}>
              Períodos de férias: {currentVacationsText}
            </Text>
          </View>
        ) : null}

        {/* Calendário */}
        <View style={styles.calendarWrapper}>
          <View style={styles.calendarWeekRow}>
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => (
              <Text key={d} style={styles.calendarWeekday}>
                {d}
              </Text>
            ))}
          </View>

          {calendarLoading && (
            <View style={styles.calendarLoading}>
              <ActivityIndicator size="small" color={AppTheme.primary} />
            </View>
          )}

          <View style={styles.calendarGrid}>
            {calendarDays.map((cell, index) => {
              const isToday =
                cell.iso && cell.iso === toIsoDate(new Date());
              const isSelected = cell.iso && cell.iso === selectedDate;
              const status = getDayStatus(cell.iso);

              let dayStyle: ViewStyle = { ...styles.calendarDay };
              let dayTextStyle: TextStyle = { ...styles.calendarDayText };

              if (status === 'scheduled' || status === 'mixed') {
                dayStyle = {
                  ...dayStyle,
                  backgroundColor: '#E8F3EC',
                };
                dayTextStyle = {
                  ...dayTextStyle,
                  color: AppTheme.primary,
                };
              } else if (status === 'canceled') {
                dayStyle = {
                  ...dayStyle,
                  backgroundColor: '#FFEBEE',
                };
                dayTextStyle = {
                  ...dayTextStyle,
                  color: '#C62828',
                };
              } else if (status === 'vacation') {
                dayStyle = {
                  ...dayStyle,
                  backgroundColor: '#ECEFF1',
                };
                dayTextStyle = {
                  ...dayTextStyle,
                  color: AppTheme.textMuted,
                };
              }

              if (isSelected) {
                dayStyle = {
                  ...dayStyle,
                  borderColor: AppTheme.primaryDark,
                  borderWidth: 2,
                };
              } else if (isToday) {
                dayStyle = {
                  ...dayStyle,
                  borderColor: AppTheme.primary,
                  borderWidth: 1.5,
                };
              }

              return (
                <TouchableOpacity
                  key={index}
                  style={styles.calendarCell}
                  activeOpacity={cell.date ? 0.8 : 1}
                  onPress={() => {
                    if (cell.iso) setSelectedDate(cell.iso);
                  }}
                >
                  {cell.date && (
                    <View style={dayStyle}>
                      <Text style={dayTextStyle}>
                        {cell.date.getDate()}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Lista de treinos */}
        <View style={styles.sectionListWrapper}>
          <View style={styles.sectionListHeader}>
            <View>
              <Text style={styles.sectionTitle}>Treinos do dia</Text>
              <Text style={styles.sectionSubLabel}>
                {selectedDate
                  ? formatDateLabel(selectedDate)
                  : 'Nenhum dia selecionado'}
              </Text>
            </View>
          </View>

          {selectedDate && selectedDayTrainings.length === 0 && (
            <View style={styles.emptyListContainer}>
              <Text style={styles.emptyListText}>
                Nenhum treino cadastrado para este dia.
              </Text>
            </View>
          )}

          {selectedDate && selectedDayTrainings.length > 0 && (
            <FlatList
              data={selectedDayTrainings}
              keyExtractor={item => item.id}
              scrollEnabled={false}               // desabilita scroll interno
              contentContainerStyle={{ paddingBottom: 8 }}
              renderItem={({ item }) => {
                const isCanceled = item.status === 'canceled';
                return (
                  <View style={styles.trainingCard}>
                    <View style={styles.trainingHeaderRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.trainingTitle}>
                          {item.title}
                        </Text>
                        {item.location ? (
                          <Text style={styles.trainingLocation}>
                            {item.location}
                          </Text>
                        ) : null}
                      </View>

                      <View
                        style={[
                          styles.statusBadge,
                          isCanceled
                            ? styles.statusBadgeCanceled
                            : styles.statusBadgeScheduled,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            isCanceled
                              ? styles.statusBadgeTextCanceled
                              : styles.statusBadgeTextScheduled,
                          ]}
                        >
                          {isCanceled ? 'Cancelado' : 'Confirmado'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.trainingInfoRow}>
                      <Ionicons
                        name="time-outline"
                        size={14}
                        color={AppTheme.textSecondary}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={styles.trainingInfoText}>
                        {item.start_time
                          ? `${formatTimeLabel(item.start_time)} • ${formatDuration(
                              item.duration_minutes
                            )}`
                          : `Duração: ${formatDuration(
                              item.duration_minutes
                            )}`}
                      </Text>
                    </View>

                    {item.description ? (
                      <Text style={styles.trainingDescription}>
                        {item.description}
                      </Text>
                    ) : null}

                    {isDiretoriaOrAdmin && (
                      <View style={styles.trainingActionsRow}>
                        <TouchableOpacity
                          style={styles.iconButton}
                          onPress={() => openEditTrainingModal(item)}
                        >
                          <Ionicons
                            name="create-outline"
                            size={18}
                            color={AppTheme.textSecondary}
                          />
                        </TouchableOpacity>

                        {!isCanceled && (
                          <TouchableOpacity
                            style={styles.iconButton}
                            onPress={() => handleCancelTraining(item)}
                          >
                            <Ionicons
                              name="close-circle-outline"
                              size={20}
                              color="#C62828"
                            />
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                );
              }}
            />
          )}
        </View>
      </ScrollView>

      {/* FAB – apenas diretoria/admin */}
      {isDiretoriaOrAdmin && selectedTeamId && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => openNewTrainingModal(selectedDate)}
          activeOpacity={0.9}
        >
          <Ionicons name="add" size={26} color="#FFF" />
        </TouchableOpacity>
      )}

      {/* Modal de treino */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!saving) {
            setModalVisible(false);
            setEditingTraining(null);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editingTraining ? 'Editar treino' : 'Novo treino'}
            </Text>

            <Text style={styles.fieldLabel}>
              Título <Text style={styles.requiredStar}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                fieldErrors.title ? styles.inputError : null,
              ]}
              value={formTitle}
              onChangeText={text => {
                setFormTitle(text);
                if (fieldErrors.title) {
                  setFieldErrors(prev => ({
                    ...prev,
                    title: undefined,
                  }));
                }
              }}
              placeholder="Ex.: Treino tático, físico, amistoso..."
            />
            {fieldErrors.title && (
              <Text style={styles.errorText}>{fieldErrors.title}</Text>
            )}

            <Text style={styles.fieldLabel}>
              Data (dd/mm/aaaa) <Text style={styles.requiredStar}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                fieldErrors.date ? styles.inputError : null,
              ]}
              value={formDateDisplay}
              onChangeText={handleDateChange}
              keyboardType="number-pad"
              placeholder="__/__/____"
            />
            {fieldErrors.date && (
              <Text style={styles.errorText}>{fieldErrors.date}</Text>
            )}

            <Text style={styles.fieldLabel}>
              Horário inicial (opcional)
            </Text>
            <TextInput
              style={styles.input}
              value={formStartTime}
              onChangeText={text => setFormStartTime(maskTime(text))}
              placeholder="HH:MM"
              keyboardType="number-pad"
            />

            <Text style={styles.fieldLabel}>Duração (minutos)</Text>
            <TextInput
              style={styles.input}
              value={formDurationMinutes}
              onChangeText={setFormDurationMinutes}
              placeholder="60"
              keyboardType="number-pad"
            />

            <Text style={styles.fieldLabel}>Local (opcional)</Text>
            <TextInput
              style={styles.input}
              value={formLocation}
              onChangeText={setFormLocation}
              placeholder="Ginásio, quadra, cidade..."
            />

            <Text style={styles.fieldLabel}>Descrição (opcional)</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              value={formDescription}
              onChangeText={setFormDescription}
              placeholder="Detalhes importantes sobre o treino."
              multiline
            />

            {!editingTraining && (
              <View style={styles.repeatRow}>
                <TouchableOpacity
                  style={styles.checkboxOuter}
                  onPress={() => setIsWeekly(prev => !prev)}
                >
                  {isWeekly && <View style={styles.checkboxInner} />}
                </TouchableOpacity>
                <Text style={styles.repeatLabel}>
                  Treino semanal (repete toda semana até as férias da equipe)
                </Text>
              </View>
            )}

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonOutline]}
                onPress={() => {
                  if (!saving) {
                    setModalVisible(false);
                    setEditingTraining(null);
                  }
                }}
              >
                <Text style={styles.modalButtonOutlineText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleSaveTraining}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.modalButtonPrimaryText}>Salvar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de férias */}
      <Modal
        visible={vacModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!vacSaving) setVacModalVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Período de férias</Text>

            <Text style={styles.fieldLabel}>
              Data inicial (dd/mm/aaaa)
            </Text>
            <TextInput
              style={styles.input}
              value={vacStartDisplay}
              onChangeText={handleVacStartChange}
              keyboardType="number-pad"
              placeholder="__/__/____"
            />

            <Text style={styles.fieldLabel}>
              Data final (dd/mm/aaaa)
            </Text>
            <TextInput
              style={styles.input}
              value={vacEndDisplay}
              onChangeText={handleVacEndChange}
              keyboardType="number-pad"
              placeholder="__/__/____"
            />

            <Text style={styles.fieldLabel}>Observações (opcional)</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              value={vacNotes}
              onChangeText={setVacNotes}
              placeholder="Ex.: Férias de fim de ano."
              multiline
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonOutline]}
                onPress={() => {
                  if (!vacSaving) setVacModalVisible(false);
                }}
              >
                <Text style={styles.modalButtonOutlineText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleSaveVacation}
                disabled={vacSaving}
              >
                {vacSaving ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.modalButtonPrimaryText}>Salvar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ================== ESTILOS ==================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppTheme.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 96, // espaço para FAB e aba inferior
  },
  pageHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: AppTheme.textPrimary,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: AppTheme.textPrimary,
    marginBottom: 4,
  },
  sectionSubLabel: {
    fontSize: 12,
    color: AppTheme.textSecondary,
  },
  teamChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 8,
  },
  teamChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: AppTheme.border,
    backgroundColor: AppTheme.surface,
  },
  teamChipSelected: {
    backgroundColor: AppTheme.primary,
    borderColor: AppTheme.primary,
  },
  teamChipText: {
    fontSize: 13,
    color: AppTheme.textPrimary,
  },
  teamChipTextSelected: {
    color: '#FFF',
    fontWeight: '600',
  },
  monthHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AppTheme.textPrimary,
  },
  monthActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vacationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#E8F3EC',
    marginRight: 4,
  },
  vacationButtonText: {
    marginLeft: 4,
    fontSize: 12,
    color: AppTheme.primary,
    fontWeight: '600',
  },
  vacationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  vacationInfoText: {
    fontSize: 12,
    color: AppTheme.textSecondary,
  },
  calendarWrapper: {
    marginHorizontal: 16,
    marginTop: 6,
    backgroundColor: AppTheme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppTheme.border,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 10,
  },
  calendarWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  calendarWeekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: AppTheme.textSecondary,
  },
  calendarLoading: {
    alignItems: 'center',
    marginBottom: 4,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarCell: {
    width: `${100 / 7}%`,
    paddingVertical: 4,
    alignItems: 'center',
  },
  calendarDay: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  calendarDayText: {
    fontSize: 13,
    color: AppTheme.textPrimary,
  },
  sectionListWrapper: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  sectionListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emptyListContainer: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: AppTheme.surface,
    borderWidth: 1,
    borderColor: AppTheme.border,
  },
  emptyListText: {
    fontSize: 13,
    color: AppTheme.textSecondary,
  },
  trainingCard: {
    backgroundColor: AppTheme.surface,
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: AppTheme.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  trainingHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trainingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: AppTheme.textPrimary,
  },
  trainingLocation: {
    fontSize: 12,
    color: AppTheme.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusBadgeScheduled: {
    backgroundColor: '#E8F3EC',
  },
  statusBadgeCanceled: {
    backgroundColor: '#FFEBEE',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusBadgeTextScheduled: {
    color: AppTheme.primary,
  },
  statusBadgeTextCanceled: {
    color: '#C62828',
  },
  trainingInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  trainingInfoText: {
    fontSize: 12,
    color: AppTheme.textSecondary,
  },
  trainingDescription: {
    marginTop: 6,
    fontSize: 13,
    color: AppTheme.textPrimary,
  },
  trainingActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 6,
  },
  iconButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginLeft: 4,
  },
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 18,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: AppTheme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 460,
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
    marginBottom: 4,
    marginTop: 8,
  },
  requiredStar: {
    color: '#D32F2F',
    fontWeight: '700',
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
  inputError: {
    borderColor: '#D32F2F',
  },
  errorText: {
    fontSize: 11,
    color: '#D32F2F',
    marginTop: 2,
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
  repeatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  checkboxOuter: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: AppTheme.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  checkboxInner: {
    width: 12,
    height: 12,
    borderRadius: 3,
    backgroundColor: AppTheme.primary,
  },
  repeatLabel: {
    flex: 1,
    fontSize: 13,
    color: AppTheme.textPrimary,
  },
});