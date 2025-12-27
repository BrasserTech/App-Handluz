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
  LayoutAnimation,
  Platform,
  UIManager,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage'; // IMPORT NOVO

import { AppTheme } from '../../constants/theme';
import { supabase } from '../services/supabaseClient';
import { usePermissions } from '../../hooks/usePermissions';

// Habilitar animações no Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- TIPOS ---

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
  attendance_count?: number; 
};

type VacationPeriod = {
  id: string;
  team_id: string;
  start_date: string;
  end_date: string;
  notes: string | null;
};

type FieldErrors = {
  title?: string;
  date?: string;
};

type Athlete = {
  id: string;
  name?: string;
  full_name?: string;
  team_id: string | null;
  position?: string;
  photo_url?: string | null;
};

type AttendanceStatus = 'present' | 'absent' | 'justified';

// Constante para o Storage
const STORAGE_TEAM_KEY = '@handluz:selectedTeamId';

// --- HELPER FUNCTIONS ---

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatDateLabel(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', {
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

function maskTime(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 4);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function isoToDayOfWeek(iso: string): number {
  const d = new Date(iso);
  return d.getDay(); 
}

export default function TreinosListScreen() {
  const { isDiretoriaOrAdmin } = usePermissions();
  const insets = useSafeAreaInsets();

  // Estados Globais
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [trainingsByDate, setTrainingsByDate] = useState<Record<string, Training[]>>({});
  const [vacations, setVacations] = useState<VacationPeriod[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Modal de treino
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingTraining, setEditingTraining] = useState<Training | null>(null);

  // Form States
  const [formTitle, setFormTitle] = useState('');
  const [formDateDigits, setFormDateDigits] = useState(''); 
  const [formDateDisplay, setFormDateDisplay] = useState('');
  const [formStartTime, setFormStartTime] = useState('');
  const [formDurationMinutes, setFormDurationMinutes] = useState('60');
  const [formLocation, setFormLocation] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [isWeekly, setIsWeekly] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // Modal de férias
  const [vacModalVisible, setVacModalVisible] = useState(false);
  const [vacSaving, setVacSaving] = useState(false);
  const [vacStartDigits, setVacStartDigits] = useState('');
  const [vacStartDisplay, setVacStartDisplay] = useState('');
  const [vacEndDigits, setVacEndDigits] = useState('');
  const [vacEndDisplay, setVacEndDisplay] = useState('');
  const [vacNotes, setVacNotes] = useState('');

  // --- ESTADOS: LISTA DE PRESENÇA ---
  const [attendanceModalVisible, setAttendanceModalVisible] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);
  const [attendanceTraining, setAttendanceTraining] = useState<Training | null>(null);
  const [teamAthletes, setTeamAthletes] = useState<Athlete[]>([]);
  
  const [attendanceStatusMap, setAttendanceStatusMap] = useState<Record<string, AttendanceStatus>>({});
  const [justificationMap, setJustificationMap] = useState<Record<string, string>>({});

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
    if (fieldErrors.date) setFieldErrors(prev => ({ ...prev, date: undefined }));
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
    return { start: toIsoDate(firstDay), end: toIsoDate(lastDay) };
  }, [currentMonth]);

  function isDateInVacation(isoDate: string): boolean {
    if (!vacations || vacations.length === 0) return false;
    const date = new Date(isoDate);
    return vacations.some(vac => {
      const start = new Date(vac.start_date);
      const end = new Date(vac.end_date);
      return date >= start && date <= end;
    });
  }

  // ================== GERENCIAMENTO DE EQUIPES E CACHE ==================

  // Função auxiliar para mudar equipe e salvar no cache
  const handleTeamChange = async (teamId: string) => {
    setSelectedTeamId(teamId);
    setSelectedDate(null);
    try {
      await AsyncStorage.setItem(STORAGE_TEAM_KEY, teamId);
    } catch (e) {
      console.warn('Erro ao salvar equipe no cache:', e);
    }
  };

  const loadTeams = useCallback(async () => {
    setTeamsLoading(true);
    try {
      const { data, error } = await supabase.from('teams').select('id, name').order('name');
      if (error) throw error;
      const list = (data ?? []) as Team[];
      setTeams(list);

      // Lógica de Cache: Tenta carregar a última equipe usada
      if (list.length > 0) {
        // Se já temos uma selecionada (ex: via props), mantemos. Se não, buscamos do cache.
        if (!selectedTeamId) {
            try {
                const cachedId = await AsyncStorage.getItem(STORAGE_TEAM_KEY);
                if (cachedId && list.some(t => t.id === cachedId)) {
                    setSelectedTeamId(cachedId);
                } else {
                    // Fallback para a primeira equipe
                    setSelectedTeamId(list[0].id);
                }
            } catch {
                setSelectedTeamId(list[0].id);
            }
        }
      }
    } catch (err) {
      console.error('[Treinos] Erro teams:', err);
    } finally {
      setTeamsLoading(false);
    }
  }, [selectedTeamId]);

  useEffect(() => { loadTeams(); }, [loadTeams]);

  // ================== CARREGAR TREINOS ==================

  const loadTrainings = useCallback(async () => {
    if (!selectedTeamId) return;
    setCalendarLoading(true);
    try {
      const { data, error } = await supabase
        .from('trainings')
        .select(`*, training_attendance (status)`)
        .eq('team_id', selectedTeamId)
        .gte('training_date', monthRange.start)
        .lte('training_date', monthRange.end)
        .order('training_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;

      const { data: vacData } = await supabase
        .from('training_vacations')
        .select('*')
        .eq('team_id', selectedTeamId)
        .lte('start_date', monthRange.end)
        .gte('end_date', monthRange.start);

      setVacations((vacData ?? []) as VacationPeriod[]);

      const map: Record<string, Training[]> = {};
      
      (data ?? []).forEach((t: any) => {
        const iso = t.training_date as string;
        if (isDateInVacation(iso)) return;

        const attendanceList = t.training_attendance || [];
        const presentCount = attendanceList.filter((a: any) => a.status === 'present').length;
        
        const trainingObj: Training = { ...t, attendance_count: presentCount };

        if (!map[iso]) map[iso] = [];
        map[iso].push(trainingObj);
      });

      setTrainingsByDate(map);

      if (!selectedDate) {
        const todayIso = toIsoDate(new Date());
        if (map[todayIso]) setSelectedDate(todayIso);
        else {
          const firstKey = Object.keys(map)[0];
          setSelectedDate(firstKey || null);
        }
      }
    } catch (err) {
      console.error('[Treinos] Erro load:', err);
    } finally {
      setCalendarLoading(false);
    }
  }, [selectedTeamId, monthRange, selectedDate]);

  useEffect(() => { loadTrainings(); }, [loadTrainings]);

  // ================== LÓGICA DA LISTA DE PRESENÇA ==================

  async function openAttendanceModal(training: Training) {
    if (!training) return;
    
    setAttendanceTraining(training);
    setAttendanceModalVisible(true); 
    setAttendanceLoading(true);
    setIsSavingAttendance(false);

    try {
      const { data: athletesData, error: athletesError } = await supabase
        .from('athletes')
        .select('*') 
        .eq('team_id', training.team_id);

      if (athletesError) throw athletesError;

      const sortedAthletes = (athletesData || []).sort((a: any, b: any) => {
         const nameA = a.name || a.full_name || '';
         const nameB = b.name || b.full_name || '';
         return nameA.localeCompare(nameB);
      });

      const { data: attendanceData, error: attError } = await supabase
        .from('training_attendance')
        .select('athlete_id, status, justification')
        .eq('training_id', training.id);

      if (attError) throw attError;

      const statusMap: Record<string, AttendanceStatus> = {};
      const justMap: Record<string, string> = {};
      
      attendanceData?.forEach((rec: any) => {
        let st: AttendanceStatus = 'absent';
        if (rec.status === 'present' || rec.status === 'justified' || rec.status === 'absent') {
            st = rec.status;
        }
        statusMap[rec.athlete_id] = st;
        if (rec.justification) {
            justMap[rec.athlete_id] = rec.justification;
        }
      });

      setTeamAthletes(sortedAthletes as Athlete[]);
      setAttendanceStatusMap(statusMap);
      setJustificationMap(justMap);

    } catch (error: any) {
      console.error('[Attendance] Erro:', error);
      Alert.alert('Erro', 'Falha ao carregar dados de presença.');
    } finally {
      setAttendanceLoading(false);
    }
  }

  function setStatus(athleteId: string, newStatus: AttendanceStatus) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setAttendanceStatusMap(prev => ({ ...prev, [athleteId]: newStatus }));
  }

  function updateJustification(athleteId: string, text: string) {
      setJustificationMap(prev => ({ ...prev, [athleteId]: text }));
  }

  async function saveAttendance() {
    if (!attendanceTraining) return;
    setIsSavingAttendance(true);

    try {
      const upsertData = teamAthletes.map(athlete => {
        const currentStatus = attendanceStatusMap[athlete.id] || 'absent'; 
        const justification = currentStatus === 'justified' ? (justificationMap[athlete.id] || '') : null;

        return {
            training_id: attendanceTraining.id,
            athlete_id: athlete.id,
            status: currentStatus,
            justification: justification,
            updated_at: new Date().toISOString()
        };
      });

      const { error } = await supabase
        .from('training_attendance')
        .upsert(upsertData, { onConflict: 'training_id, athlete_id' });

      if (error) throw error;

      await loadTrainings();
      setAttendanceModalVisible(false);
      Alert.alert("Sucesso", "Lista de presença salva com sucesso!");

    } catch (error: any) {
      console.error('[Attendance] Erro ao salvar:', error);
      Alert.alert('Erro ao Salvar', `Erro: ${error.message || 'Verifique o banco de dados.'}`);
    } finally {
      setIsSavingAttendance(false);
    }
  }

  // ================== CALENDÁRIO ==================

  const calendarDays = useMemo(() => {
    const days: { date: Date | null; iso: string | null }[] = [];
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const prefixEmpty = firstDay.getDay(); 

    for (let i = 0; i < prefixEmpty; i++) days.push({ date: null, iso: null });
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateObj = new Date(year, month, d);
      days.push({ date: dateObj, iso: toIsoDate(dateObj) });
    }
    while (days.length % 7 !== 0) days.push({ date: null, iso: null });
    return days;
  }, [currentMonth]);

  function getDayStatus(iso: string | null): 'none' | 'scheduled' | 'canceled' | 'mixed' | 'vacation' {
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
    setFormStartTime(training.start_time ? formatTimeLabel(training.start_time) : '');
    setFormDurationMinutes(training.duration_minutes != null ? String(training.duration_minutes) : '60');
    setIsWeekly(false);
    setFieldErrors({});

    if (training.training_date) {
      const [y, m, d] = training.training_date.split('-');
      const digits = `${d}${m}${y}`;
      setFormDateDigits(digits);
      setFormDateDisplay(formatDateDisplayFromDigits(digits));
    }
    setModalVisible(true);
  }

  function validateForm(): boolean {
    const errors: FieldErrors = {};
    if (!formTitle.trim()) errors.title = 'Informe o título.';
    if (!getDateIsoFromDigits(formDateDigits)) errors.date = 'Data inválida.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSaveTraining() {
    if (!selectedTeamId) { Alert.alert('Erro', 'Selecione uma equipe.'); return; }
    if (!validateForm()) return;

    const isoDate = getDateIsoFromDigits(formDateDigits)!;
    const durationInt = parseInt(formDurationMinutes.replace(/\D/g, ''), 10);
    const basePayload: Partial<Training> = {
      team_id: selectedTeamId,
      title: formTitle.trim(),
      description: formDescription.trim() || null,
      training_date: isoDate,
      start_time: formStartTime.trim() || null,
      duration_minutes: durationInt > 0 ? durationInt : 60,
      location: formLocation.trim() || null,
    };

    setSaving(true);
    try {
      if (!editingTraining) {
        const inserts: any[] = [{ ...basePayload, status: 'scheduled' }];
        if (isWeekly) {
            const { data: vacFuture } = await supabase.from('training_vacations').select('start_date').eq('team_id', selectedTeamId).gte('start_date', isoDate).order('start_date', { ascending: true }).limit(1);
            let limit = new Date(isoDate);
            if (vacFuture && vacFuture.length > 0) {
                limit = new Date(vacFuture[0].start_date);
                limit.setDate(limit.getDate() - 1);
            } else {
                limit.setMonth(limit.getMonth() + 6);
            }
            const start = new Date(isoDate);
            const weekday = isoToDayOfWeek(isoDate);
            const cursor = new Date(start); cursor.setDate(cursor.getDate()+1);
            while(cursor <= limit) {
                if(cursor.getDay() === weekday) {
                    const iso = toIsoDate(cursor);
                    if(!isDateInVacation(iso)) inserts.push({...basePayload, training_date: iso, status: 'scheduled'});
                }
                cursor.setDate(cursor.getDate()+1);
            }
        }
        await supabase.from('trainings').insert(inserts);
      } else {
        await supabase.from('trainings').update(basePayload).eq('id', editingTraining.id);
      }
      setModalVisible(false);
      await loadTrainings();
    } catch (e) {
      Alert.alert('Erro', 'Falha ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelTraining(training: Training) {
    Alert.alert('Cancelar', 'Deseja cancelar?', [
      { text: 'Não', style: 'cancel' },
      { text: 'Sim', style: 'destructive', onPress: async () => {
         await supabase.from('trainings').update({ status: 'canceled' }).eq('id', training.id);
         await loadTrainings();
      }}
    ]);
  }

  function openVacationModal() { setVacStartDigits(''); setVacEndDigits(''); setVacModalVisible(true); }
  function handleVacStartChange(text: string) { setVacStartDigits(text.replace(/\D/g, '').slice(0,8)); setVacStartDisplay(formatDateDisplayFromDigits(text.replace(/\D/g, '').slice(0,8))); }
  function handleVacEndChange(text: string) { setVacEndDigits(text.replace(/\D/g, '').slice(0,8)); setVacEndDisplay(formatDateDisplayFromDigits(text.replace(/\D/g, '').slice(0,8))); }
  async function handleSaveVacation() {
     const getIso = (d:string) => { if(d.length!==8)return null; return `${d.slice(4,8)}-${d.slice(2,4)}-${d.slice(0,2)}`; }
     const s = getIso(vacStartDigits); const e = getIso(vacEndDigits);
     if(s && e) {
        await supabase.from('training_vacations').insert({ team_id: selectedTeamId, start_date: s, end_date: e, notes: vacNotes });
        setVacModalVisible(false); await loadTrainings();
     }
  }

  // ================== RENDER ==================

  const selectedDayTrainings: Training[] = (selectedDate && trainingsByDate[selectedDate]) || [];
  const currentVacationsText = useMemo(() => {
    if (!vacations.length) return '';
    return vacations.map(v => `${formatDateLabel(v.start_date)} a ${formatDateLabel(v.end_date)}`).join('; ');
  }, [vacations]);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.pageHeader} />

        {/* FILTROS E CALENDÁRIO */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Selecione uma equipe</Text>
          {teamsLoading ? <ActivityIndicator size="small" color={AppTheme.primary} /> : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.teamChipsRow}>
              {teams.map(team => (
                <TouchableOpacity 
                    key={team.id} 
                    style={[styles.teamChip, team.id === selectedTeamId && styles.teamChipSelected]} 
                    onPress={() => handleTeamChange(team.id)}
                >
                  <Text style={[styles.teamChipText, team.id === selectedTeamId && styles.teamChipTextSelected]}>{team.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        <View style={[styles.section, styles.monthHeaderRow]}>
          <TouchableOpacity onPress={() => setCurrentMonth(p => new Date(p.getFullYear(), p.getMonth() - 1, 1))}><Ionicons name="chevron-back" size={22} color={AppTheme.textPrimary} /></TouchableOpacity>
          <Text style={styles.monthTitle}>{currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</Text>
          <View style={styles.monthActions}>
             {isDiretoriaOrAdmin && <TouchableOpacity style={styles.vacationButton} onPress={openVacationModal}><Ionicons name="umbrella-outline" size={16} color={AppTheme.primary} /><Text style={styles.vacationButtonText}>Férias</Text></TouchableOpacity>}
             <TouchableOpacity onPress={() => setCurrentMonth(p => new Date(p.getFullYear(), p.getMonth() + 1, 1))}><Ionicons name="chevron-forward" size={22} color={AppTheme.textPrimary} /></TouchableOpacity>
          </View>
        </View>

        {currentVacationsText ? <View style={styles.vacationInfo}><Text style={styles.vacationInfoText}>Férias: {currentVacationsText}</Text></View> : null}

        <View style={styles.calendarWrapper}>
            {/* CORREÇÃO CHAVES DUPLICADAS: Usando index como key */}
            <View style={styles.calendarWeekRow}>{['D','S','T','Q','Q','S','S'].map((d, i) => <Text key={i} style={styles.calendarWeekday}>{d}</Text>)}</View>
            <View style={styles.calendarGrid}>
                {calendarDays.map((cell, i) => {
                    const status = getDayStatus(cell.iso);
                    const isSelected = cell.iso === selectedDate;
                    const isToday = cell.iso === toIsoDate(new Date());
                    let bg = 'transparent'; let txtColor = AppTheme.textPrimary;
                    if (status === 'scheduled') { bg = '#E8F3EC'; txtColor = AppTheme.primary; }
                    else if (status === 'canceled') { bg = '#FFEBEE'; txtColor = '#C62828'; }
                    else if (status === 'vacation') { bg = '#ECEFF1'; txtColor = AppTheme.textMuted; }
                    return (
                        <TouchableOpacity key={i} style={styles.calendarCell} onPress={() => cell.iso && setSelectedDate(cell.iso)}>
                            {cell.date && (
                                <View style={[styles.calendarDay, { backgroundColor: bg }, isSelected && { borderColor: AppTheme.primaryDark, borderWidth: 2 }, isToday && !isSelected && { borderColor: AppTheme.primary, borderWidth: 1 }]}>
                                    <Text style={[styles.calendarDayText, { color: txtColor }]}>{cell.date.getDate()}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>

        {/* LISTA DE TREINOS */}
        <View style={styles.sectionListWrapper}>
          <View style={styles.sectionListHeader}>
            <View>
              <Text style={styles.sectionTitle}>Treinos do dia</Text>
              <Text style={styles.sectionSubLabel}>{selectedDate ? formatDateLabel(selectedDate) : 'Selecione uma data'}</Text>
            </View>
          </View>

          {selectedDate && selectedDayTrainings.length === 0 && <View style={styles.emptyListContainer}><Text style={styles.emptyListText}>Nenhum treino agendado.</Text></View>}
          
          {selectedDate && selectedDayTrainings.map(item => {
             const isCanceled = item.status === 'canceled';
             return (
               <View key={item.id} style={styles.trainingCard}>
                 <View style={styles.trainingHeaderRow}>
                   <View style={{flex:1}}>
                     <Text style={styles.trainingTitle}>{item.title}</Text>
                     <Text style={styles.trainingLocation}>{item.location || 'Sem local definido'}</Text>
                   </View>
                   <View style={[styles.statusBadge, isCanceled ? styles.statusBadgeCanceled : styles.statusBadgeScheduled]}>
                     <Text style={[styles.statusBadgeText, isCanceled ? styles.statusBadgeTextCanceled : styles.statusBadgeTextScheduled]}>{isCanceled ? 'Cancelado' : 'Confirmado'}</Text>
                   </View>
                 </View>
                 <View style={styles.trainingInfoRow}><Text style={styles.trainingInfoText}>{item.start_time ? formatTimeLabel(item.start_time) : '--:--'} • {formatDuration(item.duration_minutes)}</Text></View>
                 {item.description ? <Text style={styles.trainingDescription}>{item.description}</Text> : null}
                 
                 {!isCanceled && isDiretoriaOrAdmin && (
                    <TouchableOpacity style={styles.attendanceButton} onPress={() => openAttendanceModal(item)}>
                        <Ionicons name="clipboard-outline" size={18} color="#FFF" />
                        <Text style={styles.attendanceButtonText}>Lista de Presença ({item.attendance_count || 0})</Text>
                    </TouchableOpacity>
                 )}

                 {isDiretoriaOrAdmin && (
                    <View style={styles.trainingActionsRow}>
                        <TouchableOpacity style={styles.iconButton} onPress={() => openEditTrainingModal(item)}><Ionicons name="create-outline" size={20} color={AppTheme.textSecondary} /></TouchableOpacity>
                        {!isCanceled && <TouchableOpacity style={styles.iconButton} onPress={() => handleCancelTraining(item)}><Ionicons name="close-circle-outline" size={22} color="#C62828" /></TouchableOpacity>}
                    </View>
                 )}
               </View>
             );
          })}
        </View>
      </ScrollView>

      {/* --- MODAL DE LISTA DE PRESENÇA (PREMIUM) --- */}
      <Modal 
        visible={attendanceModalVisible} 
        animationType="slide" 
        onRequestClose={() => setAttendanceModalVisible(false)}
        transparent={false} 
      >
         <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.attendanceModalContainer, { paddingTop: insets.top }]}>
             <View style={styles.attendanceHeader}>
                 <TouchableOpacity onPress={() => setAttendanceModalVisible(false)} style={{padding: 8}}>
                     <Ionicons name="close" size={28} color={AppTheme.textPrimary} />
                 </TouchableOpacity>
                 <View style={{alignItems:'center', flex:1}}>
                    <Text style={styles.attendanceHeaderTitle}>Lista de Presença</Text>
                    <Text style={styles.attendanceHeaderSubtitle}>{attendanceTraining?.title} • {formatDateLabel(attendanceTraining?.training_date || '')}</Text>
                 </View>
                 <TouchableOpacity onPress={saveAttendance} disabled={isSavingAttendance || attendanceLoading} style={{padding: 8}}>
                    {isSavingAttendance ? <ActivityIndicator color={AppTheme.primary}/> : <Text style={styles.saveLink}>Salvar</Text>}
                 </TouchableOpacity>
             </View>

             {attendanceLoading && teamAthletes.length === 0 ? (
                 <View style={{flex:1, justifyContent:'center', alignItems:'center'}}>
                     <ActivityIndicator size="large" color={AppTheme.primary} />
                     <Text style={{marginTop: 10, color: AppTheme.textSecondary}}>Carregando atletas...</Text>
                 </View>
             ) : (
                 <FlatList
                    data={teamAthletes}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{padding: 16, paddingBottom: 40}}
                    ListEmptyComponent={<Text style={{textAlign:'center', marginTop: 20, color: AppTheme.textSecondary}}>Nenhum atleta vinculado a esta equipe no banco de dados.</Text>}
                    renderItem={({item}) => {
                        const status = attendanceStatusMap[item.id] || 'absent'; 
                        const displayName = item.name || item.full_name || 'Atleta sem nome';
                        const initial = displayName.charAt(0).toUpperCase();
                        const isJustified = status === 'justified';

                        let avatarBg = '#EEE';
                        let avatarColor = '#666';
                        if (status === 'present') { avatarBg = '#E8F5E9'; avatarColor = AppTheme.primary; }
                        else if (status === 'justified') { avatarBg = '#FFF3E0'; avatarColor = '#F57C00'; }
                        else if (status === 'absent') { avatarBg = '#FFEBEE'; avatarColor = '#C62828'; }

                        return (
                            <View style={[styles.athleteCard, status === 'present' && styles.athleteCardPresent]}>
                                <View style={styles.athleteRowTop}>
                                    <View style={styles.athleteInfo}>
                                        <View style={[styles.avatarCircle, { backgroundColor: avatarBg }]}>
                                            <Text style={[styles.avatarText, { color: avatarColor }]}>{initial}</Text>
                                        </View>
                                        <View>
                                            <Text style={styles.athleteName}>{displayName}</Text>
                                            <Text style={styles.athletePos}>{item.position || 'Atleta'}</Text>
                                        </View>
                                    </View>
                                    
                                    {/* SELETOR DE STATUS (3 BOTÕES) */}
                                    <View style={styles.statusSelector}>
                                        <TouchableOpacity 
                                            onPress={() => setStatus(item.id, 'present')}
                                            style={[styles.statusBtn, status === 'present' && styles.statusBtnSelectedPresent]}
                                        >
                                            <Ionicons name="checkmark" size={20} color={status === 'present' ? '#FFF' : '#CCC'} />
                                        </TouchableOpacity>
                                        
                                        <TouchableOpacity 
                                            onPress={() => setStatus(item.id, 'absent')}
                                            style={[styles.statusBtn, status === 'absent' && styles.statusBtnSelectedAbsent]}
                                        >
                                            <Ionicons name="close" size={20} color={status === 'absent' ? '#FFF' : '#CCC'} />
                                        </TouchableOpacity>

                                        <TouchableOpacity 
                                            onPress={() => setStatus(item.id, 'justified')}
                                            style={[styles.statusBtn, status === 'justified' && styles.statusBtnSelectedJustified]}
                                        >
                                            <Ionicons name="document-text-outline" size={18} color={status === 'justified' ? '#FFF' : '#CCC'} />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* CAMPO DE JUSTIFICATIVA (Só aparece se justificado) */}
                                {isJustified && (
                                    <View style={styles.justificationContainer}>
                                        <Text style={styles.justificationLabel}>Motivo da falta:</Text>
                                        <TextInput 
                                            style={styles.justificationInput}
                                            placeholder="Ex: Doente, Trabalho, Viagem..."
                                            value={justificationMap[item.id] || ''}
                                            onChangeText={(t) => updateJustification(item.id, t)}
                                        />
                                    </View>
                                )}
                            </View>
                        )
                    }}
                 />
             )}
             
             <View style={styles.attendanceFooter}>
                 <Text style={styles.attendanceSummary}>
                     <Text style={{color: AppTheme.primary}}>Presentes: {Object.values(attendanceStatusMap).filter(s => s === 'present').length}</Text> • 
                     <Text style={{color: '#F57C00'}}> Justif: {Object.values(attendanceStatusMap).filter(s => s === 'justified').length}</Text> • 
                     <Text style={{color: '#C62828'}}> Faltas: {Object.values(attendanceStatusMap).filter(s => s === 'absent').length}</Text>
                 </Text>
             </View>
         </KeyboardAvoidingView>
      </Modal>

      {/* OUTROS MODAIS */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
         <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
               <Text style={styles.modalTitle}>{editingTraining ? 'Editar Treino' : 'Novo Treino'}</Text>
               <Text style={styles.fieldLabel}>Título <Text style={styles.requiredStar}>*</Text></Text>
               <TextInput style={[styles.input, fieldErrors.title ? styles.inputError : null]} value={formTitle} onChangeText={t => { setFormTitle(t); if(fieldErrors.title) setFieldErrors(prev=>({...prev, title:undefined})) }} placeholder="Ex.: Treino tático..." />
               {fieldErrors.title && <Text style={styles.errorText}>{fieldErrors.title}</Text>}
               
               <Text style={styles.fieldLabel}>Data (dd/mm/aaaa) <Text style={styles.requiredStar}>*</Text></Text>
               <TextInput style={[styles.input, fieldErrors.date ? styles.inputError : null]} value={formDateDisplay} onChangeText={handleDateChange} keyboardType="number-pad" placeholder="__/__/____" />
               {fieldErrors.date && <Text style={styles.errorText}>{fieldErrors.date}</Text>}

               <Text style={styles.fieldLabel}>Horário inicial</Text>
               <TextInput style={styles.input} value={formStartTime} onChangeText={t => setFormStartTime(maskTime(t))} placeholder="HH:MM" keyboardType="number-pad" />

               <Text style={styles.fieldLabel}>Duração (minutos)</Text>
               <TextInput style={styles.input} value={formDurationMinutes} onChangeText={setFormDurationMinutes} placeholder="60" keyboardType="number-pad" />

               <Text style={styles.fieldLabel}>Local</Text>
               <TextInput style={styles.input} value={formLocation} onChangeText={setFormLocation} placeholder="Ginásio..." />

               <Text style={styles.fieldLabel}>Descrição</Text>
               <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} value={formDescription} onChangeText={setFormDescription} placeholder="Detalhes..." multiline />

               {!editingTraining && (
                  <View style={styles.repeatRow}>
                    <TouchableOpacity style={styles.checkboxOuter} onPress={() => setIsWeekly(prev => !prev)}>
                      {isWeekly && <View style={styles.checkboxInner} />}
                    </TouchableOpacity>
                    <Text style={styles.repeatLabel}>Treino semanal (repete até férias)</Text>
                  </View>
               )}

               <View style={styles.modalButtonsRow}>
                   <TouchableOpacity style={[styles.modalButton, styles.modalButtonOutline]} onPress={() => setModalVisible(false)}><Text style={styles.modalButtonOutlineText}>Cancelar</Text></TouchableOpacity>
                   <TouchableOpacity style={[styles.modalButton, styles.modalButtonPrimary]} onPress={handleSaveTraining} disabled={saving}>
                       {saving ? <ActivityIndicator color="#FFF"/> : <Text style={styles.modalButtonPrimaryText}>Salvar</Text>}
                   </TouchableOpacity>
               </View>
            </View>
         </View>
      </Modal>

      {/* Modal de Férias */}
      <Modal visible={vacModalVisible} transparent animationType="slide" onRequestClose={() => setVacModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Período de férias</Text>
            <Text style={styles.fieldLabel}>Data inicial</Text>
            <TextInput style={styles.input} value={vacStartDisplay} onChangeText={handleVacStartChange} keyboardType="number-pad" placeholder="__/__/____" />
            <Text style={styles.fieldLabel}>Data final</Text>
            <TextInput style={styles.input} value={vacEndDisplay} onChangeText={handleVacEndChange} keyboardType="number-pad" placeholder="__/__/____" />
            <Text style={styles.fieldLabel}>Observações</Text>
            <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} value={vacNotes} onChangeText={setVacNotes} placeholder="Motivo..." multiline />
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonOutline]} onPress={() => setVacModalVisible(false)}><Text style={styles.modalButtonOutlineText}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonPrimary]} onPress={handleSaveVacation} disabled={vacSaving}>
                {vacSaving ? <ActivityIndicator color="#FFF"/> : <Text style={styles.modalButtonPrimaryText}>Salvar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {isDiretoriaOrAdmin && selectedTeamId && (
        <TouchableOpacity style={[styles.fab, { bottom: 88 + insets.bottom }]} onPress={() => openNewTrainingModal(selectedDate)}><Ionicons name="add" size={26} color="#FFF" /></TouchableOpacity>
      )}
    </View>
  );
}

// ================== ESTILOS ==================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppTheme.background },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  pageHeader: { height: 10 },
  
  section: { paddingHorizontal: 16, paddingTop: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: AppTheme.textPrimary, marginBottom: 8 },
  sectionSubLabel: { fontSize: 13, color: AppTheme.textSecondary, marginBottom: 8 },
  teamChipsRow: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  teamChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: AppTheme.border, backgroundColor: AppTheme.surface },
  teamChipSelected: { backgroundColor: AppTheme.primary, borderColor: AppTheme.primary },
  teamChipText: { fontSize: 13, color: AppTheme.textPrimary },
  teamChipTextSelected: { color: '#FFF', fontWeight: '600' },

  monthHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  monthTitle: { fontSize: 16, fontWeight: '600', color: AppTheme.textPrimary, textTransform: 'capitalize' },
  monthActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  vacationButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F3EC', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginRight: 8 },
  vacationButtonText: { fontSize: 12, color: AppTheme.primary, marginLeft: 4, fontWeight: '600' },
  vacationInfo: { paddingHorizontal: 16, marginBottom: 8 },
  vacationInfoText: { fontSize: 12, color: AppTheme.textSecondary },

  calendarWrapper: { marginHorizontal: 16, backgroundColor: AppTheme.surface, borderRadius: 16, padding: 10, borderWidth: 1, borderColor: AppTheme.border },
  calendarWeekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  calendarWeekday: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', color: AppTheme.textSecondary },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarCell: { width: `${100/7}%`, alignItems: 'center', marginVertical: 4 },
  calendarDay: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  calendarDayText: { fontSize: 13 },
  calendarLoading: { alignItems: 'center', marginVertical: 10 },

  sectionListWrapper: { padding: 16 },
  sectionListHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  emptyListContainer: { padding: 20, alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 8 },
  emptyListText: { color: '#999' },

  trainingCard: { backgroundColor: AppTheme.surface, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: AppTheme.border, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  trainingHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  trainingTitle: { fontSize: 16, fontWeight: '700', color: AppTheme.textPrimary },
  trainingLocation: { fontSize: 13, color: AppTheme.textSecondary, marginTop: 2 },
  trainingInfoRow: { marginTop: 8 },
  trainingInfoText: { fontSize: 13, color: AppTheme.textPrimary },
  trainingDescription: { fontSize: 13, color: AppTheme.textSecondary, marginTop: 6 },
  
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusBadgeScheduled: { backgroundColor: '#E8F3EC' },
  statusBadgeCanceled: { backgroundColor: '#FFEBEE' },
  statusBadgeText: { fontSize: 11, fontWeight: '600' },
  statusBadgeTextScheduled: { color: AppTheme.primary },
  statusBadgeTextCanceled: { color: '#C62828' },

  trainingActionsRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 8 },
  iconButton: { padding: 6, marginLeft: 10 },
  
  attendanceButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: AppTheme.primaryDark, borderRadius: 8, paddingVertical: 10, marginTop: 12 },
  attendanceButtonText: { color: '#FFF', fontWeight: '600', marginLeft: 8, fontSize: 14 },

  attendanceModalContainer: { flex: 1, backgroundColor: '#F5F5F5' },
  attendanceHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE', elevation: 2 },
  attendanceHeaderTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
  attendanceHeaderSubtitle: { fontSize: 13, color: '#666' },
  saveLink: { color: AppTheme.primary, fontWeight: '700', fontSize: 16 },
  
  // Card do Atleta
  athleteCard: { backgroundColor: '#FFF', marginBottom: 10, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#EEE', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 2, elevation: 1 },
  athleteCardPresent: { borderColor: '#A5D6A7', backgroundColor: '#F9FFF9' },
  athleteRowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  
  athleteInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EEE', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#666' },
  athleteName: { fontSize: 16, color: '#333', fontWeight: '600' },
  athletePos: { fontSize: 13, color: '#999' },

  // Seletor de Status (3 botões)
  statusSelector: { flexDirection: 'row', backgroundColor: '#F0F0F0', borderRadius: 24, padding: 3 },
  statusBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  statusBtnSelectedPresent: { backgroundColor: AppTheme.primary },
  statusBtnSelectedAbsent: { backgroundColor: '#E53935' },
  statusBtnSelectedJustified: { backgroundColor: '#FB8C00' },

  justificationContainer: { marginTop: 12, backgroundColor: '#FFF8E1', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#FFE0B2' },
  justificationLabel: { fontSize: 12, color: '#F57C00', fontWeight: '700', marginBottom: 4 },
  justificationInput: { backgroundColor: '#FFF', borderRadius: 6, padding: 8, fontSize: 14, color: '#333', borderWidth: 1, borderColor: '#FFE0B2' },

  attendanceFooter: { padding: 20, borderTopWidth: 1, borderTopColor: '#EEE', alignItems: 'center', backgroundColor: '#FFF', elevation: 8 },
  attendanceSummary: { fontSize: 15, fontWeight: '600', color: '#333' },

  fab: { position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: AppTheme.primary, alignItems: 'center', justifyContent: 'center', elevation: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  
  // ESTILOS DE FORMULÁRIO (RECUPERADOS E CORRIGIDOS)
  fieldLabel: { fontSize: 14, fontWeight: '600', marginBottom: 6, color: AppTheme.textPrimary, marginTop: 10 },
  requiredStar: { color: 'red' },
  input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 10, marginBottom: 4, fontSize: 15, backgroundColor: '#FFF' },
  inputError: { borderColor: 'red' },
  errorText: { color: 'red', fontSize: 12, marginBottom: 8 },
  
  modalButtonsRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20 },
  modalButton: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, marginLeft: 10 },
  modalButtonOutline: { borderWidth: 1, borderColor: '#DDD' },
  modalButtonOutlineText: { color: '#666' },
  modalButtonPrimary: { backgroundColor: AppTheme.primary },
  modalButtonPrimaryText: { color: '#FFF', fontWeight: '600' },
  
  repeatRow: { flexDirection: 'row', alignItems: 'center', marginTop: 15, marginBottom: 5 },
  checkboxOuter: { width: 20, height: 20, borderWidth: 2, borderColor: AppTheme.primary, borderRadius: 4, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  checkboxInner: { width: 12, height: 12, backgroundColor: AppTheme.primary, borderRadius: 2 },
  repeatLabel: { fontSize: 14, color: AppTheme.textPrimary },
});