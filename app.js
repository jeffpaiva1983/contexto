// ─── Word list ───────────────────────────────────────────────────────────────
const WORDS = [
  "oceano","floresta","montanha","cidade","família","amizade","coragem","sonho",
  "liberdade","música","viagem","saudade","paixão","silêncio","alegria","medo",
  "esperança","memória","tempo","estrela","chuva","vento","fogo","terra","luz",
  "sombra","mar","rio","nuvem","jardim","castelo","dragão","herói","magia",
  "aventura","segredo","mistério","destino","amor","guerra","paz","vitória",
  "derrota","justiça","verdade","mentira","riqueza","pobreza","sabedoria","natureza",
  "animal","pássaro","leão","tigre","elefante","cobra","borboleta","abelha",
  "escola","professor","livro","história","ciência","arte","dança","teatro",
  "comida","água","fome","sede","saúde","doença","remédio","hospital",
  "casa","porta","janela","telhado","quarto","cozinha","banheiro","sala",
  "carro","avião","barco","trem","bicicleta","moto","ônibus","navio",
  "sol","lua","planeta","universo","galáxia","cometa","eclipse","aurora"
];

function getDailyWord() {
  const d = new Date();
  const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  return WORDS[seed % WORDS.length];
}

function getRandomWord(exclude) {
  const pool = WORDS.filter(w => w !== exclude);
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── State ───────────────────────────────────────────────────────────────────
let state = {
  screen: "home",   // home | game
  mode: null,       // daily | free
  secret: "",
  guesses: [],      // [{word, rank}]
  loading: false,
  won: false,
  revealed: false,
};

// ─── Rank helpers ─────────────────────────────────────────────────────────────
function rankColor(rank) {
  if (rank === 1)   return { bg: "#00e676", label: "🏆 Acertou!" };
  if (rank <= 10)   return { bg: "#69f0ae", label: "Quente 🔥" };
  if (rank <= 100)  return { bg: "#c6f135", label: "Morno ♨️" };
  if (rank <= 500)  return { bg: "#ffb300", label: "Frio ❄️" };
  return              { bg: "#ef5350", label: "Gelado 🧊" };
}

function rankPct(rank) {
  return Math.max(2, Math.min(100, 100 - (rank / 10000) * 100));
}

// ─── API ──────────────────────────────────────────────────────────────────────
async function fetchRank(guess, secret) {
  const prompt = `Você é um motor de similaridade semântica para um jogo de palavras em português chamado "Contexto".

A palavra secreta é: "${secret}"
A palavra chutada pelo jogador é: "${guess}"

Calcule um ranking de similaridade semântica de 1 a 10000, onde:
- 1 = a própria palavra secreta
- 2-10 = sinônimos diretos ou palavras extremamente relacionadas
- 11-100 = palavras muito próximas (mesmo campo semântico)
- 101-500 = palavras relacionadas indiretamente
- 501-2000 = conexão temática fraca
- 2001-10000 = sem relação semântica

Responda APENAS com JSON no formato exato (sem markdown):
{"rank": NUMBER}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 60,
      messages: [{ role: "user", content: prompt }]
    })
  });
  const data = await res.json();
  const text = (data.content || []).map(i => i.text || "").join("").replace(/```json|```/g, "").trim();
  return JSON.parse(text).rank;
}

// ─── Render ───────────────────────────────────────────────────────────────────
function render() {
  const app = document.getElementById("app");
  if (state.screen === "home") {
    app.innerHTML = renderHome();
  } else {
    app.innerHTML = renderGame();
  }
  bindEvents();
}

function renderHome() {
  return `
    <div class="home">
      <div class="home-inner">
        <div class="home-badge">🇧🇷 &nbsp;Português Brasileiro</div>
        <h1 class="logo">CONTEXTO</h1>
        <p class="tagline">Descubra a palavra secreta<br>pela proximidade semântica</p>
        <div class="mode-grid">
          <button class="mode-btn" data-action="start-daily">
            <span class="mode-icon">📅</span>
            <strong>Palavra do Dia</strong>
            <small>Mesma palavra para todos</small>
          </button>
          <button class="mode-btn" data-action="start-free">
            <span class="mode-icon">🎲</span>
            <strong>Modo Livre</strong>
            <small>Jogue quantas vezes quiser</small>
          </button>
        </div>
        <div class="howto">
          <p><strong>Como jogar:</strong> Digite qualquer palavra em português. O jogo mostra o quão próxima ela é da palavra secreta — quanto menor o número, mais quente você está! 🔥</p>
          <div class="legend">
            <span class="leg" style="color:#00e676">#1 — Acertou!</span>
            <span class="leg" style="color:#69f0ae">#2–10 — Quente 🔥</span>
            <span class="leg" style="color:#c6f135">#11–100 — Morno ♨️</span>
            <span class="leg" style="color:#ffb300">#101–500 — Frio ❄️</span>
            <span class="leg" style="color:#ef5350">#500+ — Gelado 🧊</span>
          </div>
        </div>
      </div>
    </div>`;
}

function renderGame() {
  const best = state.guesses.length > 0 ? state.guesses[0] : null;

  const guessRows = state.guesses.map((g, i) => {
    const { bg, label } = rankColor(g.rank);
    const isWin = g.rank === 1;
    return `
      <div class="guess-row ${isWin ? "guess-win" : ""}" style="--rank-color:${bg}">
        <span class="guess-num">${i + 1}</span>
        <span class="guess-word">${g.word}</span>
        <span class="guess-rank" style="color:${bg}">#${g.rank}</span>
        <span class="guess-label" style="color:${bg};border-color:${bg}40;background:${bg}15">${label}</span>
      </div>`;
  }).join("");

  const today = new Date();
  const dateStr = today.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });

  return `
    <div class="game">

      <!-- Header -->
      <header class="hdr">
        <button class="back-btn" data-action="go-home">← Início</button>
        <h1 class="hdr-logo">CONTEXTO</h1>
        <span class="hdr-badge">${state.mode === "daily" ? `📅 ${dateStr}` : "🎲 Livre"}</span>
      </header>

      <!-- Win banner -->
      ${state.won ? `
        <div class="win-banner">
          <div class="win-top">🏆 A palavra era <strong>"${state.secret}"</strong></div>
          <div class="win-sub">Descoberta em ${state.guesses.length} tentativa${state.guesses.length > 1 ? "s" : ""}!</div>
          ${state.mode === "free" ? `<button class="play-again-btn" data-action="new-game">Nova palavra →</button>` : ""}
        </div>` : ""}

      <!-- Reveal banner -->
      ${state.revealed && !state.won ? `
        <div class="reveal-banner">
          A palavra era <strong style="color:#69f0ae">"${state.secret}"</strong>
          ${state.mode === "free" ? `<button class="play-again-btn" data-action="new-game">Nova palavra →</button>` : ""}
        </div>` : ""}

      <!-- Input -->
      ${!state.won && !state.revealed ? `
        <div class="input-wrap">
          <input id="guess-input" class="guess-input" type="text"
            placeholder="Digite uma palavra..."
            autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false"
            ${state.loading ? "disabled" : ""}
          />
          <button class="send-btn" data-action="submit" ${state.loading ? "disabled" : ""}>
            ${state.loading
              ? `<span class="spinner"></span>`
              : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`}
          </button>
        </div>
        <div id="err-msg" class="err-msg"></div>` : ""}

      <!-- Stats -->
      ${state.guesses.length > 0 ? `
        <div class="stats-bar">
          <span class="stat">🔢 ${state.guesses.length} tentativa${state.guesses.length > 1 ? "s" : ""}</span>
          ${best ? `<span class="stat">🏅 Melhor: <strong style="color:${rankColor(best.rank).bg}">#${best.rank}</strong></span>` : ""}
          ${!state.won && !state.revealed ? `<button class="give-up-btn" data-action="reveal">😵 Desistir</button>` : ""}
        </div>

        ${best && !state.won ? `
          <div class="bar-wrap">
            <div class="bar-label">Proximidade da melhor tentativa</div>
            <div class="bar-track">
              <div class="bar-fill" style="width:${rankPct(best.rank)}%;background:${rankColor(best.rank).bg}"></div>
            </div>
          </div>` : ""}
      ` : ""}

      <!-- Guesses -->
      <div class="guesses-list">
        ${guessRows}
        ${state.guesses.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon">🔍</div>
            <p>Nenhuma tentativa ainda.<br>Digite uma palavra para começar!</p>
          </div>` : ""}
      </div>

    </div>`;
}

// ─── Events ───────────────────────────────────────────────────────────────────
function bindEvents() {
  document.querySelectorAll("[data-action]").forEach(el => {
    el.addEventListener("click", handleAction);
  });

  const inp = document.getElementById("guess-input");
  if (inp) {
    inp.addEventListener("keydown", e => { if (e.key === "Enter") doSubmit(); });
    inp.focus();
  }
}

function handleAction(e) {
  const action = e.currentTarget.dataset.action;
  if (action === "start-daily") startGame("daily");
  else if (action === "start-free") startGame("free");
  else if (action === "go-home") { state.screen = "home"; render(); }
  else if (action === "submit") doSubmit();
  else if (action === "reveal") { state.revealed = true; render(); }
  else if (action === "new-game") {
    state.secret = getRandomWord(state.secret);
    state.guesses = [];
    state.won = false;
    state.revealed = false;
    render();
  }
}

function startGame(mode) {
  state.mode = mode;
  state.secret = mode === "daily" ? getDailyWord() : getRandomWord("");
  state.guesses = [];
  state.won = false;
  state.revealed = false;
  state.screen = "game";
  render();
}

async function doSubmit() {
  const inp = document.getElementById("guess-input");
  if (!inp || state.loading || state.won) return;

  const word = inp.value.trim().toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").normalize("NFC"); // normalize accents for comparison
  const wordRaw = inp.value.trim().toLowerCase();

  if (!wordRaw) return;
  if (state.guesses.find(g => g.word === wordRaw)) {
    showErr("Você já tentou essa palavra!");
    return;
  }

  state.loading = true;
  render();

  try {
    const rank = await fetchRank(wordRaw, state.secret);
    const entry = { word: wordRaw, rank };
    state.guesses = [...state.guesses, entry].sort((a, b) => a.rank - b.rank);
    if (rank === 1) state.won = true;
  } catch {
    showErr("Erro ao consultar a API. Verifique sua conexão.");
  } finally {
    state.loading = false;
    render();
    const newInp = document.getElementById("guess-input");
    if (newInp) newInp.focus();
  }
}

function showErr(msg) {
  const el = document.getElementById("err-msg");
  if (el) { el.textContent = msg; setTimeout(() => { if (el) el.textContent = ""; }, 3000); }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

render();
