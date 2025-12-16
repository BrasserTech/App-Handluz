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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AppTheme } from '../../constants/theme';
import { supabase } from '../services/supabaseClient';
import { usePermissions } from '../../hooks/usePermissions';
import type { EquipesStackParamList } from '../navigation/EquipesStackNavigator';

// logo (arquivo em /assets/images/logo_handluz.png)
const handluzLogo = require('../../assets/images/logo_handluz.png');

type EquipesNav = NativeStackNavigationProp<EquipesStackParamList>;

type Equipe = {
  id: string;
  name: string;
  category: string | null;
};

type RoleValue = 'usuario' | 'diretoria' | 'admin';

type BoardMember = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: RoleValue | null;
  board_role: string | null;
};

type ViewMode = 'times' | 'diretoria';

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

  // Modal criação/edição de equipe
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editingEquipe, setEditingEquipe] = useState<Equipe | null>(null);
  const [formNome, setFormNome] = useState<string>('');
  const [formCategoria, setFormCategoria] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  // Modal edição de função na diretoria
  const [boardModalVisible, setBoardModalVisible] = useState<boolean>(false);
  const [editingBoardMember, setEditingBoardMember] = useState<BoardMember | null>(null);
  const [boardRoleInput, setBoardRoleInput] = useState<string>('');
  const [savingBoardRole, setSavingBoardRole] = useState<boolean>(false);

  // aba selecionada (Times / Diretoria)
  const [viewMode, setViewMode] = useState<ViewMode>('times');

  // ===================== CARREGAR EQUIPES =====================

  const loadEquipes = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, category')
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

  useEffect(() => {
    if (viewMode === 'diretoria') {
      loadBoardMembers();
    }
  }, [viewMode, loadBoardMembers]);

  async function handleBoardRefresh() {
    setBoardRefreshing(true);
    await loadBoardMembers();
    setBoardRefreshing(false);
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
    setFormCategoria('');
    setModalVisible(true);
  }

  function openEditModal(equipe: Equipe) {
    setEditingEquipe(equipe);
    setFormNome(equipe.name);
    setFormCategoria(equipe.category ?? '');
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
            category: formCategoria.trim() || null,
          })
          .eq('id', editingEquipe.id);

        if (error) {
          console.error('[EquipesListScreen] Erro ao atualizar equipe:', error.message);
          Alert.alert('Erro', 'Não foi possível atualizar a equipe.');
          return;
        }
      } else {
        // Criação
        const { error } = await supabase.from('teams').insert({
          name: formNome.trim(),
          category: formCategoria.trim() || null,
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
      setFormCategoria('');

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

  // ===================== RENDER TIMES =====================

  function renderEquipe({ item }: { item: Equipe }) {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          {item.category ? (
            <Text style={styles.cardBadge}>{item.category}</Text>
          ) : null}
        </View>

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
      ) : (
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
      )}

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
            <TextInput
              style={styles.input}
              value={formCategoria}
              onChangeText={setFormCategoria}
              placeholder="Ex.: Sub-18, Adulto"
            />

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
  cardBadge: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: '#E8F3EC',
    color: AppTheme.primary,
    overflow: 'hidden',
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
});
