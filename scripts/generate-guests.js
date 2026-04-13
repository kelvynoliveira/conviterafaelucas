#!/usr/bin/env node
/**
 * generate-guests.js
 * Converte guests.csv → public/guests.json com tokens únicos INDIVIDUAIS.
 * Suporta acompanhantes com nomes reais (separados por ;) ou numéricos.
 *
 * Uso: node scripts/generate-guests.js
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// ── Caminhos ────────────────────────────────────────────────────────────────
const CSV_PATH = path.join(__dirname, "../guests.csv");
const JSON_PATH = path.join(__dirname, "../public/guests.json");
const HTML_PATH = path.join(__dirname, "../scripts/enviar-convites.html");

// ── Helpers ──────────────────────────────────────────────────────────────────
function generateToken() {
  return crypto.randomBytes(4).toString("hex");
}

// ── Leitura do CSV ───────────────────────────────────────────────────────────
if (!fs.existsSync(CSV_PATH)) {
  console.error("❌  Arquivo guests.csv não encontrado na raiz do projeto.");
  process.exit(1);
}

const raw = fs.readFileSync(CSV_PATH, "utf-8");
const lines = raw.trim().split("\n");
const header = lines[0].toLowerCase().split(",").map((h) => h.trim());

const idxNome = header.indexOf("nome");
const idxTel = header.indexOf("telefone");
const idxAcomp = header.indexOf("acompanhantes");

if (idxNome === -1 || idxTel === -1 || idxAcomp === -1) {
  console.error("❌  CSV deve conter colunas: nome, telefone, acompanhantes");
  process.exit(1);
}

// ── Preservar tokens existentes ─────────────────────────────────────────────
let existingList = [];
if (fs.existsSync(JSON_PATH)) {
  try {
    existingList = JSON.parse(fs.readFileSync(JSON_PATH, "utf-8"));
  } catch { /* ignorar */ }
}

// Mapa para busca rápida: [Nome + TitularNome] -> Token
const tokenMap = new Map();
existingList.forEach((g) => {
  const key = `${g.nome}|${g.titularNome}`;
  tokenMap.set(key, g.token);
});

// ── Geração da Nova Lista (Individual) ──────────────────────────────────────
const individuals = [];
const rows = lines.slice(1).filter((l) => l.trim());

rows.forEach((line) => {
  const cols = line.split(",").map((c) => c.trim());
  const titularNome = cols[idxNome] || "";
  const telefone = cols[idxTel] || "";
  const acompRaw = cols[idxAcomp] || "0";

  // 1. Adicionar o Titular
  const titularToken = tokenMap.get(`${titularNome}|${titularNome}`) || generateToken();
  const titularObj = {
    token: titularToken,
    nome: titularNome,
    telefone: telefone,
    grupoId: titularToken,
    isTitular: true,
    titularNome: titularNome,
    confirmado: existingList.find(e => e.token === titularToken)?.confirmado ?? false
  };
  individuals.push(titularObj);

  // 2. Processar Acompanhantes
  const numAcomp = parseInt(acompRaw, 10) || 0;
  for (let i = 1; i <= numAcomp; i++) {
    const companionName = `Acompanhante ${i}`;
    const key = `${companionName}|${titularNome}`;
    const token = tokenMap.get(key) || generateToken();

    individuals.push({
      token,
      nome: companionName,
      telefone: telefone,
      grupoId: titularToken,
      isTitular: false,
      titularNome: titularNome,
      confirmado: existingList.find(e => e.token === token)?.confirmado ?? false
    });
  }
});

// ── Escrita do JSON ──────────────────────────────────────────────────────────
fs.writeFileSync(JSON_PATH, JSON.stringify(individuals, null, 2), "utf-8");

// ── Geração do HTML de disparo ───────────────────────────────────────────────
const titularList = individuals.filter(g => g.isTitular);

