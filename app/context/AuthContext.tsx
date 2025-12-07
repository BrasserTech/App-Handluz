// app/context/AuthContext.tsx
// Autenticação customizada baseada em public.profiles + public.passwords
// NÃO usa supabase.auth nem auth.users.

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabaseClient';

export type HandluzRole = 'usuario' | 'diretoria' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: HandluzRole;
  isBoard: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface Props {
  children: ReactNode;
}

const STORAGE_USER_KEY = 'handluz_auth_user';

export function AuthProvider({ children }: Props) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true); // Inicia como true para carregar estado salvo
  const [error, setError] = useState<string | null>(null);

  // Carrega o usuário salvo quando o componente é montado
  useEffect(() => {
    loadSavedUser();
  }, []);

  async function loadSavedUser() {
    try {
      const savedUserJson = await AsyncStorage.getItem(STORAGE_USER_KEY);
      if (savedUserJson) {
        const savedUser: AuthUser = JSON.parse(savedUserJson);
        // Verifica se o perfil ainda existe no banco
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, email, full_name, role, is_board')
          .eq('id', savedUser.id)
          .single();

        if (!profileError && profile) {
          // Atualiza com dados mais recentes
          const authUser: AuthUser = {
            id: profile.id,
            email: profile.email,
            fullName: profile.full_name,
            role: (profile.role as HandluzRole) ?? 'usuario',
            isBoard: !!profile.is_board,
          };
          setUser(authUser);
          // Salva novamente com dados atualizados
          await AsyncStorage.setItem(STORAGE_USER_KEY, JSON.stringify(authUser));
        } else {
          // Perfil não existe mais, remove do storage
          await AsyncStorage.removeItem(STORAGE_USER_KEY);
        }
      }
    } catch (e) {
      console.error('[AuthContext] Erro ao carregar usuário salvo:', e);
    } finally {
      setLoading(false);
    }
  }

  async function saveUser(userData: AuthUser | null) {
    try {
      if (userData) {
        await AsyncStorage.setItem(STORAGE_USER_KEY, JSON.stringify(userData));
      } else {
        await AsyncStorage.removeItem(STORAGE_USER_KEY);
      }
    } catch (e) {
      console.error('[AuthContext] Erro ao salvar usuário:', e);
    }
  }

  async function signIn(email: string, password: string): Promise<boolean> {
    setLoading(true);
    setError(null);

    try {
      // 1) Busca perfil pelo e-mail
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, is_board')
        .eq('email', email.trim())
        .single();

      if (profileError || !profile) {
        setError('Usuário não encontrado.');
        return false;
      }

      // 2) Busca senha na tabela passwords
      const { data: passRow, error: passError } = await supabase
        .from('passwords')
        .select('id, password')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (passError || !passRow) {
        setError('Senha não cadastrada para este usuário.');
        return false;
      }

      if (passRow.password !== password) {
        setError('E-mail ou senha inválidos.');
        return false;
      }

      // 3) Login bem-sucedido
      const authUser: AuthUser = {
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        role: (profile.role as HandluzRole) ?? 'usuario',
        isBoard: !!profile.is_board,
      };

      setUser(authUser);
      await saveUser(authUser); // Salva no AsyncStorage
      setError(null);
      return true;
    } catch (e: any) {
      console.error('[AuthContext] Erro inesperado no signIn:', e);
      setError('Erro inesperado ao tentar fazer login.');
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function signOut(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      setUser(null);
      await saveUser(null); // Remove do AsyncStorage
    } catch (e: any) {
      console.error('[AuthContext] Erro inesperado no signOut:', e);
      setError('Erro inesperado ao sair.');
    } finally {
      setLoading(false);
    }
  }

  async function refreshProfile(): Promise<void> {
    if (!user) return;

    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, is_board')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) return;

      const updatedUser: AuthUser = {
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        role: (profile.role as HandluzRole) ?? 'usuario',
        isBoard: !!profile.is_board,
      };

      setUser(updatedUser);
      await saveUser(updatedUser); // Atualiza no AsyncStorage
    } catch (e) {
      console.error('[AuthContext] Erro ao atualizar perfil:', e);
    }
  }

  const value: AuthContextValue = {
    user,
    loading,
    error,
    signIn,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return ctx;
}
