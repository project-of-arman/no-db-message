'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { MessageStorage } from '@/lib/storage';
import { Settings as SettingsIcon, Moon, Sun, Trash2, Mail, Lock } from 'lucide-react';

interface SettingsProps {
  onClose: () => void;
  autoDeleteMinutes: number;
  setAutoDeleteMinutes: (minutes: number) => void;
}

export function Settings({ onClose, autoDeleteMinutes, setAutoDeleteMinutes }: SettingsProps) {
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const { user, updateEmail, updatePassword, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleUpdateEmail = async () => {
    if (!email.trim()) return;
    
    setLoading(true);
    try {
      await updateEmail(email);
      setMessage('Email updated successfully');
      setEmail('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to update email');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword.trim()) return;

    setLoading(true);
    try {
      await updatePassword(newPassword);
      setMessage('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handleClearMessages = () => {
    MessageStorage.clearAllMessages();
    setMessage('All messages cleared');
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <SettingsIcon className="h-5 w-5" />
          <h2 className="text-xl font-semibold">Settings</h2>
        </div>
        <Button variant="ghost" onClick={onClose}>
          ✕
        </Button>
      </div>

      {/* Account Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Username</label>
            <Input value={user?.username || ''} disabled className="mt-1" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center space-x-2">
              <Mail className="h-4 w-4" />
              <span>Recovery Email</span>
            </label>
            <div className="flex space-x-2">
              <Input
                type="email"
                placeholder={user?.email || 'Add recovery email'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button onClick={handleUpdateEmail} disabled={loading}>
                Update
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center space-x-2">
              <Lock className="h-4 w-4" />
              <span>Change Password</span>
            </label>
            <Input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <Button onClick={handleUpdatePassword} disabled={loading || !newPassword}>
              Update Password
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Privacy & Security</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium">Auto-delete messages</label>
              <p className="text-xs text-muted-foreground">Messages will be deleted after the specified time</p>
            </div>
            <Select
              value={autoDeleteMinutes.toString()}
              onValueChange={(value) => setAutoDeleteMinutes(parseInt(value))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Never</SelectItem>
                <SelectItem value="5">5 minutes</SelectItem>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="1440">24 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium">Clear all messages</label>
              <p className="text-xs text-muted-foreground">Permanently delete all stored messages</p>
            </div>
            <Button variant="destructive" onClick={handleClearMessages}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              <span className="text-sm font-medium">Dark mode</span>
            </div>
            <Switch
              checked={theme === 'dark'}
              onCheckedChange={toggleTheme}
            />
          </div>
        </CardContent>
      </Card>

      {message && (
        <div className="text-center text-sm text-muted-foreground bg-muted p-2 rounded">
          {message}
        </div>
      )}

      <Button variant="outline" onClick={handleSignOut} className="w-full">
        Sign Out
      </Button>
    </div>
  );
}