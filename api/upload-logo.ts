import type { VercelRequest, VercelResponse } from "@vercel/node"
import { adminAuth, adminStorage } from "./_lib/firebase-admin"

export const config = { api: { bodyParser: { sizeLimit: "4mb" } } }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end()

  const token = req.headers.authorization?.replace("Bearer ", "")
  if (!token) return res.status(401).json({ erro: "Não autenticado" })

  let userId: string
  try {
    const decoded = await adminAuth.verifyIdToken(token)
    userId = decoded.uid
  } catch {
    return res.status(401).json({ erro: "Token inválido" })
  }

  const { base64, mimeType } = req.body as { base64?: string; mimeType?: string }
  if (!base64 || !mimeType) return res.status(400).json({ erro: "Dados inválidos" })

  const ext = mimeType.split("/")[1] ?? "png"
  const buffer = Buffer.from(base64, "base64")

  if (buffer.byteLength > 2 * 1024 * 1024) {
    return res.status(400).json({ erro: "Imagem deve ter no máximo 2MB" })
  }

  try {
    const bucket = adminStorage.bucket()
    const file = bucket.file(`logos/${userId}/logo.${ext}`)

    await file.save(buffer, { contentType: mimeType, resumable: false })
    await file.makePublic()

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`
    return res.status(200).json({ url: publicUrl })
  } catch (err) {
    console.error("[upload-logo]", err)
    return res.status(500).json({ erro: "Erro ao salvar imagem" })
  }
}
