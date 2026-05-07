import type { VercelRequest, VercelResponse } from "@vercel/node"
import { getAdminAuth, firestoreGet, firestoreDelete, fromFirestoreFields } from "./_lib/firebase-admin.js"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end()

  const token = req.headers.authorization?.replace("Bearer ", "")
  if (!token) return res.status(401).json({ error: "Unauthorized" })

  try {
    const decoded = await getAdminAuth().verifyIdToken(token)
    const adminEmail = process.env.ADMIN_EMAIL
    const adminFields = fromFirestoreFields(await firestoreGet("assinaturas", decoded.uid))
    const isAdmin = !!(adminFields.isAdmin || (adminEmail && decoded.email === adminEmail))
    if (!isAdmin) return res.status(403).json({ error: "Forbidden" })

    const { targetUid } = req.body as { targetUid: string }
    if (!targetUid) return res.status(400).json({ error: "targetUid required" })
    if (targetUid === decoded.uid) return res.status(400).json({ error: "Cannot delete yourself" })

    await getAdminAuth().deleteUser(targetUid)
    await firestoreDelete("assinaturas", targetUid)
    await firestoreDelete("disponibilidade", targetUid)

    console.log(`[admin-excluir] ${targetUid} excluído por ${decoded.email}`)
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error("[admin-excluir]", err)
    return res.status(500).json({ error: "Internal error" })
  }
}
