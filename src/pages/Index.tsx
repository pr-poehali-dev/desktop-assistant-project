import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";

/* ─── Assets ─── */
const CHAR_URL = "https://cdn.poehali.dev/projects/a04100fc-3399-4f33-a69e-ae5981f2a1d2/bucket/b1bdc2b1-0446-4123-9e47-9e4ee7f16554.png";

const FRAMES: Record<string, string[]> = {
  idle:     [CHAR_URL],
  talking:  [CHAR_URL],
  listening:[CHAR_URL],
};

const INIT_MESSAGES = [
  { role: "yuki", text: "Привет! Я Юки. Чем могу помочь?" },
];

/* ─── Types ─── */
type Mode = "idle" | "listening" | "talking";
type Panel = "chat" | "settings" | null;

/* ─── Triangle SVG button ─── */
function TriBtn({
  direction, onClick, active, color, children, badge,
}: {
  direction: "left" | "right" | "down";
  onClick: () => void;
  active?: boolean;
  color: string;
  children: React.ReactNode;
  badge?: number;
}) {
  // Перевёрнутый треугольник с повёрнутыми вариантами
  const rotate = direction === "left" ? "rotate(90deg)" : direction === "right" ? "rotate(-90deg)" : "rotate(0deg)";
  const SIZE = direction === "down" ? 72 : 58;

  return (
    <div className="tri-btn relative flex flex-col items-center" onClick={onClick} style={{ width: SIZE }}>
      <svg width={SIZE} height={SIZE} viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg"
        style={{ transform: rotate }}>
        {/* Тень/свечение */}
        <filter id={`glow-${direction}`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation={active ? "5" : "3"} result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        {/* Фон треугольника */}
        <path d="M36 8 L64 58 Q36 68 8 58 Z"
          fill={active ? `${color}33` : `${color}14`}
          stroke={color}
          strokeWidth={active ? "1.8" : "1"}
          strokeLinejoin="round"
          strokeOpacity={active ? 1 : 0.55}
          filter={`url(#glow-${direction})`}
        />
        {/* Внутреннее свечение при active */}
        {active && (
          <path d="M36 16 L58 56 Q36 64 14 56 Z"
            fill={`${color}18`}
            stroke={color}
            strokeWidth="0.5"
            strokeOpacity="0.4"
          />
        )}
      </svg>
      {/* Иконка поверх треугольника */}
      <div className="absolute inset-0 flex items-center justify-center"
        style={{ paddingTop: direction === "down" ? 14 : 10 }}>
        {children}
      </div>
      {/* Бейдж */}
      {badge != null && badge > 0 && (
        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-white"
          style={{ fontSize: 9, background: color, border: "1.5px solid rgba(0,0,0,0.6)" }}>
          {badge}
        </div>
      )}
    </div>
  );
}

/* ─── Main ─── */
export default function Index() {
  const [mode, setMode] = useState<Mode>("idle");
  const [panel, setPanel] = useState<Panel>(null);
  const [messages, setMessages] = useState(INIT_MESSAGES);
  const [chatInput, setChatInput] = useState("");
  const [frameIdx, setFrameIdx] = useState(0);
  const [voiceText, setVoiceText] = useState("");
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [yukiName, setYukiName] = useState("Юки");
  const [pitch, setPitch] = useState(1.4);
  const [rate, setRate] = useState(1.05);
  const chatEndRef = useRef<HTMLDivElement>(null);

  /* ── Voice synthesis ── */
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
    utter.lang = "ru-RU";
    utter.pitch = pitch;
    utter.rate = rate;
    utter.volume = 1;
    const voices = window.speechSynthesis.getVoices();
    const ru = voices.find(v => v.lang.startsWith("ru") && /female|woman/i.test(v.name))
            ?? voices.find(v => v.lang.startsWith("ru"));
    if (ru) utter.voice = ru;
    utter.onstart = () => setMode("talking");
    utter.onend   = () => setMode("idle");
    utter.onerror = () => setMode("idle");
    window.speechSynthesis.speak(utter);
  };

  /* ── Frame animation ── */
  useEffect(() => {
    const frames = FRAMES[mode];
    if (frames.length <= 1) { setFrameIdx(0); return; }
    const ms = mode === "talking" ? 110 : mode === "listening" ? 170 : 400;
    const t = setInterval(() => setFrameIdx(i => (i + 1) % frames.length), ms);
    return () => clearInterval(t);
  }, [mode]);

  /* ── Scroll chat ── */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── Mic button ── */
  const handleMic = () => {
    if (mode === "listening") {
      setMode("idle");
      setVoiceText("");
      return;
    }
    setMode("listening");
    setVoiceText("Слушаю...");
    const demos = ["Включи музыку", "Как тебя зовут?", "Привет"];
    const chosen = demos[Math.floor(Math.random() * demos.length)];
    setTimeout(() => setVoiceText(chosen), 1600);
    setTimeout(() => {
      setVoiceText("");
      let reply = "Выполнено!";
      if (chosen.includes("музык")) reply = "Сейчас включу что-нибудь приятное!";
      if (chosen.includes("зов"))   reply = `Меня зовут ${yukiName}, я твой голосовой помощник!`;
      if (chosen.includes("Привет")) reply = "Привет-привет! Рада тебя слышать!";
      setMessages(p => [...p, { role: "user", text: chosen }, { role: "yuki", text: reply }]);
      setPanel("chat");
      speak(reply);
    }, 3200);
  };

  /* ── Send text message ── */
  const sendMsg = () => {
    const msg = chatInput.trim();
    if (!msg) return;
    setChatInput("");
    setMessages(p => [...p, { role: "user", text: msg }]);
    const low = msg.toLowerCase();
    let reply = "Понял, выполняю!";
    if (low.includes("привет") || low.includes("хай")) reply = "Привет! Как дела?";
    else if (low.includes("имя") || low.includes("зов")) reply = `Меня зовут ${yukiName}!`;
    else if (low.includes("музык")) reply = "Отличный выбор! Включаю что-нибудь расслабляющее.";
    else if (low.includes("спасиб")) reply = "Всегда пожалуйста! Обращайся.";
    else if (low.includes("пока") || low.includes("до свид")) reply = "Пока-пока! Буду скучать.";
    setTimeout(() => {
      setMessages(p => [...p, { role: "yuki", text: reply }]);
      speak(reply);
    }, 600);
  };

  const currentFrame = FRAMES[mode][frameIdx] ?? FRAMES.idle[0];
  const charClass = mode === "talking" ? "char-talk" : mode === "listening" ? "char-listen" : "char-idle";
  const widgetClass = mode === "talking" ? "widget-talk" : mode === "listening" ? "widget-listen" : "widget-idle";
  const micColor = mode === "listening" ? "#4adc78" : mode === "talking" ? "#9b6dff" : "#4a8fff";

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-end relative overflow-hidden"
      style={{ userSelect: "none", background: "radial-gradient(ellipse at 50% 80%, rgba(74,143,255,0.07) 0%, transparent 65%), hsl(222,25%,6%)" }}>

      {/* ── Ambient particles ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="absolute rounded-full opacity-20"
            style={{
              width: 2, height: 2,
              background: "#4a8fff",
              left: `${15 + i * 14}%`,
              bottom: `${20 + (i % 3) * 15}%`,
              boxShadow: "0 0 6px 2px rgba(74,143,255,0.6)",
              animation: `float-idle ${3 + i * 0.7}s ease-in-out infinite`,
              animationDelay: `${i * 0.4}s`,
            }} />
        ))}
      </div>

      {/* ── Panel overlay (chat / settings) ── */}
      {panel && (
        <div className="fixed inset-0 z-20 flex items-end justify-center pb-[340px] px-4">
          <div className="glass w-full max-w-[360px] panel-open shadow-2xl"
            style={{ boxShadow: "0 8px 60px rgba(74,143,255,0.2)" }}>

            {/* ── CHAT ── */}
            {panel === "chat" && (
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400" style={{ boxShadow: "0 0 6px #4ade80" }} />
                    <span className="text-sm font-semibold text-white/90">Чат с {yukiName}</span>
                  </div>
                  <button onClick={() => setPanel(null)} className="text-white/30 hover:text-white/70 transition-colors">
                    <Icon name="X" size={15} />
                  </button>
                </div>

                <div className="space-y-2 max-h-44 overflow-y-auto pr-0.5 mb-3">
                  {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className="px-3 py-2 text-xs leading-relaxed max-w-[82%]"
                        style={{
                          borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                          background: m.role === "user" ? "rgba(74,143,255,0.28)" : "rgba(255,255,255,0.07)",
                          border: m.role === "user" ? "1px solid rgba(74,143,255,0.4)" : "1px solid rgba(255,255,255,0.07)",
                          color: m.role === "user" ? "#e8f0ff" : "rgba(255,255,255,0.82)",
                        }}>
                        {m.text}
                      </div>
                    </div>
                  ))}
                  {mode === "talking" && (
                    <div className="flex justify-start">
                      <div className="px-3 py-2 flex gap-1 items-end"
                        style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px 14px 14px 4px" }}>
                        {[0, 160, 320].map(d => (
                          <div key={d} className="w-1.5 h-1.5 rounded-full bg-blue-400"
                            style={{ animation: `dot-bounce 0.9s ease infinite`, animationDelay: `${d}ms` }} />
                        ))}
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div className="flex gap-2">
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && sendMsg()}
                    placeholder="Напиши что-нибудь..."
                    className="flex-1 px-3 py-2 text-xs text-white/90 placeholder-white/25 outline-none rounded-xl"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(74,143,255,0.2)", fontFamily: "'Golos Text',sans-serif" }} />
                  <button onClick={sendMsg}
                    className="px-3 py-2 rounded-xl flex items-center justify-center transition-all hover:scale-105"
                    style={{ background: "rgba(74,143,255,0.2)", border: "1px solid rgba(74,143,255,0.35)", color: "#7ab5ff" }}>
                    <Icon name="Send" size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* ── SETTINGS ── */}
            {panel === "settings" && (
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-white/90">Настройки</span>
                  <button onClick={() => setPanel(null)} className="text-white/30 hover:text-white/70 transition-colors">
                    <Icon name="X" size={15} />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Имя */}
                  <div>
                    <label className="text-xs text-white/40 mb-1.5 block">Имя ассистента</label>
                    <input value={yukiName} onChange={e => setYukiName(e.target.value)}
                      className="w-full px-3 py-2 text-xs text-white/90 outline-none rounded-xl"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(74,143,255,0.2)", fontFamily: "'Golos Text',sans-serif" }} />
                  </div>

                  {/* Голос */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/60">Голос {yukiName}</span>
                    <button onClick={() => { setVoiceEnabled(v => !v); window.speechSynthesis.cancel(); }}
                      className="relative transition-all"
                      style={{ width: 40, height: 20, borderRadius: 10, background: voiceEnabled ? "rgba(74,143,255,0.7)" : "rgba(255,255,255,0.1)" }}>
                      <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm"
                        style={{ left: voiceEnabled ? 21 : 2 }} />
                    </button>
                  </div>

                  {/* Высота голоса */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-xs text-white/40">Высота голоса</label>
                      <span className="text-xs text-white/30">{pitch.toFixed(1)}</span>
                    </div>
                    <input type="range" min={0.5} max={2} step={0.1} value={pitch}
                      onChange={e => setPitch(+e.target.value)}
                      className="w-full h-1 accent-blue-400 cursor-pointer" />
                  </div>

                  {/* Скорость речи */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-xs text-white/40">Скорость речи</label>
                      <span className="text-xs text-white/30">{rate.toFixed(2)}</span>
                    </div>
                    <input type="range" min={0.5} max={2} step={0.05} value={rate}
                      onChange={e => setRate(+e.target.value)}
                      className="w-full h-1 accent-blue-400 cursor-pointer" />
                  </div>

                  {/* Тест голоса */}
                  <button onClick={() => speak(`Привет! Меня зовут ${yukiName}. Как дела?`)}
                    className="w-full py-2 rounded-xl text-xs font-medium transition-all hover:scale-[1.02]"
                    style={{ background: "rgba(74,143,255,0.15)", border: "1px solid rgba(74,143,255,0.3)", color: "#7ab5ff" }}>
                    Тест голоса
                  </button>

                  <p className="text-xs text-white/20 leading-relaxed pt-1 border-t border-white/5">
                    Команды: «включи музыку», «как тебя зовут», «привет»
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Glow platform behind character ── */}
      <div className="absolute pointer-events-none z-0"
        style={{
          bottom: 240,
          left: "50%",
          transform: "translateX(-50%)",
          width: 300,
          height: 160,
          background: `radial-gradient(ellipse at center bottom, ${
            mode === "listening" ? "rgba(74,220,120,0.22)" :
            mode === "talking"   ? "rgba(155,109,255,0.22)" :
                                   "rgba(74,143,255,0.18)"
          } 0%, transparent 70%)`,
          filter: "blur(20px)",
          transition: "background 0.5s ease",
        }} />

      {/* ── Character ── */}
      <div className="relative z-10 pointer-events-none"
        style={{ marginBottom: -60 }}>

        {/* Fade-to-widget gradient: нижняя часть персонажа уходит в виджет */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none"
          style={{
            height: "52%",
            background: `linear-gradient(to bottom,
              transparent 0%,
              rgba(12,16,30,0.0) 30%,
              rgba(12,16,30,0.55) 65%,
              rgba(12,16,30,0.92) 85%,
              rgba(12,16,30,1.0) 100%
            )`,
            zIndex: 2,
          }} />

        <img
          src={currentFrame}
          alt={yukiName}
          className={charClass}
          style={{
            height: 400,
            width: "auto",
            objectFit: "contain",
            display: "block",
            position: "relative",
            zIndex: 1,
          }}
        />
      </div>

      {/* ── Triangle widget ── */}
      <div className="relative z-20 flex flex-col items-center w-full"
        style={{ marginBottom: 0 }}>

        {/* Voice indicator bubble */}
        {(mode === "listening" || voiceText) && (
          <div className="mb-3 px-4 py-2 rounded-full flex items-center gap-2.5"
            style={{ background: "rgba(74,220,120,0.1)", border: "1px solid rgba(74,220,120,0.3)" }}>
            <div className="flex items-end gap-0.5 text-green-400">
              {[1,2,3,4,5].map(i => <div key={i} className="wave-bar" />)}
            </div>
            <span className="text-xs text-green-300">{voiceText || "Слушаю..."}</span>
          </div>
        )}

        {/* Main triangle widget SVG + buttons */}
        <div className={`relative ${widgetClass}`} style={{ width: 340, height: 310 }}>

          {/* SVG — перевёрнутый треугольник */}
          <svg width="340" height="310" viewBox="0 0 340 310" fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ position: "absolute", top: 0, left: 0 }}>
            <defs>
              <linearGradient id="widget-grad" x1="170" y1="0" x2="170" y2="310" gradientUnits="userSpaceOnUse">
                <stop offset="0%"   stopColor={mode === "listening" ? "#0e2a1a" : mode === "talking" ? "#1a0e2e" : "#0c1428"} />
                <stop offset="100%" stopColor={mode === "listening" ? "#081510" : mode === "talking" ? "#0e0818" : "#060c18"} />
              </linearGradient>
              <linearGradient id="border-grad" x1="0" y1="0" x2="340" y2="310" gradientUnits="userSpaceOnUse">
                <stop offset="0%"   stopColor={mode === "listening" ? "#4adc78" : mode === "talking" ? "#9b6dff" : "#4a8fff"} stopOpacity="0.8" />
                <stop offset="50%"  stopColor={mode === "listening" ? "#4adc78" : mode === "talking" ? "#9b6dff" : "#4a8fff"} stopOpacity="0.3" />
                <stop offset="100%" stopColor={mode === "listening" ? "#4adc78" : mode === "talking" ? "#9b6dff" : "#4a8fff"} stopOpacity="0.6" />
              </linearGradient>
              <filter id="inner-glow">
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            {/* Основной треугольник */}
            <path d="M170 298 Q162 305 154 298 L18 42 Q14 32 24 28 L316 28 Q326 32 322 42 Z"
              fill="url(#widget-grad)"
              stroke="url(#border-grad)"
              strokeWidth="1.5"
              rx="12"
            />

            {/* Внутренняя линия-кант */}
            <path d="M170 282 Q165 288 160 282 L34 52 Q31 44 39 41 L301 41 Q309 44 306 52 Z"
              fill="none"
              stroke={mode === "listening" ? "rgba(74,220,120,0.08)" : mode === "talking" ? "rgba(155,109,255,0.08)" : "rgba(74,143,255,0.08)"}
              strokeWidth="1"
            />

            {/* Scan line */}
            <clipPath id="tri-clip">
              <path d="M170 298 L18 42 Q14 32 24 28 L316 28 Q326 32 322 42 Z" />
            </clipPath>
            <g clipPath="url(#tri-clip)">
              <line x1="60" y1="0" x2="280" y2="0" stroke={mode === "listening" ? "rgba(74,220,120,0.4)" : "rgba(74,143,255,0.4)"} strokeWidth="1"
                style={{ animation: "scan-line 3.5s linear infinite" }} />
            </g>

            {/* Горизонтальная разделительная линия */}
            <line x1="85" y1="145" x2="255" y2="145"
              stroke={mode === "listening" ? "rgba(74,220,120,0.15)" : mode === "talking" ? "rgba(155,109,255,0.15)" : "rgba(74,143,255,0.15)"}
              strokeWidth="1" />

            {/* Декоративные точки */}
            {[
              { cx: 170, cy: 35 },
              { cx: 155, cy: 35 },
              { cx: 185, cy: 35 },
            ].map((p, i) => (
              <circle key={i} cx={p.cx} cy={p.cy} r="2"
                fill={mode === "listening" ? "#4adc78" : mode === "talking" ? "#9b6dff" : "#4a8fff"}
                opacity={0.5} />
            ))}
          </svg>

          {/* ── Три кнопки внутри треугольника ── */}

          {/* Левая (Чат) */}
          <div className="absolute" style={{ left: 36, top: 60 }}>
            <TriBtn direction="left" onClick={() => setPanel(p => p === "chat" ? null : "chat")}
              active={panel === "chat"} color="#4a8fff">
              <Icon name="MessageCircle" size={18}
                className={panel === "chat" ? "text-blue-300" : "text-blue-400/60"} />
            </TriBtn>
            <div className="text-center mt-1" style={{ fontSize: 9, color: "rgba(255,255,255,0.35)" }}>Чат</div>
          </div>

          {/* Правая (Настройки) */}
          <div className="absolute" style={{ right: 36, top: 60 }}>
            <TriBtn direction="right" onClick={() => setPanel(p => p === "settings" ? null : "settings")}
              active={panel === "settings"} color="#4a8fff">
              <Icon name="Settings" size={18}
                className={panel === "settings" ? "text-blue-300" : "text-blue-400/60"} />
            </TriBtn>
            <div className="text-center mt-1" style={{ fontSize: 9, color: "rgba(255,255,255,0.35)" }}>Настройки</div>
          </div>

          {/* Нижняя (Микрофон — главная) */}
          <div className="absolute flex flex-col items-center" style={{ bottom: 28, left: "50%", transform: "translateX(-50%)" }}>
            {/* Пульсирующие кольца при прослушивании */}
            {mode === "listening" && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ top: -8 }}>
                <div className="ring-out absolute rounded-full"
                  style={{ width: 80, height: 80, border: "1.5px solid rgba(74,220,120,0.6)" }} />
                <div className="ring-out-2 absolute rounded-full"
                  style={{ width: 80, height: 80, border: "1px solid rgba(74,220,120,0.4)" }} />
              </div>
            )}
            {mode === "talking" && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ top: -8 }}>
                <div className="ring-out absolute rounded-full"
                  style={{ width: 80, height: 80, border: "1.5px solid rgba(155,109,255,0.6)" }} />
              </div>
            )}

            <TriBtn direction="down" onClick={handleMic}
              active={mode === "listening" || mode === "talking"}
              color={micColor}>
              {/* Иконка меняется по состоянию */}
              {mode === "listening" ? (
                <div className="flex items-end gap-0.5 text-green-400">
                  {[1,2,3,4,5].map(i => <div key={i} className="wave-bar" style={{ height: [12,18,14,18,12][i-1] }} />)}
                </div>
              ) : mode === "talking" ? (
                <div className="flex items-end gap-0.5 text-purple-300">
                  {[1,2,3,4,5].map(i => <div key={i} className="wave-bar" style={{ height: [10,16,20,16,10][i-1] }} />)}
                </div>
              ) : (
                <Icon name="Mic" size={22} style={{ color: micColor }} />
              )}
            </TriBtn>

            <div className="text-center mt-1" style={{ fontSize: 9, color: "rgba(255,255,255,0.35)" }}>
              {mode === "listening" ? "Слушаю" : mode === "talking" ? "Говорю" : "Голос"}
            </div>
          </div>

          {/* Статус-строка внутри виджета */}
          <div className="absolute flex items-center gap-2 px-3 py-1 rounded-full"
            style={{
              top: 38, left: "50%", transform: "translateX(-50%)",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              whiteSpace: "nowrap",
            }}>
            <div className="w-1.5 h-1.5 rounded-full"
              style={{
                background: mode === "listening" ? "#4adc78" : mode === "talking" ? "#9b6dff" : "#4a8fff",
                boxShadow: `0 0 6px ${mode === "listening" ? "#4adc78" : mode === "talking" ? "#9b6dff" : "#4a8fff"}`,
              }} />
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", fontFamily: "'Golos Text',sans-serif" }}>
              {mode === "listening" ? "запись..." : mode === "talking" ? `${yukiName} говорит` : `${yukiName} · онлайн`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
