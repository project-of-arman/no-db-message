import CryptoJS from 'crypto-js';

export class MessageCrypto {
  private static instance: MessageCrypto;
  private sessionKey: string;

  private constructor() {
    // Generate a unique session key for this browser session
    this.sessionKey = this.generateSessionKey();
  }

  public static getInstance(): MessageCrypto {
    if (!MessageCrypto.instance) {
      MessageCrypto.instance = new MessageCrypto();
    }
    return MessageCrypto.instance;
  }

  private generateSessionKey(): string {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      // Return a temporary key for SSR, will be replaced on client
      return CryptoJS.lib.WordArray.random(32).toString();
    }
    
    const stored = sessionStorage.getItem('session_key');
    if (stored) return stored;
    
    const key = CryptoJS.lib.WordArray.random(32).toString();
    sessionStorage.setItem('session_key', key);
    return key;
  }

  encrypt(message: string): string {
    return CryptoJS.AES.encrypt(message, this.sessionKey).toString();
  }

  decrypt(encryptedMessage: string): string {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedMessage, this.sessionKey);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Decryption failed:', error);
      return '';
    }
  }

  encryptFile(base64Data: string): string {
    return CryptoJS.AES.encrypt(base64Data, this.sessionKey).toString();
  }

  decryptFile(encryptedData: string): string {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, this.sessionKey);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('File decryption failed:', error);
      return '';
    }
  }
}

export const crypto = MessageCrypto.getInstance();