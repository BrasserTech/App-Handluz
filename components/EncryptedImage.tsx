// components/EncryptedImage.tsx
// Componente que descriptografa e exibe imagens do Supabase apenas quando o usuário está autenticado.

import React, { useState, useEffect } from 'react';
import { Image, ImageProps, View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../app/context/AuthContext';
import { downloadAndDecryptImage } from '../app/services/imageEncryption';
import { Ionicons } from '@expo/vector-icons';
import { AppTheme } from '../constants/theme';
import { usePermissions } from '../hooks/usePermissions';

interface EncryptedImageProps extends Omit<ImageProps, 'source'> {
  encryptedUrl: string | null;
  placeholderIcon?: keyof typeof Ionicons.glyphMap;
  placeholderColor?: string;
}

/**
 * Componente que descriptografa e exibe imagens criptografadas do Supabase.
 * A imagem só é descriptografada e exibida se o usuário estiver autenticado.
 */
export default function EncryptedImage({
  encryptedUrl,
  placeholderIcon = 'image-outline',
  placeholderColor = AppTheme.textMuted,
  style,
  ...imageProps
}: EncryptedImageProps) {
  const { user } = useAuth();
  const { canViewEncryptedDocuments } = usePermissions();
  const [decryptedUrl, setDecryptedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;

    async function loadImage() {
      // Se não há URL, não faz nada
      if (!encryptedUrl) {
        setLoading(false);
        setError(true);
        return;
      }

      // Verificar se o usuário tem permissão para ver documentos criptografados
      // Apenas Técnico/Diretoria/Admin podem descriptografar
      if (!user || !canViewEncryptedDocuments) {
        setLoading(false);
        setError(true);
        return;
      }

      try {
        setLoading(true);
        setError(false);
        
        console.log('[EncryptedImage] Iniciando descriptografia da URL:', encryptedUrl);
        
        // Baixar e descriptografar a imagem
        const url = await downloadAndDecryptImage(encryptedUrl);
        
        console.log('[EncryptedImage] URL descriptografada:', url ? 'sucesso' : 'falhou');
        
        if (url) {
          objectUrl = url;
          setDecryptedUrl(url);
        } else {
          console.warn('[EncryptedImage] downloadAndDecryptImage retornou null');
          setError(true);
        }
      } catch (err) {
        console.error('[EncryptedImage] Erro ao carregar imagem:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    loadImage();

    // Cleanup: revogar URL do objeto quando o componente desmontar ou a URL mudar
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [encryptedUrl, user, canViewEncryptedDocuments]);

  // Se está carregando, mostra indicador
  if (loading) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size="small" color={AppTheme.primary} />
      </View>
    );
  }

  // Se há erro ou usuário não tem permissão, mostra placeholder
  if (error || !decryptedUrl || !user || !canViewEncryptedDocuments) {
    return (
      <View style={[styles.container, styles.placeholder, style]}>
        <Ionicons name={placeholderIcon} size={24} color={placeholderColor} />
      </View>
    );
  }

  // Exibe a imagem descriptografada
  return (
    <Image
      {...imageProps}
      source={{ uri: decryptedUrl }}
      style={style}
      resizeMode="contain"
      onError={(error) => {
        console.error('[EncryptedImage] Erro ao carregar imagem descriptografada:', error);
        setError(true);
        setLoading(false);
      }}
      onLoad={() => {
        console.log('[EncryptedImage] Imagem carregada com sucesso');
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AppTheme.background,
  },
  placeholder: {
    backgroundColor: AppTheme.surface,
    borderWidth: 1,
    borderColor: AppTheme.border,
    borderStyle: 'dashed',
  },
});

