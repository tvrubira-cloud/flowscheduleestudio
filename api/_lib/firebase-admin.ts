import { initializeApp, getApps, getApp, cert } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import { getAuth } from "firebase-admin/auth"

function initAdmin() {
  if (getApps().length) return getApp()
  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  })
}

let _db: ReturnType<typeof getFirestore> | undefined
let _auth: ReturnType<typeof getAuth> | undefined

export function getAdminDb() {
  if (!_db) {
    _db = getFirestore(initAdmin())
    // Usa REST em vez de gRPC para evitar erro SSL no Node.js 18+
    _db.settings({ preferRest: true })
  }
  return _db
}

export function getAdminAuth() {
  if (!_auth) _auth = getAuth(initAdmin())
  return _auth
}
