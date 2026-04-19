import type { VercelRequest, VercelResponse } from "@vercel/node"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).end()

  try {
    const response = await fetch(
      `https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE_ID}/token/${process.env.ZAPI_TOKEN}/qr-code/image`,
      { headers: { "Content-Type": "application/json" } }
    )

    if (!response.ok) return res.status(response.status).json({ error: "Falha ao obter QR Code" })

    const buffer = await response.arrayBuffer()
    res.setHeader("Content-Type", "image/png")
    res.setHeader("Cache-Control", "no-store")
    return res.status(200).send(Buffer.from(buffer))
  } catch {
    return res.status(500).json({ error: "Erro interno" })
  }
}
