'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Search } from 'lucide-react';
import { MessageStorage, StoredMessage } from '@/lib/storage';
import { useAuth } from '@/contexts/AuthContext';

interface MessageSearchProps {
  onMessageSelect: (message: StoredMessage) => void;
}

export function MessageSearch({ onMessageSelect }: MessageSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StoredMessage[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (query.trim()) {
      const searchResults = MessageStorage.searchMessages(query);
      setResults(searchResults);
    } else {
      setResults([]);
    }
  }, [query]);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search messages..."
          className="pl-10"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {results.map((message) => (
          <Card
            key={message.id}
            className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => onMessageSelect(message)}
          >
            <div className="space-y-1">
              <div className="flex justify-between items-start">
                <span className="text-sm font-medium">
                  {message.senderId === user?.id ? 'You' : 'Contact'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatTime(message.timestamp)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {message.type === 'image' ? '📷 Image' : message.content}
              </p>
            </div>
          </Card>
        ))}
      </div>

      {query && results.length === 0 && (
        <div className="text-center text-muted-foreground py-4">
          No messages found matching "{query}"
        </div>
      )}
    </div>
  );
}