import type { VercelRequest, VercelResponse } from "@vercel/node"

const BASE = process.env.EVOLUTION_URL
const KEY = process.env.EVOLUTION_KEY
const INSTANCE = process.env.EVOLUTION_INSTANCE

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).end()
  try {
    const r = await fetch(`${BASE}/instance/connectionState/${INSTANCE}`, {
      headers: { apikey: KEY! },
    })
    const d = await r.json() as { instance?: { state?: string } }
    const conectado = d.instance?.state === "open"
    return res.status(200).json({ conectado })
  } catch {
    return res.status(200).json({ conectado: false })
  }
}
