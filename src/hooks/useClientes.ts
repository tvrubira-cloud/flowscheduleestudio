import { useEffect } from "react"
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  doc,
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

  const editarCliente = async (id: string, nome: string, telefone: string) => {
    if (!isFirebaseConfigured || !db) return
    try {
      await updateDoc(doc(db, "clientes", id), { nome, telefone })
      toast.success("Cliente atualizado!")
    } catch {
      toast.error("Erro ao atualizar cliente.")
    }
  }

  const deletarCliente = async (id: string) => {
    if (!isFirebaseConfigured || !db) return
    try {
      const clienteDoc = clientes.find((c) => c.id === id)
      await deleteDoc(doc(db, "clientes", id))

      // Remove o perfil de agendamento para forçar novo cadastro
      if (clienteDoc) {
        const tel = clienteDoc.telefone.replace(/\D/g, "")
        const q = query(collection(db, "perfis_clientes"), where("telefone", "==", tel))
        const snap = await getDocs(q)
        snap.forEach((d) => deleteDoc(d.ref))
      }

      toast.success("Cliente removido.")
    } catch {
      toast.error("Erro ao remover cliente.")
    }
  }

  return { clientes, adicionarCliente, editarCliente, deletarCliente }
}
