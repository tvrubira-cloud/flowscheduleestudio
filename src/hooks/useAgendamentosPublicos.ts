import { useState } from "react"
import {
  collection, addDoc, getDocs, query, where, Timestamp, doc, getDoc, updateDoc,
} from "firebase/firestore"
import { db, isFirebaseConfigured } from "@/lib/firebase"
import type { AgendamentoPublico, Disponibilidade } from "@/types"

// ─── Utilitário: gerar slots de horário ──────────────────────────────────────

export function gerarSlots(
  inicio: string,
  fim: string,
  duracaoMin: number,
  ocupados: string[]
): string[] {
  const slots: string[] = []
  const [hI, mI] = inicio.split(":").map(Number)
  const [hF, mF] = fim.split(":").map(Number)
  let current = hI * 60 + mI
  const end = hF * 60 + mF

  while (current + duracaoMin <= end) {
    const h = Math.floor(current / 60).toString().padStart(2, "0")
    const m = (current % 60).toString().padStart(2, "0")
    const slot = `${h}:${m}`
    if (!ocupados.includes(slot)) slots.push(slot)
    current += duracaoMin
  }

  return slots
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAgendamentosPublicos() {
  const [carregando, setCarregando] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const buscarDisponibilidade = async (userId: string): Promise<Disponibilidade | null> => {
    if (!isFirebaseConfigured || !db) return null
    try {
      const snap = await getDoc(doc(db, "disponibilidade", userId))
      return snap.exists() ? (snap.data() as Disponibilidade) : null
    } catch {
      return null
    }
  }

  const buscarHorariosOcupados = async (userId: string, data: string): Promise<string[]> => {
    if (!isFirebaseConfigured || !db) return []
    try {
      const q = query(
        collection(db, "agendamentos_publicos"),
        where("userId", "==", userId),
        where("data", "==", data),
        where("status", "!=", "cancelado")
      )
      const snap = await getDocs(q)
      return snap.docs.map((d) => (d.data() as AgendamentoPublico).hora)
    } catch {
      return []
    }
  }

  const salvarAgendamento = async (
    dados: Omit<AgendamentoPublico, "id" | "createdAt">
  ): Promise<void> => {
    if (!isFirebaseConfigured || !db) throw new Error("Firebase não configurado")
    setSalvando(true)
    try {
      await addDoc(collection(db, "agendamentos_publicos"), {
        ...dados,
        status: "pendente",
        createdAt: Timestamp.now(),
      })
    } finally {
      setSalvando(false)
    }
  }

  const buscarAgendamentos = async (userId: string): Promise<AgendamentoPublico[]> => {
    if (!isFirebaseConfigured || !db) return []
    setCarregando(true)
    try {
      const q = query(
        collection(db, "agendamentos_publicos"),
        where("userId", "==", userId)
      )
      const snap = await getDocs(q)
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AgendamentoPublico))
    } catch {
      return []
    } finally {
      setCarregando(false)
    }
  }

  const atualizarStatus = async (
    id: string,
    status: AgendamentoPublico["status"]
  ): Promise<void> => {
    if (!isFirebaseConfigured || !db) return
    await updateDoc(doc(db, "agendamentos_publicos", id), { status })
  }

  return {
    carregando,
    salvando,
    buscarDisponibilidade,
    buscarHorariosOcupados,
    salvarAgendamento,
    buscarAgendamentos,
    atualizarStatus,
  }
}
