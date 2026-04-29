import { initializeApp, cert } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore, Timestamp } from "firebase-admin/firestore"
import { readFileSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

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

const CLIENTES = [
  { nome: "Ana Paula Silva", telefone: "11991234567" },
  { nome: "Fernanda Costa", telefone: "11982345678" },
  { nome: "Juliana Mendes", telefone: "11973456789" },
  { nome: "Carla Oliveira", telefone: "11964567890" },
  { nome: "Patricia Santos", telefone: "11955678901" },
  { nome: "Mariana Lima", telefone: "11946789012" },
]

function getDatas() {
  const datas = []
  const hoje = new Date()
  let d = new Date(hoje)
  while (datas.length < 8) {
    d = new Date(d)
    d.setDate(d.getDate() + 1)
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      datas.push(d.toISOString().split("T")[0])
    }
  }
  const passados = []
  d = new Date(hoje)
  while (passados.length < 3) {
    d = new Date(d)
    d.setDate(d.getDate() - 1)
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      passados.push(d.toISOString().split("T")[0])
    }
  }
  return [...passados.reverse(), ...datas]
}

async function main() {
  const user = await auth.getUserByEmail("demo@flowschedule.online")
  const uid = user.uid
  console.log("UID encontrado: " + uid)

  await db.collection("disponibilidade").doc(uid).set({
    nomeNegocio: "Salao da Maria Studio",
    diasSemana: [1, 2, 3, 4, 5, 6],
    horarioInicio: "09:00",
    horarioFim: "19:00",
    duracaoMinutos: 60,
  })
  console.log("Disponibilidade configurada")

  const clienteRefs = []
  for (const c of CLIENTES) {
    const ref = await db.collection("clientes").add({ ...c, userId: uid, createdAt: Timestamp.now() })
    clienteRefs.push({ id: ref.id, ...c })
  }
  console.log("Clientes criados: " + CLIENTES.length)

  const datas = getDatas()
  const horarios = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00", "18:00"]
  const statuses = ["confirmado", "confirmado", "confirmado", "pendente", "pendente", "cancelado", "confirmado", "confirmado", "confirmado", "pendente"]

  const agendamentos = [
    { clienteNome: "Ana Paula Silva", clienteTelefone: "11991234567", data: datas[0], hora: "09:00", status: "confirmado" },
    { clienteNome: "Fernanda Costa", clienteTelefone: "11982345678", data: datas[0], hora: "10:00", status: "confirmado" },
    { clienteNome: "Juliana Mendes", clienteTelefone: "11973456789", data: datas[1], hora: "14:00", status: "cancelado" },
    { clienteNome: "Carla Oliveira", clienteTelefone: "11964567890", data: datas[2], hora: "09:00", status: "confirmado" },
    { clienteNome: "Patricia Santos", clienteTelefone: "11955678901", data: datas[3], hora: "11:00", status: "pendente" },
    { clienteNome: "Mariana Lima", clienteTelefone: "11946789012", data: datas[3], hora: "15:00", status: "pendente" },
    { clienteNome: "Ana Paula Silva", clienteTelefone: "11991234567", data: datas[4], hora: "09:00", status: "confirmado" },
    { clienteNome: "Fernanda Costa", clienteTelefone: "11982345678", data: datas[5], hora: "14:00", status: "confirmado" },
    { clienteNome: "Juliana Mendes", clienteTelefone: "11973456789", data: datas[6], hora: "16:00", status: "pendente" },
    { clienteNome: "Carla Oliveira", clienteTelefone: "11964567890", data: datas[7], hora: "10:00", status: "confirmado" },
  ]

  for (const ag of agendamentos) {
    await db.collection("agendamentos_publicos").add({ ...ag, userId: uid, createdAt: Timestamp.now() })
  }
  console.log("Agendamentos criados: " + agendamentos.length)
  console.log("Conta demo populada com sucesso!")
}

main().catch(console.error)
