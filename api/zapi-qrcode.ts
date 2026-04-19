import type { VercelRequest, VercelResponse } from "@vercel/node"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).end()

  const url = `https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE_ID}/token/${process.env.ZAPI_TOKEN}/qr-code`

  try {
    const response = await fetch(url)
    const text = await response.text()

    console.log("[zapi-qrcode] status:", response.status)
    console.log("[zapi-qrcode] body:", text.slice(0, 300))

    // Tenta parsear como JSON
    let data: Record<string, unknown>
    try {
      data = JSON.parse(text)
    } catch {
      // Pode ser imagem direta (PNG)
      if (response.headers.get("content-type")?.includes("image")) {
        const qr = `data:image/png;base64,${Buffer.from(text).toString("base64")}`
        return res.status(200).json({ qr })
      }
      return res.status(200).json({ qr: null, erro: `Resposta inesperada: ${text.slice(0, 100)}` })
    }

    // Tenta diferentes campos que a Z-API pode retornar
    const qrValue =
      (data.value as string | undefined) ??
      (data.qrCode as string | undefined) ??
      (data.qr as string | undefined) ??
      (data.base64 as string | undefined)

    if (!qrValue) {
      return res.status(200).json({ qr: null, erro: `Campos recebidos: ${Object.keys(data).join(", ")}`, raw: data })
    }

    const qr = qrValue.startsWith("data:") ? qrValue : `data:image/png;base64,${qrValue}`
    return res.status(200).json({ qr })
  } catch (err) {
    console.error("[zapi-qrcode] erro:", err)
    return res.status(200).json({ qr: null, erro: String(err) })
  }
}
