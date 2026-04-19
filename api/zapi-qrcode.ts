import type { VercelRequest, VercelResponse } from "@vercel/node"

const BASE = process.env.EVOLUTION_URL
const KEY = process.env.EVOLUTION_KEY
const INSTANCE = process.env.EVOLUTION_INSTANCE

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).end()
  try {
    // Garante que a instância existe
    await fetch(`${BASE}/instance/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: KEY! },
      body: JSON.stringify({ instanceName: INSTANCE, integration: "WHATSAPP-BAILEYS" }),
    })

    // Busca o QR code
    const r = await fetch(`${BASE}/instance/connect/${INSTANCE}`, {
      headers: { apikey: KEY! },
    })
    const d = await r.json() as { base64?: string; code?: string }

    if (d.base64) {
      const qr = d.base64.startsWith("data:") ? d.base64 : `data:image/png;base64,${d.base64}`
      return res.status(200).json({ qr })
    }

    return res.status(200).json({ qr: null, erro: "QR não disponível — tente novamente em instantes" })
  } catch (err) {
    console.error("[zapi-qrcode]", err)
    return res.status(200).json({ qr: null, erro: String(err) })
  }
}
