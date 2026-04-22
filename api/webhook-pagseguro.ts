import type { VercelRequest, VercelResponse } from "@vercel/node"
import { getAdminDb } from "./_lib/firebase-admin"
import { enviarCodigoAtivacao } from "./_lib/email"
import { FieldValue } from "firebase-admin/firestore"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function gerarCodigo(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  const parte = (n: number) =>
    Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
  return `FLOW-${parte(4)}-${parte(4)}`
}

function getTag(xml: string, tag: string): string {
  return xml.match(new RegExp(`<${tag}>(.*?)</${tag}>`))?.[1] ?? ""
}

// ─── Consulta transação PagSeguro (pagamento avulso ou renovação) ─────────────

async function verificarPagamento(notificationCode: string): Promise<{
  pago: boolean
  email: string
  nome: string
  referencia: string
  preApprovalCode: string
} | null> {
  const psEmail = process.env.PAGSEGURO_EMAIL
  const psToken = process.env.PAGSEGURO_TOKEN
  if (!psEmail || !psToken) return null

  try {
    const url = `https://ws.pagseguro.uol.com.br/v3/transactions/notifications/${notificationCode}?email=${psEmail}&token=${psToken}`
    const res = await fetch(url, { headers: { Accept: "application/json" } })
    if (!res.ok) return null

    const text = await res.text()
    const status = getTag(text, "status")
    const pago = status === "3" || status === "4"
    const email = getTag(text, "email")
    const nome = getTag(text, "name")
    const referencia = getTag(text, "reference")
    const preApprovalCode = getTag(text, "preApprovalCode")

    return { pago, email, nome, referencia, preApprovalCode }
  } catch {
    return null
  }
}

// ─── Bônus de indicação ───────────────────────────────────────────────────────

async function aplicarBonusIndicacao(novoProUid: string): Promise<void> {
  try {
    const snap = await getAdminDb().collection("assinaturas").doc(novoProUid).get()
    const referidoPor = snap.data()?.referidoPor as string | undefined
    if (!referidoPor) return

    const referrerRef = getAdminDb().collection("assinaturas").doc(referidoPor)
    const referrerSnap = await referrerRef.get()
    const referrerData = referrerSnap.data()
    if (!referrerData) return

    // Referrer precisa ser Pro ativo (não admin — admin já tem acesso permanente)
    if (referrerData.isAdmin) return
    const agora = new Date()
    const expiraReferrer = referrerData.expiraEm?.toDate?.() as Date | undefined
    const isReferrerPro = referrerData.plano === "pro" && referrerData.status === "ativo" && (!expiraReferrer || expiraReferrer > agora)
    if (!isReferrerPro) return

    // Só um bônus a cada 3 meses
    const ultimoBonus = referrerData.ultimoBonusIndicacao?.toDate?.() as Date | undefined
    const treseMesesAtras = new Date(agora.getTime() - 90 * 24 * 60 * 60 * 1000)
    if (ultimoBonus && ultimoBonus > treseMesesAtras) return

    // Estende expiraEm do referrer em 30 dias
    const base = expiraReferrer && expiraReferrer > agora ? expiraReferrer : agora
    const novaExpira = new Date(base)
    novaExpira.setDate(novaExpira.getDate() + 30)

    await referrerRef.update({
      expiraEm: novaExpira,
      ultimoBonusIndicacao: FieldValue.serverTimestamp(),
    })

    console.log(`[webhook] Bônus indicação: ${referidoPor} → expira ${novaExpira.toISOString()}`)
  } catch (err) {
    console.error("[webhook] aplicarBonusIndicacao error:", err)
  }
}

// ─── Handler: mudança de status da assinatura recorrente ──────────────────────

