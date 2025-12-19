// app/screens/EquipesListScreen.tsx
// Listagem de equipes (tabela public.teams) e, na aba Diretoria,
// listagem de membros da diretoria (profiles com role = 'diretoria' ou 'admin').

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  Image,
  ScrollView,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Linking from 'expo-linking';

import { AppTheme } from '../../constants/theme';
import { supabase } from '../services/supabaseClient';
import { usePermissions } from '../../hooks/usePermissions';
import type { EquipesStackParamList } from '../navigation/EquipesStackNavigator';
import { encryptImageBlob } from '../services/imageEncryption';
import EncryptedImage from '../../components/EncryptedImage';

// logo (arquivo em /assets/images/logo_handluz.png)
const handluzLogo = require('../../assets/images/logo_handluz.png');

type EquipesNav = NativeStackNavigationProp<EquipesStackParamList>;

type Category = {
  id: number;
  name: string;
  age_min: number | null;
  age_max: number | null;
};

type Equipe = {
  id: string;
  name: string;
  category_id: number | null;
  category?: Category | null;
};

type RoleValue = 'usuario' | 'diretoria' | 'admin';

type BoardMember = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: RoleValue | null;
  board_role: string | null;
};

type ViewMode = 'times' | 'diretoria' | 'atletas_sem_time';

type AthleteWithoutTeam = {
  id: string;
  full_name: string;
  nickname: string | null;
  email: string | null;
  phone: string | null;
  birthdate: string | null;
  image_url: string | null;
  team_id: string | null;
  category_id: number | null;
  document_url?: string | null;
};

