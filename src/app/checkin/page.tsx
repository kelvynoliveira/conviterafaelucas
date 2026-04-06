"use client";

import { useEffect, useRef, useState } from "react";
import { 
  Search, CheckCircle, XCircle, UserCheck, Users, QrCode, 
  RefreshCcw, Wifi, WifiOff, ListFilter, LayoutDashboard, 
  AlertTriangle, History, ArrowRight, User
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

// ── Tipos ────────────────────────────────────────────────────────────────────
interface GuestIndividual {
  token: string;
  nome: string;
  telefone: string;
  grupoId: string;
  isTitular: boolean;
  titularNome: string;
  confirmado: boolean;
}

interface CheckInRecord {
  token: string;
  entradaEm: string; // ISO timestamp
}

const STORAGE_KEY = "checkin_registros_v2";

// ── Helpers ──────────────────────────────────────────────────────────────────
function loadRecords(): Record<string, CheckInRecord> {
  if (typeof window === "undefined") return {};
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

// ── Som de Bip (Web Audio API) ────────────────────────────────────────────────
const playBeep = (type: "success" | "error" | "duplicate") => {
  if (typeof window === "undefined") return;
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  if (type === "success") {
    osc.frequency.setValueAtTime(880, ctx.currentTime); // Mi (High)
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  } else if (type === "duplicate") {
    osc.frequency.setValueAtTime(440, ctx.currentTime); // La (Mid)
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
    setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.setValueAtTime(330, ctx.currentTime);
        gain2.gain.setValueAtTime(0.2, ctx.currentTime);
        osc2.start(ctx.currentTime);
        osc2.stop(ctx.currentTime + 0.2);
    }, 150);
  } else {
    osc.frequency.setValueAtTime(220, ctx.currentTime); // Low
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  }
};

