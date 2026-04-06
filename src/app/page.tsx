"use client";

import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Music2, Music3, Gift, CalendarCheck, Quote, MailOpen } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";

const FloralBorders = () => (
  <>
    <div className="absolute top-0 left-0 w-24 md:w-1/3 lg:w-1/4 h-full pointer-events-none mix-blend-multiply opacity-40 md:opacity-80 bg-[url('/vertical-floral.png')] bg-left-top bg-contain bg-repeat-y -ml-6 md:-ml-[10%] z-0"></div>
    <div className="absolute top-0 right-0 w-24 md:w-1/3 lg:w-1/4 h-full pointer-events-none mix-blend-multiply opacity-40 md:opacity-80 bg-[url('/vertical-floral.png')] bg-right-top bg-contain bg-repeat-y scale-x-[-1] -mr-6 md:-mr-[10%] z-0"></div>
  </>
);

export default function Home() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [pixCopied, setPixCopied] = useState(false);
  const [showEntrance, setShowEntrance] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio("/music.mp3");
    audioRef.current.loop = true;
  }, []);

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const copyPixUrl = () => {
    navigator.clipboard.writeText("81995478867");
    setPixCopied(true);
    setTimeout(() => setPixCopied(false), 2000);
  };

  const openInvitation = () => {
    setShowEntrance(false);
    if (audioRef.current) {
      audioRef.current.play().catch(e => console.log("Audio play failed:", e));
      setIsPlaying(true);
    }
  };

  const oliveColor = "text-[#3b5110]";
  const sageColor = "text-[#636d4a]";

  return (
    <main className={`w-full h-screen relative bg-[#fdfaf6] ${showEntrance ? "overflow-hidden" : "snap-y-mandatory overflow-y-scroll overflow-x-hidden"}`}>
      
      {/* Entrance Overlay */}
      <AnimatePresence>
        {showEntrance && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#fdfaf6]"
          >
            <FloralBorders />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="z-10 flex flex-col items-center text-center px-6"
            >
              <MailOpen className={`${oliveColor} w-10 h-10 mb-6 stroke-[1.5]`} />
              <h2 className={`font-serif text-4xl ${oliveColor} mb-2`}>Rafaela & Lucas</h2>
              <p className={`${sageColor} font-light text-xs mb-12 uppercase tracking-widest`}>Você foi convidado</p>
              
              <button
                onClick={openInvitation}
                className={`bg-[#3b5110] text-white px-10 py-4 rounded-full text-xs font-bold uppercase tracking-widest border border-[#3b5110] hover:bg-transparent hover:text-[#3b5110] transition-all shadow-xl`}
              >
                Abrir Convite
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Audio Control */}
      <button
        onClick={toggleAudio}
        className={`fixed top-6 right-6 z-50 w-12 h-12 flex items-center justify-center bg-white/40 backdrop-blur-xl border border-white/60 rounded-full hover:bg-white/60 hover:scale-110 active:scale-95 transition-all duration-500 shadow-[0_8px_32px_rgba(0,0,0,0.15)] group ${showEntrance ? 'opacity-0 pointer-events-none translate-y-4' : 'opacity-100 translate-y-0'}`}
        aria-label="Toggle music"
      >
        {isPlaying ? (
          <Music2 className={`${oliveColor} w-5 h-5 drop-shadow-sm group-hover:animate-pulse`} />
        ) : (
          <div className="relative flex items-center justify-center">
            <Music3 className={`${oliveColor} w-5 h-5 opacity-60`} />
            <div className="absolute w-[22px] h-[1.5px] bg-[#3b5110] rotate-45 opacity-60 rounded-full"></div>
          </div>
        )}
      </button>

      {/* Section 1: Photo Hero */}
      <section className="h-screen w-full relative flex flex-col justify-end items-center snap-start overflow-hidden z-20 bg-black pb-36 md:pb-28">
        {/* Background Photo */}
        <img
          src="/hero.jpg"
          alt="Os Noivos"
          className="absolute inset-0 w-full h-full object-cover z-0 object-center"
        />

        {/* Overlay escuro para garantir legibilidade, mas suave */}
        <div className="absolute inset-0 bg-black/30 z-10"></div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="z-20 text-center text-white px-6"
        >
          <h1 className="font-serif text-6xl md:text-8xl mb-2 md:mb-4 drop-shadow-md" style={{ fontFamily: "'Playfair Display', serif" }}>
            Rafaela <span className="text-4xl md:text-5xl">&</span> Lucas
          </h1>
          <p className="text-xs md:text-base tracking-[0.2em] uppercase mt-4 mb-4 drop-shadow-sm font-light leading-relaxed">
            Convidam para o seu casamento
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1.5, repeat: Infinity, repeatType: "reverse" }}
          className="absolute bottom-8 z-20 text-white flex flex-col items-center opacity-80"
        >
          <span className="text-[10px] uppercase tracking-widest mb-3">Deslize</span>
          <div className="w-[1px] h-12 md:h-16 bg-gradient-to-b from-white to-transparent"></div>
        </motion.div>
      </section>

      {/* Section 2: Date & Verse */}
      <section className="min-h-screen py-24 w-full flex flex-col justify-center items-center snap-start relative px-6 bg-transparent overflow-hidden z-10">
        <FloralBorders />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
          className="text-center z-10 flex flex-col items-center w-full"
        >
          {/* Foto 2: Imagem do casal grande */}
          <div className="mb-10 md:mb-14 relative w-full xl:w-[80vw] max-w-4xl h-[40vh] md:h-[65vh] mt-4 z-10">
            <img src="/foto-2.jpg" alt="Momentos dos Noivos" className="w-full h-full object-cover rounded-3xl shadow-2xl border-4 border-white/80" />
          </div>

          <p className={`${sageColor} text-xs md:text-sm tracking-[0.3em] uppercase mb-4 md:mb-8`}>A realizar-se no dia</p>

          <div className={`flex gap-3 md:gap-6 justify-center items-center font-serif text-5xl md:text-7xl ${oliveColor} mb-6 md:mb-8`}>
            <div className="flex flex-col items-center">
              <span>12</span>
            </div>
            <div className="text-stone-300 font-light text-3xl md:text-4xl">/</div>
            <div className="flex flex-col items-center">
              <span>07</span>
            </div>
            <div className="text-stone-300 font-light text-3xl md:text-4xl">/</div>
            <div className="flex flex-col items-center">
              <span>2026</span>
            </div>
          </div>

          <p className={`${sageColor} tracking-widest uppercase mb-16 text-sm`}>às 15:30 horas</p>

          <div className="mt-10 px-8 py-6 border-t border-b border-[#3b5110]/20 relative">
            <Quote className={`absolute -top-4 bg-[#fcf9f2] px-2 left-1/2 -translate-x-1/2 w-8 h-8 ${sageColor} opacity-50`} />
            <p className={`font-serif text-xl md:text-2xl ${sageColor} italic font-light leading-relaxed`}>
              "Portanto, o que Deus uniu, ninguém o separe."
            </p>
            <p className={`mt-4 text-xs font-bold uppercase tracking-widest ${oliveColor}`}>Mateus 19:6</p>
          </div>
        </motion.div>
      </section>

      {/* Section 3: Locations */}
      <section className="min-h-screen py-24 w-full flex flex-col justify-center items-center snap-start relative px-6 bg-transparent overflow-hidden z-10">
        <FloralBorders />
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="z-10 w-full max-w-md space-y-12"
        >
          {/* Cerimônia */}
          <div className="flex flex-col items-center text-center p-8 bg-white/50 backdrop-blur-sm rounded-3xl shadow-[0_10px_40px_-15px_rgba(59,81,16,0.1)] border border-stone-100">
            <div className="w-full h-40 md:h-48 relative mb-6 rounded-2xl overflow-hidden shadow-sm">
              <img src="/igrejaorobo.jpg" alt="Igreja Matriz de Orobó" className="absolute inset-0 w-full h-full object-cover hover:scale-110 transition-transform duration-700" />
            </div>
            <MapPin className={`${oliveColor} w-8 h-8 mb-4 stroke-[1.5]`} />
            <h3 className={`font-serif text-2xl ${oliveColor} mb-2`}>Local da Cerimônia</h3>
            <p className={`${sageColor} mb-6 text-sm font-light leading-relaxed`}>
              Igreja Matriz de Orobó<br />
              Praça Cel. Abílio de Souza Barbosa, 26<br />
            </p>
            <a
              href="https://www.google.com/maps/place/Igreja+Matriz+Nossa+Senhora+da+Concei%C3%A7%C3%A3o/@-7.7467834,-35.6034836,20.54z/data=!4m6!3m5!1s0x7abeafe696bd8f1:0x96fb63402cf6572b!8m2!3d-7.746704!4d-35.6033921!16s%2Fg%2F1tgs1473?entry=ttu&g_ep=EgoyMDI2MDQwMS4wIKXMDSoASAFQAw%3D%3D"
              target="_blank"
              rel="noopener noreferrer"
              className={`border border-[#3b5110] ${oliveColor} px-6 py-2 rounded-full text-xs uppercase tracking-widest hover:bg-[#3b5110] hover:text-white transition-all`}
            >
              Ver no Mapa
            </a>
          </div>

          {/* Festa */}
          <div className="flex flex-col items-center text-center p-8 bg-white/50 backdrop-blur-sm rounded-3xl shadow-[0_10px_40px_-15px_rgba(59,81,16,0.1)] border border-stone-100">
            <div className="w-full h-40 md:h-48 relative mb-6 rounded-2xl overflow-hidden shadow-sm">
              <img src="/chacarafalcao.jpg" alt="Chácara Falcão" className="absolute inset-0 w-full h-full object-cover hover:scale-110 transition-transform duration-700" />
            </div>
            <MapPin className={`${oliveColor} w-8 h-8 mb-4 stroke-[1.5]`} />
            <h3 className={`font-serif text-2xl ${oliveColor} mb-2`}>Local da Festa</h3>
            <p className={`${sageColor} mb-6 text-sm font-light leading-relaxed`}>
              Chácara Falcão<br />
              Sitio Oiteiro de Cobra<br />
            </p>
            <a
              href="https://www.google.com/maps/@-7.6945154,-35.5762213,108m/data=!3m1!1e3?entry=ttu&g_ep=EgoyMDI2MDQwMS4wIKXMDSoASAFQAw%3D%3D"
              target="_blank"
              rel="noopener noreferrer"
              className={`border border-[#3b5110] ${oliveColor} px-6 py-2 rounded-full text-xs uppercase tracking-widest hover:bg-[#3b5110] hover:text-white transition-all`}
            >
              Ver no Mapa
            </a>
          </div>

        </motion.div>
      </section>

      {/* Section 4: RSVP & Signature */}
      <section className="min-h-screen py-24 w-full flex flex-col justify-center items-center snap-start relative px-6 bg-transparent overflow-hidden z-10">
        <FloralBorders />
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="text-center z-10 w-full max-w-5xl flex flex-col items-center"
        >

          <div className="flex flex-col md:flex-row gap-8 w-full justify-center items-stretch mb-16">
            {/* O RSVP Card */}
            <div className="bg-white rounded-3xl shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)] px-8 py-10 w-full max-w-md flex flex-col justify-between">
              <div>
                <CalendarCheck className={`${oliveColor} w-8 h-8 mx-auto mb-4 stroke-[1.5]`} />
                <h2 className={`font-serif text-2xl ${oliveColor} mb-4`}>Sua presença é muito importante!</h2>
                <p className={`${sageColor} text-sm mb-6 leading-relaxed font-light px-2`}>
                  Por favor, confirme se poderá comparecer até o dia:
                </p>
                
                <div className="bg-[#fcf9f2] py-5 px-4 rounded-2xl mb-6 flex flex-col items-center justify-center">
                  <p className="font-bold text-[#3b5110] text-lg tracking-widest uppercase mb-1">30 de Junho</p>
                  <p className={`${sageColor} text-sm font-light tracking-widest`}>DE 2026</p>
                </div>
              </div>
              <a
                href="https://wa.me/5581995478867?text=Oi%20Rafaela%20e%20Lucas,%20ficamos%20felizes%20pelo%20convite%20e%20j%C3%A1%20confirmamos%20nossa%20presen%C3%A7a%20para%20celebrar%20esse%20dia%20t%C3%A3o%20especial%20com%20voc%C3%AAs"
                target="_blank"
                rel="noopener noreferrer"
                className={`bg-[#3b5110] text-white px-8 py-4 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-[#2e400c] transition-all shadow-md w-full inline-block mt-auto`}
              >
                Confirmar pelo WhatsApp
              </a>
            </div>

            {/* O Pix Card */}
            <div className="bg-white rounded-3xl shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)] px-8 py-10 w-full max-w-md flex flex-col justify-between">
              <div>
                <Gift className={`${oliveColor} w-8 h-8 mx-auto mb-4 stroke-[1.5]`} />
                <h2 className={`font-serif text-2xl ${oliveColor} mb-4`}>Lista de Presentes</h2>
                <p className={`${sageColor} text-sm mb-6 leading-relaxed font-light`}>
                  Nosso maior presente é sua presença! Caso queira nos presentear, sugerimos que seja via PIX:
                </p>
                
                <div className="bg-[#fcf9f2] py-5 px-4 rounded-2xl mb-6 text-sm font-light text-[#636d4a] flex flex-col items-center justify-center">
                  <p className="font-bold text-[#3b5110] text-lg mb-1 tracking-widest">81995478867</p>
                  <p className="mb-3">Rafaela Evelin</p>
                  <img src="/bancointer.png" alt="Banco Inter" className="h-8 object-contain mix-blend-multiply opacity-80" />
                </div>
              </div>

              <button
                onClick={copyPixUrl}
                className={`border border-[#3b5110] ${pixCopied ? 'bg-[#3b5110] text-white' : oliveColor} px-8 py-4 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-[#3b5110] hover:text-white transition-all shadow-sm w-full inline-block mt-auto`}
              >
                {pixCopied ? "Chave Copiada ✓" : "Copiar Chave Pix"}
              </button>
            </div>
          </div>

          {/* Assinatura com a fonte Script cursiva gigante igual a referência */}
          <div className="flex flex-col items-center mt-4">
            <p className={`font-serif uppercase tracking-[0.3em] text-sm ${oliveColor} mb-6`}>
              Com carinho
            </p>
            <h2 className={`${oliveColor} text-6xl md:text-8xl mb-8`} style={{ fontFamily: "var(--font-script)" }}>
              Rafaela e Lucas
            </h2>
          </div>
        </motion.div>
      </section>

      {/* Section 5: Foto Final Cobrindo a Tela */}
      <section className="h-screen w-full relative flex flex-col justify-center items-center snap-start overflow-hidden z-20 bg-black">
        <img
          src="/foto-3.jpg"
          alt="Noivos Final"
          className="absolute inset-0 w-full h-full object-cover z-0 object-center"
        />
        <div className="absolute inset-0 bg-black/20 z-10" />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute bottom-16 md:bottom-24 z-20 flex flex-col items-center w-full drop-shadow-xl"
        >
        </motion.div>
      </section>
    </main>
  );
}
