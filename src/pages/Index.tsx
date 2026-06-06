import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";

// Кадры анимации — добавляй новые картинки сюда для покадровой анимации
const FRAMES: Record<string, string[]> = {
  idle: [
    "https://cdn.poehali.dev/projects/a04100fc-3399-4f33-a69e-ae5981f2a1d2/bucket/b1bdc2b1-0446-4123-9e47-9e4ee7f16554.png",
  ],
  talking: [
    "https://cdn.poehali.dev/projects/a04100fc-3399-4f33-a69e-ae5981f2a1d2/bucket/b1bdc2b1-0446-4123-9e47-9e4ee7f16554.png",
  ],
  listening: [
    "https://cdn.poehali.dev/projects/a04100fc-3399-4f33-a69e-ae5981f2a1d2/bucket/b1bdc2b1-0446-4123-9e47-9e4ee7f16554.png",
  ],
};

const TRACKS = [
  { id: 1, title: "Midnight Echo", artist: "Yuki Mix", duration: "3:42" },
  { id: 2, title: "Blue Horizon", artist: "Lo-fi Dreams", duration: "4:15" },
  { id: 3, title: "Soft Static", artist: "Night Waves", duration: "2:58" },
  { id: 4, title: "Crystal Rain", artist: "Ambient Sky", duration: "5:03" },
];

const INITIAL_NOTIFICATIONS = [
  { id: 1, type: "discord", icon: "MessageCircle", user: "Sakura#0421", text: "Привет! Когда онлайн?", time: "только что", color: "#5865f2" },
  { id: 2, type: "telegram", icon: "Send", user: "@moonlight", text: "Документ готов к проверке", time: "2 мин", color: "#26a5e4" },
  { id: 3, type: "discord", icon: "MessageCircle", user: "Artem#7731", text: "Ивент в 20:00, не забудь!", time: "5 мин", color: "#5865f2" },
  { id: 4, type: "telegram", icon: "Send", user: "@tech_news", text: "Новый релиз: GPT-6 вышел!", time: "12 мин", color: "#26a5e4" },
];

const INITIAL_MESSAGES = [
  { role: "yuki", text: "Привет! Я Юки, твой ассистент. Чем могу помочь? 💙" },
  { role: "user", text: "Включи музыку" },
  { role: "yuki", text: "Конечно! Запускаю плейлист ✨ Наслаждайся!" },
];

type Panel = "chat" | "player" | "notifications" | "settings" | null;

