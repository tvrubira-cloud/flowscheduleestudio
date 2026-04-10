import { z } from "zod"

export const authSchema = z.object({
  email: z.string().min(1, "E-mail é obrigatório").email("Formato de e-mail inválido"),
  senha: z.string().min(6, "A senha deve ter ao menos 6 caracteres"),
})

export const clienteSchema = z.object({
  nome: z
    .string()
    .min(2, "Nome deve ter ao menos 2 caracteres")
    .max(100, "Nome muito longo"),
  telefone: z
    .string()
    .min(10, "WhatsApp deve ter DDD + número (mínimo 10 dígitos)")
    .max(11, "WhatsApp deve ter no máximo 11 dígitos")
    .regex(/^\d+$/, "Use apenas números (DDD + número, sem espaços)"),
})

export const agendamentoSchema = z.object({
  data: z.string().min(1, "Selecione uma data"),
  hora: z.string().min(1, "Selecione um horário"),
})

export type AuthFormData = z.infer<typeof authSchema>
export type ClienteFormData = z.infer<typeof clienteSchema>
export type AgendamentoFormData = z.infer<typeof agendamentoSchema>
