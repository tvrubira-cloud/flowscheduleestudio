import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")

  return {
    plugins: [
      react(),
      {
        name: "zapi-local-proxy",
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url?.startsWith("/api/whatsapp")) {
              const url = new URL(req.url, `http://${req.headers.host}`)
              const action = url.searchParams.get("action")
              const BASE = `https://api.green-api.com/waInstance${env.GREENAPI_ID || ""}`
              const TOKEN = env.GREENAPI_TOKEN || ""

              try {
                if (action === "qrcode") {
                  console.log("[Z-API] Buscando QR Code...")
                  const controller = new AbortController()
                  const timeoutId = setTimeout(() => controller.abort(), 10000)
                  const r = await fetch(`${BASE}/qr/${TOKEN}`, { signal: controller.signal })
                  clearTimeout(timeoutId)
                  
                  const text = await r.text()
                  let d: any = {}
                  try { d = JSON.parse(text) } catch { d = { message: text } }
                  
                  res.setHeader("Content-Type", "application/json")
                  if (d.type === "qrCode" && d.message) {
                    console.log("[Z-API] QR Code recebido com sucesso")
                    const qr = d.message.startsWith("data:") ? d.message : `data:image/png;base64,${d.message}`
                    res.end(JSON.stringify({ qr }))
                  } else if (d.type === "alreadyLogged") {
                    console.log("[Z-API] Já está logado")
                    res.end(JSON.stringify({ qr: null, erro: "alreadyLogged" }))
                  } else {
                    console.log("[Z-API] QR não disponível:", d.message)
                    res.end(JSON.stringify({ qr: null, erro: d.message || "QR não disponível" }))
                  }
                } else if (action === "status") {
                  const r = await fetch(`${BASE}/getStateInstance/${TOKEN}`)
                  const text = await r.text()
                  let d: any = {}
                  try { d = JSON.parse(text) } catch { d = {} }
                  res.setHeader("Content-Type", "application/json")
                  res.end(JSON.stringify({ conectado: d.stateInstance === "authorized" }))
                } else if (action === "logout") {
                  console.log("[Z-API] Solicitando logout...")
                  const r = await fetch(`${BASE}/logout/${TOKEN}`)
                  const text = await r.text()
                  let d: any = {}
                  try { d = JSON.parse(text) } catch { d = {} }
                  
                  let ok = d.isLogout || d.status === "success" || !text
                  if (!ok) {
                    console.log("[Z-API] Logout falhou, tentando Reboot...")
                    const r2 = await fetch(`${BASE}/reboot/${TOKEN}`)
                    const text2 = await r2.text()
                    let d2: any = {}
                    try { d2 = JSON.parse(text2) } catch { d2 = {} }
                    ok = d2.status === "success" || d2.reboot || !text2
                  }

                  res.setHeader("Content-Type", "application/json")
                  console.log("[Z-API] Resultado final (Logout/Reboot):", ok ? "Sucesso" : "Falha")
                  res.end(JSON.stringify({ ok }))
                } else {
                  res.statusCode = 400
                  res.end(JSON.stringify({ error: "Ação inválida" }))
                }
              } catch (e) {
                console.error("[Z-API] Erro na proxy:", String(e))
                res.setHeader("Content-Type", "application/json")
                res.end(JSON.stringify({ error: String(e) }))
              }
              return
            }
            next()
          })
        },
      },
      // Serve rotas /api/admin-* localmente via Firestore REST (evita bug gRPC no Node.js 24)
      {
        name: "admin-api-dev",
        configureServer(server) {
          // ── Firebase Admin App (compartilhado) ───────────────────────────────
          let _fbApp: import("firebase-admin/app").App | undefined
          let _fbAuth: import("firebase-admin/auth").Auth | undefined
          let _cachedToken: string | null = null
          let _tokenExpiry = 0

          const getAdminApp = async () => {
            if (_fbApp) return _fbApp
            const { initializeApp, getApps, getApp, cert } = await import("firebase-admin/app")
            _fbApp = getApps().length ? getApp() : initializeApp({
              credential: cert({
                projectId: env.FIREBASE_PROJECT_ID,
                clientEmail: env.FIREBASE_CLIENT_EMAIL,
                privateKey: (env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n").replace(/^["']|["']$/g, ""),
              }),
            })
            return _fbApp
          }

          const getAccessToken = async (): Promise<string> => {
            if (_cachedToken && Date.now() < _tokenExpiry) return _cachedToken
            const app = await getAdminApp()
            const result = await (app.options as any).credential.getAccessToken() as { access_token: string; expires_in: number }
            _cachedToken = result.access_token
            _tokenExpiry = Date.now() + (result.expires_in - 60) * 1000
            return _cachedToken
          }

          const fsGet = async (col: string, docId: string): Promise<Record<string, unknown> | null> => {
            const token = await getAccessToken()
            const res = await fetch(
              `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${col}/${docId}`,
              { headers: { Authorization: `Bearer ${token}` } }
            )
            if (res.status === 404) return null
            if (!res.ok) { const body = await res.text(); console.error(`[fsGet] ${col}/${docId} ${res.status}:`, body.slice(0, 300)); throw new Error(`Firestore GET ${res.status}`) }
            const doc = await res.json() as { fields?: Record<string, unknown> }
            return doc.fields ?? null
          }

          const fsDelete = async (col: string, docId: string) => {
            const token = await getAccessToken()
            const res = await fetch(
              `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${col}/${docId}`,
              { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
            )
            if (!res.ok && res.status !== 404) throw new Error(`Firestore DELETE ${res.status}: ${await res.text()}`)
          }

          const fsPatch = async (col: string, docId: string, data: Record<string, unknown>) => {
            const token = await getAccessToken()
            type FV = { stringValue: string } | { booleanValue: boolean } | { timestampValue: string } | { nullValue: null }
            const toFV = (v: unknown): FV => {
              if (v === null || v === undefined) return { nullValue: null }
              if (typeof v === "boolean") return { booleanValue: v }
              if (v instanceof Date) return { timestampValue: v.toISOString() }
              return { stringValue: String(v) }
            }
            const fields: Record<string, FV> = {}
            for (const [k, v] of Object.entries(data)) fields[k] = toFV(v)
            const qs = Object.keys(fields).map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join("&")
            const res = await fetch(
              `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${col}/${docId}?${qs}`,
              { method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ fields }) }
            )
            if (!res.ok) throw new Error(`Firestore PATCH ${res.status}: ${await res.text()}`)
          }

          // Converte campos tipados do REST para valores JS
          const fromFields = (fields: Record<string, unknown> | null): Record<string, unknown> => {
            if (!fields) return {}
            const r: Record<string, unknown> = {}
            for (const [k, v] of Object.entries(fields)) {
              const fv = v as Record<string, unknown>
              if ("stringValue" in fv) r[k] = fv.stringValue
              else if ("booleanValue" in fv) r[k] = fv.booleanValue
              else if ("integerValue" in fv) r[k] = Number(fv.integerValue)
              else if ("doubleValue" in fv) r[k] = fv.doubleValue
              else if ("timestampValue" in fv) r[k] = new Date(fv.timestampValue as string)
              else if ("nullValue" in fv) r[k] = null
            }
            return r
          }

          const getAuth = async () => {
            if (_fbAuth) return _fbAuth
            const app = await getAdminApp()
            const { getAuth: ga } = await import("firebase-admin/auth")
            _fbAuth = ga(app)
            return _fbAuth
          }

          // ── Middleware /api/admin-usuarios ───────────────────────────────────
          server.middlewares.use("/api/admin-usuarios", async (req, res) => {
            res.setHeader("Content-Type", "application/json")
            try {
              const fbAuth = await getAuth()
              const token = (req.headers.authorization || "").replace("Bearer ", "")
              if (!token) { res.statusCode = 401; return res.end(JSON.stringify({ error: "Unauthorized" })) }

              let decoded: import("firebase-admin/auth").DecodedIdToken
              try { decoded = await fbAuth.verifyIdToken(token) }
              catch { res.statusCode = 401; return res.end(JSON.stringify({ error: "Invalid token" })) }

              const adminData = fromFields(await fsGet("assinaturas", decoded.uid))
              const isAdminUser = adminData.isAdmin === true || decoded.email === env.ADMIN_EMAIL
              if (!isAdminUser) { res.statusCode = 403; return res.end(JSON.stringify({ error: "Forbidden" })) }

              const allUsers: import("firebase-admin/auth").UserRecord[] = []
              let pageToken: string | undefined
              do {
                const page = await fbAuth.listUsers(1000, pageToken)
                allUsers.push(...page.users)
                pageToken = page.pageToken
              } while (pageToken)
              const uids = allUsers.map((u) => u.uid)

              const assinaturas: Record<string, Record<string, unknown>> = {}
              const nomeSaloes: Record<string, string> = {}
              for (let i = 0; i < uids.length; i += 10) {
                const batch = uids.slice(i, i + 10)
                const [assSnaps, dispSnaps] = await Promise.all([
                  Promise.all(batch.map((uid) => fsGet("assinaturas", uid))),
                  Promise.all(batch.map((uid) => fsGet("disponibilidade", uid))),
                ])
                batch.forEach((uid, idx) => {
                  assinaturas[uid] = fromFields(assSnaps[idx])
                  const d = fromFields(dispSnaps[idx])
                  if (typeof d.nomeNegocio === "string" && d.nomeNegocio) nomeSaloes[uid] = d.nomeNegocio
                })
              }

              const referrerUids = new Set<string>()
              Object.values(assinaturas).forEach((a) => { if (a.referidoPor) referrerUids.add(a.referidoPor as string) })
              const referrerEmails: Record<string, string> = {}
              for (const uid of [...referrerUids]) {
                try { const u = await fbAuth.getUser(uid); referrerEmails[uid] = u.email ?? uid } catch { referrerEmails[uid] = uid }
              }

              const agora = new Date()
              const toDate = (v: unknown) => v instanceof Date ? v : undefined
              const usuarios = allUsers.map((u) => {
                const ass = assinaturas[u.uid] ?? {}
                const trialExpiraEm = toDate(ass.trialExpiraEm)
                const expiraEm = toDate(ass.expiraEm)
                const ultimoBonus = toDate(ass.ultimoBonusIndicacao)
                const isAdm = ass.isAdmin === true
                const isPro = isAdm || (ass.plano === "pro" && ass.status === "ativo" && (!expiraEm || expiraEm > agora))
                const isTrialing = !isPro && !!trialExpiraEm && trialExpiraEm > agora
                const trialDaysLeft = isTrialing && trialExpiraEm ? Math.ceil((trialExpiraEm.getTime() - agora.getTime()) / 86400000) : null
                const statusLabel = isAdm ? "admin" : isPro ? "pro" : isTrialing ? "trial" : "gratuito"
                const refUid = ass.referidoPor as string | undefined
                return { uid: u.uid, email: u.email ?? "", nomeNegocio: nomeSaloes[u.uid] ?? null, criadoEm: u.metadata.creationTime, statusLabel, isAdmin: isAdm, expiraEm: expiraEm?.toISOString() ?? null, trialExpiraEm: trialExpiraEm?.toISOString() ?? null, trialDaysLeft, ultimoBonusIndicacao: ultimoBonus?.toISOString() ?? null, referidoPor: refUid ? (referrerEmails[refUid] ?? null) : null }
              })
              usuarios.sort((a, b) => { if (a.isAdmin !== b.isAdmin) return a.isAdmin ? -1 : 1; return new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime() })
              res.end(JSON.stringify({ usuarios }))
            } catch (e) {
              console.error("[admin-api-dev] Erro:", e)
              res.statusCode = 500
              res.end(JSON.stringify({ error: String(e) }))
            }
          })

          // ── Middleware /api/admin-ativar ─────────────────────────────────────
          server.middlewares.use("/api/admin-ativar", async (req, res) => {
            res.setHeader("Content-Type", "application/json")
            try {
              const fbAuth = await getAuth()
              const token = (req.headers.authorization || "").replace("Bearer ", "")
              if (!token) { res.statusCode = 401; return res.end(JSON.stringify({ error: "Unauthorized" })) }

              let decoded: import("firebase-admin/auth").DecodedIdToken
              try { decoded = await fbAuth.verifyIdToken(token) }
              catch { res.statusCode = 401; return res.end(JSON.stringify({ error: "Invalid token" })) }

              const adminData = fromFields(await fsGet("assinaturas", decoded.uid))
              const isAdminUser = adminData.isAdmin === true || decoded.email === env.ADMIN_EMAIL
              if (!isAdminUser) { res.statusCode = 403; return res.end(JSON.stringify({ error: "Forbidden" })) }

              const chunks: Buffer[] = []
              req.on("data", (c: Buffer) => chunks.push(c))
              req.on("end", async () => {
                try {
                  const { targetUid, dias = 30 } = JSON.parse(Buffer.concat(chunks).toString()) as { targetUid: string; dias?: number }
                  if (!targetUid) { res.statusCode = 400; return res.end(JSON.stringify({ error: "targetUid required" })) }
                  const snap = fromFields(await fsGet("assinaturas", targetUid))
                  const agora = new Date()
                  const expiraAtual = snap.expiraEm instanceof Date ? snap.expiraEm : undefined
                  const base = expiraAtual && expiraAtual > agora ? expiraAtual : agora
                  const expiraEm = new Date(base)
                  expiraEm.setDate(expiraEm.getDate() + dias)
                  await fsPatch("assinaturas", targetUid, { plano: "pro", status: "ativo", expiraEm, renovacaoAutomatica: false })
                  res.end(JSON.stringify({ ok: true, expiraEm: expiraEm.toISOString() }))
                } catch (e) { res.statusCode = 500; res.end(JSON.stringify({ error: String(e) })) }
              })
            } catch (e) {
              console.error("[admin-ativar] Erro:", e)
              res.statusCode = 500
              res.end(JSON.stringify({ error: String(e) }))
            }
          })

          // ── Middleware /api/admin-excluir ────────────────────────────────────
          server.middlewares.use("/api/admin-excluir", async (req, res) => {
            res.setHeader("Content-Type", "application/json")
            try {
              const fbAuth = await getAuth()
              const token = (req.headers.authorization || "").replace("Bearer ", "")
              if (!token) { res.statusCode = 401; return res.end(JSON.stringify({ error: "Unauthorized" })) }

              let decoded: import("firebase-admin/auth").DecodedIdToken
              try { decoded = await fbAuth.verifyIdToken(token) }
              catch { res.statusCode = 401; return res.end(JSON.stringify({ error: "Invalid token" })) }

              const adminData = fromFields(await fsGet("assinaturas", decoded.uid))
              const isAdminUser = adminData.isAdmin === true || decoded.email === env.ADMIN_EMAIL
              if (!isAdminUser) { res.statusCode = 403; return res.end(JSON.stringify({ error: "Forbidden" })) }

              const chunks: Buffer[] = []
              req.on("data", (c: Buffer) => chunks.push(c))
              req.on("end", async () => {
                try {
                  const { targetUid } = JSON.parse(Buffer.concat(chunks).toString()) as { targetUid: string }
                  if (!targetUid) { res.statusCode = 400; return res.end(JSON.stringify({ error: "targetUid required" })) }
                  if (targetUid === decoded.uid) { res.statusCode = 400; return res.end(JSON.stringify({ error: "Cannot delete yourself" })) }
                  await fbAuth.deleteUser(targetUid)
                  await fsDelete("assinaturas", targetUid)
                  await fsDelete("disponibilidade", targetUid)
                  res.end(JSON.stringify({ ok: true }))
                } catch (e) { res.statusCode = 500; res.end(JSON.stringify({ error: String(e) })) }
              })
            } catch (e) {
              console.error("[admin-excluir] Erro:", e)
              res.statusCode = 500
              res.end(JSON.stringify({ error: String(e) }))
            }
          })
        },
      },
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: ["./src/tests/setup.ts"],
      css: true,
    },
  }
})
