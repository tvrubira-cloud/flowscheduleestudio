import { useState } from "react"
import {
  collection, addDoc, getDocs, query, where, Timestamp, doc, getDoc, updateDoc, deleteDoc,
} from "firebase/firestore"
import { db, isFirebaseConfigured } from "@/lib/firebase"
import type { AgendamentoPublico, Disponibilidade } from "@/types"
import { LIMITE_AGENDAMENTOS_GRATUITO } from "@/hooks/useAssinatura"

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

  const contarAgendamentosMes = async (userId: string): Promise<number> => {
    if (!isFirebaseConfigured || !db) return 0
    try {
      const agora = new Date()
      const ano = agora.getFullYear()
      const mes = String(agora.getMonth() + 1).padStart(2, "0")
      const inicioMes = `${ano}-${mes}-01`
      const fimMes = `${ano}-${mes}-31`

      const q = query(
        collection(db, "agendamentos_publicos"),
        where("userId", "==", userId),
        where("data", ">=", inicioMes),
        where("data", "<=", fimMes)
      )
      const snap = await getDocs(q)
      return snap.docs.filter((d) => d.data().status !== "cancelado").length
    } catch {
      return 0
    }
  }

  const salvarAgendamento = async (
    dados: Omit<AgendamentoPublico, "id" | "createdAt">,
    hasFullAccess = false
  ): Promise<void> => {
    if (!isFirebaseConfigured || !db) throw new Error("Firebase não configurado")
    setSalvando(true)
    try {
      // Verifica limite do plano gratuito (após trial)
      if (!hasFullAccess) {
        const assinaturaSnap = await getDoc(doc(db, "assinaturas", dados.userId))
        const assinaturaData = assinaturaSnap.exists() ? assinaturaSnap.data() : null
        const trialExpiraEm = assinaturaData?.trialExpiraEm?.toDate?.()
        const isTrialing = trialExpiraEm && trialExpiraEm > new Date()
        const isPro = assinaturaData?.plano === "pro" && assinaturaData?.status === "ativo"

        if (!isTrialing && !isPro) {
          const count = await contarAgendamentosMes(dados.userId)
          if (count >= LIMITE_AGENDAMENTOS_GRATUITO) {
            throw new Error(`LIMITE_ATINGIDO`)
          }
        }
      }
      // 1. Sincronizar com a coleção de 'clientes' do profissional (best-effort)
      try {
        const clientesRef = collection(db, "clientes")
        const q = query(
          clientesRef,
          where("userId", "==", dados.userId),
          where("telefone", "==", dados.clienteTelefone)
        )
        const clientSnap = await getDocs(q)
        if (clientSnap.empty) {
          await addDoc(clientesRef, {
            nome: dados.clienteNome,
            telefone: dados.clienteTelefone,
            userId: dados.userId,
            createdAt: Timestamp.now(),
          })
        }
      } catch {
        // Não bloqueia o agendamento se a sincronização falhar
      }

      // 2. Salvar o agendamento
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

  const editarAgendamento = async (
    id: string,
    data: string,
    hora: string
  ): Promise<void> => {
    if (!isFirebaseConfigured || !db) return
    await updateDoc(doc(db, "agendamentos_publicos", id), { data, hora })
  }

  const deletarAgendamento = async (id: string): Promise<void> => {
    if (!isFirebaseConfigured || !db) return
    await deleteDoc(doc(db, "agendamentos_publicos", id))
  }

  return {
    carregando,
    salvando,
    buscarDisponibilidade,
    buscarHorariosOcupados,
    salvarAgendamento,
    buscarAgendamentos,
    atualizarStatus,
    editarAgendamento,
    deletarAgendamento,
    contarAgendamentosMes,
  }
}
