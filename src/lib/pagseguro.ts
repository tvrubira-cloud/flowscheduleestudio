import { getFunctions, httpsCallable } from "firebase/functions"

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type MetodoPagamento = "PIX" | "BOLETO" | "CREDIT_CARD"

export interface DadosPagamento {
  userId: string
  userName: string
  userEmail: string
  cpf: string
  paymentMethod: MetodoPagamento
  cardToken?: string
  cardHolder?: string
  cardInstallments?: number
}

export interface ResultadoPix {
  tipo: "PIX"
  qrCodeText: string
  qrCodeImage: string
  referenceId: string
  orderId: string
}

export interface ResultadoBoleto {
  tipo: "BOLETO"
  codigoBarras: string
  pdfUrl: string | null
  referenceId: string
  orderId: string
  vencimento: string
}

export interface ResultadoCartao {
  tipo: "CREDIT_CARD"
  status: string
  aprovado: boolean
  referenceId: string
  orderId: string
}

export type ResultadoPagamento = ResultadoPix | ResultadoBoleto | ResultadoCartao

// ─── PagSeguro.js (tokenização de cartão no frontend) ────────────────────────

declare global {
  interface Window {
    PagSeguro?: {
      encryptCard: (params: {
        publicKey: string
        holder: string
        number: string
        expMonth: string
        expYear: string
        securityCode: string
      }) => { encryptedCard: string; hasErrors: boolean; errors: string[] }
    }
  }
}

export function isPagSeguroLoaded(): boolean {
  return typeof window !== "undefined" && !!window.PagSeguro
}

export function tokenizarCartao(params: {
  publicKey: string
  holder: string
  number: string
  expMonth: string
  expYear: string
  securityCode: string
}): string {
  if (!window.PagSeguro) {
    throw new Error("PagSeguro.js não carregado. Recarregue a página.")
  }
  const result = window.PagSeguro.encryptCard(params)
  if (result.hasErrors) {
    throw new Error("Dados do cartão inválidos: " + result.errors.join(", "))
  }
  return result.encryptedCard
}

// ─── Serviço: chamar Firebase Function ───────────────────────────────────────

export async function criarCobranca(
  dados: DadosPagamento
): Promise<ResultadoPagamento> {
  const functions = getFunctions(undefined, "us-central1")
  const fn = httpsCallable<DadosPagamento, ResultadoPagamento>(functions, "criarCobranca")
  const result = await fn(dados)
  return result.data
}
