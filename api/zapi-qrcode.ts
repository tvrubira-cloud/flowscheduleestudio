import type { VercelRequest, VercelResponse } from "@vercel/node"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).end()

  try {
    const response = await fetch(
      `https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE_ID}/token/${process.env.ZAPI_TOKEN}/qr-code`,
      { headers: { "Content-Type": "application/json" } }
    )

    const data = await response.json() as { value?: string; error?: string }

    if (!data.value) {
      return res.status(200).json({ qr: null, erro: data.error ?? "QR não disponível" })
    }

    // value já vem como base64 string ou data URL
    const qr = data.value.startsWith("data:") ? data.value : `data:image/png;base64,${data.value}`
    return res.status(200).json({ qr })
  } catch (err) {
    console.error("[zapi-qrcode]", err)
    return res.status(500).json({ qr: null, erro: "Erro interno" })
  }
}
