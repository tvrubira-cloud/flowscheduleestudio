import { useState, useEffect } from "react"
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore"
import toast from "react-hot-toast"
import { db, isFirebaseConfigured } from "@/lib/firebase"
import { useAppStore } from "@/store/useAppStore"

export const LIMITE_AGENDAMENTOS_GRATUITO = 3

export interface Assinatura {
  plano: "gratuito" | "pro"
  status: "ativo" | "inativo" | "expirado"
  ativadoEm?: Date
  expiraEm?: Date
  trialExpiraEm?: Date
  renovacaoAutomatica?: boolean
  psPreApprovalCode?: string
  codigo?: string
}

export function useAssinatura() {
  const { user } = useAppStore()
  const [assinatura, setAssinatura] = useState<Assinatura>({ plano: "gratuito", status: "ativo" })
  const [loadingAssinatura, setLoadingAssinatura] = useState(true)
  const [ativando, setAtivando] = useState(false)
  const [cancelando, setCancelando] = useState(false)

  const agora = new Date()

  const isPro =
    assinatura.plano === "pro" &&
    assinatura.status === "ativo" &&
    (!assinatura.expiraEm || assinatura.expiraEm > agora)

  const isTrialing =
    !isPro &&
    !!assinatura.trialExpiraEm &&
    assinatura.trialExpiraEm > agora

  const trialDaysLeft = isTrialing
    ? Math.ceil((assinatura.trialExpiraEm!.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24))
    : 0

  // Acesso completo = Pro pago OU dentro do trial
  const hasFullAccess = isPro || isTrialing

  // ── Carregar assinatura ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isFirebaseConfigured || !db || !user) {
      setLoadingAssinatura(false)
      return
    }

    const carregar = async () => {
      try {
        const ref = doc(db!, "assinaturas", user.uid)
        const snap = await getDoc(ref)
        if (snap.exists()) {
          const data = snap.data()
          setAssinatura({
            plano: data.plano ?? "gratuito",
            status: data.status ?? "ativo",
            ativadoEm: data.ativadoEm?.toDate?.() ?? undefined,
            expiraEm: data.expiraEm?.toDate?.() ?? undefined,
            trialExpiraEm: data.trialExpiraEm?.toDate?.() ?? undefined,
            renovacaoAutomatica: data.renovacaoAutomatica ?? false,
            psPreApprovalCode: data.psPreApprovalCode ?? undefined,
            codigo: data.codigo,
          })
        }
      } catch (err) {
        console.error("[useAssinatura] carregar:", err)
      } finally {
        setLoadingAssinatura(false)
      }
    }

    carregar()
  }, [user])

  // ── Criar assinatura recorrente via PagSeguro ─────────────────────────────
  const criarAssinatura = async (nome: string): Promise<void> => {
    if (!user?.email) {
      toast.error("Você precisa estar logado para assinar.")
      return
    }

    try {
      const res = await fetch("/api/criar-assinatura", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid, nome, email: user.email }),
      })

      const data = await res.json()

      if (!res.ok || !data.checkoutUrl) {
        toast.error(data.error ?? "Erro ao criar assinatura. Tente novamente.")
        return
      }

      window.open(data.checkoutUrl, "_blank", "noopener,noreferrer")
    } catch {
      toast.error("Erro de conexão. Tente novamente.")
    }
  }

  // ── Cancelar assinatura recorrente ────────────────────────────────────────
  const cancelarAssinatura = async (): Promise<boolean> => {
    if (!user) return false

    setCancelando(true)
    try {
      const idToken = await (user as import("firebase/auth").User).getIdToken()

      const res = await fetch("/api/cancelar-assinatura", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? "Erro ao cancelar. Tente novamente.")
        return false
      }

      setAssinatura((prev) => ({ ...prev, plano: "gratuito", status: "inativo", renovacaoAutomatica: false }))
      toast.success("Assinatura cancelada. Acesso Pro válido até o fim do período.")
      return true
    } catch {
      toast.error("Erro de conexão ao cancelar. Tente novamente.")
      return false
    } finally {
      setCancelando(false)
    }
  }

  // ── Ativar plano Pro com código manual ────────────────────────────────────
  const ativarComCodigo = async (codigo: string): Promise<boolean> => {
    const codigoLimpo = codigo.trim().toUpperCase()

    if (!codigoLimpo) {
      toast.error("Digite o código de ativação.")
      return false
    }

    if (!isFirebaseConfigured || !db || !user) {
      toast.error("Você precisa estar logado para ativar o plano.")
      return false
    }

    setAtivando(true)
    try {
      const codigoRef = doc(db, "codigos_ativacao", codigoLimpo)
      const codigoSnap = await getDoc(codigoRef)

      if (!codigoSnap.exists()) {
        toast.error("Código inválido. Verifique e tente novamente.")
        return false
      }

      if (codigoSnap.data().usado) {
        toast.error("Este código já foi utilizado.")
        return false
      }

      await updateDoc(codigoRef, {
        usado: true,
        usadoPor: user.uid,
        usadoEm: serverTimestamp(),
      })

      const expiraEm = new Date()
      expiraEm.setDate(expiraEm.getDate() + 35)

      const assinaturaRef = doc(db, "assinaturas", user.uid)
      await setDoc(assinaturaRef, {
        plano: "pro",
        status: "ativo",
        codigo: codigoLimpo,
        ativadoEm: serverTimestamp(),
        expiraEm,
        renovacaoAutomatica: false,
      }, { merge: true })

      setAssinatura((prev) => ({ ...prev, plano: "pro", status: "ativo", codigo: codigoLimpo, expiraEm, renovacaoAutomatica: false }))
      toast.success("🎉 Plano Pro ativado com sucesso!")
      return true
    } catch (err) {
      console.error("[useAssinatura] ativarComCodigo:", err)
      toast.error("Erro ao ativar. Tente novamente.")
      return false
    } finally {
      setAtivando(false)
    }
  }

  return {
    assinatura,
    isPro,
    isTrialing,
    trialDaysLeft,
    hasFullAccess,
    loadingAssinatura,
    ativando,
    cancelando,
    criarAssinatura,
    cancelarAssinatura,
    ativarComCodigo,
  }
}
