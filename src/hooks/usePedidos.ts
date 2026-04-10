import { useState, useEffect } from "react"
import {
  collection, addDoc, getDocs, orderBy,
  query, serverTimestamp, where,
} from "firebase/firestore"
import toast from "react-hot-toast"
import { db, isFirebaseConfigured } from "@/lib/firebase"
import { useAppStore } from "@/store/useAppStore"

export interface PedidoPendente {
  id: string
  nome: string
  email: string
  status: "aguardando_pagamento" | "codigo_enviado"
  criadoEm?: Date
  codigo?: string
}

// ─── Salvar pedido quando cliente clica em Assinar ────────────────────────────

export async function salvarPedidoPendente(nome: string, email: string): Promise<void> {
  if (!isFirebaseConfigured || !db) return

  await addDoc(collection(db, "pedidos_pendentes"), {
    nome,
    email,
    status: "aguardando_pagamento",
    criadoEm: serverTimestamp(),
  })
}

// ─── Hook para o painel admin ─────────────────────────────────────────────────

export function usePedidos() {
  const { isDemo } = useAppStore()
  const [pedidos, setPedidos] = useState<PedidoPendente[]>([])
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState<string | null>(null)

  const carregarPedidos = async () => {
    if (isDemo || !isFirebaseConfigured || !db) {
      setLoading(false)
      return
    }
    try {
      const q = query(
        collection(db, "pedidos_pendentes"),
        where("status", "==", "aguardando_pagamento"),
        orderBy("criadoEm", "desc")
      )
      const snap = await getDocs(q)
      const lista: PedidoPendente[] = snap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<PedidoPendente, "id">),
        criadoEm: doc.data().criadoEm?.toDate?.(),
      }))
      setPedidos(lista)
    } catch (err) {
      console.error("[usePedidos]", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregarPedidos() }, [])

  const enviarCodigo = async (pedido: PedidoPendente) => {
    const adminSecret = import.meta.env.VITE_ADMIN_SECRET
    if (!adminSecret) {
      toast.error("VITE_ADMIN_SECRET não configurado.")
      return
    }

    setEnviando(pedido.id)
    try {
      const res = await fetch("/api/enviar-codigo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: adminSecret,
          pedidoId: pedido.id,
          email: pedido.email,
          nome: pedido.nome,
        }),
      })

      const data = await res.json() as { ok?: boolean; codigo?: string; error?: string }

      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Erro ao enviar código.")
        return
      }

      toast.success(`Código ${data.codigo} enviado para ${pedido.email}!`)
      // Remove da lista local
      setPedidos((prev) => prev.filter((p) => p.id !== pedido.id))
    } catch (err) {
      toast.error("Erro de conexão. Tente novamente.")
      console.error("[enviarCodigo]", err)
    } finally {
      setEnviando(null)
    }
  }

  return { pedidos, loading, enviando, enviarCodigo, recarregar: carregarPedidos }
}
