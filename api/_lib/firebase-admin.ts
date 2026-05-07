import { initializeApp, getApps, getApp, cert } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"

function parsePrivateKey(raw: string | undefined): string {
  if (!raw) return ""
  let key = raw
    .replace(/\\n/g, "\n")   // unescape literal \n
    .replace(/^["']|["']$/g, "") // strip surrounding quotes
    .trim()
  // Truncate anything after the PEM end marker (e.g. trailing comma from .env.local)
  const endMarker = "-----END PRIVATE KEY-----"
  const endIdx = key.indexOf(endMarker)
  if (endIdx !== -1) key = key.slice(0, endIdx + endMarker.length) + "\n"
  return key
}

function initAdmin() {
  if (getApps().length) return getApp()
  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: parsePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
    }),
  })
}

let _auth: ReturnType<typeof getAuth> | undefined
let _db: ReturnType<typeof getFirestore> | undefined

export function getAdminAuth() {
  if (!_auth) _auth = getAuth(initAdmin())
  return _auth
}

export function getAdminDb() {
  if (!_db) _db = getFirestore(initAdmin())
  return _db
}

// ── Firestore via REST ────────────────────────────────────────────────────────

let _cachedToken: string | null = null
let _tokenExpiry = 0

async function getAccessToken(): Promise<string> {
  if (_cachedToken && Date.now() < _tokenExpiry) return _cachedToken
  const app = initAdmin()
  const result = await (app.options as any).credential.getAccessToken() as { access_token: string; expires_in: number }
  _cachedToken = result.access_token
  _tokenExpiry = Date.now() + (result.expires_in - 60) * 1000
  return _cachedToken
}

type FValue =
  | { stringValue: string }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { timestampValue: string }
  | { nullValue: null }
  | { mapValue: { fields: Record<string, FValue> } }

function toFValue(v: unknown): FValue {
  if (v === null || v === undefined) return { nullValue: null }
  if (typeof v === "boolean") return { booleanValue: v }
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }
  if (v instanceof Date) return { timestampValue: v.toISOString() }
  if (typeof v === "string") return { stringValue: v }
  if (typeof v === "object") {
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(v as Record<string, unknown>).map(([k, val]) => [k, toFValue(val)])
        ),
      },
    }
  }
  return { stringValue: String(v) }
}

export function fromFirestoreFields(fields: Record<string, unknown> | null): Record<string, unknown> {
  if (!fields) return {}
  const result: Record<string, unknown> = {}
  for (const [key, rawVal] of Object.entries(fields)) {
    const fv = rawVal as Record<string, unknown>
    if ("stringValue" in fv) result[key] = fv.stringValue
    else if ("booleanValue" in fv) result[key] = fv.booleanValue
    else if ("integerValue" in fv) result[key] = Number(fv.integerValue)
    else if ("doubleValue" in fv) result[key] = fv.doubleValue
    else if ("timestampValue" in fv) result[key] = new Date(fv.timestampValue as string)
    else if ("nullValue" in fv) result[key] = null
  }
  return result
}

export async function firestoreGet(
  collection: string,
  docId: string
): Promise<Record<string, unknown> | null> {
  const projectId = process.env.FIREBASE_PROJECT_ID!
  const token = await getAccessToken()

  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}/${docId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )

  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Firestore GET ${res.status}: ${await res.text()}`)

  const doc = await res.json() as { fields?: Record<string, unknown> }
  return doc.fields ?? null
}

export async function firestoreDelete(
  collection: string,
  docId: string
): Promise<void> {
  const projectId = process.env.FIREBASE_PROJECT_ID!
  const token = await getAccessToken()
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}/${docId}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok && res.status !== 404) throw new Error(`Firestore DELETE ${res.status}: ${await res.text()}`)
}

export async function firestoreSet(
  collection: string,
  docId: string,
  data: Record<string, unknown>,
  merge = true
): Promise<void> {
  const projectId = process.env.FIREBASE_PROJECT_ID!
  const token = await getAccessToken()

  const fields: Record<string, FValue> = {}
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) fields[k] = toFValue(v)
  }

  const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}/${docId}`
  const qs = merge
    ? "?" + Object.keys(fields).map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join("&")
    : ""

  const res = await fetch(base + qs, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields }),
  })

  if (!res.ok) throw new Error(`Firestore REST ${res.status}: ${await res.text()}`)
}
