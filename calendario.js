/* ============================================================
   CROSSBOX – CALENDÁRIO PARTILHADO (Firebase Firestore)
   Módulo autónomo – não interfere com o resto da app
   ============================================================ */

// ─── CONFIGURAÇÃO FIREBASE ───────────────────────────────────
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, doc, getDocs, getDoc,
  setDoc, updateDoc, deleteDoc, onSnapshot,
  query, orderBy, where, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA5zi1kpgIO2U4ZL4IepIgrSxmAQP8tfPw",
  authDomain: "crossfit-moita.firebaseapp.com",
  projectId: "crossfit-moita",
  storageBucket: "crossfit-moita.firebasestorage.app",
  messagingSenderId: "417574003149",
  appId: "1:417574003149:web:76ab3a33e8d42a52502484",
  measurementId: "G-ZVCE577D7K"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// ─── CONSTANTES ──────────────────────────────────────────────
const PIN_PROFESSOR = "1234"; // ← MUDA ESTE PIN
const STORAGE_ALUNO = "crossbox_aluno_session";

// Horários fixos da CrossFit Moita
const HORARIOS = {
  // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb
  1: ["07:00","10:00","17:30","18:30","19:30"], // 2ª
  2: ["07:00","10:00","17:00","18:00","19:00"], // 3ª
  3: ["07:00","10:00","17:30","18:30","19:30"], // 4ª
  4: ["07:00","10:00","17:00","18:00","19:00"], // 5ª
  5: ["07:00","10:00","17:30","18:30","19:30"], // 6ª
  6: ["09:00","10:00","11:00"],                 // Sáb
};

const TIPO_AULA_DEFAULT = {
  "11:00": "Hyrox"
};

const TIPOS_AULA = ["WOD","Open Box","Halterofilismo","Mobilidade","Hyrox","Competição"];
const DIAS_PT = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const MESES_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
                  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

// ─── ESTADO ──────────────────────────────────────────────────
let alunoAtual = JSON.parse(sessionStorage.getItem(STORAGE_ALUNO) || "null");
let modoProf   = false;
let semanaOffset = 0;
let aulasCache = {};   // { "YYYY-MM-DD_HH:MM": aulaObj }
let unsubscribe = null;

// ─── UTILS ───────────────────────────────────────────────────
function isoDate(d) {
  return d.toISOString().slice(0,10);
}

function getMondayOf(offset) {
  const hoje = new Date();
  const day  = hoje.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const mon  = new Date(hoje);
  mon.setDate(hoje.getDate() + diff + offset * 7);
  mon.setHours(0,0,0,0);
  return mon;
}

function semanaLabel(offset) {
  const mon = getMondayOf(offset);
  const sun = new Date(mon); sun.setDate(mon.getDate()+6);
  const fmt = d => `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}`;
  return `${fmt(mon)} – ${fmt(sun)}`;
}

function aulaId(data, hora) {
  return `${data}_${hora.replace(":","h")}`;
}

// ─── FIREBASE HELPERS ────────────────────────────────────────
async function criarAulaSeNaoExiste(data, hora, tipo) {
  const id = aulaId(data, hora);
  const ref = doc(db, "aulas", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      data, hora, tipo: tipo || "WOD",
      vagas: 8, inscritos: [],
      criadaEm: serverTimestamp()
    });
  }
  return id;
}

async function gerarSemana(offset) {
  const mon = getMondayOf(offset);
  for (let i = 0; i < 7; i++) {
    const d = new Date(mon); d.setDate(mon.getDate()+i);
    const dow = d.getDay();
    const dataStr = isoDate(d);
    const horas = HORARIOS[dow] || [];
    for (const h of horas) {
      const tipo = TIPO_AULA_DEFAULT[h] || "WOD";
      await criarAulaSeNaoExiste(dataStr, h, tipo);
    }
  }
}

