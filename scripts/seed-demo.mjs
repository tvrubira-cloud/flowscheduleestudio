import { initializeApp, cert } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore, Timestamp } from "firebase-admin/firestore"
import { readFileSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

// Lê o .env.local
const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, "../.env.local")
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter(l => l.includes("=") && !l.startsWith("#"))
    .map(l => l.split("=").map(s => s.trim()))
    .map(([k, ...v]) => [k, v.join("=").replace(/^"|"$/g, "")])
)

initializeApp({
  credential: cert({
    projectId: env.FIREBASE_PROJECT_ID,
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
    privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
})

const auth = getAuth()
const db = getFirestore()

const DEMO_EMAIL = "demo.salao@flowschedule.online"
const DEMO_SENHA = "demo123456"

const CLIENTES = [
  { nome: "Ana Paula Silva", telefone: "11991234567" },
  { nome: "Fernanda Costa", telefone: "11982345678" },
  { nome: "Juliana Mendes", telefone: "11973456789" },
  { nome: "Carla Oliveira", telefone: "11964567890" },
  { nome: "Patricia Santos", telefone: "11955678901" },
  { nome: "Mariana Lima", telefone: "11946789012" },
]

function diasUteis() {
  const datas = []
  const hoje = new Date()
  let d = new Date(hoje)
  while (datas.length < 6) {
    d.setDate(d.getDate() + 1)
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      datas.push(d.toISOString().split("T")[0])
    }
  }
  // 2 passados
  const passados = []
  d = new Date(hoje)
  while (passados.length < 2) {
    d.setDate(d.getDate() - 1)
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      passados.push(d.toISOString().split("T")[0])
    }
  }
  return [...passados, ...datas]
}

async function main() {
  // 1. Criar ou buscar usuário demo
  let uid
  try {
    const u = await auth.getUserByEmail(DEMO_EMAIL)
    uid = u.uid
    console.log("Usuário demo já existe:", uid)
  } catch {
    const u = await auth.createUser({ email: DEMO_EMAIL, password: DEMO_SENHA })
    uid = u.uid
    console.log("Usuário demo criado:", uid)
  }

  // 2. Configurar disponibilidade
  await db.collection("disponibilidade").doc(uid).set({
    nomeNegocio: "Salão da Maria — Studio",
    diasSemana: [1, 2, 3, 4, 5, 6],
    horarioInicio: "09:00",
    horarioFim: "19:00",
    duracaoMinutos: 60,
  })
  console.log("Disponibilidade configurada")

  // 3. Criar clientes
  const clienteIds = []
  for (const c of CLIENTES) {
    const ref = await db.collection("clientes").add({ ...c, userId: uid, createdAt: Timestamp.now() })
    clienteIds.push({ id: ref.id, ...c })
  }
  console.log(`${CLIENTES.length} clientes criados`)

  // 4. Criar agendamentos
  const datas = diasUteis()
  const horarios = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"]
  const statuses = ["confirmado", "confirmado", "confirmado", "pendente", "pendente", "cancelado", "confirmado", "confirmado"]

  const agendamentos = clienteIds.map((c, i) => ({
    clienteNome: c.nome,
    clienteTelefone: c.telefone,
    data: datas[i % datas.length],
    hora: horarios[i % horarios.length],
    userId: uid,
    status: statuses[i % statuses.length],
    createdAt: Timestamp.now(),
  }))

  // Adiciona mais alguns
  agendamentos.push(
    { clienteNome: "Ana Paula Silva", clienteTelefone: "11991234567", data: datas[2], hora: "14:00", userId: uid, status: "confirmado", createdAt: Timestamp.now() },
    { clienteNome: "Fernanda Costa", clienteTelefone: "11982345678", data: datas[3], hora: "10:00", userId: uid, status: "pendente", createdAt: Timestamp.now() },
    { clienteNome: "Juliana Mendes", clienteTelefone: "11973456789", data: datas[4], hora: "15:00", userId: uid, status: "confirmado", createdAt: Timestamp.now() },
  )

  for (const ag of agendamentos) {
    await db.collection("agendamentos_publicos").add(ag)
  }
  console.log(`${agendamentos.length} agendamentos criados`)

  console.log("\n✅ Conta demo pronta!")
  console.log(`   Email: ${DEMO_EMAIL}`)
  console.log(`   Senha: ${DEMO_SENHA}`)
  console.log(`   Acesse: https://www.flowschedule.online`)
}

main().catch(console.error)
