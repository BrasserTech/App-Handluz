// constants/instagram.ts
// Configuração do link do Instagram para exibir no feed

// Configure aqui o link do Instagram que deseja exibir
// Pode ser um username (ex: "handluz") ou URL completa (ex: "https://www.instagram.com/handluz/")
export const INSTAGRAM_USERNAME = 'handluzerna'; // Altere para o username desejado

// URL completa do perfil do Instagram
export const INSTAGRAM_URL = `https://www.instagram.com/${INSTAGRAM_USERNAME}/`;

// Configurações de layout do feed do Instagram
export const INSTAGRAM_GRID_CONFIG = {
  // Configurações para Mobile (telas < 768px)
  mobile: {
    columns: 2,            // Número de colunas no mobile (imagens por linha) - 2, 3, 4, etc.
    padding: 8,           // Espaçamento total horizontal no mobile (padding esquerdo + direito)
    gap: 12,                 // Espaço entre os posts no mobile (em pixels)
  },
  // Configurações para Desktop (telas >= 768px)
  desktop: {
    columns: 4,            // Número de colunas no desktop (imagens por linha) - 3, 4, 5, etc.
    padding: 12,           // Espaçamento total horizontal no desktop (padding esquerdo + direito)
    gap: 12,                 // Espaço entre os posts no desktop (em pixels)
  },
  // Configurações gerais
  sizeMultiplier: 0.55,     // Multiplicador de tamanho dos posts (1.0 = tamanho normal, 0.8 = 80%, 1.2 = 120%, etc.)
  breakpoint: 768,         // Breakpoint para distinguir mobile de desktop (em pixels)
  maxPosts: 6,            // Número máximo de posts a serem exibidos (tanto mock quanto Instagram real)
};