async function inscrever(aulaDocId) {
  if (!alunoAtual) return;
  const ref = doc(db, "aulas", aulaDocId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const aula = snap.data();
  const lista = aula.inscritos || [];
  if (lista.some(a => a.tel === alunoAtual.tel)) {
    alert("Já estás inscrito nesta aula.");
    return;
  }
  if (lista.length >= aula.vagas) {
    alert("Aula sem vagas disponíveis.");
    return;
  }
  lista.push({ nome: alunoAtual.nome, tel: alunoAtual.tel });
  await updateDoc(ref, { inscritos: lista });
}

async function cancelar(aulaDocId) {
  if (!alunoAtual) return;
  const ref = doc(db, "aulas", aulaDocId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const aula = snap.data();
  const lista = (aula.inscritos || []).filter(a => a.tel !== alunoAtual.tel);
  await updateDoc(ref, { inscritos: lista });
}

async function removerAlunoDaAula(aulaDocId, tel) {
  const ref = doc(db, "aulas", aulaDocId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const lista = (snap.data().inscritos || []).filter(a => a.tel !== tel);
  await updateDoc(ref, { inscritos: lista });
}

async function atualizarVagas(aulaDocId, novasVagas) {
  await updateDoc(doc(db, "aulas", aulaDocId), { vagas: novasVagas });
}

async function atualizarTipo(aulaDocId, novoTipo) {
  await updateDoc(doc(db, "aulas", aulaDocId), { tipo: novoTipo });
}

// ─── GESTÃO DE ALUNOS (professor) ────────────────────────────
async function listarTodosAlunos() {
  // Recolhe todos os alunos únicos de todas as aulas
  const snap = await getDocs(collection(db, "aulas"));
  const map = {};
  snap.forEach(d => {
    (d.data().inscritos || []).forEach(a => {
      map[a.tel] = a.nome;
    });
  });
  // Também verifica coleção "alunos" registados
  const alunosSnap = await getDocs(collection(db, "alunos"));
  alunosSnap.forEach(d => {
    const a = d.data();
    map[a.tel] = a.nome;
  });
  return Object.entries(map).map(([tel, nome]) => ({tel, nome}));
}

async function registarAluno(nome, tel) {
  await setDoc(doc(db, "alunos", tel), { nome, tel, ativo: true, criadoEm: serverTimestamp() });
}

async function desativarAluno(tel) {
  // Remove o aluno de todas as aulas futuras
  const hoje = isoDate(new Date());
  const snap = await getDocs(collection(db, "aulas"));
  const promises = [];
  snap.forEach(d => {
    const aula = d.data();
    if (aula.data >= hoje) {
      const lista = (aula.inscritos || []).filter(a => a.tel !== tel);
      if (lista.length !== (aula.inscritos || []).length) {
        promises.push(updateDoc(doc(db, "aulas", d.id), { inscritos: lista }));
      }
    }
  });
  await Promise.all(promises);
  // Marca como inativo
  await updateDoc(doc(db, "alunos", tel), { ativo: false });
}

// ─── RENDER ──────────────────────────────────────────────────
function renderCalendario(aulas) {
  const container = document.getElementById("cal-grid");
  if (!container) return;

  const mon = getMondayOf(semanaOffset);
  container.innerHTML = "";

  // Gera os 7 dias (Seg → Dom, mas CrossFit não tem Dom)
  for (let i = 0; i < 7; i++) {
    const d = new Date(mon); d.setDate(mon.getDate()+i);
    const dow = d.getDay();
    const dataStr = isoDate(d);
    const horas = HORARIOS[dow];
    if (!horas || !horas.length) continue; // não tem aulas

    const diaDiv = document.createElement("div");
    diaDiv.className = "cal-dia";

    const hoje = isoDate(new Date());
    const isHoje = dataStr === hoje;
    diaDiv.innerHTML = `<div class="cal-dia-titulo ${isHoje ? "cal-hoje" : ""}">
      ${DIAS_PT[dow]} <span>${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}</span>
    </div>`;

    horas.forEach(hora => {
      const id = aulaId(dataStr, hora);
      const aula = aulas[id];
      if (!aula) return;

      const inscritos = aula.inscritos || [];
      const vagas = aula.vagas || 8;
      const livre = vagas - inscritos.length;
      const inscrito = alunoAtual && inscritos.some(a => a.tel === alunoAtual.tel);
      const passado  = dataStr < hoje || (dataStr === hoje && hora < new Date().toTimeString().slice(0,5));

      const aulaDiv = document.createElement("div");
      aulaDiv.className = `cal-aula ${livre === 0 ? "cal-cheia" : ""} ${inscrito ? "cal-inscrito" : ""}`;

      // Lista de nomes dos inscritos
      const nomesHtml = inscritos.length
        ? `<div class="cal-inscritos-lista">👥 ${inscritos.map(a => a.nome.split(" ")[0]).join(", ")}</div>`
        : `<div class="cal-inscritos-lista cal-vazio">Ninguém inscrito ainda</div>`;

      // Botão ação aluno
      let btnHtml = "";
      if (!passado && alunoAtual) {
        if (inscrito) {
          btnHtml = `<button class="cal-btn cal-btn-cancel" data-id="${id}" data-acao="cancelar">❌ Cancelar</button>`;
        } else if (livre > 0) {
          btnHtml = `<button class="cal-btn cal-btn-inscr" data-id="${id}" data-acao="inscrever">✅ Marcar</button>`;
        } else {
          btnHtml = `<span class="cal-sem-vagas">Sem vagas</span>`;
        }
      }

      // Painel professor
      let profHtml = "";
      if (modoProf) {
        const inscritosHtml = inscritos.map(a =>
          `<span class="cal-aluno-tag">${a.nome} <button class="cal-rm-aluno" data-id="${id}" data-tel="${a.tel}" title="Remover">✕</button></span>`
        ).join("");

        profHtml = `
          <div class="cal-prof-panel">
            <div class="cal-prof-inscritos">${inscritosHtml || "<em>Sem inscritos</em>"}</div>
            <div class="cal-prof-controls">
              <label>Vagas: <input type="number" class="cal-vagas-input" data-id="${id}" value="${vagas}" min="1" max="30" style="width:50px;"></label>
              <select class="cal-tipo-select" data-id="${id}">
                ${TIPOS_AULA.map(t => `<option ${t===aula.tipo?"selected":""}>${t}</option>`).join("")}
              </select>
            </div>
          </div>`;
      }

      aulaDiv.innerHTML = `
        <div class="cal-aula-header">
          <span class="cal-hora">🕐 ${hora}</span>
          <span class="cal-tipo-badge">${aula.tipo || "WOD"}</span>
          <span class="cal-vagas-badge ${livre===0?"cal-badge-cheio":livre<=2?"cal-badge-quase":""}">${livre}/${vagas} vagas</span>
        </div>
        ${nomesHtml}
        ${btnHtml}
        ${profHtml}
      `;

      diaDiv.appendChild(aulaDiv);
    });

    container.appendChild(diaDiv);
  }

  // Eventos
  container.querySelectorAll("[data-acao='inscrever']").forEach(btn => {
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      await inscrever(btn.dataset.id);
    });
  });

  container.querySelectorAll("[data-acao='cancelar']").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm("Cancelar a tua inscrição nesta aula?")) return;
      btn.disabled = true;
      await cancelar(btn.dataset.id);
    });
  });

  container.querySelectorAll(".cal-rm-aluno").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm(`Remover este aluno da aula?`)) return;
      await removerAlunoDaAula(btn.dataset.id, btn.dataset.tel);
    });
  });

  container.querySelectorAll(".cal-vagas-input").forEach(inp => {
    inp.addEventListener("change", async () => {
      const v = parseInt(inp.value,10);
      if (v > 0) await atualizarVagas(inp.dataset.id, v);
    });
  });

  container.querySelectorAll(".cal-tipo-select").forEach(sel => {
    sel.addEventListener("change", async () => {
      await atualizarTipo(sel.dataset.id, sel.value);
    });
  });
}

