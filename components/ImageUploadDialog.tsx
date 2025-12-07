// components/ImageUploadDialog.tsx
// Componente de upload de imagem para atletas com validação, preview e salvamento no Supabase.

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../app/services/supabaseClient';
import { AppTheme } from '../constants/theme';

type ImageUploadDialogProps = {
  visible: boolean;
  athleteId: string;
  athleteName: string;
  onClose: () => void;
  onSuccess?: () => void;
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB em bytes
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export default function ImageUploadDialog({
  visible,
  athleteId,
  athleteName,
  onClose,
  onSuccess,
}: ImageUploadDialogProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageInfo, setImageInfo] = useState<{
    uri: string;
    type: string;
    size: number;
    name: string;
  } | null>(null);
  const [uploading, setUploading] = useState(false);

  // Solicitar permissão e escolher imagem
  async function handlePickImage() {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permissão necessária',
          'Precisamos de permissão para acessar as fotos do dispositivo.'
        );
        return;
      }

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
      const uri = asset.uri;

      // Validar tipo de arquivo
      const fileExtension = uri.split('.').pop()?.toLowerCase() || '';
      const mimeType = `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`;

      if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) {
        Alert.alert(
          'Tipo de arquivo inválido',
          'Por favor, selecione apenas imagens (JPG, PNG ou WEBP).'
        );
        return;
      }

      // Obter informações do arquivo
      const response = await fetch(uri);
      const blob = await response.blob();

      // Validar tamanho
      if (blob.size > MAX_FILE_SIZE) {
        Alert.alert(
          'Arquivo muito grande',
          `O arquivo selecionado tem ${(blob.size / 1024 / 1024).toFixed(2)}MB. O tamanho máximo permitido é 5MB.`
        );
        return;
      }

      setSelectedImage(uri);
      setImageInfo({
        uri,
        type: mimeType,
        size: blob.size,
        name: `athlete-${athleteId}-${Date.now()}.${fileExtension}`,
      });
    } catch (error) {
      console.error('[ImageUploadDialog] Erro ao escolher imagem:', error);
      Alert.alert('Erro', 'Não foi possível acessar a imagem selecionada.');
    }
  }

  // Fazer upload da imagem
  async function handleUpload() {
    if (!selectedImage || !imageInfo) {
      Alert.alert('Erro', 'Selecione uma imagem antes de fazer o upload.');
      return;
    }

    setUploading(true);

    try {
      // 1. Converter URI para blob
      const response = await fetch(imageInfo.uri);
      const blob = await response.blob();

      // 2. Definir caminho no storage
      const filePath = `athlete-images/${athleteId}/${imageInfo.name}`;

      // 3. Upload para Supabase Storage (bucket "images")
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, blob, {
          contentType: imageInfo.type,
          upsert: false, // Não sobrescrever se já existir
        });

      if (uploadError) {
        console.error('[ImageUploadDialog] Erro no upload:', uploadError);
        Alert.alert(
          'Erro no upload',
          `Não foi possível fazer o upload da imagem: ${uploadError.message}`
        );
        setUploading(false);
        return;
      }

      // 4. Obter URL pública
      const { data: urlData } = supabase.storage
        .from('images')
        .getPublicUrl(uploadData.path);

      const publicUrl = urlData.publicUrl;

      // 5. Salvar informações no banco de dados (tabela athlete_images)
      const { error: dbError } = await supabase.from('athlete_images').insert({
        file_path: uploadData.path,
        file_url: publicUrl,
        file_name: imageInfo.name,
        file_size: imageInfo.size,
        file_type: imageInfo.type,
        bucket_name: 'images',
        athlete_id: athleteId,
        uploaded_at: new Date().toISOString(),
      });

      if (dbError) {
        console.error('[ImageUploadDialog] Erro ao salvar no banco:', dbError);
        // Tentar remover o arquivo do storage se falhou ao salvar no banco
        await supabase.storage.from('images').remove([uploadData.path]);
        Alert.alert(
          'Erro ao salvar',
          `Não foi possível salvar as informações da imagem: ${dbError.message}`
        );
        setUploading(false);
        return;
      }

      // 6. Toast de sucesso (usando Alert como alternativa)
      Alert.alert('Sucesso!', 'Imagem do atleta enviada com sucesso.', [
        {
          text: 'OK',
          onPress: () => {
            // Limpar estado e fechar
            setSelectedImage(null);
            setImageInfo(null);
            onClose();
            if (onSuccess) {
              onSuccess();
            }
          },
        },
      ]);
    } catch (error) {
      console.error('[ImageUploadDialog] Erro inesperado:', error);
      Alert.alert(
        'Erro inesperado',
        'Ocorreu um erro ao fazer o upload da imagem. Tente novamente.'
      );
    } finally {
      setUploading(false);
    }
  }

  function handleClose() {
    if (!uploading) {
      setSelectedImage(null);
      setImageInfo(null);
      onClose();
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Upload de Imagem</Text>
            <TouchableOpacity
              onPress={handleClose}
              disabled={uploading}
              style={styles.closeButton}
            >
              <Ionicons
                name="close"
                size={24}
                color={AppTheme.textPrimary}
              />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.athleteName}>{athleteName}</Text>
            <Text style={styles.subtitle}>
              Selecione uma imagem do atleta para fazer upload
            </Text>

            {/* Preview da imagem */}
            {selectedImage ? (
              <View style={styles.previewContainer}>
                <Image
                  source={{ uri: selectedImage }}
                  style={styles.previewImage}
                  resizeMode="cover"
                />
                {imageInfo && (
                  <View style={styles.imageInfo}>
                    <Text style={styles.imageInfoText}>
                      Tamanho: {formatFileSize(imageInfo.size)}
                    </Text>
                    <Text style={styles.imageInfoText}>
                      Tipo: {imageInfo.type}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.emptyPreview}>
                <Ionicons
                  name="image-outline"
                  size={64}
                  color={AppTheme.textMuted}
                />
                <Text style={styles.emptyPreviewText}>
                  Nenhuma imagem selecionada
                </Text>
              </View>
            )}

            {/* Botão de escolher imagem */}
            <TouchableOpacity
              style={styles.pickButton}
              onPress={handlePickImage}
              disabled={uploading}
            >
              <Ionicons
                name="image-outline"
                size={20}
                color={AppTheme.primary}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.pickButtonText}>
                {selectedImage ? 'Trocar imagem' : 'Escolher imagem'}
              </Text>
            </TouchableOpacity>

            {/* Informações de validação */}
            <View style={styles.validationInfo}>
              <Text style={styles.validationText}>
                • Apenas imagens (JPG, PNG, WEBP)
              </Text>
              <Text style={styles.validationText}>
                • Tamanho máximo: 5MB
              </Text>
            </View>
          </ScrollView>

          {/* Footer com botões */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={uploading}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.uploadButton,
                (!selectedImage || uploading) && styles.uploadButtonDisabled,
              ]}
              onPress={handleUpload}
              disabled={!selectedImage || uploading}
            >
              {uploading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Ionicons
                    name="cloud-upload-outline"
                    size={18}
                    color="#FFF"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.uploadButtonText}>Fazer Upload</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  dialog: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: AppTheme.surface,
    borderRadius: 16,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: AppTheme.border,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: AppTheme.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 16,
  },
  athleteName: {
    fontSize: 16,
    fontWeight: '600',
    color: AppTheme.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: AppTheme.textSecondary,
    marginBottom: 16,
  },
  previewContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  previewImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AppTheme.border,
    marginBottom: 12,
  },
  imageInfo: {
    alignItems: 'center',
  },
  imageInfoText: {
    fontSize: 12,
    color: AppTheme.textMuted,
    marginTop: 4,
  },
  emptyPreview: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AppTheme.background,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: AppTheme.border,
    marginBottom: 16,
  },
  emptyPreviewText: {
    fontSize: 14,
    color: AppTheme.textMuted,
    marginTop: 12,
  },
  pickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: AppTheme.primary,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  pickButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: AppTheme.primary,
  },
  validationInfo: {
    backgroundColor: AppTheme.background,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  validationText: {
    fontSize: 12,
    color: AppTheme.textSecondary,
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: AppTheme.border,
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    minWidth: 120,
  },
  cancelButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: AppTheme.border,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: AppTheme.textSecondary,
  },
  uploadButton: {
    backgroundColor: AppTheme.primary,
  },
  uploadButtonDisabled: {
    backgroundColor: AppTheme.textMuted,
    opacity: 0.6,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

