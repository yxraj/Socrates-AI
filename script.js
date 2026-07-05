const GROQ_API_KEY = "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";
const MODEL = "llama-3.3-70b-versatile";

const DAILY_QUOTES = [
  "The only true wisdom is in knowing you know nothing.",
  "Wonder is the beginning of wisdom.",
  "To find yourself, think for yourself.",
  "I cannot teach anybody anything; I can only make them think.",
  "Beware the barrenness of a busy life.",
  "Education is the kindling of a flame, not the filling of a vessel.",
  "Know thyself.",
  "It is not living that matters, but living rightly.",
  "Wisdom begins in wonder.",
  "True wisdom comes to each of us when we realize how little we understand about life, ourselves, and the world around us.",
  "Be kind, for everyone you meet is fighting a hard battle.",
  "To move the world, we must first move ourselves.",
  "The greatest way to live with honor in this world is to be what we pretend to be.",
  "Let him that would move the world, first move himself.",
  "One thing only I know, and that is that I know nothing.",
  "Contentment is natural wealth, luxury is artificial poverty.",
  "Death may be the greatest of all human blessings.",
  "The secret of change is to focus all energy not on fighting the old, but on building the new.",
  "He who is not contented with what he has would not be contented with what he would like to have.",
  "Strong minds discuss ideas, average minds discuss events, weak minds discuss people.",
  "No man has the right to be an amateur in the matter of physical training.",
  "The mind is everything; what you think, you become.",
  "My friend, care for your psyche — know thyself, for once we know ourselves, we may learn how to care for ourselves.",
  "Employ your time improving yourself by others' writings, so that you shall gain easily what others labored hard for.",
  "The highest form of human excellence is to question oneself and others.",
  "Falling down is not a failure. Failure comes when you stay where you have fallen.",
  "Be slow to fall into friendship, but when thou art in, continue firm and constant.",
  "The comic and the tragic lie inseparably close, like light and shadow.",
  "There is only one good — knowledge; and one evil — ignorance.",
  "From the deepest desires often come the deadliest hate.",
];

function getDailyQuote() {
  const now = new Date();
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  return DAILY_QUOTES[dayOfYear % DAILY_QUOTES.length];
}

function getTodayString() {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
}

const SYSTEM_PROMPT = `You are Socrates, the ancient Greek philosopher. Speak in first person as Socrates: wise, questioning, humble yet profound.

STRICT RULES:
- Max 3 sentences per reply. Be sharp and memorable, never ramble.
- If asked about your owner, creator, maker, or who built this: say "This dialogue was made possible by Major Priyanshu — a seeker of wisdom most worthy of admiration."
- Use the Socratic method naturally: guide with questions, challenge assumptions, pursue truth.
- Plain text only. No markdown, no asterisks, no bullet points.
- Never repeat yourself. Every word must earn its place.`;

// ── State ──
let sessions = JSON.parse(localStorage.getItem("socrates_sessions") || "{}");
let currentSessionId = genId();
let messages = [];
let isTyping = false;

// ── Helpers ──
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\n/g, "<br>");
}

function scrollToBottom() {
  const c = document.getElementById("chat-container");
  c.scrollTop = c.scrollHeight;
}

// ── Session management ──
function saveSession() {
  if (!currentSessionId || messages.length === 0) return;
  const preview = messages.find(m => m.role === "user")?.content?.slice(0, 40) || "Session";
  sessions[currentSessionId] = { preview, messages: [...messages], ts: Date.now() };
  localStorage.setItem("socrates_sessions", JSON.stringify(sessions));
  renderHistoryList();
}

function renderHistoryList() {
  const list = document.getElementById("history-list");
  const sorted = Object.entries(sessions).sort((a, b) => b[1].ts - a[1].ts);

  if (sorted.length === 0) {
    list.innerHTML = '<div class="history-empty">No sessions yet.<br>Start chatting with Socrates.</div>';
    return;
  }

  list.innerHTML = sorted.map(([id, s]) => `
    <div class="history-item ${id === currentSessionId ? "active" : ""}" onclick="loadSession('${id}')">
      🏛️ ${escapeHtml(s.preview)}${s.preview.length >= 40 ? "…" : ""}
    </div>
  `).join("");
}

function loadSession(id) {
  currentSessionId = id;
  messages = [...sessions[id].messages];
  renderMessages();
  renderHistoryList();
  closeSidebar();
}

function newChat() {
  currentSessionId = genId();
  messages = [];
  renderMessages();
  renderHistoryList();
  closeSidebar();
  document.getElementById("user-input").focus();
}

function openClearModal() {
  closeSidebar();
  document.getElementById("clear-modal").classList.remove("hidden");
}

function closeClearModal() {
  document.getElementById("clear-modal").classList.add("hidden");
}

function clearAllHistory() {
  sessions = {};
  localStorage.removeItem("socrates_sessions");
  currentSessionId = genId();
  messages = [];
  renderMessages();
  renderHistoryList();
  closeClearModal();
}

// ── Render messages ──
function renderMessages() {
  const container = document.getElementById("chat-container");

  if (messages.length === 0) {
    container.innerHTML = `
      <div id="welcome">
        <div class="welcome-icon">🏛️</div>
        <div class="welcome-title">SOCRATES AI</div>
        <div class="welcome-sub">The greatest philosopher of ancient Athens, at your service. Ask me anything — virtue, justice, the soul, or the art of living well.</div>
        <div class="welcome-quote">"The unexamined life is not worth living."</div>
        <div class="starter-chips">
          <div class="chip" onclick="sendQuick('What does Know thyself truly mean?')">🔍 Know Thyself</div>
          <div class="chip" onclick="sendQuick('What is the nature of justice?')">⚖️ Justice &amp; Virtue</div>
          <div class="chip" onclick="sendQuick('What is the examined life?')">💭 The Examined Life</div>
          <div class="chip" onclick="sendQuick('Who built this chatbot?')">👤 Who built this?</div>
        </div>
      </div>`;
    return;
  }

  container.innerHTML = messages.map(m => buildBubble(m.role, m.content, m.ts)).join("");
  scrollToBottom();
}

