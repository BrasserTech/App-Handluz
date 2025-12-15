// app/hooks/usePermissions.ts
// Centraliza derivados de permissão com base no AuthContext.
// Evita reconsultar o Supabase em todas as telas.

import { useMemo } from 'react';
import { useAuth } from '../app/context/AuthContext';

export function usePermissions() {
  const { user } = useAuth();

  const isDiretoriaOrAdmin = useMemo(
    () => user?.role === 'diretoria' || user?.role === 'admin',
    [user?.role]
  );

  // Permissão para ver documentos criptografados (Técnico/Diretoria/Admin)
  const canViewEncryptedDocuments = useMemo(
    () => user?.role === 'diretoria' || user?.role === 'admin',
    [user?.role]
  );

  return {
    user,
    isDiretoriaOrAdmin,
    canViewEncryptedDocuments,
  };
}
