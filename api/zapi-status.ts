import type { VercelRequest, VercelResponse } from "@vercel/node"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).end()

  try {
    const response = await fetch(
      `https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE_ID}/token/${process.env.ZAPI_TOKEN}/connected`
    )
    const data = await response.json() as { connected?: boolean }
    return res.status(200).json({ conectado: data.connected === true })
  } catch {
    return res.status(200).json({ conectado: false })
  }
}
