import { initializeApp, getApps, getApp, cert, type App } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import { getAuth } from "firebase-admin/auth"

function getAdminApp(): App {
  if (getApps().length) return getApp()
  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      `Firebase Admin env vars ausentes: PROJECT_ID=${projectId ? "ok" : "FALTANDO"} CLIENT_EMAIL=${clientEmail ? "ok" : "FALTANDO"} PRIVATE_KEY=${privateKey ? "ok" : "FALTANDO"}`
    )
  }
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })
}

export const adminDb = getFirestore(getAdminApp())
export const adminAuth = getAuth(getAdminApp())