// ─── LISTENER TEMPO REAL ─────────────────────────────────────
function escutarSemana(offset) {
  if (unsubscribe) unsubscribe();
  aulasCache = {};

  const mon = getMondayOf(offset);
  const sun = new Date(mon); sun.setDate(mon.getDate()+6);
  const inicio = isoDate(mon);
  const fim    = isoDate(sun);

  const q = query(
    collection(db, "aulas"),
    where("data", ">=", inicio),
    where("data", "<=", fim),
    orderBy("data"), orderBy("hora")
  );

  unsubscribe = onSnapshot(q, snap => {
    snap.forEach(d => { aulasCache[d.id] = d.data(); });
    renderCalendario(aulasCache);
  });
}

// ─── SECÇÃO DE GESTÃO DE ALUNOS (professor) ──────────────────
async function renderGestaoAlunos() {
  const div = document.getElementById("cal-alunos-lista");
  if (!div) return;
  div.innerHTML = "<em>A carregar...</em>";

  const todos = await listarTodosAlunos();
  if (!todos.length) {
    div.innerHTML = "<em>Nenhum aluno registado.</em>";
    return;
  }

  div.innerHTML = todos.map(a => `
    <div class="cal-aluno-row">
      <span>${a.nome} <small>${a.tel}</small></span>
      <button class="btn-delete cal-desativar-btn" data-tel="${a.tel}" data-nome="${a.nome}">🗑 Remover</button>
    </div>
  `).join("");

  div.querySelectorAll(".cal-desativar-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm(`Remover ${btn.dataset.nome} de todas as aulas futuras?`)) return;
      btn.disabled = true;
      await desativarAluno(btn.dataset.tel);
      await renderGestaoAlunos();
    });
  });
}

