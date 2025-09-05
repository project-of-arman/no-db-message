'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, User } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (username: string, password: string, email?: string) => Promise<void>;
  signIn: (identifier: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateEmail: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      setUser(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (username: string, password: string, email?: string) => {
    // Use username as email if no email provided (Supabase requires email)
    const authEmail = email || `${username}@temp.local`;
    
    const { data, error } = await supabase.auth.signUp({
      email: authEmail,
      password,
    });

    if (error) throw error;
    if (!data.user) throw new Error('User creation failed');

    // Create user profile
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: data.user.id,
        username,
        email: email || null,
      });

    if (profileError) throw profileError;
  };

  const signIn = async (identifier: string, password: string) => {
    let email = identifier;

    // Check if identifier is username
    if (!identifier.includes('@')) {
      const { data: userData, error } = await supabase
        .from('users')
        .select('email, id')
        .eq('username', identifier)
        .single();

      if (error || !userData) {
        throw new Error('Username not found');
      }

      email = userData.email || `${identifier}@temp.local`;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    // Clear encrypted messages
    localStorage.clear();
    sessionStorage.clear();
  };

  const updateEmail = async (email: string) => {
    const { error } = await supabase.auth.updateUser({ email });
    if (error) throw error;

    // Update user profile
    if (user) {
      const { error: profileError } = await supabase
        .from('users')
        .update({ email })
        .eq('id', user.id);

      if (profileError) throw profileError;
      setUser({ ...user, email });
    }
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signUp,
        signIn,
        signOut,
        updateEmail,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}