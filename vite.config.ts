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
            if (req.url?.startsWith("/api/zapi-qrcode")) {
              const BASE = `https://api.green-api.com/waInstance${env.GREENAPI_ID || ""}`
              const TOKEN = env.GREENAPI_TOKEN || ""
              console.log("[Z-API] Buscando QR Code...")
              try {
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
              } catch (e) {
                console.error("[Z-API] Erro ao buscar QR:", String(e))
                res.setHeader("Content-Type", "application/json")
                res.end(JSON.stringify({ qr: null, erro: "Tempo de resposta excedido ou erro de conexão" }))
              }
              return
            }

            if (req.url?.startsWith("/api/zapi-status")) {
              const BASE = `https://api.green-api.com/waInstance${env.GREENAPI_ID || ""}`
              const TOKEN = env.GREENAPI_TOKEN || ""
              try {
                const r = await fetch(`${BASE}/getStateInstance/${TOKEN}`)
                const text = await r.text()
                let d: any = {}
                try { d = JSON.parse(text) } catch { d = {} }
                
                res.setHeader("Content-Type", "application/json")
                res.end(JSON.stringify({ conectado: d.stateInstance === "authorized" }))
              } catch {
                res.setHeader("Content-Type", "application/json")
                res.end(JSON.stringify({ conectado: false }))
              }
              return
            }

            if (req.url?.startsWith("/api/zapi-logout")) {
              const BASE = `https://api.green-api.com/waInstance${env.GREENAPI_ID || ""}`
              const TOKEN = env.GREENAPI_TOKEN || ""
              console.log("[Z-API] Solicitando logout...")

              const getState = async (): Promise<string> => {
                try {
                  const r = await fetch(`${BASE}/getStateInstance/${TOKEN}`)
                  const d: any = await r.json()
                  return d.stateInstance ?? "unknown"
                } catch { return "unknown" }
              }

              try {
                // Se já está desconectado de forma definitiva, retorna sucesso imediatamente
                const stateBefore = await getState()
                if (stateBefore !== "authorized" && stateBefore !== "unknown") {
                  console.log("[Z-API] Já desconectado, state:", stateBefore)
                  res.setHeader("Content-Type", "application/json")
                  res.end(JSON.stringify({ ok: true, state: stateBefore }))
                  return
                }

                const r = await fetch(`${BASE}/logout/${TOKEN}`)
                const text = await r.text()
                let d: any = {}
                try { d = JSON.parse(text) } catch { d = {} }
                const logoutOk = r.ok || d.isLogout || d.status === "success" || text === "" || text === "null"

                if (logoutOk) {
                  console.log("[Z-API] Logout bem-sucedido")
                  res.setHeader("Content-Type", "application/json")
                  res.end(JSON.stringify({ ok: true }))
                  return
                }

                // Confirma estado após tentativa
                const stateAfter = await getState()
                if (stateAfter !== "authorized") {
                  console.log("[Z-API] Logout confirmado via state:", stateAfter)
                  res.setHeader("Content-Type", "application/json")
                  res.end(JSON.stringify({ ok: true, state: stateAfter }))
                  return
                }

                // Última tentativa: Reboot
                console.log("[Z-API] Tentando Reboot...")
                const r2 = await fetch(`${BASE}/reboot/${TOKEN}`)
                const text2 = await r2.text()
                let d2: any = {}
                try { d2 = JSON.parse(text2) } catch { d2 = {} }
                const ok = r2.ok || d2.status === "success" || d2.reboot

                res.setHeader("Content-Type", "application/json")
                console.log("[Z-API] Resultado Reboot:", ok ? "Sucesso" : "Falha")
                res.end(JSON.stringify({ ok }))
              } catch (e) {
                console.error("[Z-API] Erro no logout:", String(e))
                res.setHeader("Content-Type", "application/json")
                res.end(JSON.stringify({ ok: false }))
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
