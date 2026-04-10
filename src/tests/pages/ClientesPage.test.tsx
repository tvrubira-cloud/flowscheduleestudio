import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import ClientesPage from "@/pages/ClientesPage"

// Mock hooks
vi.mock("@/hooks/useClientes", () => ({
  useClientes: () => ({
    clientes: [],
    adicionarCliente: vi.fn(),
    carregarClientes: vi.fn(),
  }),
}))

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

describe("ClientesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renderiza o formulário de cadastro", () => {
    render(<ClientesPage />)
    expect(screen.getByLabelText(/nome completo/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/whatsapp/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /salvar cliente/i })).toBeInTheDocument()
  })

  it("mostra erro ao tentar salvar com nome vazio", async () => {
    render(<ClientesPage />)
    fireEvent.click(screen.getByRole("button", { name: /salvar cliente/i }))
    await waitFor(() => {
      expect(screen.getAllByRole("alert").length).toBeGreaterThan(0)
    })
  })

  it("mostra erro quando telefone tem menos de 10 dígitos", async () => {
    render(<ClientesPage />)
    fireEvent.change(screen.getByLabelText(/nome completo/i), {
      target: { value: "João Silva" },
    })
    fireEvent.change(screen.getByLabelText(/whatsapp/i), {
      target: { value: "119" },
    })
    fireEvent.click(screen.getByRole("button", { name: /salvar cliente/i }))
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument()
    })
  })

  it("o campo telefone aceita apenas números", () => {
    render(<ClientesPage />)
    const input = screen.getByLabelText(/whatsapp/i) as HTMLInputElement
    fireEvent.change(input, { target: { value: "11abc9999" } })
    expect(input.value).toBe("119999")
  })
})
