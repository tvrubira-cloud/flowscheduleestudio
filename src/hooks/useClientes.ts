import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  Timestamp,
} from "firebase/firestore"
import toast from "react-hot-toast"
import { db, isFirebaseConfigured } from "@/lib/firebase"
import { useAppStore } from "@/store/useAppStore"
import type { Cliente } from "@/types"
import type { ClienteFormData } from "@/lib/validations"

export function useClientes() {
  const { user, isDemo, clientes, addCliente, setClientes, setActiveTab } =
    useAppStore()

  const carregarClientes = async (uid: string) => {
    if (uid === "demo-user" || !isFirebaseConfigured || !db) return

    try {
      const q = query(collection(db, "clientes"), where("userId", "==", uid))
      const snapshot = await getDocs(q)
      const lista: Cliente[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Cliente, "id">),
      }))
      setClientes(lista)
    } catch (err) {
      toast.error("Erro ao carregar clientes.")
      console.error("[useClientes] carregarClientes:", err)
    }
  }

  const adicionarCliente = async ({ nome, telefone }: ClienteFormData) => {
    if (isDemo) {
      addCliente({ id: Date.now().toString(), nome, telefone })
      setActiveTab("dashboard")
      toast.success("Cliente adicionado!")
      return
    }

    if (!isFirebaseConfigured || !db || !user) return

    try {
      const docRef = await addDoc(collection(db, "clientes"), {
        nome,
        telefone,
        userId: user.uid,
        createdAt: Timestamp.now(),
      })
      addCliente({ id: docRef.id, nome, telefone, userId: user.uid })
      setActiveTab("dashboard")
      toast.success("Cliente salvo com sucesso!")
    } catch (err) {
      toast.error("Erro ao salvar cliente.")
      console.error("[useClientes] adicionarCliente:", err)
    }
  }

  return { clientes, carregarClientes, adicionarCliente }
}
