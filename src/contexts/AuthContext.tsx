import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type Merchant = Database['public']['Tables']['merchants']['Row'];
type MerchantSettings = Database['public']['Tables']['merchant_settings']['Row'];

interface AuthContextType {
  user: User | null;
  session: Session | null;
  merchant: Merchant | null;
  settings: MerchantSettings | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, businessName: string, country: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshMerchant: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [settings, setSettings] = useState<MerchantSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMerchantData = useCallback(async (userId: string) => {
    try {
      // Fetch merchant where user_id matches
      const { data: merchantData, error: merchantError } = await supabase
        .from('merchants')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (merchantError) {
        console.error('Error fetching merchant:', merchantError);
        return;
      }

      if (merchantData) {
        setMerchant(merchantData);

        // Fetch settings
        const { data: settingsData } = await supabase
          .from('merchant_settings')
          .select('*')
          .eq('merchant_id', merchantData.id)
          .maybeSingle();

        if (settingsData) {
          setSettings(settingsData);
        }
      }
    } catch (err) {
      console.error('Error in fetchMerchantData:', err);
    }
  }, []);

  const refreshMerchant = useCallback(async () => {
    if (user) {
      await fetchMerchantData(user.id);
    }
  }, [user, fetchMerchantData]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      // Defer Supabase calls with setTimeout to prevent deadlocks
      if (newSession?.user) {
        setTimeout(() => {
          fetchMerchantData(newSession.user.id);
        }, 0);
      } else {
        setMerchant(null);
        setSettings(null);
      }
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      
      if (existingSession?.user) {
        fetchMerchantData(existingSession.user.id).finally(() => {
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchMerchantData]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, businessName: string, country: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          business_name: businessName,
          country: country,
        }
      }
    });

    if (error) {
      return { error: error as Error };
    }

    // If user was created and confirmed (or auto-confirm is on), create merchant
    if (data.user && data.session) {
      const { error: merchantError } = await supabase.rpc('create_merchant_for_user', {
        _user_id: data.user.id,
        _email: email,
        _business_name: businessName,
        _country: country,
      });

      if (merchantError) {
        console.error('Error creating merchant:', merchantError);
        return { error: merchantError as unknown as Error };
      }
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setMerchant(null);
    setSettings(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        merchant,
        settings,
        isLoading,
        signIn,
        signUp,
        signOut,
        refreshMerchant,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
