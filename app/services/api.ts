// app/services/api.ts
// API do aplicativo HandLuz, agora consumindo Supabase em vez de mockData.

import { supabase } from './supabaseClient';
import {
  Atleta,
  Equipe,
  Treinamento,
  Produto,
  MembroDiretoria,
} from './models';

// Atenção: os nomes das tabelas abaixo pressupõem
// que você utilizou o script SQL que criamos anteriormente.
// Ajuste se o nome real das tabelas for diferente.
const TABLES = {
  atletas: 'athletes',
  equipes: 'teams',
  treinamentos: 'trainings',
  produtos: 'products',
  diretoria: 'board_members',
};

export async function listarAtletas(): Promise<Atleta[]> {
  const { data, error } = await supabase
    .from(TABLES.atletas)
    .select('*')
    .order('full_name', { ascending: true });

  if (error) {
    console.error('[listarAtletas] Erro Supabase:', error.message);
    throw error;
  }

  return (data ?? []) as Atleta[];
}

export async function listarEquipes(): Promise<Equipe[]> {
  const { data, error } = await supabase
    .from(TABLES.equipes)
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('[listarEquipes] Erro Supabase:', error.message);
    throw error;
  }

  return (data ?? []) as Equipe[];
}

export async function listarTreinamentos(): Promise<Treinamento[]> {
  const { data, error } = await supabase
    .from(TABLES.treinamentos)
    .select('*')
    .order('training_date', { ascending: true });

  if (error) {
    console.error('[listarTreinamentos] Erro Supabase:', error.message);
    throw error;
  }

  return (data ?? []) as Treinamento[];
}

export async function listarProdutos(): Promise<Produto[]> {
  const { data, error } = await supabase
    .from(TABLES.produtos)
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('[listarProdutos] Erro Supabase:', error.message);
    throw error;
  }

  return (data ?? []) as Produto[];
}

export async function listarDiretoria(): Promise<MembroDiretoria[]> {
  const { data, error } = await supabase
    .from(TABLES.diretoria)
    .select('*')
    .order('order_index', { ascending: true });

  if (error) {
    console.error('[listarDiretoria] Erro Supabase:', error.message);
    throw error;
  }

  return (data ?? []) as MembroDiretoria[];
}
