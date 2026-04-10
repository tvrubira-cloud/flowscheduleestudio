import { useState } from "react"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { db, isFirebaseConfigured } from "@/lib/firebase"
import { useAppStore } from "@/store/useAppStore"
import toast from "react-hot-toast"
import type { Disponibilidade } from "@/types"

export const DISPONIBILIDADE_DEFAULT: Disponibilidade = {
  diasSemana: [1, 2, 3, 4, 5],
  horarioInicio: "09:00",
  horarioFim: "18:00",
  duracaoMinutos: 60,
  nomeNegocio: "",
}

export function useDisponibilidade() {
  const { user } = useAppStore()
  const [disponibilidade, setDisponibilidade] = useState<Disponibilidade>(DISPONIBILIDADE_DEFAULT)
  const [loading, setLoading] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const carregar = async () => {
    if (!user || !isFirebaseConfigured || !db) return
    setLoading(true)
    try {
      const snap = await getDoc(doc(db, "disponibilidade", user.uid))
      if (snap.exists()) {
        setDisponibilidade(snap.data() as Disponibilidade)
      }
    } catch (err) {
      console.error("[useDisponibilidade] carregar:", err)
    } finally {
      setLoading(false)
    }
  }

  const salvar = async (dados: Disponibilidade) => {
    if (!user || !isFirebaseConfigured || !db) return
    setSalvando(true)
    try {
      await setDoc(doc(db, "disponibilidade", user.uid), dados)
      setDisponibilidade(dados)
      toast.success("Configurações salvas!")
    } catch (err) {
      toast.error("Erro ao salvar configurações.")
      console.error("[useDisponibilidade] salvar:", err)
    } finally {
      setSalvando(false)
    }
  }

  return { disponibilidade, loading, salvando, carregar, salvar, setDisponibilidade }
}
