import type { VercelRequest, VercelResponse } from "@vercel/node"
import { getAdminDb, getAdminAuth } from "./_lib/firebase-admin.js"
import { FieldValue } from "firebase-admin/firestore"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end()

  const token = req.headers.authorization?.replace("Bearer ", "")
  if (!token) return res.status(401).json({ error: "Unauthorized" })

  try {
    const decoded = await getAdminAuth().verifyIdToken(token)
    const adminSnap = await getAdminDb().collection("assinaturas").doc(decoded.uid).get()
    if (!adminSnap.data()?.isAdmin) return res.status(403).json({ error: "Forbidden" })

    const { targetUid, dias = 30 } = req.body as { targetUid: string; dias?: number }
    if (!targetUid) return res.status(400).json({ error: "targetUid required" })

    const ref = getAdminDb().collection("assinaturas").doc(targetUid)
    const snap = await ref.get()

    // Estende a partir da data atual de expiração (ou de agora)
    const agora = new Date()
    const expiraAtual = (snap.data()?.expiraEm as { toDate?: () => Date } | undefined)?.toDate?.()
    const base = expiraAtual && expiraAtual > agora ? expiraAtual : agora
    const expiraEm = new Date(base)
    expiraEm.setDate(expiraEm.getDate() + dias)

    await ref.set(
      {
        plano: "pro",
        status: "ativo",
        expiraEm,
        renovacaoAutomatica: false,
        ativadoManualmenteEm: FieldValue.serverTimestamp(),
      },
      { merge: true }
    )

    console.log(`[admin-ativar] Pro dado para ${targetUid} por ${dias} dias, expira ${expiraEm.toISOString()}`)
    return res.status(200).json({ ok: true, expiraEm: expiraEm.toISOString() })
  } catch (err) {
    console.error("[admin-ativar]", err)
    return res.status(500).json({ error: "Internal error" })
  }
}
