// app/services/instagramService.ts
// Serviço simplificado para buscar posts do Instagram via servidor

import { INSTAGRAM_USERNAME } from '../../constants/instagram';

export type InstagramPost = {
  id: string;
  shortcode: string;
  imageUrl: string;
  caption: string;
  timestamp: string;
  permalink: string;
  likes: number;
};

/**
 * Detecta a URL base do servidor baseado na origem atual
 */
function getServerUrl(): string {
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    // Se estiver na porta 3000 (servidor), usar a mesma origem
    if (origin.includes(':3000')) {
      return origin;
    }
    // Caso contrário, tentar localhost:3000
    return 'http://localhost:3000';
  }
  // Para React Native ou outros ambientes
  return 'http://localhost:3000';
}

/**
 * Busca posts do Instagram via servidor
 */
export async function fetchInstagramPosts(): Promise<InstagramPost[]> {
  const serverUrl = getServerUrl();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(
      `${serverUrl}/api/instagram/posts?username=${INSTAGRAM_USERNAME}`,
      {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      }
    );
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.posts?.length > 0) {
        return data.posts;
      }
    }
  } catch (err) {
    // Servidor não está disponível ou erro de rede
  }
  
  return [];
}
