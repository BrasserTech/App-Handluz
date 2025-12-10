// app/screens/LoginScreen.tsx
// Tela de login/cadastro usando tabelas public.profiles + public.passwords

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LogoHandluz from '../../logo_handluz.png';
import { useAuth } from '../context/AuthContext';
import { AppTheme } from '../../constants/theme';
import { supabase } from '../services/supabaseClient';

type Mode = 'login' | 'register';

const STORAGE_REMEMBER_FLAG = 'handluz_remember_me';
const STORAGE_LAST_EMAIL = 'handluz_last_email';

export default function LoginScreen() {
  const navigation = useNavigation();
  const { user, signIn, signOut, loading, error } = useAuth();

  const [mode, setMode] = useState<Mode>('login');

  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [rememberMe, setRememberMe] = useState<boolean>(false);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const isBusy = loading || submitting;
  const globalError = error ?? null;
  const showError = localError || globalError;

  // ========= carregar "lembrar de mim" ao abrir =========
  useEffect(() => {
    (async () => {
      try {
        const flag = await AsyncStorage.getItem(STORAGE_REMEMBER_FLAG);
        const savedEmail = await AsyncStorage.getItem(STORAGE_LAST_EMAIL);
        if (flag === 'true' && savedEmail) {
          setRememberMe(true);
          setEmail(savedEmail);
        }
      } catch (e) {
        console.warn('[LoginScreen] Erro ao carregar rememberMe:', e);
      }
    })();
  }, []);

  async function persistRememberState(ok: boolean) {
    if (!ok) return;
    try {
      if (rememberMe && email.trim()) {
        await AsyncStorage.setItem(STORAGE_REMEMBER_FLAG, 'true');
        await AsyncStorage.setItem(STORAGE_LAST_EMAIL, email.trim());
      } else {
        await AsyncStorage.removeItem(STORAGE_REMEMBER_FLAG);
        await AsyncStorage.removeItem(STORAGE_LAST_EMAIL);
      }
    } catch (e) {
      console.warn('[LoginScreen] Erro ao salvar rememberMe:', e);
    }
  }

  // ==================== AÇÕES ====================

  async function handleLogin() {
    setSubmitting(true);
    setLocalError(null);

    const ok = await signIn(email.trim(), password);
    await persistRememberState(ok);

    setSubmitting(false);

    if (ok) {
      // Navega para a tela de Perfil após login bem-sucedido
      navigation.navigate('ProfileMain' as never);
    }
  }

  async function handleRegister() {
    setSubmitting(true);
    setLocalError(null);

    try {
      if (!fullName.trim()) {
        setLocalError('Informe o nome completo.');
        return;
      }
      if (!email.trim()) {
        setLocalError('Informe um e-mail válido.');
        return;
      }
      if (!password || password.length < 6) {
        setLocalError('A senha deve ter pelo menos 6 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        setLocalError('As senhas não coincidem.');
        return;
      }

      // 1) Verifica se já existe perfil com esse e-mail
      const { data: existing, error: existingError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.trim())
        .maybeSingle();

      if (existingError) {
        console.error('[LoginScreen] Erro ao verificar e-mail existente:', existingError.message);
        setLocalError('Erro ao verificar e-mail existente.');
        return;
      }

      if (existing) {
        setLocalError('Este e-mail já está cadastrado.');
        return;
      }

      // 2) Cria perfil
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          email: email.trim(),
          full_name: fullName.trim(),
          role: 'usuario',
          is_board: false,
        })
        .select('id, email, full_name, role, is_board')
        .single();

      if (profileError || !profile) {
        console.error('[LoginScreen] Erro ao criar perfil:', profileError?.message);
        setLocalError('Erro ao criar perfil.');
        return;
      }

      // 3) Salva senha em texto plano na tabela passwords (apenas DEV)
      const { error: passError } = await supabase.from('passwords').insert({
        profile_id: profile.id,
        password,
      });

      if (passError) {
        console.error('[LoginScreen] Erro ao salvar senha:', passError.message);
        setLocalError('Usuário criado, mas houve erro ao salvar a senha.');
        return;
      }

      // 4) Cadastro concluído – volta para tela anterior (ou muda para modo login)
      setLocalError(null);
      setMode('login');
    } catch (err) {
      console.error('[LoginScreen] Erro inesperado no cadastro:', err);
      setLocalError('Erro inesperado ao realizar cadastro.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    setSubmitting(true);
    await signOut();
    setSubmitting(false);
    navigation.goBack();
  }

  // ==================== ESTADO LOGADO ====================

  if (user) {
    return (
      <View style={styles.loggedRoot}>
        <View style={styles.card}>
          <Image
            source={LogoHandluz}
            style={styles.heroImage}
          />

          <Text style={styles.title}>
            Bem-vindo(a), {user.fullName ?? 'Membro'}
          </Text>
          <Text style={styles.subtitle}>
            Você está autenticado no HandLuz como{' '}
            {user.role === 'diretoria'
              ? 'Diretoria'
              : user.role === 'admin'
              ? 'Admin'
              : 'Usuário'}.
          </Text>

          <View style={styles.profileInfo}>
            <Text style={styles.infoLabel}>E-mail</Text>
            <Text style={styles.infoValue}>{user.email}</Text>
          </View>

          <TouchableOpacity
            style={[styles.mainButton, styles.logoutButton]}
            onPress={handleLogout}
            disabled={isBusy}
          >
            {isBusy ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.mainButtonText}>Sair</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ==================== ESTADO NÃO LOGADO ====================

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: AppTheme.background }}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.card}>
        {/* IMAGEM DE DESTAQUE */}
        <Image
          source={LogoHandluz}
          style={styles.heroImage}
        />

        <Text style={styles.title}>
          {mode === 'login' ? 'Login HandLuz' : 'Crie sua conta'}
        </Text>
        <Text style={styles.subtitle}>
          {mode === 'login'
            ? 'Acesse com seu e-mail e senha cadastrados pela diretoria.'
            : 'Preencha os dados para criar sua conta no HandLuz.'}
        </Text>

        {mode === 'register' && (
          <>
            <Text style={styles.fieldLabel}>Nome completo</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Seu nome"
            />
          </>
        )}

        <Text style={styles.fieldLabel}>E-mail</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          placeholder="seu@email.com"
        />

        <Text style={styles.fieldLabel}>Senha</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          placeholder="Senha"
        />

        {mode === 'register' && (
          <>
            <Text style={styles.fieldLabel}>Confirmar senha</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Repita a senha"
            />
          </>
        )}

        {/* Erros (auth ou locais) */}
        {showError && <Text style={styles.errorText}>{showError}</Text>}

        {/* Lembrar de mim (apenas no login) */}
        {mode === 'login' && (
          <View style={styles.rememberRow}>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => setRememberMe(prev => !prev)}
            >
              {rememberMe && <View style={styles.checkboxInner} />}
            </TouchableOpacity>
            <Text style={styles.rememberText}>Lembrar de mim</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.mainButton}
          onPress={mode === 'login' ? handleLogin : handleRegister}
          disabled={
            isBusy ||
            !email ||
            !password ||
            (mode === 'register' && (!fullName || !confirmPassword))
          }
        >
          {isBusy ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.mainButtonText}>
              {mode === 'login' ? 'Entrar' : 'Criar conta'}
            </Text>
          )}
        </TouchableOpacity>

        {/* TROCA LOGIN / CADASTRO */}
        <View style={styles.switchRow}>
          {mode === 'login' ? (
            <>
              <Text style={styles.switchText}>Ainda não tem conta?</Text>
              <TouchableOpacity onPress={() => setMode('register')}>
                <Text style={styles.switchLink}>Criar conta</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.switchText}>Já possui conta?</Text>
              <TouchableOpacity onPress={() => setMode('login')}>
                <Text style={styles.switchLink}>Fazer login</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

// ==================== ESTILOS ====================

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: AppTheme.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: AppTheme.border,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
heroImage: {
  width: 120,          // tamanho ideal para logos quadradas
  height: 120,
  alignSelf: 'center',
  marginBottom: 16,
  resizeMode: 'contain',
},
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: AppTheme.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: AppTheme.textSecondary,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    color: AppTheme.textSecondary,
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: AppTheme.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  errorText: {
    marginTop: 10,
    color: '#D32F2F',
    fontSize: 13,
  },
  mainButton: {
    backgroundColor: AppTheme.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  mainButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 15,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  switchText: {
    fontSize: 13,
    color: AppTheme.textSecondary,
    marginRight: 4,
  },
  switchLink: {
    fontSize: 13,
    color: AppTheme.primary,
    fontWeight: '600',
  },

  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: AppTheme.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  checkboxInner: {
    width: 12,
    height: 12,
    borderRadius: 3,
    backgroundColor: AppTheme.primary,
  },
  rememberText: {
    fontSize: 13,
    color: AppTheme.textSecondary,
  },

  loggedRoot: {
    flex: 1,
    backgroundColor: AppTheme.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  profileInfo: {
    width: '100%',
    marginTop: 8,
  },
  infoLabel: {
    fontSize: 12,
    color: AppTheme.textMuted,
    marginTop: 6,
  },
  infoValue: {
    fontSize: 14,
    color: AppTheme.textPrimary,
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: '#D32F2F',
    marginTop: 24,
  },
});
