import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = "FlowSchedule AI <noreply@flowschedule-estudio.vercel.app>"

interface EnviarCodigoParams {
  para: string
  nomeCliente: string
  codigo: string
}

interface LembreteParams {
  para: string
  nomeCliente: string
  data: string       // "YYYY-MM-DD"
  hora: string       // "HH:mm"
  nomeNegocio: string
}

export async function enviarLembreteAgendamento({
  para,
  nomeCliente,
  data,
  hora,
  nomeNegocio,
}: LembreteParams): Promise<void> {
  const [ano, mes, dia] = data.split("-")
  const dataFormatada = `${dia}/${mes}/${ano}`

  await resend.emails.send({
    from: FROM,
    to: para,
    subject: `Lembrete: seu agendamento é amanhã — ${nomeNegocio}`,
    html: `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style="margin:0;padding:0;background:#09090b;font-family:sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding:40px 16px;">
              <table width="480" cellpadding="0" cellspacing="0"
                style="background:#18181b;border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">

                <!-- Header -->
                <tr>
                  <td style="padding:32px;background:linear-gradient(135deg,#1d4ed8,#7c3aed);text-align:center;">
                    <p style="margin:0;font-size:13px;font-weight:700;color:rgba(255,255,255,0.7);letter-spacing:2px;text-transform:uppercase;">
                      FlowSchedule AI
                    </p>
                    <h1 style="margin:8px 0 0;font-size:26px;font-weight:800;color:#fff;">
                      Lembrete de Agendamento
                    </h1>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding:32px;">
                    <p style="margin:0 0 16px;color:#a1a1aa;font-size:15px;line-height:1.6;">
                      Olá, <strong style="color:#fff;">${nomeCliente}</strong>! 👋
                    </p>
                    <p style="margin:0 0 24px;color:#a1a1aa;font-size:15px;line-height:1.6;">
                      Seu agendamento com <strong style="color:#fff;">${nomeNegocio}</strong> é <strong style="color:#fff;">amanhã</strong>. Não esqueça!
                    </p>

                    <!-- Data e hora -->
                    <table width="100%" cellpadding="0" cellspacing="0"
                      style="background:#09090b;border:1px solid rgba(255,255,255,0.08);border-radius:12px;margin:0 0 24px;">
                      <tr>
                        <td style="padding:20px;text-align:center;border-right:1px solid rgba(255,255,255,0.08);">
                          <p style="margin:0 0 4px;font-size:11px;color:#71717a;letter-spacing:1px;text-transform:uppercase;">Data</p>
                          <p style="margin:0;font-size:22px;font-weight:800;color:#fff;">${dataFormatada}</p>
                        </td>
                        <td style="padding:20px;text-align:center;">
                          <p style="margin:0 0 4px;font-size:11px;color:#71717a;letter-spacing:1px;text-transform:uppercase;">Horário</p>
                          <p style="margin:0;font-size:22px;font-weight:800;color:#fff;">${hora}</p>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:0 0 24px;color:#a1a1aa;font-size:14px;line-height:1.6;">
                      Se precisar cancelar ou reagendar, entre em contato com <strong style="color:#fff;">${nomeNegocio}</strong> com antecedência.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.05);text-align:center;">
                    <p style="margin:0;color:#52525b;font-size:12px;">
                      Você recebeu este lembrete pois tem um agendamento confirmado. · FlowSchedule AI
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  })
}

interface NotificacaoDonoParams {
  para: string
  nomeNegocio: string
  clienteNome: string
  clienteTelefone: string
  data: string   // "YYYY-MM-DD"
  hora: string   // "HH:mm"
}

export async function enviarNotificacaoDono({
  para,
  nomeNegocio,
  clienteNome,
  clienteTelefone,
  data,
  hora,
}: NotificacaoDonoParams): Promise<void> {
  const [ano, mes, dia] = data.split("-")
  const dataFormatada = `${dia}/${mes}/${ano}`

  await resend.emails.send({
    from: FROM,
    to: para,
    subject: `Novo agendamento — ${nomeNegocio}`,
    html: `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style="margin:0;padding:0;background:#09090b;font-family:sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding:40px 16px;">
              <table width="480" cellpadding="0" cellspacing="0"
                style="background:#18181b;border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">

                <!-- Header -->
                <tr>
                  <td style="padding:28px 32px;background:linear-gradient(135deg,#1d4ed8,#7c3aed);text-align:center;">
                    <p style="margin:0;font-size:12px;font-weight:700;color:rgba(255,255,255,0.7);letter-spacing:2px;text-transform:uppercase;">
                      FlowSchedule AI
                    </p>
                    <h1 style="margin:6px 0 0;font-size:22px;font-weight:800;color:#fff;">
                      Novo Agendamento
                    </h1>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding:28px 32px;">
                    <p style="margin:0 0 20px;color:#a1a1aa;font-size:14px;line-height:1.6;">
                      Você recebeu um novo agendamento em <strong style="color:#fff;">${nomeNegocio}</strong>.
                    </p>

                    <!-- Dados do cliente -->
                    <table width="100%" cellpadding="0" cellspacing="0"
                      style="background:#09090b;border:1px solid rgba(255,255,255,0.08);border-radius:12px;margin:0 0 20px;">
                      <tr>
                        <td style="padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.05);">
                          <p style="margin:0 0 2px;font-size:11px;color:#71717a;letter-spacing:1px;text-transform:uppercase;">Cliente</p>
                          <p style="margin:0;font-size:15px;font-weight:700;color:#fff;">${clienteNome}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.05);">
                          <p style="margin:0 0 2px;font-size:11px;color:#71717a;letter-spacing:1px;text-transform:uppercase;">Telefone</p>
                          <p style="margin:0;font-size:15px;font-weight:700;color:#fff;">${clienteTelefone}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding:16px 20px;text-align:center;border-right:1px solid rgba(255,255,255,0.05);">
                                <p style="margin:0 0 2px;font-size:11px;color:#71717a;letter-spacing:1px;text-transform:uppercase;">Data</p>
                                <p style="margin:0;font-size:18px;font-weight:800;color:#fff;">${dataFormatada}</p>
                              </td>
                              <td style="padding:16px 20px;text-align:center;">
                                <p style="margin:0 0 2px;font-size:11px;color:#71717a;letter-spacing:1px;text-transform:uppercase;">Horário</p>
                                <p style="margin:0;font-size:18px;font-weight:800;color:#fff;">${hora}</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding:16px 32px;border-top:1px solid rgba(255,255,255,0.05);text-align:center;">
                    <p style="margin:0;color:#52525b;font-size:12px;">
                      Notificação automática · FlowSchedule AI
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  })
}

