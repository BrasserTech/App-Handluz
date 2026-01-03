// app/screens/EquipesListScreen.tsx
// Gestão de Equipes e Membros da Diretoria.
// Inclui busca de usuários para promover à diretoria.

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
  Platform,
  TouchableWithoutFeedback
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

// logo
const handluzLogo = require('../../assets/images/logo_handluz.png');

type EquipesNav = NativeStackNavigationProp<EquipesStackParamList>;

// ===================== TIPAGEM =====================

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

// Tipo para resultados da busca de usuários
type UserSearchResult = {
  id: string;
  full_name: string | null;
  email: string | null;
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

// ===================== COMPONENTE PRINCIPAL =====================

export default function EquipesListScreen() {
  const { isDiretoriaOrAdmin } = usePermissions();
  const navigation = useNavigation<EquipesNav>();
  const insets = useSafeAreaInsets();

  // --- ESTADOS DE NAVEGAÇÃO E DADOS ---
  const [viewMode, setViewMode] = useState<ViewMode>('times');

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
  const [categoryPickerVisible, setCategoryPickerVisible] = useState<boolean>(false);

  // --- MODAIS ---

  // 1. Modal Equipe (Criar/Editar)
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editingEquipe, setEditingEquipe] = useState<Equipe | null>(null);
  const [formNome, setFormNome] = useState<string>('');
  const [formCategoriaId, setFormCategoriaId] = useState<number | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // 2. Modal Editar Função Diretoria (Para quem já é membro)
  const [boardModalVisible, setBoardModalVisible] = useState<boolean>(false);
  const [editingBoardMember, setEditingBoardMember] = useState<BoardMember | null>(null);
  const [boardRoleInput, setBoardRoleInput] = useState<string>('');
  const [savingBoardRole, setSavingBoardRole] = useState<boolean>(false);

  // 3. Modal ADICIONAR NOVO MEMBRO (Busca de usuário)
  const [addMemberModalVisible, setAddMemberModalVisible] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<UserSearchResult[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [selectedUserToAdd, setSelectedUserToAdd] = useState<UserSearchResult | null>(null);
  const [newMemberRole, setNewMemberRole] = useState<RoleValue>('diretoria');
  const [newMemberFunction, setNewMemberFunction] = useState('');
  const [savingNewMember, setSavingNewMember] = useState(false);

  // 4. Modal Editar Atleta (Sem time)
  const [athleteEditModalVisible, setAthleteEditModalVisible] = useState<boolean>(false);
  const [editingAthlete, setEditingAthlete] = useState<AthleteWithoutTeam | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [teamPickerVisible, setTeamPickerVisible] = useState<boolean>(false);
  const [savingAthlete, setSavingAthlete] = useState<boolean>(false);
  
  // Campos do atleta (simplificado para o contexto deste arquivo)
  const [formNomeCompleto, setFormNomeCompleto] = useState('');
  const [formApelido, setFormApelido] = useState('');
  const [formTelefone, setFormTelefone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [birthDigits, setBirthDigits] = useState('');
  const [birthDisplay, setBirthDisplay] = useState('');
  const [imagemAtleta, setImagemAtleta] = useState<{ uri: string } | null>(null);
  const [docFrente, setDocFrente] = useState<{ uri: string } | null>(null);
  const [docVerso, setDocVerso] = useState<{ uri: string } | null>(null);
  const [docPDF, setDocPDF] = useState<{ uri: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<any>({});
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

  // ===================== CARREGAMENTO DE DADOS =====================

  const loadCategories = useCallback(async () => {
    const { data } = await supabase.from('categories').select('*').order('name');
    if (data) setCategories(data);
  }, []);

  const loadEquipes = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('teams')
      .select('*, category:categories(*)')
      .order('name');
    if (!error && data) setEquipes(data as Equipe[]);
    setLoading(false);
  }, []);

  const loadBoardMembers = useCallback(async () => {
    setBoardLoading(true);
    // Busca apenas quem tem role 'diretoria' ou 'admin'
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, board_role')
      .in('role', ['diretoria', 'admin'])
      .order('full_name');
    
    if (!error && data) setBoardMembers(data as BoardMember[]);
    setBoardLoading(false);
  }, []);

  const loadAthletesWithoutTeam = useCallback(async () => {
    setAthletesLoading(true);
    const { data } = await supabase
      .from('athletes')
      .select('*')
      .or('team_id.is.null,category_id.is.null')
      .eq('is_active', true)
      .order('full_name');
      
    if (data) {
      const filtered = data.filter((a: any) => !a.team_id || !a.category_id);
      setAthletesWithoutTeam(filtered);
    }
    setAthletesLoading(false);
  }, []);

  useEffect(() => {
    loadCategories();
    loadEquipes();
  }, [loadCategories, loadEquipes]);

  useEffect(() => {
    if (viewMode === 'diretoria') loadBoardMembers();
    if (viewMode === 'atletas_sem_time') loadAthletesWithoutTeam();
  }, [viewMode, loadBoardMembers, loadAthletesWithoutTeam]);


  // ===================== LÓGICA DE BUSCA DE USUÁRIOS (ADD MEMBER) =====================

  async function handleSearchUsers(text: string) {
    setSearchTerm(text);
    if (text.length < 2) {
      setUserSearchResults([]);
      return;
    }

    setSearchingUsers(true);
    try {
      // Busca usuários que NÃO são admin nem diretoria ainda
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .not('role', 'in', '("admin","diretoria")') 
        .ilike('full_name', `%${text}%`)
        .order('full_name')
        .limit(5);

      if (error) {
        console.error('Erro na busca:', error);
      } else {
        setUserSearchResults(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearchingUsers(false);
    }
  }

  function handleOpenAddMemberModal() {
    setSearchTerm('');
    setUserSearchResults([]);
    setSelectedUserToAdd(null);
    setNewMemberRole('diretoria');
    setNewMemberFunction('');
    setAddMemberModalVisible(true);
  }

  async function handleAddBoardMember() {
    if (!selectedUserToAdd) return;

    setSavingNewMember(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          role: newMemberRole,
          board_role: newMemberFunction.trim() || null
        })
        .eq('id', selectedUserToAdd.id);

      if (error) throw error;

      Alert.alert('Sucesso', `${selectedUserToAdd.full_name} foi adicionado à diretoria.`);
      setAddMemberModalVisible(false);
      loadBoardMembers(); // Recarrega a lista
    } catch (err) {
      console.error(err);
      Alert.alert('Erro', 'Não foi possível adicionar o membro.');
    } finally {
      setSavingNewMember(false);
    }
  }

  // ===================== CRUD EQUIPES =====================
  
  async function handleSaveEquipe() {
     if(!formNome.trim()) return;
     setSaving(true);
     try {
       const payload = { name: formNome.trim(), category_id: formCategoriaId || null };
       if(editingEquipe) {
         await supabase.from('teams').update(payload).eq('id', editingEquipe.id);
       } else {
         await supabase.from('teams').insert(payload);
       }
       setModalVisible(false);
       loadEquipes();
     } catch(e) { console.error(e) } finally { setSaving(false); }
  }

  function handleDeleteEquipe(equipe: Equipe) {
    Alert.alert('Excluir', `Apagar equipe ${equipe.name}?`, [
      {text:'Cancelar'},
      {text:'Excluir', style:'destructive', onPress: async()=>{
        await supabase.from('teams').delete().eq('id', equipe.id);
        loadEquipes();
      }}
    ]);
  }

  // ===================== CRUD DIRETORIA (EDITAR FUNÇÃO) =====================

  async function handleSaveBoardRole() {
    if (!editingBoardMember) return;
    setSavingBoardRole(true);
    try {
      await supabase.from('profiles').update({ board_role: boardRoleInput.trim() || null }).eq('id', editingBoardMember.id);
      setBoardModalVisible(false);
      loadBoardMembers();
    } catch (e) { Alert.alert('Erro', 'Falha ao salvar'); } 
    finally { setSavingBoardRole(false); }
  }


  // ===================== RENDERIZAÇÃO =====================

  function renderBoardMember({ item }: { item: BoardMember }) {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{item.full_name || 'Usuário'}</Text>
            <Text style={styles.cardLineSmall}>{item.email}</Text>
          </View>
          <View style={[styles.cardBadgeContainer, item.role === 'admin' ? {backgroundColor:'#E3F2FD'} : {}]}>
             <Text style={[styles.cardBadgeText, item.role === 'admin' ? {color:'#1565C0'} : {}]}>
               {item.role === 'admin' ? 'ADMIN' : 'DIRETORIA'}
             </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardLine}>
              <Text style={{fontWeight:'600'}}>Função: </Text>
              {item.board_role || 'Não informada'}
            </Text>
          </View>

          {isDiretoriaOrAdmin && (
            <TouchableOpacity
              style={styles.editRoleButton}
              onPress={() => {
                setEditingBoardMember(item);
                setBoardRoleInput(item.board_role || '');
                setBoardModalVisible(true);
              }}
            >
              <Ionicons name="create-outline" size={16} color={AppTheme.primary} style={{ marginRight: 4 }} />
              <Text style={styles.editRoleButtonText}>Editar função</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  function renderEquipe({item}: {item:Equipe}) {
      return (
          <View style={styles.card}>
              <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  {item.category && <Text style={styles.cardBadgeTextSimple}>{item.category.name}</Text>}
              </View>
              <View style={styles.cardFooter}>
                  <TouchableOpacity style={styles.cardAction} onPress={()=> navigation.navigate('EquipeAtletas', {equipeId: item.id, equipeNome: item.name})}>
                      <Ionicons name="people-outline" size={18} color={AppTheme.primary} />
                      <Text style={styles.cardActionText}>Ver Atletas</Text>
                  </TouchableOpacity>
                  {isDiretoriaOrAdmin && (
                    <View style={styles.cardAdminActions}>
                        <TouchableOpacity onPress={() => {
                            setEditingEquipe(item);
                            setFormNome(item.name);
                            setFormCategoriaId(item.category_id || null);
                            setModalVisible(true);
                        }}><Ionicons name="create-outline" size={20} color={AppTheme.textSecondary} /></TouchableOpacity>
                        <TouchableOpacity onPress={()=>handleDeleteEquipe(item)} style={{marginLeft:10}}>
                             <Ionicons name="trash-outline" size={20} color="#C62828" />
                        </TouchableOpacity>
                    </View>
                  )}
              </View>
          </View>
      )
  }

  return (
    <View style={styles.container}>
      <View style={styles.pageHeader}>
        <Image source={handluzLogo} style={styles.headerLogo} resizeMode="contain" />
      </View>

      {/* TABS DE NAVEGAÇÃO */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segmentButton, viewMode === 'times' && styles.segmentButtonActive]}
          onPress={() => setViewMode('times')}
        >
          <Ionicons name="people" size={16} color={viewMode === 'times' ? '#FFF' : '#666'} style={{marginRight:5}} />
          <Text style={[styles.segmentButtonText, viewMode === 'times' && styles.segmentButtonTextActive]}>Times</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentButton, viewMode === 'diretoria' && styles.segmentButtonActive]}
          onPress={() => setViewMode('diretoria')}
        >
          <Ionicons name="ribbon" size={16} color={viewMode === 'diretoria' ? '#FFF' : '#666'} style={{marginRight:5}} />
          <Text style={[styles.segmentButtonText, viewMode === 'diretoria' && styles.segmentButtonTextActive]}>Diretoria</Text>
        </TouchableOpacity>
        {isDiretoriaOrAdmin && (
          <TouchableOpacity
            style={[styles.segmentButton, viewMode === 'atletas_sem_time' && styles.segmentButtonActive]}
            onPress={() => setViewMode('atletas_sem_time')}
          >
            <Ionicons name="person-remove" size={16} color={viewMode === 'atletas_sem_time' ? '#FFF' : '#666'} style={{marginRight:5}} />
            <Text style={[styles.segmentButtonText, viewMode === 'atletas_sem_time' && styles.segmentButtonTextActive]}>Sem Time</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* LISTAS */}
      {viewMode === 'times' && (
        <FlatList
          data={equipes}
          keyExtractor={i => i.id}
          renderItem={renderEquipe}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>loadEquipes()}/>}
          ListEmptyComponent={<Text style={styles.emptyText}>Nenhuma equipe cadastrada.</Text>}
        />
      )}

      {viewMode === 'diretoria' && (
        <FlatList
          data={boardMembers}
          keyExtractor={i => i.id}
          renderItem={renderBoardMember}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={boardRefreshing} onRefresh={()=>loadBoardMembers()}/>}
          ListEmptyComponent={<Text style={styles.emptyText}>Nenhum membro na diretoria.</Text>}
        />
      )}
      
      {/* Botão FAB (Aparece em Times e Diretoria para Admin) */}
      {isDiretoriaOrAdmin && viewMode !== 'atletas_sem_time' && (
        <TouchableOpacity
          style={[styles.fab, { bottom: 88 + insets.bottom }]}
          onPress={() => {
             if (viewMode === 'times') {
                 setEditingEquipe(null); setFormNome(''); setFormCategoriaId(null); setModalVisible(true);
             } else if (viewMode === 'diretoria') {
                 handleOpenAddMemberModal();
             }
          }}
        >
          <Ionicons name="add" size={26} color="#FFF" />
        </TouchableOpacity>
      )}


      {/* === MODAL DE ADICIONAR MEMBRO DA DIRETORIA === */}
      <Modal
        visible={addMemberModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddMemberModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Adicionar à Diretoria</Text>
            
            {!selectedUserToAdd ? (
                // FASE 1: BUSCA
                <>
                    <Text style={styles.fieldLabel}>Buscar usuário (nome ou e-mail)</Text>
                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={20} color={AppTheme.textSecondary} style={{marginRight:8}} />
                        <TextInput 
                            style={styles.searchInput}
                            placeholder="Digite para buscar..."
                            value={searchTerm}
                            onChangeText={handleSearchUsers}
                            autoCapitalize="none"
                        />
                        {searchingUsers && <ActivityIndicator size="small" color={AppTheme.primary} />}
                    </View>

                    <Text style={styles.resultsLabel}>Resultados ({userSearchResults.length})</Text>
                    <ScrollView style={{maxHeight: 200}}>
                        {userSearchResults.map(user => (
                            <TouchableOpacity 
                                key={user.id} 
                                style={styles.searchResultItem}
                                onPress={() => setSelectedUserToAdd(user)}
                            >
                                <Text style={styles.resultName}>{user.full_name}</Text>
                                <Text style={styles.resultEmail}>{user.email}</Text>
                            </TouchableOpacity>
                        ))}
                        {searchTerm.length > 1 && userSearchResults.length === 0 && !searchingUsers && (
                            <Text style={styles.emptyText}>Nenhum usuário encontrado.</Text>
                        )}
                    </ScrollView>

                    <TouchableOpacity 
                        style={[styles.modalButton, styles.modalButtonOutline, {marginTop: 16}]}
                        onPress={() => setAddMemberModalVisible(false)}
                    >
                        <Text style={styles.modalButtonOutlineText}>Cancelar</Text>
                    </TouchableOpacity>
                </>
            ) : (
                // FASE 2: DEFINIR CARGO
                <>
                    <View style={styles.selectedUserCard}>
                        <View>
                            <Text style={styles.selectedUserName}>{selectedUserToAdd.full_name}</Text>
                            <Text style={styles.selectedUserEmail}>{selectedUserToAdd.email}</Text>
                        </View>
                        <TouchableOpacity onPress={() => setSelectedUserToAdd(null)}>
                            <Ionicons name="close-circle" size={24} color="#D32F2F" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.fieldLabel}>Nível de Acesso</Text>
                    <View style={styles.roleSelector}>
                        <TouchableOpacity 
                            style={[styles.roleOption, newMemberRole === 'diretoria' && styles.roleOptionSelected]}
                            onPress={() => setNewMemberRole('diretoria')}
                        >
                            <Text style={[styles.roleOptionText, newMemberRole === 'diretoria' && styles.roleOptionTextSelected]}>
                                Diretoria
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.roleOption, newMemberRole === 'admin' && styles.roleOptionSelected]}
                            onPress={() => setNewMemberRole('admin')}
                        >
                            <Text style={[styles.roleOptionText, newMemberRole === 'admin' && styles.roleOptionTextSelected]}>
                                Admin
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.fieldLabel}>Função / Cargo (ex: Tesoureiro)</Text>
                    <TextInput 
                        style={styles.input}
                        placeholder="Cargo na diretoria"
                        value={newMemberFunction}
                        onChangeText={setNewMemberFunction}
                    />

                    <View style={styles.modalButtonsRow}>
                        <TouchableOpacity 
                             style={[styles.modalButton, styles.modalButtonOutline]}
                             onPress={() => setSelectedUserToAdd(null)}
                        >
                            <Text style={styles.modalButtonOutlineText}>Voltar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                             style={[styles.modalButton, styles.modalButtonPrimary]}
                             onPress={handleAddBoardMember}
                             disabled={savingNewMember}
                        >
                            {savingNewMember ? <ActivityIndicator color="#FFF"/> : <Text style={styles.modalButtonPrimaryText}>Confirmar</Text>}
                        </TouchableOpacity>
                    </View>
                </>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal Criar Equipe */}
      <Modal visible={modalVisible} transparent onRequestClose={()=>setModalVisible(false)} animationType="slide">
         <View style={styles.modalOverlay}><View style={styles.modalCard}>
             <Text style={styles.modalTitle}>{editingEquipe ? 'Editar' : 'Criar'} Equipe</Text>
             <Text style={styles.fieldLabel}>Nome da Equipe</Text>
             <TextInput style={styles.input} placeholder="Ex: HandLuz Adulto" value={formNome} onChangeText={setFormNome} />
             
             {/* Picker de Categoria Simplificado */}
             <Text style={styles.fieldLabel}>Categoria (Opcional)</Text>
             <TouchableOpacity style={styles.input} onPress={()=>setCategoryPickerVisible(true)}>
                <Text style={{color: formCategoriaId ? '#000' : '#888'}}>
                   {formCategoriaId ? categories.find(c=>c.id === formCategoriaId)?.name : 'Selecione...'}
                </Text>
             </TouchableOpacity>

             <View style={styles.modalButtonsRow}>
                <TouchableOpacity onPress={()=>setModalVisible(false)} style={[styles.modalButton, styles.modalButtonOutline]}><Text style={styles.modalButtonOutlineText}>Cancelar</Text></TouchableOpacity>
                <TouchableOpacity onPress={handleSaveEquipe} style={[styles.modalButton, styles.modalButtonPrimary]}><Text style={styles.modalButtonPrimaryText}>Salvar</Text></TouchableOpacity>
             </View>
         </View></View>
      </Modal>

      {/* Modal Editar Função Existente */}
      <Modal visible={boardModalVisible} transparent onRequestClose={()=>setBoardModalVisible(false)} animationType="slide">
          <View style={styles.modalOverlay}><View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Editar Função</Text>
              <Text style={{marginBottom:10, fontSize:14}}>{editingBoardMember?.full_name}</Text>
              <TextInput style={styles.input} value={boardRoleInput} onChangeText={setBoardRoleInput} placeholder="Nova função" />
              <View style={styles.modalButtonsRow}>
                  <TouchableOpacity onPress={()=>setBoardModalVisible(false)} style={[styles.modalButton, styles.modalButtonOutline]}><Text style={styles.modalButtonOutlineText}>Cancelar</Text></TouchableOpacity>
                  <TouchableOpacity onPress={handleSaveBoardRole} style={[styles.modalButton, styles.modalButtonPrimary]}><Text style={styles.modalButtonPrimaryText}>Salvar</Text></TouchableOpacity>
              </View>
          </View></View>
      </Modal>
      
      {/* Picker de Categorias */}
      <Modal visible={categoryPickerVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                  <Text style={styles.modalTitle}>Selecione a Categoria</Text>
                  <ScrollView style={{maxHeight: 300}}>
                      <TouchableOpacity style={styles.searchResultItem} onPress={()=>{setFormCategoriaId(null); setCategoryPickerVisible(false);}}>
                          <Text style={{fontWeight:'bold'}}>Nenhuma</Text>
                      </TouchableOpacity>
                      {categories.map(c => (
                          <TouchableOpacity key={c.id} style={styles.searchResultItem} onPress={()=>{setFormCategoriaId(c.id); setCategoryPickerVisible(false);}}>
                              <Text>{c.name}</Text>
                          </TouchableOpacity>
                      ))}
                  </ScrollView>
                  <TouchableOpacity onPress={()=>setCategoryPickerVisible(false)} style={[styles.modalButton, styles.modalButtonOutline, {marginTop:10}]}><Text style={styles.modalButtonOutlineText}>Fechar</Text></TouchableOpacity>
              </View>
          </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppTheme.background },
  pageHeader: { alignItems: 'center', paddingTop: 10, paddingBottom: 5 },
  headerLogo: { width: 90, height: 90 },
  segmentContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 10 },
  segmentButton: { flex: 1, flexDirection:'row', paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: AppTheme.border, alignItems: 'center', justifyContent:'center', marginRight: 5, backgroundColor: '#FFF' },
  segmentButtonActive: { backgroundColor: AppTheme.primary, borderColor: AppTheme.primary },
  segmentButtonText: { color: AppTheme.textSecondary, fontWeight: '600' },
  segmentButtonTextActive: { color: '#FFF' },
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
  emptyText: { textAlign: 'center', marginTop: 20, color: AppTheme.textSecondary },
  
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#E0E0E0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems:'flex-start' },
  cardTitle: { fontWeight: '700', fontSize: 16, color: AppTheme.textPrimary },
  cardBadgeContainer: { backgroundColor: '#E8F3EC', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  cardBadgeText: { fontSize: 10, fontWeight: '700', color: AppTheme.primary },
  cardBadgeTextSimple: { fontSize: 11, color: AppTheme.primary, backgroundColor:'#E8F3EC', paddingHorizontal:6, borderRadius:4, overflow:'hidden' },
  cardFooter: { flexDirection: 'row', marginTop: 12, alignItems: 'center', justifyContent: 'space-between', paddingTop:8, borderTopWidth:1, borderTopColor:'#F0F0F0' },
  cardAction: { flexDirection: 'row', alignItems: 'center' },
  cardActionText: { color: AppTheme.primary, fontWeight: '600', marginLeft: 6, fontSize:13 },
  cardAdminActions: { flexDirection: 'row' },
  cardLineSmall: { fontSize: 12, color: '#888' },
  cardLine: { fontSize: 13, color: '#333' },

  editRoleButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', padding: 6, borderRadius: 12 },
  editRoleButtonText: { fontSize: 12, color: AppTheme.primary, fontWeight: '600', marginLeft:4 },

  fab: { position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: AppTheme.primary, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor:'#000', shadowOffset:{width:0,height:2}, shadowOpacity:0.3, shadowRadius:3 },

  // MODAL STYLES
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, maxHeight:'80%' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 15, color: AppTheme.textPrimary },
  fieldLabel: { fontSize: 12, color: '#666', marginBottom: 5, marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 10, fontSize: 14, backgroundColor:'#FAFAFA' },
  
  // Search Styles
  searchContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#DDD', borderRadius: 8, paddingHorizontal: 10, backgroundColor:'#FAFAFA' },
  searchInput: { flex: 1, paddingVertical: 10 },
  resultsLabel: { fontSize: 12, fontWeight: '600', color: '#888', marginTop: 15, marginBottom: 5 },
  searchResultItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  resultName: { fontWeight: '600', color: '#333' },
  resultEmail: { fontSize: 12, color: '#888' },

  // Selected User Styles
  selectedUserCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F0F7F4', padding: 12, borderRadius: 8, marginBottom: 10, borderWidth:1, borderColor:'#E0E0E0' },
  selectedUserName: { fontWeight: '700', fontSize: 15, color: AppTheme.primary },
  selectedUserEmail: { fontSize: 12, color: '#666' },

  roleSelector: { flexDirection: 'row', gap: 10 },
  roleOption: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#DDD', alignItems: 'center', backgroundColor:'#FFF' },
  roleOptionSelected: { backgroundColor: AppTheme.primary, borderColor: AppTheme.primary },
  roleOptionText: { color: '#666', fontWeight: '600' },
  roleOptionTextSelected: { color: '#FFF' },

  modalButtonsRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20 },
  modalButton: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, marginLeft: 10 },
  modalButtonOutline: { borderWidth: 1, borderColor: '#DDD' },
  modalButtonOutlineText: { color: '#666' },
  modalButtonPrimary: { backgroundColor: AppTheme.primary },
  modalButtonPrimaryText: { color: '#FFF', fontWeight: '600' },
});