import type { VercelRequest, VercelResponse } from "@vercel/node"

const BASE = `https://api.green-api.com/waInstance${process.env.GREENAPI_ID}`
const TOKEN = process.env.GREENAPI_TOKEN

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { action } = req.query

  try {
    // ── STATUS ───────────────────────────────────────────────────────────────
    if (action === "status") {
      const r = await fetch(`${BASE}/getStateInstance/${TOKEN}`)
      const text = await r.text()
      let d: any = {}
      try { d = JSON.parse(text) } catch { d = {} }
      return res.status(200).json({ conectado: d.stateInstance === "authorized" })
    }

    // ── QRCODE ───────────────────────────────────────────────────────────────
    if (action === "qrcode") {
      const r = await fetch(`${BASE}/qr/${TOKEN}`)
      const text = await r.text()
      let d: any = {}
      try { d = JSON.parse(text) } catch { d = { message: text } }

      if (d.type === "qrCode" && d.message) {
        const qr = d.message.startsWith("data:") ? d.message : `data:image/png;base64,${d.message}`
        return res.status(200).json({ qr })
      } else if (d.type === "alreadyLogged") {
        return res.status(200).json({ qr: null, erro: "alreadyLogged" })
      } else {
        return res.status(200).json({ qr: null, erro: d.message || "QR não disponível" })
      }
    }

    // ── LOGOUT ───────────────────────────────────────────────────────────────
    if (action === "logout") {
      if (req.method !== "POST") return res.status(405).end()
      
      // Tenta Logout
      const r = await fetch(`${BASE}/logout/${TOKEN}`)
      const text = await r.text()
      let d: any = {}
      try { d = JSON.parse(text) } catch { d = {} }
      let ok = d.isLogout || d.status === "success" || !text

      // Se falhar o logout, tenta Reboot
      if (!ok) {
        const r2 = await fetch(`${BASE}/reboot/${TOKEN}`)
        const text2 = await r2.text()
        let d2: any = {}
        try { d2 = JSON.parse(text2) } catch { d2 = {} }
        ok = d2.status === "success" || d2.reboot || !text2
      }
      return res.status(200).json({ ok })
    }

    return res.status(400).json({ error: "Ação inválida" })
  } catch (err) {
    console.error("[whatsapp api]", err)
    return res.status(500).json({ error: String(err) })
  }
}
