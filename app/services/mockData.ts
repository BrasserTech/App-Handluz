// app/services/mockData.ts
// Dados fictícios para desenvolvimento sem banco

import {
  Atleta,
  Categoria,
  Equipe,
  Treinamento,
  Produto,
  CargoDiretoria,
  MembroDiretoria,
} from './models';

const categorias: Categoria[] = [
  { id: 1, nome: 'Sub-13 Feminino', idadeMinima: 11, idadeMaxima: 13, sexo: 'F' },
  { id: 2, nome: 'Sub-15 Masculino', idadeMinima: 13, idadeMaxima: 15, sexo: 'M' },
];

const equipes: Equipe[] = [
  {
    id: 'eq-1',
    nome: 'HandLuz Sub-13 Fem',
    apelido: 'Sub-13 F',
    categoria: categorias[0],
    sexo: 'F',
    anoFundacao: 2022,
    ativa: true,
  },
  {
    id: 'eq-2',
    nome: 'HandLuz Sub-15 Masc',
    apelido: 'Sub-15 M',
    categoria: categorias[1],
    sexo: 'M',
    anoFundacao: 2021,
    ativa: true,
  },
];

const atletas: Atleta[] = [
  {
    id: 'at-1',
    nomeCompleto: 'Ana Silva',
    apelido: 'Aninha',
    dataNascimento: '2011-03-10',
    posicao: 'Ponta Direita',
    alturaCm: 150,
    pesoKg: 40,
    telefone: '(49) 99999-0001',
    equipeAtual: equipes[0],
    ativo: true,
  },
  {
    id: 'at-2',
    nomeCompleto: 'Beatriz Souza',
    apelido: 'Bia',
    dataNascimento: '2010-07-22',
    posicao: 'Armadora Central',
    alturaCm: 155,
    pesoKg: 45,
    telefone: '(49) 99999-0002',
    equipeAtual: equipes[0],
    ativo: true,
  },
  {
    id: 'at-3',
    nomeCompleto: 'Carlos Oliveira',
    apelido: 'Carlão',
    dataNascimento: '2009-01-05',
    posicao: 'Goleiro',
    alturaCm: 160,
    pesoKg: 52,
    telefone: '(49) 99999-0003',
    equipeAtual: equipes[1],
    ativo: true,
  },
];

const treinamentos: Treinamento[] = [
  {
    id: 'tr-1',
    titulo: 'Treino tático Sub-13',
    descricao: 'Foco em sistema defensivo 6:0.',
    dataInicio: '2025-11-25T18:00:00',
    dataFim: '2025-11-25T19:30:00',
    local: 'Ginásio Municipal',
    tipo: 'Tático',
    equipe: equipes[0],
  },
  {
    id: 'tr-2',
    titulo: 'Treino físico Sub-15',
    descricao: 'Resistência e explosão.',
    dataInicio: '2025-11-26T18:00:00',
    dataFim: '2025-11-26T19:30:00',
    local: 'Ginásio Municipal',
    tipo: 'Físico',
    equipe: equipes[1],
  },
];

const produtos: Produto[] = [
  {
    id: 'pr-1',
    nome: 'Camiseta Oficial HandLuz',
    descricao: 'Camiseta azul oficial da equipe.',
    categoria: 'Vestuário',
    preco: 79.9,
    ativo: true,
  },
  {
    id: 'pr-2',
    nome: 'Moletom HandLuz',
    descricao: 'Moletom preto com logo.',
    categoria: 'Vestuário',
    preco: 149.9,
    ativo: true,
  },
];

const cargos: CargoDiretoria[] = [
  { id: 1, nome: 'Presidente', ordem: 1 },
  { id: 2, nome: 'Vice-presidente', ordem: 2 },
  { id: 3, nome: 'Diretor Técnico', ordem: 3 },
];

const diretoria: MembroDiretoria[] = [
  {
    id: 'dir-1',
    nome: 'João Pereira',
    cargo: cargos[0],
    dataInicioMandato: '2024-01-01',
    telefone: '(49) 98888-0001',
    email: 'presidente@handluz.com',
  },
  {
    id: 'dir-2',
    nome: 'Maria Costa',
    cargo: cargos[2],
    telefone: '(49) 98888-0002',
    email: 'diretoria.tecnica@handluz.com',
  },
];

export const mockData = {
  categorias,
  equipes,
  atletas,
  treinamentos,
  produtos,
  cargos,
  diretoria,
};