async function handlePreApproval(notificationCode: string): Promise<void> {
  const psEmail = process.env.PAGSEGURO_EMAIL
  const psToken = process.env.PAGSEGURO_TOKEN
  if (!psEmail || !psToken) return

  try {
    const url = `https://ws.pagseguro.uol.com.br/v2/pre-approvals/notifications/${notificationCode}?email=${psEmail}&token=${psToken}`
    const res = await fetch(url, {
      headers: { Accept: "application/vnd.pagseguro.com.br.v3+xml" },
    })
    if (!res.ok) return

    const text = await res.text()
    const status = getTag(text, "status")
    const reference = getTag(text, "reference") // "PRO-{userId}"
    const preApprovalCode = getTag(text, "preApprovalCode")

    const userId = reference.startsWith("PRO-") ? reference.slice(4) : ""
    if (!userId) return

    const assinaturaRef = getAdminDb().collection("assinaturas").doc(userId)

    if (status === "ACTIVE") {
      const expiraEm = new Date()
      expiraEm.setDate(expiraEm.getDate() + 35) // 30 dias + 5 de tolerância

      await assinaturaRef.set(
        {
          plano: "pro",
          status: "ativo",
          ativadoEm: FieldValue.serverTimestamp(),
          expiraEm,
          psPreApprovalCode: preApprovalCode,
          renovacaoAutomatica: true,
        },
        { merge: true }
      )

      // Mapa de lookup para renovações mensais
      if (preApprovalCode) {
        await getAdminDb().collection("ps_preapprovals").doc(preApprovalCode).set({ userId })
      }

      // Bônus de indicação — verifica se foi indicado por usuário Pro
      await aplicarBonusIndicacao(userId)

      console.log(`[webhook] Pro ativado: ${userId}, expira ${expiraEm.toISOString()}`)
    } else if (
      status === "CANCELLED" ||
      status === "CANCELLED_BY_SENDER" ||
      status === "CANCELLED_BY_RECEIVER" ||
      status === "EXPIRED"
    ) {
      await assinaturaRef.set(
        {
          plano: "gratuito",
          status: "inativo",
          renovacaoAutomatica: false,
          canceladoEm: FieldValue.serverTimestamp(),
        },
        { merge: true }
      )

      console.log(`[webhook] Assinatura cancelada: ${userId} (${status})`)
    }
  } catch (err) {
    console.error("[webhook] handlePreApproval error:", err)
  }
}

// ─── Handler: cobrança mensal de renovação ────────────────────────────────────

async function handleRenovacao(preApprovalCode: string): Promise<void> {
  const lookupSnap = await getAdminDb().collection("ps_preapprovals").doc(preApprovalCode).get()
  if (!lookupSnap.exists) return

  const { userId } = lookupSnap.data() as { userId: string }

  const expiraEm = new Date()
  expiraEm.setDate(expiraEm.getDate() + 35)

  await getAdminDb().collection("assinaturas").doc(userId).set(
    {
      plano: "pro",
      status: "ativo",
      expiraEm,
      renovacaoAutomatica: true,
      renovadoEm: FieldValue.serverTimestamp(),
    },
    { merge: true }
  )

  console.log(`[webhook] Renovação Pro: ${userId}, expira ${expiraEm.toISOString()}`)
}

// ─── Webhook Handler ──────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const { notificationCode, notificationType } = req.body as {
    notificationCode?: string
    notificationType?: string
  }

  if (!notificationCode) {
    return res.status(200).json({ received: true })
  }

  try {
    // Mudança de status da assinatura recorrente (ativação, cancelamento)
    if (notificationType === "preApproval") {
      await handlePreApproval(notificationCode)
      return res.status(200).json({ received: true })
    }

    // Somente processa transações
    if (notificationType !== "transaction") {
      return res.status(200).json({ received: true })
    }

    const pagamento = await verificarPagamento(notificationCode)
    if (!pagamento || !pagamento.pago) {
      return res.status(200).json({ received: true, status: "not_paid" })
    }

    // Renovação mensal de assinatura recorrente
    if (pagamento.preApprovalCode) {
      await handleRenovacao(pagamento.preApprovalCode)
      return res.status(200).json({ received: true, status: "renewal" })
    }

    // Pagamento avulso (código de ativação manual) — fluxo existente
    const jaProcessado = await getAdminDb()
      .collection("pagamentos_processados")
      .doc(notificationCode)
      .get()

    if (jaProcessado.exists) {
      return res.status(200).json({ received: true, status: "already_processed" })
    }

    let codigo = ""
    for (let i = 0; i < 3; i++) {
      const tentativa = gerarCodigo()
      const existe = await getAdminDb().collection("codigos_ativacao").doc(tentativa).get()
      if (!existe.exists) {
        codigo = tentativa
        break
      }
    }

    if (!codigo) throw new Error("Não foi possível gerar um código único.")

    await getAdminDb().collection("codigos_ativacao").doc(codigo).set({
      usado: false,
      email: pagamento.email,
      nome: pagamento.nome,
      referencia: pagamento.referencia,
      notificationCode,
      criadoEm: FieldValue.serverTimestamp(),
    })

    await getAdminDb().collection("pagamentos_processados").doc(notificationCode).set({
      codigo,
      email: pagamento.email,
      processadoEm: FieldValue.serverTimestamp(),
    })

    await enviarCodigoAtivacao({
      para: pagamento.email,
      nomeCliente: pagamento.nome || "Cliente",
      codigo,
    })

    console.log(`[webhook] Código ${codigo} enviado para ${pagamento.email}`)
    return res.status(200).json({ received: true, status: "ok" })
  } catch (err) {
    console.error("[webhook] Erro:", err)
    return res.status(200).json({ received: true, status: "error" })
  }
}
