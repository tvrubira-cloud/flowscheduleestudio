import { describe, it, expect } from "vitest"
import { authSchema, clienteSchema, agendamentoSchema } from "@/lib/validations"

describe("clienteSchema", () => {
  it("aceita dados válidos", () => {
    const result = clienteSchema.safeParse({ nome: "Ana Costa", telefone: "11988887777" })
    expect(result.success).toBe(true)
  })

  it("rejeita nome vazio", () => {
    const result = clienteSchema.safeParse({ nome: "", telefone: "11988887777" })
    expect(result.success).toBe(false)
  })

  it("rejeita nome muito curto", () => {
    const result = clienteSchema.safeParse({ nome: "A", telefone: "11988887777" })
    expect(result.success).toBe(false)
  })

  it("rejeita telefone com letras", () => {
    const result = clienteSchema.safeParse({ nome: "Ana Costa", telefone: "119abc" })
    expect(result.success).toBe(false)
  })

  it("rejeita telefone com menos de 10 dígitos", () => {
    const result = clienteSchema.safeParse({ nome: "Ana Costa", telefone: "119" })
    expect(result.success).toBe(false)
  })

  it("rejeita telefone com mais de 11 dígitos", () => {
    const result = clienteSchema.safeParse({ nome: "Ana Costa", telefone: "119888877771" })
    expect(result.success).toBe(false)
  })
})

describe("authSchema", () => {
  it("aceita credenciais válidas", () => {
    const result = authSchema.safeParse({ email: "user@test.com", senha: "123456" })
    expect(result.success).toBe(true)
  })

  it("rejeita e-mail inválido", () => {
    const result = authSchema.safeParse({ email: "not-an-email", senha: "123456" })
    expect(result.success).toBe(false)
  })

  it("rejeita senha muito curta", () => {
    const result = authSchema.safeParse({ email: "user@test.com", senha: "123" })
    expect(result.success).toBe(false)
  })

  it("rejeita e-mail vazio", () => {
    const result = authSchema.safeParse({ email: "", senha: "123456" })
    expect(result.success).toBe(false)
  })
})

describe("agendamentoSchema", () => {
  it("aceita data e hora válidas", () => {
    const result = agendamentoSchema.safeParse({ data: "2026-04-10", hora: "14:00" })
    expect(result.success).toBe(true)
  })

  it("rejeita data vazia", () => {
    const result = agendamentoSchema.safeParse({ data: "", hora: "14:00" })
    expect(result.success).toBe(false)
  })

  it("rejeita hora vazia", () => {
    const result = agendamentoSchema.safeParse({ data: "2026-04-10", hora: "" })
    expect(result.success).toBe(false)
  })
})
