import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";

const CHAR_URL = "https://cdn.poehali.dev/projects/a04100fc-3399-4f33-a69e-ae5981f2a1d2/bucket/b1bdc2b1-0446-4123-9e47-9e4ee7f16554.png";
const FRAMES: Record<string, string[]> = {
  idle: [CHAR_URL], talking: [CHAR_URL], listening: [CHAR_URL],
};
const INIT_MESSAGES = [
  { role: "yuki", text: "Привет! Я Юки. Чем могу помочь?" },
];

type Mode = "idle" | "listening" | "talking";
type Panel = "chat" | "settings" | null;

export default function Index() {
  const [mode, setMode]       = useState<Mode>("idle");
  const [panel, setPanel]     = useState<Panel>(null);
  const [messages, setMessages] = useState(INIT_MESSAGES);
  const [chatInput, setChatInput] = useState("");
  const [frameIdx, setFrameIdx]   = useState(0);
  const [voiceText, setVoiceText] = useState("");
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [yukiName, setYukiName] = useState("Юки");
  const [pitch, setPitch]     = useState(1.4);
  const [rate, setRate]       = useState(1.05);
  const chatEndRef = useRef<HTMLDivElement>(null);

  /* ── Speech ── */
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

  /* ── Frame ── */
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
    const demos = ["Включи музыку", "Как тебя зовут?", "Привет"];
    const chosen = demos[Math.floor(Math.random() * demos.length)];
    setTimeout(() => setVoiceText(chosen), 1600);
    setTimeout(() => {
      setVoiceText("");
      let reply = "Выполнено!";
      if (chosen.includes("музык"))  reply = "Сейчас включу что-нибудь приятное!";
      if (chosen.includes("зов"))    reply = `Меня зовут ${yukiName}!`;
      if (chosen.includes("Привет")) reply = "Привет-привет! Рада тебя слышать!";
      setMessages(p => [...p, { role: "user", text: chosen }, { role: "yuki", text: reply }]);
      setPanel("chat");
      speak(reply);
    }, 3200);
  };

  /* ── Chat send ── */
  const sendMsg = () => {
    const msg = chatInput.trim(); if (!msg) return;
    setChatInput("");
    setMessages(p => [...p, { role: "user", text: msg }]);
    const low = msg.toLowerCase();
    let reply = "Понял, выполняю!";
    if (low.includes("привет") || low.includes("хай"))    reply = "Привет! Как дела?";
    else if (low.includes("зов") || low.includes("имя"))  reply = `Меня зовут ${yukiName}!`;
    else if (low.includes("музык"))  reply = "Включаю что-нибудь расслабляющее.";
    else if (low.includes("спасиб")) reply = "Всегда пожалуйста!";
    else if (low.includes("пока"))   reply = "Пока-пока! Буду скучать.";
    setTimeout(() => { setMessages(p => [...p, { role: "yuki", text: reply }]); speak(reply); }, 600);
  };

  const currentFrame = FRAMES[mode][frameIdx] ?? FRAMES.idle[0];
  const charClass    = mode === "talking" ? "char-talk" : mode === "listening" ? "char-listen" : "char-idle";
  const widgetClass  = mode === "talking" ? "widget-talk" : mode === "listening" ? "widget-listen" : "widget-idle";
  const accent       = mode === "listening" ? "#4adc78" : mode === "talking" ? "#9b6dff" : "#4a8fff";
  const accentDim    = mode === "listening" ? "rgba(74,220,120," : mode === "talking" ? "rgba(155,109,255," : "rgba(74,143,255,";

  /* ── Widget dimensions ── */
  const W = 280;   // ширина треугольника
  const H = 260;   // высота

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-end relative overflow-hidden"
      style={{ userSelect: "none", background: `radial-gradient(ellipse at 50% 90%, ${accentDim}0.07) 0%, transparent 60%), hsl(222,25%,6%)` }}>

      {/* ambient dots */}
      <div className="fixed inset-0 pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="absolute rounded-full"
            style={{ width: 2, height: 2, background: accent, opacity: 0.25,
              left: `${12 + i * 18}%`, bottom: `${25 + (i % 3) * 12}%`,
              boxShadow: `0 0 6px 2px ${accentDim}0.5)`,
              animation: `float-idle ${3.2 + i * 0.6}s ease-in-out infinite`,
              animationDelay: `${i * 0.35}s` }} />
        ))}
      </div>

      {/* ════════════════════════════════════════════
          CHARACTER — вырастает из виджета
      ════════════════════════════════════════════ */}
      <div className="relative z-10 pointer-events-none" style={{ marginBottom: -55 }}>
        {/* fade lower body into widget */}
        <div className="absolute bottom-0 left-0 right-0 z-10" style={{
          height: "55%",
          background: `linear-gradient(to bottom,
            transparent 0%,
            transparent 20%,
            rgba(10,14,26,0.4) 55%,
            rgba(10,14,26,0.88) 80%,
            rgba(10,14,26,1.0) 100%)`,
        }} />
        <img src={currentFrame} alt={yukiName} className={charClass}
          style={{ height: 390, width: "auto", objectFit: "contain", display: "block", position: "relative", zIndex: 1 }} />
      </div>

      {/* ════════════════════════════════════════════
          BOTTOM ZONE: side panels + triangle widget
      ════════════════════════════════════════════ */}
      <div className="relative z-20 flex items-end justify-center w-full"
        style={{ paddingBottom: 24 }}>

        {/* ── LEFT PANEL — ЧАТ ── */}
        <div
          className="relative flex-shrink-0 overflow-hidden"
          style={{
            width: panel === "chat" ? 200 : 0,
            height: H,
            transition: "width 0.35s cubic-bezier(.22,1,.36,1)",
            marginRight: panel === "chat" ? 8 : 0,
            transition2: "margin 0.35s cubic-bezier(.22,1,.36,1)",
          } as React.CSSProperties}>
          {panel === "chat" && (
            <div className="absolute inset-0 flex flex-col panel-open"
              style={{
                background: "rgba(10,15,28,0.92)",
                border: `1px solid ${accentDim}0.2)`,
                borderRadius: "16px 4px 4px 16px",
                backdropFilter: "blur(20px)",
                width: 200,
              }}>
              {/* header */}
              <div className="flex items-center justify-between px-3 pt-3 pb-2 flex-shrink-0"
                style={{ borderBottom: `1px solid ${accentDim}0.1)` }}>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400" style={{ boxShadow: "0 0 5px #4ade80" }} />
                  <span className="text-xs font-semibold text-white/80">Чат</span>
                </div>
                <button onClick={() => setPanel(null)} className="text-white/25 hover:text-white/60 transition-colors">
                  <Icon name="X" size={12} />
                </button>
              </div>
              {/* messages */}
              <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5 min-h-0">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className="px-2 py-1.5 text-[11px] leading-relaxed max-w-[90%]"
                      style={{
                        borderRadius: m.role === "user" ? "10px 10px 2px 10px" : "10px 10px 10px 2px",
                        background: m.role === "user" ? `${accentDim}0.25)` : "rgba(255,255,255,0.06)",
                        border: m.role === "user" ? `1px solid ${accentDim}0.35)` : "1px solid rgba(255,255,255,0.06)",
                        color: m.role === "user" ? "#dde8ff" : "rgba(255,255,255,0.75)",
                        wordBreak: "break-word",
                      }}>
                      {m.text}
                    </div>
                  </div>
                ))}
                {mode === "talking" && (
                  <div className="flex justify-start">
                    <div className="px-2 py-1.5 flex gap-1 items-center"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px 10px 10px 2px" }}>
                      {[0,140,280].map(d => (
                        <div key={d} className="w-1 h-1 rounded-full bg-blue-400"
                          style={{ animation: "dot-bounce 0.9s ease infinite", animationDelay: `${d}ms` }} />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              {/* input */}
              <div className="px-2 pb-2 pt-1 flex-shrink-0" style={{ borderTop: `1px solid ${accentDim}0.1)` }}>
                <div className="flex gap-1">
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && sendMsg()}
                    placeholder="Написать..."
                    className="flex-1 px-2 py-1.5 text-[11px] text-white/90 placeholder-white/20 outline-none rounded-lg"
                    style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${accentDim}0.15)`, fontFamily: "'Golos Text',sans-serif", minWidth: 0 }} />
                  <button onClick={sendMsg}
                    className="px-2 py-1.5 rounded-lg flex items-center justify-center flex-shrink-0 transition-all hover:scale-105"
                    style={{ background: `${accentDim}0.18)`, border: `1px solid ${accentDim}0.3)`, color: accent }}>
                    <Icon name="Send" size={11} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── TRIANGLE WIDGET ── */}
        <div className={`relative flex-shrink-0 ${widgetClass}`} style={{ width: W, height: H }}>
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none"
            style={{ position: "absolute", top: 0, left: 0, overflow: "visible" }}>
            <defs>
              <linearGradient id="wg" x1={W/2} y1="0" x2={W/2} y2={H} gradientUnits="userSpaceOnUse">
                <stop offset="0%"   stopColor={mode === "listening" ? "#0c2018" : mode === "talking" ? "#160c28" : "#0c1422"} />
                <stop offset="100%" stopColor={mode === "listening" ? "#060f0c" : mode === "talking" ? "#0a0614" : "#060a14"} />
              </linearGradient>
              <linearGradient id="bg" x1="0" y1="0" x2={W} y2={H} gradientUnits="userSpaceOnUse">
                <stop offset="0%"   stopColor={accent} stopOpacity="0.85" />
                <stop offset="50%"  stopColor={accent} stopOpacity="0.3" />
                <stop offset="100%" stopColor={accent} stopOpacity="0.7" />
              </linearGradient>
              <clipPath id="tri">
                <path d={`M${W/2} ${H-8} Q${W/2-6} ${H} ${W/2-14} ${H-8} L12 18 Q8 8 20 6 L${W-20} 6 Q${W-8} 8 ${W-12} 18 Z`} />
              </clipPath>
            </defs>

            {/* Fill */}
            <path d={`M${W/2} ${H-8} Q${W/2-6} ${H} ${W/2-14} ${H-8} L12 18 Q8 8 20 6 L${W-20} 6 Q${W-8} 8 ${W-12} 18 Z`}
              fill="url(#wg)" stroke="url(#bg)" strokeWidth="1.5" />

            {/* Inner border */}
            <path d={`M${W/2} ${H-22} L22 24 Q18 16 28 14 L${W-28} 14 Q${W-18} 16 ${W-22} 24 Z`}
              fill="none" stroke={accent} strokeWidth="0.5" strokeOpacity="0.12" />

            {/* Scan line */}
            <g clipPath="url(#tri)">
              <line x1="30" y1="0" x2={W-30} y2="0" stroke={accent} strokeWidth="0.8" strokeOpacity="0.4"
                style={{ animation: "scan-line 3s linear infinite" }} />
            </g>

            {/* Top dots */}
            {[W/2-16, W/2, W/2+16].map((cx, i) => (
              <circle key={i} cx={cx} cy="14" r="2" fill={accent} opacity="0.45" />
            ))}

            {/* Divider line */}
            <line x1="60" y1="130" x2={W-60} y2="130"
              stroke={accent} strokeWidth="0.8" strokeOpacity="0.12" />
          </svg>

          {/* Status badge */}
          <div className="absolute flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{ top: 20, left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap",
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: accent, boxShadow: `0 0 5px ${accent}` }} />
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.38)", fontFamily: "'Golos Text',sans-serif" }}>
              {mode === "listening" ? "запись..." : mode === "talking" ? `${yukiName} говорит` : `${yukiName} · онлайн`}
            </span>
          </div>

          {/* ── LEFT BTN (Чат) ── */}
          <button
            onClick={() => setPanel(p => p === "chat" ? null : "chat")}
            className="tri-btn absolute flex flex-col items-center gap-1"
            style={{ left: 28, top: 60 }}>
            <div className="relative flex items-center justify-center rounded-xl transition-all"
              style={{
                width: 46, height: 46,
                background: panel === "chat" ? `${accentDim}0.22)` : "rgba(255,255,255,0.05)",
                border: `1px solid ${panel === "chat" ? `${accentDim}0.45)` : "rgba(255,255,255,0.1)"}`,
                boxShadow: panel === "chat" ? `0 0 14px ${accentDim}0.3)` : "none",
                transform: panel === "chat" ? "scale(1.08)" : "scale(1)",
              }}>
              <Icon name="MessageCircle" size={18} style={{ color: panel === "chat" ? accent : "rgba(255,255,255,0.4)" }} />
            </div>
            <span style={{ fontSize: 9, color: panel === "chat" ? accent : "rgba(255,255,255,0.3)", fontFamily: "'Golos Text',sans-serif" }}>
              Чат
            </span>
          </button>

          {/* ── RIGHT BTN (Настройки) ── */}
          <button
            onClick={() => setPanel(p => p === "settings" ? null : "settings")}
            className="tri-btn absolute flex flex-col items-center gap-1"
            style={{ right: 28, top: 60 }}>
            <div className="relative flex items-center justify-center rounded-xl transition-all"
              style={{
                width: 46, height: 46,
                background: panel === "settings" ? `${accentDim}0.22)` : "rgba(255,255,255,0.05)",
                border: `1px solid ${panel === "settings" ? `${accentDim}0.45)` : "rgba(255,255,255,0.1)"}`,
                boxShadow: panel === "settings" ? `0 0 14px ${accentDim}0.3)` : "none",
                transform: panel === "settings" ? "scale(1.08)" : "scale(1)",
              }}>
              <Icon name="Settings" size={18} style={{ color: panel === "settings" ? accent : "rgba(255,255,255,0.4)" }} />
            </div>
            <span style={{ fontSize: 9, color: panel === "settings" ? accent : "rgba(255,255,255,0.3)", fontFamily: "'Golos Text',sans-serif" }}>
              Настройки
            </span>
          </button>

          {/* ── CENTER BTN (Микрофон) ── */}
          <div className="absolute flex flex-col items-center gap-1"
            style={{ bottom: 24, left: "50%", transform: "translateX(-50%)" }}>

            {/* Pulse rings */}
            {(mode === "listening" || mode === "talking") && (
              <div className="absolute pointer-events-none" style={{ inset: -6 }}>
                <div className="ring-out absolute inset-0 rounded-full"
                  style={{ border: `1.5px solid ${accentDim}0.6)` }} />
                <div className="ring-out-2 absolute inset-0 rounded-full"
                  style={{ border: `1px solid ${accentDim}0.35)` }} />
              </div>
            )}

            <button onClick={handleMic}
              className="tri-btn relative flex items-center justify-center rounded-2xl transition-all"
              style={{
                width: 60, height: 60,
                background: mode !== "idle" ? `${accentDim}0.2)` : "rgba(255,255,255,0.05)",
                border: `1.5px solid ${mode !== "idle" ? `${accentDim}0.55)` : "rgba(255,255,255,0.12)"}`,
                boxShadow: mode !== "idle" ? `0 0 20px ${accentDim}0.35), 0 0 40px ${accentDim}0.15)` : "none",
              }}>
              {mode === "listening" ? (
                <div className="flex items-end gap-0.5" style={{ color: accent }}>
                  {[1,2,3,4,5].map(i => <div key={i} className="wave-bar" />)}
                </div>
              ) : mode === "talking" ? (
                <div className="flex items-end gap-0.5" style={{ color: accent }}>
                  {[1,2,3,4,5].map(i => <div key={i} className="wave-bar" />)}
                </div>
              ) : (
                <Icon name="Mic" size={24} style={{ color: accent }} />
              )}
            </button>
            <span style={{ fontSize: 9, color: mode !== "idle" ? accent : "rgba(255,255,255,0.3)", fontFamily: "'Golos Text',sans-serif" }}>
              {mode === "listening" ? "Слушаю" : mode === "talking" ? "Говорю" : "Голос"}
            </span>
          </div>

          {/* Voice text bubble */}
          {voiceText && (
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full panel-open whitespace-nowrap"
              style={{ background: `${accentDim}0.12)`, border: `1px solid ${accentDim}0.3)` }}>
              <span style={{ fontSize: 11, color: accent, fontFamily: "'Golos Text',sans-serif" }}>{voiceText}</span>
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL — НАСТРОЙКИ ── */}
        <div
          className="relative flex-shrink-0 overflow-hidden"
          style={{
            width: panel === "settings" ? 200 : 0,
            height: H,
            transition: "width 0.35s cubic-bezier(.22,1,.36,1)",
            marginLeft: panel === "settings" ? 8 : 0,
          } as React.CSSProperties}>
          {panel === "settings" && (
            <div className="absolute inset-0 flex flex-col panel-open overflow-y-auto"
              style={{
                background: "rgba(10,15,28,0.92)",
                border: `1px solid ${accentDim}0.2)`,
                borderRadius: "4px 16px 16px 4px",
                backdropFilter: "blur(20px)",
                width: 200,
              }}>
              <div className="flex items-center justify-between px-3 pt-3 pb-2 flex-shrink-0"
                style={{ borderBottom: `1px solid ${accentDim}0.1)` }}>
                <span className="text-xs font-semibold text-white/80">Настройки</span>
                <button onClick={() => setPanel(null)} className="text-white/25 hover:text-white/60 transition-colors">
                  <Icon name="X" size={12} />
                </button>
              </div>

              <div className="px-3 py-3 space-y-3 flex-1">
                {/* Имя */}
                <div>
                  <label className="text-[10px] text-white/35 mb-1 block">Имя ассистента</label>
                  <input value={yukiName} onChange={e => setYukiName(e.target.value)}
                    className="w-full px-2 py-1.5 text-[11px] text-white/90 outline-none rounded-lg"
                    style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${accentDim}0.18)`, fontFamily: "'Golos Text',sans-serif" }} />
                </div>

                {/* Голос on/off */}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-white/55">Голос</span>
                  <button onClick={() => { setVoiceEnabled(v => !v); window.speechSynthesis.cancel(); }}
                    className="relative transition-all flex-shrink-0"
                    style={{ width: 34, height: 18, borderRadius: 9, background: voiceEnabled ? `${accentDim}0.65)` : "rgba(255,255,255,0.1)" }}>
                    <div className="absolute top-1 w-3.5 h-3.5 rounded-full bg-white shadow transition-all"
                      style={{ left: voiceEnabled ? 17 : 2 }} />
                  </button>
                </div>

                {/* Pitch */}
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-[10px] text-white/35">Высота</label>
                    <span className="text-[10px] text-white/25">{pitch.toFixed(1)}</span>
                  </div>
                  <input type="range" min={0.5} max={2} step={0.1} value={pitch}
                    onChange={e => setPitch(+e.target.value)}
                    className="w-full h-0.5 cursor-pointer" style={{ accentColor: accent }} />
                </div>

                {/* Rate */}
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-[10px] text-white/35">Скорость</label>
                    <span className="text-[10px] text-white/25">{rate.toFixed(2)}</span>
                  </div>
                  <input type="range" min={0.5} max={2} step={0.05} value={rate}
                    onChange={e => setRate(+e.target.value)}
                    className="w-full h-0.5 cursor-pointer" style={{ accentColor: accent }} />
                </div>

                {/* Test */}
                <button onClick={() => speak(`Привет! Меня зовут ${yukiName}.`)}
                  className="w-full py-1.5 rounded-lg text-[11px] font-medium transition-all hover:scale-[1.02] flex items-center justify-center gap-1.5"
                  style={{ background: `${accentDim}0.14)`, border: `1px solid ${accentDim}0.28)`, color: accent }}>
                  <Icon name="Volume2" size={12} />
                  Тест голоса
                </button>
              </div>
            </div>
          )}
        </div>

      </div>{/* end bottom zone */}
    </div>
  );
}
