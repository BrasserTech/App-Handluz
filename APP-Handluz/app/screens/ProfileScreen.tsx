// app/screens/ProfileScreen.tsx
// Tela de perfil do usuário logado (profiles + AuthContext, sem supabase.auth)

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';

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
  const { user, refreshProfile } = useAuth();

  const [selectedRole, setSelectedRole] = useState<RoleValue>('usuario');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [comboOpen, setComboOpen] = useState(false);

  useEffect(() => {
    if (user?.role && ['usuario', 'diretoria', 'admin'].includes(user.role)) {
      setSelectedRole(user.role as RoleValue);
    }
  }, [user]);

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          Nenhum usuário autenticado. Faça login novamente.
        </Text>
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
    // captura segura do e-mail para o TypeScript
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

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: AppTheme.background }}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.card}>
        <Image
          source={{
            uri: 'https://images.pexels.com/photos/114296/pexels-photo-114296.jpeg',
          }}
          style={styles.heroImage}
        />

        <Text style={styles.title}>Meu perfil</Text>
        <Text style={styles.subtitle}>
          Veja seus dados de acesso e defina como você participa do HandLuz.
        </Text>

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
  centered: {
    flex: 1,
    backgroundColor: AppTheme.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
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
    width: '100%',
    height: 150,
    borderRadius: 14,
    marginBottom: 16,
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
    textAlign: 'center',
  },
});
