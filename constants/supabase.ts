// constants/supabase.ts
// Configuração de acesso do APP (Expo/React Native) ao Supabase.
// Aqui deve ser usada SOMENTE a anon/public key.
// As chaves são lidas de variáveis de ambiente (.env) para melhor segurança.

import Constants from 'expo-constants';

// Função para obter variáveis de ambiente de forma segura
// NÃO aceita fallbacks - força uso do .env para segurança
const getEnvVar = (key: string): string => {
  // 1. Tentar ler variáveis EXPO_PUBLIC_ primeiro (mais confiável no modo web do Expo)
  // O Expo automaticamente expõe variáveis com prefixo EXPO_PUBLIC_ no cliente
  const expoPublicKey = `EXPO_PUBLIC_${key}`;
  if (typeof process !== 'undefined' && process.env && process.env[expoPublicKey]) {
    return process.env[expoPublicKey];
  }
  
  // 2. Tentar ler de Constants.expoConfig.extra (configurado no app.json/app.config.js)
  const extra = Constants.expoConfig?.extra;
  if (extra && extra[key]) {
    return extra[key];
  }
  
  // 3. Tentar ler de process.env diretamente (para web/build time)
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  
  // 4. Tentar ler de window.__ENV__ (se injetado pelo servidor em runtime)
  if (typeof window !== 'undefined' && (window as any).__ENV__ && (window as any).__ENV__[key]) {
    return (window as any).__ENV__[key];
  }
  
  // Se não encontrar, lançar erro para forçar configuração no .env
  throw new Error(
    `Variável de ambiente ${key} não encontrada. Configure no arquivo .env como ${key} ou ${expoPublicKey}.`
  );
};

export const SUPABASE_URL = getEnvVar('SUPABASE_URL');

// Copie exatamente o valor da linha "anon, public" da tela de API do Supabase.
export const SUPABASE_ANON_KEY = getEnvVar('SUPABASE_ANON_KEY');
