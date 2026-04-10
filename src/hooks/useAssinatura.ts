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

export interface Assinatura {
  plano: "gratuito" | "pro"
  status: "ativo" | "inativo" | "expirado"
  ativadoEm?: Date
  codigo?: string
}

export function useAssinatura() {
  const { user, isDemo } = useAppStore()
  const [assinatura, setAssinatura] = useState<Assinatura>({ plano: "gratuito", status: "ativo" })
  const [loadingAssinatura, setLoadingAssinatura] = useState(true)
  const [ativando, setAtivando] = useState(false)

  const isPro = assinatura.plano === "pro" && assinatura.status === "ativo"

  // ── Carregar assinatura do usuário ────────────────────────────────────────
  useEffect(() => {
    if (isDemo || !isFirebaseConfigured || !db || !user) {
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
            status: data.status ?? "inativo",
            ativadoEm: data.ativadoEm?.toDate?.() ?? undefined,
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
  }, [user, isDemo])

  // ── Ativar plano Pro com código ──────────────────────────────────────────
  const ativarComCodigo = async (codigo: string): Promise<boolean> => {
    const codigoLimpo = codigo.trim().toUpperCase()

    if (!codigoLimpo) {
      toast.error("Digite o código de ativação.")
      return false
    }

    if (isDemo) {
      toast.error("No Modo Demo a ativação não é salva. Crie uma conta real.")
      return false
    }

    if (!isFirebaseConfigured || !db || !user) {
      toast.error("Você precisa estar logado para ativar o plano.")
      return false
    }

    setAtivando(true)
    try {
      // 1. Verifica se o código existe e está disponível
      const codigoRef = doc(db, "codigos_ativacao", codigoLimpo)
      const codigoSnap = await getDoc(codigoRef)

      if (!codigoSnap.exists()) {
        toast.error("Código inválido. Verifique e tente novamente.")
        return false
      }

      const codigoData = codigoSnap.data()

      if (codigoData.usado) {
        toast.error("Este código já foi utilizado.")
        return false
      }

      // 2. Marca o código como usado
      await updateDoc(codigoRef, {
        usado: true,
        usadoPor: user.uid,
        usadoEm: serverTimestamp(),
      })

      // 3. Ativa o plano Pro do usuário
      const assinaturaRef = doc(db, "assinaturas", user.uid)
      await setDoc(assinaturaRef, {
        plano: "pro",
        status: "ativo",
        codigo: codigoLimpo,
        ativadoEm: serverTimestamp(),
      })

      setAssinatura({ plano: "pro", status: "ativo", codigo: codigoLimpo })
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

  return { assinatura, isPro, loadingAssinatura, ativando, ativarComCodigo }
}
