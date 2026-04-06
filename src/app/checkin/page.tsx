"use client";

import { useEffect, useRef, useState } from "react";
import { Search, CheckCircle, XCircle, UserCheck, Users, QrCode, RefreshCcw, Wifi, WifiOff } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

// ── Tipos ────────────────────────────────────────────────────────────────────
interface Guest {
  nome: string;
  telefone: string;
  acompanhantes: number;
  token: string;
  confirmado: boolean;
}

interface CheckInRecord {
  token: string;
  entradaEm: string; // ISO timestamp
}

const STORAGE_KEY = "checkin_registros";
const BASE_URL = "https://conviterafaelucas.vercel.app";

// ── Helpers ──────────────────────────────────────────────────────────────────
function loadRecords(): Record<string, CheckInRecord> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function saveRecord(token: string): Record<string, CheckInRecord> {
  const records = loadRecords();
  records[token] = { token, entradaEm: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  return records;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// ── Componente ───────────────────────────────────────────────────────────────
export default function CheckInPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [records, setRecords] = useState<Record<string, CheckInRecord>>({});
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const [search, setSearch] = useState("");
  const [scannerActive, setScannerActive] = useState(false);
  const [scannerError, setScannerError] = useState("");

  const [found, setFound] = useState<Guest | null>(null);
  const [highlight, setHighlight] = useState<"success" | "duplicate" | "error" | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanned = useRef<string>("");

  // ── Carregamento do guests.json ───────────────────────────────────────────
  useEffect(() => {
    setRecords(loadRecords());
    fetch("/guests.json")
      .then((r) => {
        if (!r.ok) throw new Error("Falha ao carregar lista");
        return r.json();
      })
      .then((data: Guest[]) => {
        setGuests(data);
        setLoaded(true);
      })
      .catch(() => {
        setLoadError(true);
        setLoaded(true);
      });
  }, []);

  // ── Scanner QR ────────────────────────────────────────────────────────────
  const startScanner = async () => {
    setScannerError("");
    setScannerActive(true);
    await new Promise((r) => setTimeout(r, 200));

    try {
      const qr = new Html5Qrcode("qr-reader");
      scannerRef.current = qr;
      await qr.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => handleScan(decodedText),
        () => {}
      );
    } catch {
      setScannerError("Não foi possível acessar a câmera. Verifique as permissões.");
      setScannerActive(false);
    }
  };

  const stopScanner = async () => {
    try {
      await scannerRef.current?.stop();
      scannerRef.current?.clear();
    } catch { /* ignorar */ }
    setScannerActive(false);
  };

  // Cleanup ao desmontar
  useEffect(() => {
    return () => { stopScanner(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Lógica de validação ───────────────────────────────────────────────────
  const handleScan = (raw: string) => {
    if (raw === lastScanned.current) return;
    lastScanned.current = raw;
    setTimeout(() => { lastScanned.current = ""; }, 3000);

    // Extrai token da URL ou usa direto
    let token = raw;
    try {
      const url = new URL(raw);
      token = url.searchParams.get("token") ?? raw;
    } catch { /* não é URL, usa o texto bruto */ }

    resolveGuest(token);
  };

  const resolveGuest = (token: string) => {
    const guest = guests.find((g) => g.token === token) ?? null;
    setFound(guest);
    setSearch("");

    if (!guest) {
      setHighlight("error");
    } else if (records[token]) {
      setHighlight("duplicate");
    } else {
      setHighlight("success");
    }
  };

  const handleSearchSelect = (guest: Guest) => {
    setFound(guest);
    setSearch("");
    if (records[guest.token]) {
      setHighlight("duplicate");
    } else {
      setHighlight("success");
    }
  };

  const markEntry = () => {
    if (!found) return;
    const updated = saveRecord(found.token);
    setRecords(updated);
    setHighlight("success");
  };

  const clearFound = () => {
    setFound(null);
    setHighlight(null);
    setSearch("");
  };

  // ── Pesquisa filtrada ─────────────────────────────────────────────────────
  const filtered = search.length >= 2
    ? guests.filter((g) => g.nome.toLowerCase().includes(search.toLowerCase())).slice(0, 6)
    : [];

  // ── Estatísticas ──────────────────────────────────────────────────────────
  const totalEntradas = Object.keys(records).length;
  const totalConvidados = guests.length;
  const totalAcompanhantes = guests
    .filter((g) => records[g.token])
    .reduce((acc, g) => acc + g.acompanhantes, 0);
  const totalPessoas = totalEntradas + totalAcompanhantes;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0f1a0a] text-white font-sans">
      {/* Header */}
      <header className="bg-[#1a2e0f] border-b border-[#3b5110]/40 px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-xl text-[#a8c070]">Check-in • Rafaela & Lucas</h1>
          <p className="text-xs text-[#636d4a] tracking-widest uppercase">Painel da Equipe — 12 Jul 2026</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {loaded && !loadError ? (
            <span className="flex items-center gap-1 text-green-400">
              <Wifi className="w-3 h-3" /> Lista carregada ✓
            </span>
          ) : loadError ? (
            <span className="flex items-center gap-1 text-red-400">
              <WifiOff className="w-3 h-3" /> Erro ao carregar
            </span>
          ) : (
            <span className="text-yellow-400 animate-pulse">Carregando...</span>
          )}
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 p-4">
        {[
          { label: "Entradas", value: totalEntradas, sub: `de ${totalConvidados}` },
          { label: "Acompanhantes", value: totalAcompanhantes, sub: "registrados" },
          { label: "Total Pessoas", value: totalPessoas, sub: "no evento" },
        ].map((s) => (
          <div key={s.label} className="bg-[#1a2e0f] rounded-2xl p-3 text-center border border-[#3b5110]/30">
            <p className="text-2xl font-bold text-[#a8c070]">{s.value}</p>
            <p className="text-[10px] text-[#636d4a] uppercase tracking-wider">{s.label}</p>
            <p className="text-[10px] text-[#3b5110]">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="p-4 space-y-4 max-w-xl mx-auto">

        {/* Scanner */}
        <div className="bg-[#1a2e0f] rounded-2xl border border-[#3b5110]/30 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-[#3b5110]/20">
            <div className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-[#a8c070]" />
              <span className="font-semibold text-[#a8c070]">Scanner QR Code</span>
            </div>
            <button
              onClick={scannerActive ? stopScanner : startScanner}
              disabled={!loaded}
              className={`text-xs px-4 py-2 rounded-full font-bold uppercase tracking-widest transition-all disabled:opacity-40 ${
                scannerActive ? "bg-red-900/60 text-red-300 hover:bg-red-900" : "bg-[#3b5110] text-white hover:bg-[#4d6b16]"
              }`}
            >
              {scannerActive ? "Parar" : "Iniciar Câmera"}
            </button>
          </div>

          {/* Área do vídeo */}
          <div
            id="qr-reader"
            className={`w-full transition-all duration-300 ${scannerActive ? "min-h-[300px]" : "h-0"}`}
            style={{ background: "#000" }}
          />

          {scannerError && (
            <p className="text-xs text-red-400 text-center p-3">{scannerError}</p>
          )}
          {!scannerActive && !scannerError && (
            <p className="text-center text-xs text-[#636d4a] py-4">
              Clique em &quot;Iniciar Câmera&quot; para escanear QR Codes
            </p>
          )}
        </div>

        {/* Busca por nome */}
        <div className="relative">
          <div className="flex items-center gap-3 bg-[#1a2e0f] border border-[#3b5110]/40 rounded-2xl px-4 py-3">
            <Search className="w-4 h-4 text-[#636d4a] flex-shrink-0" />
            <input
              type="text"
              placeholder="Buscar por nome (mín. 2 letras)…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={!loaded}
              className="flex-1 bg-transparent text-white placeholder-[#636d4a] text-sm outline-none disabled:opacity-40"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-[#636d4a] hover:text-white">
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Dropdown de resultados */}
          {filtered.length > 0 && (
            <div className="absolute top-full mt-1 w-full bg-[#1a2e0f] border border-[#3b5110]/40 rounded-2xl overflow-hidden z-50 shadow-2xl">
              {filtered.map((g) => (
                <button
                  key={g.token}
                  onClick={() => handleSearchSelect(g)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#3b5110]/30 transition-colors text-left border-b border-[#3b5110]/10 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{g.nome}</p>
                    <p className="text-xs text-[#636d4a]">
                      {g.acompanhantes > 0 ? `+ ${g.acompanhantes} acompanhante(s)` : "Sem acompanhantes"}
                    </p>
                  </div>
                  {records[g.token] ? (
                    <span className="text-[10px] bg-green-900/40 text-green-400 px-2 py-1 rounded-full">Já entrou</span>
                  ) : g.confirmado ? (
                    <span className="text-[10px] bg-[#3b5110]/40 text-[#a8c070] px-2 py-1 rounded-full">Confirmado</span>
                  ) : (
                    <span className="text-[10px] bg-yellow-900/20 text-yellow-500 px-2 py-1 rounded-full">Pendente</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Card de resultado */}
        {found && (
          <div className={`rounded-2xl border-2 p-6 transition-all duration-500 ${
            highlight === "duplicate"
              ? "bg-yellow-900/20 border-yellow-600/60"
              : highlight === "error"
              ? "bg-red-900/20 border-red-600/60"
              : "bg-green-900/20 border-green-600/60"
          }`}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs text-[#636d4a] uppercase tracking-widest mb-1">Convidado Identificado</p>
                <h2 className="text-2xl font-serif text-white">{found.nome}</h2>
              </div>
              <button onClick={clearFound} className="text-[#636d4a] hover:text-white mt-1">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-black/20 rounded-xl p-3 text-center">
                <Users className="w-4 h-4 text-[#a8c070] mx-auto mb-1" />
                <p className="text-lg font-bold text-white">{found.acompanhantes}</p>
                <p className="text-[10px] text-[#636d4a] uppercase">Acompanhantes</p>
              </div>
              <div className="bg-black/20 rounded-xl p-3 text-center">
                {found.confirmado ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-400 mx-auto mb-1" />
                    <p className="text-sm font-bold text-green-400">Confirmado</p>
                    <p className="text-[10px] text-[#636d4a] uppercase">RSVP</p>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-yellow-500 mx-auto mb-1" />
                    <p className="text-sm font-bold text-yellow-500">Pendente</p>
                    <p className="text-[10px] text-[#636d4a] uppercase">RSVP</p>
                  </>
                )}
              </div>
            </div>

            {/* Status de entrada */}
            {records[found.token] ? (
              <div className="text-center py-4 bg-yellow-900/30 rounded-xl border border-yellow-600/30">
                <p className="text-yellow-400 font-bold text-sm">⚠️ Este convidado já registrou entrada</p>
                <p className="text-xs text-[#636d4a] mt-1">às {formatTime(records[found.token].entradaEm)}</p>
              </div>
            ) : (
              <button
                onClick={markEntry}
                className="w-full bg-green-700 hover:bg-green-600 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <UserCheck className="w-5 h-5" />
                Marcar como Entrou
              </button>
            )}
          </div>
        )}

        {/* Token inválido */}
        {highlight === "error" && !found && (
          <div className="bg-red-900/20 border-2 border-red-600/60 rounded-2xl p-6 text-center">
            <XCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="text-red-400 font-bold">Token não encontrado</p>
            <p className="text-xs text-[#636d4a] mt-1">QR Code inválido ou convidado não consta na lista.</p>
            <button onClick={clearFound} className="mt-4 text-xs text-[#636d4a] underline flex items-center gap-1 mx-auto">
              <RefreshCcw className="w-3 h-3" /> Tentar novamente
            </button>
          </div>
        )}

        {/* Aviso offline */}
        <div className="text-center">
          <p className="text-[10px] text-[#3b5110] tracking-widest uppercase">
            {loaded && !loadError
              ? "✓ Lista em memória — funciona sem internet"
              : "Aguardando carregamento..."}
          </p>
        </div>

        {/* Log de entradas */}
        {totalEntradas > 0 && (
          <div className="bg-[#1a2e0f] rounded-2xl border border-[#3b5110]/30 p-4">
            <h3 className="text-sm font-semibold text-[#a8c070] mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Entradas Registradas ({totalEntradas})
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {Object.values(records)
                .sort((a, b) => b.entradaEm.localeCompare(a.entradaEm))
                .map((rec) => {
                  const g = guests.find((g) => g.token === rec.token);
                  return (
                    <div key={rec.token} className="flex items-center justify-between text-sm py-1 border-b border-[#3b5110]/10">
                      <span className="text-white">{g?.nome ?? rec.token}</span>
                      <span className="text-[#636d4a] text-xs">{formatTime(rec.entradaEm)}</span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
