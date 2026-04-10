import * as functions from "firebase-functions"
import * as admin from "firebase-admin"

admin.initializeApp()

const PAGSEGURO_TOKEN = functions.config().pagseguro?.token ?? ""
const PAGSEGURO_BASE_URL =
  functions.config().pagseguro?.sandbox === "true"
    ? "https://sandbox.api.pagseguro.com"
    : "https://api.pagseguro.com"

// ─── Types ────────────────────────────────────────────────────────────────────

interface PagBankOrderRequest {
  userId: string
  userName: string
  userEmail: string
  cpf: string
  paymentMethod: "PIX" | "BOLETO" | "CREDIT_CARD"
  cardToken?: string       // somente para CREDIT_CARD
  cardHolder?: string      // somente para CREDIT_CARD
  cardInstallments?: number
}

interface PagBankOrderItem {
  reference_id: string
  name: string
  quantity: number
  unit_amount: number
}

// ─── Helper ───────────────────────────────────────────────────────────────────

async function pagseguroRequest(
  path: string,
  body: Record<string, unknown>
): Promise<unknown> {
  const res = await fetch(`${PAGSEGURO_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PAGSEGURO_TOKEN}`,
    },
    body: JSON.stringify(body),
  })

  const data = await res.json() as Record<string, unknown>

  if (!res.ok) {
    throw new functions.https.HttpsError(
      "internal",
      `PagBank API error: ${res.status}`,
      data
    )
  }

  return data
}

// ─── Cloud Function: criar cobrança ──────────────────────────────────────────

export const criarCobranca = functions.https.onCall(
  async (data: PagBankOrderRequest, context) => {
    // Garante que o usuário está autenticado
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Você precisa estar autenticado para realizar pagamentos."
      )
    }

    if (!PAGSEGURO_TOKEN) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "PagSeguro não configurado no servidor."
      )
    }

    const referenceId = `flowschedule_${data.userId}_${Date.now()}`

    const items: PagBankOrderItem[] = [
      {
        reference_id: "plano-pro",
        name: "FlowSchedule AI — Plano Pro",
        quantity: 1,
        unit_amount: 4990, // R$ 49.90 em centavos
      },
    ]

    const customer = {
      name: data.userName,
      email: data.userEmail,
      tax_id: data.cpf.replace(/\D/g, ""),
    }

    // ── PIX ──────────────────────────────────────────────────────────────────
    if (data.paymentMethod === "PIX") {
      const order = await pagseguroRequest("/orders", {
        reference_id: referenceId,
        customer,
        items,
        qr_codes: [
          {
            amount: { value: 4990 },
            expiration_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          },
        ],
        notification_urls: [
          `https://us-central1-${admin.app().options.projectId}.cloudfunctions.net/webhookPagamento`,
        ],
      }) as Record<string, unknown>

      const qrCodes = order.qr_codes as Array<Record<string, unknown>>
      return {
        tipo: "PIX",
        qrCodeText: (qrCodes?.[0] as Record<string, unknown>)?.text,
        qrCodeImage: ((qrCodes?.[0] as Record<string, unknown>)?.links as Array<Record<string, unknown>>)
          ?.find((l) => l.media === "image/png")?.href,
        referenceId,
        orderId: order.id,
      }
    }

    // ── BOLETO ────────────────────────────────────────────────────────────────
    if (data.paymentMethod === "BOLETO") {
      const vencimento = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0]

      const order = await pagseguroRequest("/orders", {
        reference_id: referenceId,
        customer,
        items,
        charges: [
          {
            reference_id: referenceId,
            description: "FlowSchedule AI — Plano Pro",
            amount: { value: 4990, currency: "BRL" },
            payment_method: {
              type: "BOLETO",
              boleto: {
                due_date: vencimento,
                instruction_lines: {
                  line_1: "Pagamento do Plano Pro FlowSchedule AI",
                  line_2: "Vencimento em 3 dias",
                },
                holder: {
                  name: customer.name,
                  tax_id: customer.tax_id,
                  email: customer.email,
                },
              },
            },
          },
        ],
        notification_urls: [
          `https://us-central1-${admin.app().options.projectId}.cloudfunctions.net/webhookPagamento`,
        ],
      }) as Record<string, unknown>

      const charges = order.charges as Array<Record<string, unknown>>
      const boleto = (charges?.[0] as Record<string, unknown>)?.payment_method as Record<string, unknown>
      return {
        tipo: "BOLETO",
        codigoBarras: (boleto?.boleto as Record<string, unknown>)?.barcode,
        pdfUrl: (charges?.[0] as Record<string, unknown>)?.links
          ? ((charges[0].links as Array<Record<string, unknown>>)
              .find((l) => l.media === "application/pdf"))?.href
          : null,
        referenceId,
        orderId: order.id,
        vencimento,
      }
    }

    // ── CARTÃO DE CRÉDITO ─────────────────────────────────────────────────────
    if (data.paymentMethod === "CREDIT_CARD" && data.cardToken) {
      const order = await pagseguroRequest("/orders", {
        reference_id: referenceId,
        customer,
        items,
        charges: [
          {
            reference_id: referenceId,
            description: "FlowSchedule AI — Plano Pro",
            amount: { value: 4990, currency: "BRL" },
            payment_method: {
              type: "CREDIT_CARD",
              installments: data.cardInstallments ?? 1,
              capture: true,
              card: {
                encrypted: data.cardToken,
                holder: { name: data.cardHolder ?? data.userName },
                store: false,
              },
            },
          },
        ],
        notification_urls: [
          `https://us-central1-${admin.app().options.projectId}.cloudfunctions.net/webhookPagamento`,
        ],
      }) as Record<string, unknown>

      const charges = order.charges as Array<Record<string, unknown>>
      const status = (charges?.[0] as Record<string, unknown>)?.status
      return {
        tipo: "CREDIT_CARD",
        status,
        aprovado: status === "AUTHORIZED" || status === "PAID",
        referenceId,
        orderId: order.id,
      }
    }

    throw new functions.https.HttpsError("invalid-argument", "Método de pagamento inválido.")
  }
)

// ─── Cloud Function: webhook de confirmação ──────────────────────────────────

export const webhookPagamento = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed")
    return
  }

  try {
    const { reference_id, charges } = req.body as {
      reference_id: string
      charges?: Array<{ status: string; amount: { value: number } }>
    }

    const chargeStatus = charges?.[0]?.status ?? "UNKNOWN"

    // Extrai userId da reference_id (formato: flowschedule_{userId}_{timestamp})
    const parts = reference_id?.split("_")
    const userId = parts?.[1]

    if (userId && chargeStatus === "PAID") {
      await admin.firestore().collection("assinaturas").doc(userId).set({
        plano: "pro",
        status: "ativo",
        referenceId: reference_id,
        ativadoEm: admin.firestore.FieldValue.serverTimestamp(),
      })
    }

    res.status(200).json({ received: true })
  } catch (err) {
    console.error("[webhook] Erro:", err)
    res.status(500).json({ error: "Erro interno" })
  }
})
