// app/context/AuthContext.tsx
// Autenticação customizada baseada em public.profiles + public.passwords
// NÃO usa supabase.auth nem auth.users.

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
} from 'react';
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

export function AuthProvider({ children }: Props) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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

      setUser({
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        role: (profile.role as HandluzRole) ?? 'usuario',
        isBoard: !!profile.is_board,
      });
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
