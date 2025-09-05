'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export interface MessageEvent {
  senderId: string;
  encryptedMessage: string;
  messageType: 'text' | 'image';
  timestamp: number;
}

export function useSocket(userId?: string) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) return;

    // Initialize socket connection with retry options
    socketRef.current = io(process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'http://localhost:3001', {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      maxReconnectionAttempts: 5
    });
    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      setIsConnected(true);
      socket.emit('join', userId);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
      setOnlineUsers([]);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    socket.on('online_users', (users: string[]) => {
      console.log('Online users received:', users);
      setOnlineUsers(users);
    });

    socket.on('user_status', ({ userId: statusUserId, isOnline }) => {
      console.log('User status update:', statusUserId, isOnline);
      setOnlineUsers(prev => 
        isOnline 
          ? [...prev.filter(id => id !== statusUserId), statusUserId]
          : prev.filter(id => id !== statusUserId)
      );
    });

    socket.on('typing_start', (typingUserId: string) => {
      setTypingUsers(prev => new Set([...prev, typingUserId]));
    });

    socket.on('typing_stop', (typingUserId: string) => {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(typingUserId);
        return newSet;
      });
    });

    return () => {
      console.log('Cleaning up socket connection');
      socket.disconnect();
    };
  }, [userId]);

  const sendMessage = (recipientId: string, encryptedMessage: string, messageType: 'text' | 'image' = 'text') => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('private_message', {
        recipientId,
        encryptedMessage,
        messageType
      });
    }
  };

  const startTyping = (recipientId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('typing_start', recipientId);
    }
  };

  const stopTyping = (recipientId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('typing_stop', recipientId);
    }
  };

  const onMessage = (callback: (message: MessageEvent) => void) => {
    if (socketRef.current) {
      socketRef.current.on('private_message', callback);
    }
  };

  const offMessage = (callback: (message: MessageEvent) => void) => {
    if (socketRef.current) {
      socketRef.current.off('private_message', callback);
    }
  };

  return {
    isConnected,
    onlineUsers,
    typingUsers,
    sendMessage,
    startTyping,
    stopTyping,
    onMessage,
    offMessage
  };
}