// app/screens/ProdutosListScreen.tsx

import React, { useEffect, useState, useLayoutEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Image,
  Alert,
  Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { AppTheme } from '../../constants/theme';
import { supabase } from '../services/supabaseClient';
import { usePermissions } from '../../hooks/usePermissions';
import { HeaderProfile } from '../../components/HeaderProfile';

const STORAGE_BUCKET = 'store-items'; // crie esse bucket no Supabase ou ajuste o nome

type StoreItemType = 'product' | 'event';

type StoreItem = {
  id: string;
  type: StoreItemType;
  title: string | null;
  description: string | null;
  price: number | null;
  end_date: string | null; // ISO (YYYY-MM-DD)
  image_path: string | null;
};

type FieldErrors = {
  price?: string;
};

function formatPriceDisplay(value: number | null): string {
  if (value == null || Number.isNaN(value)) return 'R$ 0,00';
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

// máscara simples de data dd/mm/aaaa
function maskDate(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function dateDigitsToIso(digits: string): string | null {
  if (digits.length !== 8) return null;
  const d = digits.slice(0, 2);
  const m = digits.slice(2, 4);
  const y = digits.slice(4, 8);
  return `${y}-${m}-${d}`;
}

function isoToDisplay(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR');
}

export default function ProdutosListScreen() {
  const { isDiretoriaOrAdmin } = usePermissions();
  const navigation = useNavigation();

  const [activeTab, setActiveTab] = useState<StoreItemType>('product');
  const [items, setItems] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);

  // modal
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<StoreItem | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formEndDateDisplay, setFormEndDateDisplay] = useState('');
  const [formEndDateDigits, setFormEndDateDigits] = useState('');
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // ------ carregamento de itens ------

  async function loadItems(type: StoreItemType) {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('store_items')
        .select('id, type, title, description, price, end_date, image_path')
        .eq('type', type)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[Produtos] Erro ao carregar itens:', error.message);
        Alert.alert('Erro', 'Não foi possível carregar os itens.');
        return;
      }

      setItems((data ?? []) as StoreItem[]);
    } catch (err) {
      console.error('[Produtos] Erro inesperado ao carregar itens:', err);
      Alert.alert('Erro', 'Ocorreu um erro inesperado ao carregar os itens.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadItems(activeTab);
  }, [activeTab]);

  // ------ helpers de imagem / Storage ------

  function getImagePublicUrl(path: string | null): string | null {
    if (!path) return null;
    const { data } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(path);
    return data?.publicUrl ?? null;
  }

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permissão necessária',
        'Precisamos de acesso às fotos para selecionar a imagem.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    setLocalImageUri(asset.uri);
  }

  async function uploadImageIfNeeded(
    currentPath: string | null
  ): Promise<string | null> {
    // se o usuário não escolheu nada novo, mantém o caminho atual
    if (!localImageUri || localImageUri.startsWith('http')) {
      return currentPath;
    }

    try {
      const resp = await fetch(localImageUri);
      const blob = await resp.blob();

      const ext = (blob.type && blob.type.split('/')[1]) || 'jpg';
      const fileName = `${activeTab}_${Date.now()}.${ext}`;
      const filePath =
        activeTab === 'product'
          ? `products/${fileName}`
          : `events/${fileName}`;

      const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, blob, {
          cacheControl: '3600',
          upsert: false,
          contentType: blob.type || 'image/jpeg',
        });

      if (error) {
        console.error('[Produtos] Erro ao enviar imagem:', error.message);
        Alert.alert(
          'Imagem',
          'Não foi possível enviar a imagem. O item será salvo sem foto.'
        );
        return currentPath;
      }

      return filePath;
    } catch (err) {
      console.error('[Produtos] Erro inesperado ao enviar imagem:', err);
      Alert.alert(
        'Imagem',
        'Ocorreu um erro ao enviar a imagem. O item será salvo sem foto.'
      );
      return currentPath;
    }
  }

  // ------ modal: abrir / preencher ------

  function openNewItemModal() {
    setEditingItem(null);
    setFormTitle('');
    setFormDescription('');
    setFormPrice('');
    setFormEndDateDisplay('');
    setFormEndDateDigits('');
    setLocalImageUri(null);
    setFieldErrors({});
    setModalVisible(true);
  }

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingRight: 10 }}>
          {isDiretoriaOrAdmin && (
            <TouchableOpacity
              onPress={openNewItemModal}
              style={{ marginRight: 12, padding: 4 }}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={26} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          <HeaderProfile />
        </View>
      ),
    });
  }, [navigation, isDiretoriaOrAdmin]);

  function openEditItemModal(item: StoreItem) {
    setEditingItem(item);
    setFormTitle(item.title ?? '');
    setFormDescription(item.description ?? '');
    setFormPrice(
      item.price != null ? String(item.price).replace('.', ',') : ''
    );

    if (item.end_date) {
      const d = new Date(item.end_date);
      if (!Number.isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const digits = `${day}${month}${year}`;
        setFormEndDateDigits(digits);
        setFormEndDateDisplay(maskDate(digits));
      } else {
        setFormEndDateDigits('');
        setFormEndDateDisplay('');
      }
    } else {
      setFormEndDateDigits('');
      setFormEndDateDisplay('');
    }

    const url = getImagePublicUrl(item.image_path);
    setLocalImageUri(url);
    setFieldErrors({});
    setModalVisible(true);
  }

  // ------ salvar / deletar ------

  async function handleSaveItem() {
    if (!isDiretoriaOrAdmin) {
      Alert.alert('Permissão', 'Apenas a diretoria pode cadastrar ou editar.');
      return;
    }

    setSaving(true);
    try {
      // preço: opcional, mas se vier, converte
      let priceNumber: number | null = null;
      if (formPrice.trim()) {
        const cleaned = formPrice.replace('.', '').replace(',', '.');
        const num = Number(cleaned);
        if (!Number.isNaN(num)) {
          priceNumber = num;
        } else {
          setFieldErrors({ price: 'Valor inválido.' });
          Alert.alert(
            'Valor inválido',
            'Não foi possível interpretar o valor informado.'
          );
          setSaving(false);
          return;
        }
      }

      let endDateIso: string | null = null;
      if (formEndDateDigits.length === 8) {
        endDateIso = dateDigitsToIso(formEndDateDigits);
      }

      const newImagePath = await uploadImageIfNeeded(
        editingItem?.image_path ?? null
      );

      const payload: Partial<StoreItem> = {
        type: activeTab,
        title: formTitle.trim() || null,
        description: formDescription.trim() || null,
        price: priceNumber,
        end_date: endDateIso,
        image_path: newImagePath,
      };

      if (!editingItem) {
        const { error } = await supabase.from('store_items').insert(payload);
        if (error) {
          console.error('[Produtos] Erro ao inserir item:', error.message);
          Alert.alert('Erro', 'Não foi possível salvar o item.');
          setSaving(false);
          return;
        }
      } else {
        const { error } = await supabase
          .from('store_items')
          .update(payload)
          .eq('id', editingItem.id);

        if (error) {
          console.error('[Produtos] Erro ao atualizar item:', error.message);
          Alert.alert('Erro', 'Não foi possível atualizar o item.');
          setSaving(false);
          return;
        }
      }

      setModalVisible(false);
      setEditingItem(null);
      setLocalImageUri(null);
      await loadItems(activeTab);
    } catch (err) {
      console.error('[Produtos] Erro inesperado ao salvar item:', err);
      Alert.alert('Erro', 'Ocorreu um erro inesperado ao salvar o item.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteItem(item: StoreItem) {
    if (!isDiretoriaOrAdmin) {
      Alert.alert('Permissão', 'Apenas a diretoria pode excluir.');
      return;
    }

    Alert.alert(
      'Excluir',
      'Tem certeza de que deseja excluir este item?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('store_items')
                .delete()
                .eq('id', item.id);

              if (error) {
                console.error(
                  '[Produtos] Erro ao excluir item:',
                  error.message
                );
                Alert.alert('Erro', 'Não foi possível excluir o item.');
                return;
              }

              await loadItems(activeTab);
            } catch (err) {
              console.error(
                '[Produtos] Erro inesperado ao excluir item:',
                err
              );
              Alert.alert(
                'Erro',
                'Ocorreu um erro inesperado ao excluir o item.'
              );
            }
          },
        },
      ]
    );
  }

  function handleBuyWhatsApp(item: StoreItem) {
    const phone = '554796526090';
    const title = item.title?.trim() || 'um item';
    const message = `Vim pelo aplicativo HandLuz e gostaria de comprar "${title}".`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    Linking.openURL(url).catch(() => {
      Alert.alert('Erro', 'Não foi possível abrir o WhatsApp.');
    });
  }

  // ------ renderização ------

  const isProductTab = activeTab === 'product';

  if (loading && items.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={AppTheme.primary} />
        <Text style={{ marginTop: 8 }}>Carregando {isProductTab ? 'produtos' : 'eventos'}...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Abas Produtos / Eventos */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            isProductTab && styles.tabButtonActive,
          ]}
          onPress={() => setActiveTab('product')}
        >
          <Ionicons
            name="shirt-outline"
            size={16}
            color={isProductTab ? '#FFF' : AppTheme.textSecondary}
          />
          <Text
            style={[
              styles.tabButtonText,
              isProductTab && styles.tabButtonTextActive,
            ]}
          >
            Produtos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            !isProductTab && styles.tabButtonActive,
          ]}
          onPress={() => setActiveTab('event')}
        >
          <Ionicons
            name="calendar-outline"
            size={16}
            color={!isProductTab ? '#FFF' : AppTheme.textSecondary}
          />
          <Text
            style={[
              styles.tabButtonText,
              !isProductTab && styles.tabButtonTextActive,
            ]}
          >
            Eventos
          </Text>
        </TouchableOpacity>
      </View>

      {/* Lista */}
      {items.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>
            Nenhum {isProductTab ? 'produto' : 'evento'} cadastrado.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
          renderItem={({ item }) => {
            const imageUrl = getImagePublicUrl(item.image_path);
            const isEvent = item.type === 'event';

            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.nome}>{item.title || 'Sem título'}</Text>
                    {!!item.description && (
                      <Text style={styles.descricao} numberOfLines={2}>
                        {item.description}
                      </Text>
                    )}
                    <Text style={styles.tagLinha}>
                      <Ionicons
                        name={isEvent ? 'megaphone-outline' : 'pricetag-outline'}
                        size={13}
                        color={AppTheme.textSecondary}
                      />{' '}
                      {isEvent ? 'Evento' : 'Produto'}
                      {isEvent && item.end_date
                        ? ` • até ${isoToDisplay(item.end_date)}`
                        : ''}
                    </Text>
                  </View>

                  {imageUrl && (
                    <Image
                      source={{ uri: imageUrl }}
                      style={styles.cardImage}
                    />
                  )}
                </View>

                <View style={styles.cardFooter}>
                  <Text style={styles.preco}>
                    {formatPriceDisplay(item.price)}
                  </Text>

                  <View style={styles.cardActionsRow}>
                    <TouchableOpacity
                      style={styles.buyButton}
                      onPress={() => handleBuyWhatsApp(item)}
                    >
                      <Ionicons
                        name="logo-whatsapp"
                        size={16}
                        color="#FFF"
                      />
                      <Text style={styles.buyButtonText}>Comprar</Text>
                    </TouchableOpacity>

                    {isDiretoriaOrAdmin && (
                      <>
                        <TouchableOpacity
                          style={styles.iconButton}
                          onPress={() => openEditItemModal(item)}
                        >
                          <Ionicons
                            name="create-outline"
                            size={18}
                            color={AppTheme.textSecondary}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.iconButton}
                          onPress={() => handleDeleteItem(item)}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={18}
                            color="#D32F2F"
                          />
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* FAB – apenas diretoria */}
      {isDiretoriaOrAdmin && (
        <TouchableOpacity
          style={styles.fab}
          onPress={openNewItemModal}
          activeOpacity={0.9}
        >
          <Ionicons name="add" size={26} color="#FFF" />
        </TouchableOpacity>
      )}

      {/* Modal de cadastro/edição */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!saving) {
            setModalVisible(false);
            setEditingItem(null);
            setLocalImageUri(null);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editingItem
                ? `Editar ${isProductTab ? 'produto' : 'evento'}`
                : `Novo ${isProductTab ? 'produto' : 'evento'}`}
            </Text>

            <Text style={styles.fieldLabel}>Título (opcional)</Text>
            <TextInput
              style={styles.input}
              value={formTitle}
              onChangeText={setFormTitle}
              placeholder={
                isProductTab
                  ? 'Ex.: Moletom oficial, camiseta, agasalho...'
                  : 'Ex.: Rifa, venda de pizzas, feijoada...'
              }
            />

            <Text style={styles.fieldLabel}>Descrição (opcional)</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              value={formDescription}
              onChangeText={setFormDescription}
              placeholder="Detalhes sobre o produto ou evento."
              multiline
            />

            <Text style={styles.fieldLabel}>Valor (opcional)</Text>
            <TextInput
              style={[
                styles.input,
                fieldErrors.price && styles.inputError,
              ]}
              value={formPrice}
              onChangeText={setFormPrice}
              placeholder="Ex.: 59,90"
              keyboardType="decimal-pad"
            />
            {fieldErrors.price && (
              <Text style={styles.errorText}>{fieldErrors.price}</Text>
            )}

            {!isProductTab && (
              <>
                <Text style={styles.fieldLabel}>
                  Data de término (opcional)
                </Text>
                <TextInput
                  style={styles.input}
                  value={formEndDateDisplay}
                  onChangeText={text => {
                    const digits = text.replace(/\D/g, '').slice(0, 8);
                    setFormEndDateDigits(digits);
                    setFormEndDateDisplay(maskDate(digits));
                  }}
                  placeholder="dd/mm/aaaa"
                  keyboardType="number-pad"
                />
              </>
            )}

            <Text style={styles.fieldLabel}>Imagem (opcional)</Text>
            <View style={styles.imageRow}>
              <TouchableOpacity
                style={styles.selectImageButton}
                onPress={pickImage}
              >
                <Ionicons
                  name="image-outline"
                  size={18}
                  color={AppTheme.primary}
                />
                <Text style={styles.selectImageButtonText}>
                  Selecionar imagem
                </Text>
              </TouchableOpacity>

              {localImageUri && (
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setLocalImageUri(null)}
                >
                  <Ionicons
                    name="close-circle-outline"
                    size={18}
                    color="#D32F2F"
                  />
                </TouchableOpacity>
              )}
            </View>

            {localImageUri && (
              <Image
                source={{ uri: localImageUri }}
                style={styles.previewImage}
              />
            )}

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonOutline]}
                onPress={() => {
                  if (!saving) {
                    setModalVisible(false);
                    setEditingItem(null);
                    setLocalImageUri(null);
                  }
                }}
              >
                <Text style={styles.modalButtonOutlineText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleSaveItem}
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

