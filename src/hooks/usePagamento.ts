import { useState } from "react"
import toast from "react-hot-toast"
import {
  criarCobranca,
  tokenizarCartao,
  type MetodoPagamento,
  type ResultadoPagamento,
  type ResultadoPix,
  type ResultadoBoleto,
  type ResultadoCartao,
} from "@/lib/pagseguro"
import { useAppStore } from "@/store/useAppStore"

export interface DadosCartao {
  numero: string
  titular: string
  mesValidade: string
  anoValidade: string
  cvv: string
  parcelas: number
}

interface UsePagamentoReturn {
  loading: boolean
  resultado: ResultadoPagamento | null
  metodoAtivo: MetodoPagamento | null
  cpf: string
  setCpf: (v: string) => void
  setMetodoAtivo: (m: MetodoPagamento | null) => void
  pagarPix: (cpf: string) => Promise<void>
  pagarBoleto: (cpf: string) => Promise<void>
  pagarCartao: (cpf: string, cartao: DadosCartao) => Promise<void>
  resetar: () => void
}

export function usePagamento(): UsePagamentoReturn {
  const { user } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState<ResultadoPagamento | null>(null)
  const [metodoAtivo, setMetodoAtivo] = useState<MetodoPagamento | null>(null)
  const [cpf, setCpf] = useState("")

  const dadosBase = () => ({
    userId: user?.uid ?? "",
    userName: user?.email?.split("@")[0] ?? "Usuário",
    userEmail: user?.email ?? "",
    cpf: cpf.replace(/\D/g, ""),
  })

  const validarCpf = (): boolean => {
    if (cpf.replace(/\D/g, "").length !== 11) {
      toast.error("CPF inválido. Informe os 11 dígitos.")
      return false
    }
    return true
  }

  const pagarPix = async (cpfParam: string) => {
    const cpfLimpo = cpfParam.replace(/\D/g, "")
    if (cpfLimpo.length !== 11) {
      toast.error("CPF inválido. Informe os 11 dígitos.")
      return
    }
    if (!user) { toast.error("Você precisa estar logado."); return }

    setLoading(true)
    try {
      const res = await criarCobranca({
        ...dadosBase(),
        cpf: cpfLimpo,
        paymentMethod: "PIX",
      })
      setResultado(res)
      toast.success("QR Code PIX gerado! Escaneie para pagar.")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar PIX.")
    } finally {
      setLoading(false)
    }
  }

  const pagarBoleto = async (cpfParam: string) => {
    const cpfLimpo = cpfParam.replace(/\D/g, "")
    if (cpfLimpo.length !== 11) {
      toast.error("CPF inválido. Informe os 11 dígitos.")
      return
    }
    if (!user) { toast.error("Você precisa estar logado."); return }

    setLoading(true)
    try {
      const res = await criarCobranca({
        ...dadosBase(),
        cpf: cpfLimpo,
        paymentMethod: "BOLETO",
      })
      setResultado(res)
      toast.success("Boleto gerado! Copie o código ou baixe o PDF.")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar boleto.")
    } finally {
      setLoading(false)
    }
  }

  const pagarCartao = async (cpfParam: string, cartao: DadosCartao) => {
    const cpfLimpo = cpfParam.replace(/\D/g, "")
    if (!validarCpf()) return
    if (!user) { toast.error("Você precisa estar logado."); return }

    const publicKey = import.meta.env.VITE_PAGSEGURO_PUBLIC_KEY
    if (!publicKey) {
      toast.error("Chave pública PagSeguro não configurada.")
      return
    }

    setLoading(true)
    try {
      const cardToken = tokenizarCartao({
        publicKey,
        holder: cartao.titular,
        number: cartao.numero.replace(/\s/g, ""),
        expMonth: cartao.mesValidade,
        expYear: cartao.anoValidade,
        securityCode: cartao.cvv,
      })

      const res = await criarCobranca({
        ...dadosBase(),
        cpf: cpfLimpo,
        paymentMethod: "CREDIT_CARD",
        cardToken,
        cardHolder: cartao.titular,
        cardInstallments: cartao.parcelas,
      }) as ResultadoCartao

      setResultado(res)
      if (res.aprovado) {
        toast.success("Pagamento aprovado! Bem-vindo ao Plano Pro!")
      } else {
        toast.error("Pagamento não aprovado. Verifique os dados do cartão.")
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao processar cartão.")
    } finally {
      setLoading(false)
    }
  }

  const resetar = () => {
    setResultado(null)
    setMetodoAtivo(null)
    setCpf("")
  }

  return {
    loading,
    resultado,
    metodoAtivo,
    cpf,
    setCpf,
    setMetodoAtivo,
    pagarPix,
    pagarBoleto,
    pagarCartao,
    resetar,
  }
}

// Re-export para uso nos componentes
export type { ResultadoPix, ResultadoBoleto, ResultadoCartao }
