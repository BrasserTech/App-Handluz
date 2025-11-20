// app/services/api.ts
// API simulada, usando dados em memória.
// Depois basta trocar a implementação por chamadas Supabase.

import { mockData } from './mockData';
import {
  Atleta,
  Equipe,
  Treinamento,
  Produto,
  MembroDiretoria,
} from './models';

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function listarAtletas(): Promise<Atleta[]> {
  await delay(300);
  return mockData.atletas;
}

export async function listarEquipes(): Promise<Equipe[]> {
  await delay(300);
  return mockData.equipes;
}

export async function listarTreinamentos(): Promise<Treinamento[]> {
  await delay(300);
  return mockData.treinamentos;
}

export async function listarProdutos(): Promise<Produto[]> {
  await delay(300);
  return mockData.produtos;
}

export async function listarDiretoria(): Promise<MembroDiretoria[]> {
  await delay(300);
  return mockData.diretoria;
}
