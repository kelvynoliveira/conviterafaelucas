#!/usr/bin/env node
/**
 * generate-guests.js
 * Converte guests.csv → public/guests.json com tokens únicos.
 * Também gera scripts/enviar-convites.html com botões clicáveis do WhatsApp.
 *
 * Uso: node scripts/generate-guests.js
 *
 * CSV esperado (na raiz do projeto):
 *   nome,telefone,acompanhantes
 *   João Silva,81999990001,1
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// ── Caminhos ────────────────────────────────────────────────────────────────
const CSV_PATH = path.join(__dirname, "../guests.csv");
const JSON_PATH = path.join(__dirname, "../public/guests.json");
const HTML_PATH = path.join(__dirname, "../scripts/enviar-convites.html");

// ── Leitura do CSV ───────────────────────────────────────────────────────────
if (!fs.existsSync(CSV_PATH)) {
  console.error("❌  Arquivo guests.csv não encontrado na raiz do projeto.");
  process.exit(1);
}

const raw = fs.readFileSync(CSV_PATH, "utf-8");
const lines = raw.trim().split("\n");
const header = lines[0].toLowerCase().split(",").map((h) => h.trim());

// Índices das colunas
const idxNome = header.indexOf("nome");
const idxTel = header.indexOf("telefone");
const idxAcomp = header.indexOf("acompanhantes");

if (idxNome === -1 || idxTel === -1 || idxAcomp === -1) {
  console.error(
    "❌  Colunas obrigatórias não encontradas. Verifique se o CSV possui: nome, telefone, acompanhantes"
  );
  process.exit(1);
}

// ── Se o JSON já existe, preservar tokens existentes ─────────────────────────
let existingGuests = [];
if (fs.existsSync(JSON_PATH)) {
  try {
    existingGuests = JSON.parse(fs.readFileSync(JSON_PATH, "utf-8"));
    console.log(
      `ℹ️   JSON existente encontrado. Tokens preservados para ${existingGuests.length} convidado(s).`
    );
  } catch {
    console.warn("⚠️   JSON existente inválido — será recriado do zero.");
  }
}

const existingByPhone = Object.fromEntries(
  existingGuests.map((g) => [g.telefone, g])
);

// ── Geração dos convidados ───────────────────────────────────────────────────
const guests = lines
  .slice(1)
  .filter((l) => l.trim())
  .map((line) => {
    const cols = line.split(",").map((c) => c.trim());
    const nome = cols[idxNome] || "";
    const telefone = cols[idxTel] || "";
    const acompanhantes = parseInt(cols[idxAcomp] ?? "0", 10) || 0;

    // Usa token existente (para não invalidar QR Codes já enviados)
    const token =
      existingByPhone[telefone]?.token ??
      crypto.randomBytes(4).toString("hex");

    return {
      nome,
      telefone,
      acompanhantes,
      token,
      confirmado: existingByPhone[telefone]?.confirmado ?? false,
    };
  });

// ── Escrita do JSON ──────────────────────────────────────────────────────────
fs.writeFileSync(JSON_PATH, JSON.stringify(guests, null, 2), "utf-8");

// ── Geração do HTML de disparo ───────────────────────────────────────────────
const rows = guests.map((g) => {
  const link = `https://conviterafaelucas.vercel.app/?token=${g.token}`;
  const msg =
    `Olá, ${g.nome}! 🌸\n` +
    `Você está convidado(a) para o casamento de Rafaela & Lucas! 💍\n\n` +
    `Acesse seu convite personalizado:\n${link}\n\n` +
    `Seu QR Code de entrada está dentro do convite.\n` +
    `Apresente-o na entrada do evento. 🎊`;
  const waUrl = `https://wa.me/55${g.telefone}?text=${encodeURIComponent(msg)}`;
  const status = g.confirmado
    ? `<span class="badge confirmed">✅ Confirmado</span>`
    : `<span class="badge pending">⏳ Pendente</span>`;
  return `
    <tr>
      <td>${g.nome}</td>
      <td>${g.telefone}</td>
      <td>${g.acompanhantes}</td>
      <td>${status}</td>
      <td>
        <a href="${waUrl}" target="_blank" class="wa-btn">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          Enviar Convite
        </a>
      </td>
    </tr>`;
}).join("");

const totalAcomp = guests.reduce((a, g) => a + g.acompanhantes, 0);
const totalConfirmados = guests.filter((g) => g.confirmado).length;

const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rafaela & Lucas — Disparo de Convites</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #0f1a0a; color: #d4e6b0; padding: 24px; }
    h1 { color: #a8c070; font-size: 1.4rem; margin-bottom: 4px; }
    p.sub { color: #636d4a; font-size: 0.8rem; margin-bottom: 24px; }
    .stats { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
    .stat { background: #1a2e0f; border: 1px solid #3b5110; border-radius: 12px; padding: 12px 20px; text-align: center; }
    .stat strong { display: block; font-size: 1.5rem; color: #a8c070; }
    .stat span { font-size: 0.7rem; color: #636d4a; text-transform: uppercase; letter-spacing: 0.05em; }
    table { width: 100%; border-collapse: collapse; background: #1a2e0f; border-radius: 16px; overflow: hidden; }
    th { background: #233d12; color: #a8c070; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; padding: 14px 16px; text-align: left; }
    td { padding: 12px 16px; border-bottom: 1px solid rgba(59,81,16,0.2); font-size: 0.9rem; color: #d4e6b0; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: #233d12; }
    .wa-btn { display: inline-flex; align-items: center; gap: 8px; background: #25D366; color: white; text-decoration: none; padding: 8px 16px; border-radius: 999px; font-size: 0.8rem; font-weight: 600; transition: background 0.2s; white-space: nowrap; }
    .wa-btn:hover { background: #1ebe5d; }
    .wa-btn svg { width: 16px; height: 16px; flex-shrink: 0; }
    .badge { font-size: 0.72rem; padding: 3px 10px; border-radius: 999px; font-weight: 600; }
    .badge.confirmed { background: #1a4d1a; color: #4ade80; }
    .badge.pending { background: #3d3000; color: #fbbf24; }
    .note { margin-top: 24px; background: #1a2e0f; border: 1px solid #3b5110; border-radius: 12px; padding: 16px; font-size: 0.82rem; color: #636d4a; line-height: 1.7; }
    .note strong { color: #a8c070; }
    .note ol { margin: 8px 0 0 20px; }
  </style>
</head>
<body>
  <h1>💍 Rafaela & Lucas — Disparo de Convites</h1>
  <p class="sub">Gerado em ${new Date().toLocaleString("pt-BR")} &nbsp;•&nbsp; Clique em "Enviar Convite" para abrir o WhatsApp de cada convidado</p>
  <div class="stats">
    <div class="stat"><strong>${guests.length}</strong><span>Total Convidados</span></div>
    <div class="stat"><strong>${totalAcomp}</strong><span>Acompanhantes</span></div>
    <div class="stat"><strong>${totalConfirmados}</strong><span>Confirmados</span></div>
    <div class="stat"><strong>${guests.length - totalConfirmados}</strong><span>Pendentes</span></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Nome</th>
        <th>Telefone</th>
        <th>Acomp.</th>
        <th>RSVP</th>
        <th>Ação</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="note">
    <strong>Como enviar os convites:</strong>
    <ol>
      <li>Abra este arquivo no seu navegador (Chrome, Edge ou Firefox).</li>
      <li>Certifique-se de estar logado no <strong>WhatsApp Web</strong> (web.whatsapp.com).</li>
      <li>Para cada convidado, clique em <strong style="color:#25D366">Enviar Convite</strong>.</li>
      <li>O WhatsApp abrirá com a mensagem já preenchida — basta apertar <strong>Enviar ↵</strong>.</li>
      <li>Repita para todos. A mensagem inclui o link personalizado com QR Code de cada um.</li>
    </ol>
  </div>
</body>
</html>`;

fs.writeFileSync(HTML_PATH, html, "utf-8");

console.log(`\n✅  ${guests.length} convidado(s) gerado(s) com sucesso!`);
console.log(`📄  JSON salvo em:       ${JSON_PATH}`);
console.log(`🌐  Painel de envio em:  ${HTML_PATH}`);
console.log(`\n👉  Abra o arquivo "scripts/enviar-convites.html" no navegador`);
console.log(`    e clique em "Enviar Convite" para cada convidado.\n`);
