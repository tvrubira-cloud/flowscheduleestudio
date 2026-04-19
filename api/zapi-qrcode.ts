import type { VercelRequest, VercelResponse } from "@vercel/node"

const BASE = `https://api.green-api.com/waInstance${process.env.GREENAPI_ID}`
const TOKEN = process.env.GREENAPI_TOKEN

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).end()
  try {
    const r = await fetch(`${BASE}/qr/${TOKEN}`)
    const d = await r.json() as { type?: string; message?: string }

    if (d.type === "qrCode" && d.message) {
      const qr = d.message.startsWith("data:") ? d.message : `data:image/png;base64,${d.message}`
      return res.status(200).json({ qr })
    }

    if (d.type === "alreadyLogged") {
      return res.status(200).json({ qr: null, erro: "alreadyLogged" })
    }

    return res.status(200).json({ qr: null, erro: d.message ?? "QR não disponível" })
  } catch (err) {
    return res.status(200).json({ qr: null, erro: String(err) })
  }
}
