import { useEffect } from "react"
import {
  collection,
  addDoc,
  query,
  where,
  Timestamp,
  onSnapshot,
} from "firebase/firestore"
import toast from "react-hot-toast"
import { db, isFirebaseConfigured } from "@/lib/firebase"
import { useAppStore } from "@/store/useAppStore"
import type { Cliente } from "@/types"
import type { ClienteFormData } from "@/lib/validations"

export function useClientes() {
  const { user, isDemo, clientes, addCliente, setClientes, setActiveTab } =
    useAppStore()

  useEffect(() => {
    if (!user || user.uid === "demo-user" || !isFirebaseConfigured || !db) return

    const q = query(collection(db, "clientes"), where("userId", "==", user.uid))
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lista: Cliente[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Cliente, "id">),
      }))
      setClientes(lista)
    }, (err) => {
      console.error("[useClientes] onSnapshot error:", err)
    })

    return () => unsubscribe()
  }, [user, isFirebaseConfigured])

  const adicionarCliente = async ({ nome, telefone }: ClienteFormData) => {
    if (isDemo) {
      addCliente({ id: Date.now().toString(), nome, telefone })
      setActiveTab("dashboard")
      toast.success("Cliente adicionado!")
      return
    }

    if (!isFirebaseConfigured || !db || !user) return

    try {
      await addDoc(collection(db, "clientes"), {
        nome,
        telefone,
        userId: user.uid,
        createdAt: Timestamp.now(),
      })
      setActiveTab("dashboard")
      toast.success("Cliente salvo com sucesso!")
    } catch (err) {
      toast.error("Erro ao salvar cliente.")
      console.error("[useClientes] adicionarCliente:", err)
    }
  }

  return { clientes, adicionarCliente }
}
