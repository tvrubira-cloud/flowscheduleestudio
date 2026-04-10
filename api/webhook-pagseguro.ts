import type { VercelRequest, VercelResponse } from "@vercel/node"
import { adminDb } from "./_lib/firebase-admin"
import { enviarCodigoAtivacao } from "./_lib/email"
import { FieldValue } from "firebase-admin/firestore"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function gerarCodigo(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  const parte = (n: number) =>
    Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
  return `FLOW-${parte(4)}-${parte(4)}`
}

// Consulta a API do PagSeguro para verificar se o pagamento foi aprovado
async function verificarPagamento(notificationCode: string): Promise<{
  pago: boolean
  email: string
  nome: string
  referencia: string
} | null> {
  const email = process.env.PAGSEGURO_EMAIL
  const token = process.env.PAGSEGURO_TOKEN

  if (!email || !token) return null

  try {
    const url = `https://ws.pagseguro.uol.com.br/v3/transactions/notifications/${notificationCode}?email=${email}&token=${token}`
    const res = await fetch(url, { headers: { Accept: "application/json" } })

    if (!res.ok) return null

    const text = await res.text()

    // PagSeguro retorna XML — extrai os campos necessários
    const getTag = (tag: string) => {
      const match = text.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`))
      return match?.[1] ?? ""
    }

    const status = getTag("status") // 3 = pago, 4 = disponível
    const pago = status === "3" || status === "4"
    const email = getTag("email") || getTag("senderEmail")
    const nome = getTag("name") || getTag("senderName")
    const referencia = getTag("reference")

    return { pago, email, nome, referencia }
  } catch {
    return null
  }
}

// ─── Webhook Handler ──────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // PagSeguro só usa POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const { notificationCode, notificationType } = req.body as {
    notificationCode?: string
    notificationType?: string
  }

  // Ignora notificações que não são de transação
  if (notificationType !== "transaction" || !notificationCode) {
    return res.status(200).json({ received: true })
  }

  try {
    // 1. Verifica o pagamento na API do PagSeguro
    const pagamento = await verificarPagamento(notificationCode)

    if (!pagamento || !pagamento.pago) {
      return res.status(200).json({ received: true, status: "not_paid" })
    }

    // 2. Evita processar o mesmo pagamento duas vezes
    const jaProcessado = await adminDb
      .collection("pagamentos_processados")
      .doc(notificationCode)
      .get()

    if (jaProcessado.exists) {
      return res.status(200).json({ received: true, status: "already_processed" })
    }

    // 3. Gera código único (tenta até 3 vezes para garantir unicidade)
    let codigo = ""
    for (let i = 0; i < 3; i++) {
      const tentativa = gerarCodigo()
      const existe = await adminDb.collection("codigos_ativacao").doc(tentativa).get()
      if (!existe.exists) {
        codigo = tentativa
        break
      }
    }

    if (!codigo) {
      throw new Error("Não foi possível gerar um código único.")
    }

    // 4. Salva o código no Firestore
    await adminDb.collection("codigos_ativacao").doc(codigo).set({
      usado: false,
      email: pagamento.email,
      nome: pagamento.nome,
      referencia: pagamento.referencia,
      notificationCode,
      criadoEm: FieldValue.serverTimestamp(),
    })

    // 5. Marca a notificação como processada
    await adminDb.collection("pagamentos_processados").doc(notificationCode).set({
      codigo,
      email: pagamento.email,
      processadoEm: FieldValue.serverTimestamp(),
    })

    // 6. Envia o código por e-mail
    await enviarCodigoAtivacao({
      para: pagamento.email,
      nomeCliente: pagamento.nome || "Cliente",
      codigo,
    })

    console.log(`[webhook] Código ${codigo} enviado para ${pagamento.email}`)
    return res.status(200).json({ received: true, status: "ok" })
  } catch (err) {
    console.error("[webhook] Erro:", err)
    // Retorna 200 para o PagSeguro não ficar reenviando
    return res.status(200).json({ received: true, status: "error" })
  }
}