// ----------------- estilos -----------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppTheme.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: AppTheme.textSecondary,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
    gap: 8,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: AppTheme.border,
    backgroundColor: AppTheme.surface,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: AppTheme.primary,
    borderColor: AppTheme.primary,
  },
  tabButtonText: {
    fontSize: 13,
    color: AppTheme.textSecondary,
  },
  tabButtonTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
  card: {
    backgroundColor: AppTheme.surface,
    padding: 12,
    borderRadius: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: AppTheme.border,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: 10,
  },
  cardImage: {
    width: 70,
    height: 70,
    borderRadius: 10,
    backgroundColor: '#EEE',
  },
  nome: {
    fontWeight: '600',
    fontSize: 15,
    color: AppTheme.textPrimary,
    marginBottom: 2,
  },
  descricao: {
    fontSize: 13,
    color: AppTheme.textSecondary,
    marginBottom: 4,
  },
  tagLinha: {
    fontSize: 12,
    color: AppTheme.textSecondary,
  },
  cardFooter: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  preco: {
    fontSize: 14,
    fontWeight: '700',
    color: AppTheme.primaryDark,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#25D366',
    marginRight: 6,
  },
  buyButtonText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
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
    gap: 8,
  },
  selectImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: AppTheme.primary,
    backgroundColor: '#E8F3EC',
  },
  selectImageButtonText: {
    marginLeft: 4,
    fontSize: 12,
    color: AppTheme.primary,
    fontWeight: '600',
  },
  removeImageButton: {
    padding: 4,
  },
  previewImage: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    marginTop: 8,
    backgroundColor: '#EEE',
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
