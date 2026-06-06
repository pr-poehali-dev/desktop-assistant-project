import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";

const CHAR_URL = "https://cdn.poehali.dev/projects/a04100fc-3399-4f33-a69e-ae5981f2a1d2/bucket/b1bdc2b1-0446-4123-9e47-9e4ee7f16554.png";
const CHAT_URL = "https://functions.poehali.dev/a654c22c-c3aa-4611-8f19-cb4c0b691bf8";

const FRAMES: Record<string, string[]> = {
  idle: [CHAR_URL], talking: [CHAR_URL], listening: [CHAR_URL],
};

type Mode = "idle" | "listening" | "talking";
type Panel = "chat" | "settings" | null;
type Msg   = { role: "user" | "yuki"; text: string };

/* ─── Accent colors per mode ─── */
const ACCENT = {
  idle:      { hex: "#4a8fff", dim: "rgba(74,143,255," },
  listening: { hex: "#4adc78", dim: "rgba(74,220,120," },
  talking:   { hex: "#9b6dff", dim: "rgba(155,109,255," },
};

export default function Index() {
  const [mode,       setMode]       = useState<Mode>("idle");
  const [panel,      setPanel]      = useState<Panel>(null);
  const [messages,   setMessages]   = useState<Msg[]>([{ role: "yuki", text: "Привет! Я Юки. Чем могу помочь?" }]);
  const [chatInput,  setChatInput]  = useState("");
  const [frameIdx,   setFrameIdx]   = useState(0);
  const [voiceText,  setVoiceText]  = useState("");
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [yukiName,   setYukiName]   = useState("Юки");
  const [pitch,      setPitch]      = useState(1.4);
  const [rate,       setRate]       = useState(1.05);
  const [loading,    setLoading]    = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const apiHistory = useRef<{ role: string; content: string }[]>([]);

  const a = ACCENT[mode];

  /* ── Speech init ── */
  useEffect(() => {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    return () => { window.speechSynthesis.cancel(); };
  }, []);

  const speak = (text: string) => {
    if (!voiceEnabled) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/[\u{1F300}-\u{1FFFF}]/gu, "").trim();
    const utter = new SpeechSynthesisUtterance(clean);
    utter.lang = "ru-RU"; utter.pitch = pitch; utter.rate = rate; utter.volume = 1;
    const voices = window.speechSynthesis.getVoices();
    const ru = voices.find(v => v.lang.startsWith("ru") && /female|woman/i.test(v.name))
            ?? voices.find(v => v.lang.startsWith("ru"));
    if (ru) utter.voice = ru;
    utter.onstart = () => setMode("talking");
    utter.onend   = () => setMode("idle");
    utter.onerror = () => setMode("idle");
    window.speechSynthesis.speak(utter);
  };

  /* ── Ask AI ── */
  const askAI = async (userText: string) => {
    apiHistory.current.push({ role: "user", content: userText });
    setLoading(true);
    try {
      const res = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiHistory.current, name: yukiName }),
      });
      const data = await res.json();
      const reply: string = data.reply ?? "Не могу ответить прямо сейчас.";
      apiHistory.current.push({ role: "assistant", content: reply });
      setMessages(p => [...p, { role: "yuki", text: reply }]);
      speak(reply);
    } catch {
      setMessages(p => [...p, { role: "yuki", text: "Ошибка соединения..." }]);
      setMode("idle");
    } finally {
      setLoading(false);
    }
  };

  /* ── Frame animation ── */
  useEffect(() => {
    const frames = FRAMES[mode];
    if (frames.length <= 1) { setFrameIdx(0); return; }
    const ms = mode === "talking" ? 110 : mode === "listening" ? 170 : 400;
    const t = setInterval(() => setFrameIdx(i => (i + 1) % frames.length), ms);
    return () => clearInterval(t);
  }, [mode]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  /* ── Mic ── */
  const handleMic = () => {
    if (mode === "listening") { setMode("idle"); setVoiceText(""); return; }
    setMode("listening");
    setVoiceText("Слушаю...");
    setTimeout(() => {
      const demo = "Расскажи о себе";
      setVoiceText(demo);
      setTimeout(() => {
        setVoiceText("");
        setMode("idle");
        setMessages(p => [...p, { role: "user", text: demo }]);
        setPanel("chat");
        askAI(demo);
      }, 1200);
    }, 1800);
  };

  /* ── Send ── */
  const sendMsg = async () => {
    const msg = chatInput.trim(); if (!msg) return;
    setChatInput("");
    setMessages(p => [...p, { role: "user", text: msg }]);
    await askAI(msg);
  };

  const currentFrame = FRAMES[mode][frameIdx] ?? FRAMES.idle[0];
  const charClass    = mode === "talking" ? "char-talk" : mode === "listening" ? "char-listen" : "char-idle";
  const widgetClass  = mode === "talking" ? "widget-talk" : mode === "listening" ? "widget-listen" : "widget-idle";

  /* ── Triangle geometry (острый, без скруглений) ── */
  // Перевёрнутый треугольник 280×260
  const TW = 280; const TH = 260;
  // Путь: острые углы сверху, острый кончик снизу
  const triPath = `M${TW/2} ${TH} L0 0 L${TW} 0 Z`;

  /* ── Window clip paths ── */
  // Левое окно: верхний правый угол срезан под треугольник (45°-скос)
  // Правое окно: верхний левый угол срезан
  const WW = 190; const WH = TH;
  const CUT = 44; // размер среза совпадает с углом треугольника
  // LEFT window: clip-path срезает правый верхний угол
  const leftClip  = `polygon(0 0, calc(100% - ${CUT}px) 0, 100% ${CUT}px, 100% 100%, 0 100%)`;
  // RIGHT window: clip-path срезает левый верхний угол
  const rightClip = `polygon(${CUT}px 0, 100% 0, 100% 100%, 0 100%, 0 ${CUT}px)`;

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-end relative overflow-hidden"
      style={{
        userSelect: "none",
        background: `radial-gradient(ellipse at 50% 90%, ${a.dim}0.08) 0%, transparent 60%), hsl(222,25%,6%)`,
      }}>

      {/* ambient dots */}
      <div className="fixed inset-0 pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="absolute rounded-full"
            style={{
              width: 2, height: 2, background: a.hex, opacity: 0.2,
              left: `${10 + i * 18}%`, bottom: `${20 + (i % 3) * 14}%`,
              boxShadow: `0 0 6px 2px ${a.dim}0.45)`,
              animation: `float-idle ${3 + i * 0.7}s ease-in-out infinite`,
              animationDelay: `${i * 0.4}s`,
            }} />
        ))}
      </div>

      {/* ═══════════════ CHARACTER ═══════════════ */}
      <div className="relative z-10 pointer-events-none" style={{ marginBottom: -55 }}>
        <div className="absolute bottom-0 left-0 right-0 z-10" style={{
          height: "52%",
          background: `linear-gradient(to bottom, transparent 0%, transparent 15%, rgba(9,13,24,0.5) 55%, rgba(9,13,24,0.92) 82%, rgba(9,13,24,1) 100%)`,
        }} />
        <img src={currentFrame} alt={yukiName} className={charClass}
          style={{ height: 390, width: "auto", objectFit: "contain", display: "block", position: "relative", zIndex: 1 }} />
      </div>

      {/* ═══════════════ BOTTOM ZONE ═══════════════ */}
      <div className="relative z-20 flex items-end justify-center w-full pb-6" style={{ gap: 0 }}>

        {/* ── LEFT PANEL (ЧАТ) ── */}
        <div
          style={{
            width: panel === "chat" ? WW : 0,
            height: WH,
            overflow: "hidden",
            transition: "width 0.38s cubic-bezier(.22,1,.36,1)",
            flexShrink: 0,
            position: "relative",
          }}>
          {panel === "chat" && (
            <div
              className="panel-open flex flex-col absolute top-0 right-0"
              style={{
                width: WW, height: WH,
                background: `linear-gradient(135deg, rgba(14,20,40,0.97) 0%, rgba(10,14,28,0.95) 100%)`,
                border: `1px solid ${a.dim}0.25)`,
                // Скос верхнего правого угла — плотно примыкает к треугольнику
                clipPath: leftClip,
                backdropFilter: "blur(20px)",
              }}>

              {/* header — смещён от среза */}
              <div className="flex items-center justify-between px-3 pt-3 pb-2 flex-shrink-0"
                style={{ borderBottom: `1px solid ${a.dim}0.12)`, marginRight: CUT / 2 }}>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#4adc78", boxShadow: "0 0 5px #4ade80" }} />
                  <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.82)" }}>Чат</span>
                </div>
                <button onClick={() => setPanel(null)} className="transition-colors hover:opacity-70" style={{ color: "rgba(255,255,255,0.3)" }}>
                  <Icon name="X" size={12} />
                </button>
              </div>

              {/* messages */}
              <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 min-h-0">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className="px-2 py-1.5 text-[11px] leading-relaxed max-w-[90%]"
                      style={{
                        borderRadius: m.role === "user" ? "10px 10px 2px 10px" : "10px 10px 10px 2px",
                        background: m.role === "user" ? `${a.dim}0.22)` : "rgba(255,255,255,0.06)",
                        border: m.role === "user" ? `1px solid ${a.dim}0.35)` : "1px solid rgba(255,255,255,0.06)",
                        color: m.role === "user" ? "#dde8ff" : "rgba(255,255,255,0.75)",
                        wordBreak: "break-word",
                      }}>
                      {m.text}
                    </div>
                  </div>
                ))}
                {(loading || mode === "talking") && (
                  <div className="flex justify-start">
                    <div className="px-2.5 py-2 flex gap-1 items-center"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px 10px 10px 2px" }}>
                      {[0, 140, 280].map(d => (
                        <div key={d} className="w-1 h-1 rounded-full"
                          style={{ background: a.hex, animation: "dot-bounce 0.9s ease infinite", animationDelay: `${d}ms` }} />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* input */}
              <div className="px-2 pb-2 pt-1 flex-shrink-0" style={{ borderTop: `1px solid ${a.dim}0.1)` }}>
                <div className="flex gap-1">
                  <input
                    value={chatInput} onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !loading && sendMsg()}
                    placeholder="Написать..."
                    disabled={loading}
                    className="flex-1 px-2 py-1.5 text-[11px] text-white/90 placeholder-white/20 outline-none rounded-lg"
                    style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${a.dim}0.15)`, fontFamily: "'Golos Text',sans-serif", minWidth: 0 }} />
                  <button onClick={sendMsg} disabled={loading}
                    className="px-2 py-1.5 rounded-lg flex items-center justify-center flex-shrink-0 transition-all hover:scale-105 disabled:opacity-40"
                    style={{ background: `${a.dim}0.18)`, border: `1px solid ${a.dim}0.3)`, color: a.hex }}>
                    <Icon name="Send" size={11} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── TRIANGLE WIDGET ── */}
        <div
          className={`relative flex-shrink-0 ${widgetClass}`}
          style={{ width: TW, height: TH, zIndex: 2 }}>

          <svg width={TW} height={TH} viewBox={`0 0 ${TW} ${TH}`} fill="none"
            style={{ position: "absolute", top: 0, left: 0, overflow: "visible" }}>
            <defs>
              <linearGradient id="tg" x1={TW/2} y1="0" x2={TW/2} y2={TH} gradientUnits="userSpaceOnUse">
                <stop offset="0%"   stopColor={mode==="listening"?"#0b2016":mode==="talking"?"#14092a":"#0a1220"} />
                <stop offset="100%" stopColor={mode==="listening"?"#060e0b":mode==="talking"?"#09061a":"#060a14"} />
              </linearGradient>
              <linearGradient id="tbs" x1="0" y1="0" x2={TW} y2={TH} gradientUnits="userSpaceOnUse">
                <stop offset="0%"   stopColor={a.hex} stopOpacity="0.9" />
                <stop offset="50%"  stopColor={a.hex} stopOpacity="0.35" />
                <stop offset="100%" stopColor={a.hex} stopOpacity="0.8" />
              </linearGradient>
              <clipPath id="tc">
                <path d={triPath} />
              </clipPath>
            </defs>

            {/* Main sharp triangle */}
            <path d={triPath} fill="url(#tg)" stroke="url(#tbs)" strokeWidth="1.5" strokeLinejoin="miter" />

            {/* Inner triangle echo */}
            <path d={`M${TW/2} ${TH-20} L16 10 L${TW-16} 10 Z`}
              fill="none" stroke={a.hex} strokeWidth="0.6" strokeOpacity="0.1" strokeLinejoin="miter" />

            {/* Scan line */}
            <g clipPath="url(#tc)">
              <line x1="10" y1="0" x2={TW-10} y2="0" stroke={a.hex} strokeWidth="0.8" strokeOpacity="0.45"
                style={{ animation: "scan-line 3s linear infinite" }} />
            </g>

            {/* Top edge dots */}
            {[TW/2 - 18, TW/2, TW/2 + 18].map((cx, i) => (
              <circle key={i} cx={cx} cy="9" r="2" fill={a.hex} opacity="0.5" />
            ))}

            {/* Horizontal divider */}
            <line x1="55" y1={TH * 0.5} x2={TW - 55} y2={TH * 0.5}
              stroke={a.hex} strokeWidth="0.7" strokeOpacity="0.13" />
          </svg>

          {/* Status badge */}
          <div className="absolute flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{
              top: 14, left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap",
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
            }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: a.hex, boxShadow: `0 0 5px ${a.hex}` }} />
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.38)", fontFamily: "'Golos Text',sans-serif" }}>
              {mode === "listening" ? "запись..." : mode === "talking" ? `${yukiName} говорит` : `${yukiName} · онлайн`}
            </span>
          </div>

          {/* ── BTN LEFT (Чат) ── */}
          <button
            onClick={() => setPanel(p => p === "chat" ? null : "chat")}
            className="absolute flex flex-col items-center gap-1 tri-btn"
            style={{ left: 32, top: 55 }}>
            <div className="flex items-center justify-center rounded-xl transition-all"
              style={{
                width: 44, height: 44,
                background: panel === "chat" ? `${a.dim}0.2)` : "rgba(255,255,255,0.05)",
                border: `1px solid ${panel === "chat" ? `${a.dim}0.5)` : "rgba(255,255,255,0.1)"}`,
                boxShadow: panel === "chat" ? `0 0 16px ${a.dim}0.35)` : "none",
                transform: panel === "chat" ? "scale(1.1)" : "scale(1)",
              }}>
              <Icon name="MessageCircle" size={17} style={{ color: panel === "chat" ? a.hex : "rgba(255,255,255,0.38)" }} />
            </div>
            <span style={{ fontSize: 9, color: panel === "chat" ? a.hex : "rgba(255,255,255,0.28)", fontFamily: "'Golos Text',sans-serif" }}>Чат</span>
          </button>

          {/* ── BTN RIGHT (Настройки) ── */}
          <button
            onClick={() => setPanel(p => p === "settings" ? null : "settings")}
            className="absolute flex flex-col items-center gap-1 tri-btn"
            style={{ right: 32, top: 55 }}>
            <div className="flex items-center justify-center rounded-xl transition-all"
              style={{
                width: 44, height: 44,
                background: panel === "settings" ? `${a.dim}0.2)` : "rgba(255,255,255,0.05)",
                border: `1px solid ${panel === "settings" ? `${a.dim}0.5)` : "rgba(255,255,255,0.1)"}`,
                boxShadow: panel === "settings" ? `0 0 16px ${a.dim}0.35)` : "none",
                transform: panel === "settings" ? "scale(1.1)" : "scale(1)",
              }}>
              <Icon name="Settings" size={17} style={{ color: panel === "settings" ? a.hex : "rgba(255,255,255,0.38)" }} />
            </div>
            <span style={{ fontSize: 9, color: panel === "settings" ? a.hex : "rgba(255,255,255,0.28)", fontFamily: "'Golos Text',sans-serif" }}>Настройки</span>
          </button>

          {/* ── BTN CENTER (Mic) ── */}
          <div className="absolute flex flex-col items-center gap-1"
            style={{ bottom: 28, left: "50%", transform: "translateX(-50%)" }}>
            {(mode === "listening" || mode === "talking") && (
              <>
                <div className="ring-out absolute rounded-full pointer-events-none"
                  style={{ width: 64, height: 64, top: -10, left: -10, border: `1.5px solid ${a.dim}0.6)` }} />
                <div className="ring-out-2 absolute rounded-full pointer-events-none"
                  style={{ width: 64, height: 64, top: -10, left: -10, border: `1px solid ${a.dim}0.35)` }} />
              </>
            )}
            <button onClick={handleMic}
              className="tri-btn relative flex items-center justify-center rounded-2xl"
              style={{
                width: 56, height: 56,
                background: mode !== "idle" ? `${a.dim}0.18)` : "rgba(255,255,255,0.05)",
                border: `1.5px solid ${mode !== "idle" ? `${a.dim}0.6)` : "rgba(255,255,255,0.12)"}`,
                boxShadow: mode !== "idle" ? `0 0 22px ${a.dim}0.4), 0 0 44px ${a.dim}0.15)` : "none",
              }}>
              {mode !== "idle" ? (
                <div className="flex items-end gap-0.5" style={{ color: a.hex }}>
                  {[1,2,3,4,5].map(i => <div key={i} className="wave-bar" />)}
                </div>
              ) : (
                <Icon name="Mic" size={22} style={{ color: a.hex }} />
              )}
            </button>
            <span style={{ fontSize: 9, color: mode !== "idle" ? a.hex : "rgba(255,255,255,0.28)", fontFamily: "'Golos Text',sans-serif" }}>
              {mode === "listening" ? "Слушаю" : mode === "talking" ? "Говорю" : "Голос"}
            </span>
          </div>

          {/* Voice bubble */}
          {voiceText && (
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full panel-open whitespace-nowrap"
              style={{ background: `${a.dim}0.12)`, border: `1px solid ${a.dim}0.35)` }}>
              <span style={{ fontSize: 11, color: a.hex, fontFamily: "'Golos Text',sans-serif" }}>{voiceText}</span>
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL (НАСТРОЙКИ) ── */}
        <div
          style={{
            width: panel === "settings" ? WW : 0,
            height: WH,
            overflow: "hidden",
            transition: "width 0.38s cubic-bezier(.22,1,.36,1)",
            flexShrink: 0,
            position: "relative",
          }}>
          {panel === "settings" && (
            <div
              className="panel-open flex flex-col absolute top-0 left-0"
              style={{
                width: WW, height: WH,
                background: `linear-gradient(225deg, rgba(14,20,40,0.97) 0%, rgba(10,14,28,0.95) 100%)`,
                border: `1px solid ${a.dim}0.25)`,
                clipPath: rightClip,
                backdropFilter: "blur(20px)",
              }}>

              {/* header */}
              <div className="flex items-center justify-between px-3 pt-3 pb-2 flex-shrink-0"
                style={{ borderBottom: `1px solid ${a.dim}0.12)`, marginLeft: CUT / 2 }}>
                <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.82)" }}>Настройки</span>
                <button onClick={() => setPanel(null)} className="transition-colors hover:opacity-70" style={{ color: "rgba(255,255,255,0.3)" }}>
                  <Icon name="X" size={12} />
                </button>
              </div>

              <div className="px-3 py-3 space-y-3 flex-1 overflow-y-auto" style={{ paddingLeft: CUT / 2 + 8 }}>
                {/* Имя */}
                <div>
                  <label className="text-[10px] mb-1 block" style={{ color: "rgba(255,255,255,0.35)" }}>Имя ассистента</label>
                  <input value={yukiName} onChange={e => setYukiName(e.target.value)}
                    className="w-full px-2 py-1.5 text-[11px] text-white/90 outline-none rounded-lg"
                    style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${a.dim}0.18)`, fontFamily: "'Golos Text',sans-serif" }} />
                </div>

                {/* Голос toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.55)" }}>Голос</span>
                  <button onClick={() => { setVoiceEnabled(v => !v); window.speechSynthesis.cancel(); }}
                    className="relative transition-all flex-shrink-0"
                    style={{ width: 34, height: 18, borderRadius: 9, background: voiceEnabled ? `${a.dim}0.7)` : "rgba(255,255,255,0.1)" }}>
                    <div className="absolute top-1 w-3.5 h-3.5 rounded-full bg-white shadow transition-all"
                      style={{ left: voiceEnabled ? 17 : 2 }} />
                  </button>
                </div>

                {/* Pitch */}
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>Высота голоса</label>
                    <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>{pitch.toFixed(1)}</span>
                  </div>
                  <input type="range" min={0.5} max={2} step={0.1} value={pitch}
                    onChange={e => setPitch(+e.target.value)}
                    className="w-full h-0.5 cursor-pointer" style={{ accentColor: a.hex }} />
                </div>

                {/* Rate */}
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>Скорость речи</label>
                    <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>{rate.toFixed(2)}</span>
                  </div>
                  <input type="range" min={0.5} max={2} step={0.05} value={rate}
                    onChange={e => setRate(+e.target.value)}
                    className="w-full h-0.5 cursor-pointer" style={{ accentColor: a.hex }} />
                </div>

                {/* Test */}
                <button onClick={() => speak(`Привет! Меня зовут ${yukiName}.`)}
                  className="w-full py-1.5 rounded-lg text-[11px] font-medium transition-all hover:scale-[1.02] flex items-center justify-center gap-1.5"
                  style={{ background: `${a.dim}0.14)`, border: `1px solid ${a.dim}0.28)`, color: a.hex }}>
                  <Icon name="Volume2" size={12} />
                  Тест голоса
                </button>

                {/* Clear history */}
                <button onClick={() => { setMessages([{ role: "yuki", text: "История очищена. Чем могу помочь?" }]); apiHistory.current = []; }}
                  className="w-full py-1.5 rounded-lg text-[11px] font-medium transition-all hover:scale-[1.02] flex items-center justify-center gap-1.5"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}>
                  <Icon name="Trash2" size={12} />
                  Очистить чат
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
