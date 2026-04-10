# FlowSchedule AI

Plataforma SaaS de agendamentos inteligentes com integração WhatsApp e IA.

## Funcionalidades

- Autenticação via Firebase (e-mail/senha)
- Cadastro e gestão de clientes
- Criação de agendamentos com envio automático via WhatsApp
- Link público de agendamento por cliente
- Modo Demo (sem necessidade de configuração)
- Planos com pagamento via Mercado Pago

## Tecnologias

| Categoria | Tecnologia |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite 8 |
| Estilização | Tailwind CSS v4 |
| Componentes UI | Radix UI + Lucide React |
| Animações | Framer Motion |
| Estado global | Zustand |
| Validação | Zod |
| Backend/Auth | Firebase (Firestore + Auth) |
| Notificações | react-hot-toast |
| Testes | Vitest + React Testing Library |

## Pré-requisitos

- Node.js 20+
- npm 10+
- Projeto Firebase (para uso em produção)

## Setup

**1. Clone o repositório e instale as dependências:**

```bash
npm install
```

**2. Configure as variáveis de ambiente:**

```bash
cp .env.example .env.local
```

Edite `.env.local` com as credenciais do seu projeto Firebase:

```env
VITE_FIREBASE_API_KEY=sua_api_key
VITE_FIREBASE_AUTH_DOMAIN=seu_projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu_projeto_id
VITE_FIREBASE_STORAGE_BUCKET=seu_projeto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

> **Sem Firebase?** Clique em "Entrar no Modo Demo" na tela de login — nenhuma configuração necessária.

**3. Inicie o servidor de desenvolvimento:**

```bash
npm run dev
```

## Scripts disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run preview` | Prévia do build |
| `npm run lint` | Verificação de linting (ESLint) |
| `npm run test` | Testes em modo watch |
| `npm run test:run` | Testes em modo CI (sem watch) |
| `npm run test:coverage` | Cobertura de testes |
| `npm run format` | Formatar código com Prettier |
| `npm run format:check` | Verificar formatação |

## Estrutura do projeto

```
src/
├── components/
│   ├── auth/          LoginForm — tela de login/cadastro
│   ├── layout/        AppShell, Sidebar — estrutura autenticada
│   ├── shared/        ErrorBoundary — captura de erros globais
│   └── ui/            Primitivos: Button, Card, Input, Tabs
├── hooks/
│   ├── useAuth.ts     Login, registro, demo, logout
│   └── useClientes.ts CRUD de clientes (Firebase ou demo)
├── lib/
│   ├── firebase.ts    Inicialização via variáveis de ambiente
│   ├── utils.ts       Utilitários (cn)
│   └── validations.ts Schemas Zod para todos os formulários
├── pages/
│   ├── DashboardPage  Lista de clientes + agendamento WhatsApp
│   ├── ClientesPage   Formulário de cadastro de clientes
│   └── FinanceiroPage Planos e pagamento
├── store/
│   └── useAppStore.ts Estado global (Zustand)
├── tests/             Testes unitários e de integração
└── types/
    └── index.ts       Interfaces TypeScript compartilhadas
```

## Configuração Firebase

1. Acesse [console.firebase.google.com](https://console.firebase.google.com)
2. Crie um projeto e adicione um app Web
3. Ative **Authentication > Email/Password**
4. Ative o **Firestore Database**
5. Copie as credenciais para `.env.local`

## Configuração Mercado Pago

Para ativar pagamentos reais, substitua a URL placeholder em [src/pages/FinanceiroPage.tsx](src/pages/FinanceiroPage.tsx) pela URL do seu checkout Mercado Pago.

## Contribuindo

1. Fork o repositório
2. Crie uma branch: `git checkout -b feat/minha-feature`
3. Faça commit: `git commit -m "feat: adicionar funcionalidade X"`
4. Abra um Pull Request
