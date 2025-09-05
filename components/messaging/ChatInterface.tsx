'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Send, Image, MoreVertical, ArrowLeft, Circle, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket, MessageEvent } from '@/hooks/useSocket';
import { crypto } from '@/lib/crypto';
import { MessageStorage, StoredMessage } from '@/lib/storage';
import { User } from '@/lib/supabase';

interface ChatInterfaceProps {
  selectedUser: User;
  onBack: () => void;
  autoDeleteMinutes: number;
  onlineUsers: string[];
  typingUsers: Set<string>;
}

export function ChatInterface({ 
  selectedUser, 
  onBack, 
  autoDeleteMinutes,
  onlineUsers,
  typingUsers 
}: ChatInterfaceProps) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { user } = useAuth();
  const { sendMessage, startTyping, stopTyping, onMessage, offMessage } = useSocket(user?.id);

  const isOnline = onlineUsers.includes(selectedUser.id);
  const isUserTyping = typingUsers.has(selectedUser.id);

  useEffect(() => {
    // Load existing messages for this conversation
    if (user) {
      const existingMessages = MessageStorage.getConversationMessages(user.id, selectedUser.id);
      setMessages(existingMessages.sort((a, b) => a.timestamp - b.timestamp));
    }
  }, [user, selectedUser.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const handleIncomingMessage = (messageEvent: MessageEvent) => {
      if (messageEvent.senderId === selectedUser.id && user) {
        try {
          const decryptedContent = crypto.decrypt(messageEvent.encryptedMessage);
          
          const newMessage: StoredMessage = {
            id: Date.now().toString(),
            senderId: messageEvent.senderId,
            recipientId: user.id,
            content: decryptedContent,
            type: messageEvent.messageType,
            timestamp: messageEvent.timestamp,
            autoDeleteAt: autoDeleteMinutes > 0 ? 
              Date.now() + (autoDeleteMinutes * 60 * 1000) : undefined,
          };

          MessageStorage.saveMessage(newMessage);
          setMessages(prev => [...prev, newMessage]);
        } catch (error) {
          console.error('Failed to decrypt message:', error);
        }
      }
    };

    onMessage(handleIncomingMessage);
    return () => offMessage(handleIncomingMessage);
  }, [selectedUser.id, user, onMessage, offMessage, autoDeleteMinutes]);

  const handleSendMessage = () => {
    if (!message.trim() || !user) return;

    try {
      const encryptedMessage = crypto.encrypt(message);
      
      // Save to local storage
      const newMessage: StoredMessage = {
        id: Date.now().toString(),
        senderId: user.id,
        recipientId: selectedUser.id,
        content: message,
        type: 'text',
        timestamp: Date.now(),
        autoDeleteAt: autoDeleteMinutes > 0 ? 
          Date.now() + (autoDeleteMinutes * 60 * 1000) : undefined,
      };

      MessageStorage.saveMessage(newMessage);
      setMessages(prev => [...prev, newMessage]);

      // Send encrypted message
      sendMessage(selectedUser.id, encryptedMessage, 'text');
      setMessage('');
      handleStopTyping();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        const encryptedImage = crypto.encryptFile(base64);

        // Save to local storage
        const newMessage: StoredMessage = {
          id: Date.now().toString(),
          senderId: user.id,
          recipientId: selectedUser.id,
          content: base64,
          type: 'image',
          timestamp: Date.now(),
          autoDeleteAt: autoDeleteMinutes > 0 ? 
            Date.now() + (autoDeleteMinutes * 60 * 1000) : undefined,
        };

        MessageStorage.saveMessage(newMessage);
        setMessages(prev => [...prev, newMessage]);

        // Send encrypted image
        sendMessage(selectedUser.id, encryptedImage, 'image');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Failed to send image:', error);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleStartTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      startTyping(selectedUser.id);
    }

    // Reset typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      handleStopTyping();
    }, 3000);
  };

  const handleStopTyping = () => {
    if (isTyping) {
      setIsTyping(false);
      stopTyping(selectedUser.id);
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="p-2 bg-primary/10 rounded-full">
            <UserIcon className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold">{selectedUser.username}</div>
            <div className="flex items-center space-x-1 text-sm text-muted-foreground">
              <Circle 
                className={`h-2 w-2 ${
                  isOnline ? 'text-green-500 fill-green-500' : 'text-gray-300 fill-gray-300'
                }`} 
              />
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </div>
          </div>
        </div>
        <Button variant="ghost" size="icon">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                msg.senderId === user?.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              {msg.type === 'text' ? (
                <p className="text-sm">{msg.content}</p>
              ) : (
                <img
                  src={msg.content}
                  alt="Shared image"
                  className="rounded max-w-full h-auto"
                />
              )}
              <div
                className={`text-xs mt-1 ${
                  msg.senderId === user?.id
                    ? 'text-primary-foreground/70'
                    : 'text-muted-foreground'
                }`}
              >
                {formatTime(msg.timestamp)}
                {msg.autoDeleteAt && (
                  <span className="ml-2">🕐</span>
                )}
              </div>
            </div>
          </div>
        ))}

        {isUserTyping && (
          <div className="flex justify-start">
            <div className="bg-muted px-4 py-2 rounded-lg">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t p-4">
        <div className="flex items-end space-x-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
          >
            <Image className="h-4 w-4" />
          </Button>
          <div className="flex-1 relative">
            <Input
              placeholder="Type a message..."
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                handleStartTyping();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="pr-12"
            />
          </div>
          <Button onClick={handleSendMessage} disabled={!message.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}