// ─── INIT ────────────────────────────────────────────────────
export async function initCalendario() {
  const sec = document.getElementById("sec-calendario");
  if (!sec) return;

  // Render login ou calendário
  renderUI();
}

function renderUI() {
  const wrap = document.getElementById("cal-wrap");
  if (!wrap) return;

  if (!alunoAtual) {
    renderLogin();
  } else {
    renderCalView();
  }
}

function renderLogin() {
  const wrap = document.getElementById("cal-wrap");
  wrap.innerHTML = `
    <div class="card" style="max-width:400px;margin:0 auto;">
      <h3 style="margin-top:0;">📅 Calendário de Aulas</h3>
      <p class="helper-text">Entra com o teu nome e número de telemóvel para marcar aulas.</p>
      <div class="form-row">
        <div class="field">
          <label>Nome</label>
          <input id="cal-login-nome" type="text" placeholder="O teu nome" autocomplete="name"/>
        </div>
      </div>
      <div class="form-row">
        <div class="field">
          <label>Nº Telemóvel</label>
          <input id="cal-login-tel" type="tel" placeholder="9XXXXXXXX" autocomplete="tel"/>
        </div>
      </div>
      <button class="btn-primary" id="cal-login-btn" style="width:100%">Entrar</button>
      <hr style="margin:14px 0; border:none; border-top:1px solid #ccc;">
      <p class="helper-text" style="text-align:center;">És professor?</p>
      <button class="btn-secondary" id="cal-prof-btn" style="width:100%">🔐 Acesso Professor</button>
    </div>
  `;

  document.getElementById("cal-login-btn").addEventListener("click", async () => {
    const nome = document.getElementById("cal-login-nome").value.trim();
    const tel  = document.getElementById("cal-login-tel").value.trim().replace(/\s/g,"");
    if (!nome || !tel || tel.length < 9) {
      alert("Preenche o nome e o número de telemóvel (mínimo 9 dígitos).");
      return;
    }
    alunoAtual = { nome, tel };
    sessionStorage.setItem(STORAGE_ALUNO, JSON.stringify(alunoAtual));
    // Registar na BD se não existir
    await registarAluno(nome, tel);
    modoProf = false;
    renderCalView();
  });

  document.getElementById("cal-prof-btn").addEventListener("click", () => {
    const pin = prompt("Introduz o PIN do professor:");
    if (pin === PIN_PROFESSOR) {
      modoProf = true;
      alunoAtual = { nome: "Professor", tel: "prof" };
      sessionStorage.setItem(STORAGE_ALUNO, JSON.stringify(alunoAtual));
      renderCalView();
    } else if (pin !== null) {
      alert("PIN incorreto.");
    }
  });
}

