import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

interface User {
  id?: string | number;
  email?: string;
  name?: string;
  [key: string]: any;
}

interface AuthState {
  auth: string | null;
  user: User | null;
  status: 'idle' | 'signOut' | 'signIn';
  isLoading: boolean;

  signIn: (auth: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
  hydrate: () => Promise<void>;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  auth: null,
  user: null,
  status: 'idle',
  isLoading: true,

  signIn: async (auth: string, user: User) => {
    try {
      await AsyncStorage.setItem('auth', auth);
      await AsyncStorage.setItem('user', JSON.stringify(user));
      set({ auth, user, status: 'signIn', isLoading: false });
    } catch (error) {
      console.error('Error signing in:', error);
    }
  },

  signOut: async () => {
    try {
      await AsyncStorage.removeItem('auth');
      await AsyncStorage.removeItem('user');
      set({ auth: null, user: null, status: 'signOut', isLoading: false });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  },

  hydrate: async () => {
    try {
      set({ isLoading: true });
      const auth = await AsyncStorage.getItem('auth');
      const userString = await AsyncStorage.getItem('user');

      if (auth && userString) {
        const user = JSON.parse(userString);
        set({ auth, user, status: 'signIn', isLoading: false });
      } else {
        set({ auth: null, user: null, status: 'signOut', isLoading: false });
      }
    } catch (error) {
      console.error('Error hydrating auth:', error);
      set({ auth: null, user: null, status: 'signOut', isLoading: false });
    }
  },

  setUser: (user: User) => {
    set({ user });
    AsyncStorage.setItem('user', JSON.stringify(user));
  },

  setLoading: (isLoading: boolean) => {
    set({ isLoading });
  },
}));


