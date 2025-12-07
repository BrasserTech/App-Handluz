// app/screens/EquipeAtletasScreen.tsx
// Listagem e cadastro/edição de atletas de uma equipe específica.
// Diretoria/Admin: pode criar, editar e excluir atletas, enviar foto e documentos.
// Usuário comum: apenas visualiza.

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  Image,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppTheme } from '../../constants/theme';
import type { EquipesStackParamList } from '../navigation/EquipesStackNavigator';
import { supabase } from '../services/supabaseClient';
import { usePermissions } from '../../hooks/usePermissions';

type Props = NativeStackScreenProps<EquipesStackParamList, 'EquipeAtletas'>;

type Athlete = {
  id: string;
  full_name: string;
  nickname: string | null;
  birthdate: string | null;
  phone: string | null;
  email: string | null;
  image_url?: string | null;
  document_front_url?: string | null;
  document_back_url?: string | null;
};

type PickedImage = { uri: string };

type FieldErrors = {
  nome?: string;
  telefone?: string;
  imagem?: string;
  birthdate?: string;
};

export default function EquipeAtletasScreen({ route }: Props) {
  const { equipeId, equipeNome } = route.params;
  const { isDiretoriaOrAdmin } = usePermissions();

  const [atletas, setAtletas] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modal de atleta (novo/edição)
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingAthlete, setEditingAthlete] = useState<Athlete | null>(null);

  const [formNomeCompleto, setFormNomeCompleto] = useState('');
  const [formApelido, setFormApelido] = useState('');
  const [formTelefone, setFormTelefone] = useState('');
  const [formEmail, setFormEmail] = useState('');

  const [birthDigits, setBirthDigits] = useState('');   // apenas números
  const [birthDisplay, setBirthDisplay] = useState(''); // dd/mm/aaaa

  const [imagemAtleta, setImagemAtleta] = useState<PickedImage | null>(null);
  const [docFrente, setDocFrente] = useState<PickedImage | null>(null);
  const [docVerso, setDocVerso] = useState<PickedImage | null>(null);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // Preview da foto do atleta
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  // Preview documentos (frente e verso)
  const [docPreview, setDocPreview] = useState<{
    front?: string | null;
    back?: string | null;
  } | null>(null);


  // ========================= UTILITÁRIOS =========================

  function calcularIdade(dateString: string | null): number | null {
    if (!dateString) return null;
    const nascimento = new Date(dateString);
    if (Number.isNaN(nascimento.getTime())) return null;

    const hoje = new Date();
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const m = hoje.getMonth() - nascimento.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) {
      idade--;
    }
    return idade;
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

  async function pickImage(setImage: (img: PickedImage | null) => void) {
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

  async function uploadImageToStorage(
    picked: PickedImage,
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
        console.error('[EquipeAtletasScreen] Erro upload storage:', error.message);
        return null;
      }

      const { data: publicData } = supabase.storage
        .from('athletes')
        .getPublicUrl(data.path);

      return publicData.publicUrl ?? null;
    } catch (err) {
      console.error('[EquipeAtletasScreen] Erro inesperado upload:', err);
      return null;
    }
  }

  // Upload de imagem para athlete_images (usando o método que já funciona)
  async function uploadImageToAthleteImages(
    picked: PickedImage,
    athleteId: string
  ): Promise<string | null> {
    try {
      // Validar tipo de arquivo
      const fileExtension = picked.uri.split('.').pop()?.toLowerCase() || '';
      const mimeType = `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`;
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

      if (!allowedTypes.includes(mimeType)) {
        Alert.alert(
          'Tipo de arquivo inválido',
          'Por favor, selecione apenas imagens (JPG, PNG ou WEBP).'
        );
        return null;
      }

      // Obter informações do arquivo
      const response = await fetch(picked.uri);
      const blob = await response.blob();

      // Validar tamanho (5MB)
      const MAX_SIZE = 5 * 1024 * 1024;
      if (blob.size > MAX_SIZE) {
        Alert.alert(
          'Arquivo muito grande',
          `O arquivo selecionado tem ${(blob.size / 1024 / 1024).toFixed(2)}MB. O tamanho máximo permitido é 5MB.`
        );
        return null;
      }

      // Usar o método uploadImageToStorage que já funciona
      // Passar apenas o ID do atleta, sem o prefixo "athletes/" para evitar duplicação
      const publicUrl = await uploadImageToStorage(
        picked,
        `${athleteId}-photo`
      );

      if (!publicUrl) {
        // Se o upload falhou, retornar null para que a imagem seja salva ao clicar em "Salvar"
        console.warn('[EquipeAtletasScreen] Upload falhou, imagem será salva ao clicar em Salvar');
        return null;
      }

      // Extrair informações do arquivo para salvar na tabela athlete_images
      const fileName = `athlete-${athleteId}-${Date.now()}.${fileExtension}`;
      // Extrair o file_path da URL pública
      const urlObj = new URL(publicUrl);
      const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/athletes\/(.+)/);
      const filePath = pathMatch ? pathMatch[1] : `${athleteId}-photo-${Date.now()}.${fileExtension}`;

      // Salvar informações no banco de dados (tabela athlete_images)
      const { error: dbError } = await supabase.from('athlete_images').insert({
        file_path: filePath,
        file_url: publicUrl,
        file_name: fileName,
        file_size: blob.size,
        file_type: mimeType,
        bucket_name: 'athletes',
        athlete_id: athleteId,
        uploaded_at: new Date().toISOString(),
      });

      if (dbError) {
        console.error('[EquipeAtletasScreen] Erro ao salvar no banco:', dbError);
        // Não mostramos alerta aqui, apenas log, pois a imagem já foi salva no storage
        // Retornamos a URL mesmo assim
        return publicUrl;
      }

      return publicUrl;
    } catch (error) {
      console.error('[EquipeAtletasScreen] Erro inesperado no upload:', error);
      // Não mostramos alerta, apenas retornamos null para que seja salva ao clicar em "Salvar"
      return null;
    }
  }

  // Função para escolher e fazer upload direto (para edição de atleta)
  async function handlePickAndUploadImage() {
    if (!editingAthlete) {
      // Se não estiver editando, usa o comportamento antigo
      pickImage(setImagemAtleta);
      return;
    }

    const allowed = await ensureMediaPermission();
    if (!allowed) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.9,
      aspect: [1, 1],
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    const asset = result.assets[0];
    const pickedImage: PickedImage = { uri: asset.uri };

    // Atualizar o preview IMEDIATAMENTE (antes do upload)
    setImagemAtleta(pickedImage);
    // Limpar erro de validação se houver
    if (fieldErrors.imagem) {
      setFieldErrors(prev => ({ ...prev, imagem: undefined }));
    }

    // Mostrar loading
    setSaving(true);

    try {
      // Fazer upload
      console.log('[EquipeAtletasScreen] Iniciando upload da imagem...');
      const imageUrl = await uploadImageToAthleteImages(
        pickedImage,
        editingAthlete.id
      );

      console.log('[EquipeAtletasScreen] Upload concluído, imageUrl:', imageUrl);

      if (imageUrl) {
        // Atualizar o atleta com a nova URL da imagem
        const { error: updateError } = await supabase
          .from('athletes')
          .update({ image_url: imageUrl })
          .eq('id', editingAthlete.id);

        if (updateError) {
          console.error(
            '[EquipeAtletasScreen] Erro ao atualizar image_url:',
            updateError.message
          );
          Alert.alert('Erro', 'A imagem foi enviada, mas não foi possível atualizar o atleta.');
        } else {
          console.log('[EquipeAtletasScreen] image_url atualizado com sucesso');
          // Atualizar o estado do atleta em edição
          setEditingAthlete({
            ...editingAthlete,
            image_url: imageUrl,
          });
          Alert.alert('Sucesso!', 'Imagem do atleta enviada com sucesso.');
        }
      } else {
        console.warn('[EquipeAtletasScreen] Upload retornou null, mas a imagem local será salva ao clicar em Salvar');
        // Se o upload falhou (provavelmente por RLS), a imagem local será salva quando o usuário clicar em "Salvar"
        // Não mostramos alerta para não incomodar o usuário, pois a imagem já está no preview
      }
    } catch (error) {
      console.error('[EquipeAtletasScreen] Erro inesperado:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao fazer o upload da imagem. A imagem local será salva ao clicar em "Salvar".');
    } finally {
      setSaving(false);
    }
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

  // ========================= CARREGAMENTO =========================

  const carregarAtletas = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('athletes')
        .select(
          'id, full_name, nickname, birthdate, phone, email, image_url, document_front_url, document_back_url'
        )
        .eq('team_id', equipeId)
        .order('full_name', { ascending: true });

      if (error) {
        console.error('[EquipeAtletasScreen] Erro carregar atletas:', error.message);
        Alert.alert('Erro', 'Não foi possível carregar os atletas da equipe.');
        return;
      }

      setAtletas((data ?? []) as Athlete[]);
    } catch (err) {
      console.error('[EquipeAtletasScreen] Erro inesperado carregar atletas:', err);
      Alert.alert('Erro', 'Ocorreu um erro inesperado ao carregar os atletas.');
    } finally {
      setLoading(false);
    }
  }, [equipeId]);

  useEffect(() => {
    carregarAtletas();
  }, [carregarAtletas]);

  async function handleRefresh() {
    setRefreshing(true);
    await carregarAtletas();
    setRefreshing(false);
  }

  // ========================= MODAL: NOVO / EDITAR =========================

  function abrirModalNovoAtleta() {
    setEditingAthlete(null);
    setFormNomeCompleto('');
    setFormApelido('');
    setFormTelefone('');
    setFormEmail('');
    setBirthDigits('');
    setBirthDisplay('');
    setImagemAtleta(null);
    setDocFrente(null);
    setDocVerso(null);
    setFieldErrors({});
    setModalVisible(true);
  }

  function abrirModalEditarAtleta(atleta: Athlete) {
    setEditingAthlete(atleta);
    setFormNomeCompleto(atleta.full_name);
    setFormApelido(atleta.nickname ?? '');
    setFormTelefone(atleta.phone ?? '');
    setFormEmail(atleta.email ?? '');

    if (atleta.birthdate) {
      const [y, m, d] = atleta.birthdate.split('-');
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
    setFieldErrors({});
    setModalVisible(true);
  }

  function validarCampos(): boolean {
    const errors: FieldErrors = {};

    if (!formNomeCompleto.trim()) {
      errors.nome = 'Informe o nome completo do atleta.';
    }
    if (!formTelefone.trim()) {
      errors.telefone = 'Informe um telefone de contato.';
    }

    // imagem é obrigatória apenas se não houver imagem anterior
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

  async function handleSalvarAtleta() {
    if (!validarCampos()) return;

    setSaving(true);

    try {
      const basePayload: any = {
        full_name: formNomeCompleto.trim(),
        nickname: formApelido.trim() || null,
        phone: formTelefone.trim(),
        email: formEmail.trim() || null,
        is_active: true,
      };

      const birthdateDb = getBirthdateForPayload();
      basePayload.birthdate = birthdateDb;

      // ---------- CRIAÇÃO ----------
      if (!editingAthlete) {
        const payloadInsert: any = {
          ...basePayload,
          team_id: equipeId,
        };

        const { data: created, error: createError } = await supabase
          .from('athletes')
          .insert(payloadInsert)
          .select('id')
          .single();

        if (createError || !created) {
          console.error(
            '[EquipeAtletasScreen] Erro criar atleta:',
            createError?.message
          );
          Alert.alert('Erro', 'Não foi possível salvar o atleta.');
          setSaving(false);
          return;
        }

        const athleteId = created.id as string;

        const [imageUrl, docFrontUrl, docBackUrl] = await Promise.all([
          imagemAtleta
            ? uploadImageToStorage(imagemAtleta, `athletes/${athleteId}-photo`)
            : Promise.resolve(null),
          docFrente
            ? uploadImageToStorage(
                docFrente,
                `athletes/${athleteId}-doc-front`
              )
            : Promise.resolve(null),
          docVerso
            ? uploadImageToStorage(docVerso, `athletes/${athleteId}-doc-back`)
            : Promise.resolve(null),
        ]);

        if (imageUrl || docFrontUrl || docBackUrl) {
          const updatePayload: any = {};
          if (imageUrl) updatePayload.image_url = imageUrl;
          if (docFrontUrl) updatePayload.document_front_url = docFrontUrl;
          if (docBackUrl) updatePayload.document_back_url = docBackUrl;

          const { error: updateError } = await supabase
            .from('athletes')
            .update(updatePayload)
            .eq('id', athleteId);

          if (updateError) {
            console.error(
              '[EquipeAtletasScreen] Erro atualizar URLs (criação):',
              updateError.message
            );
          }
        }
      }

      // ---------- EDIÇÃO ----------
      if (editingAthlete) {
        const athleteId = editingAthlete.id;

        const [imageUrl, docFrontUrl, docBackUrl] = await Promise.all([
          imagemAtleta
            ? uploadImageToStorage(imagemAtleta, `athletes/${athleteId}-photo`)
            : Promise.resolve(null),
          docFrente
            ? uploadImageToStorage(
                docFrente,
                `athletes/${athleteId}-doc-front`
              )
            : Promise.resolve(null),
          docVerso
            ? uploadImageToStorage(docVerso, `athletes/${athleteId}-doc-back`)
            : Promise.resolve(null),
        ]);

        const updatePayload: any = { ...basePayload };

        // Se houver nova imagem local, usar ela. Caso contrário, usar a image_url do atleta (que pode ter sido atualizada via upload)
        if (imageUrl) {
          updatePayload.image_url = imageUrl;
        } else if (editingAthlete.image_url) {
          // Se não há nova imagem local, mas há image_url no atleta (pode ter sido atualizada via upload), manter ela
          updatePayload.image_url = editingAthlete.image_url;
        }
        
        if (docFrontUrl) updatePayload.document_front_url = docFrontUrl;
        if (docBackUrl) updatePayload.document_back_url = docBackUrl;

        const { error: updateError } = await supabase
          .from('athletes')
          .update(updatePayload)
          .eq('id', athleteId);

        if (updateError) {
          console.error(
            '[EquipeAtletasScreen] Erro atualizar atleta (edição):',
            updateError.message
          );
          Alert.alert('Erro', 'Não foi possível atualizar o atleta.');
          setSaving(false);
          return;
        }
      }

      setModalVisible(false);
      setEditingAthlete(null);
      await carregarAtletas();
    } catch (err) {
      console.error('[EquipeAtletasScreen] Erro inesperado salvar atleta:', err);
      Alert.alert('Erro', 'Ocorreu um erro inesperado ao salvar o atleta.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAthlete(atleta: Athlete) {
    Alert.alert(
      'Remover atleta',
      `Deseja realmente excluir o atleta "${atleta.full_name}" desta equipe?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('athletes')
                .delete()
                .eq('id', atleta.id);

              if (error) {
                console.error(
                  '[EquipeAtletasScreen] Erro excluir atleta:',
                  error.message
                );
                Alert.alert('Erro', 'Não foi possível excluir o atleta.');
                return;
              }

              await carregarAtletas();
            } catch (err) {
              console.error(
                '[EquipeAtletasScreen] Erro inesperado excluir atleta:',
                err
              );
              Alert.alert(
                'Erro',
                'Ocorreu um erro inesperado ao excluir o atleta.'
              );
            }
          },
        },
      ]
    );
  }

  // ========================= RENDERIZAÇÃO =========================

  function renderItem({ item }: { item: Athlete }) {
    const idade = calcularIdade(item.birthdate);
    const temDocumento =
      !!item.document_front_url || !!item.document_back_url;

    return (
      <View style={styles.card}>
        {/* Topo: avatar + nome + idade */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <TouchableOpacity
              activeOpacity={item.image_url ? 0.8 : 1}
              onPress={() => {
                if (item.image_url) setImagePreviewUrl(item.image_url);
              }}
            >
              {item.image_url ? (
                <Image source={{ uri: item.image_url }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color={AppTheme.textMuted}
                  />
                </View>
              )}
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.full_name}</Text>
              {item.nickname ? (
                <Text style={styles.cardLineMuted}>Apelido: {item.nickname}</Text>
              ) : null}
            </View>
          </View>

          {idade !== null && (
            <Text style={styles.cardBadge}>{idade} anos</Text>
          )}
        </View>

        {/* Corpo: contato */}
        <Text style={styles.cardLine}>Telefone: {item.phone ?? '-'}</Text>
        {item.email ? (
          <Text style={styles.cardLine}>E-mail: {item.email}</Text>
        ) : null}

        {/* Rodapé: documentos + ações da diretoria */}
        <View style={styles.cardBottomRow}>
          <View style={styles.cardLinksRow}>
            {temDocumento && (
              <View style={styles.docTag}>
                <Ionicons
                  name="document-text-outline"
                  size={14}
                  color={AppTheme.primary}
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.docTagText}>Documento cadastrado</Text>
              </View>
            )}

            {isDiretoriaOrAdmin && temDocumento && (
              <TouchableOpacity
                style={styles.viewDocsButton}
                onPress={() =>
                  setDocPreview({
                    front: item.document_front_url ?? undefined,
                    back: item.document_back_url ?? undefined,
                  })
                }
              >
                <Ionicons
                  name="eye-outline"
                  size={14}
                  color={AppTheme.primary}
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.viewDocsText}>Ver documentos</Text>
              </TouchableOpacity>
            )}
          </View>

          {isDiretoriaOrAdmin && (
            <View style={styles.cardAdminActions}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => abrirModalEditarAtleta(item)}
              >
                <Ionicons
                  name="create-outline"
                  size={18}
                  color={AppTheme.textSecondary}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => handleDeleteAthlete(item)}
              >
                <Ionicons name="trash-outline" size={18} color="#C62828" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>{equipeNome}</Text>
        <Text style={styles.pageSubtitle}>
          Veja os atletas vinculados a esta equipe. Se você faz parte da diretoria,
          pode cadastrar novos atletas, anexar foto e documento (frente e costas).
        </Text>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={AppTheme.primary} />
        </View>
      ) : (
        <FlatList
          data={atletas}
          keyExtractor={item => item.id}
          contentContainerStyle={
            atletas.length === 0 ? styles.emptyListContent : styles.listContent
          }
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={AppTheme.primary}
            />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              Nenhum atleta cadastrado para esta equipe até o momento.
            </Text>
          }
        />
      )}

      {isDiretoriaOrAdmin && (
        <TouchableOpacity
          style={styles.fab}
          onPress={abrirModalNovoAtleta}
          activeOpacity={0.9}
        >
          <Ionicons name="add" size={26} color="#FFF" />
        </TouchableOpacity>
      )}

      {/* Modal de novo/editar atleta */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!saving) {
            setModalVisible(false);
            setEditingAthlete(null);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editingAthlete ? 'Editar atleta' : 'Novo atleta'}
            </Text>

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
            <Text style={styles.fieldLabel}>E-mail (opcional)</Text>
            <TextInput
              style={styles.input}
              value={formEmail}
              onChangeText={setFormEmail}
              placeholder="email@exemplo.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />

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
                onPress={handlePickAndUploadImage}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={AppTheme.primary} />
                ) : (
                  <>
                    <Ionicons
                      name="image-outline"
                      size={18}
                      color={AppTheme.primary}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.imageButtonText}>Escolher imagem</Text>
                  </>
                )}
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
                style={[styles.imageButton, styles.imageButtonDisabled]}
                onPress={() => {}}
                disabled={true}
              >
                <Ionicons
                  name="document-text-outline"
                  size={18}
                  color={AppTheme.textMuted}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.imageButtonText, styles.imageButtonTextDisabled]}>
                  Em desenvolvimento
                </Text>
              </TouchableOpacity>

              {docFrente && (
                <Image
                  source={{ uri: docFrente.uri }}
                  style={styles.imagePreview}
                />
              )}
            </View>

            {/* Documento verso */}
            <Text style={styles.fieldLabel}>
              Documento verso (opcional)
            </Text>
            <View style={styles.imageRow}>
              <TouchableOpacity
                style={[styles.imageButton, styles.imageButtonDisabled]}
                onPress={() => {}}
                disabled={true}
              >
                <Ionicons
                  name="document-text-outline"
                  size={18}
                  color={AppTheme.textMuted}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.imageButtonText, styles.imageButtonTextDisabled]}>
                  Em desenvolvimento
                </Text>
              </TouchableOpacity>

              {docVerso && (
                <Image
                  source={{ uri: docVerso.uri }}
                  style={styles.imagePreview}
                />
              )}
            </View>

            {/* Botões */}
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonOutline]}
                onPress={() => {
                  if (!saving) {
                    setModalVisible(false);
                    setEditingAthlete(null);
                  }
                }}
              >
                <Text style={styles.modalButtonOutlineText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleSalvarAtleta}
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

      {/* Modal de preview da foto (clique na foto do card) */}
      <Modal
        visible={!!imagePreviewUrl}
        transparent
        animationType="fade"
        onRequestClose={() => setImagePreviewUrl(null)}
      >
        <TouchableWithoutFeedback onPress={() => setImagePreviewUrl(null)}>
          <View style={styles.previewOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.previewCard}>
                <TouchableOpacity
                  style={styles.previewCloseButton}
                  onPress={() => setImagePreviewUrl(null)}
                >
                  <Ionicons name="close" size={22} color="#FFF" />
                </TouchableOpacity>

                {imagePreviewUrl && (
                  <Image
                    source={{ uri: imagePreviewUrl }}
                    style={styles.previewImage}
                    resizeMode="contain"
                  />
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal de preview de documentos */}
      <Modal
        visible={!!docPreview}
        transparent
        animationType="fade"
        onRequestClose={() => setDocPreview(null)}
      >
        <TouchableWithoutFeedback onPress={() => setDocPreview(null)}>
          <View style={styles.previewOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.docsPreviewCard}>
                <TouchableOpacity
                  style={styles.previewCloseButton}
                  onPress={() => setDocPreview(null)}
                >
                  <Ionicons name="close" size={22} color="#FFF" />
                </TouchableOpacity>

                <Text style={styles.docsTitle}>Documentos do atleta</Text>

                <View style={styles.docsImagesRow}>
                  {docPreview?.front && (
                    <Image
                      source={{ uri: docPreview.front }}
                      style={styles.docsImage}
                      resizeMode="contain"
                    />
                  )}
                  {docPreview?.back && (
                    <Image
                      source={{ uri: docPreview.back }}
                      style={styles.docsImage}
                      resizeMode="contain"
                    />
                  )}
                  {!docPreview?.front && !docPreview?.back && (
                    <Text style={styles.emptyDocsText}>
                      Nenhum documento disponível.
                    </Text>
                  )}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

    </View>
  );
}

// ======================= ESTILOS =======================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppTheme.background,
  },
  pageHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: AppTheme.textPrimary,
  },
  pageSubtitle: {
    fontSize: 13,
    color: AppTheme.textSecondary,
    marginTop: 4,
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
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AppTheme.textPrimary,
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
  cardLine: {
    fontSize: 13,
    color: AppTheme.textPrimary,
  },
  cardLineMuted: {
    fontSize: 12,
    color: AppTheme.textMuted,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  cardLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  docTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#E8F3EC',
    marginRight: 8,
  },
  docTagText: {
    fontSize: 12,
    color: AppTheme.primary,
    fontWeight: '600',
  },
  viewDocsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: AppTheme.border,
    backgroundColor: '#FFFFFF',
  },
  viewDocsText: {
    fontSize: 12,
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
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#E3E8EE',
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: 12,
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
  imageButtonDisabled: {
    opacity: 0.6,
    backgroundColor: '#F5F5F5',
    borderColor: AppTheme.border,
  },
  imageButtonTextDisabled: {
    color: AppTheme.textMuted,
  },
  imagePreview: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginLeft: 10,
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

  // Preview imagem/documentos
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  previewCard: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  docsPreviewCard: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 16,
    padding: 16,
    backgroundColor: AppTheme.surface,
  },
  previewCloseButton: {
    position: 'absolute',
    right: 12,
    top: 10,
    zIndex: 10,
    padding: 6,
  },
  previewImage: {
    width: '100%',
    height: 380,
    borderRadius: 16,
  },
  docsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: AppTheme.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  docsImagesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  docsImage: {
    width: 160,
    height: 220,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: AppTheme.border,
  },
  emptyDocsText: {
    fontSize: 13,
    color: AppTheme.textSecondary,
    textAlign: 'center',
  },
});
