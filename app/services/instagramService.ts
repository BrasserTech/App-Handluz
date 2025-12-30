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
 * Sempre usa a origem atual do navegador, já que o servidor serve tudo na mesma origem
 */
function getServerUrl(): string {
  if (typeof window !== 'undefined' && window.location) {
    const origin = window.location.origin;
    console.log(`[Instagram Service] Detectando URL do servidor: ${origin}`);
    // Sempre usar a origem atual, já que o servidor serve tanto o HTML quanto a API
    return origin;
  }
  // Para React Native ou outros ambientes
  console.warn(`[Instagram Service] window não disponível, usando localhost:3000`);
  return 'http://localhost:3000';
}

/**
 * Busca posts do Instagram via servidor
 */
export async function fetchInstagramPosts(): Promise<InstagramPost[]> {
  // Garantir que sempre usa a origem atual, mesmo se chamado antes do window estar pronto
  let serverUrl: string;
  
  if (typeof window !== 'undefined' && window.location) {
    serverUrl = window.location.origin;
    console.log(`[Instagram Service] Usando origem do navegador: ${serverUrl}`);
  } else {
    // Fallback apenas para desenvolvimento local
    serverUrl = 'http://localhost:3000';
    console.warn(`[Instagram Service] window não disponível, usando fallback: ${serverUrl}`);
  }
  
  const apiUrl = `${serverUrl}/api/instagram/posts?username=${INSTAGRAM_USERNAME}`;
  console.log(`[Instagram Service] Buscando posts de: ${apiUrl}`);
  
  try {
    const controller = new AbortController();
    // Aumentar timeout para 60 segundos (Instagram pode demorar para encontrar imagens)
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`[Instagram Service] Resposta recebida: success=${data.success}, posts=${data.posts?.length || 0}`);
      
      // Exibir erros do Instagram no console do navegador
      if (data.error) {
        console.error(`[Instagram Service] ❌ ERRO DO INSTAGRAM:`, data.error);
        if (data.errorDetails) {
          console.error(`[Instagram Service] Detalhes do erro:`, data.errorDetails);
        }
        
        // Mensagem amigável para o usuário
        if (data.error.includes('401') || data.error.includes('Unauthorized')) {
          console.error(`[Instagram Service] 🔒 Instagram bloqueou a requisição. Motivo: Requisição não autorizada (pode ser bloqueio temporário ou rate limiting).`);
        } else if (data.error.includes('403') || data.error.includes('Forbidden')) {
          console.error(`[Instagram Service] 🚫 Instagram bloqueou a requisição. Motivo: Acesso negado (perfil pode ser privado ou bloqueado).`);
        } else if (data.error.includes('429') || data.error.includes('Too Many Requests')) {
          console.error(`[Instagram Service] ⏱️ Instagram está limitando requisições. Motivo: Muitas requisições em pouco tempo. Aguarde alguns minutos.`);
        } else if (data.error.includes('Timeout')) {
          console.error(`[Instagram Service] ⏰ Timeout na requisição. Motivo: Instagram demorou muito para responder.`);
        } else {
          console.error(`[Instagram Service] ⚠️ Erro ao buscar posts do Instagram: ${data.error}`);
        }
      }
      
      if (data.success && data.posts?.length > 0) {
        return data.posts;
      } else if (data.error) {
        // Retornar array vazio mas o erro já foi logado
        return [];
      }
    } else {
      console.error(`[Instagram Service] Erro HTTP: ${response.status} ${response.statusText}`);
      const errorText = await response.text().catch(() => '');
      console.error(`[Instagram Service] Resposta do servidor:`, errorText);
    }
  } catch (err: any) {
    // Servidor não está disponível ou erro de rede
    console.error(`[Instagram Service] ❌ Erro ao buscar posts:`, err.message || err);
    console.error(`[Instagram Service] URL tentada: ${apiUrl}`);
    
    if (err.name === 'AbortError') {
      console.error(`[Instagram Service] ⏰ Timeout: A requisição demorou mais de 60 segundos`);
    } else if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
      console.error(`[Instagram Service] 🌐 Erro de rede: Não foi possível conectar ao servidor`);
    } else {
      console.error(`[Instagram Service] ⚠️ Erro desconhecido:`, err);
    }
  }
  
  return [];
}
