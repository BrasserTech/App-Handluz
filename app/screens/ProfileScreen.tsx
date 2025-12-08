// app/screens/ProfileScreen.tsx
// Tela de perfil do usuário logado (profiles + AuthContext, sem supabase.auth)

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { AppTheme } from '../../constants/theme';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';

type RoleValue = 'usuario' | 'diretoria' | 'admin';

const ROLE_OPTIONS: { value: RoleValue; label: string; description: string }[] = [
  {
    value: 'usuario',
    label: 'Usuário / Atleta',
    description: 'Participante comum (atleta ou usuário geral).',
  },
  {
    value: 'diretoria',
    label: 'Técnico / Diretoria',
    description: 'Técnico, comissão ou membro da diretoria.',
  },
  {
    value: 'admin',
    label: 'Admin HandLuz',
    description: 'Administração geral do sistema HandLuz.',
  },
];

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user, refreshProfile, signOut, loading: authLoading } = useAuth();

  const [selectedRole, setSelectedRole] = useState<RoleValue>('usuario');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [comboOpen, setComboOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (user?.role && ['usuario', 'diretoria', 'admin'].includes(user.role)) {
      setSelectedRole(user.role as RoleValue);
    }
  }, [user]);

  if (!user) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.errorText}>
          Nenhum usuário autenticado. Faça login novamente.
        </Text>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => navigation.navigate('AppTabs' as never, { screen: 'Perfil' })}
          activeOpacity={0.9}
        >
          <Text style={styles.loginButtonText}>Ir para Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function getRoleLabel(value: RoleValue) {
    const found = ROLE_OPTIONS.find(o => o.value === value);
    return found ? found.label : value;
  }

  function getRoleDescription(value: RoleValue) {
    const found = ROLE_OPTIONS.find(o => o.value === value);
    return found ? found.description : '';
  }

  function handleChangeRole(value: RoleValue) {
    setSelectedRole(value);
    setComboOpen(false);
  }

  async function handleSaveRole() {
    const currentEmail = user?.email;
    if (!currentEmail) return;

    setSaving(true);
    setFeedback(null);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: selectedRole })
        .eq('email', currentEmail);

      if (updateError) {
        console.error('[ProfileScreen] Erro ao atualizar role:', updateError.message);
        setError('Não foi possível salvar o tipo de usuário. Tente novamente.');
        return;
      }

      if (typeof refreshProfile === 'function') {
        await refreshProfile();
      }

      setFeedback('Tipo de usuário atualizado com sucesso!');
    } catch (err) {
      console.error('[ProfileScreen] Erro inesperado ao salvar role:', err);
      setError('Ocorreu um erro inesperado ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
      setComboOpen(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await signOut();
      // O ProfileStackNavigator detecta automaticamente a mudança de estado
      // e navega para LoginMain quando o usuário é removido
    } catch (err) {
      console.error('[ProfileScreen] Erro ao fazer logout:', err);
      setError('Erro ao fazer logout. Tente novamente.');
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
        {/* TÍTULO E INTRODUÇÃO (PADRÃO, SEM CARD) */}
        <Text style={styles.title}>Meu perfil</Text>
        <Text style={styles.subtitle}>
          Veja seus dados de acesso e defina como você participa do HandLuz.
        </Text>

        {/* INFORMAÇÕES PESSOAIS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações pessoais</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Nome completo</Text>
            <Text style={styles.infoValue}>{user.fullName ?? '—'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>E-mail</Text>
            <Text style={styles.infoValue}>{user.email ?? '—'}</Text>
          </View>
        </View>

        {/* PAPEL NO HANDLUZ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Papel no HandLuz</Text>
          <Text style={styles.sectionHelper}>
            Selecione se você atua como atleta/usuário, técnico/diretoria
            ou administrador do sistema.
          </Text>

          <View style={styles.comboWrapper}>
            <Text style={styles.comboLabel}>Tipo de usuário</Text>

            <TouchableOpacity
              style={styles.combo}
              onPress={() => setComboOpen(prev => !prev)}
              activeOpacity={0.85}
            >
              <View style={styles.comboTextWrapper}>
                <Text style={styles.comboSelectedText}>
                  {getRoleLabel(selectedRole)}
                </Text>
                <Text style={styles.comboDescription}>
                  {getRoleDescription(selectedRole)}
                </Text>
              </View>
              <Text style={styles.comboArrow}>{comboOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {comboOpen && (
              <View style={styles.comboList}>
                {ROLE_OPTIONS.map(option => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.comboItem,
                      option.value === selectedRole && styles.comboItemSelected,
                    ]}
                    onPress={() => handleChangeRole(option.value)}
                  >
                    <Text
                      style={[
                        styles.comboItemLabel,
                        option.value === selectedRole && styles.comboItemLabelSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                    <Text style={styles.comboItemDescription}>
                      {option.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* FEEDBACK E BOTÃO */}
        {feedback && <Text style={styles.feedbackText}>{feedback}</Text>}
        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSaveRole}
          disabled={saving}
          activeOpacity={0.9}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveButtonText}>Salvar alterações</Text>
          )}
        </TouchableOpacity>

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
            <Text style={styles.logoutButtonText}>Sair da conta</Text>
          )}
        </TouchableOpacity>
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
    paddingVertical: 16,
    paddingBottom: 24,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: AppTheme.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
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
  section: {
    marginTop: 12,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: AppTheme.textPrimary,
    marginBottom: 8,
  },
  sectionHelper: {
    fontSize: 12,
    color: AppTheme.textMuted,
    marginBottom: 10,
  },
  infoRow: {
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 12,
    color: AppTheme.textMuted,
  },
  infoValue: {
    fontSize: 14,
    color: AppTheme.textPrimary,
    fontWeight: '500',
    marginTop: 2,
  },
  comboWrapper: {
    marginTop: 4,
  },
  comboLabel: {
    fontSize: 13,
    color: AppTheme.textSecondary,
    marginBottom: 4,
  },
  combo: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AppTheme.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  comboTextWrapper: {
    flex: 1,
  },
  comboSelectedText: {
    fontSize: 14,
    color: AppTheme.textPrimary,
    fontWeight: '600',
  },
  comboDescription: {
    fontSize: 12,
    color: AppTheme.textMuted,
    marginTop: 2,
  },
  comboArrow: {
    marginLeft: 8,
    fontSize: 12,
    color: AppTheme.textSecondary,
  },
  comboList: {
    marginTop: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: AppTheme.border,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  comboItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.border,
  },
  comboItemSelected: {
    backgroundColor: '#E8F3EC',
  },
  comboItemLabel: {
    fontSize: 14,
    color: AppTheme.textPrimary,
    fontWeight: '500',
  },
  comboItemLabelSelected: {
    color: AppTheme.primary,
  },
  comboItemDescription: {
    fontSize: 12,
    color: AppTheme.textMuted,
    marginTop: 2,
  },
  saveButton: {
    marginTop: 18,
    backgroundColor: AppTheme.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 15,
  },
  feedbackText: {
    marginTop: 10,
    fontSize: 13,
    color: '#2E7D32',
  },
  errorText: {
    marginTop: 10,
    fontSize: 13,
    color: '#D32F2F',
    textAlign: 'left',
  },
  logoutButton: {
    marginTop: 12,
    backgroundColor: '#D32F2F',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 15,
  },
});