interface ConfirmacaoClienteParams {
  para: string
  nomeCliente: string
  data: string
  hora: string
  nomeNegocio: string
}

export async function enviarConfirmacaoCliente({
  para,
  nomeCliente,
  data,
  hora,
  nomeNegocio,
}: ConfirmacaoClienteParams): Promise<void> {
  const [ano, mes, dia] = data.split("-")
  const dataFormatada = `${dia}/${mes}/${ano}`

  await resend.emails.send({
    from: FROM,
    to: para,
    subject: `Agendamento confirmado — ${nomeNegocio}`,
    html: `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
      <body style="margin:0;padding:0;background:#09090b;font-family:sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding:40px 16px;">
              <table width="480" cellpadding="0" cellspacing="0"
                style="background:#18181b;border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
                <tr>
                  <td style="padding:32px;background:linear-gradient(135deg,#16a34a,#15803d);text-align:center;">
                    <p style="margin:0;font-size:13px;font-weight:700;color:rgba(255,255,255,0.7);letter-spacing:2px;text-transform:uppercase;">FlowSchedule AI</p>
                    <h1 style="margin:8px 0 0;font-size:26px;font-weight:800;color:#fff;">✅ Agendamento Confirmado!</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px;">
                    <p style="margin:0 0 16px;color:#a1a1aa;font-size:15px;line-height:1.6;">
                      Olá, <strong style="color:#fff;">${nomeCliente}</strong>! 👋
                    </p>
                    <p style="margin:0 0 24px;color:#a1a1aa;font-size:15px;line-height:1.6;">
                      Seu agendamento com <strong style="color:#fff;">${nomeNegocio}</strong> foi <strong style="color:#4ade80;">confirmado</strong>.
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0"
                      style="background:#09090b;border:1px solid rgba(255,255,255,0.08);border-radius:12px;margin:0 0 24px;">
                      <tr>
                        <td style="padding:20px;text-align:center;border-right:1px solid rgba(255,255,255,0.08);">
                          <p style="margin:0 0 4px;font-size:11px;color:#71717a;letter-spacing:1px;text-transform:uppercase;">Data</p>
                          <p style="margin:0;font-size:22px;font-weight:800;color:#fff;">${dataFormatada}</p>
                        </td>
                        <td style="padding:20px;text-align:center;">
                          <p style="margin:0 0 4px;font-size:11px;color:#71717a;letter-spacing:1px;text-transform:uppercase;">Horário</p>
                          <p style="margin:0;font-size:22px;font-weight:800;color:#fff;">${hora}</p>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:0;color:#a1a1aa;font-size:14px;line-height:1.6;">
                      Se precisar cancelar, entre em contato com <strong style="color:#fff;">${nomeNegocio}</strong> com antecedência.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.05);text-align:center;">
                    <p style="margin:0;color:#52525b;font-size:12px;">Notificação automática · FlowSchedule AI</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  })
}

export async function enviarCodigoAtivacao({
  para,
  nomeCliente,
  codigo,
}: EnviarCodigoParams): Promise<void> {
  await resend.emails.send({
    from: FROM,
    to: para,
    subject: "🎉 Seu Plano Pro foi ativado — FlowSchedule AI",
    html: `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style="margin:0;padding:0;background:#09090b;font-family:sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding:40px 16px;">
              <table width="480" cellpadding="0" cellspacing="0"
                style="background:#18181b;border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">

                <!-- Header -->
                <tr>
                  <td style="padding:32px;background:linear-gradient(135deg,#1d4ed8,#7c3aed);text-align:center;">
                    <p style="margin:0;font-size:13px;font-weight:700;color:rgba(255,255,255,0.7);letter-spacing:2px;text-transform:uppercase;">
                      FlowSchedule AI
                    </p>
                    <h1 style="margin:8px 0 0;font-size:26px;font-weight:800;color:#fff;">
                      Plano Pro Ativado!
                    </h1>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding:32px;">
                    <p style="margin:0 0 16px;color:#a1a1aa;font-size:15px;line-height:1.6;">
                      Olá, <strong style="color:#fff;">${nomeCliente}</strong>! 👋
                    </p>
                    <p style="margin:0 0 24px;color:#a1a1aa;font-size:15px;line-height:1.6;">
                      Seu pagamento foi confirmado. Use o código abaixo para ativar
                      seu <strong style="color:#fff;">Plano Pro</strong> no app:
                    </p>

                    <!-- Código de ativação -->
                    <div style="background:#09090b;border:1px dashed rgba(255,255,255,0.15);
                                border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
                      <p style="margin:0 0 8px;font-size:12px;color:#71717a;letter-spacing:1px;text-transform:uppercase;">
                        Código de Ativação
                      </p>
                      <p style="margin:0;font-size:28px;font-weight:800;color:#fff;
                                letter-spacing:6px;font-family:monospace;">
                        ${codigo}
                      </p>
                    </div>

                    <!-- Passos -->
                    <p style="margin:0 0 12px;color:#a1a1aa;font-size:14px;font-weight:600;">
                      Como ativar:
                    </p>
                    <ol style="margin:0 0 24px;padding-left:20px;color:#a1a1aa;font-size:14px;line-height:2;">
                      <li>Acesse o <strong style="color:#fff;">FlowSchedule AI</strong></li>
                      <li>Vá em <strong style="color:#fff;">Financeiro</strong> no menu lateral</li>
                      <li>Digite o código acima e clique em <strong style="color:#fff;">Ativar Plano Pro</strong></li>
                    </ol>

                    <a href="https://flowschedule-estudio.vercel.app"
                       style="display:block;background:linear-gradient(135deg,#1d4ed8,#7c3aed);
                              color:#fff;text-decoration:none;text-align:center;padding:14px;
                              border-radius:10px;font-weight:700;font-size:15px;">
                      Acessar FlowSchedule AI →
                    </a>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.05);
                             text-align:center;">
                    <p style="margin:0;color:#52525b;font-size:12px;">
                      Dúvidas? Responda este e-mail. · FlowSchedule AI
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  })
}
