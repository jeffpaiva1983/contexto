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
  const seed = d.getFullYear() * 10000 + (d.getMonth()+1) * 100 + d.getDate();
  return WORDS[seed % WORDS.length];
}
function getRandomWord(exclude) {
  const pool = WORDS.filter(w => w !== exclude);
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── State ───────────────────────────────────────────────────────────────────
let model = null;
let modelLoading = false;

let state = {
  screen: "home", mode: null, secret: "",
  guesses: [], loading: false, modelReady: false,
  won: false, revealed: false,
};

// ─── TF.js Multilingual USE ──────────────────────────────────────────────────
async function loadModel() {
  if (model) return model;
  if (modelLoading) {
    while (modelLoading) await new Promise(r => setTimeout(r, 200));
    return model;
  }
  modelLoading = true;
  model = await use.load();
  state.modelReady = true;
  modelLoading = false;
  return model;
}

function cosineSim(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

async function fetchRank(guess, secret) {
  const m = await loadModel();
  const emb = await m.embed([guess, secret]);
  const vecs = await emb.array();
  emb.dispose();
  if (guess.toLowerCase() === secret.toLowerCase()) return 1;
  const sim = cosineSim(vecs[0], vecs[1]);
  return Math.max(2, Math.min(10000, Math.round(1 + (1 - sim) / 2 * 9999)));
}

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

// ─── Render ───────────────────────────────────────────────────────────────────
function render() {
  document.getElementById("app").innerHTML =
    state.screen === "home" ? renderHome() : renderGame();
  bindEvents();
}

function renderHome() {
  return `
    <div class="home"><div class="home-inner">
      <div class="home-badge">🇧🇷 Português Brasileiro</div>
      <h1 class="logo">CONTEXTO</h1>
      <p class="tagline">Descubra a palavra secreta<br>pela proximidade semântica</p>
      <div class="mode-grid">
        <button class="mode-btn" data-action="start-daily">
          <span class="mode-icon">📅</span><strong>Palavra do Dia</strong><small>Mesma palavra para todos</small>
        </button>
        <button class="mode-btn" data-action="start-free">
          <span class="mode-icon">🎲</span><strong>Modo Livre</strong><small>Jogue quantas vezes quiser</small>
        </button>
      </div>
      <div class="howto">
        <p><strong>Como jogar:</strong> Digite qualquer palavra. O jogo mostra o quão próxima ela é da palavra secreta — quanto menor o número, mais quente você está! 🔥</p>
        <div class="legend">
          <span class="leg" style="color:#00e676">#1 — Acertou!</span>
          <span class="leg" style="color:#69f0ae">#2–10 — Quente 🔥</span>
          <span class="leg" style="color:#c6f135">#11–100 — Morno ♨️</span>
          <span class="leg" style="color:#ffb300">#101–500 — Frio ❄️</span>
          <span class="leg" style="color:#ef5350">#500+ — Gelado 🧊</span>
        </div>
      </div>
      <p class="tech-note">⚡ 100% local · sem servidor · sem login</p>
    </div></div>`;
}

function renderGame() {
  const best = state.guesses[0] || null;
  const dateStr = new Date().toLocaleDateString("pt-BR", { day:"2-digit", month:"long" });
  const rows = state.guesses.map((g, i) => {
    const { bg, label } = rankColor(g.rank);
    return `<div class="guess-row ${g.rank===1?"guess-win":""}" style="--rank-color:${bg}">
      <span class="guess-num">${i+1}</span>
      <span class="guess-word">${g.word}</span>
      <span class="guess-rank" style="color:${bg}">#${g.rank}</span>
      <span class="guess-label" style="color:${bg};border-color:${bg}40;background:${bg}15">${label}</span>
    </div>`;
  }).join("");

  return `
    <div class="game">
      <header class="hdr">
        <button class="back-btn" data-action="go-home">← Início</button>
        <h1 class="hdr-logo">CONTEXTO</h1>
        <span class="hdr-badge">${state.mode==="daily" ? `📅 ${dateStr}` : "🎲 Livre"}</span>
      </header>

      ${!state.modelReady ? `
        <div class="model-loading">
          <div class="model-spinner"></div>
          <div><strong>Carregando modelo de IA...</strong><small>Apenas no primeiro acesso (~5MB)</small></div>
        </div>` : ""}

      ${state.won ? `
        <div class="win-banner">
          <div class="win-top">🏆 A palavra era <strong>"${state.secret}"</strong></div>
          <div class="win-sub">Descoberta em ${state.guesses.length} tentativa${state.guesses.length>1?"s":""}!</div>
          ${state.mode==="free" ? `<button class="play-again-btn" data-action="new-game">Nova palavra →</button>` : ""}
        </div>` : ""}

      ${state.revealed && !state.won ? `
        <div class="reveal-banner">
          A palavra era <strong style="color:#69f0ae">"${state.secret}"</strong>
          ${state.mode==="free" ? `<button class="play-again-btn" data-action="new-game">Nova palavra →</button>` : ""}
        </div>` : ""}

      ${!state.won && !state.revealed ? `
        <div class="input-wrap">
          <input id="guess-input" class="guess-input" type="text"
            placeholder="${state.modelReady ? "Digite uma palavra..." : "Aguarde o modelo carregar..."}"
            autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false"
            ${state.loading || !state.modelReady ? "disabled" : ""}/>
          <button class="send-btn" data-action="submit" ${state.loading || !state.modelReady ? "disabled" : ""}>
            ${state.loading
              ? `<span class="spinner"></span>`
              : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`}
          </button>
        </div>
        <div id="err-msg" class="err-msg"></div>` : ""}

      ${state.guesses.length > 0 ? `
        <div class="stats-bar">
          <span class="stat">🔢 ${state.guesses.length} tentativa${state.guesses.length>1?"s":""}</span>
          ${best ? `<span class="stat">🏅 Melhor: <strong style="color:${rankColor(best.rank).bg}">#${best.rank}</strong></span>` : ""}
          ${!state.won && !state.revealed ? `<button class="give-up-btn" data-action="reveal">😵 Desistir</button>` : ""}
        </div>
        ${best && !state.won ? `
          <div class="bar-wrap">
            <div class="bar-label">Proximidade da melhor tentativa</div>
            <div class="bar-track"><div class="bar-fill" style="width:${rankPct(best.rank)}%;background:${rankColor(best.rank).bg}"></div></div>
          </div>` : ""}` : ""}

      <div class="guesses-list">
        ${rows}
        ${state.guesses.length===0 && state.modelReady ? `
          <div class="empty-state">
            <div class="empty-icon">🔍</div>
            <p>Nenhuma tentativa ainda.<br>Digite uma palavra para começar!</p>
          </div>` : ""}
      </div>
    </div>`;
}

// ─── Events ───────────────────────────────────────────────────────────────────
function bindEvents() {
  document.querySelectorAll("[data-action]").forEach(el =>
    el.addEventListener("click", handleAction));
  const inp = document.getElementById("guess-input");
  if (inp) {
    inp.addEventListener("keydown", e => { if (e.key==="Enter") doSubmit(); });
    if (state.modelReady) inp.focus();
  }
}

function handleAction(e) {
  const a = e.currentTarget.dataset.action;
  if (a==="start-daily") startGame("daily");
  else if (a==="start-free") startGame("free");
  else if (a==="go-home") { state.screen="home"; render(); }
  else if (a==="submit") doSubmit();
  else if (a==="reveal") { state.revealed=true; render(); }
  else if (a==="new-game") {
    state.secret=getRandomWord(state.secret);
    state.guesses=[]; state.won=false; state.revealed=false; render();
  }
}

async function startGame(mode) {
  state.mode = mode;
  state.secret = mode==="daily" ? getDailyWord() : getRandomWord("");
  state.guesses=[]; state.won=false; state.revealed=false;
  state.screen="game";
  render();
  if (!model) {
    try { await loadModel(); render(); }
    catch { showErr("Erro ao carregar o modelo. Verifique sua conexão."); }
  }
}

async function doSubmit() {
  const inp = document.getElementById("guess-input");
  if (!inp || state.loading || state.won || !state.modelReady) return;
  const word = inp.value.trim().toLowerCase();
  if (!word) return;
  if (state.guesses.find(g => g.word===word)) { showErr("Você já tentou essa palavra!"); return; }
  state.loading=true; render();
  try {
    const rank = await fetchRank(word, state.secret);
    state.guesses = [...state.guesses, {word, rank}].sort((a,b) => a.rank-b.rank);
    if (rank===1) state.won=true;
  } catch { showErr("Erro ao calcular similaridade."); }
  finally {
    state.loading=false; render();
    const ni=document.getElementById("guess-input");
    if (ni) ni.focus();
  }
}

function showErr(msg) {
  const el=document.getElementById("err-msg");
  if (el) { el.textContent=msg; setTimeout(()=>{ if(el) el.textContent=""; },3000); }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(()=>{});
render();
