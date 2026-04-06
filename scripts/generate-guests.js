#!/usr/bin/env node
/**
 * generate-guests.js
 * Converte guests.csv → public/guests.json com tokens únicos.
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

console.log(`\n✅  ${guests.length} convidado(s) gerado(s) com sucesso!`);
console.log(`📄  Arquivo salvo em: ${JSON_PATH}`);
console.log("\nLinks de exemplo:");
guests.forEach((g) => {
  console.log(
    `  ${g.nome.padEnd(25)} → https://conviterafaelucas.vercel.app/?token=${g.token}`
  );
});
console.log("\nMensagens WhatsApp para envio:");
guests.forEach((g) => {
  const link = `https://conviterafaelucas.vercel.app/?token=${g.token}`;
  const msg = `Olá, ${g.nome}! 🌸\nVocê está convidado(a) para o casamento de Rafaela & Lucas!\nAcesse seu convite personalizado:\n${link}`;
  console.log(`\n  📱 ${g.nome}:`);
  console.log(`     https://wa.me/55${g.telefone}?text=${encodeURIComponent(msg)}`);
});
