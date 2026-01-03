// app/screens/ProfileScreen.tsx
// Tela de perfil do usuário logado (Visualização e Logout)

import React, { useState, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { AppTheme } from '../../constants/theme';
import { useAuth } from '../context/AuthContext';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user, signOut, loading: authLoading } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  useLayoutEffect(() => {
    // 1. Esconde o cabeçalho "branco" do navegador Pai (que está duplicando)
    navigation.getParent()?.setOptions({ headerShown: false });

    // 2. Configura o cabeçalho DESTA tela para ser o Verde
    navigation.setOptions({
      headerShown: true,
      headerTitle: 'Meu Perfil',
      headerStyle: {
        backgroundColor: AppTheme.primary, // Fundo Verde
      },
      headerTintColor: '#FFFFFF', // Texto/Seta Brancos
      headerShadowVisible: false,
    });
  }, [navigation]);

  if (!user) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.errorText}>
          Nenhum usuário autenticado. Faça login novamente.
        </Text>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => navigation.navigate('LoginMain' as never)}
          activeOpacity={0.9}
        >
          <Text style={styles.loginButtonText}>Ir para Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function getRoleLabel(role: string | null) {
    if (role === 'admin') return 'Administrador do Sistema';
    if (role === 'diretoria') return 'Membro da Diretoria / Técnico';
    return 'Usuário / Atleta';
  }

  function getRoleDescription(role: string | null) {
    if (role === 'admin') return 'Acesso total a todas as configurações, gestão de times, diretoria e financeiro.';
    if (role === 'diretoria') return 'Pode gerenciar times, atletas, agenda de treinos e visualizar dados administrativos.';
    return 'Pode visualizar seus treinos, carteirinha digital e agenda de jogos.';
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await signOut();
    } catch (err) {
      console.error('[ProfileScreen] Erro ao fazer logout:', err);
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Subtítulo simples, já que o título principal está na barra verde */}
        <Text style={styles.subtitle}>
          Seus dados de acesso e nível de permissão no HandLuz.
        </Text>

        {/* CARTÃO DE IDENTIFICAÇÃO */}
        <View style={styles.idCard}>
          <View style={styles.avatarContainer}>
             <Ionicons name="person" size={32} color={AppTheme.primary} />
          </View>
          <View style={styles.idCardContent}>
            <Text style={styles.idCardName}>{user.fullName || 'Usuário'}</Text>
            <Text style={styles.idCardEmail}>{user.email}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>
                {user.role ? user.role.toUpperCase() : 'USUÁRIO'}
              </Text>
            </View>
          </View>
        </View>

        {/* INFORMAÇÕES DE ACESSO */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nível de Acesso</Text>
          <View style={styles.infoBox}>
            <Ionicons name="shield-checkmark-outline" size={24} color={AppTheme.primary} style={{marginBottom: 8}} />
            <Text style={styles.infoLabel}>{getRoleLabel(user.role)}</Text>
            <Text style={styles.infoValue}>
              {getRoleDescription(user.role)}
            </Text>
            <Text style={styles.infoNote}>
              * Para alterar seu nível de acesso, contate um administrador.
            </Text>
          </View>
        </View>

        {/* BOTÃO DE LOGOUT */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={loggingOut || authLoading}
          activeOpacity={0.9}
        >
          {loggingOut ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={20} color="#FFF" style={{marginRight: 8}} />
              <Text style={styles.logoutButtonText}>Sair da conta</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.versionText}>HandLuz App v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

// ==================== ESTILOS ====================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppTheme.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: AppTheme.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  // Estilo que faltava anteriormente
  errorText: {
    fontSize: 16,
    color: '#D32F2F',
    textAlign: 'center',
    marginBottom: 16,
  },
  loginButton: {
    marginTop: 16,
    backgroundColor: AppTheme.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 15,
  },
  subtitle: {
    fontSize: 14,
    color: AppTheme.textSecondary,
    marginBottom: 20,
    marginTop: 4, 
  },
  
  // Cartão de Identidade
  idCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AppTheme.border,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E8F3EC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  idCardContent: {
    flex: 1,
  },
  idCardName: {
    fontSize: 18,
    fontWeight: '700',
    color: AppTheme.textPrimary,
  },
  idCardEmail: {
    fontSize: 13,
    color: AppTheme.textMuted,
    marginTop: 2,
  },
  roleBadge: {
    marginTop: 6,
    backgroundColor: AppTheme.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  roleBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },

  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AppTheme.textPrimary,
    marginBottom: 10,
  },
  infoBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: AppTheme.border,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: AppTheme.textPrimary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    color: AppTheme.textSecondary,
    lineHeight: 20,
  },
  infoNote: {
    marginTop: 12,
    fontSize: 12,
    color: AppTheme.textMuted,
    fontStyle: 'italic',
  },

  logoutButton: {
    marginTop: 8,
    backgroundColor: '#D32F2F', // Vermelho para logout
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 16,
  },
  versionText: {
    textAlign: 'center',
    marginTop: 24,
    color: AppTheme.textMuted,
    fontSize: 12,
  },
});