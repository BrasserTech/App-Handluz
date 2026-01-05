// app/screens/EquipesListScreen.tsx
// Gestão de Equipes, Diretoria e Atletas sem time.

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
  Platform, // Importante para corrigir o erro do botão remover na web
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AppTheme } from '../../constants/theme';
import { supabase } from '../services/supabaseClient';
import { usePermissions } from '../../hooks/usePermissions';
import type { EquipesStackParamList } from '../navigation/EquipesStackNavigator';

// Ajuste o caminho da imagem se necessário
const handluzLogo = require('../../assets/images/logo_handluz.png');

type EquipesNav = NativeStackNavigationProp<EquipesStackParamList>;

// ===================== TIPAGEM =====================

type Category = {
  id: number;
  name: string;
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

type AthleteWithoutTeam = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  birthdate: string | null;
  image_url: string | null;
  position?: string | null;
};

type UserSearchResult = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string; 
};

type ViewMode = 'times' | 'diretoria' | 'atletas_sem_time';

// ===================== COMPONENTE PRINCIPAL =====================

export default function EquipesListScreen() {
  const { isDiretoriaOrAdmin } = usePermissions();
  const navigation = useNavigation<EquipesNav>();
  const insets = useSafeAreaInsets();

  // --- ESTADOS GERAIS ---
  const [viewMode, setViewMode] = useState<ViewMode>('times');
  const [categories, setCategories] = useState<Category[]>([]);
  
  // --- TIMES ---
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // --- DIRETORIA ---
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>([]);
  const [boardLoading, setBoardLoading] = useState<boolean>(false);
  const [boardRefreshing, setBoardRefreshing] = useState<boolean>(false);

  // --- ATLETAS SEM TIME ---
  const [athletesWithoutTeam, setAthletesWithoutTeam] = useState<AthleteWithoutTeam[]>([]);
  const [athletesLoading, setAthletesLoading] = useState<boolean>(false);
  const [athletesRefreshing, setAthletesRefreshing] = useState<boolean>(false);

  // --- MODAIS ---
  
  // 1. Equipes
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editingEquipe, setEditingEquipe] = useState<Equipe | null>(null);
  const [formNome, setFormNome] = useState<string>('');
  const [formCategoriaId, setFormCategoriaId] = useState<number | null>(null);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // 2. Diretoria (Gerenciar/Editar)
  const [boardModalVisible, setBoardModalVisible] = useState<boolean>(false);
  const [editingBoardMember, setEditingBoardMember] = useState<BoardMember | null>(null);
  const [boardRoleInput, setBoardRoleInput] = useState<string>('');
  const [savingBoardRole, setSavingBoardRole] = useState<boolean>(false);

  // 3. Diretoria (Adicionar Novo - Busca Live)
  const [addMemberModalVisible, setAddMemberModalVisible] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<UserSearchResult[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [selectedUserToAdd, setSelectedUserToAdd] = useState<UserSearchResult | null>(null);
  const [newMemberFunction, setNewMemberFunction] = useState('');
  const [savingNewMember, setSavingNewMember] = useState(false);

  // 4. Atleta Sem Time (Alocar)
  const [athleteModalVisible, setAthleteModalVisible] = useState(false);
  const [selectedAthlete, setSelectedAthlete] = useState<AthleteWithoutTeam | null>(null);
  const [selectedTeamIdForAthlete, setSelectedTeamIdForAthlete] = useState<string | null>(null);
  const [teamPickerVisible, setTeamPickerVisible] = useState(false);
  const [savingAthlete, setSavingAthlete] = useState<boolean>(false);

  // ===================== CARREGAMENTO DE DADOS =====================

  const loadCategories = useCallback(async () => {
    const { data } = await supabase.from('categories').select('*').order('name');
    if (data) setCategories(data);
  }, []);

  const loadEquipes = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('teams').select('*, category:categories(*)').order('name');
      if (!error && data) setEquipes(data as Equipe[]);
    } catch(e) { console.log(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  const loadBoardMembers = useCallback(async () => {
    setBoardLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, board_role')
        .in('role', ['diretoria', 'admin'])
        .order('full_name');
      if (!error && data) setBoardMembers(data as BoardMember[]);
    } catch(e) { console.log(e); }
    finally { setBoardLoading(false); setBoardRefreshing(false); }
  }, []);

  const loadAthletesWithoutTeam = useCallback(async () => {
    setAthletesLoading(true);
    try {
      const { data, error } = await supabase.from('athletes').select('*').is('team_id', null).order('full_name');
      if (!error && data) setAthletesWithoutTeam(data as AthleteWithoutTeam[]);
    } catch(e) { console.log(e); }
    finally { setAthletesLoading(false); setAthletesRefreshing(false); }
  }, []);

  useEffect(() => {
    loadCategories();
    loadEquipes();
  }, [loadCategories, loadEquipes]);

  useEffect(() => {
    if (viewMode === 'diretoria') loadBoardMembers();
    if (viewMode === 'atletas_sem_time') loadAthletesWithoutTeam();
  }, [viewMode, loadBoardMembers, loadAthletesWithoutTeam]);

  // ===================== AÇÕES: TIMES =====================
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
     } catch(e) { Alert.alert('Erro', 'Falha ao salvar equipe'); } 
     finally { setSaving(false); }
  }

  function handleDeleteEquipe(equipe: Equipe) {
    if (Platform.OS === 'web') {
       if (confirm(`Deseja apagar a equipe ${equipe.name}?`)) {
          deleteEquipe(equipe.id);
       }
    } else {
      Alert.alert('Excluir', `Apagar equipe ${equipe.name}?`, [
        {text:'Cancelar', style:'cancel'},
        {text:'Excluir', style:'destructive', onPress: () => deleteEquipe(equipe.id)}
      ]);
    }
  }

  async function deleteEquipe(id: string) {
    await supabase.from('teams').delete().eq('id', id);
    loadEquipes();
  }

  // ===================== AÇÕES: ATLETAS SEM TIME =====================
  function openAssignAthleteModal(athlete: AthleteWithoutTeam) {
    setSelectedAthlete(athlete);
    setSelectedTeamIdForAthlete(null);
    setAthleteModalVisible(true);
  }

  async function handleAssignAthlete() {
    if (!selectedAthlete || !selectedTeamIdForAthlete) {
      Alert.alert('Atenção', 'Selecione um time para alocar o atleta.');
      return;
    }
    setSavingAthlete(true);
    try {
      const team = equipes.find(t => t.id === selectedTeamIdForAthlete);
      const categoryId = team?.category_id || null;
      const { error } = await supabase.from('athletes').update({ team_id: selectedTeamIdForAthlete, category_id: categoryId }).eq('id', selectedAthlete.id);
      if (error) throw error;
      Alert.alert('Sucesso', 'Atleta alocado no time!');
      setAthleteModalVisible(false);
      loadAthletesWithoutTeam();
    } catch (e) { Alert.alert('Erro', 'Não foi possível alocar o atleta.'); } 
    finally { setSavingAthlete(false); }
  }

  // ===================== AÇÕES: BUSCA DE USUÁRIO (NOVA DIRETORIA) =====================
  
  async function handleSearchUsers(text: string) {
    setSearchTerm(text);
    if (text.length < 2) {
      setUserSearchResults([]);
      return;
    }
    setSearchingUsers(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .ilike('full_name', `%${text}%`)
        .order('full_name')
        .limit(5);

      if (error) {
        console.error("Erro busca:", error);
      } else {
        setUserSearchResults(data as UserSearchResult[] || []);
      }
    } catch (err) { console.error(err); } 
    finally { setSearchingUsers(false); }
  }

  function handleSelectUserToAdd(user: UserSearchResult) {
      if (user.role === 'diretoria' || user.role === 'admin') {
          return; 
      }
      setSelectedUserToAdd(user);
      setNewMemberFunction(''); 
      setUserSearchResults([]); 
  }

  async function handleAddBoardMember() {
    if (!selectedUserToAdd) return;
    setSavingNewMember(true);
    try {
      const { error } = await supabase.from('profiles').update({
          role: 'diretoria',
          board_role: newMemberFunction.trim() || null
        }).eq('id', selectedUserToAdd.id);
      
      if (error) throw error;
      
      Alert.alert("Sucesso", "Membro adicionado à diretoria.");
      setAddMemberModalVisible(false);
      loadBoardMembers(); 
    } catch (err) { Alert.alert('Erro', 'Falha ao adicionar.'); console.error(err); } 
    finally { setSavingNewMember(false); }
  }

  // ===================== AÇÕES: GERENCIAR (EDITAR/REMOVER) =====================
  
  async function handleUpdateBoardMember() {
    if (!editingBoardMember) return;
    setSavingBoardRole(true);
    try {
      await supabase.from('profiles').update({ 
          board_role: boardRoleInput.trim() || null
      }).eq('id', editingBoardMember.id);
      setBoardModalVisible(false);
      loadBoardMembers();
    } catch (e) { Alert.alert('Erro', 'Falha ao atualizar.'); } 
    finally { setSavingBoardRole(false); }
  }

  async function handleRemoveBoardMember() {
      if (!editingBoardMember) return;

      const executeRemoval = async () => {
          setSavingBoardRole(true);
          try {
              const { error } = await supabase
                  .from('profiles')
                  .update({ role: 'usuario', board_role: null })
                  .eq('id', editingBoardMember.id);
              
              if (error) throw error;

              setBoardModalVisible(false);
              loadBoardMembers();
          } catch (e) { 
              Alert.alert('Erro', 'Falha ao remover membro.'); 
              console.error(e);
          } 
          finally { setSavingBoardRole(false); }
      };

      // CORREÇÃO CRÍTICA PARA WEB: Alert.alert pode não funcionar no navegador
      if (Platform.OS === 'web') {
          if (confirm(`Tem certeza que deseja remover ${editingBoardMember.full_name} da diretoria?`)) {
              await executeRemoval();
          }
      } else {
          Alert.alert(
              'Remover da Diretoria', 
              `Tem certeza que deseja remover ${editingBoardMember.full_name}? Ele voltará a ser apenas um usuário comum.`, 
              [
                { text: 'Não', style: 'cancel' },
                { text: 'Sim', style: 'destructive', onPress: executeRemoval }
              ]
          );
      }
  }

  // ===================== RENDERIZAÇÃO =====================

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
                 setEditingEquipe(item); setFormNome(item.name); setFormCategoriaId(item.category_id || null); setModalVisible(true);
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

  function renderBoardMember({ item }: { item: BoardMember }) {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{item.full_name}</Text>
            <Text style={styles.cardLineSmall}>{item.email}</Text>
          </View>
          <View style={[styles.cardBadgeContainer, item.role === 'admin' ? {backgroundColor:'#E3F2FD'} : {}]}>
             <Text style={[styles.cardBadgeText, item.role === 'admin' ? {color:'#1565C0'} : {}]}>{item.role === 'admin' ? 'ADMIN' : 'DIRETORIA'}</Text>
          </View>
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.cardLine}><Text style={{fontWeight:'600'}}>Cargo: </Text>{item.board_role || 'Membro'}</Text>
          {isDiretoriaOrAdmin && (
            <TouchableOpacity style={styles.editRoleButton} onPress={() => {
                setEditingBoardMember(item); setBoardRoleInput(item.board_role || ''); setBoardModalVisible(true);
            }}>
              <Ionicons name="create-outline" size={16} color={AppTheme.primary} style={{ marginRight: 4 }} />
              <Text style={styles.editRoleButtonText}>Gerenciar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  function renderAthleteWithoutTeam({ item }: { item: AthleteWithoutTeam }) {
    return (
      <View style={styles.card}>
        <View style={{flexDirection:'row', alignItems:'center'}}>
           <View style={{width:40, height:40, borderRadius:20, backgroundColor:'#EEE', justifyContent:'center', alignItems:'center', marginRight:10}}>
              <Ionicons name="person" size={20} color="#999" />
           </View>
           <View style={{flex:1}}>
              <Text style={styles.cardTitle}>{item.full_name}</Text>
              <Text style={styles.cardLineSmall}>{item.email || 'Sem e-mail'}</Text>
           </View>
        </View>
        <View style={[styles.cardFooter, {justifyContent:'flex-end'}]}>
             <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonSuccess, {paddingVertical:6, minWidth:120}]} 
                onPress={() => openAssignAthleteModal(item)}
             >
                <Text style={[styles.modalButtonTextWhite, {fontSize:12}]}>Alocar Time</Text>
             </TouchableOpacity>
        </View>
      </View>
    );
  }

  function renderSearchItem(user: UserSearchResult) {
      const isAlreadyDirector = user.role === 'diretoria' || user.role === 'admin';
      
      return (
        <TouchableOpacity 
            key={user.id} 
            style={styles.searchResultItem} 
            onPress={() => handleSelectUserToAdd(user)}
            disabled={isAlreadyDirector}
        >
            <View>
                <Text style={[styles.resultName, isAlreadyDirector && {color:'#888'}]}>{user.full_name}</Text>
                <Text style={styles.resultEmail}>{user.email}</Text>
            </View>
            
            {isAlreadyDirector ? (
                <View style={{backgroundColor:'#E8F5E9', paddingHorizontal:8, paddingVertical:4, borderRadius:4}}>
                    <Text style={{color:'#2E7D32', fontSize:10, fontWeight:'bold'}}>JÁ NA DIRETORIA</Text>
                </View>
            ) : (
                <Ionicons name="add-circle-outline" size={24} color={AppTheme.primary}/>
            )}
        </TouchableOpacity>
      );
  }

  return (
    <View style={styles.container}>
      <View style={styles.pageHeader}>
        <Image source={handluzLogo} style={styles.headerLogo} resizeMode="contain" />
      </View>

      {/* TABS DE NAVEGAÇÃO */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity style={[styles.segmentButton, viewMode === 'times' && styles.segmentButtonActive]} onPress={() => setViewMode('times')}>
          <Ionicons name="people" size={16} color={viewMode === 'times' ? '#FFF' : '#666'} style={{marginRight:5}} />
          <Text style={[styles.segmentButtonText, viewMode === 'times' && styles.segmentButtonTextActive]}>Times</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.segmentButton, viewMode === 'diretoria' && styles.segmentButtonActive]} onPress={() => setViewMode('diretoria')}>
          <Ionicons name="ribbon" size={16} color={viewMode === 'diretoria' ? '#FFF' : '#666'} style={{marginRight:5}} />
          <Text style={[styles.segmentButtonText, viewMode === 'diretoria' && styles.segmentButtonTextActive]}>Diretoria</Text>
        </TouchableOpacity>

        {isDiretoriaOrAdmin && (
          <TouchableOpacity style={[styles.segmentButton, viewMode === 'atletas_sem_time' && styles.segmentButtonActive]} onPress={() => setViewMode('atletas_sem_time')}>
            <Ionicons name="person-add" size={16} color={viewMode === 'atletas_sem_time' ? '#FFF' : '#666'} style={{marginRight:5}} />
            <Text style={[styles.segmentButtonText, viewMode === 'atletas_sem_time' && styles.segmentButtonTextActive]}>Sem Time</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* LISTAS */}
      {viewMode === 'times' && (
        <FlatList data={equipes} keyExtractor={i => i.id} renderItem={renderEquipe} contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadEquipes}/>}
          ListEmptyComponent={<Text style={styles.emptyText}>Nenhuma equipe cadastrada.</Text>}
        />
      )}

      {viewMode === 'diretoria' && (
        <FlatList data={boardMembers} keyExtractor={i => i.id} renderItem={renderBoardMember} contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={boardRefreshing} onRefresh={loadBoardMembers}/>}
          ListEmptyComponent={<Text style={styles.emptyText}>Nenhum membro na diretoria.</Text>}
        />
      )}

      {viewMode === 'atletas_sem_time' && (
        <FlatList data={athletesWithoutTeam} keyExtractor={i => i.id} renderItem={renderAthleteWithoutTeam} contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={athletesRefreshing} onRefresh={loadAthletesWithoutTeam}/>}
          ListEmptyComponent={<Text style={styles.emptyText}>Nenhum atleta novo sem time.</Text>}
        />
      )}
      
      {/* Botão FAB */}
      {isDiretoriaOrAdmin && viewMode !== 'atletas_sem_time' && (
        <TouchableOpacity style={[styles.fab, { bottom: 88 + insets.bottom }]} onPress={() => {
             if (viewMode === 'times') { setEditingEquipe(null); setFormNome(''); setFormCategoriaId(null); setModalVisible(true); }
             else if (viewMode === 'diretoria') { setSearchTerm(''); setUserSearchResults([]); setSelectedUserToAdd(null); setAddMemberModalVisible(true); }
        }}>
          <Ionicons name="add" size={26} color="#FFF" />
        </TouchableOpacity>
      )}

      {/* === MODAL DE ATLETA (ALOCAR TIME) === */}
      <Modal visible={athleteModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}><View style={styles.modalCard}>
             <Text style={styles.modalTitle}>Alocar Atleta</Text>
             <Text style={{marginBottom:15}}>Escolha o time para <Text style={{fontWeight:'bold'}}>{selectedAthlete?.full_name}</Text>:</Text>
             <TouchableOpacity style={styles.input} onPress={()=>setTeamPickerVisible(true)}>
                <Text style={{color: selectedTeamIdForAthlete ? '#000' : '#888'}}>
                   {selectedTeamIdForAthlete ? equipes.find(t=>t.id === selectedTeamIdForAthlete)?.name : 'Selecione o Time...'}
                </Text>
             </TouchableOpacity>
             <View style={styles.modalButtonsRow}>
                <TouchableOpacity onPress={()=>setAthleteModalVisible(false)} style={[styles.modalButton, styles.modalButtonDanger]}><Text style={styles.modalButtonTextWhite}>Cancelar</Text></TouchableOpacity>
                <TouchableOpacity onPress={handleAssignAthlete} disabled={savingAthlete} style={[styles.modalButton, styles.modalButtonSuccess]}>
                   {savingAthlete ? <ActivityIndicator color="#FFF"/> : <Text style={styles.modalButtonTextWhite}>Confirmar</Text>}
                </TouchableOpacity>
             </View>
        </View></View>
      </Modal>

      {/* Picker de Times */}
      <Modal visible={teamPickerVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}><View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Selecione a Equipe</Text>
              <ScrollView style={{maxHeight:300}}>
                  {equipes.map(t => (
                      <TouchableOpacity key={t.id} style={styles.searchResultItem} onPress={()=>{setSelectedTeamIdForAthlete(t.id); setTeamPickerVisible(false);}}>
                          <Text style={{fontWeight:'bold', fontSize:16}}>{t.name}</Text>
                          <Text style={{fontSize:12, color:'#888'}}>{t.category?.name || 'Sem Categoria'}</Text>
                      </TouchableOpacity>
                  ))}
              </ScrollView>
              <TouchableOpacity onPress={()=>setTeamPickerVisible(false)} style={[styles.modalButton, styles.modalButtonDanger, {marginTop:10}]}><Text style={styles.modalButtonTextWhite}>Fechar</Text></TouchableOpacity>
          </View></View>
      </Modal>

      {/* Modal Criar/Editar Equipe */}
      <Modal visible={modalVisible} transparent onRequestClose={()=>setModalVisible(false)} animationType="slide">
         <View style={styles.modalOverlay}><View style={styles.modalCard}>
             <Text style={styles.modalTitle}>{editingEquipe ? 'Editar' : 'Criar'} Equipe</Text>
             <Text style={styles.fieldLabel}>Nome da Equipe</Text>
             <TextInput style={styles.input} placeholder="Ex: HandLuz Adulto" value={formNome} onChangeText={setFormNome} />
             <Text style={styles.fieldLabel}>Categoria (Opcional)</Text>
             <TouchableOpacity style={styles.input} onPress={()=>setCategoryPickerVisible(true)}>
                <Text style={{color: formCategoriaId ? '#000' : '#888'}}>
                   {formCategoriaId ? categories.find(c=>c.id === formCategoriaId)?.name : 'Selecione...'}
                </Text>
             </TouchableOpacity>
             <View style={styles.modalButtonsRow}>
                <TouchableOpacity onPress={()=>setModalVisible(false)} style={[styles.modalButton, styles.modalButtonDanger]}><Text style={styles.modalButtonTextWhite}>Cancelar</Text></TouchableOpacity>
                <TouchableOpacity onPress={handleSaveEquipe} style={[styles.modalButton, styles.modalButtonSuccess]}><Text style={styles.modalButtonTextWhite}>Confirmar</Text></TouchableOpacity>
             </View>
         </View></View>
      </Modal>
      
      {/* Picker de Categorias */}
      <Modal visible={categoryPickerVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}><View style={styles.modalCard}>
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
              <TouchableOpacity onPress={()=>setCategoryPickerVisible(false)} style={[styles.modalButton, styles.modalButtonDanger, {marginTop:10}]}><Text style={styles.modalButtonTextWhite}>Fechar</Text></TouchableOpacity>
          </View></View>
      </Modal>

      {/* Modal Adicionar Diretoria (Busca e Confirmação) */}
      <Modal visible={addMemberModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}><View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Adicionar à Diretoria</Text>
            
            {/* FASE 1: Se não tem usuário selecionado, mostra busca */}
            {!selectedUserToAdd ? (
                <>
                    <Text style={styles.fieldLabel}>Buscar usuário (Digite para pesquisar)</Text>
                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={20} color={AppTheme.textSecondary} style={{marginRight:8}} />
                        <TextInput 
                            style={styles.searchInput} 
                            placeholder="Nome ou email..." 
                            value={searchTerm} 
                            onChangeText={handleSearchUsers} 
                            autoCapitalize="none"
                        />
                        {searchingUsers && <ActivityIndicator size="small" color={AppTheme.primary} />}
                    </View>
                    
                    <ScrollView style={{maxHeight: 200, marginTop:10}}>
                        {userSearchResults.length > 0 ? (
                           userSearchResults.map(user => renderSearchItem(user))
                        ) : (
                           searchTerm.length > 1 && !searchingUsers && <Text style={{color:'#999', textAlign:'center', marginTop:10}}>Nenhum usuário encontrado.</Text>
                        )}
                    </ScrollView>
                    
                    <View style={styles.modalButtonsRow}><TouchableOpacity style={[styles.modalButton, styles.modalButtonDanger]} onPress={() => setAddMemberModalVisible(false)}><Text style={styles.modalButtonTextWhite}>Cancelar</Text></TouchableOpacity></View>
                </>
            ) : (
                // FASE 2: Usuário selecionado - GARANTIDO QUE BOTÕES APARECEM AQUI
                <>
                    <View style={styles.selectedUserCard}>
                        <View><Text style={styles.selectedUserName}>{selectedUserToAdd.full_name}</Text><Text style={styles.selectedUserEmail}>{selectedUserToAdd.email}</Text></View>
                        <TouchableOpacity onPress={() => setSelectedUserToAdd(null)}><Ionicons name="close-circle" size={24} color="#D32F2F" /></TouchableOpacity>
                    </View>
                    
                    <Text style={styles.fieldLabel}>Função / Cargo</Text>
                    <TextInput style={styles.input} placeholder="Ex: Tesoureiro" value={newMemberFunction} onChangeText={setNewMemberFunction} />
                    
                    <View style={styles.modalButtonsRow}>
                        {/* Botão Cancelar (Vermelho) */}
                        <TouchableOpacity style={[styles.modalButton, styles.modalButtonDanger]} onPress={() => setSelectedUserToAdd(null)}><Text style={styles.modalButtonTextWhite}>Cancelar</Text></TouchableOpacity>
                        
                        {/* Botão Confirmar (Verde) - AGORA VISÍVEL */}
                        <TouchableOpacity style={[styles.modalButton, styles.modalButtonSuccess]} onPress={handleAddBoardMember} disabled={savingNewMember}>
                            {savingNewMember ? <ActivityIndicator color="#FFF"/> : <Text style={styles.modalButtonTextWhite}>Confirmar</Text>}
                        </TouchableOpacity>
                    </View>
                </>
            )}
        </View></View>
      </Modal>

      {/* Modal Gerenciar Diretoria (Editar/Remover) */}
      <Modal visible={boardModalVisible} transparent onRequestClose={()=>setBoardModalVisible(false)} animationType="slide">
          <View style={styles.modalOverlay}><View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Gerenciar Membro</Text>
              <View style={{backgroundColor:'#f0f0f0', padding:10, borderRadius:8, marginBottom:15}}>
                  <Text style={{fontSize:16, fontWeight:'bold', color:'#333'}}>{editingBoardMember?.full_name}</Text>
                  <Text style={{fontSize:12, color:'#666'}}>{editingBoardMember?.email}</Text>
              </View>

              <Text style={styles.fieldLabel}>Função / Cargo</Text>
              <TextInput style={styles.input} value={boardRoleInput} onChangeText={setBoardRoleInput} placeholder="Nova função" />
              
              <View style={styles.modalButtonsRow}>
                  <TouchableOpacity onPress={()=>setBoardModalVisible(false)} style={[styles.modalButton, styles.modalButtonDanger]}><Text style={styles.modalButtonTextWhite}>Cancelar</Text></TouchableOpacity>
                  <TouchableOpacity onPress={handleUpdateBoardMember} style={[styles.modalButton, styles.modalButtonSuccess]} disabled={savingBoardRole}>
                      {savingBoardRole ? <ActivityIndicator color="#FFF"/> : <Text style={styles.modalButtonTextWhite}>Confirmar</Text>}
                  </TouchableOpacity>
              </View>
              
              <View style={{marginTop: 20, paddingTop: 15, borderTopWidth:1, borderTopColor:'#eee'}}>
                  <TouchableOpacity onPress={handleRemoveBoardMember} style={{flexDirection:'row', alignItems:'center', justifyContent:'center', padding:10}}>
                      <Ionicons name="person-remove-outline" size={18} color="#D32F2F" />
                      <Text style={{color:'#D32F2F', fontWeight:'bold', marginLeft:8}}>Remover da Diretoria</Text>
                  </TouchableOpacity>
              </View>
          </View></View>
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

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, maxHeight:'85%' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 15, color: AppTheme.textPrimary },
  fieldLabel: { fontSize: 12, color: '#666', marginBottom: 5, marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 10, fontSize: 14, backgroundColor:'#FAFAFA' },
  
  searchContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#DDD', borderRadius: 8, paddingHorizontal: 10, backgroundColor:'#FAFAFA' },
  searchInput: { flex: 1, paddingVertical: 10 },
  searchResultItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEE', flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  resultName: { fontWeight: '600', color: '#333' },
  resultEmail: { fontSize: 12, color: '#888' },

  selectedUserCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F0F7F4', padding: 12, borderRadius: 8, marginBottom: 10, borderWidth:1, borderColor:'#E0E0E0' },
  selectedUserName: { fontWeight: '700', fontSize: 15, color: AppTheme.primary },
  selectedUserEmail: { fontSize: 12, color: '#666' },

  modalButtonsRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20 },
  modalButton: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, marginLeft: 10, minWidth: 90, alignItems:'center' },
  modalButtonDanger: { backgroundColor: '#EF4444' }, 
  modalButtonSuccess: { backgroundColor: '#22C55E' }, 
  modalButtonTextWhite: { color: '#FFF', fontWeight:'bold' },
});