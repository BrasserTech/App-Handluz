// app/screens/LoginScreen.tsx
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
import { useAuth, HandluzRole } from '../context/AuthContext'; // Importando o tipo correto
import { AppTheme } from '../../constants/theme';
import { supabase } from '../services/supabaseClient';

type Mode = 'login' | 'register';

const STORAGE_REMEMBER_FLAG = 'handluz_remember_me';
const STORAGE_LAST_EMAIL = 'handluz_last_email';

export default function LoginScreen() {
  const navigation = useNavigation();
  const { user, signIn, signOut, loading, error } = useAuth();

  const [mode, setMode] = useState<Mode>('login');

  // Campos
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  
  // Estado para o Role (Padrão: usuario)
  const [role, setRole] = useState<HandluzRole>('usuario');
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const isBusy = loading || submitting;
  const globalError = error ?? null;
  const showError = localError || globalError;

  // Carregar "lembrar de mim"
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

      // 1) Verifica existência
      const { data: existing, error: existingError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.trim())
        .maybeSingle();

      if (existingError) {
        console.error('[LoginScreen] Erro check e-mail:', existingError.message);
        setLocalError('Erro ao verificar e-mail.');
        return;
      }

      if (existing) {
        setLocalError('Este e-mail já está cadastrado.');
        return;
      }

      // 2) Cria perfil salvando a ROLE diretamente
      // Se for diretoria, salvamos is_board = true também para garantir, mas a role é o principal
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          email: email.trim(),
          full_name: fullName.trim(),
          role: role, // Salva 'usuario', 'atleta' ou 'diretoria'
          is_board: role === 'diretoria', // Mantém coerência com campo legado se existir
        })
        .select('id')
        .single();

      if (profileError || !profile) {
        console.error('[LoginScreen] Erro ao criar perfil:', profileError?.message);
        setLocalError('Erro ao criar perfil.');
        return;
      }

      // 3) Salva senha
      const { error: passError } = await supabase.from('passwords').insert({
        profile_id: profile.id,
        password,
      });

      if (passError) {
        console.error('[LoginScreen] Erro ao salvar senha:', passError.message);
        setLocalError('Criado, mas erro ao salvar senha.');
        return;
      }

      setLocalError(null);
      setMode('login');
      alert('Conta criada! Faça login.');
      
    } catch (err) {
      console.error('[LoginScreen] Erro:', err);
      setLocalError('Erro inesperado no cadastro.');
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

  // ==================== DROPDOWN COMPONENT ====================
  const renderRoleSelector = () => {
    const getLabel = (r: HandluzRole) => {
      switch(r) {
        case 'diretoria': return 'Diretoria';
        case 'atleta': return 'Atleta';
        case 'usuario': return 'Usuário / Torcedor';
        default: return 'Selecione';
      }
    };

    // Opções disponíveis para cadastro
    const options: HandluzRole[] = ['usuario', 'atleta', 'diretoria'];

    return (
      <View style={{ marginBottom: 10 }}>
        <Text style={styles.fieldLabel}>Tipo de conta</Text>
        <TouchableOpacity
          style={[styles.input, styles.dropdownButton]}
          onPress={() => setShowRoleDropdown(!showRoleDropdown)}
          activeOpacity={0.8}
        >
          <Text style={{ color: AppTheme.textPrimary }}>{getLabel(role)}</Text>
          <Text style={{ color: AppTheme.textSecondary }}>▼</Text>
        </TouchableOpacity>

        {showRoleDropdown && (
          <View style={styles.dropdownList}>
            {options.map((item) => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.dropdownItem,
                  role === item && styles.dropdownItemSelected
                ]}
                onPress={() => {
                  setRole(item);
                  setShowRoleDropdown(false);
                }}
              >
                <Text style={[
                  styles.dropdownItemText,
                  role === item && { color: AppTheme.primary, fontWeight: 'bold' }
                ]}>
                  {getLabel(item)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  // ==================== RENDER ====================

  if (user) {
    return (
      <View style={styles.loggedRoot}>
        <View style={styles.card}>
          <Image source={LogoHandluz} style={styles.heroImage} />
          <Text style={styles.title}>Bem-vindo(a), {user.fullName}</Text>
          
          <Text style={styles.subtitle}>
            Você é: {' '}
            {user.role === 'atleta' ? 'Atleta' : 
             user.role === 'diretoria' ? 'Diretoria' : 
             user.role === 'admin' ? 'Admin' : 'Usuário'}
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
            {isBusy ? <ActivityIndicator color="#FFF" /> : <Text style={styles.mainButtonText}>Sair</Text>}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: AppTheme.background }}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.card}>
        <Image source={LogoHandluz} style={styles.heroImage} />

        <Text style={styles.title}>{mode === 'login' ? 'Login HandLuz' : 'Crie sua conta'}</Text>
        <Text style={styles.subtitle}>
          {mode === 'login' ? 'Acesse com seu e-mail.' : 'Preencha os dados abaixo.'}
        </Text>

        {mode === 'register' && (
          <>
            <Text style={styles.fieldLabel}>Nome completo</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Seu nome"
              placeholderTextColor="#999"
            />
            {renderRoleSelector()}
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
          placeholderTextColor="#999"
        />

        <Text style={styles.fieldLabel}>Senha</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          placeholder="Senha"
          placeholderTextColor="#999"
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
              placeholderTextColor="#999"
            />
          </>
        )}

        {showError && <Text style={styles.errorText}>{showError}</Text>}

        {mode === 'login' && (
          <View style={styles.rememberRow}>
            <TouchableOpacity style={styles.checkbox} onPress={() => setRememberMe(!rememberMe)}>
              {rememberMe && <View style={styles.checkboxInner} />}
            </TouchableOpacity>
            <Text style={styles.rememberText}>Lembrar de mim</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.mainButton}
          onPress={mode === 'login' ? handleLogin : handleRegister}
          disabled={isBusy}
        >
          {isBusy ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.mainButtonText}>{mode === 'login' ? 'Entrar' : 'Criar conta'}</Text>
          )}
        </TouchableOpacity>

        <View style={styles.switchRow}>
          {mode === 'login' ? (
            <>
              <Text style={styles.switchText}>Ainda não tem conta?</Text>
              <TouchableOpacity onPress={() => { setMode('register'); setLocalError(null); }}>
                <Text style={styles.switchLink}>Criar conta</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.switchText}>Já possui conta?</Text>
              <TouchableOpacity onPress={() => { setMode('login'); setLocalError(null); }}>
                <Text style={styles.switchLink}>Fazer login</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

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
    elevation: 3,
  },
  heroImage: { width: 120, height: 120, alignSelf: 'center', marginBottom: 16, resizeMode: 'contain' },
  title: { fontSize: 22, fontWeight: '700', color: AppTheme.textPrimary, marginBottom: 6 },
  subtitle: { fontSize: 13, color: AppTheme.textSecondary, marginBottom: 16 },
  fieldLabel: { fontSize: 13, color: AppTheme.textSecondary, marginBottom: 4, marginTop: 8 },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: AppTheme.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: AppTheme.textPrimary,
  },
  dropdownButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dropdownList: {
    marginTop: 4,
    backgroundColor: '#FFFFFF',
    borderColor: AppTheme.border,
    borderWidth: 1,
    borderRadius: 10,
    elevation: 4,
  },
  dropdownItem: { paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  dropdownItemSelected: { backgroundColor: '#F5F9F5' },
  dropdownItemText: { fontSize: 14, color: AppTheme.textPrimary },
  errorText: { marginTop: 10, color: '#D32F2F', fontSize: 13 },
  mainButton: { backgroundColor: AppTheme.primary, paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  mainButtonText: { color: '#FFF', fontWeight: '600', fontSize: 15 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
  switchText: { fontSize: 13, color: AppTheme.textSecondary, marginRight: 4 },
  switchLink: { fontSize: 13, color: AppTheme.primary, fontWeight: '600' },
  rememberRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1, borderColor: AppTheme.border, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  checkboxInner: { width: 12, height: 12, borderRadius: 3, backgroundColor: AppTheme.primary },
  rememberText: { fontSize: 13, color: AppTheme.textSecondary },
  loggedRoot: { flex: 1, backgroundColor: AppTheme.background, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 },
  profileInfo: { width: '100%', marginTop: 8 },
  infoLabel: { fontSize: 12, color: AppTheme.textMuted, marginTop: 6 },
  infoValue: { fontSize: 14, color: AppTheme.textPrimary, fontWeight: '500' },
  logoutButton: { backgroundColor: '#D32F2F', marginTop: 24 },
});