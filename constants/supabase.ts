// constants/supabase.ts
// Configuração de acesso do APP (Expo/React Native) ao Supabase.
// Aqui deve ser usada SOMENTE a anon/public key.
// As chaves são lidas de variáveis de ambiente (.env) para melhor segurança.

import Constants from 'expo-constants';

// Função para obter variáveis de ambiente de forma segura
// NÃO aceita fallbacks - força uso do .env para segurança
const getEnvVar = (key: string): string => {
  // Tentar ler de Constants.expoConfig.extra (configurado no app.json)
  const extra = Constants.expoConfig?.extra;
  if (extra && extra[key]) {
    return extra[key];
  }
  
  // Tentar ler de process.env (para web/build time)
  // No build web, o Expo injeta variáveis que começam com EXPO_PUBLIC_ ou estão disponíveis no build
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  
  // Tentar ler de window.__ENV__ (se injetado pelo servidor em runtime)
  if (typeof window !== 'undefined' && (window as any).__ENV__ && (window as any).__ENV__[key]) {
    return (window as any).__ENV__[key];
  }
  
  // Se não encontrar, lançar erro para forçar configuração no .env
  throw new Error(
    `Variável de ambiente ${key} não encontrada. Configure no arquivo .env.`
  );
};

export const SUPABASE_URL = getEnvVar('SUPABASE_URL');

// Copie exatamente o valor da linha "anon, public" da tela de API do Supabase.
export const SUPABASE_ANON_KEY = getEnvVar('SUPABASE_ANON_KEY');
