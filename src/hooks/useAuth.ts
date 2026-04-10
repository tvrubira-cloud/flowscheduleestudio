import { useEffect } from "react"
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth"
import toast from "react-hot-toast"
import { auth, isFirebaseConfigured } from "@/lib/firebase"
import { useAppStore } from "@/store/useAppStore"
import type { AuthFormData } from "@/lib/validations"

const DEMO_CLIENTS = [
  { id: "1", nome: "Ana Costa", telefone: "11988887777" },
  { id: "2", nome: "Bruno Lima", telefone: "11977776666" },
  { id: "3", nome: "Carla Souza", telefone: "21966665555" },
]

export function useAuth() {
  const { setUser, setIsDemo, setAuthLoading, setClientes, reset } = useAppStore()

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setAuthLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      setAuthLoading(false)
    })

    return unsubscribe
  }, [setUser, setAuthLoading])

  const login = async ({ email, senha }: AuthFormData) => {
    if (!isFirebaseConfigured || !auth) {
      toast.error("Firebase não configurado. Use o Modo Demo.")
      return
    }
    try {
      await signInWithEmailAndPassword(auth, email, senha)
      toast.success("Login realizado com sucesso!")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido"
      toast.error("Falha no login: " + msg)
    }
  }

  const registrar = async ({ email, senha }: AuthFormData) => {
    if (!isFirebaseConfigured || !auth) {
      toast.error("Firebase não configurado. Use o Modo Demo.")
      return
    }
    try {
      await createUserWithEmailAndPassword(auth, email, senha)
      toast.success("Conta criada com sucesso!")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido"
      toast.error("Falha no cadastro: " + msg)
    }
  }

  const entrarDemo = () => {
    setIsDemo(true)
    setUser({ email: "demo@flowschedule.ai", uid: "demo-user", isDemoUser: true })
    setClientes(DEMO_CLIENTS)
    toast.success("Bem-vindo ao Modo Demo!")
  }

  const sair = async () => {
    if (isFirebaseConfigured && auth) {
      await signOut(auth)
    }
    reset()
    toast("Sessão encerrada.")
  }

  return { login, registrar, entrarDemo, sair }
}
