import { useEffect } from "react"
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth"
import { doc, setDoc, serverTimestamp } from "firebase/firestore"
import toast from "react-hot-toast"
import { auth, db, isFirebaseConfigured } from "@/lib/firebase"
import { useAppStore } from "@/store/useAppStore"
import type { AuthFormData } from "@/lib/validations"

export function useAuth() {
  const { setUser, setAuthLoading, reset } = useAppStore()

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
      toast.error("Firebase não configurado.")
      return
    }
    try {
      await signInWithEmailAndPassword(auth, email, senha)
      toast.success("Login realizado com sucesso!")
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
        toast.error("E-mail ou senha incorretos.")
      } else if (code === "auth/user-not-found") {
        toast.error("Conta não encontrada. Cadastre-se primeiro.")
      } else {
        toast.error("Falha no login. Tente novamente.")
      }
    }
  }

  const registrar = async ({ email, senha }: AuthFormData) => {
    if (!isFirebaseConfigured || !auth || !db) {
      toast.error("Firebase não configurado.")
      return
    }
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, senha)

      // Cria trial de 7 dias automaticamente
      const trialExpiraEm = new Date()
      trialExpiraEm.setDate(trialExpiraEm.getDate() + 7)

      await setDoc(doc(db, "assinaturas", cred.user.uid), {
        plano: "gratuito",
        status: "ativo",
        trialExpiraEm,
        criadoEm: serverTimestamp(),
      })

      toast.success("Conta criada! Aproveite seus 7 dias grátis 🎉")
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === "auth/email-already-in-use") {
        toast.error("E-mail já cadastrado. Faça login.")
      } else if (code === "auth/weak-password") {
        toast.error("Senha muito fraca. Use ao menos 6 caracteres.")
      } else {
        toast.error("Falha no cadastro. Tente novamente.")
      }
    }
  }

  const sair = async () => {
    if (isFirebaseConfigured && auth) {
      await signOut(auth)
    }
    reset()
    toast("Sessão encerrada.")
  }

  return { login, registrar, sair }
}
