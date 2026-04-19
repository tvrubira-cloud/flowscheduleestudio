import type { VercelRequest, VercelResponse } from "@vercel/node"

const BASE = `https://api.maytapi.com/api/${process.env.MAYTAPI_PRODUCT_ID}`
const PHONE_ID = process.env.MAYTAPI_PHONE_ID
const HEADERS = { "x-maytapi-key": process.env.MAYTAPI_TOKEN!, "Content-Type": "application/json" }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).end()
  try {
    const r = await fetch(`${BASE}/${PHONE_ID}/qrCode`, { headers: HEADERS })
    const contentType = r.headers.get("content-type") ?? ""

    // Retorna imagem direta
    if (contentType.includes("image")) {
      const buffer = await r.arrayBuffer()
      const base64 = Buffer.from(buffer).toString("base64")
      return res.status(200).json({ qr: `data:image/png;base64,${base64}` })
    }

    // Retorna JSON com base64
    const d = await r.json() as { data?: string; qrCode?: string; message?: string }
    const raw = d.data ?? d.qrCode
    if (raw) {
      const qr = raw.startsWith("data:") ? raw : `data:image/png;base64,${raw}`
      return res.status(200).json({ qr })
    }

    return res.status(200).json({ qr: null, erro: d.message ?? "QR não disponível" })
  } catch (err) {
    return res.status(200).json({ qr: null, erro: String(err) })
  }
}