export default function EquipesListScreen() {
  const { isDiretoriaOrAdmin } = usePermissions();
  const navigation = useNavigation<EquipesNav>();
  const insets = useSafeAreaInsets();

  // Times
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Diretoria
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>([]);
  const [boardLoading, setBoardLoading] = useState<boolean>(false);
  const [boardRefreshing, setBoardRefreshing] = useState<boolean>(false);

  // Atletas sem time
  const [athletesWithoutTeam, setAthletesWithoutTeam] = useState<AthleteWithoutTeam[]>([]);
  const [athletesLoading, setAthletesLoading] = useState<boolean>(false);
  const [athletesRefreshing, setAthletesRefreshing] = useState<boolean>(false);

  // Categorias
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState<boolean>(false);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState<boolean>(false);

  // Modal criação/edição de equipe
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editingEquipe, setEditingEquipe] = useState<Equipe | null>(null);
  const [formNome, setFormNome] = useState<string>('');
  const [formCategoriaId, setFormCategoriaId] = useState<number | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // Modal edição de função na diretoria
  const [boardModalVisible, setBoardModalVisible] = useState<boolean>(false);
  const [editingBoardMember, setEditingBoardMember] = useState<BoardMember | null>(null);
  const [boardRoleInput, setBoardRoleInput] = useState<string>('');
  const [savingBoardRole, setSavingBoardRole] = useState<boolean>(false);

  // Modal edição de atleta sem time
  const [athleteEditModalVisible, setAthleteEditModalVisible] = useState<boolean>(false);
  const [editingAthlete, setEditingAthlete] = useState<AthleteWithoutTeam | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [teamPickerVisible, setTeamPickerVisible] = useState<boolean>(false);
  const [savingAthlete, setSavingAthlete] = useState<boolean>(false);

  // Formulário completo de edição de atleta
  const [formNomeCompleto, setFormNomeCompleto] = useState<string>('');
  const [formApelido, setFormApelido] = useState<string>('');
  const [formTelefone, setFormTelefone] = useState<string>('');
  const [formEmail, setFormEmail] = useState<string>('');
  const [birthDigits, setBirthDigits] = useState<string>('');
  const [birthDisplay, setBirthDisplay] = useState<string>('');
  const [imagemAtleta, setImagemAtleta] = useState<{ uri: string } | null>(null);
  const [docFrente, setDocFrente] = useState<{ uri: string } | null>(null);
  const [docVerso, setDocVerso] = useState<{ uri: string } | null>(null);
  const [docPDF, setDocPDF] = useState<{ uri: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    nome?: string;
    telefone?: string;
    email?: string;
    imagem?: string;
    birthdate?: string;
  }>({});
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [docPreview, setDocPreview] = useState<{
    front?: string | null;
    back?: string | null;
  } | null>(null);

  // Preview PDF
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

  // aba selecionada (Times / Diretoria)
  const [viewMode, setViewMode] = useState<ViewMode>('times');

  // ===================== CARREGAR CATEGORIAS =====================

  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, age_min, age_max')
        .order('name', { ascending: true });

      if (error) {
        console.error('[EquipesListScreen] Erro ao carregar categorias:', error.message);
        return;
      }

      setCategories((data ?? []) as Category[]);
    } catch (err) {
      console.error('[EquipesListScreen] Erro inesperado ao carregar categorias:', err);
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // ===================== CARREGAR EQUIPES =====================

  const loadEquipes = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('teams')
        .select(`
          id, 
          name, 
          category_id,
          category:categories(id, name, age_min, age_max)
        `)
        .order('name', { ascending: true });

      if (error) {
        console.error('[EquipesListScreen] Erro ao carregar equipes:', error.message);
        return;
      }

      setEquipes((data ?? []) as Equipe[]);
    } catch (err) {
      console.error('[EquipesListScreen] Erro inesperado ao carregar equipes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEquipes();
  }, [loadEquipes]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadEquipes();
    setRefreshing(false);
  }

  // ===================== CARREGAR DIRETORIA =====================

  const loadBoardMembers = useCallback(async () => {
    setBoardLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, board_role')
        .in('role', ['diretoria', 'admin'])
        .order('full_name', { ascending: true });

      if (error) {
        console.error('[EquipesListScreen] Erro ao carregar diretoria:', error.message);
        return;
      }

      setBoardMembers((data ?? []) as BoardMember[]);
    } catch (err) {
      console.error('[EquipesListScreen] Erro inesperado ao carregar diretoria:', err);
    } finally {
      setBoardLoading(false);
    }
  }, []);

  // ===================== CARREGAR ATLETAS SEM TIME =====================

  const loadAthletesWithoutTeam = useCallback(async () => {
    setAthletesLoading(true);
    try {
      // Buscar atletas que não têm team_id OU não têm category_id
      const { data, error } = await supabase
        .from('athletes')
        .select('id, full_name, nickname, email, phone, birthdate, image_url, team_id, category_id, document_url')
        .or('team_id.is.null,category_id.is.null')
        .eq('is_active', true)
        .order('full_name', { ascending: true });

      if (error) {
        console.error('[EquipesListScreen] Erro ao carregar atletas sem time:', error.message);
        return;
      }

      // Filtrar para mostrar apenas atletas que realmente não têm time OU não têm categoria
      const filtered = (data ?? []).filter(
        (athlete: any) => !athlete.team_id || !athlete.category_id
      );

      setAthletesWithoutTeam(filtered as AthleteWithoutTeam[]);
    } catch (err) {
      console.error('[EquipesListScreen] Erro inesperado ao carregar atletas sem time:', err);
    } finally {
      setAthletesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (viewMode === 'diretoria') {
      loadBoardMembers();
    } else if (viewMode === 'atletas_sem_time' && isDiretoriaOrAdmin) {
      loadAthletesWithoutTeam();
    }
    // Se o usuário não tem permissão e está na aba atletas_sem_time, voltar para times
    if (viewMode === 'atletas_sem_time' && !isDiretoriaOrAdmin) {
      setViewMode('times');
    }
  }, [viewMode, loadBoardMembers, loadAthletesWithoutTeam, isDiretoriaOrAdmin]);

  async function handleBoardRefresh() {
    setBoardRefreshing(true);
    await loadBoardMembers();
    setBoardRefreshing(false);
  }

  async function handleAthletesRefresh() {
    setAthletesRefreshing(true);
    await loadAthletesWithoutTeam();
    setAthletesRefreshing(false);
  }

  function getRoleLabel(role: RoleValue | null) {
    if (!role) return '—';
    if (role === 'diretoria') return 'Diretoria';
    if (role === 'admin') return 'Admin HandLuz';
    return 'Usuário / Atleta';
  }

  // ===================== CRUD EQUIPES (DIRETORIA/ADMIN) =====================

  function openCreateModal() {
    setEditingEquipe(null);
    setFormNome('');
    setFormCategoriaId(null);
    setModalVisible(true);
  }

  function openEditModal(equipe: Equipe) {
    setEditingEquipe(equipe);
    setFormNome(equipe.name);
    setFormCategoriaId(equipe.category_id ?? null);
    setModalVisible(true);
  }

  async function handleSaveEquipe() {
    if (!formNome.trim()) {
      Alert.alert('Dados incompletos', 'Informe o nome da equipe.');
      return;
    }

    setSaving(true);

    try {
      if (editingEquipe) {
        // Atualização
        const { error } = await supabase
          .from('teams')
          .update({
            name: formNome.trim(),
            category_id: formCategoriaId || null,
          })
          .eq('id', editingEquipe.id);

        if (error) {
          console.error('[EquipesListScreen] Erro ao atualizar equipe:', error.message);
          Alert.alert('Erro', 'Não foi possível atualizar a equipe.');
          return;
        }

        // Atualizar category_id de todos os atletas do time quando a categoria muda
        if (formCategoriaId) {
          const { error: updateAthletesError } = await supabase
            .from('athletes')
            .update({ category_id: formCategoriaId })
            .eq('team_id', editingEquipe.id);

          if (updateAthletesError) {
            console.error(
              '[EquipesListScreen] Erro ao atualizar categoria dos atletas:',
              updateAthletesError.message
            );
            // Não bloqueia, apenas loga o erro
          }
        } else {
          // Se a categoria foi removida, limpar category_id dos atletas
          const { error: updateAthletesError } = await supabase
            .from('athletes')
            .update({ category_id: null })
            .eq('team_id', editingEquipe.id);

          if (updateAthletesError) {
            console.error(
              '[EquipesListScreen] Erro ao limpar categoria dos atletas:',
              updateAthletesError.message
            );
          }
        }
      } else {
        // Criação
        const { error } = await supabase.from('teams').insert({
          name: formNome.trim(),
          category_id: formCategoriaId || null,
        });

        if (error) {
          console.error('[EquipesListScreen] Erro ao criar equipe:', error.message);
          Alert.alert('Erro', 'Não foi possível criar a equipe.');
          return;
        }
      }

      setModalVisible(false);
      setEditingEquipe(null);
      setFormNome('');
      setFormCategoriaId(null);

      await loadEquipes();
    } catch (err) {
      console.error('[EquipesListScreen] Erro inesperado ao salvar equipe:', err);
      Alert.alert('Erro', 'Ocorreu um erro inesperado ao salvar a equipe.');
    } finally {
      setSaving(false);
    }
  }

  function handleDeleteEquipe(equipe: Equipe) {
    Alert.alert(
      'Remover equipe',
      `Deseja realmente excluir a equipe "${equipe.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('teams')
                .delete()
                .eq('id', equipe.id);

              if (error) {
                console.error(
                  '[EquipesListScreen] Erro ao excluir equipe:',
                  error.message
                );
                Alert.alert('Erro', 'Não foi possível excluir a equipe.');
                return;
              }

              await loadEquipes();
            } catch (err) {
              console.error(
                '[EquipesListScreen] Erro inesperado ao excluir equipe:',
                err
              );
              Alert.alert(
                'Erro',
                'Ocorreu um erro inesperado ao excluir a equipe.'
              );
            }
          },
        },
      ]
    );
  }

  // ===================== EDIÇÃO DE FUNÇÃO (DIRETORIA) =====================

  function openBoardRoleModal(member: BoardMember) {
    setEditingBoardMember(member);
    setBoardRoleInput(member.board_role ?? '');
    setBoardModalVisible(true);
  }

  async function handleSaveBoardRole() {
    if (!editingBoardMember) return;

    setSavingBoardRole(true);

    try {
      const newBoardRole = boardRoleInput.trim() || null;

      const { error } = await supabase
        .from('profiles')
        .update({ board_role: newBoardRole })
        .eq('id', editingBoardMember.id);

      if (error) {
        console.error(
          '[EquipesListScreen] Erro ao salvar função na diretoria:',
          error.message
        );
        Alert.alert('Erro', 'Não foi possível salvar a função deste membro.');
        return;
      }

      setBoardModalVisible(false);
      setEditingBoardMember(null);
      setBoardRoleInput('');

      await loadBoardMembers();
    } catch (err) {
      console.error(
        '[EquipesListScreen] Erro inesperado ao salvar função na diretoria:',
        err
      );
      Alert.alert('Erro', 'Ocorreu um erro inesperado ao salvar a função.');
    } finally {
      setSavingBoardRole(false);
    }
  }

  // ===================== NAVEGAÇÃO PARA ATLETAS =====================

  function handleOpenAtletas(equipe: Equipe) {
    navigation.navigate('EquipeAtletas', {
      equipeId: equipe.id,
      equipeNome: equipe.name,
    });
  }

  // ===================== EDIÇÃO DE ATLETA SEM TIME =====================

  // Funções auxiliares para edição completa
  function validarEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  function formatBirthDisplay(digits: string): string {
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) {
      return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  }

  function handleBirthChange(text: string) {
    const digits = text.replace(/\D/g, '').slice(0, 8);
    setBirthDigits(digits);
    setBirthDisplay(formatBirthDisplay(digits));
    if (fieldErrors.birthdate) {
      setFieldErrors(prev => ({ ...prev, birthdate: undefined }));
    }
  }

  function getBirthdateForPayload(): string | null {
    if (birthDigits.length === 0) return null;
    if (birthDigits.length !== 8) return null;
    const d = birthDigits.slice(0, 2);
    const m = birthDigits.slice(2, 4);
    const y = birthDigits.slice(4, 8);
    return `${y}-${m}-${d}`; // yyyy-mm-dd
  }

  async function ensureMediaPermission(): Promise<boolean> {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permissão necessária',
        'Precisamos de permissão para acessar as fotos do dispositivo.'
      );
      return false;
    }
    return true;
  }

  async function pickImage(setImage: (img: { uri: string } | null) => void) {
    const allowed = await ensureMediaPermission();
    if (!allowed) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    setImage({ uri: asset.uri });
  }

  async function pickPDF(setPDF: (pdf: { uri: string } | null) => void) {
    console.log('[EquipesListScreen] pickPDF chamado');
    
    // Para web, usar input file HTML nativo
    if (Platform.OS === 'web') {
      console.log('[EquipesListScreen] Usando input file para web');
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/pdf';
      input.style.display = 'none';
      
      input.onchange = (e: Event) => {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];
        if (file) {
          if (file.type !== 'application/pdf') {
            Alert.alert('Erro', 'Por favor, selecione apenas arquivos PDF.');
            return;
          }
          const uri = URL.createObjectURL(file);
          console.log('[EquipesListScreen] PDF selecionado (web):', uri);
          setPDF({ uri });
        }
        document.body.removeChild(input);
      };
      
      document.body.appendChild(input);
      input.click();
      return;
    }

    // Para mobile, usar DocumentPicker
    try {
      console.log('[EquipesListScreen] Iniciando seleção de PDF (mobile)...');
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      console.log('[EquipesListScreen] Resultado do DocumentPicker:', JSON.stringify(result, null, 2));

      // Verificar se foi cancelado
      if ('canceled' in result && result.canceled) {
        console.log('[EquipesListScreen] Seleção cancelada pelo usuário');
        return;
      }

      // Verificar se o tipo é success
      if (result.type === 'success') {
        const uri = result.uri || (result as any).fileUri;
        if (uri) {
          console.log('[EquipesListScreen] PDF selecionado com sucesso:', uri);
          setPDF({ uri });
        } else {
          console.error('[EquipesListScreen] URI não encontrada no resultado:', result);
          Alert.alert('Erro', 'Não foi possível obter o caminho do arquivo selecionado.');
        }
      } else {
        console.warn('[EquipesListScreen] Resultado inesperado:', result);
        Alert.alert('Aviso', 'Não foi possível processar o arquivo selecionado.');
      }
    } catch (err) {
      console.error('[EquipesListScreen] Erro ao selecionar PDF:', err);
      Alert.alert('Erro', `Não foi possível selecionar o arquivo PDF: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    }
  }

  async function uploadImageToStorage(
    picked: { uri: string },
    pathPrefix: string
  ): Promise<string | null> {
    try {
      const response = await fetch(picked.uri);
      const blob = await response.blob();

      const extGuess = picked.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const fileExt = ['jpg', 'jpeg', 'png', 'webp'].includes(extGuess)
        ? extGuess
        : 'jpg';

      const filePath = `${pathPrefix}-${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('athletes')
        .upload(filePath, blob, {
          upsert: true,
          contentType: blob.type || 'image/jpeg',
        });

      if (error) {
        console.error('[EquipesListScreen] Erro upload storage:', error.message);
        return null;
      }

      const { data: publicData } = supabase.storage
        .from('athletes')
        .getPublicUrl(data.path);

      return publicData.publicUrl ?? null;
    } catch (err) {
      console.error('[EquipesListScreen] Erro inesperado upload:', err);
      return null;
    }
  }

  async function uploadEncryptedDocument(
    picked: { uri: string },
    pathPrefix: string
  ): Promise<string | null> {
    try {
      const response = await fetch(picked.uri);
      const originalBlob = await response.blob();

      const originalContentType = originalBlob.type || 'image/jpeg';
      const encryptedBlob = await encryptImageBlob(originalBlob);

      const extGuess = picked.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const fileExt = ['jpg', 'jpeg', 'png', 'webp'].includes(extGuess)
        ? extGuess
        : 'jpg';

      const filePath = `${pathPrefix}-${Date.now()}.${fileExt}.enc`;
      const blobWithCorrectType = new Blob([encryptedBlob], { type: originalContentType });

      const { data, error } = await supabase.storage
        .from('athletes')
        .upload(filePath, blobWithCorrectType, {
          upsert: true,
          contentType: originalContentType,
        });

      if (error) {
        console.error('[EquipesListScreen] Erro upload documento criptografado:', error.message);
        return null;
      }

      const { data: publicData } = supabase.storage
        .from('athletes')
        .getPublicUrl(data.path);

      return publicData.publicUrl ?? null;
    } catch (err) {
      console.error('[EquipesListScreen] Erro inesperado upload documento:', err);
      return null;
    }
  }

  // Função para upload de PDF no bucket pdfDocuments
  async function uploadPDFDocument(
    picked: { uri: string },
    pathPrefix: string
  ): Promise<string | null> {
    try {
      let blob: Blob;
      
      // Para web, o URI pode ser um blob URL, precisamos obter o arquivo original
      if (Platform.OS === 'web' && picked.uri.startsWith('blob:')) {
        const response = await fetch(picked.uri);
        blob = await response.blob();
      } else {
        const response = await fetch(picked.uri);
        blob = await response.blob();
      }

      // Validar se é PDF pela extensão ou tipo
      const fileName = picked.uri.split('/').pop() || '';
      const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
      const isPDF = fileExtension === 'pdf' || blob.type === 'application/pdf';
      
      if (!isPDF) {
        Alert.alert('Erro', 'O arquivo selecionado não é um PDF válido.');
        return null;
      }

      const filePath = `${pathPrefix}-${Date.now()}.pdf`;

      // Upload para o bucket pdfDocuments
      const { data, error } = await supabase.storage
        .from('pdfDocuments')
        .upload(filePath, blob, {
          upsert: true,
          contentType: 'application/pdf',
        });

      if (error) {
        console.error('[EquipesListScreen] Erro upload PDF:', error.message);
        Alert.alert(
          'Erro no upload',
          `Não foi possível fazer o upload do PDF: ${error.message}`
        );
        return null;
      }

      const { data: publicData } = supabase.storage
        .from('pdfDocuments')
        .getPublicUrl(data.path);

      return publicData.publicUrl ?? null;
    } catch (err) {
      console.error('[EquipesListScreen] Erro inesperado upload PDF:', err);
      Alert.alert('Erro', 'Ocorreu um erro ao fazer o upload do PDF.');
      return null;
    }
  }

  function validarCampos(): boolean {
    const errors: typeof fieldErrors = {};

    if (!formNomeCompleto.trim()) {
      errors.nome = 'Informe o nome completo do atleta.';
    }
    if (!formTelefone.trim()) {
      errors.telefone = 'Informe um telefone de contato.';
    }
    if (!formEmail.trim()) {
      errors.email = 'Informe um e-mail válido.';
    } else if (!validarEmail(formEmail)) {
      errors.email = 'Informe um e-mail válido (exemplo: email@exemplo.com).';
    }

    if (!imagemAtleta && !editingAthlete?.image_url) {
      errors.imagem = 'Selecione a imagem do atleta.';
    }

    if (birthDigits.length > 0 && birthDigits.length < 8) {
      errors.birthdate =
        'Complete a data de nascimento (dd/mm/aaaa) ou deixe em branco.';
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      Alert.alert(
        'Campos obrigatórios',
        'Preencha corretamente os campos destacados em vermelho.'
      );
      return false;
    }
    return true;
  }

  function openAthleteEditModal(athlete: AthleteWithoutTeam) {
    setEditingAthlete(athlete);
    setSelectedTeamId(athlete.team_id || null);
    
    // Preencher formulário com dados do atleta
    setFormNomeCompleto(athlete.full_name);
    setFormApelido(athlete.nickname ?? '');
    setFormTelefone(athlete.phone ?? '');
    setFormEmail(athlete.email ?? '');

    if (athlete.birthdate) {
      const [y, m, d] = athlete.birthdate.split('-');
      const digits = `${d}${m}${y}`;
      setBirthDigits(digits);
      setBirthDisplay(formatBirthDisplay(digits));
    } else {
      setBirthDigits('');
      setBirthDisplay('');
    }

    setImagemAtleta(null);
    setDocFrente(null);
    setDocVerso(null);
    setDocPDF(null);
    setFieldErrors({});
    setAthleteEditModalVisible(true);
  }

  async function handleSaveAthleteTeam() {
    if (!editingAthlete) return;
    
    if (!validarCampos()) return;

    setSavingAthlete(true);

    try {
      const athleteId = editingAthlete.id;
      const birthdateDb = getBirthdateForPayload();

      // Upload de imagens
      const [imageUrl, docFrontUrl, docBackUrl, docPDFUrl] = await Promise.all([
        imagemAtleta
          ? uploadImageToStorage(imagemAtleta, `${athleteId}-photo`)
          : Promise.resolve(null),
        docFrente
          ? uploadEncryptedDocument(docFrente, `${athleteId}-doc-front`)
          : Promise.resolve(null),
        docVerso
          ? uploadEncryptedDocument(docVerso, `${athleteId}-doc-back`)
          : Promise.resolve(null),
        docPDF
          ? uploadPDFDocument(docPDF, `${athleteId}-doc-pdf`)
          : Promise.resolve(null),
      ]);

      // Preparar payload de atualização
      const updatePayload: any = {
        full_name: formNomeCompleto.trim(),
        nickname: formApelido.trim() || null,
        phone: formTelefone.trim(),
        email: formEmail.trim(),
        birthdate: birthdateDb,
      };

      // Se houver nova imagem, usar ela. Caso contrário, manter a existente
      if (imageUrl) {
        updatePayload.image_url = imageUrl;
      } else if (editingAthlete.image_url) {
        updatePayload.image_url = editingAthlete.image_url;
      }

      if (docFrontUrl) updatePayload.document_front_url = docFrontUrl;
      if (docBackUrl) updatePayload.document_back_url = docBackUrl;
      if (docPDFUrl) updatePayload.document_url = docPDFUrl;

      // Se um time foi selecionado, vincular o atleta
      if (selectedTeamId) {
        const { data: teamData, error: teamError } = await supabase
          .from('teams')
          .select('category_id')
          .eq('id', selectedTeamId)
          .single();

        if (teamError) {
          console.error(
            '[EquipesListScreen] Erro ao buscar categoria do time:',
            teamError.message
          );
          // Continua mesmo se não conseguir buscar a categoria
        }

        updatePayload.team_id = selectedTeamId;
        updatePayload.category_id = teamData?.category_id || null;
      } else {
        // Se nenhum time foi selecionado, manter sem time
        updatePayload.team_id = null;
        updatePayload.category_id = null;
      }

      // Atualizar atleta
      const { error: updateError } = await supabase
        .from('athletes')
        .update(updatePayload)
        .eq('id', athleteId);

      if (updateError) {
        console.error(
          '[EquipesListScreen] Erro ao atualizar atleta:',
          updateError.message
        );
        Alert.alert('Erro', 'Não foi possível salvar as alterações do atleta.');
        setSavingAthlete(false);
        return;
      }

      setAthleteEditModalVisible(false);
      setEditingAthlete(null);
      setSelectedTeamId(null);
      setFormNomeCompleto('');
      setFormApelido('');
      setFormTelefone('');
      setFormEmail('');
      setBirthDigits('');
      setBirthDisplay('');
      setImagemAtleta(null);
      setDocFrente(null);
      setDocVerso(null);
      setDocPDF(null);
      setFieldErrors({});

      // Recarregar lista de atletas sem time
      await loadAthletesWithoutTeam();
      
      Alert.alert('Sucesso', 'Atleta atualizado com sucesso!');
    } catch (err) {
      console.error(
        '[EquipesListScreen] Erro inesperado ao atualizar atleta:',
        err
      );
      Alert.alert('Erro', 'Ocorreu um erro inesperado ao salvar o atleta.');
    } finally {
      setSavingAthlete(false);
    }
  }

  // ===================== RENDER ATLETAS SEM TIME =====================

  function renderAthleteWithoutTeam({ item }: { item: AthleteWithoutTeam }) {
    const hasNoTeam = !item.team_id;
    const hasNoCategory = !item.category_id;
    const temPDF = !!item.document_url;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{item.full_name}</Text>
            {item.nickname && (
              <Text style={styles.cardSubtitle}>{item.nickname}</Text>
            )}
          </View>
          {isDiretoriaOrAdmin && (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => openAthleteEditModal(item)}
            >
              <Ionicons
                name="create-outline"
                size={18}
                color={AppTheme.primary}
              />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.cardContent}>
          {hasNoTeam && (
            <View style={styles.warningBadge}>
              <Ionicons name="warning-outline" size={14} color="#FF9800" />
              <Text style={styles.warningText}>Sem time</Text>
            </View>
          )}
          {hasNoCategory && (
            <View style={styles.warningBadge}>
              <Ionicons name="warning-outline" size={14} color="#FF9800" />
              <Text style={styles.warningText}>Sem categoria</Text>
            </View>
          )}
          
          {item.email && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <Ionicons name="mail-outline" size={14} color={AppTheme.textSecondary} />
              <Text style={[styles.infoText, { marginLeft: 6 }]}>{item.email}</Text>
            </View>
          )}
          {item.phone && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <Ionicons name="call-outline" size={14} color={AppTheme.textSecondary} />
              <Text style={[styles.infoText, { marginLeft: 6 }]}>{item.phone}</Text>
            </View>
          )}

          {/* Botão para ver PDF */}
          {isDiretoriaOrAdmin && temPDF && (
            <TouchableOpacity
              style={styles.viewDocsButton}
              onPress={async () => {
                if (Platform.OS === 'web') {
                  setPdfPreviewUrl(item.document_url!);
                } else {
                  // Para mobile, abrir PDF no navegador
                  const url = item.document_url!;
                  const canOpen = await Linking.canOpenURL(url);
                  if (canOpen) {
                    await Linking.openURL(url);
                  } else {
                    Alert.alert('Erro', 'Não foi possível abrir o PDF.');
                  }
                }
              }}
            >
              <Ionicons
                name="document-attach-outline"
                size={14}
                color={AppTheme.primary}
                style={{ marginRight: 4 }}
              />
              <Text style={styles.viewDocsText}>Ver PDF</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // ===================== RENDER TIMES =====================

  function renderEquipe({ item }: { item: Equipe }) {
    const category = item.category;
    const categoryName = category?.name || null;
    const minAge = category?.age_min;
    const maxAge = category?.age_max;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          {categoryName ? (
            <Text style={styles.cardBadge}>{categoryName}</Text>
          ) : null}
        </View>

        {category && (
          <View style={styles.categoryDetails}>
            {(minAge !== null || maxAge !== null) && (
              <Text style={styles.categoryAge}>
                Idade: {minAge !== null ? `${minAge}` : '—'} a{' '}
                {maxAge !== null ? `${maxAge} anos` : '—'}
              </Text>
            )}
          </View>
        )}

        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={styles.cardAction}
            onPress={() => handleOpenAtletas(item)}
          >
            <Ionicons
              name="people-outline"
              size={18}
              color={AppTheme.primary}
              style={{ marginRight: 4 }}
            />
            <Text style={styles.cardActionText}>Ver atletas</Text>
          </TouchableOpacity>

          {isDiretoriaOrAdmin && (
            <View style={styles.cardAdminActions}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => openEditModal(item)}
              >
                <Ionicons
                  name="create-outline"
                  size={18}
                  color={AppTheme.textSecondary}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => handleDeleteEquipe(item)}
              >
                <Ionicons name="trash-outline" size={18} color="#C62828" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  }

  // ===================== RENDER DIRETORIA =====================

  function renderBoardMember({ item }: { item: BoardMember }) {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>
              {item.full_name || 'Nome não informado'}
            </Text>
            <Text style={styles.cardLineSmall}>{item.email ?? '—'}</Text>
          </View>
          <Text style={styles.cardBadge}>{getRoleLabel(item.role)}</Text>
        </View>

        <View style={styles.cardFooter}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardLine}>
              Função na diretoria:{' '}
              {item.board_role && item.board_role.trim().length > 0
                ? item.board_role
                : 'Não informada'}
            </Text>
          </View>

          {isDiretoriaOrAdmin && (
            <TouchableOpacity
              style={styles.editRoleButton}
              onPress={() => openBoardRoleModal(item)}
            >
              <Ionicons
                name="create-outline"
                size={16}
                color={AppTheme.primary}
                style={{ marginRight: 4 }}
              />
              <Text style={styles.editRoleButtonText}>Editar função</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // ===================== JSX =====================

  return (
    <View style={styles.container}>
      {/* Header com logo centralizada */}
      <View style={styles.pageHeader}>
        <Image source={handluzLogo} style={styles.headerLogo} resizeMode="contain" />
      </View>

      {/* Filtro superior: Times / Diretoria (abaixo do logo) */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[
            styles.segmentButton,
            viewMode === 'times' && styles.segmentButtonActive,
          ]}
          onPress={() => setViewMode('times')}
          activeOpacity={0.85}
        >
          <Ionicons
            name="people-outline"
            size={16}
            color={viewMode === 'times' ? '#FFF' : AppTheme.textSecondary}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.segmentButtonText,
              viewMode === 'times' && styles.segmentButtonTextActive,
            ]}
          >
            Times
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.segmentButton,
            viewMode === 'diretoria' && styles.segmentButtonActive,
          ]}
          onPress={() => setViewMode('diretoria')}
          activeOpacity={0.85}
        >
          <Ionicons
            name="ribbon-outline"
            size={16}
            color={viewMode === 'diretoria' ? '#FFF' : AppTheme.textSecondary}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.segmentButtonText,
              viewMode === 'diretoria' && styles.segmentButtonTextActive,
            ]}
          >
            Diretoria
          </Text>
        </TouchableOpacity>

        {isDiretoriaOrAdmin && (
          <TouchableOpacity
            style={[
              styles.segmentButton,
              viewMode === 'atletas_sem_time' && styles.segmentButtonActive,
            ]}
            onPress={() => setViewMode('atletas_sem_time')}
            activeOpacity={0.85}
          >
            <Ionicons
              name="person-remove-outline"
              size={16}
              color={viewMode === 'atletas_sem_time' ? '#FFF' : AppTheme.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.segmentButtonText,
                viewMode === 'atletas_sem_time' && styles.segmentButtonTextActive,
              ]}
            >
              Sem Time
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Conteúdo de cada aba */}
      {viewMode === 'times' ? (
        <>
          {loading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={AppTheme.primary} />
            </View>
          ) : (
            <FlatList
              data={equipes}
              keyExtractor={item => item.id}
              contentContainerStyle={
                equipes.length === 0 ? styles.emptyListContent : styles.listContent
              }
              renderItem={renderEquipe}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={AppTheme.primary}
                />
              }
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  Nenhuma equipe cadastrada até o momento.
                </Text>
              }
            />
          )}
        </>
      ) : viewMode === 'diretoria' ? (
        <>
          {boardLoading && !boardRefreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={AppTheme.primary} />
            </View>
          ) : (
            <FlatList
              data={boardMembers}
              keyExtractor={item => item.id}
              contentContainerStyle={
                boardMembers.length === 0
                  ? styles.emptyListContent
                  : styles.listContent
              }
              renderItem={renderBoardMember}
              refreshControl={
                <RefreshControl
                  refreshing={boardRefreshing}
                  onRefresh={handleBoardRefresh}
                  tintColor={AppTheme.primary}
                />
              }
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  Nenhum membro de diretoria cadastrado (role = diretoria/admin).
                </Text>
              }
            />
          )}
        </>
      ) : viewMode === 'atletas_sem_time' && isDiretoriaOrAdmin ? (
        <>
          {athletesLoading && !athletesRefreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={AppTheme.primary} />
            </View>
          ) : (
            <FlatList
              data={athletesWithoutTeam}
              keyExtractor={item => item.id}
              contentContainerStyle={
                athletesWithoutTeam.length === 0
                  ? styles.emptyListContent
                  : styles.listContent
              }
              renderItem={renderAthleteWithoutTeam}
              refreshControl={
                <RefreshControl
                  refreshing={athletesRefreshing}
                  onRefresh={handleAthletesRefresh}
                  tintColor={AppTheme.primary}
                />
              }
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  Todos os atletas estão vinculados a um time e categoria.
                </Text>
              }
            />
          )}
        </>
      ) : null}

      {/* FAB apenas na aba Times e para diretoria/admin */}
      {viewMode === 'times' && isDiretoriaOrAdmin && (
        <TouchableOpacity
          style={[styles.fab, { bottom: 88 + insets.bottom }]}
          onPress={openCreateModal}
          activeOpacity={0.9}
        >
          <Ionicons name="add" size={26} color="#FFF" />
        </TouchableOpacity>
      )}

      {/* Modal criação/edição de equipe */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!saving) {
            setModalVisible(false);
            setEditingEquipe(null);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editingEquipe ? 'Editar equipe' : 'Nova equipe'}
            </Text>

            <Text style={styles.fieldLabel}>Nome da equipe</Text>
            <TextInput
              style={styles.input}
              value={formNome}
              onChangeText={setFormNome}
              placeholder="Ex.: HandLuz Adulto"
            />

            <Text style={styles.fieldLabel}>Categoria (opcional)</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setCategoryPickerVisible(true)}
            >
              <Text
                style={[
                  styles.pickerText,
                  !formCategoriaId && styles.pickerPlaceholder,
                ]}
              >
                {formCategoriaId
                  ? categories.find(c => c.id === formCategoriaId)?.name ||
                    'Selecione uma categoria'
                  : 'Selecione uma categoria'}
              </Text>
              <Ionicons
                name="chevron-down-outline"
                size={20}
                color={AppTheme.textSecondary}
                style={{ position: 'absolute', right: 10 }}
              />
            </TouchableOpacity>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonOutline]}
                onPress={() => {
                  if (!saving) {
                    setModalVisible(false);
                    setEditingEquipe(null);
                  }
                }}
              >
                <Text style={styles.modalButtonOutlineText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleSaveEquipe}
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

      {/* Modal edição de função na diretoria */}
      <Modal
        visible={boardModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!savingBoardRole) {
            setBoardModalVisible(false);
            setEditingBoardMember(null);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Função na diretoria</Text>

            <Text style={styles.fieldLabel}>Membro</Text>
            <Text style={styles.infoValueModal}>
              {editingBoardMember?.full_name || '—'}
            </Text>
            <Text style={styles.infoValueModalEmail}>
              {editingBoardMember?.email || '—'}
            </Text>

            <Text style={styles.fieldLabel}>Função (ex.: técnico, presidente)</Text>
            <TextInput
              style={styles.input}
              value={boardRoleInput}
              onChangeText={setBoardRoleInput}
              placeholder="Descreva a função deste membro na diretoria"
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonOutline]}
                onPress={() => {
                  if (!savingBoardRole) {
                    setBoardModalVisible(false);
                    setEditingBoardMember(null);
                  }
                }}
              >
                <Text style={styles.modalButtonOutlineText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleSaveBoardRole}
                disabled={savingBoardRole}
              >
                {savingBoardRole ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.modalButtonPrimaryText}>Salvar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal edição completa de atleta sem time */}
      <Modal
        visible={athleteEditModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!savingAthlete) {
            setAthleteEditModalVisible(false);
            setEditingAthlete(null);
            setSelectedTeamId(null);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <ScrollView 
            contentContainerStyle={styles.modalCardScroll}
            showsVerticalScrollIndicator={true}
          >
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Editar atleta</Text>

              {/* Nome completo */}
              <Text style={styles.fieldLabel}>
                Nome completo <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.input,
                  fieldErrors.nome ? styles.inputError : null,
                ]}
                value={formNomeCompleto}
                onChangeText={text => {
                  setFormNomeCompleto(text);
                  if (fieldErrors.nome) {
                    setFieldErrors(prev => ({ ...prev, nome: undefined }));
                  }
                }}
                placeholder="Nome completo do atleta"
              />
              {fieldErrors.nome && (
                <Text style={styles.errorText}>{fieldErrors.nome}</Text>
              )}

              {/* Apelido */}
              <Text style={styles.fieldLabel}>Apelido (opcional)</Text>
              <TextInput
                style={styles.input}
                value={formApelido}
                onChangeText={setFormApelido}
                placeholder="Apelido usado no time"
              />

              {/* Telefone */}
              <Text style={styles.fieldLabel}>
                Telefone <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.input,
                  fieldErrors.telefone ? styles.inputError : null,
                ]}
                value={formTelefone}
                onChangeText={text => {
                  setFormTelefone(text);
                  if (fieldErrors.telefone) {
                    setFieldErrors(prev => ({
                      ...prev,
                      telefone: undefined,
                    }));
                  }
                }}
                placeholder="(00) 00000-0000"
                keyboardType="phone-pad"
              />
              {fieldErrors.telefone && (
                <Text style={styles.errorText}>{fieldErrors.telefone}</Text>
              )}

              {/* Data de nascimento */}
              <Text style={styles.fieldLabel}>
                Data de nascimento (opcional, dd/mm/aaaa)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  fieldErrors.birthdate ? styles.inputError : null,
                ]}
                value={birthDisplay}
                onChangeText={handleBirthChange}
                placeholder="__/__/____"
                keyboardType="number-pad"
              />
              {fieldErrors.birthdate && (
                <Text style={styles.errorText}>{fieldErrors.birthdate}</Text>
              )}

              {/* E-mail */}
              <Text style={styles.fieldLabel}>
                E-mail <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.input,
                  fieldErrors.email ? styles.inputError : null,
                ]}
                value={formEmail}
                onChangeText={text => {
                  setFormEmail(text);
                  if (fieldErrors.email) {
                    setFieldErrors(prev => ({
                      ...prev,
                      email: undefined,
                    }));
                  }
                }}
                placeholder="email@exemplo.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {fieldErrors.email && (
                <Text style={styles.errorText}>{fieldErrors.email}</Text>
              )}

              {/* Imagem do atleta */}
              <Text style={styles.fieldLabel}>
                Imagem do atleta <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View style={styles.imageRow}>
                <TouchableOpacity
                  style={[
                    styles.imageButton,
                    fieldErrors.imagem ? styles.inputError : null,
                  ]}
                  onPress={() => pickImage(setImagemAtleta)}
                  disabled={savingAthlete}
                >
                  <Ionicons
                    name="image-outline"
                    size={18}
                    color={AppTheme.primary}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.imageButtonText}>Escolher imagem</Text>
                </TouchableOpacity>

                {imagemAtleta ? (
                  <Image
                    source={{ uri: imagemAtleta.uri }}
                    style={styles.imagePreview}
                  />
                ) : editingAthlete?.image_url ? (
                  <Image
                    source={{ uri: editingAthlete.image_url }}
                    style={styles.imagePreview}
                  />
                ) : null}
              </View>
              {fieldErrors.imagem && (
                <Text style={styles.errorText}>{fieldErrors.imagem}</Text>
              )}

              {/* Documento frente */}
              <Text style={styles.fieldLabel}>
                Documento frente (opcional)
              </Text>
              <View style={styles.imageRow}>
                <TouchableOpacity
                  style={styles.imageButton}
                  onPress={() => pickImage(setDocFrente)}
                >
                  <Ionicons
                    name="document-text-outline"
                    size={18}
                    color={AppTheme.primary}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.imageButtonText}>
                    {docFrente ? 'Trocar documento' : 'Escolher documento'}
                  </Text>
                </TouchableOpacity>

                {docFrente && (
                  <TouchableOpacity
                    onPress={() => setDocFrente(null)}
                    style={{ marginLeft: 8 }}
                  >
                    <Ionicons
                      name="close-circle-outline"
                      size={24}
                      color="#D32F2F"
                    />
                  </TouchableOpacity>
                )}
              </View>

              {docFrente && (
                <Image
                  source={{ uri: docFrente.uri }}
                  style={styles.imagePreview}
                />
              )}

              {/* Documento verso */}
              <Text style={styles.fieldLabel}>
                Documento verso (opcional)
              </Text>
              <View style={styles.imageRow}>
                <TouchableOpacity
                  style={styles.imageButton}
                  onPress={() => pickImage(setDocVerso)}
                >
                  <Ionicons
                    name="document-text-outline"
                    size={18}
                    color={AppTheme.primary}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.imageButtonText}>
                    {docVerso ? 'Trocar documento' : 'Escolher documento'}
                  </Text>
                </TouchableOpacity>

                {docVerso && (
                  <TouchableOpacity
                    onPress={() => setDocVerso(null)}
                    style={{ marginLeft: 8 }}
                  >
                    <Ionicons
                      name="close-circle-outline"
                      size={24}
                      color="#D32F2F"
                    />
                  </TouchableOpacity>
                )}
              </View>

              {docVerso && (
                <Image
                  source={{ uri: docVerso.uri }}
                  style={styles.imagePreview}
                />
              )}

              {/* Anexo PDF */}
              <Text style={styles.fieldLabel}>
                Anexo PDF (opcional)
              </Text>
              <View style={styles.imageRow}>
                <TouchableOpacity
                  style={styles.imageButton}
                  onPress={() => pickPDF(setDocPDF)}
                >
                  <Ionicons
                    name="document-attach-outline"
                    size={18}
                    color={AppTheme.primary}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.imageButtonText}>
                    {docPDF ? 'Trocar PDF' : 'Escolher PDF'}
                  </Text>
                </TouchableOpacity>

                {docPDF && (
                  <TouchableOpacity
                    onPress={() => setDocPDF(null)}
                    style={{ marginLeft: 8 }}
                  >
                    <Ionicons
                      name="close-circle-outline"
                      size={24}
                      color="#D32F2F"
                    />
                  </TouchableOpacity>
                )}
              </View>

              {docPDF && (
                <View style={styles.pdfPreview}>
                  <Ionicons
                    name="document-text-outline"
                    size={24}
                    color={AppTheme.primary}
                  />
                  <Text style={styles.pdfPreviewText}>PDF selecionado</Text>
                </View>
              )}

              {/* Time */}
              <Text style={styles.fieldLabel}>Time (opcional)</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setTeamPickerVisible(true)}
              >
                <Text
                  style={[
                    styles.pickerText,
                    !selectedTeamId && styles.pickerPlaceholder,
                  ]}
                >
                  {selectedTeamId
                    ? equipes.find(t => t.id === selectedTeamId)?.name ||
                      'Selecione um time'
                    : 'Nenhum time (sem time)'}
                </Text>
                <Ionicons
                  name="chevron-down-outline"
                  size={20}
                  color={AppTheme.textSecondary}
                  style={{ position: 'absolute', right: 10 }}
                />
              </TouchableOpacity>

              {selectedTeamId && (
                <View style={{ marginTop: 8 }}>
                  {(() => {
                    const selectedTeam = equipes.find(t => t.id === selectedTeamId);
                    const category = selectedTeam?.category;
                    return category ? (
                      <Text style={styles.cardLineSmall}>
                        Categoria: {category.name}
                        {category.age_min !== null || category.age_max !== null
                          ? ` (${category.age_min || '—'} a ${category.age_max || '—'} anos)`
                          : ''}
                      </Text>
                    ) : null;
                  })()}
                </View>
              )}

              {/* Botões */}
              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonOutline]}
                  onPress={() => {
                    if (!savingAthlete) {
                      setAthleteEditModalVisible(false);
                      setEditingAthlete(null);
                      setSelectedTeamId(null);
                      setFormNomeCompleto('');
                      setFormApelido('');
                      setFormTelefone('');
                      setFormEmail('');
                      setBirthDigits('');
                      setBirthDisplay('');
                      setImagemAtleta(null);
                      setDocFrente(null);
                      setDocVerso(null);
                      setDocPDF(null);
                      setFieldErrors({});
                    }
                  }}
                >
                  <Text style={styles.modalButtonOutlineText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonPrimary]}
                  onPress={handleSaveAthleteTeam}
                  disabled={savingAthlete}
                >
                  {savingAthlete ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.modalButtonPrimaryText}>Salvar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal seletor de time para atleta */}
      <Modal
        visible={teamPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTeamPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModalCard}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Selecione o time</Text>
              <TouchableOpacity
                onPress={() => setTeamPickerVisible(false)}
                style={styles.pickerCloseButton}
              >
                <Ionicons name="close" size={24} color={AppTheme.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.pickerList}>
              <TouchableOpacity
                style={[
                  styles.pickerItem,
                  !selectedTeamId && styles.pickerItemSelected,
                ]}
                onPress={() => {
                  setSelectedTeamId(null);
                  setTeamPickerVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.pickerItemText,
                    !selectedTeamId && styles.pickerItemTextSelected,
                  ]}
                >
                  Nenhum time
                </Text>
              </TouchableOpacity>

              {equipes.map(team => (
                <TouchableOpacity
                  key={team.id}
                  style={[
                    styles.pickerItem,
                    selectedTeamId === team.id && styles.pickerItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedTeamId(team.id);
                    setTeamPickerVisible(false);
                  }}
                >
                  <View style={styles.pickerItemContent}>
                    <Text
                      style={[
                        styles.pickerItemText,
                        selectedTeamId === team.id &&
                          styles.pickerItemTextSelected,
                      ]}
                    >
                      {team.name}
                    </Text>
                    {team.category && (
                      <Text style={styles.pickerItemDetail}>
                        Categoria: {team.category.name}
                      </Text>
                    )}
                  </View>
                  {selectedTeamId === team.id && (
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={AppTheme.primary}
                    />
                  )}
                </TouchableOpacity>
              ))}

              {equipes.length === 0 && (
                <Text style={styles.pickerEmptyText}>
                  Nenhum time cadastrado
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal seletor de categoria */}
      <Modal
        visible={categoryPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCategoryPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModalCard}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Selecione a categoria</Text>
              <TouchableOpacity
                onPress={() => setCategoryPickerVisible(false)}
                style={styles.pickerCloseButton}
              >
                <Ionicons name="close" size={24} color={AppTheme.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.pickerList}>
              <TouchableOpacity
                style={[
                  styles.pickerItem,
                  !formCategoriaId && styles.pickerItemSelected,
                ]}
                onPress={() => {
                  setFormCategoriaId(null);
                  setCategoryPickerVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.pickerItemText,
                    !formCategoriaId && styles.pickerItemTextSelected,
                  ]}
                >
                  Nenhuma categoria
                </Text>
              </TouchableOpacity>

              {categories.map(category => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.pickerItem,
                    formCategoriaId === category.id && styles.pickerItemSelected,
                  ]}
                  onPress={() => {
                    setFormCategoriaId(category.id);
                    setCategoryPickerVisible(false);
                  }}
                >
                  <View style={styles.pickerItemContent}>
                    <Text
                      style={[
                        styles.pickerItemText,
                        formCategoriaId === category.id &&
                          styles.pickerItemTextSelected,
                      ]}
                    >
                      {category.name}
                    </Text>
                    {(category.age_min !== null ||
                      category.age_max !== null) && (
                      <View style={styles.pickerItemDetails}>
                        <Text style={styles.pickerItemDetail}>
                          Idade: {category.age_min !== null ? `${category.age_min}` : '—'} a{' '}
                          {category.age_max !== null ? `${category.age_max} anos` : '—'}
                        </Text>
                      </View>
                    )}
                  </View>
                  {formCategoriaId === category.id && (
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={AppTheme.primary}
                    />
                  )}
                </TouchableOpacity>
              ))}

              {categories.length === 0 && (
                <Text style={styles.pickerEmptyText}>
                  Nenhuma categoria cadastrada
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal de preview de PDF */}
      <Modal
        visible={!!pdfPreviewUrl}
        transparent
        animationType="fade"
        onRequestClose={() => setPdfPreviewUrl(null)}
      >
        <TouchableWithoutFeedback onPress={() => setPdfPreviewUrl(null)}>
          <View style={styles.previewOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.pdfPreviewCard}>
                <View style={styles.pdfPreviewHeader}>
                  <Text style={styles.docsTitle}>PDF do Atleta</Text>
                  <TouchableOpacity
                    style={styles.previewCloseButton}
                    onPress={() => setPdfPreviewUrl(null)}
                  >
                    <Ionicons name="close" size={24} color="#FFF" />
                  </TouchableOpacity>
                </View>

                {Platform.OS === 'web' && pdfPreviewUrl ? (
                  <iframe
                    src={pdfPreviewUrl}
                    style={{
                      width: '100%',
                      height: '600px',
                      border: 'none',
                      borderRadius: 8,
                    }}
                    title="PDF Viewer"
                  />
                ) : (
                  <View style={styles.pdfPreviewContent}>
                    <Ionicons
                      name="document-text-outline"
                      size={48}
                      color={AppTheme.primary}
                    />
                    <Text style={styles.pdfPreviewText}>
                      PDF disponível
                    </Text>
                    <TouchableOpacity
                      style={styles.pdfOpenButton}
                      onPress={async () => {
                        if (pdfPreviewUrl) {
                          const canOpen = await Linking.canOpenURL(pdfPreviewUrl);
                          if (canOpen) {
                            await Linking.openURL(pdfPreviewUrl);
                          } else {
                            Alert.alert('Erro', 'Não foi possível abrir o PDF.');
                          }
                        }
                      }}
                    >
                      <Ionicons
                        name="open-outline"
                        size={18}
                        color="#FFF"
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.pdfOpenButtonText}>Abrir PDF</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

// ============== ESTILOS ==============

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppTheme.background,
    position: 'relative',
    overflow: 'visible',
  },
  pageHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogo: {
    width: 90,
    height: 90,
  },

  // Segmento Times / Diretoria
  segmentContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    marginTop: 4,
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: AppTheme.border,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
  },
  segmentButtonActive: {
    backgroundColor: AppTheme.primary,
    borderColor: AppTheme.primary,
  },
  segmentButtonText: {
    fontSize: 13,
    color: AppTheme.textSecondary,
    fontWeight: '600',
  },
  segmentButtonTextActive: {
    color: '#FFFFFF',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  emptyListContent: {
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 80,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: AppTheme.textSecondary,
  },
  card: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AppTheme.textPrimary,
  },
  cardSubtitle: {
    fontSize: 13,
    color: AppTheme.textSecondary,
    marginTop: 2,
  },
  cardContent: {
    marginTop: 8,
  },
  cardBadge: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: '#E8F3EC',
    color: AppTheme.primary,
    overflow: 'hidden',
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  warningText: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '600',
    marginLeft: 4,
  },
  infoText: {
    fontSize: 13,
    color: AppTheme.textSecondary,
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  cardAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardActionText: {
    fontSize: 13,
    color: AppTheme.primary,
    fontWeight: '600',
  },
  cardAdminActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  cardLine: {
    fontSize: 13,
    color: AppTheme.textPrimary,
  },
  cardLineSmall: {
    fontSize: 12,
    color: AppTheme.textMuted,
  },

  editRoleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: AppTheme.border,
    backgroundColor: '#FFFFFF',
    marginLeft: 8,
  },
  editRoleButtonText: {
    fontSize: 12,
    color: AppTheme.primary,
    fontWeight: '600',
  },

  fab: {
    position: 'absolute',
    right: 18,
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
    elevation: 8,
    zIndex: 1000,
  },

  // Modal (equipes e funções)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: AppTheme.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: AppTheme.border,
  },
  modalCardScroll: {
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100%',
  },
  requiredStar: {
    color: '#D32F2F',
    fontWeight: '700',
  },
  inputError: {
    borderColor: '#D32F2F',
  },
  errorText: {
    fontSize: 11,
    color: '#D32F2F',
    marginTop: 2,
  },
  imageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
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
  },
  imageButtonText: {
    fontSize: 13,
    color: AppTheme.primary,
    fontWeight: '600',
  },
  imagePreview: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginLeft: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AppTheme.textPrimary,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 13,
    color: AppTheme.textSecondary,
    marginBottom: 4,
    marginTop: 8,
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

  infoValueModal: {
    fontSize: 14,
    color: AppTheme.textPrimary,
    fontWeight: '500',
    marginTop: 2,
  },
  infoValueModalEmail: {
    fontSize: 12,
    color: AppTheme.textMuted,
    marginBottom: 6,
  },

  // Categoria details
  categoryDetails: {
    marginTop: 8,
    marginBottom: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: AppTheme.border,
  },
  categoryAge: {
    fontSize: 12,
    color: AppTheme.textSecondary,
    marginBottom: 4,
  },

  // Picker
  pickerText: {
    fontSize: 14,
    color: AppTheme.textPrimary,
  },
  pickerPlaceholder: {
    color: AppTheme.textMuted,
  },
  pickerModalCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
    backgroundColor: AppTheme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppTheme.border,
    overflow: 'hidden',
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.border,
  },
  pickerModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AppTheme.textPrimary,
  },
  pickerCloseButton: {
    padding: 4,
  },
  pickerList: {
    maxHeight: 400,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.border,
  },
  pickerItemSelected: {
    backgroundColor: '#E8F3EC',
  },
  pickerItemContent: {
    flex: 1,
  },
  pickerItemText: {
    fontSize: 15,
    color: AppTheme.textPrimary,
    fontWeight: '500',
  },
  pickerItemTextSelected: {
    color: AppTheme.primary,
    fontWeight: '600',
  },
  pickerItemDetails: {
    marginTop: 4,
  },
  pickerItemDetail: {
    fontSize: 12,
    color: AppTheme.textSecondary,
    marginTop: 2,
  },
  pickerEmptyText: {
    padding: 16,
    textAlign: 'center',
    color: AppTheme.textSecondary,
    fontSize: 14,
  },
  pdfPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AppTheme.border,
  },
  pdfPreviewText: {
    marginLeft: 8,
    fontSize: 13,
    color: AppTheme.textPrimary,
    fontWeight: '500',
  },
  pdfPreviewCard: {
    width: '100%',
    maxWidth: 900,
    maxHeight: '90%',
    borderRadius: 16,
    padding: 16,
    backgroundColor: AppTheme.surface,
    position: 'relative',
  },
  pdfPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.border,
  },
  pdfPreviewContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  pdfOpenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppTheme.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 16,
  },
  pdfOpenButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  previewCloseButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  docsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AppTheme.textPrimary,
    marginBottom: 16,
  },
  viewDocsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#E8F3EC',
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  viewDocsText: {
    fontSize: 12,
    color: AppTheme.primary,
    fontWeight: '600',
  },
});
