import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import {
  Calendar,
  Link2,
  Mail,
  LayoutDashboard,
  CheckCircle2,
  Zap,
} from "lucide-react"

// ─── Animation variants ────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: "easeOut", delay: i * 0.1 },
  }),
}

const fadeIn = {
  hidden: { opacity: 0 },
  visible: (i = 0) => ({
    opacity: 1,
    transition: { duration: 0.5, ease: "easeOut", delay: i * 0.1 },
  }),
}

// ─── Sub-components ────────────────────────────────────────────────────────

function Navbar({ onEnter }: { onEnter: () => void }) {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-zinc-950/80 backdrop-blur-md">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <img src="/logo.jpg" alt="FlowSchedule AI" className="w-8 h-8 rounded-lg object-cover" />
          <span className="font-semibold text-sm tracking-tight text-white">
            FlowSchedule <span className="text-purple-400">AI</span>
          </span>
        </div>

        {/* CTA */}
        <button
          onClick={onEnter}
          className="text-sm text-zinc-300 hover:text-white transition-colors px-4 py-1.5 rounded-lg border border-white/10 hover:border-white/20 hover:bg-white/5"
        >
          Entrar
        </button>
      </div>
    </nav>
  )
}

function Hero({ onStart, onLearnMore }: { onStart: () => void; onLearnMore: () => void }) {
  return (
    <section className="pt-36 pb-20 px-4">
      <div className="max-w-4xl mx-auto text-center">
        {/* Badge */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20 mb-6"
        >
          <Zap className="w-3 h-3" />
          ✨ 7 dias grátis, sem cartão
        </motion.div>

        {/* H1 */}
        <motion.h1
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={1}
          className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white leading-tight mb-5"
        >
          Automatize seus{" "}
          <span
            className="inline-block bg-clip-text text-transparent"
            style={{
              backgroundImage: "linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)",
            }}
          >
            Agendamentos
          </span>{" "}
          com Inteligência
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={2}
          className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto mb-9 leading-relaxed"
        >
          Link de agendamento público, lembretes automáticos por e-mail e gestão
          completa de clientes — tudo em um só lugar.
        </motion.p>

        {/* CTAs */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={3}
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <button
            onClick={onStart}
            className="w-full sm:w-auto premium-gradient px-7 py-3 rounded-xl font-semibold text-white shadow-lg shadow-purple-900/30 hover:opacity-90 active:scale-95 transition-all text-sm"
          >
            Criar conta grátis
          </button>
          <button
            onClick={onLearnMore}
            className="w-full sm:w-auto text-sm text-zinc-400 hover:text-white transition-colors px-5 py-3"
          >
            Ver como funciona ↓
          </button>
        </motion.div>
      </div>
    </section>
  )
}

interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
  delay: number
}

function FeatureCard({ icon, title, description, delay }: FeatureCardProps) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      custom={delay}
      className="glass rounded-2xl p-6 flex flex-col gap-4"
    >
      <div className="w-11 h-11 rounded-xl premium-gradient flex items-center justify-center shadow-md shadow-purple-900/20 text-white">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-white text-sm mb-1">{title}</h3>
        <p className="text-zinc-400 text-sm leading-relaxed">{description}</p>
      </div>
    </motion.div>
  )
}

function Features({ id }: { id: string }) {
  const features = [
    {
      icon: <Link2 className="w-5 h-5" />,
      title: "Link público de agendamento",
      description:
        "Compartilhe um link e seus clientes agendam sozinhos, 24h por dia.",
    },
    {
      icon: <Mail className="w-5 h-5" />,
      title: "Lembretes automáticos",
      description:
        "Seus clientes recebem lembretes por e-mail. Zero faltas, mais profissionalismo.",
    },
    {
      icon: <LayoutDashboard className="w-5 h-5" />,
      title: "Gestão completa",
      description:
        "Dashboard com todos os agendamentos, histórico de clientes e relatórios.",
    },
  ]

  return (
    <section id={id} className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Tudo que você precisa para{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)",
              }}
            >
              crescer
            </span>
          </h2>
          <p className="text-zinc-400 text-sm max-w-lg mx-auto">
            Ferramentas pensadas para profissionais autônomos e pequenas empresas brasileiras.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <FeatureCard key={f.title} {...f} delay={i * 0.12} />
          ))}
        </div>
      </div>
    </section>
  )
}

