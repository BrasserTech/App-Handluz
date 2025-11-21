// app/screens/EquipesListScreen.tsx
// Listagem de equipes (tabela public.teams).
// Diretoria/Admin: pode criar, editar e excluir.
// Usuário comum: apenas visualiza e acessa atletas da equipe.

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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AppTheme } from '../../constants/theme';
import { supabase } from '../services/supabaseClient';
import { usePermissions } from '../../hooks/usePermissions';
import type { EquipesStackParamList } from '../navigation/EquipesStackNavigator';

type EquipesNav = NativeStackNavigationProp<EquipesStackParamList>;

type Equipe = {
  id: string;
  name: string;
  category: string | null;
};

export default function EquipesListScreen() {
  const { isDiretoriaOrAdmin } = usePermissions();
  const navigation = useNavigation<EquipesNav>();

  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editingEquipe, setEditingEquipe] = useState<Equipe | null>(null);
  const [formNome, setFormNome] = useState<string>('');
  const [formCategoria, setFormCategoria] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  // ===================== CARREGAR EQUIPES =====================

  const loadEquipes = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('teams')               // <<< tabela correta
        .select('id, name, category') // <<< campos esperados
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

  // ===================== CRUD (DIRETORIA/ADMIN) =====================

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

  // ===================== NAVEGAÇÃO PARA ATLETAS =====================

  function handleOpenAtletas(equipe: Equipe) {
    navigation.navigate('EquipeAtletas', {
      equipeId: equipe.id,
      equipeNome: equipe.name,
    });
  }

  // ===================== RENDER =====================

  function renderItem({ item }: { item: Equipe }) {
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

  return (
    <View style={styles.container}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Equipes</Text>
        <Text style={styles.pageSubtitle}>
          Visualize as equipes do HandLuz e, se for diretoria, gerencie cadastro,
          edição e exclusão.
        </Text>
      </View>

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
              Nenhuma equipe cadastrada até o momento.
            </Text>
          }
        />
      )}

      {isDiretoriaOrAdmin && (
        <TouchableOpacity
          style={styles.fab}
          onPress={openCreateModal}
          activeOpacity={0.9}
        >
          <Ionicons name="add" size={26} color="#FFF" />
        </TouchableOpacity>
      )}

      {/* Modal criação/edição */}
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
    </View>
  );
}

// ============== ESTILOS ==============

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
});
