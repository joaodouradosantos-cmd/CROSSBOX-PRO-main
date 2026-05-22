// ============================================================
// CROSSBOX PRO — Upgrade da secção de Desempenho
// Drop-in: adicionar antes do </script> final no index.html
// ============================================================

/**
 * Substitui o conteúdo de opt-performance com:
 *  - 4 KPI cards no topo (treinos totais, carga total, melhor 1RM, streak)
 *  - Badges coloridos nas células de evolução (verde = melhorou, vermelho = piorou)
 *  - Mini-barras inline na tabela de 1RM para visualizar o peso relativo
 */

(function crossboxPerformanceUpgrade() {

  // ── 1. Injectar estilos ──────────────────────────────────────────────
  const style = document.createElement("style");
  style.textContent = `
    /* KPI cards no topo de Desempenho */
    .perf-kpi-row {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin-bottom: 16px;
    }
    @media (min-width: 480px) {
      .perf-kpi-row { grid-template-columns: repeat(4, 1fr); }
    }
    .perf-kpi-card {
      background: rgba(0,0,0,0.55);
      border: 1px solid rgba(255,255,255,0.18);
      border-radius: 10px;
      padding: 10px 12px;
      text-align: center;
    }
    .perf-kpi-value {
      font-size: 1.45rem;
      font-weight: 700;
      color: #d4e87a;
      line-height: 1.1;
      font-family: "Stardos Stencil", system-ui, sans-serif;
      letter-spacing: 0.02em;
      text-shadow: 0 1px 4px rgba(0,0,0,0.8);
    }
    .perf-kpi-label {
      font-size: 0.68rem;
      color: rgba(255,255,255,0.75);
      margin-top: 3px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    /* Badges de evolução */
    .badge-up   { display:inline-block; background:#1e4d22; color:#6fcf7a; border-radius:5px; padding:1px 7px; font-size:0.78rem; font-weight:600; }
    .badge-down { display:inline-block; background:#4d1e1e; color:#e07070; border-radius:5px; padding:1px 7px; font-size:0.78rem; font-weight:600; }
    .badge-neu  { display:inline-block; color:rgba(255,255,255,0.4); font-size:0.78rem; }

    /* Mini-barra de 1RM relativo */
    .rm-bar-wrap { display:flex; align-items:center; gap:6px; }
    .rm-bar-bg   { flex:1; height:5px; background:rgba(255,255,255,0.12); border-radius:3px; min-width:40px; }
    .rm-bar-fill { height:5px; border-radius:3px; background: linear-gradient(90deg,#8a9a40,#c8d87a); }

    /* Linha de streak no topo da secção */
    .perf-streak-bar {
      background: rgba(0,0,0,0.45);
      border-left: 3px solid #d4e87a;
      border-radius: 0 8px 8px 0;
      padding: 6px 10px;
      margin-bottom: 14px;
      font-size: 0.82rem;
      color: rgba(255,255,255,0.9);
      text-shadow: 0 1px 3px rgba(0,0,0,0.7);
    }
  `;
  document.head.appendChild(style);

  // ── 2. Helpers ───────────────────────────────────────────────────────

  function fmtKg(v) {
    if (!v) return "0 kg";
    return v % 1 === 0 ? v + " kg" : v.toFixed(1).replace(".", ",") + " kg";
  }

  /** Calcula streak de dias com treino (dias consecutivos até hoje) */
  function calcStreak(treinos) {
    if (!treinos || !treinos.length) return 0;
    const days = [...new Set(treinos.map(t => t.date).filter(Boolean))].sort().reverse();
    if (!days.length) return 0;
    let streak = 0;
    let ref = new Date();
    ref.setHours(0,0,0,0);
    for (const d of days) {
      const dt = new Date(d + "T00:00:00");
      const diff = Math.round((ref - dt) / 86400000);
      if (diff <= 1) { streak++; ref = dt; }
      else break;
    }
    return streak;
  }

  /** Retorna o melhor 1RM registado (valor + nome) */
  function bestOverall1rm(dataRm) {
    if (!dataRm) return null;
    const keys = Object.keys(dataRm);
    if (!keys.length) return null;
    return keys.reduce((best, k) => dataRm[k] > (best ? best.v : -1) ? { k, v: dataRm[k] } : best, null);
  }

  /** Cria um badge HTML de evolução */
  function evoBadge(delta, isTime) {
    // Para tempos: delta negativo = melhorou (tempo mais baixo)
    if (delta == null) return `<span class="badge-neu">—</span>`;
    const improved = isTime ? delta < 0 : delta > 0;
    const sign = delta > 0 ? "+" : "";
    const formatted = isTime
      ? (delta > 0 ? "+" : "") + Math.floor(Math.abs(delta) / 60) + "m" + (Math.abs(delta) % 60 + "s").padStart(3, "0")
      : sign + Math.abs(delta).toFixed(1) + " kg";
    if (Math.abs(delta) < 0.5) return `<span class="badge-neu">= sem alteração</span>`;
    return `<span class="${improved ? "badge-up" : "badge-down"}">${improved ? "▲" : "▼"} ${formatted}</span>`;
  }

  // ── 3. Aguardar DOM e sobrescrever renderPerformance ─────────────────

  function injectKpiCards() {
    const section = document.getElementById("opt-performance");
    if (!section) return;
    const card = section.querySelector(".card");
    if (!card) return;

    // Evitar duplicados
    if (card.querySelector(".perf-kpi-row")) return;

    // Inserir KPI row antes do h3
    const h3 = card.querySelector("h3");
    if (!h3) return;

    const kpiRow = document.createElement("div");
    kpiRow.className = "perf-kpi-row";
    kpiRow.id = "perf-kpi-row";
    card.insertBefore(kpiRow, h3.nextSibling.nextSibling); // após helper-text

    const streakBar = document.createElement("div");
    streakBar.className = "perf-streak-bar";
    streakBar.id = "perf-streak-bar";
    card.insertBefore(streakBar, kpiRow);
  }

  function updateKpiCards() {
    const row = document.getElementById("perf-kpi-row");
    const streakEl = document.getElementById("perf-streak-bar");
    if (!row) return;

    // Ler dados globais (definidos no index.html)
    const _treinos  = (typeof treinos  !== "undefined") ? treinos  : [];
    const _dataRm   = (typeof dataRm   !== "undefined") ? dataRm   : {};
    const _rmHistory = (typeof rmHistory !== "undefined") ? rmHistory : {};

    const totalTreinos = _treinos.length;
    const cargaTotal   = _treinos.reduce((s, t) => s + (t.carga || 0), 0);
    const streak       = calcStreak(_treinos);
    const best1rm      = bestOverall1rm(_dataRm);

    row.innerHTML = `
      <div class="perf-kpi-card">
        <div class="perf-kpi-value">${totalTreinos}</div>
        <div class="perf-kpi-label">WODs registados</div>
      </div>
      <div class="perf-kpi-card">
        <div class="perf-kpi-value">${cargaTotal >= 1000 ? (cargaTotal/1000).toFixed(1)+"t" : Math.round(cargaTotal)+"kg"}</div>
        <div class="perf-kpi-label">Carga total levantada</div>
      </div>
      <div class="perf-kpi-card">
        <div class="perf-kpi-value">${best1rm ? best1rm.v + "kg" : "—"}</div>
        <div class="perf-kpi-label">${best1rm ? "Melhor 1RM (" + best1rm.k + ")" : "Sem 1RM"}</div>
      </div>
      <div class="perf-kpi-card">
        <div class="perf-kpi-value">${streak}</div>
        <div class="perf-kpi-label">Dias consecutivos</div>
      </div>
    `;

    if (streakEl) {
      if (streak >= 3) {
        streakEl.textContent = `🔥 ${streak} dias seguidos com treino registado — mantém o ritmo!`;
        streakEl.style.display = "";
      } else if (totalTreinos === 0) {
        streakEl.textContent = "Regista o teu primeiro WOD para começar a ver as tuas estatísticas.";
        streakEl.style.display = "";
      } else {
        streakEl.style.display = "none";
      }
    }
  }

  // ── 4. Melhorar tabela de 1RM com mini-barras ───────────────────────

  function enhance1rmTable() {
    const tbody = document.getElementById("perf1rmBody");
    if (!tbody) return;

    const _dataRm = (typeof dataRm !== "undefined") ? dataRm : {};
    const maxRm = Math.max(...Object.values(_dataRm).filter(v => typeof v === "number"), 1);

    tbody.querySelectorAll("tr").forEach(tr => {
      const cells = tr.querySelectorAll("td");
      if (cells.length < 2) return;

      // Extrair o valor numérico da célula de 1RM
      const rmText = cells[1].textContent;
      const match  = rmText.match(/([\d,.]+)\s*kg/);
      if (!match) return;
      const rmVal = parseFloat(match[1].replace(",", "."));
      if (isNaN(rmVal)) return;

      const pct = Math.min(100, Math.round((rmVal / maxRm) * 100));

      // Adicionar mini-barra inline
      cells[1].innerHTML = `
        <div class="rm-bar-wrap">
          <span>${rmText}</span>
          <div class="rm-bar-bg" title="${pct}% do teu máximo"><div class="rm-bar-fill" style="width:${pct}%"></div></div>
        </div>`;
    });
  }

  // ── 5. Melhorar tabela de Benchmarks com badges ──────────────────────

  function enhanceBenchmarkTable() {
    const tbody = document.getElementById("perfBenchmarkBody");
    if (!tbody) return;
    tbody.querySelectorAll("tr").forEach(tr => {
      const cells = tr.querySelectorAll("td");
      if (cells.length < 4) return;
      const evoText = cells[3].textContent.trim();
      if (evoText === "—" || evoText === "" || evoText.includes("badge")) return;

      // Converter o texto de evolução num badge
      const match = evoText.match(/([+-]?\d+m\d+s|[+-]?\d+s|mesmo tempo)/);
      if (!match) {
        cells[3].innerHTML = `<span class="badge-neu">${evoText}</span>`;
        return;
      }
      const improved = evoText.startsWith("-") || evoText.toLowerCase().includes("melhor");
      const worsened = evoText.startsWith("+");
      let cls = "badge-neu";
      let icon = "";
      if (improved) { cls = "badge-up"; icon = "▲ "; }
      else if (worsened) { cls = "badge-down"; icon = "▼ "; }
      cells[3].innerHTML = `<span class="${cls}">${icon}${evoText}</span>`;
    });
  }

  // ── 6. Patch renderPerformance original ─────────────────────────────

  // Usa CustomEvent "crossbox:ready" em vez de polling
  function patchRenderPerformance() {
    if (typeof renderPerformance !== "function") return;
    const originalRender = renderPerformance;
    window.renderPerformance = function() {
      originalRender.apply(this, arguments);
      updateKpiCards();
      enhance1rmTable();
      enhanceBenchmarkTable();
    };
    injectKpiCards();
    window.renderPerformance();
  }

  document.addEventListener("crossbox:ready", patchRenderPerformance, { once: true });
  // fallback: se o evento já disparou antes deste script carregar
  if (typeof renderPerformance === "function") patchRenderPerformance();

})();