interface PricingCardProps {
  name: string
  price: string
  period: string
  perks: string[]
  popular?: boolean
  onCta: () => void
  delay: number
}

function PricingCard({
  name,
  price,
  period,
  perks,
  popular,
  onCta,
  delay,
}: PricingCardProps) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      custom={delay}
      className={`relative glass rounded-2xl p-7 flex flex-col gap-5 ${
        popular ? "border border-purple-500/30 shadow-xl shadow-purple-900/20" : ""
      }`}
    >
      {popular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-semibold px-3 py-1 rounded-full premium-gradient text-white shadow-md shadow-purple-900/30">
          Mais popular
        </span>
      )}

      <div>
        <p className="text-zinc-400 text-xs font-medium uppercase tracking-wider mb-2">
          {name}
        </p>
        <div className="flex items-end gap-1">
          <span className="text-3xl font-bold text-white">{price}</span>
          <span className="text-zinc-500 text-sm mb-1">{period}</span>
        </div>
      </div>

      <ul className="flex flex-col gap-2.5 flex-1">
        {perks.map((perk) => (
          <li key={perk} className="flex items-start gap-2 text-sm text-zinc-300">
            <CheckCircle2 className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
            {perk}
          </li>
        ))}
      </ul>

      <button
        onClick={onCta}
        className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
          popular
            ? "premium-gradient text-white shadow-md shadow-purple-900/30 hover:opacity-90"
            : "border border-white/10 text-zinc-300 hover:text-white hover:border-white/20 hover:bg-white/5"
        }`}
      >
        Começar grátis
      </button>
    </motion.div>
  )
}

function Pricing({ onCta }: { onCta: () => void }) {
  const plans: Omit<PricingCardProps, "onCta">[] = [
    {
      name: "Gratuito",
      price: "R$0",
      period: "/mês",
      perks: [
        "7 dias com tudo grátis",
        "3 agendamentos/mês após trial",
        "Link público de agendamento",
        "Gestão básica de clientes",
      ],
      delay: 0,
    },
    {
      name: "Pro",
      price: "R$49,90",
      period: "/mês",
      perks: [
        "Agendamentos ilimitados",
        "Lembretes automáticos por e-mail",
        "Relatórios completos",
        "Suporte prioritário",
      ],
      popular: true,
      delay: 0.12,
    },
  ]

  return (
    <section className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Planos simples e{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)",
              }}
            >
              transparentes
            </span>
          </h2>
          <p className="text-zinc-400 text-sm">
            Comece grátis. Escale quando quiser.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl mx-auto">
          {plans.map((plan) => (
            <PricingCard key={plan.name} {...plan} onCta={onCta} />
          ))}
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <motion.footer
      variants={fadeIn}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="py-10 px-4 border-t border-white/5"
    >
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md premium-gradient flex items-center justify-center">
            <Calendar className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-white">
            FlowSchedule <span className="text-purple-400">AI</span>
          </span>
        </div>
        <p className="text-zinc-500 text-xs text-center">
          © 2026 FlowSchedule AI · Feito para profissionais brasileiros
        </p>
      </div>
    </motion.footer>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function LandingPage() {
  const navigate = useNavigate()

  const goToRegister = () => navigate("/entrar")
  const goToApp = () => navigate("/*")

  const scrollToFeatures = () => {
    document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white overflow-x-hidden">
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-20 blur-3xl"
          style={{
            background:
              "radial-gradient(ellipse, #6366f1 0%, #a855f7 50%, transparent 80%)",
          }}
        />
      </div>

      <Navbar onEnter={goToApp} />

      <main>
        <Hero onStart={goToRegister} onLearnMore={scrollToFeatures} />
        <Features id="features" />
        <Pricing onCta={goToRegister} />
      </main>

      <Footer />
    </div>
  )
}
