import type { VercelRequest, VercelResponse } from "@vercel/node"
import { adminAuth, adminDb } from "./_lib/firebase-admin"
import { enviarNotificacaoDono } from "./_lib/email"
import { FieldValue } from "firebase-admin/firestore"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const { userId, clienteNome, clienteTelefone, clienteUid, data, hora } = req.body as {
      userId: string
      clienteNome: string
      clienteTelefone: string
      clienteUid?: string
      data: string
      hora: string
    }

    if (!userId || !clienteNome || !clienteTelefone || !data || !hora) {
      return res.status(200).json({ ok: true, skipped: "missing fields" })
    }

    // ── Sincroniza cliente na lista do salão (server-side, bypassa regras) ──
    try {
      const clientesRef = adminDb.collection("clientes")
      const existing = await clientesRef
        .where("userId", "==", userId)
        .where("telefone", "==", clienteTelefone)
        .limit(1)
        .get()

      if (existing.empty) {
        await clientesRef.add({
          nome: clienteNome,
          telefone: clienteTelefone,
          userId,
          clienteUid: clienteUid ?? null,
          createdAt: FieldValue.serverTimestamp(),
        })
        console.log(`[notificar-agendamento] Cliente adicionado: ${clienteNome} → salão ${userId}`)
      }
    } catch (err) {
      console.error("[notificar-agendamento] erro ao sincronizar cliente:", err)
    }

    // ── Notifica o dono por email ──────────────────────────────────────────
    const userRecord = await adminAuth.getUser(userId)
    const emailDono = userRecord.email
    if (!emailDono) return res.status(200).json({ ok: true, skipped: "no owner email" })

    const docSnap = await adminDb.collection("disponibilidade").doc(userId).get()
    const nomeNegocio = (docSnap.data()?.nomeNegocio as string | undefined) || "Seu negócio"

    await enviarNotificacaoDono({
      para: emailDono,
      nomeNegocio,
      clienteNome,
      clienteTelefone,
      data,
      hora,
    })

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error("[notificar-agendamento] erro:", err)
    return res.status(200).json({ ok: true, error: String(err) })
  }
}
