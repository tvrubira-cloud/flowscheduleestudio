import { useState, useEffect } from "react"
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth"
import {
  doc,
  setDoc,
  getDoc,
  Timestamp,
  collection,
  addDoc,
} from "firebase/firestore"
import { clienteAuth } from "@/lib/firebase-cliente"
import { db, isFirebaseConfigured } from "@/lib/firebase"
import toast from "react-hot-toast"

export interface PerfilCliente {
  nome: string
  telefone: string
  email: string
  salonId: string
  createdAt?: Timestamp
}

export function useClienteAuth() {
  const [cliente, setCliente] = useState<User | null>(null)
  const [perfil, setPerfil] = useState<PerfilCliente | null>(null)
  const [loading, setLoading] = useState(true)
  const [processando, setProcessando] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(clienteAuth, async (user) => {
      setCliente(user)
      if (user && db) {
        try {
          const snap = await getDoc(doc(db, "perfis_clientes", user.uid))
          if (snap.exists()) setPerfil(snap.data() as PerfilCliente)
        } catch {
          setPerfil(null)
        }
      } else {
        setPerfil(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  const registrar = async (
    nome: string,
    telefone: string,
    email: string,
    senha: string,
    salonId: string
  ): Promise<string | null> => {
    if (!isFirebaseConfigured || !db) return null
    setProcessando(true)
    try {
      const cred = await createUserWithEmailAndPassword(clienteAuth, email, senha)
      const perfilData: PerfilCliente = {
        nome: nome.trim(),
        telefone: telefone.replace(/\D/g, ""),
        email,
        salonId,
        createdAt: Timestamp.now(),
      }
      await setDoc(doc(db, "perfis_clientes", cred.user.uid), perfilData)
      setPerfil(perfilData)
      toast.success("Conta criada com sucesso!")
      return cred.user.uid
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === "auth/email-already-in-use") {
        toast.error("E-mail já cadastrado. Faça login.")
      } else if (code === "auth/weak-password") {
        toast.error("Senha muito fraca. Use ao menos 6 caracteres.")
      } else {
        toast.error("Erro ao criar conta. Tente novamente.")
      }
      return null
    } finally {
      setProcessando(false)
    }
  }

  const entrar = async (email: string, senha: string): Promise<string | null> => {
    if (!isFirebaseConfigured) return null
    setProcessando(true)
    try {
      const cred = await signInWithEmailAndPassword(clienteAuth, email, senha)
      if (db) {
        const snap = await getDoc(doc(db, "perfis_clientes", cred.user.uid))
        if (snap.exists()) setPerfil(snap.data() as PerfilCliente)
      }
      toast.success("Login realizado!")
      return cred.user.uid
    } catch {
      toast.error("E-mail ou senha incorretos.")
      return null
    } finally {
      setProcessando(false)
    }
  }

  const sair = async () => {
    await signOut(clienteAuth)
    setCliente(null)
    setPerfil(null)
  }

  return { cliente, perfil, loading, processando, registrar, entrar, sair }
}
