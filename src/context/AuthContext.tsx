import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/src/types/domain';
import { clearUserDb, getUserDb, requestPersistentStorage } from '@/src/lib/db';
import { isSupabaseConfigured, supabase } from '@/src/lib/supabase';
import { enqueueMutation, getGuestRecordCount, migrateGuestDataToUser } from '@/src/lib/sync';

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  activeUserId: string;
  loading: boolean;
  isAdmin: boolean;
  isSupabaseReady: boolean;
  guestPendingMigrationCount: number;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null; needsConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
  updateProfile: (patch: Partial<Profile>) => Promise<void>;
  migrateGuestPlans: () => Promise<number>;
  dismissGuestMigration: () => void;
  refreshGuestCount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const DEFAULT_GUEST_PROFILE: Profile = {
  id: 'guest',
  full_name: 'Guest Farmer',
  phone: '',
  role: 'user',
  default_currency: '₦',
  default_bag_weight_kg: 25,
  default_crate_size: 30,
  weight_unit: 'kg',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  deleted_at: null,
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [guestPendingMigrationCount, setGuestPendingMigrationCount] = useState<number>(0);

  const activeUserId = user?.id ?? 'guest';

  const loadProfile = useCallback(async (uid: string, authUser?: User | null) => {
    const db = getUserDb(uid);
    let localProfile = await db.profiles.get(uid);

    if (uid !== 'guest' && isSupabaseConfigured && supabase && navigator.onLine) {
      const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
      if (data) {
        localProfile = data as Profile;
        await db.profiles.put(localProfile);
      }
    }

    if (!localProfile) {
      const now = new Date().toISOString();
      localProfile =
        uid === 'guest'
          ? { ...DEFAULT_GUEST_PROFILE }
          : {
              ...DEFAULT_GUEST_PROFILE,
              id: uid,
              full_name: (authUser?.user_metadata?.full_name as string) || authUser?.email || 'Farmer',
              created_at: now,
              updated_at: now,
            };
      await db.profiles.put(localProfile);
    }

    setProfile(localProfile);
  }, []);

  const refreshGuestCount = useCallback(async () => {
    const count = await getGuestRecordCount();
    setGuestPendingMigrationCount(count);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        if (isSupabaseConfigured && supabase) {
          const { data } = await supabase.auth.getSession();
          const sessionUser = data.session?.user ?? null;
          if (!mounted) return;
          setUser(sessionUser);
          await loadProfile(sessionUser?.id ?? 'guest', sessionUser);
          if (sessionUser) {
            void requestPersistentStorage();
            await refreshGuestCount();
          }
        } else {
          await loadProfile('guest', null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();

    if (!isSupabaseConfigured || !supabase) {
      return () => {
        mounted = false;
      };
    }

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      await loadProfile(sessionUser?.id ?? 'guest', sessionUser);
      if (sessionUser) {
        void requestPersistentStorage();
        await refreshGuestCount();
      } else {
        setGuestPendingMigrationCount(0);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile, refreshGuestCount]);

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: 'Cloud authentication requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.' };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: 'Cloud authentication requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.' };
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });
    if (error) return { error: error.message };
    return {
      error: null,
      needsConfirmation: Boolean(data.user && !data.session),
    };
  };

  const signOut = async () => {
    const prevUid = user?.id;
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    if (prevUid) {
      await clearUserDb(prevUid);
    }
    setUser(null);
    await loadProfile('guest', null);
    setGuestPendingMigrationCount(0);
  };

  const updatePassword = async (newPassword: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: 'Supabase is not configured.' };
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error: error?.message ?? null };
  };

  const updateProfile = async (patch: Partial<Profile>) => {
    const uid = activeUserId;
    const db = getUserDb(uid);
    const current = (await db.profiles.get(uid)) ?? profile ?? { ...DEFAULT_GUEST_PROFILE, id: uid };
    const updated: Profile = {
      ...current,
      ...patch,
      id: uid,
      role: current.role, // never allow client-side role self-escalation
      updated_at: new Date().toISOString(),
    };
    await db.profiles.put(updated);
    setProfile(updated);
    void requestPersistentStorage();

    if (uid !== 'guest') {
      await enqueueMutation({
        userId: uid,
        table: 'profiles',
        operation: 'upsert',
        recordId: uid,
        payload: updated as unknown as Record<string, unknown>,
        baseUpdatedAt: current.updated_at,
      });
    }
  };

  const migrateGuestPlans = async () => {
    if (!user?.id) return 0;
    const count = await migrateGuestDataToUser(user.id);
    setGuestPendingMigrationCount(0);
    return count;
  };

  const dismissGuestMigration = () => {
    setGuestPendingMigrationCount(0);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        activeUserId,
        loading,
        isAdmin: profile?.role === 'admin',
        isSupabaseReady: isSupabaseConfigured,
        guestPendingMigrationCount,
        signIn,
        signUp,
        signOut,
        updatePassword,
        updateProfile,
        migrateGuestPlans,
        dismissGuestMigration,
        refreshGuestCount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
