'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserSearch } from './UserSearch';
import { ConversationList } from './ConversationList';
import { ChatInterface } from './ChatInterface';
import { Settings } from './Settings';
import { MessageSearch } from './MessageSearch';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/hooks/useSocket';
import { MessageStorage, StoredMessage } from '@/lib/storage';
import { User } from '@/lib/supabase';
import { Settings as SettingsIcon, Search, Plus } from 'lucide-react';

type View = 'conversations' | 'search' | 'settings' | 'messageSearch';

interface Conversation {
  user: User;
  lastMessage?: StoredMessage;
  unreadCount: number;
}

export function MessagingApp() {
  const [currentView, setCurrentView] = useState<View>('conversations');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [autoDeleteMinutes, setAutoDeleteMinutes] = useState(0);

  const { user } = useAuth();
  const { isConnected, onlineUsers, typingUsers, sendMessage, startTyping, stopTyping, onMessage, offMessage } = useSocket(user?.id);

  // Debug logging
  useEffect(() => {
    console.log('Connection status:', isConnected);
    console.log('Online users:', onlineUsers);
  }, [isConnected, onlineUsers]);

  // Load auto-delete setting
  useEffect(() => {
    const savedSetting = localStorage.getItem('autoDeleteMinutes');
    if (savedSetting) {
      setAutoDeleteMinutes(parseInt(savedSetting));
    }
  }, []);

  // Save auto-delete setting
  useEffect(() => {
    localStorage.setItem('autoDeleteMinutes', autoDeleteMinutes.toString());
  }, [autoDeleteMinutes]);

  // Load conversations
  useEffect(() => {
    if (!user) return;

    const loadConversations = () => {
      const allMessages = MessageStorage.getAllMessages();
      const conversationMap = new Map<string, Conversation>();

      allMessages.forEach(message => {
        const contactId = message.senderId === user.id ? message.recipientId : message.senderId;
        
        if (!conversationMap.has(contactId)) {
          // This would need to be populated with actual user data from cache or API
          conversationMap.set(contactId, {
            user: { 
              id: contactId, 
              username: contactId.slice(0, 8), // Placeholder
              created_at: '',
              last_seen: '',
              is_online: false
            },
            lastMessage: message,
            unreadCount: 0
          });
        } else {
          const conv = conversationMap.get(contactId)!;
          if (message.timestamp > (conv.lastMessage?.timestamp || 0)) {
            conv.lastMessage = message;
          }
        }
      });

      setConversations(Array.from(conversationMap.values()));
    };

    loadConversations();
    
    // Refresh conversations periodically
    const interval = setInterval(loadConversations, 1000);
    return () => clearInterval(interval);
  }, [user]);

  const handleSelectUser = (selectedUser: User) => {
    setSelectedUser(selectedUser);
    setCurrentView('conversations');
  };

  const handleSelectConversation = (user: User) => {
    setSelectedUser(user);
  };

  if (!user) return null;

  return (
    <div className="h-screen bg-background">
      <div className="h-full flex">
        {/* Sidebar */}
        <div className={`w-full md:w-80 border-r bg-card ${selectedUser ? 'hidden md:block' : 'block'}`}>
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-bold">SecureChat</h1>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCurrentView('messageSearch')}
                    className={currentView === 'messageSearch' ? 'bg-accent' : ''}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCurrentView('search')}
                    className={currentView === 'search' ? 'bg-accent' : ''}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCurrentView('settings')}
                    className={currentView === 'settings' ? 'bg-accent' : ''}
                  >
                    <SettingsIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-muted-foreground">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              {currentView === 'conversations' && (
                <ConversationList
                  conversations={conversations}
                  selectedUser={selectedUser}
                  onSelectConversation={handleSelectConversation}
                  onlineUsers={onlineUsers}
                />
              )}
              {currentView === 'search' && (
                <div className="p-4">
                  <UserSearch 
                    onSelectUser={handleSelectUser} 
                    onlineUsers={onlineUsers}
                  />
                </div>
              )}
              {currentView === 'settings' && (
                <Settings
                  onClose={() => setCurrentView('conversations')}
                  autoDeleteMinutes={autoDeleteMinutes}
                  setAutoDeleteMinutes={setAutoDeleteMinutes}
                />
              )}
              {currentView === 'messageSearch' && (
                <div className="p-4">
                  <MessageSearch
                    onMessageSelect={(message) => {
                      // Find the conversation for this message
                      const contactId = message.senderId === user.id ? message.recipientId : message.senderId;
                      const conversation = conversations.find(c => c.user.id === contactId);
                      if (conversation) {
                        setSelectedUser(conversation.user);
                        setCurrentView('conversations');
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className={`flex-1 ${selectedUser ? 'block' : 'hidden md:flex'} ${!selectedUser ? 'items-center justify-center' : ''}`}>
          {selectedUser ? (
            <ChatInterface
              selectedUser={selectedUser}
              onBack={() => setSelectedUser(null)}
              autoDeleteMinutes={autoDeleteMinutes}
              onlineUsers={onlineUsers}
              typingUsers={typingUsers}
            />
          ) : (
            <div className="text-center text-muted-foreground">
              <div className="p-8 bg-primary/5 rounded-full w-32 h-32 mx-auto mb-6 flex items-center justify-center">
                <SettingsIcon className="h-16 w-16 text-primary/30" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">Select a conversation</h2>
              <p>Choose a conversation from the sidebar or start a new chat</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}