const tableRows = titularList.map((g) => {
  const acompTotal = individuals.filter(i => i.grupoId === g.token && !i.isTitular).length;
  const link = `https://conviterafaelucas.vercel.app/?token=${g.token}`;
  
  // Trata o telefone pra ficar consistente (só numero) e remove "55" se começar com 55 pra n duplicar
  let phoneStr = g.telefone.replace(/\D/g, "");
  if (phoneStr.startsWith("55") && phoneStr.length >= 12) {
      phoneStr = phoneStr.substring(2);
  }

  const msg =
    `Olá, ${g.nome}! \n` +
    `Você está convidado(a) para o casamento de Rafaela & Lucas! \n\n` +
    `Acesse seu convite personalizado:\n${link}\n\n` +
    `Cada pessoa deve apresentar seu próprio QR Code na entrada do evento. `;
  const waUrl = `https://wa.me/55${phoneStr}?text=${encodeURIComponent(msg)}`;

  return `
    <tr>
      <td>${g.nome}</td>
      <td>${g.telefone}</td>
      <td>${acompTotal}</td>
      <td>
        <a href="${waUrl}" target="_blank" class="wa-btn">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          Enviar Convite
        </a>
      </td>
    </tr>`;
}).join("");

const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Painel de Disparo — Rafaela & Lucas</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', system-ui, sans-serif; background: #09090b; color: #f4f4f5; padding: 32px 24px; -webkit-font-smoothing: antialiased; }
    .container { max-width: 1000px; margin: 0 auto; }
    
    .header { margin-bottom: 32px; padding-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,0.05); }
    h1 { color: #f4f4f5; font-size: 1.5rem; font-weight: 600; margin-bottom: 8px; letter-spacing: -0.02em; display: flex; align-items: center; gap: 8px; }
    p.sub { color: #a1a1aa; font-size: 0.85rem; }
    
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 32px; }
    .stat { background: #18181b; border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; padding: 20px; box-shadow: 0 4px 24px -8px rgba(0,0,0,0.5); }
    .stat strong { display: block; font-size: 2rem; color: #f4f4f5; font-weight: 600; line-height: 1; margin-bottom: 4px; }
    .stat span { font-size: 0.75rem; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 500; }
    
    .table-container { background: #18181b; border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px -8px rgba(0,0,0,0.5); }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    th { background: rgba(255,255,255,0.02); color: #a1a1aa; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); }
    td { padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.03); font-size: 0.9rem; color: #e4e4e7; transition: background 0.2s; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: rgba(255,255,255,0.02); }
    
    .wa-btn { display: inline-flex; align-items: center; gap: 8px; background: #10b981; color: #022c22; text-decoration: none; padding: 8px 16px; border-radius: 999px; font-size: 0.8rem; font-weight: 600; transition: all 0.2s; white-space: nowrap; box-shadow: 0 2px 10px -2px rgba(16,185,129,0.3); }
    .wa-btn:hover { background: #34d399; transform: translateY(-1px); box-shadow: 0 4px 12px -2px rgba(16,185,129,0.4); }
    .wa-btn svg { width: 16px; height: 16px; flex-shrink: 0; }
    
    .note { margin-top: 24px; background: rgba(212,175,55,0.05); border: 1px solid rgba(212,175,55,0.15); border-radius: 12px; padding: 16px 20px; font-size: 0.85rem; color: #a1a1aa; line-height: 1.6; display: flex; gap: 12px; align-items: flex-start; }
    .note strong { color: #d4af37; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Painel de Disparo</h1>
      <p class="sub">Casamento Rafaela & Lucas &nbsp;•&nbsp; Gerado em ${new Date().toLocaleString("pt-BR")}</p>
    </div>
    
    <div class="stats">
      <div class="stat"><strong>${titularList.length}</strong><span>Famílias</span></div>
      <div class="stat"><strong>${individuals.length}</strong><span>Total de Pessoas</span></div>
    </div>
    
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Titular</th>
            <th>Telefone</th>
            <th>Acomp.</th>
            <th>Ação</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>
    
    <div class="note">
      <svg style="width: 20px; height: 20px; color: #d4af37; flex-shrink: 0; margin-top: 2px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
      <div>
        <strong>Atenção:</strong> Use apenas 1 link por família. O Titular terá acesso ao QR Code de todos os seus dependentes na mesma página.
      </div>
    </div>
  </div>
</body>
</html>`;

fs.writeFileSync(HTML_PATH, html, "utf-8");

console.log(`\n✅  ${individuals.length} indivíduos gerados em ${titularList.length} grupos!`);
console.log(`📄  JSON salvo em:       ${JSON_PATH}`);
console.log(`🌐  Painel de envio em:  ${HTML_PATH}\n`);
