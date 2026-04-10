import { initializeApp, getApps } from "firebase/app"
import { getAuth } from "firebase/auth"

// Instância separada do Firebase Auth para clientes
// Isso garante que o login do cliente não afeta a sessão do administrador
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const clienteApp =
  getApps().find((a) => a.name === "cliente") ??
  initializeApp(firebaseConfig, "cliente")

export const clienteAuth = getAuth(clienteApp)