export default function Index() {
  const [activePanel, setActivePanel] = useState<Panel>(null);
  const [isListening, setIsListening] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [progress, setProgress] = useState(35);
  const [volume, setVolume] = useState(70);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [unreadCount, setUnreadCount] = useState(INITIAL_NOTIFICATIONS.length);
  const [voiceText, setVoiceText] = useState("");
  const [autoPlay, setAutoPlay] = useState(true);
  const [discordEnabled, setDiscordEnabled] = useState(true);
  const [telegramEnabled, setTelegramEnabled] = useState(true);
  const [yukiName, setYukiName] = useState("Юки");
  const [frameIndex, setFrameIndex] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Покадровая анимация — переключает кадры с нужной скоростью
  useEffect(() => {
    const state = isTalking ? "talking" : isListening ? "listening" : "idle";
    const frames = FRAMES[state];
    if (frames.length <= 1) { setFrameIndex(0); return; }
    const fps = isTalking ? 120 : isListening ? 180 : 400;
    const t = setInterval(() => setFrameIndex(i => (i + 1) % frames.length), fps);
    return () => clearInterval(t);
  }, [isTalking, isListening]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!isPlaying) return;
    const t = setInterval(() => setProgress(p => p >= 100 ? 0 : p + 0.3), 300);
    return () => clearInterval(t);
  }, [isPlaying]);

  const togglePanel = (panel: Panel) => {
    setActivePanel(prev => prev === panel ? null : panel);
    if (panel === "notifications") setUnreadCount(0);
  };

  const handleVoice = () => {
    if (isListening) {
      setIsListening(false);
      setVoiceText("");
      return;
    }
    setIsListening(true);
    setVoiceText("Слушаю...");
    const phrases = ["Включи музыку", "Покажи уведомления", "Тихий режим"];
    const chosen = phrases[Math.floor(Math.random() * phrases.length)];
    setTimeout(() => setVoiceText(chosen), 1500);
    setTimeout(() => {
      setIsListening(false);
      setIsTalking(true);
      setVoiceText("");
      let reply = "Выполнено!";
      if (chosen === "Включи музыку") { reply = "Запускаю плейлист! 🎵"; setIsPlaying(true); setActivePanel("player"); }
      if (chosen === "Покажи уведомления") { reply = "Открываю уведомления!"; setActivePanel("notifications"); setUnreadCount(0); }
      if (chosen === "Тихий режим") { reply = "Включаю тихий режим..."; setVolume(0); }
      setMessages(prev => [...prev, { role: "user", text: chosen }, { role: "yuki", text: reply }]);
      setTimeout(() => setIsTalking(false), 2500);
    }, 3000);
  };

  const sendMessage = () => {
    if (!chatInput.trim()) return;
    const msg = chatInput.trim();
    setChatInput("");
    setMessages(prev => [...prev, { role: "user", text: msg }]);
    setIsTalking(true);
    const lower = msg.toLowerCase();
    let reply = "Понял! Выполняю ✨";
    if (lower.includes("музык") || lower.includes("трек")) { reply = "Включаю музыку! 🎵"; setIsPlaying(true); setActivePanel("player"); }
    else if (lower.includes("стоп") || lower.includes("пауза")) { reply = "Останавливаю воспроизведение."; setIsPlaying(false); }
    else if (lower.includes("уведомлен")) { reply = "Показываю уведомления!"; setActivePanel("notifications"); setUnreadCount(0); }
    else if (lower.includes("привет") || lower.includes("хай")) reply = "Привет-привет! Как дела? 😊";
    else if (lower.includes("как тебя зов")) reply = `Меня зовут ${yukiName}! Я твой помощник 💙`;
    setTimeout(() => {
      setMessages(prev => [...prev, { role: "yuki", text: reply }]);
      setIsTalking(false);
    }, 800);
  };

  const animState = isTalking ? "talking" : isListening ? "listening" : "idle";
  const currentFrame = FRAMES[animState][frameIndex] ?? FRAMES.idle[0];
  const charClass = `yuki-character${isTalking ? " talking" : isListening ? " listening" : ""}`;

  return (
    <div className="min-h-screen flex items-end justify-center pb-0 relative overflow-hidden" style={{ userSelect: "none" }}>
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(74,144,226,0.12) 0%, transparent 70%)", filter: "blur(40px)" }} />
        <div className="absolute top-1/3 left-1/4 w-[200px] h-[200px] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(120,80,200,0.07) 0%, transparent 70%)", filter: "blur(60px)" }} />
      </div>

      <div className="relative flex flex-col items-center w-full max-w-[420px]">

        {/* Panels */}
        <div className="w-full px-4 mb-2 space-y-2">

          {/* CHAT */}
          {activePanel === "chat" && (
            <div className="glass-panel p-4 panel-enter">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400" style={{ boxShadow: "0 0 8px #4ade80" }} />
                  <span className="text-sm font-semibold text-white/90">Чат с {yukiName}</span>
                </div>
                <button onClick={() => setActivePanel(null)} className="text-white/30 hover:text-white/60 transition-colors">
                  <Icon name="X" size={14} />
                </button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className="px-3 py-2 rounded-2xl text-xs max-w-[80%] leading-relaxed"
                      style={{
                        borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                        background: m.role === "user" ? "rgba(74,144,226,0.35)" : "rgba(255,255,255,0.08)",
                        border: m.role === "user" ? "1px solid rgba(74,144,226,0.4)" : "1px solid rgba(255,255,255,0.08)",
                        color: m.role === "user" ? "#fff" : "rgba(255,255,255,0.85)",
                      }}>
                      {m.text}
                    </div>
                  </div>
                ))}
                {isTalking && (
                  <div className="flex justify-start">
                    <div className="px-3 py-2 rounded-2xl flex gap-1 items-center"
                      style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      {[0, 150, 300].map(d => (
                        <div key={d} className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <div className="flex gap-2 mt-3">
                <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendMessage()}
                  placeholder="Напиши команду..."
                  className="flex-1 px-3 py-2 text-xs text-white placeholder-white/30 outline-none rounded-xl"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(74,144,226,0.2)", fontFamily: "'Golos Text', sans-serif" }} />
                <button onClick={sendMessage} className="btn-yuki px-3 py-2 flex items-center justify-center">
                  <Icon name="Send" size={14} />
                </button>
              </div>
            </div>
          )}

          {/* PLAYER */}
          {activePanel === "player" && (
            <div className="glass-panel p-4 panel-enter">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-white/90">Плеер</span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/40">Авто</span>
                    <button onClick={() => setAutoPlay(p => !p)}
                      className="relative transition-all"
                      style={{ width: 32, height: 18, borderRadius: 9, background: autoPlay ? "rgba(74,144,226,0.7)" : "rgba(255,255,255,0.1)" }}>
                      <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm"
                        style={{ left: autoPlay ? 13 : 2 }} />
                    </button>
                  </div>
                  <button onClick={() => setActivePanel(null)} className="text-white/30 hover:text-white/60"><Icon name="X" size={14} /></button>
                </div>
              </div>

              <div className="rounded-xl p-3 mb-3" style={{ background: "rgba(74,144,226,0.1)", border: "1px solid rgba(74,144,226,0.2)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(74,144,226,0.2)", border: "1px solid rgba(74,144,226,0.3)" }}>
                    <Icon name="Music" size={18} className="text-blue-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{TRACKS[currentTrack].title}</div>
                    <div className="text-xs text-white/50">{TRACKS[currentTrack].artist}</div>
                  </div>
                  {isPlaying && (
                    <div className="flex items-end gap-0.5 h-5">
                      {[1,2,3,4,5].map(i => <div key={i} className="wave-bar" style={{ animationDelay: `${i * 0.1}s` }} />)}
                    </div>
                  )}
                </div>
                <div className="mt-3">
                  <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: "linear-gradient(90deg, #4a90e2, #7ab3f0)" }} />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-white/30">{Math.floor(progress * 0.022)}:{String(Math.floor((progress * 1.32) % 60)).padStart(2, "0")}</span>
                    <span className="text-xs text-white/30">{TRACKS[currentTrack].duration}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 mb-3">
                <button onClick={() => setCurrentTrack(t => t === 0 ? TRACKS.length - 1 : t - 1)} className="btn-yuki p-2">
                  <Icon name="SkipBack" size={16} />
                </button>
                <button onClick={() => setIsPlaying(p => !p)} className="btn-yuki active flex items-center justify-center"
                  style={{ width: 44, height: 44, borderRadius: "50%", padding: 0 }}>
                  <Icon name={isPlaying ? "Pause" : "Play"} size={18} />
                </button>
                <button onClick={() => setCurrentTrack(t => (t + 1) % TRACKS.length)} className="btn-yuki p-2">
                  <Icon name="SkipForward" size={16} />
                </button>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <Icon name="Volume2" size={14} className="text-white/40 flex-shrink-0" />
                <input type="range" min={0} max={100} value={volume} onChange={e => setVolume(+e.target.value)}
                  className="flex-1 h-1 accent-blue-400 cursor-pointer" />
                <span className="text-xs text-white/30 w-6 text-right">{volume}</span>
              </div>

              <div className="space-y-1">
                {TRACKS.map((t, i) => (
                  <button key={t.id} onClick={() => { setCurrentTrack(i); setIsPlaying(true); }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all text-left"
                    style={{
                      background: i === currentTrack ? "rgba(74,144,226,0.2)" : "transparent",
                      border: i === currentTrack ? "1px solid rgba(74,144,226,0.3)" : "1px solid transparent",
                    }}>
                    <span className="text-xs w-4 text-white/30 text-center">{i + 1}</span>
                    <span className="flex-1 text-xs truncate" style={{ color: i === currentTrack ? "#7ab3f0" : "rgba(255,255,255,0.6)", fontWeight: i === currentTrack ? 600 : 400 }}>{t.title}</span>
                    <span className="text-xs text-white/30">{t.duration}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* NOTIFICATIONS */}
          {activePanel === "notifications" && (
            <div className="glass-panel p-4 panel-enter">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-white/90">Уведомления</span>
                <button onClick={() => setActivePanel(null)} className="text-white/30 hover:text-white/60"><Icon name="X" size={14} /></button>
              </div>
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {notifications.map((n, i) => (
                  <div key={n.id}
                    className="flex items-start gap-3 p-2.5 rounded-xl cursor-pointer hover:bg-white/5 transition-all notification-item"
                    style={{ animationDelay: `${i * 0.08}s` }}
                    onClick={() => setNotifications(prev => prev.filter(x => x.id !== n.id))}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: `${n.color}22`, border: `1px solid ${n.color}44` }}>
                      <Icon name={n.icon} size={14} style={{ color: n.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white/80">{n.user}</span>
                        <span className="text-xs text-white/30">{n.time}</span>
                      </div>
                      <p className="text-xs text-white/50 mt-0.5 truncate">{n.text}</p>
                      <span className="text-xs" style={{ color: n.color }}>{n.type === "discord" ? "Discord" : "Telegram"}</span>
                    </div>
                  </div>
                ))}
                {notifications.length === 0 && (
                  <div className="text-center py-6 text-white/30 text-xs">Все прочитано ✓</div>
                )}
              </div>
            </div>
          )}

          {/* SETTINGS */}
          {activePanel === "settings" && (
            <div className="glass-panel p-4 panel-enter">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-white/90">Настройки</span>
                <button onClick={() => setActivePanel(null)} className="text-white/30 hover:text-white/60"><Icon name="X" size={14} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-white/40 mb-1.5 block">Имя ассистента</label>
                  <input value={yukiName} onChange={e => setYukiName(e.target.value)}
                    className="w-full px-3 py-2 text-xs text-white outline-none rounded-xl"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(74,144,226,0.2)", fontFamily: "'Golos Text', sans-serif" }} />
                </div>
                {[
                  { label: "Discord уведомления", val: discordEnabled, set: setDiscordEnabled, color: "#5865f2" },
                  { label: "Telegram уведомления", val: telegramEnabled, set: setTelegramEnabled, color: "#26a5e4" },
                  { label: "Авто-воспроизведение", val: autoPlay, set: setAutoPlay, color: "#4a90e2" },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-xs text-white/60">{item.label}</span>
                    <button onClick={() => item.set((p: boolean) => !p)} className="relative transition-all"
                      style={{ width: 40, height: 20, borderRadius: 10, background: item.val ? item.color + "aa" : "rgba(255,255,255,0.1)" }}>
                      <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm"
                        style={{ left: item.val ? 21 : 2 }} />
                    </button>
                  </div>
                ))}
                <div className="pt-2 border-t border-white/5">
                  <p className="text-xs text-white/25 leading-relaxed">
                    Голосовые команды: «включи музыку», «покажи уведомления», «тихий режим»
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Voice indicator */}
        {(isListening || voiceText) && (
          <div className="mb-3 px-4 py-2 rounded-full flex items-center gap-2 slide-up"
            style={{ background: "rgba(74,200,120,0.12)", border: "1px solid rgba(74,200,120,0.3)" }}>
            <div className="flex items-end gap-0.5 h-4">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="wave-bar" style={{ animationDelay: `${i * 0.1}s`, background: "#4ade80" }} />
              ))}
            </div>
            <span className="text-xs text-green-300" style={{ fontFamily: "'Golos Text', sans-serif" }}>{voiceText || "Слушаю..."}</span>
          </div>
        )}

        {/* Character */}
        <div className="relative">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-40 h-6 rounded-full"
            style={{ background: "radial-gradient(ellipse, rgba(74,144,226,0.4) 0%, transparent 70%)", filter: "blur(8px)" }} />
          {isListening && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="voice-ring absolute rounded-full" style={{ width: 200, height: 200, border: "2px solid rgba(74,200,120,0.4)" }} />
              <div className="voice-ring absolute rounded-full" style={{ width: 230, height: 230, border: "1px solid rgba(74,200,120,0.2)", animationDelay: "0.5s" }} />
            </div>
          )}
          {/* Покадровая анимация — при смене кадра изображение переключается */}
          <img
            key={currentFrame}
            src={currentFrame}
            alt={yukiName}
            className={charClass}
            style={{
              height: 300,
              width: "auto",
              objectFit: "contain",
              cursor: "pointer",
              display: "block",
              imageRendering: "crisp-edges",
            }}
            onClick={() => togglePanel("chat")}
          />
        </div>

        {/* Control bar */}
        <div className="w-full px-4 pb-6 mt-1">
          <div className="glass-panel-dark p-3">
            <div className="flex items-center justify-between gap-2">

              <div className="flex gap-1.5">
                <button onClick={() => togglePanel("chat")} className={`btn-yuki px-3 py-2 flex items-center gap-1.5 text-xs ${activePanel === "chat" ? "active" : ""}`}>
                  <Icon name="MessageCircle" size={14} />
                  <span>Чат</span>
                </button>
                <button onClick={() => togglePanel("player")} className={`btn-yuki px-3 py-2 flex items-center gap-1.5 text-xs ${activePanel === "player" ? "active" : ""}`}>
                  {isPlaying
                    ? <div className="flex items-end gap-0.5 h-3.5">{[1,2,3].map(i => <div key={i} className="wave-bar" style={{ animationDelay: `${i * 0.15}s` }} />)}</div>
                    : <Icon name="Music" size={14} />
                  }
                  <span>{isPlaying ? "Играет" : "Музыка"}</span>
                </button>
              </div>

              {/* Voice button */}
              <button onClick={handleVoice} className="relative flex-shrink-0 rounded-full flex items-center justify-center transition-all"
                style={{
                  width: 52, height: 52,
                  background: isListening ? "radial-gradient(circle, rgba(74,200,120,0.3), rgba(74,200,120,0.1))" : "radial-gradient(circle, rgba(74,144,226,0.3), rgba(74,144,226,0.1))",
                  border: `2px solid ${isListening ? "rgba(74,200,120,0.6)" : "rgba(74,144,226,0.5)"}`,
                  boxShadow: isListening ? "0 0 24px rgba(74,200,120,0.4)" : "0 0 16px rgba(74,144,226,0.3)",
                }}>
                <Icon name={isListening ? "MicOff" : "Mic"} size={20} className={isListening ? "text-green-300" : "text-blue-300"} />
              </button>

              <div className="flex gap-1.5">
                <button onClick={() => togglePanel("notifications")} className={`btn-yuki px-3 py-2 flex items-center gap-1.5 text-xs relative ${activePanel === "notifications" ? "active" : ""}`}>
                  <Icon name="Bell" size={14} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-white flex items-center justify-center"
                      style={{ fontSize: 9, background: "#4a90e2", border: "1px solid rgba(0,0,0,0.5)" }}>
                      {unreadCount}
                    </span>
                  )}
                  <span>Инфо</span>
                </button>
                <button onClick={() => togglePanel("settings")} className={`btn-yuki px-2 py-2 flex items-center justify-center ${activePanel === "settings" ? "active" : ""}`}>
                  <Icon name="Settings" size={14} />
                </button>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}