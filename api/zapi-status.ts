import type { VercelRequest, VercelResponse } from "@vercel/node"

const BASE = `https://api.maytapi.com/api/${process.env.MAYTAPI_PRODUCT_ID}`
const HEADERS = { "x-maytapi-key": process.env.MAYTAPI_TOKEN!, "Content-Type": "application/json" }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).end()
  try {
    const r = await fetch(`${BASE}/listPhones`, { headers: HEADERS })
    const phones = await r.json() as Array<{ id: number; status: string }>
    const phone = phones.find((p) => String(p.id) === process.env.MAYTAPI_PHONE_ID)
    const conectado = phone?.status === "active"
    return res.status(200).json({ conectado })
  } catch {
    return res.status(200).json({ conectado: false })
  }
}