function renderCalView() {
  const wrap = document.getElementById("cal-wrap");
  const isProf = modoProf;

  wrap.innerHTML = `
    <div class="cal-header">
      <div class="cal-user-info">
        ${isProf ? "🏋️ Modo Professor" : `👤 ${alunoAtual.nome}`}
        <button class="btn-secondary" id="cal-logout" style="margin-left:8px;font-size:0.75rem;padding:4px 10px;">Sair</button>
      </div>
      <div class="cal-nav">
        <button class="btn-secondary" id="cal-prev">◀ Semana anterior</button>
        <span id="cal-semana-label" class="cal-semana-label"></span>
        <button class="btn-secondary" id="cal-next">Próxima semana ▶</button>
      </div>
      ${isProf ? `
        <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn-primary" id="cal-gerar-semana">⚙️ Gerar aulas desta semana</button>
          <button class="btn-secondary" id="cal-ver-alunos">👥 Gerir alunos</button>
        </div>` : ""}
    </div>

    <div id="cal-grid" class="cal-grid">
      <div style="text-align:center;padding:20px;color:#555;">A carregar aulas...</div>
    </div>

    ${isProf ? `
      <div id="cal-alunos-section" class="card" style="display:none;margin-top:16px;">
        <h4 style="margin-top:0;">👥 Gestão de Alunos</h4>
        <p class="helper-text">Remove alunos que desistiram — serão removidos de todas as aulas futuras.</p>
        <div id="cal-alunos-lista"></div>
      </div>` : ""}
  `;

  document.getElementById("cal-logout").addEventListener("click", () => {
    alunoAtual = null;
    modoProf = false;
    sessionStorage.removeItem(STORAGE_ALUNO);
    if (unsubscribe) unsubscribe();
    renderLogin();
  });

  document.getElementById("cal-prev").addEventListener("click", () => {
    semanaOffset--;
    atualizarSemana();
  });

  document.getElementById("cal-next").addEventListener("click", () => {
    semanaOffset++;
    atualizarSemana();
  });

  if (isProf) {
    document.getElementById("cal-gerar-semana").addEventListener("click", async () => {
      const btn = document.getElementById("cal-gerar-semana");
      btn.disabled = true;
      btn.textContent = "A gerar...";
      await gerarSemana(semanaOffset);
      btn.textContent = "✅ Aulas geradas!";
      setTimeout(() => { btn.disabled = false; btn.textContent = "⚙️ Gerar aulas desta semana"; }, 2000);
    });

    document.getElementById("cal-ver-alunos").addEventListener("click", () => {
      const sec = document.getElementById("cal-alunos-section");
      const visible = sec.style.display !== "none";
      sec.style.display = visible ? "none" : "block";
      if (!visible) renderGestaoAlunos();
    });
  }

  atualizarSemana();
}

function atualizarSemana() {
  const label = document.getElementById("cal-semana-label");
  if (label) label.textContent = semanaLabel(semanaOffset);
  escutarSemana(semanaOffset);
}
