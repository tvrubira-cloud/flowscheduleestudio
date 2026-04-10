import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

interface EnviarCodigoParams {
  para: string
  nomeCliente: string
  codigo: string
}

export async function enviarCodigoAtivacao({
  para,
  nomeCliente,
  codigo,
}: EnviarCodigoParams): Promise<void> {
  await resend.emails.send({
    from: "FlowSchedule AI <noreply@projeto-8404l.vercel.app>",
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

                    <a href="https://projeto-8404l.vercel.app"
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