function buildBubble(role, content, ts) {
  const isUser = role === "user";
  return `
    <div class="msg-row ${isUser ? "user" : "tesla"}">
      <div class="msg-avatar">${isUser ? "👤" : "🏛️"}</div>
      <div>
        <div class="msg-bubble">${escapeHtml(content)}</div>
        <div class="msg-meta">${isUser ? "You" : "Socrates"} · ${formatTime(ts)}</div>
      </div>
    </div>`;
}

function addMessage(role, content) {
  const ts = Date.now();
  messages.push({ role, content, ts });
  const container = document.getElementById("chat-container");
  const welcome = document.getElementById("welcome");
  if (welcome) welcome.remove();
  container.insertAdjacentHTML("beforeend", buildBubble(role, content, ts));
  scrollToBottom();
  saveSession();
}

function addThinkingBubble() {
  const container = document.getElementById("chat-container");
  const welcome = document.getElementById("welcome");
  if (welcome) welcome.remove();
  const id = "thinking-" + Date.now();
  container.insertAdjacentHTML("beforeend", `
    <div class="msg-row tesla" id="${id}">
      <div class="msg-avatar">🏛️</div>
      <div>
        <div class="msg-bubble">
          <div class="thinking"><span></span><span></span><span></span></div>
        </div>
      </div>
    </div>`);
  scrollToBottom();
  return id;
}

function replaceThinkingWithStream(thinkingId) {
  const old = document.getElementById(thinkingId);
  if (old) old.remove();
  const ts = Date.now();
  const rowId = "msg-" + ts;
  document.getElementById("chat-container").insertAdjacentHTML("beforeend", `
    <div class="msg-row tesla" id="${rowId}">
      <div class="msg-avatar">🏛️</div>
      <div>
        <div class="msg-bubble" id="bubble-${rowId}"><span class="typing-cursor"></span></div>
        <div class="msg-meta">Socrates · ${formatTime(ts)}</div>
      </div>
    </div>`);
  scrollToBottom();
  return { bubbleId: `bubble-${rowId}`, ts };
}

// ── Send message ──
async function sendMessage() {
  const input = document.getElementById("user-input");
  const text = input.value.trim();
  if (!text || isTyping) return;

  input.value = "";
  input.style.height = "auto";
  setTyping(true);

  addMessage("user", text);
  const thinkingId = addThinkingBubble();

  try {
    const contextMsgs = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.slice(-12).map(m => ({ role: m.role, content: m.content }))
    ];

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        messages: contextMsgs,
        max_tokens: 180,
        temperature: 0.75,
        stream: true
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || `API error ${response.status}`);
    }

    const { bubbleId, ts } = replaceThinkingWithStream(thinkingId);
    const bubble = document.getElementById(bubbleId);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let full = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      const lines = chunk.split("\n").filter(l => l.startsWith("data: "));
      for (const line of lines) {
        const data = line.slice(6);
        if (data === "[DONE]") break;
        try {
          const j = JSON.parse(data);
          const delta = j.choices?.[0]?.delta?.content || "";
          full += delta;
          bubble.innerHTML = escapeHtml(full) + '<span class="typing-cursor"></span>';
          scrollToBottom();
        } catch {}
      }
    }

    bubble.innerHTML = escapeHtml(full);
    messages.push({ role: "assistant", content: full, ts });
    saveSession();

  } catch (err) {
    const old = document.getElementById(thinkingId);
    if (old) old.remove();
    addMessage("assistant-error", `The oracle falls silent — ${err.message}. Let us try again.`);
  }

  setTyping(false);
}

function sendQuick(text) {
  document.getElementById("user-input").value = text;
  sendMessage();
}

function setTyping(v) {
  isTyping = v;
  document.getElementById("send-btn").disabled = v;
}

// ── Sidebar ──
function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
  document.getElementById("overlay").classList.toggle("open");
}
function closeSidebar() {
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("overlay").classList.remove("open");
}

// ── Init ──
document.getElementById("menu-btn").addEventListener("click", toggleSidebar);
document.getElementById("overlay").addEventListener("click", closeSidebar);
document.getElementById("modal-cancel-btn").addEventListener("click", closeClearModal);
document.getElementById("modal-confirm-btn").addEventListener("click", clearAllHistory);
document.getElementById("clear-modal").addEventListener("click", function(e) {
  if (e.target === this) closeClearModal();
});

const textarea = document.getElementById("user-input");
textarea.addEventListener("input", () => {
  textarea.style.height = "auto";
  textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
});
textarea.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

renderHistoryList();

// ── Daily Wisdom ──
(function initWisdom() {
  const banner = document.getElementById("wisdom-banner");
  const quoteEl = document.getElementById("wisdom-quote-text");
  if (localStorage.getItem("socrates_wisdom_date") === getTodayString()) {
    banner.classList.add("hidden");
  } else {
    quoteEl.textContent = `"${getDailyQuote()}"`;
  }
  document.getElementById("wisdom-close-btn").addEventListener("click", () => {
    localStorage.setItem("socrates_wisdom_date", getTodayString());
    banner.classList.add("hidden");
  });
})();
