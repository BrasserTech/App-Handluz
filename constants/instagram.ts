// constants/instagram.ts
// Configuração do link do Instagram para exibir no feed

// Configure aqui o link do Instagram que deseja exibir
// Pode ser um username (ex: "handluz") ou URL completa (ex: "https://www.instagram.com/handluz/")
export const INSTAGRAM_USERNAME = 'handluzerna'; // Altere para o username desejado

// URL completa do perfil do Instagram
export const INSTAGRAM_URL = `https://www.instagram.com/${INSTAGRAM_USERNAME}/`;

// Configurações de layout do feed do Instagram
export const INSTAGRAM_GRID_CONFIG = {
  columns: 4,              // Número de colunas (posts por linha) - 3, 4, 5, etc.
  padding: 48,             // Espaçamento total horizontal (padding esquerdo + direito)
  gap: 4,                  // Espaço entre os posts (em pixels)
  sizeMultiplier: 0.5,     // Multiplicador de tamanho dos posts (1.0 = tamanho normal, 0.8 = 80%, 1.2 = 120%, etc.)
};

