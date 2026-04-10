import type { User } from "firebase/auth"
import type { Timestamp } from "firebase/firestore"

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface DemoUser {
  email: string
  uid: string
  isDemoUser: true
}

export type AppUser = User | DemoUser

// ─── Domain ──────────────────────────────────────────────────────────────────

export interface Cliente {
  id: string
  nome: string
  telefone: string
  userId?: string
  createdAt?: Timestamp
}

export interface Agendamento {
  id: string
  clienteId: string
  clienteNome: string
  data: string
  hora: string
  userId: string
  status: "pendente" | "confirmado" | "cancelado"
  createdAt?: Timestamp
}

// ─── Navigation ──────────────────────────────────────────────────────────────

export type ActiveTab = "dashboard" | "clientes" | "financeiro" | "admin"
