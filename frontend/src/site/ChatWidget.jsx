import { useEffect, useRef, useState } from "react";
import { MessageSquare, X, Send, UserRound } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { API, errMsg } from "../lib/api";
import { useSite } from "./SiteContext";

const LANGS = { en: "English", ta: "தமிழ்", hi: "हिन्दी", ml: "മലയാളം", kn: "ಕನ್ನಡ", te: "తెలుగు", ar: "العربية", fr: "Français", de: "Deutsch", es: "Español" };

export default function ChatWidget() {
  const { site, preview, lang: siteLang } = useSite();
  const ai = site.ai;
  const [open, setOpen] = useState(false), [msgs, setMsgs] = useState([]), [text, setText] = useState(""), [busy, setBusy] = useState(false);
  const [lang, setLang] = useState((ai.languages || []).includes(siteLang) ? siteLang : ai.defaultLanguage || "en"), [handover, setHandover] = useState(false);
  const sid = useRef(sessionStorage.getItem("nsw_chat") || null);
  const end = useRef(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, handover]);
  if (!ai.chatEnabled || preview) return null;
  const userCount = msgs.filter((m) => m.role === "user").length;

  const send = async (e) => {
    e?.preventDefault();
    const q = text.trim();
    if (!q || busy) return;
    setText(""); setBusy(true);
    setMsgs((m) => [...m, { role: "user", content: q }, { role: "assistant", content: "" }]);
    try {
      const res = await fetch(`${API}/public/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session_id: sid.current, message: q, language: lang }) });
      if (!res.ok) throw new Error((await res.json()).detail || "Chat unavailable");
      const reader = res.body.getReader(), dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n"); buf = parts.pop();
        for (const p of parts) {
          if (!p.startsWith("data: ")) continue;
          const ev = JSON.parse(p.slice(6));
          if (ev.session_id) { sid.current = ev.session_id; sessionStorage.setItem("nsw_chat", ev.session_id); }
          if (ev.delta) setMsgs((m) => { const c = [...m]; c[c.length - 1] = { ...c[c.length - 1], content: c[c.length - 1].content + ev.delta }; return c; });
        }
      }
    } catch (err) { setMsgs((m) => { const c = [...m]; c[c.length - 1] = { role: "assistant", content: err.message }; return c; }); }
    finally { setBusy(false); }
  };

  const submitHandover = async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.currentTarget));
    try { await axios.post(`${API}/public/chat/handover`, { ...fd, session_id: sid.current }); toast.success("Thanks! Our team will reach out soon."); setHandover(false);
      setMsgs((m) => [...m, { role: "assistant", content: "Thanks — a member of our team will contact you shortly." }]); }
    catch (err) { toast.error(errMsg(err)); }
  };

  const showCapture = ai.leadCapture?.enabled && userCount >= (ai.leadCapture.afterMessages || 3) && !handover && !msgs.some((m) => m.content.startsWith("Thanks — a member"));
  return (<>
    <button className="chat-fab" onClick={() => setOpen((o) => !o)} aria-label="Open chat assistant" data-testid="chat-open-button">{open ? <X size={22} /> : <MessageSquare size={22} />}</button>
    {open && <div className="chat-panel" role="dialog" aria-label="Chat assistant" data-testid="chat-panel">
      <div className="chat-head"><div><p className="card-title text-base">Ask us anything</p><p className="text-xs muted">AI assistant · replies may be imperfect</p></div>
        {ai.languages?.length > 1 && <select value={lang} onChange={(e) => setLang(e.target.value)} className="select-site !py-1 !text-xs" data-testid="chat-language">{ai.languages.map((l) => <option key={l} value={l}>{LANGS[l] || l}</option>)}</select>}</div>
      <div className="chat-body">
        <div className="bubble bot">{ai.greeting}</div>
        {msgs.map((m, i) => <div key={i} className={`bubble ${m.role === "user" ? "me" : "bot"}`} data-testid={`chat-msg-${i}`}>{m.content || "…"}</div>)}
        {showCapture && <button className="pill on text-xs" onClick={() => setHandover(true)} data-testid="chat-capture-prompt">Share your details for a free consultation</button>}
        {handover && <form onSubmit={submitHandover} className="space-y-2 card !p-4" data-testid="chat-handover-form">
          <p className="text-sm muted">{ai.handover?.message}</p>
          <input name="name" required placeholder="Your name" className="input-site" data-testid="handover-name" />
          <input name="email" type="email" required placeholder="Email" className="input-site" data-testid="handover-email" />
          <input name="phone" placeholder="Phone (optional)" className="input-site" data-testid="handover-phone" />
          <textarea name="message" placeholder="How can we help?" rows={2} className="input-site" data-testid="handover-message" />
          <button className="btn-primary w-full justify-center !py-2" data-testid="handover-submit">Request a call back</button></form>}
        <div ref={end} />
      </div>
      <form onSubmit={send} className="chat-input">
        {ai.handover?.enabled && <button type="button" title="Talk to a human" className="icon-btn" onClick={() => setHandover(true)} data-testid="chat-human-button"><UserRound size={16} /></button>}
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your message…" maxLength={2000} data-testid="chat-input" />
        <button disabled={busy} className="icon-btn on" aria-label="Send" data-testid="chat-send-button"><Send size={16} /></button>
      </form>
    </div>}
  </>);
}
