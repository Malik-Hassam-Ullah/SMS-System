import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user:    null,
      token:   null,
      loading: false,
      error:   null,

      login: (user, token) => set({ user, token, error: null }),

      updateUser: (updatedUser) => set((state) => ({ user: { ...state.user, ...updatedUser } })),

      logout: () => set({ user: null, token: null, error: null }),

      setError: (error) => set({ error }),
      setLoading: (loading) => set({ loading }),

      isAuthenticated: () => !!get().token,
      isCeo:           () => get().user?.role === 'ceo',
      isAdmin:         () => get().user?.role === 'admin',
      isAccountant:    () => get().user?.role === 'accountant',
      isTeacher:       () => get().user?.role === 'teacher',
    }),
    {
      name: 'sms-auth',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);
