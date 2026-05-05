// app/services/imageEncryption.ts
// Serviço para criptografar e descriptografar arquivos antes/depois de salvar no Supabase.
// Os arquivos são criptografados no cliente antes do upload e descriptografados apenas quando o usuário está autenticado.

import * as CryptoJS from 'crypto-js';
import { supabase } from './supabaseClient';

const ENCRYPTION_KEY_STRING = 'handluz-image-encryption-key-2024-secure-very-long-key-for-aes-256';

function uint8ArrayToBase64(uint8Array: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function encryptFileBlob(fileBlob: Blob): Promise<Blob> {
  try {
    const arrayBuffer = await fileBlob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const base64String = uint8ArrayToBase64(uint8Array);

    const encrypted = CryptoJS.AES.encrypt(base64String, ENCRYPTION_KEY_STRING, {
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    const encryptedBase64 = encrypted.toString();
    const encryptedBytes = base64ToUint8Array(encryptedBase64);

    const buffer = new ArrayBuffer(encryptedBytes.length);
    const view = new Uint8Array(buffer);
    view.set(encryptedBytes);

    return new Blob([buffer], { type: fileBlob.type || 'application/octet-stream' });
  } catch (error) {
    console.error('[imageEncryption] Erro ao criptografar arquivo:', error);
    throw new Error('Falha ao criptografar arquivo');
  }
}

export async function decryptFileBlob(
  encryptedBlob: Blob,
  mimeType?: string
): Promise<Blob> {
  try {
    const arrayBuffer = await encryptedBlob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const encryptedBase64 = uint8ArrayToBase64(uint8Array);

    const decrypted = CryptoJS.AES.decrypt(encryptedBase64, ENCRYPTION_KEY_STRING, {
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    const decryptedBase64String = decrypted.toString(CryptoJS.enc.Utf8);

    if (!decryptedBase64String || decryptedBase64String.length === 0) {
      throw new Error('Descriptografia retornou string vazia');
    }

    const fileBytes = base64ToUint8Array(decryptedBase64String);
    const buffer = new ArrayBuffer(fileBytes.length);
    const view = new Uint8Array(buffer);
    view.set(fileBytes);

    return new Blob([buffer], {
      type: mimeType || encryptedBlob.type || 'application/octet-stream',
    });
  } catch (error) {
    console.error('[imageEncryption] Erro ao descriptografar arquivo:', error);
    throw new Error('Falha ao descriptografar arquivo. O conteúdo pode estar corrompido ou não foi criptografado.');
  }
}

export async function downloadAndDecryptFile(
  storageReference: string,
  mimeType?: string
): Promise<string | null> {
  try {
    console.log('[imageEncryption] Baixando arquivo de:', storageReference);

    let encryptedBlob: Blob;
    const storageMatch = storageReference.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)$/);

    if (!storageReference.startsWith('http')) {
      const { data, error } = await supabase.storage
        .from('athletes')
        .download(storageReference);

      if (error || !data) {
        console.error('[imageEncryption] Erro ao baixar arquivo pelo path:', error?.message);
        return null;
      }

      encryptedBlob = data;
    } else if (storageMatch) {
      const bucketName = storageMatch[1];
      const filePath = decodeURIComponent(storageMatch[2]);
      const { data, error } = await supabase.storage
        .from(bucketName)
        .download(filePath);

      if (error || !data) {
        console.error('[imageEncryption] Erro ao baixar arquivo pela URL convertida:', error?.message);
        return null;
      }

      encryptedBlob = data;
    } else {
      const response = await fetch(storageReference);
      if (!response.ok) {
        console.error('[imageEncryption] Erro ao baixar arquivo:', response.status, response.statusText);
        return null;
      }

      encryptedBlob = await response.blob();
    }
    const decryptedBlob = await decryptFileBlob(encryptedBlob, mimeType);
    const objectUrl = URL.createObjectURL(decryptedBlob);

    console.log('[imageEncryption] Arquivo descriptografado com sucesso');
    return objectUrl;
  } catch (error) {
    console.error('[imageEncryption] Erro ao baixar e descriptografar:', error);
    return null;
  }
}

export async function encryptImageBlob(imageBlob: Blob): Promise<Blob> {
  return encryptFileBlob(imageBlob);
}

export async function decryptImageBlob(encryptedBlob: Blob): Promise<Blob> {
  return decryptFileBlob(encryptedBlob, 'image/jpeg');
}

export async function downloadAndDecryptImage(supabaseUrl: string): Promise<string | null> {
  return downloadAndDecryptFile(supabaseUrl, 'image/jpeg');
}
