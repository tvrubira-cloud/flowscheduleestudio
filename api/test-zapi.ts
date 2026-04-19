import type { VercelRequest, VercelResponse } from "@vercel/node"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const BASE = process.env.EVOLUTION_URL
  const KEY = process.env.EVOLUTION_KEY
  const INSTANCE = process.env.EVOLUTION_INSTANCE

  const [stateRes, qrRes] = await Promise.allSettled([
    fetch(`${BASE}/instance/connectionState/${INSTANCE}`, { headers: { apikey: KEY! } }).then(r => r.json()),
    fetch(`${BASE}/instance/connect/${INSTANCE}`, { headers: { apikey: KEY! } }).then(r => r.json()),
  ])

  return res.status(200).json({
    evolutionUrl: BASE,
    instance: INSTANCE,
    keyPresente: !!KEY,
    state: stateRes.status === "fulfilled" ? stateRes.value : String(stateRes.reason),
    qr: qrRes.status === "fulfilled" ? qrRes.value : String(qrRes.reason),
  })
}
