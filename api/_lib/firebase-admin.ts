import { initializeApp, getApps, getApp, cert } from "firebase-admin/app"
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

let _auth: ReturnType<typeof getAuth> | undefined

export function getAdminAuth() {
  if (!_auth) _auth = getAuth(initAdmin())
  return _auth
}

// ── Firestore via REST (evita bug jwa + OpenSSL 3 no Node.js 18) ─────────────

let _cachedToken: string | null = null
let _tokenExpiry = 0

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

async function getAccessToken(): Promise<string> {
  if (_cachedToken && Date.now() < _tokenExpiry) return _cachedToken

  const email = process.env.FIREBASE_CLIENT_EMAIL!
  const rawKey = (process.env.FIREBASE_PRIVATE_KEY ?? "")
    .replace(/\\n/g, "\n")
    .replace(/^["']|["']$/g, "")
  const now = Math.floor(Date.now() / 1000)

  console.log("[firebase-admin] iss:", email)

  const keyId = process.env.FIREBASE_PRIVATE_KEY_ID
  const header = b64url(Buffer.from(JSON.stringify(
    keyId ? { alg: "RS256", typ: "JWT", kid: keyId } : { alg: "RS256", typ: "JWT" }
  )))
  const payload = b64url(Buffer.from(JSON.stringify({
    iss: email,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    scope: "https://www.googleapis.com/auth/cloud-platform",
  })))

  const unsigned = `${header}.${payload}`

  const pemBody = rawKey
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "")

  const keyBytes = Buffer.from(pemBody, "base64")

  const cryptoKey = await globalThis.crypto.subtle.importKey(
    "pkcs8",
    keyBytes,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  )

  const sigBuffer = await globalThis.crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    Buffer.from(unsigned)
  )

  const assertion = `${unsigned}.${b64url(Buffer.from(sigBuffer))}`

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${encodeURIComponent(assertion)}`,
  })

  const json = await tokenRes.json() as { access_token?: string; expires_in?: number; error?: string }
  if (!tokenRes.ok) console.error("[firebase-admin] token error:", json.error)

  if (!json.access_token) throw new Error(`Token error: ${JSON.stringify(json)}`)
  _cachedToken = json.access_token
  _tokenExpiry = Date.now() + ((json.expires_in ?? 3600) - 60) * 1000
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
