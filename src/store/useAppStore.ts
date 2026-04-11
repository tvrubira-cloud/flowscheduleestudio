import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { AppUser, Cliente, ActiveTab } from "@/types"

interface AppState {
  // Auth
  user: AppUser | null
  isDemo: boolean
  authLoading: boolean

  // Clients
  clientes: Cliente[]

  // Navigation
  activeTab: ActiveTab

  // Scheduling
  schedulingDate: string
  schedulingTime: string

  // Actions
  setUser: (user: AppUser | null) => void
  setIsDemo: (isDemo: boolean) => void
  setAuthLoading: (loading: boolean) => void
  setClientes: (clientes: Cliente[]) => void
  addCliente: (cliente: Cliente) => void
  setActiveTab: (tab: ActiveTab) => void
  setSchedulingDate: (date: string) => void
  setSchedulingTime: (time: string) => void
  reset: () => void
}

const initialState = {
  user: null,
  isDemo: false,
  authLoading: true,
  clientes: [],
  activeTab: "dashboard" as ActiveTab,
  schedulingDate: "",
  schedulingTime: "",
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...initialState,

      setUser: (user) => set({ user }),
      setIsDemo: (isDemo) => set({ isDemo }),
      setAuthLoading: (authLoading) => set({ authLoading }),
      setClientes: (clientes) => set({ clientes }),
      addCliente: (cliente) =>
        set((state) => ({ clientes: [...state.clientes, cliente] })),
      setActiveTab: (activeTab) => set({ activeTab }),
      setSchedulingDate: (schedulingDate) => set({ schedulingDate }),
      setSchedulingTime: (schedulingTime) => set({ schedulingTime }),
      reset: () => set(initialState),
    }),
    {
      name: "flowschedule-storage",
      partialize: (state) => ({
        clientes: state.clientes,
        isDemo: state.isDemo,
        activeTab: state.activeTab,
      }),
    }
  )
)
