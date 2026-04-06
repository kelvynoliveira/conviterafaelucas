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
  token: string;      // ID único (ex: 8f86dbab)
  nome: string;       // Nome da pessoa
  telefone: string;   // Telefone do titular
  grupoId: string;    // Token do titular
  isTitular: boolean; // Se é o titular
  titularNome: string;// Nome do titular do grupo
  confirmado: boolean;// Status RSVP (global do grupo)
}

interface CheckInRecord {
  token: string;
  entradaEm: string; // ISO timestamp
}

const STORAGE_KEY = "checkin_registros_v2"; // V2 para suportar novos campos individuais

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

    // Busca todo o grupo dessa pessoa
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
    if (records[token]) {
      // Opcional: permitir desmarcar (clique duplo ou botão específico)
      // Por enquanto, apenas alerta de duplicidade.
      return;
    }
    const updated = saveRecord(token);
    setRecords(updated);
    playBeep("success");
    // Se a aba for portaria e a pessoa estiver selecionada, atualiza o destaque
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

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0f08] text-stone-200 font-sans pb-20">
      {/* Header Fixo */}
      <header className="sticky top-0 z-[100] bg-[#1a2e0f]/90 backdrop-blur-md border-b border-[#3b5110]/30 px-6 py-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div>
            <h1 className="font-serif text-xl text-[#a8c070] flex items-center gap-2">
              Check-in <span className="text-[#636d4a] font-sans font-light">| Rafa & Lucas</span>
            </h1>
            <div className="flex items-center gap-3 mt-1 text-[10px] text-[#636d4a] uppercase tracking-widest">
              <span className="flex items-center gap-1"><UserCheck className="w-3 h-3"/> {totalPresentes} Presentes</span>
              <span className="flex items-center gap-1"><User className="w-3 h-3"/> {totalFaltando} Faltando</span>
            </div>
          </div>
          {loadError ? <WifiOff className="text-red-500 w-5 h-5"/> : <Wifi className="text-green-500/50 w-5 h-5"/>}
        </div>
        
        {/* Barra de Progresso */}
        <div className="max-w-2xl mx-auto mt-4 h-1 bg-black/40 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-[#3b5110] to-[#a8c070] transition-all duration-1000"
            style={{ width: `${porcentagem}%` }}
          />
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-6">

        {activeTab === "portaria" ? (
          <>
            {/* Seção de Entrada Manual / Busca */}
            <section className="space-y-4">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#636d4a] group-focus-within:text-[#a8c070] transition-colors" />
                <input
                  type="text"
                  placeholder="Pesquisar por nome..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-[#16250e] border border-[#3b5110]/40 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-[#a8c070]/60 transition-all text-white placeholder-stone-600 shadow-inner"
                />
                
                {/* Resultados da Busca */}
                {filteredSearch.length > 0 && (
                  <div className="absolute top-full mt-2 w-full bg-[#1a2e0f] border border-[#3b5110]/50 rounded-2xl shadow-2xl overflow-hidden z-[101]">
                    {filteredSearch.map((g) => (
                      <button
                        key={g.token}
                        onClick={() => resolvePerson(g.token)}
                        className="w-full flex items-center justify-between p-4 hover:bg-[#3b5110]/30 transition-colors border-b border-[#3b5110]/10 last:border-0"
                      >
                        <div>
                          <p className="text-sm font-semibold">{g.nome}</p>
                          <p className="text-[10px] text-[#636d4a] uppercase tracking-tighter">Grupo de: {g.titularNome}</p>
                        </div>
                        {records[g.token] ? (
                          <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-1 rounded-md">Entrou</span>
                        ) : (
                          <ArrowRight className="w-4 h-4 text-[#3b5110]" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Botão Scanner Principal */}
              {!scannerActive && !foundGroup.length && (
                <button
                  onClick={startScanner}
                  className="w-full h-32 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#1a2e0f] to-[#0f1a0a] border border-[#3b5110]/40 rounded-3xl hover:border-[#a8c070]/60 transition-all group"
                >
                  <QrCode className="w-10 h-10 text-[#a8c070] group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold uppercase tracking-widest text-[#a8c070]">Abrir Scanner</span>
                </button>
              )}
            </section>

            {/* Scanner Ativo */}
            {scannerActive && (
              <section className="bg-black rounded-3xl overflow-hidden border-2 border-[#3b5110] relative shadow-2xl">
                <div id="qr-reader" className="w-full overflow-hidden" />
                <div className="absolute top-4 right-4 z-10">
                  <button onClick={stopScanner} className="bg-red-900/80 text-white p-2 rounded-full backdrop-blur-md">
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
                {scannerError && <p className="p-4 text-center text-red-500">{scannerError}</p>}
                <div className="bg-[#1a2e0f] p-3 text-center text-[10px] uppercase tracking-widest text-[#636d4a]">
                  Aponte para o QR Code do convidado
                </div>
              </section>
            )}

            {/* Resultado do Check-in (Grupo/Pessoa) */}
            {foundGroup.length > 0 && (
              <section className="animate-in slide-in-from-bottom-4 duration-500">
                <div className={`p-6 rounded-3xl border-2 transition-all ${
                    highlightType === "duplicate" ? "bg-yellow-950/20 border-yellow-600/50 shadow-[0_0_40px_rgba(202,138,4,0.1)]" : 
                    highlightType === "error" ? "bg-red-950/20 border-red-600/50" : 
                    "bg-[#1a2e0f] border-[#3b5110]/50"
                }`}>
                  
                  {/* Cabeçalho do Card */}
                  <div className="flex items-start justify-between mb-8">
                    <div>
                        <h2 className="text-[10px] uppercase tracking-widest text-[#636d4a] mb-1">Identificado no Grupo de</h2>
                        <h3 className="font-serif text-2xl text-white">{foundGroup[0].titularNome}</h3>
                    </div>
                    <button onClick={clearResult} className="text-stone-500 hover:text-white">
                        <XCircle className="w-6 h-6" />
                    </button>
                  </div>

                  {/* Listagem do Grupo */}
                  <div className="space-y-4">
                    {foundGroup.map((person) => {
                        const isSelected = selectedPersonToken === person.token;
                        const hasEntered = !!records[person.token];

                        return (
                          <div 
                            key={person.token}
                            className={`flex items-center justify-between p-4 rounded-2xl transition-all ${
                                isSelected ? "bg-[#3b5110]/40 ring-1 ring-[#a8c070]/30" : "bg-black/20"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                                {hasEntered ? (
                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                ) : (
                                    <div className="w-5 h-5 border-2 border-[#3b5110] rounded-full" />
                                )}
                                <div>
                                    <p className={`text-sm font-bold ${hasEntered ? "text-stone-400" : "text-white"}`}>
                                        {person.nome}
                                    </p>
                                    {hasEntered && (
                                        <p className="text-[10px] text-green-600/80 uppercase">Entrada às {formatTime(records[person.token].entradaEm)}</p>
                                    )}
                                </div>
                            </div>

                            {!hasEntered ? (
                                <button 
                                  onClick={() => toggleCheckIn(person.token)}
                                  className="bg-[#3b5110] text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-[#4d6b16]"
                                >
                                    Check-in
                                </button>
                            ) : (
                                <span className="text-[10px] text-[#636d4a] font-mono">#{person.token}</span>
                            )}
                          </div>
                        );
                    })}
                  </div>

                  {/* Alerta de Duplicidade Gigante */}
                  {highlightType === "duplicate" && (
                      <div className="mt-8 p-6 bg-red-600/20 border border-red-500/50 rounded-2xl text-center flex flex-col items-center animate-pulse">
                          <AlertTriangle className="w-8 h-8 text-red-500 mb-2" />
                          <p className="text-red-500 font-black text-xl uppercase italic">⚠️ JÁ ENTROU</p>
                          <p className="text-xs text-red-400 mt-1">Este QR Code já foi processado anteriormente!</p>
                      </div>
                  )}
                </div>
              </section>
            )}
          </>
        ) : (
          /* Aba Relatório */
          <section className="space-y-6">
            
            {/* Lista Segmentada: Presentes */}
            <div className="bg-[#1a2e0f]/40 border border-[#3b5110]/20 rounded-3xl overflow-hidden">
                <div className="p-4 bg-[#1a2e0f] flex items-center justify-between border-b border-[#3b5110]/20">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-[#a8c070] flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" /> Presentes ({totalPresentes})
                    </h3>
                </div>
                <div className="max-h-[40vh] overflow-y-auto">
                    {Object.values(records)
                        .sort((a, b) => b.entradaEm.localeCompare(a.entradaEm))
                        .map(rec => {
                            const p = guests.find(g => g.token === rec.token);
                            return (
                                <div key={rec.token} className="flex items-center justify-between px-6 py-4 border-b border-[#3b5110]/10 last:border-0 hover:bg-white/5 transition-colors">
                                    <div>
                                        <p className="text-sm font-semibold text-white">{p?.nome || "Desconhecido"}</p>
                                        <p className="text-[10px] text-[#636d4a] uppercase">Grupo: {p?.titularNome}</p>
                                    </div>
                                    <p className="text-xs text-stone-500 font-mono">{formatTime(rec.entradaEm)}</p>
                                </div>
                            );
                        })
                    }
                    {totalPresentes === 0 && <p className="px-6 py-10 text-center text-[#636d4a] text-xs">Ninguém chegou ainda.</p>}
                </div>
            </div>

            {/* Lista Segmentada: Ausentes */}
            <div className="bg-[#1a2e0f]/10 border border-stone-800 rounded-3xl overflow-hidden">
                <div className="p-4 flex items-center justify-between border-b border-stone-800">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-stone-500 flex items-center gap-2">
                        <History className="w-4 h-4" /> Ainda Faltam ({totalFaltando})
                    </h3>
                </div>
                <div className="max-h-[40vh] overflow-y-auto">
                    {guests.filter(g => !records[g.token])
                        .sort((a,b) => a.nome.localeCompare(b.nome))
                        .map(p => (
                            <div key={p.token} className="flex items-center justify-between px-6 py-4 border-b border-stone-800/40 last:border-0 opacity-60">
                                <div>
                                    <p className="text-sm">{p.nome}</p>
                                    <p className="text-[10px] text-stone-600 uppercase">Titular: {p.titularNome}</p>
                                </div>
                                <XCircle className="w-4 h-4 text-stone-800" />
                            </div>
                        ))
                    }
                </div>
            </div>
          </section>
        )}
      </main>

      {/* Navegação Inferior (Abas) */}
      <nav className="fixed bottom-0 left-0 w-full bg-[#1a2e0f] border-t border-[#3b5110]/40 px-6 py-4 flex items-center justify-around translate-z-0">
        <button 
          onClick={() => setActiveTab("portaria")}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === "portaria" ? "text-[#a8c070] scale-110" : "text-[#636d4a]"}`}
        >
          <LayoutDashboard className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-tighter">Portaria</span>
        </button>

        <button 
          onClick={() => setActiveTab("relatorio")}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === "relatorio" ? "text-[#a8c070] scale-110" : "text-[#636d4a]"}`}
        >
          <ListFilter className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-tighter">Relatório</span>
        </button>
      </nav>
    </div>
  );
}
