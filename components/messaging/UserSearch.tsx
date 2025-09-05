'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Search, User as UserIcon, Circle } from 'lucide-react';
import { supabase, User } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface UserSearchProps {
  onSelectUser: (user: User) => void;
  onlineUsers: string[];
}

export function UserSearch({ onSelectUser, onlineUsers }: UserSearchProps) {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const { user: currentUser } = useAuth();

  const searchUsers = async (searchQuery: string) => {
    if (!searchQuery.trim() || !currentUser) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .or(`username.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
        .neq('id', currentUser.id)
        .limit(10);

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (query) {
        searchUsers(query);
      } else {
        setUsers([]);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [query, currentUser]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users by username or email..."
          className="pl-10"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {loading && (
        <div className="text-center text-muted-foreground py-4">
          Searching...
        </div>
      )}

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {users.map((user) => (
          <Card 
            key={user.id} 
            className="p-3 hover:bg-accent/50 cursor-pointer transition-colors"
            onClick={() => onSelectUser(user)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/10 rounded-full">
                  <UserIcon className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-medium">{user.username}</div>
                  {user.email && (
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Circle 
                  className={`h-3 w-3 ${
                    onlineUsers.includes(user.id) 
                      ? 'text-green-500 fill-green-500' 
                      : 'text-gray-300 fill-gray-300'
                  }`} 
                />
                <span className="text-xs text-muted-foreground">
                  {onlineUsers.includes(user.id) ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {query && !loading && users.length === 0 && (
        <div className="text-center text-muted-foreground py-4">
          No users found matching "{query}"
        </div>
      )}
    </div>
  );
}