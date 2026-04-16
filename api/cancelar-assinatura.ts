import type { VercelRequest, VercelResponse } from "@vercel/node"
import { adminDb } from "./_lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"
import { FieldValue } from "firebase-admin/firestore"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end()

  // Verifica token Firebase do usuário
  const idToken = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : null

  if (!idToken) return res.status(401).json({ error: "Token não fornecido" })

  let userId: string
  try {
    const decoded = await getAuth().verifyIdToken(idToken)
    userId = decoded.uid
  } catch {
    return res.status(401).json({ error: "Token inválido" })
  }

  const psEmail = process.env.PAGSEGURO_EMAIL
  const psToken = process.env.PAGSEGURO_TOKEN

  if (!psEmail || !psToken) {
    return res.status(500).json({ error: "PagSeguro não configurado" })
  }

  const assinaturaSnap = await adminDb.collection("assinaturas").doc(userId).get()
  if (!assinaturaSnap.exists) {
    return res.status(404).json({ error: "Assinatura não encontrada" })
  }

  const { psPreApprovalCode } = assinaturaSnap.data() as { psPreApprovalCode?: string }

  if (!psPreApprovalCode) {
    return res.status(400).json({ error: "Código PagSeguro não encontrado. Contate o suporte." })
  }

  try {
    const psRes = await fetch(
      `https://ws.pagseguro.uol.com.br/v2/pre-approvals/${psPreApprovalCode}/cancel?email=${psEmail}&token=${psToken}`,
      {
        method: "PUT",
        headers: {
          Accept: "application/vnd.pagseguro.com.br.v3+xml",
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    )

    // 200 ou 204 = sucesso
    if (!psRes.ok && psRes.status !== 204) {
      const errText = await psRes.text()
      console.error("[cancelar-assinatura] PagSeguro error:", errText)
      return res.status(502).json({ error: "Erro ao cancelar no PagSeguro" })
    }

    await adminDb.collection("assinaturas").doc(userId).update({
      plano: "gratuito",
      status: "inativo",
      renovacaoAutomatica: false,
      canceladoEm: FieldValue.serverTimestamp(),
    })

    console.log(`[cancelar-assinatura] Assinatura cancelada: ${userId}`)
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error("[cancelar-assinatura]", err)
    return res.status(500).json({ error: "Erro interno ao cancelar assinatura" })
  }
}
