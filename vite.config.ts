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
