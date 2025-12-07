// app/services/models.ts

export type Sexo = 'M' | 'F';

export type Categoria = {
  id: number;
  nome: string;
  idadeMinima?: number;
  idadeMaxima?: number;
  sexo?: Sexo;
};

export type Equipe = {
  id: string;
  nome: string;
  apelido?: string;
  categoria?: Categoria;
  sexo?: Sexo;
  anoFundacao?: number;
  ativa: boolean;
};

export type Atleta = {
  id: string;
  nomeCompleto: string;
  apelido?: string;
  dataNascimento?: string;
  posicao?: string;
  alturaCm?: number;
  pesoKg?: number;
  telefone?: string;
  email?: string;
  equipeAtual?: Equipe;
  ativo: boolean;
};

export type Competicao = {
  id: string;
  nome: string;
  ano?: number;
  tipo?: string;
  cidade?: string;
  estado?: string;
  dataInicio?: string;
  dataFim?: string;
};

export type Treinamento = {
  id: string;
  titulo: string;
  descricao?: string;
  dataInicio: string;
  dataFim?: string;
  local?: string;
  tipo?: string;
  equipe?: Equipe;
};

export type Produto = {
  id: string;
  nome: string;
  descricao?: string;
  categoria?: string;
  preco: number;
  ativo: boolean;
};

export type CargoDiretoria = {
  id: number;
  nome: string;
  ordem?: number;
};

export type MembroDiretoria = {
  id: string;
  nome: string;
  cargo: CargoDiretoria;
  dataInicioMandato?: string;
  dataFimMandato?: string;
  telefone?: string;
  email?: string;
};

export type AthleteImage = {
  id: string;
  athlete_id: string;
  file_path: string;
  file_url: string;
  file_name: string;
  file_size: number;
  file_type: string;
  bucket_name: string;
  uploaded_at: string;
};