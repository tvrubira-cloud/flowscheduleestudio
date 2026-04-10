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

// ─── Disponibilidade ─────────────────────────────────────────────────────────

export interface Disponibilidade {
  diasSemana: number[]     // 0=Dom 1=Seg 2=Ter 3=Qua 4=Qui 5=Sex 6=Sab
  horarioInicio: string    // "09:00"
  horarioFim: string       // "18:00"
  duracaoMinutos: number   // 30 | 60 | 90 | 120
  nomeNegocio: string
}

export interface AgendamentoPublico {
  id: string
  clienteNome: string
  clienteTelefone: string
  data: string             // "YYYY-MM-DD"
  hora: string             // "HH:mm"
  userId: string           // salon owner uid
  clienteUid?: string      // cliente autenticado uid (opcional)
  status: "pendente" | "confirmado" | "cancelado"
  createdAt?: Timestamp
}

// ─── Navigation ──────────────────────────────────────────────────────────────

export type ActiveTab = "dashboard" | "clientes" | "financeiro" | "configuracoes" | "admin"