// ── Componente Principal ──────────────────────────────────────────────────────
export default function CheckInPage() {
  const [guests, setGuests] = useState<GuestIndividual[]>([]);
  const [records, setRecords] = useState<Record<string, CheckInRecord>>({});
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const [activeTab, setActiveTab] = useState<"portaria" | "relatorio">("portaria");
  const [search, setSearch] = useState("");
  const [scannerActive, setScannerActive] = useState(false);
  const [scannerError, setScannerError] = useState("");

  const [foundGroup, setFoundGroup] = useState<GuestIndividual[]>([]);
  const [selectedPersonToken, setSelectedPersonToken] = useState<string | null>(null);
  const [highlightType, setHighlightType] = useState<"success" | "duplicate" | "error" | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanned = useRef<string>("");

  // ── Carregamento Inicial ───────────────────────────────────────────────────
  useEffect(() => {
    setRecords(loadRecords());
    fetch("/guests.json")
      .then((r) => {
        if (!r.ok) throw new Error("Falha ao carregar");
        return r.json();
      })
      .then((data: GuestIndividual[]) => {
        setGuests(data);
        setLoaded(true);
      })
      .catch(() => {
        setLoadError(true);
        setLoaded(true);
      });
  }, []);

  // ── Controle do Scanner ────────────────────────────────────────────────────
  const startScanner = async () => {
    setScannerError("");
    setScannerActive(true);
    await new Promise((r) => setTimeout(r, 300));

    try {
      const qr = new Html5Qrcode("qr-reader");
      scannerRef.current = qr;
      await qr.start(
        { facingMode: "environment" },
        { fps: 12, qrbox: { width: 250, height: 250 } },
        (decodedText) => handleScan(decodedText),
        () => {}
      );
    } catch (e) {
      setScannerError("Câmera indisponível.");
      setScannerActive(false);
    }
  };

  const stopScanner = async () => {
    try {
      await scannerRef.current?.stop();
    } catch { /* ignora */ }
    setScannerActive(false);
  };

  // ── Lógica de Processamento ────────────────────────────────────────────────
  const handleScan = (raw: string) => {
    if (raw === lastScanned.current) return;
    lastScanned.current = raw;
    setTimeout(() => { lastScanned.current = ""; }, 3000);

    let token = raw;
    try {
      const url = new URL(raw);
      token = url.searchParams.get("token") ?? raw;
    } catch { /* texto puro */ }

    resolvePerson(token);
  };

  const resolvePerson = (token: string) => {
    const person = guests.find((g) => g.token === token);
    if (!person) {
      setHighlightType("error");
      playBeep("error");
      setFoundGroup([]);
      setSelectedPersonToken(null);
      return;
    }

    const group = guests.filter(g => g.grupoId === person.grupoId);
    setFoundGroup(group);
    setSelectedPersonToken(token);
    setSearch("");

    if (records[token]) {
      setHighlightType("duplicate");
      playBeep("duplicate");
    } else {
      setHighlightType("success");
      playBeep("success");
    }
  };

  const toggleCheckIn = (token: string) => {
    if (records[token]) return;
    const updated = saveRecord(token);
    setRecords(updated);
    playBeep("success");
    if (selectedPersonToken === token) {
        setHighlightType("success");
    }
  };

  const clearResult = () => {
    setFoundGroup([]);
    setSelectedPersonToken(null);
    setHighlightType(null);
  };

  // ── Filtros e Estatísticas ──────────────────────────────────────────────────
  const filteredSearch = search.length >= 2
    ? guests.filter((g) => g.nome.toLowerCase().includes(search.toLowerCase())).slice(0, 8)
    : [];

  const totalGeral = guests.length;
  const totalPresentes = Object.keys(records).length;
  const totalFaltando = totalGeral - totalPresentes;
  const porcentagem = totalGeral > 0 ? Math.round((totalPresentes / totalGeral) * 100) : 0;

  // ── Constantes Visuais Premium / FinTech Vibes ──────────────────────────────
  // Fundo principal escuro, focado na clareza.
  const bgMain = "bg-zinc-950";
  const bgCard = "bg-zinc-900";
  const borderColor = "border-white/5";
  const textTitle = "text-zinc-50";
  const textSub = "text-zinc-400";
  const accentColor = "text-[#d4af37]"; // Dourado sutil para detalhes

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen ${bgMain} text-zinc-200 font-sans pb-24 selection:bg-zinc-800`}>
      {/* ── Header ── */}
      <header className={`sticky top-0 z-[100] ${bgCard}/80 backdrop-blur-xl border-b ${borderColor} px-6 py-4`}>
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div>
            <h1 className={`font-medium text-lg ${textTitle} tracking-tight`}>
              Gestão de Acesso <span className="text-zinc-500 font-normal">| R&L</span>
            </h1>
            <div className={`flex items-center gap-4 mt-1.5 text-[11px] font-medium ${textSub} uppercase tracking-wider`}>
              <span className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                {totalPresentes} Entraram
              </span>
              <span className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-600"></div>
                {totalFaltando} Faltam
              </span>
            </div>
          </div>
          {loadError ? (
            <div className="bg-red-500/10 p-2 rounded-full">
               <WifiOff className="text-red-500 w-4 h-4"/>
            </div>
          ) : (
            <div className="bg-emerald-500/10 p-2 rounded-full">
               <Wifi className="text-emerald-500 w-4 h-4"/>
            </div>
          )}
        </div>
        
        {/* Barra de Progresso Dourada Premium */}
        <div className="max-w-2xl mx-auto mt-5 h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-zinc-600 via-[#d4af37] to-[#f0e6d2] transition-all duration-1000 ease-out"
            style={{ width: `${porcentagem}%` }}
          />
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-6 mt-4">

        {activeTab === "portaria" ? (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* ── Busca Central ── */}
            <section className="space-y-4">
              <div className="relative group">
                <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${textSub} group-focus-within:text-zinc-50 transition-colors`} />
                <input
                  type="text"
                  placeholder="Buscar convidado..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={`w-full bg-zinc-900/50 border ${borderColor} rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-zinc-500 transition-all text-white placeholder-zinc-500 text-lg shadow-sm`}
                />
                
                {filteredSearch.length > 0 && (
                  <div className={`absolute top-full mt-2 w-full ${bgCard} border ${borderColor} rounded-2xl shadow-xl overflow-hidden z-[101]`}>
                    {filteredSearch.map((g) => (
                      <button
                        key={g.token}
                        onClick={() => resolvePerson(g.token)}
                        className={`w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors border-b ${borderColor} last:border-0`}
                      >
                        <div className="text-left">
                          <p className="text-base font-medium text-zinc-100">{g.nome}</p>
                          <p className={`text-[11px] ${textSub} font-medium`}>GRUPO: {g.titularNome}</p>
                        </div>
                        {records[g.token] ? (
                          <span className="text-[11px] font-bold bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full uppercase tracking-wider">Entrou</span>
                        ) : (
                          <ArrowRight className="w-5 h-5 text-zinc-600" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Botão Scanner ── */}
              {!scannerActive && !foundGroup.length && (
                <button
                  onClick={startScanner}
                  className={`w-full h-36 flex flex-col items-center justify-center gap-3 ${bgCard} border border-dashed border-zinc-700/50 hover:border-zinc-500 rounded-3xl transition-all shadow-sm active:scale-[0.98]`}
                >
                  <div className="p-4 bg-zinc-800/50 rounded-full">
                    <QrCode className={`w-8 h-8 ${textTitle}`} />
                  </div>
                  <span className={`text-xs font-semibold tracking-widest uppercase ${textTitle}`}>Abrir Câmera</span>
                </button>
              )}
            </section>

            {/* ── Câmera Ativa ── */}
            {scannerActive && (
              <section className="bg-black rounded-3xl overflow-hidden border border-zinc-800 relative shadow-2xl mt-4 animate-in fade-in zoom-in-95 duration-300">
                <div id="qr-reader" className="w-full overflow-hidden" />
                <div className="absolute top-4 right-4 z-10">
                  <button onClick={stopScanner} className="bg-zinc-900/80 text-white p-3 rounded-full backdrop-blur-md hover:bg-red-500/80 transition-colors">
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
                {scannerError && <p className="p-4 text-center text-red-500 font-medium">{scannerError}</p>}
                <div className="bg-zinc-900/90 backdrop-blur-md p-4 text-center text-[11px] font-medium tracking-widest uppercase text-zinc-300">
                  Posicione o QR Code no centro
                </div>
              </section>
            )}

            {/* ── Erro Token Inválido ── */}
            {highlightType === "error" && !foundGroup.length && (
              <div className="mt-8 bg-red-500/10 border border-red-500/20 rounded-3xl p-8 text-center animate-in zoom-in-95 duration-300">
                 <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                     <XCircle className="w-8 h-8 text-red-500" />
                 </div>
                 <h2 className="text-xl font-bold text-red-100 mb-2">QR Code Inválido</h2>
                 <p className="text-sm text-red-400">Este ingresso não consta na base de dados.</p>
                 <button onClick={clearResult} className="mt-6 px-6 py-2 bg-zinc-800 text-zinc-300 rounded-full text-sm font-medium hover:bg-zinc-700 transition-colors">
                     Fechar
                 </button>
              </div>
            )}

            {/* ── Card Família ── */}
            {foundGroup.length > 0 && (
              <section className="mt-6 animate-in slide-in-from-bottom-8 duration-500">
                <div className={`p-6 md:p-8 rounded-[2rem] border transition-all duration-300 shadow-2xl relative overflow-hidden backdrop-blur-xl ${
                    highlightType === "duplicate" ? "bg-red-950/40 border-red-500/50" : 
                    "bg-zinc-900/60 border-zinc-700/50"
                }`}>
                  
                  {/* Glow effect background */}
                  {highlightType === "duplicate" && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150%] h-[150%] bg-red-500/10 blur-[100px] pointer-events-none" />
                  )}

                  <div className="flex items-start justify-between mb-8 relative z-10">
                    <div>
                        <p className={`text-[10px] uppercase font-bold tracking-widest mb-2 ${highlightType === 'duplicate' ? 'text-red-400' : 'text-zinc-500'}`}>
                           Identificado — Titular
                        </p>
                        <h3 className="font-semibold text-2xl text-white tracking-tight">{foundGroup[0].titularNome}</h3>
                    </div>
                    <button onClick={clearResult} className="text-zinc-500 hover:text-white bg-zinc-800/50 hover:bg-zinc-700 p-2 rounded-full transition-colors">
                        <XCircle className="w-6 h-6" />
                    </button>
                  </div>

                  {/* ALERTA GIGANTE DE DUPLICIDADE */}
                  {highlightType === "duplicate" && (
                      <div className="mb-8 p-6 bg-red-500/20 border-2 border-red-500 rounded-2xl text-center flex flex-col items-center animate-in zoom-in-95 duration-300 shadow-[0_0_40px_rgba(239,68,68,0.2)] relative z-10">
                          <AlertTriangle className="w-12 h-12 text-red-500 mb-3" />
                          <h2 className="text-red-500 font-extrabold text-3xl md:text-4xl uppercase tracking-tight leading-none mb-2">Já Entrou</h2>
                          <p className="text-sm font-medium text-red-200">Este QR Code já foi lido anteriormente.</p>
                      </div>
                  )}

                  <div className="space-y-3 relative z-10">
                    <p className={`text-[10px] uppercase font-bold tracking-widest ${textSub} mb-1 pl-2`}>Membros da Família</p>
                    {foundGroup.map((person) => {
                        const isSelected = selectedPersonToken === person.token;
                        const hasEntered = !!records[person.token];

                        return (
                          <div 
                            key={person.token}
                            className={`flex items-center justify-between p-4 md:p-5 rounded-2xl transition-all ${
                                isSelected && !hasEntered ? "bg-zinc-800/80 ring-1 ring-zinc-500 shadow-md" : 
                                hasEntered ? "bg-zinc-950/50 border border-zinc-800/50" : 
                                "bg-zinc-800/30"
                            }`}
                          >
                            <div className="flex items-center gap-4">
                                {hasEntered ? (
                                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                                    </div>
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 border border-zinc-700">
                                        <User className="w-4 h-4 text-zinc-500" />
                                    </div>
                                )}
                                <div>
                                    <p className={`text-base font-semibold ${hasEntered ? "text-zinc-500" : "text-zinc-100"}`}>
                                        {person.nome}
                                    </p>
                                    {hasEntered && (
                                        <p className="text-[11px] font-medium text-emerald-600/80 mt-0.5">Entrou às {formatTime(records[person.token].entradaEm)}</p>
                                    )}
                                </div>
                            </div>

                            {!hasEntered ? (
                                <button 
                                  onClick={() => toggleCheckIn(person.token)}
                                  className="bg-emerald-500 hover:bg-emerald-400 text-emerald-950 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg active:scale-95"
                                >
                                    Check-in
                                </button>
                            ) : (
                                <span className="text-xs text-zinc-600 font-mono bg-zinc-900 px-3 py-1.5 rounded-lg">ID: {person.token.substring(0,4)}</span>
                            )}
                          </div>
                        );
                    })}
                  </div>

                </div>
              </section>
            )}
          </div>
        ) : (
          /* Aba Relatório */
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
            
            {/* Presentes */}
            <div className={`${bgCard} border ${borderColor} rounded-3xl overflow-hidden shadow-lg`}>
                <div className={`p-5 flex items-center justify-between border-b ${borderColor}`}>
                    <h3 className="text-sm font-semibold text-emerald-500 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5" /> Entradas Confirmadas
                    </h3>
                    <span className="font-mono text-zinc-400 text-sm">{totalPresentes}</span>
                </div>
                <div className="max-h-[40vh] overflow-y-auto bg-zinc-950/30">
                    {Object.values(records)
                        .sort((a, b) => b.entradaEm.localeCompare(a.entradaEm))
                        .map(rec => {
                            const p = guests.find(g => g.token === rec.token);
                            return (
                                <div key={rec.token} className={`flex items-center justify-between px-6 py-4 border-b ${borderColor} last:border-0 hover:bg-white/5 transition-colors`}>
                                    <div>
                                        <p className="text-sm font-medium text-zinc-100">{p?.nome || "Desconhecido"}</p>
                                        <p className={`text-[11px] ${textSub} font-medium mt-0.5`}>TITULAR: {p?.titularNome}</p>
                                    </div>
                                    <p className="text-xs text-zinc-500 font-mono tracking-tight">{formatTime(rec.entradaEm)}</p>
                                </div>
                            );
                        })
                    }
                    {totalPresentes === 0 && <p className={`px-6 py-12 text-center ${textSub} text-sm font-medium`}>Nenhuma entrada registrada.</p>}
                </div>
            </div>

            {/* Ausentes */}
            <div className={`${bgCard} border ${borderColor} rounded-3xl overflow-hidden shadow-lg opacity-80`}>
                <div className={`p-5 flex items-center justify-between border-b ${borderColor}`}>
                    <h3 className="text-sm font-semibold text-zinc-400 flex items-center gap-2">
                        <History className="w-5 h-5" /> Aguardando Chegada
                    </h3>
                    <span className="font-mono text-zinc-500 text-sm">{totalFaltando}</span>
                </div>
                <div className="max-h-[30vh] overflow-y-auto bg-zinc-950/30">
                    {guests.filter(g => !records[g.token])
                        .sort((a,b) => a.nome.localeCompare(b.nome))
                        .map(p => (
                            <div key={p.token} className={`flex items-center justify-between px-6 py-4 border-b border-zinc-800/40 last:border-0`}>
                                <div>
                                    <p className="text-sm font-medium text-zinc-400">{p.nome}</p>
                                    <p className="text-[11px] text-zinc-600 font-medium mt-0.5">TITULAR: {p.titularNome}</p>
                                </div>
                                <div className="w-2 h-2 rounded-full bg-zinc-700"></div>
                            </div>
                        ))
                    }
                </div>
            </div>
          </div>
        )}
      </main>

      {/* Navegação Inferior */}
      <nav className={`fixed bottom-0 left-0 w-full ${bgCard}/90 backdrop-blur-xl border-t ${borderColor} pb-6 pt-3 px-6 flex items-center justify-around z-50`}>
        <button 
          onClick={() => setActiveTab("portaria")}
          className={`flex flex-col items-center gap-1.5 transition-all p-2 rounded-xl active:scale-95 ${activeTab === "portaria" ? "text-zinc-50" : "text-zinc-500 hover:text-zinc-400"}`}
        >
          <div className={`p-2 rounded-full transition-colors ${activeTab === "portaria" ? "bg-zinc-800" : "bg-transparent"}`}>
            <LayoutDashboard className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest">Scanner</span>
        </button>

        <button 
          onClick={() => setActiveTab("relatorio")}
          className={`flex flex-col items-center gap-1.5 transition-all p-2 rounded-xl active:scale-95 ${activeTab === "relatorio" ? "text-zinc-50" : "text-zinc-500 hover:text-zinc-400"}`}
        >
          <div className={`p-2 rounded-full transition-colors ${activeTab === "relatorio" ? "bg-zinc-800" : "bg-transparent"}`}>
            <ListFilter className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest">Métricas</span>
        </button>
      </nav>
    </div>
  );
}
