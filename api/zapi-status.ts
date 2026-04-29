import type { VercelRequest, VercelResponse } from "@vercel/node"

const BASE = `https://api.green-api.com/waInstance${process.env.GREENAPI_ID}`
const TOKEN = process.env.GREENAPI_TOKEN

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).end()
  try {
    const r = await fetch(`${BASE}/getStateInstance/${TOKEN}`)
    const text = await r.text()
    let d: any = {}
    try { d = JSON.parse(text) } catch { d = {} }
    const conectado = d.stateInstance === "authorized"
    return res.status(200).json({ conectado })
  } catch {
    return res.status(200).json({ conectado: false })
  }
}
