import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabaseClient';

// TIPO ATUALIZADO: Inclui todas as possibilidades para evitar erros de TypeScript
export type HandluzRole = 'usuario' | 'diretoria' | 'admin' | 'atleta';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: HandluzRole;
  isBoard: boolean;
  isAthlete: boolean;
  isUser: boolean;
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
const STORAGE_USER_KEY = 'handluz_auth_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadSavedUser(); }, []);

  async function loadSavedUser() {
    try {
      const savedUserJson = await AsyncStorage.getItem(STORAGE_USER_KEY);
      if (savedUserJson) {
        const savedUser: AuthUser = JSON.parse(savedUserJson);
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, email, full_name, role, is_board, is_athlete, is_user')
          .eq('id', savedUser.id)
          .single();

        if (profile) {
          const authUser: AuthUser = {
            id: profile.id,
            email: profile.email,
            fullName: profile.full_name,
            role: (profile.role as HandluzRole) ?? 'usuario',
            isBoard: !!profile.is_board,
            isAthlete: !!profile.is_athlete,
            isUser: !!profile.is_user,
          };
          setUser(authUser);
          await AsyncStorage.setItem(STORAGE_USER_KEY, JSON.stringify(authUser));
        } else {
          await AsyncStorage.removeItem(STORAGE_USER_KEY);
        }
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  async function saveUser(userData: AuthUser | null) {
    if (userData) await AsyncStorage.setItem(STORAGE_USER_KEY, JSON.stringify(userData));
    else await AsyncStorage.removeItem(STORAGE_USER_KEY);
  }

  async function signIn(email: string, password: string): Promise<boolean> {
    setLoading(true);
    try {
      const { data: profile } = await supabase.from('profiles').select('*').eq('email', email.trim()).single();
      if (!profile) return false;

      const { data: passRow } = await supabase.from('passwords').select('*').eq('profile_id', profile.id).single();
      if (!passRow || passRow.password !== password) return false;

      const authUser: AuthUser = {
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        role: (profile.role as HandluzRole) ?? 'usuario',
        isBoard: !!profile.is_board,
        isAthlete: !!profile.is_athlete,
        isUser: !!profile.is_user,
      };
      setUser(authUser);
      await saveUser(authUser);
      return true;
    } catch { return false; } finally { setLoading(false); }
  }

  async function signOut() {
    setUser(null);
    await saveUser(null);
  }

  async function refreshProfile() {}

  return (
    <AuthContext.Provider value={{ user, loading, error, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}