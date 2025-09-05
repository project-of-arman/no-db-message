import { crypto } from './crypto';

export interface StoredMessage {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  type: 'text' | 'image';
  timestamp: number;
  autoDeleteAt?: number;
}

export class MessageStorage {
  private static readonly STORAGE_KEY = 'encrypted_messages';
  private static readonly MAX_MESSAGES = 1000;

  static saveMessage(message: StoredMessage): void {
    const messages = this.getAllMessages();
    messages.push(message);

    // Keep only the latest messages
    if (messages.length > this.MAX_MESSAGES) {
      messages.splice(0, messages.length - this.MAX_MESSAGES);
    }

    const encryptedData = crypto.encrypt(JSON.stringify(messages));
    localStorage.setItem(this.STORAGE_KEY, encryptedData);
  }

  static getAllMessages(): StoredMessage[] {
    const encrypted = localStorage.getItem(this.STORAGE_KEY);
    if (!encrypted) return [];

    try {
      const decrypted = crypto.decrypt(encrypted);
      const messages = JSON.parse(decrypted) as StoredMessage[];
      
      // Filter out auto-deleted messages
      const now = Date.now();
      const validMessages = messages.filter(msg => 
        !msg.autoDeleteAt || msg.autoDeleteAt > now
      );

      if (validMessages.length !== messages.length) {
        // Update storage if messages were auto-deleted
        const encryptedData = crypto.encrypt(JSON.stringify(validMessages));
        localStorage.setItem(this.STORAGE_KEY, encryptedData);
      }

      return validMessages;
    } catch (error) {
      console.error('Failed to decrypt messages:', error);
      return [];
    }
  }

  static getConversationMessages(userId: string, contactId: string): StoredMessage[] {
    return this.getAllMessages().filter(msg => 
      (msg.senderId === userId && msg.recipientId === contactId) ||
      (msg.senderId === contactId && msg.recipientId === userId)
    );
  }

  static searchMessages(query: string): StoredMessage[] {
    return this.getAllMessages().filter(msg => 
      msg.type === 'text' && msg.content.toLowerCase().includes(query.toLowerCase())
    );
  }

  static clearAllMessages(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  static deleteMessage(messageId: string): void {
    const messages = this.getAllMessages().filter(msg => msg.id !== messageId);
    const encryptedData = crypto.encrypt(JSON.stringify(messages));
    localStorage.setItem(this.STORAGE_KEY, encryptedData);
  }
}