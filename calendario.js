/* ============================================================
   CROSSBOX – CALENDÁRIO PARTILHADO v2
   Firebase Firestore · Design Militar · Sistema de Convites
   ============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, doc, getDocs, getDoc,
  setDoc, updateDoc, onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ─── FIREBASE CONFIG ─────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyA5zi1kpgIO2U4ZL4IepIgrSxmAQP8tfPw",
  authDomain: "crossfit-moita.firebaseapp.com",
  projectId: "crossfit-moita",
  storageBucket: "crossfit-moita.firebasestorage.app",
  messagingSenderId: "417574003149",
  appId: "1:417574003149:web:76ab3a33e8d42a52502484"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// ─── CONSTANTES ──────────────────────────────────────────────
const PIN_PROFESSOR   = "nj_1985";
const STORAGE_SESSION = "crossbox_cal_session";

const HORARIOS = {
  1: ["07:00","10:00","17:30","18:30","19:30"],
  2: ["07:00","10:00","17:00","18:00","19:00"],
  3: ["07:00","10:00","17:30","18:30","19:30"],
  4: ["07:00","10:00","17:00","18:00","19:00"],
  5: ["07:00","10:00","17:30","18:30","19:30"],
  6: ["09:00","10:00","11:00"],
};
const TIPOS_AULA = ["WOD","Open Box","Halterofilismo","Mobilidade","Hyrox","Competição"];
const DIAS_PT    = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

// ─── ESTADO ──────────────────────────────────────────────────
let session    = null;
let semanaOff  = 0;
let aulasCache = {};
let unsub      = null;

// ─── UTILS ───────────────────────────────────────────────────
const isoDate = d => d.toISOString().slice(0,10);

function getMonday(off = 0) {
  const hoje = new Date();
  const dow  = hoje.getDay();
  const diff = (dow === 0 ? -6 : 1) - dow;
  const mon  = new Date(hoje);
  mon.setDate(hoje.getDate() + diff + off * 7);
  mon.setHours(0,0,0,0);
  return mon;
}

function semanaLabel(off) {
  const mon = getMonday(off);
  const sun = new Date(mon); sun.setDate(mon.getDate()+6);
  const fmt = d => `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}`;
  return `${fmt(mon)} — ${fmt(sun)}`;
}

const aulaId = (data, hora) => `${data}_${hora.replace(":","h")}`;

function saveSession(s) {
  session = s;
  if (s) localStorage.setItem(STORAGE_SESSION, JSON.stringify(s));
  else   localStorage.removeItem(STORAGE_SESSION);
}

// ─── FIREBASE OPS ────────────────────────────────────────────
async function isAlunoBloqueado(tel) {
  try {
    const snap = await getDoc(doc(db, "alunos", tel));
    if (!snap.exists()) return true;
    return snap.data().bloqueado === true;
  } catch { return false; }
}

async function registarAluno(nome, tel) {
  const ref  = doc(db, "alunos", tel);
  const snap = await getDoc(ref);
  if (!snap.exists())
    await setDoc(ref, { nome, tel, bloqueado: false, criadoEm: serverTimestamp() });
}

async function bloquearAluno(tel) {
  await updateDoc(doc(db, "alunos", tel), { bloqueado: true });
  const hoje = isoDate(new Date());
  const snap = await getDocs(collection(db, "aulas"));
  const proms = [];
  snap.forEach(d => {
    const a = d.data();
    if (a.data >= hoje) {
      const lista = (a.inscritos || []).filter(x => x.tel !== tel);
      if (lista.length !== (a.inscritos || []).length)
        proms.push(updateDoc(doc(db, "aulas", d.id), { inscritos: lista }));
    }
  });
  await Promise.all(proms);
}

async function gerarSemana(off) {
  const mon = getMonday(off);
  for (let i = 0; i < 7; i++) {
    const d   = new Date(mon); d.setDate(mon.getDate()+i);
    const dow = d.getDay();
    const dt  = isoDate(d);
    for (const h of (HORARIOS[dow] || [])) {
      const id  = aulaId(dt, h);
      const ref = doc(db, "aulas", id);
      const sn  = await getDoc(ref);
      if (!sn.exists())
        await setDoc(ref, { data: dt, hora: h, tipo: h==="11:00"?"Hyrox":"WOD", vagas: 8, inscritos: [], criadoEm: serverTimestamp() });
    }
  }
}

async function inscrever(id) {
  if (!session) return;
  const ref  = doc(db, "aulas", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const aula  = snap.data();
  const lista = aula.inscritos || [];
  if (lista.some(a => a.tel === session.tel)) { alert("Já estás inscrito."); return; }
  if (lista.length >= (aula.vagas||8))         { alert("Aula sem vagas.");    return; }
  lista.push({ nome: session.nome, tel: session.tel });
  await updateDoc(ref, { inscritos: lista });
}

async function cancelar(id) {
  if (!session) return;
  const ref  = doc(db, "aulas", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  await updateDoc(ref, { inscritos: (snap.data().inscritos||[]).filter(a => a.tel !== session.tel) });
}

async function removerDaAula(id, tel) {
  const ref  = doc(db, "aulas", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  await updateDoc(ref, { inscritos: (snap.data().inscritos||[]).filter(a => a.tel !== tel) });
}

async function criarConvite() {
  const codigo = Math.random().toString(36).slice(2,8).toUpperCase();
  await setDoc(doc(db, "convites", codigo), { usado: false, criadoEm: serverTimestamp() });
  return codigo;
}

async function validarConvite(codigo) {
  const ref  = doc(db, "convites", codigo.toUpperCase());
  const snap = await getDoc(ref);
  if (!snap.exists() || snap.data().usado) return false;
  await updateDoc(ref, { usado: true });
  return true;
}

// ─── LISTENER TEMPO REAL ─────────────────────────────────────
function escutarSemana(off) {
  if (unsub) unsub();
  aulasCache = {};
  const mon = getMonday(off);
  const sun = new Date(mon); sun.setDate(mon.getDate()+6);
  const inicioStr = isoDate(mon);
  const fimStr    = isoDate(sun);

  // Usa getDocs em vez de onSnapshot para evitar indice composto
  async function carregarAulas() {
    try {
      const snap = await getDocs(collection(db, "aulas"));
      aulasCache = {};
      snap.forEach(d => {
        const a = d.data();
        if (a.data >= inicioStr && a.data <= fimStr) {
          aulasCache[d.id] = a;
        }
      });
      renderGrid();
    } catch(err) {
      const g = document.getElementById("cal-grid");
      if (g) g.innerHTML = `<div class="cal-erro">⚠️ Erro: ${err.message}</div>`;
    }
  }

  carregarAulas();

  // Polling leve a cada 15s para manter atualizado
  const intervalo = setInterval(carregarAulas, 15000);
  unsub = () => clearInterval(intervalo);
}

// ─── RENDER GRID ─────────────────────────────────────────────
function renderGrid() {
  const grid = document.getElementById("cal-grid");
  if (!grid) return;

  const mon    = getMonday(semanaOff);
  const hoje   = isoDate(new Date());
  const agora  = new Date().toTimeString().slice(0,5);
  const isProf = session?.tipo === "prof";

  if (!Object.keys(aulasCache).length) {
    grid.innerHTML = `
      <div class="cal-vazio-msg">
        <div style="font-size:2.5rem;margin-bottom:8px;">📋</div>
        <div>Sem aulas para esta semana.</div>
        ${isProf
          ? `<button class="cal-btn-principal" id="cal-gerar-inline" style="margin-top:12px;">⚙️ GERAR AULAS</button>`
          : `<small style="opacity:.7;margin-top:8px;display:block;">Aguarda o professor criar as aulas.</small>`}
      </div>`;
    document.getElementById("cal-gerar-inline")?.addEventListener("click", async e => {
      e.target.disabled = true; e.target.textContent = "A gerar...";
      await gerarSemana(semanaOff);
    });
    return;
  }

  let html = "";
  for (let i = 0; i < 7; i++) {
    const d   = new Date(mon); d.setDate(mon.getDate()+i);
    const dow = d.getDay();
    const dt  = isoDate(d);
    if (!(HORARIOS[dow]||[]).length) continue;

    const isHoje = dt === hoje;
    html += `<div class="cal-dia${isHoje ? " cal-dia-hoje" : ""}">
      <div class="cal-dia-hdr">
        <span class="cal-dia-nome">${DIAS_PT[dow]}</span>
        <span class="cal-dia-data">${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}</span>
        ${isHoje ? `<span class="cal-hoje-pill">HOJE</span>` : ""}
      </div>`;

    for (const hora of (HORARIOS[dow]||[])) {
      const id       = aulaId(dt, hora);
      const aula     = aulasCache[id];
      if (!aula) continue;

      const inscritos = aula.inscritos||[];
      const vagas     = aula.vagas||8;
      const livres    = vagas - inscritos.length;
      const inscrito  = session && inscritos.some(a => a.tel === session.tel);
      const passado   = dt < hoje || (dt === hoje && hora < agora);
      const cheia     = livres <= 0;

      let aulaClass = "cal-aula";
      if (inscrito) aulaClass += " cal-inscrito";
      else if (cheia || passado) aulaClass += " cal-dim";

      let vagaClass = "cal-vg-ok";
      if (cheia) vagaClass = "cal-vg-cheio";
      else if (livres <= 2) vagaClass = "cal-vg-quase";

      const nomesHtml = inscritos.length
        ? inscritos.map(a =>
            `<span class="cal-nome${a.tel===session?.tel?" cal-nome-eu":""}">${a.nome.split(" ")[0]}${isProf?` <button class="cal-rm" data-id="${id}" data-tel="${a.tel}">✕</button>`:""}</span>`
          ).join("")
        : `<span class="cal-nome-vazio">— sem inscrições —</span>`;

      let acaoHtml = "";
      if (!passado && session?.tipo==="aluno") {
        acaoHtml = inscrito
          ? `<button class="cal-acao cal-acao-cancel" data-id="${id}" data-acao="cancelar">✕ CANCELAR</button>`
          : cheia ? ""
          : `<button class="cal-acao cal-acao-marcar" data-id="${id}" data-acao="inscrever">✔ MARCAR</button>`;
      }

      let profHtml = "";
      if (isProf) {
        profHtml = `<div class="cal-prof-bar">
          <label>Vagas <input class="cal-inp-v" type="number" data-id="${id}" value="${vagas}" min="1" max="30"></label>
          <select class="cal-sel-t" data-id="${id}">${TIPOS_AULA.map(t=>`<option${t===aula.tipo?" selected":""}>${t}</option>`).join("")}</select>
        </div>`;
      }

      html += `<div class="${aulaClass}">
        <div class="cal-aula-top">
          <span class="cal-hora">${hora}</span>
          <span class="cal-tipo-pill">${aula.tipo||"WOD"}</span>
          <span class="cal-vagas ${vagaClass}">${livres}/${vagas}</span>
        </div>
        <div class="cal-nomes">${nomesHtml}</div>
        ${acaoHtml}${profHtml}
      </div>`;
    }
    html += `</div>`;
  }

  grid.innerHTML = html;

  grid.querySelectorAll("[data-acao]").forEach(btn =>
    btn.addEventListener("click", async () => {
      if (btn.dataset.acao==="inscrever") { btn.disabled=true; await inscrever(btn.dataset.id); }
      if (btn.dataset.acao==="cancelar")  { if(!confirm("Cancelar inscrição?")) return; btn.disabled=true; await cancelar(btn.dataset.id); }
    }));
  grid.querySelectorAll(".cal-rm").forEach(btn =>
    btn.addEventListener("click", async () => {
      if (!confirm("Remover aluno desta aula?")) return;
      await removerDaAula(btn.dataset.id, btn.dataset.tel);
    }));
  grid.querySelectorAll(".cal-inp-v").forEach(inp =>
    inp.addEventListener("change", () =>
      updateDoc(doc(db,"aulas",inp.dataset.id),{vagas:parseInt(inp.value)||8})));
  grid.querySelectorAll(".cal-sel-t").forEach(sel =>
    sel.addEventListener("change", () =>
      updateDoc(doc(db,"aulas",sel.dataset.id),{tipo:sel.value})));
}

// ─── GESTÃO ALUNOS ───────────────────────────────────────────
async function renderAlunos() {
  const div = document.getElementById("cal-alunos-div");
  if (!div) return;
  div.innerHTML = `<div class="cal-loading">A carregar...</div>`;
  const snap = await getDocs(collection(db,"alunos"));
  if (snap.empty) { div.innerHTML="<em>Nenhum aluno registado.</em>"; return; }
  let html = "";
  snap.forEach(d => {
    const a = d.data();
    html += `<div class="cal-aluno-row${a.bloqueado?" cal-row-bloq":""}">
      <div><strong>${a.nome}</strong> <small>${a.tel}</small>${a.bloqueado?` <span class="cal-pill-bloq">BLOQUEADO</span>`:""}</div>
      ${a.bloqueado
        ? `<button class="cal-btn-reativar" data-tel="${a.tel}">✅ Reativar</button>`
        : `<button class="cal-btn-bloquear" data-tel="${a.tel}" data-nome="${a.nome}">🚫 Remover</button>`}
    </div>`;
  });
  div.innerHTML = html;
  div.querySelectorAll(".cal-btn-bloquear").forEach(btn =>
    btn.addEventListener("click", async () => {
      if (!confirm(`Remover ${btn.dataset.nome}?\nNão poderá entrar na app.`)) return;
      btn.disabled=true; await bloquearAluno(btn.dataset.tel); await renderAlunos();
    }));
  div.querySelectorAll(".cal-btn-reativar").forEach(btn =>
    btn.addEventListener("click", async () => {
      await updateDoc(doc(db,"alunos",btn.dataset.tel),{bloqueado:false}); await renderAlunos();
    }));
}

// ─── CONVITES ────────────────────────────────────────────────
function renderConvites() {
  const div = document.getElementById("cal-convites-div");
  if (!div) return;
  div.innerHTML = `
    <p class="cal-helper">Gera um código único para partilhar com o novo aluno.<br>O código só funciona uma vez.</p>
    <button class="cal-btn-principal" id="cal-novo-conv">🔗 GERAR CONVITE</button>
    <div id="cal-conv-result"></div>`;
  document.getElementById("cal-novo-conv").addEventListener("click", async () => {
    const btn = document.getElementById("cal-novo-conv");
    btn.disabled=true; btn.textContent="A gerar...";
    const c = await criarConvite();
    document.getElementById("cal-conv-result").innerHTML=`
      <div class="cal-conv-box">
        <div class="cal-conv-code">${c}</div>
        <p class="cal-helper">Envia este código ao aluno. Na app, ele clica em "Tenho um código de convite".</p>
        <button class="cal-btn-secundario" onclick="navigator.clipboard.writeText('${c}');this.textContent='✅ Copiado!'">📋 COPIAR CÓDIGO</button>
      </div>`;
    btn.disabled=false; btn.textContent="🔗 GERAR NOVO CONVITE";
  });
}

// ─── VIEWS ───────────────────────────────────────────────────
function renderLogin() {
  const wrap = document.getElementById("cal-wrap");
  wrap.innerHTML = `
    <div class="cal-login-box">
      <div class="cal-login-icon">⚔️</div>
      <div class="cal-login-title">CALENDÁRIO DE AULAS</div>
      <div class="cal-login-sub">CROSSFIT MOITA</div>

      <div id="cal-form-normal">
        <input class="cal-input" id="cal-nome" type="text" placeholder="Nome completo" autocomplete="name"/>
        <input class="cal-input" id="cal-tel" type="tel" placeholder="Nº Telemóvel" autocomplete="tel"/>
        <button class="cal-btn-principal" id="cal-entrar">▶ ENTRAR</button>
        <div class="cal-divider-txt">— ou —</div>
        <button class="cal-btn-secundario" id="cal-toggle-conv">🎟️ TENHO UM CÓDIGO DE CONVITE</button>
      </div>

      <div id="cal-form-conv" style="display:none;">
        <input class="cal-input" id="cal-conv-nome" type="text" placeholder="Nome completo" autocomplete="name"/>
        <input class="cal-input" id="cal-conv-tel" type="tel" placeholder="Nº Telemóvel" autocomplete="tel"/>
        <input class="cal-input cal-input-code" id="cal-conv-code" type="text" placeholder="CÓDIGO" maxlength="6"/>
        <button class="cal-btn-principal" id="cal-conv-entrar">▶ VALIDAR E ENTRAR</button>
        <button class="cal-btn-secundario" id="cal-conv-back">← VOLTAR</button>
      </div>

      <div class="cal-divider-txt" style="margin-top:24px;">— acesso restrito —</div>
      <button class="cal-btn-prof" id="cal-prof">🔐 ACESSO PROFESSOR</button>
    </div>`;

  document.getElementById("cal-toggle-conv").addEventListener("click", () => {
    document.getElementById("cal-form-normal").style.display="none";
    document.getElementById("cal-form-conv").style.display="block";
  });
  document.getElementById("cal-conv-back").addEventListener("click", () => {
    document.getElementById("cal-form-normal").style.display="block";
    document.getElementById("cal-form-conv").style.display="none";
  });

  document.getElementById("cal-entrar").addEventListener("click", async () => {
    const nome = document.getElementById("cal-nome").value.trim();
    const tel  = document.getElementById("cal-tel").value.trim().replace(/\s/g,"");
    if (!nome || tel.length < 9) { alert("Preenche o nome e o nº de telemóvel."); return; }
    const btn = document.getElementById("cal-entrar");
    btn.disabled=true; btn.textContent="A verificar...";
    const bloq = await isAlunoBloqueado(tel);
    if (bloq) { alert("❌ Acesso não autorizado.\nContacta o professor para seres adicionado."); btn.disabled=false; btn.textContent="▶ ENTRAR"; return; }
    saveSession({ nome, tel, tipo:"aluno" });
    renderCalendario();
  });

  document.getElementById("cal-conv-entrar").addEventListener("click", async () => {
    const nome   = document.getElementById("cal-conv-nome").value.trim();
    const tel    = document.getElementById("cal-conv-tel").value.trim().replace(/\s/g,"");
    const codigo = document.getElementById("cal-conv-code").value.trim().toUpperCase();
    if (!nome||tel.length<9||!codigo) { alert("Preenche todos os campos."); return; }
    const btn = document.getElementById("cal-conv-entrar");
    btn.disabled=true; btn.textContent="A validar...";
    const ok = await validarConvite(codigo);
    if (!ok) { alert("❌ Código inválido ou já utilizado."); btn.disabled=false; btn.textContent="▶ VALIDAR E ENTRAR"; return; }
    await registarAluno(nome, tel);
    saveSession({ nome, tel, tipo:"aluno" });
    renderCalendario();
  });

  document.getElementById("cal-prof").addEventListener("click", () => {
    const pin = prompt("🔐 PIN do professor:");
    if (pin===PIN_PROFESSOR) { saveSession({nome:"Professor",tel:"prof",tipo:"prof"}); renderCalendario(); }
    else if (pin!==null) alert("PIN incorreto.");
  });
}

function renderCalendario() {
  const wrap   = document.getElementById("cal-wrap");
  const isProf = session?.tipo==="prof";

  wrap.innerHTML = `
    <div class="cal-toolbar">
      <div class="cal-topbar">
        <span class="cal-user-pill">${isProf?"🏋️ PROFESSOR":`👤 ${session.nome.split(" ")[0].toUpperCase()}`}</span>
        <button class="cal-btn-sair" id="cal-sair">SAIR</button>
      </div>
      <div class="cal-nav">
        <button class="cal-nav-btn" id="cal-prev">◀</button>
        <span class="cal-semana-label" id="cal-semana-lbl">${semanaLabel(semanaOff)}</span>
        <button class="cal-nav-btn" id="cal-next">▶</button>
      </div>
      ${isProf?`
      <div class="cal-prof-tools">
        <button class="cal-btn-gerar" id="cal-gerar">⚙️ GERAR AULAS</button>
        <button class="cal-btn-tool" id="cal-tab-alunos">👥 ALUNOS</button>
        <button class="cal-btn-tool" id="cal-tab-conv">🔗 CONVITES</button>
      </div>`:""}
    </div>

    <div id="cal-grid" class="cal-grid"><div class="cal-loading">🔄 A carregar...</div></div>

    ${isProf?`
    <div id="cal-painel-alunos" class="cal-painel" style="display:none;">
      <div class="cal-painel-titulo">👥 GESTÃO DE ALUNOS</div>
      <p class="cal-helper">Alunos bloqueados não conseguem entrar na app.</p>
      <div id="cal-alunos-div"></div>
    </div>
    <div id="cal-painel-conv" class="cal-painel" style="display:none;">
      <div class="cal-painel-titulo">🔗 CONVITES</div>
      <div id="cal-convites-div"></div>
    </div>`:""}
  `;

  document.getElementById("cal-sair").addEventListener("click", () => {
    saveSession(null); if(unsub) unsub(); renderLogin();
  });
  document.getElementById("cal-prev").addEventListener("click", () => { semanaOff--; atualizarSemana(); });
  document.getElementById("cal-next").addEventListener("click", () => { semanaOff++; atualizarSemana(); });

  if (isProf) {
    document.getElementById("cal-gerar").addEventListener("click", async () => {
      const btn = document.getElementById("cal-gerar");
      btn.disabled=true; btn.textContent="A gerar...";
      await gerarSemana(semanaOff);
      btn.textContent="✅ GERADO!";
      setTimeout(()=>{btn.disabled=false;btn.textContent="⚙️ GERAR AULAS";},2000);
    });

    const togglePainel = (id, renderFn) => {
      const p = document.getElementById(id);
      const visible = p.style.display!=="none";
      document.querySelectorAll(".cal-painel").forEach(x=>x.style.display="none");
      if (!visible) { p.style.display="block"; renderFn && renderFn(); }
    };

    document.getElementById("cal-tab-alunos").addEventListener("click", () => togglePainel("cal-painel-alunos", renderAlunos));
    document.getElementById("cal-tab-conv").addEventListener("click",   () => togglePainel("cal-painel-conv",   renderConvites));
  }

  atualizarSemana();
}

function atualizarSemana() {
  const lbl = document.getElementById("cal-semana-lbl");
  if (lbl) lbl.textContent = semanaLabel(semanaOff);
  escutarSemana(semanaOff);
}

// ─── INIT ────────────────────────────────────────────────────
export function initCalendario() {
  try { const s = localStorage.getItem(STORAGE_SESSION); if(s) session = JSON.parse(s); } catch {}
  if (session) renderCalendario();
  else         renderLogin();
}
