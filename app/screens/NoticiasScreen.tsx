import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  Modal,
  TouchableOpacity,
} from 'react-native';

import { AppTheme } from '../../constants/theme';
import { supabase } from '../services/supabaseClient';

type NewsItem = {
  id: string;
  title: string;
  description?: string | null;
  image_url?: string | null;
  created_at: string | null;
};

function formatDate(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('pt-BR');
}

export default function NoticiasScreen() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    loadNews();
  }, []);

  async function loadNews() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('news')
        .select('id, title, description, image_url, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[Noticias] Erro ao carregar notícias:', error.message);
        if (error.message.includes('does not exist')) {
          const fallbackResp = await supabase
            .from('news')
            .select('id, title, created_at')
            .order('created_at', { ascending: false });
          if (fallbackResp.error) {
            console.error('[Noticias] Erro ao carregar notícias:', fallbackResp.error.message);
          } else {
            setNews((fallbackResp.data ?? []) as NewsItem[]);
          }
        }
      } else {
        setNews((data ?? []) as NewsItem[]);
      }
    } catch (err) {
      console.error('[Noticias] Erro inesperado ao carregar notícias:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
    >
      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={AppTheme.primary} />
        </View>
      )}

      {news.length === 0 ? (
        <Text style={styles.emptyText}>Nenhuma notícia cadastrada.</Text>
      ) : (
        news.map(item => (
          <View key={item.id} style={styles.newsCard}>
            {item.image_url ? (
              <TouchableOpacity activeOpacity={0.9} onPress={() => setPreviewImage(item.image_url ?? null)}>
                <Image source={{ uri: item.image_url }} style={styles.newsImage} resizeMode="cover" />
              </TouchableOpacity>
            ) : null}
            <View style={styles.newsHeader}>
              <Text style={styles.newsTitle} numberOfLines={2}>{item.title}</Text>
              {item.created_at ? (
                <Text style={styles.newsDate}>{formatDate(item.created_at)}</Text>
              ) : null}
            </View>
            {item.description ? (
              <Text style={styles.newsDescription} numberOfLines={3}>{item.description}</Text>
            ) : null}
          </View>
        ))
      )}

      <Modal
        visible={!!previewImage}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImage(null)}
      >
        <View style={styles.previewOverlay}>
          <TouchableOpacity style={styles.previewBackdrop} onPress={() => setPreviewImage(null)} />
          <View style={styles.previewCard}>
            {previewImage ? (
              <Image source={{ uri: previewImage }} style={styles.previewImage} resizeMode="contain" />
            ) : null}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppTheme.background,
  },
  loadingRow: {
    paddingVertical: 12,
  },
  emptyText: {
    fontSize: 13,
    color: AppTheme.textSecondary,
  },
  newsCard: {
    backgroundColor: AppTheme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppTheme.border,
    padding: 16,
    marginBottom: 14,
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  newsImage: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    marginBottom: 12,
  },
  newsHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  newsTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: AppTheme.textPrimary,
    flex: 1,
  },
  newsDate: {
    fontSize: 11,
    color: AppTheme.textSecondary,
    marginTop: 2,
  },
  newsDescription: {
    marginTop: 6,
    fontSize: 13,
    color: AppTheme.textSecondary,
    lineHeight: 18,
  },
  previewOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  previewBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  previewCard: {
    width: '100%',
    maxWidth: 900,
    maxHeight: '90%',
    borderRadius: 16,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 520,
  },
});
