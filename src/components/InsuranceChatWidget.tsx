import { useEffect, useRef, useState } from "react";
import { Bot, Send, X, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type Msg = { role: "user" | "assistant"; content: string };

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const STARTER: Msg = {
  role: "assistant",
  content: "Namaste! 👋 Main **RocketBot** hoon — aapka insurance dost. Bataiye, **Car, Bike, Health ya Life** — kis ke baare me jaanna hai? 🚗🏥",
};

export const InsuranceChatWidget = () => {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([STARTER]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const next = [...msgs, { role: "user" as const, content: text }];
    setMsgs(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/insurance-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${ANON}`, apikey: ANON },
        body: JSON.stringify({ messages: next }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "Network error" }));
        setMsgs((m) => [...m, { role: "assistant", content: `⚠️ ${err.error || "Kuch problem aayi, dobara try karein."}` }]);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      setMsgs((m) => [...m, { role: "assistant", content: "" }]);
      let buf = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (!data || data === "[DONE]") continue;
          try {
            const j = JSON.parse(data);
            const delta = j.choices?.[0]?.delta?.content || "";
            if (delta) {
              acc += delta;
              setMsgs((m) => {
                const copy = [...m];
                copy[copy.length - 1] = { role: "assistant", content: acc };
                return copy;
              });
            }
          } catch {/* ignore */}
        }
      }
    } catch (e: any) {
      setMsgs((m) => [...m, { role: "assistant", content: "⚠️ Connection issue. Thodi der baad try karein." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating launcher */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open RocketBot chat"
          className="fixed bottom-5 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-pink-500 text-white shadow-2xl ring-4 ring-white/60 transition hover:scale-110"
        >
          <Bot className="h-7 w-7" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
          </span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed inset-x-2 bottom-2 z-50 flex h-[80vh] max-h-[640px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-[380px]">
          <div className="flex items-center justify-between bg-gradient-to-r from-orange-500 to-pink-500 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-bold">RocketBot</div>
                <div className="text-[11px] opacity-90">Insurance advisor • Online</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-full p-1 hover:bg-white/20"><X className="h-4 w-4" /></button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-3">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm ${
                  m.role === "user"
                    ? "rounded-br-sm bg-gradient-to-br from-orange-500 to-pink-500 text-white"
                    : "rounded-bl-sm border border-slate-200 bg-white text-slate-800"
                }`}>{m.content || "…"}</div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white px-3 py-2">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-orange-400" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-orange-400 [animation-delay:120ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-orange-400 [animation-delay:240ms]" />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-end gap-2 border-t bg-white p-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Apna sawal type karein…"
              rows={1}
              className="max-h-24 flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
            />
            <Button onClick={send} disabled={loading || !input.trim()} size="icon" className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 text-white hover:opacity-90">
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="border-t bg-slate-50 px-3 py-1.5 text-center text-[10px] text-slate-500">
            AI suggestions only — final premium insurer ke according hoga
          </div>
        </div>
      )}
    </>
  );
};

export default InsuranceChatWidget;
