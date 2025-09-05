'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, User as UserIcon, Circle } from 'lucide-react';
import { MessageStorage, StoredMessage } from '@/lib/storage';
import { useAuth } from '@/contexts/AuthContext';
import { User } from '@/lib/supabase';

interface Conversation {
  user: User;
  lastMessage?: StoredMessage;
  unreadCount: number;
}

interface ConversationListProps {
  conversations: Conversation[];
  selectedUser: User | null;
  onSelectConversation: (user: User) => void;
  onlineUsers: string[];
}

export function ConversationList({ 
  conversations, 
  selectedUser, 
  onSelectConversation,
  onlineUsers 
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredConversations(conversations);
    } else {
      const filtered = conversations.filter(conv =>
        conv.user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.user.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredConversations(filtered);
    }
  }, [searchQuery, conversations]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            {searchQuery ? 'No conversations match your search' : 'No conversations yet'}
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {filteredConversations.map((conversation) => (
              <Card
                key={conversation.user.id}
                className={`p-3 cursor-pointer transition-colors hover:bg-accent/50 ${
                  selectedUser?.id === conversation.user.id ? 'bg-accent' : ''
                }`}
                onClick={() => onSelectConversation(conversation.user)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="relative">
                      <div className="p-2 bg-primary/10 rounded-full">
                        <UserIcon className="h-5 w-5" />
                      </div>
                      <Circle 
                        className={`absolute -bottom-1 -right-1 h-3 w-3 ${
                          onlineUsers.includes(conversation.user.id)
                            ? 'text-green-500 fill-green-500' 
                            : 'text-gray-300 fill-gray-300'
                        }`} 
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{conversation.user.username}</div>
                      {conversation.lastMessage && (
                        <div className="text-sm text-muted-foreground truncate">
                          {conversation.lastMessage.type === 'image' 
                            ? '📷 Image' 
                            : conversation.lastMessage.content
                          }
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {conversation.lastMessage && (
                      <div className="text-xs text-muted-foreground">
                        {formatTime(conversation.lastMessage.timestamp)}
                      </div>
                    )}
                    {conversation.unreadCount > 0 && (
                      <div className="mt-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}