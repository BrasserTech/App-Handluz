// app/services/imageEncryption.ts
// Serviço para criptografar e descriptografar imagens antes/depois de salvar no Supabase.
// As imagens são criptografadas no cliente antes do upload e descriptografadas apenas quando o usuário está autenticado.

import CryptoJS from 'crypto-js';

// Chave de criptografia (em produção, isso deve ser armazenado de forma mais segura)
const ENCRYPTION_KEY_STRING = 'handluz-image-encryption-key-2024-secure-very-long-key-for-aes-256';

/**
 * Converte Uint8Array para string base64
 */
function uint8ArrayToBase64(uint8Array: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary);
}

/**
 * Converte string base64 para Uint8Array
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Criptografa um Blob de imagem antes de fazer upload
 * @param imageBlob - O blob da imagem a ser criptografado
 * @returns Blob criptografado
 */
export async function encryptImageBlob(imageBlob: Blob): Promise<Blob> {
  try {
    // Converter blob para base64
    const arrayBuffer = await imageBlob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const base64String = uint8ArrayToBase64(uint8Array);
    
    // Criptografar usando AES - CryptoJS retorna uma string no formato: "iv+ciphertext" em base64
    const encrypted = CryptoJS.AES.encrypt(base64String, ENCRYPTION_KEY_STRING, {
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    
    // CryptoJS retorna uma string no formato OpenSSL: base64(iv + ciphertext)
    // Converter essa string base64 para bytes
    const encryptedBase64 = encrypted.toString();
    const encryptedBytes = base64ToUint8Array(encryptedBase64);
    
    // Criar ArrayBuffer a partir dos bytes
    const buffer = new ArrayBuffer(encryptedBytes.length);
    const view = new Uint8Array(buffer);
    view.set(encryptedBytes);
    
    // Retornar como Blob preservando o tipo original
    return new Blob([buffer], { type: imageBlob.type || 'image/jpeg' });
  } catch (error) {
    console.error('[imageEncryption] Erro ao criptografar imagem:', error);
    throw new Error('Falha ao criptografar imagem');
  }
}

/**
 * Descriptografa um Blob de imagem baixado do Supabase
 * @param encryptedBlob - O blob criptografado
 * @returns Blob descriptografado (imagem original)
 */
export async function decryptImageBlob(encryptedBlob: Blob): Promise<Blob> {
  try {
    // Converter blob criptografado para base64
    const arrayBuffer = await encryptedBlob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const encryptedBase64 = uint8ArrayToBase64(uint8Array);
    
    // Descriptografar - CryptoJS espera o formato OpenSSL (base64 com IV+ciphertext)
    const decrypted = CryptoJS.AES.decrypt(encryptedBase64, ENCRYPTION_KEY_STRING, {
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    
    // Converter WordArray para string UTF-8 (que contém a string base64 original)
    const decryptedBase64String = decrypted.toString(CryptoJS.enc.Utf8);
    
    // Validar se é uma string base64 válida
    if (!decryptedBase64String || decryptedBase64String.length === 0) {
      throw new Error('Descriptografia retornou string vazia');
    }
    
    // Decodificar base64 para obter os bytes da imagem original
    const imageBytes = base64ToUint8Array(decryptedBase64String);
    
    // Criar novo ArrayBuffer
    const buffer = new ArrayBuffer(imageBytes.length);
    const view = new Uint8Array(buffer);
    view.set(imageBytes);
    
    // Retornar como Blob
    return new Blob([buffer], { type: 'image/jpeg' });
  } catch (error) {
    console.error('[imageEncryption] Erro ao descriptografar imagem:', error);
    throw new Error('Falha ao descriptografar imagem. A imagem pode estar corrompida ou não foi criptografada.');
  }
}

/**
 * Baixa e descriptografa uma imagem do Supabase Storage
 * @param supabaseUrl - URL pública da imagem no Supabase
 * @returns URL local da imagem descriptografada (blob URL) ou null em caso de erro
 */
export async function downloadAndDecryptImage(supabaseUrl: string): Promise<string | null> {
  try {
    console.log('[imageEncryption] Baixando imagem de:', supabaseUrl);
    
    // Baixar a imagem criptografada
    const response = await fetch(supabaseUrl);
    if (!response.ok) {
      console.error('[imageEncryption] Erro ao baixar imagem:', response.status, response.statusText);
      return null;
    }

    const encryptedBlob = await response.blob();
    console.log('[imageEncryption] Blob criptografado baixado, tamanho:', encryptedBlob.size);
    
    // Descriptografar
    const decryptedBlob = await decryptImageBlob(encryptedBlob);
    console.log('[imageEncryption] Blob descriptografado, tamanho:', decryptedBlob.size);
    
    // Criar URL local para a imagem descriptografada
    const objectUrl = URL.createObjectURL(decryptedBlob);
    console.log('[imageEncryption] URL do objeto criada:', objectUrl);
    
    return objectUrl;
  } catch (error) {
    console.error('[imageEncryption] Erro ao baixar e descriptografar:', error);
    return null;
  }
}
