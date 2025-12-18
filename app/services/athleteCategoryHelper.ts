// app/services/athleteCategoryHelper.ts
// Helper para buscar category_id de um time
// (Função utilitária para uso em diferentes partes do código)

import { supabase } from './supabaseClient';

/**
 * Busca o category_id de um time
 * @param teamId - ID do time
 * @returns category_id do time ou null se não houver
 */
export async function buscarCategoryIdDoTime(
  teamId: string
): Promise<number | null> {
  try {
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('category_id')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      console.error(
        '[buscarCategoryIdDoTime] Erro ao buscar time:',
        teamError?.message
      );
      return null;
    }

    return team.category_id || null;
  } catch (error) {
    console.error('[buscarCategoryIdDoTime] Erro inesperado:', error);
    return null;
  }
}

