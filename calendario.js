/* ============================================================
   CROSSBOX – CALENDÁRIO PARTILHADO v3
   Login inteligente · PIN pessoal · Biometria · Push notifications
   Avisos de aulas canceladas · Professor inscreve alunos
   ============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, doc, getDocs, getDoc,
  setDoc, updateDoc, serverTimestamp
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
const PIN_PROFESSOR    = "nj_1985";
const STORAGE_SESSION  = "crossbox_cal_session";
const STORAGE_PIN      = "crossbox_pin";
const STORAGE_NOTIF    = "crossbox_notif_vistas";
const VAPID_KEY        = ""; // preencher se quiser push real

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
const MESES_PT   = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
                    "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

// ─── ESTADO ──────────────────────────────────────────────────
let session    = null;
let semanaOff  = 0;
let aulasCache = {};
let poolIntv   = null;

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

// ─── PIN PESSOAL ─────────────────────────────────────────────
function getPin() { return localStorage.getItem(STORAGE_PIN) || null; }
function savePin(pin) { localStorage.setItem(STORAGE_PIN, pin); }
function removePin() { localStorage.removeItem(STORAGE_PIN); }

// ─── BIOMETRIA (WebAuthn) ─────────────────────────────────────
function biometriaDisponivel() {
  return window.PublicKeyCredential !== undefined;
}

async function registarBiometria(tel) {
  if (!biometriaDisponivel()) return false;
  try {
    const encoder = new TextEncoder();
    const cred = await navigator.credentials.create({
      publicKey: {
        challenge: encoder.encode("crossbox-" + tel + "-" + Date.now()),
        rp: { name: "CrossBox" },
        user: {
          id: encoder.encode(tel),
          name: tel,
          displayName: session?.nome || tel
        },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required"
        },
        timeout: 60000
      }
    });
    if (cred) {
      localStorage.setItem("crossbox_bio_" + tel, "registered");
      return true;
    }
  } catch(e) { console.log("Bio registo:", e.message); }
  return false;
}

async function autenticarBiometria(tel) {
  if (!biometriaDisponivel()) return false;
  if (!localStorage.getItem("crossbox_bio_" + tel)) return false;
  try {
    const encoder = new TextEncoder();
    const cred = await navigator.credentials.get({
      publicKey: {
        challenge: encoder.encode("crossbox-auth-" + Date.now()),
        userVerification: "required",
        timeout: 60000
      }
    });
    return !!cred;
  } catch(e) { console.log("Bio auth:", e.message); return false; }
}

function temBiometriaRegistada(tel) {
  return !!localStorage.getItem("crossbox_bio_" + tel);
}

// ─── NOTIFICAÇÕES PUSH ────────────────────────────────────────
async function pedirPermissaoNotif() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

function enviarNotifLocal(titulo, corpo) {
  if (Notification.permission === "granted") {
    new Notification(titulo, {
      body: corpo,
      icon: "./imagens/logo.png",
      badge: "./imagens/crossbox_logo-192.png"
    });
  }
}

// ─── VERIFICAR AULAS CANCELADAS (aviso na abertura) ───────────
async function verificarAulasCanceladas() {
  if (!session || session.tipo === "prof") return;
  const hoje = isoDate(new Date());
  const vistas = JSON.parse(localStorage.getItem(STORAGE_NOTIF) || "[]");

  const snap = await getDocs(collection(db, "aulas"));
  const canceladas = [];

  snap.forEach(d => {
    const a = d.data();
    if (
      a.cancelada &&
      a.data >= hoje &&
      (a.inscritos || []).some(x => x.tel === session.tel) &&
      !vistas.includes(d.id)
    ) {
      canceladas.push({ id: d.id, ...a });
    }
  });

  if (!canceladas.length) return;

  // Marcar como vistas
  const novasVistas = [...vistas, ...canceladas.map(a => a.id)];
  localStorage.setItem(STORAGE_NOTIF, JSON.stringify(novasVistas));

  // Aviso na app
  const wrap = document.getElementById("cal-wrap");
  const avisos = canceladas.map(a =>
    `<div class="cal-aviso-item">🚫 <strong>${DIAS_PT[new Date(a.data+"T12:00:00").getDay()]} ${a.data.slice(8)} — ${a.hora}</strong> foi cancelada</div>`
  ).join("");

  const div = document.createElement("div");
  div.className = "cal-aviso-banner";
  div.innerHTML = `
    <div class="cal-aviso-titulo">⚠️ ATENÇÃO — AULAS CANCELADAS</div>
    ${avisos}
    <button class="cal-btn-secundario" id="cal-aviso-fechar" style="margin-top:10px;">OK, entendido</button>
  `;
  wrap.prepend(div);
  document.getElementById("cal-aviso-fechar").addEventListener("click", () => div.remove());

  // Notificação push
  canceladas.forEach(a => {
    enviarNotifLocal(
      "🚫 Aula Cancelada — CrossFit Moita",
      `A aula de ${DIAS_PT[new Date(a.data+"T12:00:00").getDay()]} às ${a.hora} foi cancelada.`
    );
  });
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

async function cancelarAula(id, cancelado) {
  await updateDoc(doc(db,"aulas",id), { cancelada: cancelado });
  // Reset notificações para este id para que os alunos vejam de novo se reabrir
  if (!cancelado) {
    const vistas = JSON.parse(localStorage.getItem(STORAGE_NOTIF)||"[]").filter(x=>x!==id);
    localStorage.setItem(STORAGE_NOTIF, JSON.stringify(vistas));
  }
}

async function cancelarDia(dt, cancelado) {
  const snap = await getDocs(collection(db,"aulas"));
  const proms = [];
  snap.forEach(d => {
    if (d.data().data === dt)
      proms.push(updateDoc(doc(db,"aulas",d.id), { cancelada: cancelado }));
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
        await setDoc(ref, { data: dt, hora: h, tipo: h==="11:00"?"Hyrox":"WOD", vagas: 8, inscritos: [], cancelada: false, criadoEm: serverTimestamp() });
    }
  }
}

async function inscrever(id) {
  if (!session) return;
  const ref  = doc(db, "aulas", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const aula  = snap.data();
  if (aula.cancelada) { alert("Esta aula foi cancelada."); return; }
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

// Professor inscreve aluno manualmente
async function profInscreverAluno(id, nome, tel) {
  const ref  = doc(db, "aulas", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return false;
  const aula  = snap.data();
  const lista = aula.inscritos || [];
  if (lista.some(a => a.tel === tel)) return false;
  if (lista.length >= (aula.vagas||8)) { alert("Aula sem vagas."); return false; }
  lista.push({ nome, tel });
  await updateDoc(ref, { inscritos: lista });
  return true;
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

// ─── CARREGAR AULAS (polling) ─────────────────────────────────
function escutarSemana(off) {
  if (poolIntv) clearInterval(poolIntv);
  aulasCache = {};
  const mon = getMonday(off);
  const sun = new Date(mon); sun.setDate(mon.getDate()+6);
  const ini = isoDate(mon), fim = isoDate(sun);

  async function carregar() {
    try {
      const snap = await getDocs(collection(db,"aulas"));
      aulasCache = {};
      snap.forEach(d => {
        const a = d.data();
        if (a.data >= ini && a.data <= fim) aulasCache[d.id] = a;
      });
      renderGrid();
    } catch(e) {
      const g = document.getElementById("cal-grid");
      if (g) g.innerHTML = `<div class="cal-erro">⚠️ Erro: ${e.message}</div>`;
    }
  }
  carregar();
  poolIntv = setInterval(carregar, 15000);
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
      escutarSemana(semanaOff);
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
    const aulasDoDia = (HORARIOS[dow]||[]).map(h => aulasCache[aulaId(dt,h)]).filter(Boolean);
    const diaCancelado = aulasDoDia.length > 0 && aulasDoDia.every(a => a.cancelada);

    html += `<div class="cal-dia${isHoje?" cal-dia-hoje":""}${diaCancelado?" cal-dia-cancelado":""}">
      <div class="cal-dia-hdr">
        <span class="cal-dia-nome">${DIAS_PT[dow]}</span>
        <span class="cal-dia-data">${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}</span>
        ${isHoje?`<span class="cal-hoje-pill">HOJE</span>`:""}
        ${diaCancelado?`<span class="cal-cancelado-pill">CANCELADO</span>`:""}
        ${isProf?`<button class="cal-btn-cancelar-dia${diaCancelado?" cal-btn-reabrir-dia":""}" data-dt="${dt}" data-cancelado="${diaCancelado}">${diaCancelado?"✅ REABRIR DIA":"🚫 CANCELAR DIA"}</button>`:""}
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
      const cancelada = aula.cancelada === true;

      let aulaClass = "cal-aula";
      if (cancelada) aulaClass += " cal-cancelada";
      else if (inscrito) aulaClass += " cal-inscrito";
      else if (cheia || passado) aulaClass += " cal-dim";

      let vagaClass = "cal-vg-ok";
      if (cheia || cancelada) vagaClass = "cal-vg-cheio";
      else if (livres <= 2) vagaClass = "cal-vg-quase";

      const nomesHtml = inscritos.length
        ? inscritos.map(a =>
            `<span class="cal-nome${a.tel===session?.tel?" cal-nome-eu":""}">${a.nome.split(" ")[0]}${isProf?` <button class="cal-rm" data-id="${id}" data-tel="${a.tel}">✕</button>`:""}</span>`
          ).join("")
        : `<span class="cal-nome-vazio">— sem inscrições —</span>`;

      let acaoHtml = "";
      if (!passado && !cancelada && session?.tipo==="aluno") {
        acaoHtml = inscrito
          ? `<button class="cal-acao cal-acao-cancel" data-id="${id}" data-acao="cancelar">✕ CANCELAR</button>`
          : cheia ? `<span class="cal-nome-vazio">Sem vagas disponíveis</span>`
          : `<button class="cal-acao cal-acao-marcar" data-id="${id}" data-acao="inscrever">✔ MARCAR</button>`;
      }

      // Painel professor — incluindo inscrever aluno manualmente
      let profHtml = "";
      if (isProf) {
        const alunosSnap_html = `
          <div class="cal-prof-inscrever">
            <input class="cal-inp-prof-nome" type="text" placeholder="Nome visitante" data-id="${id}"/>
            <input class="cal-inp-prof-tel" type="tel" placeholder="Telemóvel" data-id="${id}"/>
            <button class="cal-btn-prof-add" data-id="${id}">➕ INSCREVER</button>
          </div>`;

        profHtml = `<div class="cal-prof-bar">
          <label>🕐 <input class="cal-inp-hora" type="time" data-id="${id}" data-dt="${dt}" data-oldhora="${hora}" value="${hora}"></label>
          <label>👥 <input class="cal-inp-v" type="number" data-id="${id}" value="${vagas}" min="1" max="30"></label>
          <select class="cal-sel-t" data-id="${id}">${TIPOS_AULA.map(t=>`<option${t===aula.tipo?" selected":""}>${t}</option>`).join("")}</select>
          ${cancelada
            ? `<button class="cal-btn-reabrir" data-id="${id}">✅ REABRIR</button>`
            : `<button class="cal-btn-cancelar-aula" data-id="${id}">🚫 CANCELAR</button>`}
        </div>
        ${!cancelada ? alunosSnap_html : ""}`;
      }

      html += `<div class="${aulaClass}">
        <div class="cal-aula-top">
          <span class="cal-hora">${hora}</span>
          <span class="cal-tipo-pill">${aula.tipo||"WOD"}</span>
          <span class="cal-vagas ${vagaClass}">${cancelada?"CANCELADA":`${livres}/${vagas}`}</span>
        </div>
        <div class="cal-nomes">${nomesHtml}</div>
        ${acaoHtml}${profHtml}
      </div>`;
    }
    html += `</div>`;
  }

  grid.innerHTML = html;

  // Eventos aluno
  grid.querySelectorAll("[data-acao]").forEach(btn =>
    btn.addEventListener("click", async () => {
      if (btn.dataset.acao==="inscrever") { btn.disabled=true; await inscrever(btn.dataset.id); }
      if (btn.dataset.acao==="cancelar")  { if(!confirm("Cancelar inscrição?")) return; btn.disabled=true; await cancelar(btn.dataset.id); }
    }));

  // Eventos professor
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
  grid.querySelectorAll(".cal-btn-cancelar-aula").forEach(btn =>
    btn.addEventListener("click", async () => {
      if (!confirm("Cancelar esta aula? Os alunos inscritos serão notificados.")) return;
      await cancelarAula(btn.dataset.id, true);
      escutarSemana(semanaOff);
    }));
  grid.querySelectorAll(".cal-btn-reabrir").forEach(btn =>
    btn.addEventListener("click", async () => {
      await cancelarAula(btn.dataset.id, false);
      escutarSemana(semanaOff);
    }));
  grid.querySelectorAll(".cal-btn-cancelar-dia").forEach(btn =>
    btn.addEventListener("click", async () => {
      const cancelado = btn.dataset.cancelado === "true";
      if (!confirm(cancelado ? "Reabrir todas as aulas deste dia?" : "Cancelar TODAS as aulas deste dia?")) return;
      btn.disabled = true;
      await cancelarDia(btn.dataset.dt, !cancelado);
      escutarSemana(semanaOff);
    }));
  grid.querySelectorAll(".cal-inp-hora").forEach(inp =>
    inp.addEventListener("change", async () => {
      const novaHora = inp.value;
      if (!novaHora || novaHora === inp.dataset.oldhora) return;
      if (!confirm(`Alterar hora para ${novaHora}?`)) { inp.value = inp.dataset.oldhora; return; }
      const ref  = doc(db,"aulas",inp.dataset.id);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      const novoId = aulaId(inp.dataset.dt, novaHora);
      await setDoc(doc(db,"aulas",novoId), { ...snap.data(), hora: novaHora });
      await updateDoc(ref, { hora: novaHora });
      inp.dataset.oldhora = novaHora;
      escutarSemana(semanaOff);
    }));

  // Professor inscreve aluno manualmente
  grid.querySelectorAll(".cal-btn-prof-add").forEach(btn =>
    btn.addEventListener("click", async () => {
      const id   = btn.dataset.id;
      const nome = grid.querySelector(`.cal-inp-prof-nome[data-id="${id}"]`).value.trim();
      const tel  = grid.querySelector(`.cal-inp-prof-tel[data-id="${id}"]`).value.trim().replace(/\s/g,"");
      if (!nome || tel.length < 9) { alert("Preenche nome e telemóvel."); return; }
      btn.disabled = true;
      // Regista o aluno automaticamente se não existir
      await registarAluno(nome, tel);
      const ok = await profInscreverAluno(id, nome, tel);
      if (ok) {
        grid.querySelector(`.cal-inp-prof-nome[data-id="${id}"]`).value = "";
        grid.querySelector(`.cal-inp-prof-tel[data-id="${id}"]`).value  = "";
      } else { alert("Aluno já inscrito."); }
      btn.disabled = false;
    }));
}

// ─── GESTÃO ALUNOS ───────────────────────────────────────────
async function renderAlunos() {
  const div = document.getElementById("cal-alunos-div");
  if (!div) return;
  div.innerHTML = `<div class="cal-loading">A carregar...</div>`;
  const snap = await getDocs(collection(db,"alunos"));
  if (snap.empty) { div.innerHTML="<em>Nenhum aluno registado.</em>"; return; }
  let html = `<div class="cal-alunos-count">${snap.size} aluno(s) registado(s)</div>`;
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

// ─── ECRÃ DE DESBLOQUEIO (sessão existente) ──────────────────
function renderDesbloqueio(onSuccess) {
  const wrap = document.getElementById("cal-wrap");
  const pin  = getPin();
  const temBio = temBiometriaRegistada(session.tel);

  wrap.innerHTML = `
    <div class="cal-login-box">
      <img src="./imagens/logo.png" class="cal-login-logo" alt="CrossFit Moita"/>
      <div class="cal-login-title">BEM-VINDO DE VOLTA</div>
      <div class="cal-login-sub">${session.nome.toUpperCase()}</div>

      ${temBio ? `<button class="cal-btn-principal" id="cal-bio-btn" style="margin-bottom:12px;">👆 ENTRAR COM IMPRESSÃO DIGITAL</button>` : ""}

      ${pin ? `
        <div class="cal-divider-txt">${temBio ? "— ou usa o PIN —" : "— introduz o teu PIN —"}</div>
        <div class="cal-pin-dots" id="cal-pin-dots">
          <span></span><span></span><span></span><span></span>
        </div>
        <div class="cal-pin-teclado" id="cal-pin-teclado"></div>
        <div id="cal-pin-erro" class="cal-pin-erro"></div>
      ` : ""}

      <div class="cal-divider-txt" style="margin-top:16px;">— ou —</div>
      <button class="cal-btn-secundario" id="cal-outro-utilizador">👤 Entrar com outro utilizador</button>
    </div>`;

  // Biometria
  if (temBio) {
    document.getElementById("cal-bio-btn").addEventListener("click", async () => {
      const ok = await autenticarBiometria(session.tel);
      if (ok) onSuccess();
      else alert("Biometria não reconhecida. Usa o PIN.");
    });
    // Tentar biometria automaticamente
    setTimeout(async () => {
      const ok = await autenticarBiometria(session.tel);
      if (ok) onSuccess();
    }, 500);
  }

  // Teclado PIN
  if (pin) {
    let pinAtual = "";
    const teclado = document.getElementById("cal-pin-teclado");
    const dots    = document.getElementById("cal-pin-dots").querySelectorAll("span");
    const erro    = document.getElementById("cal-pin-erro");

    const nums = ["1","2","3","4","5","6","7","8","9","","0","⌫"];
    nums.forEach(n => {
      const btn = document.createElement("button");
      btn.className = "cal-pin-key";
      btn.textContent = n;
      if (!n) { btn.className += " cal-pin-key-vazio"; btn.disabled = true; }
      btn.addEventListener("click", () => {
        if (n === "⌫") {
          pinAtual = pinAtual.slice(0,-1);
        } else if (pinAtual.length < 4) {
          pinAtual += n;
        }
        dots.forEach((d,i) => d.classList.toggle("active", i < pinAtual.length));
        if (pinAtual.length === 4) {
          if (pinAtual === pin) { onSuccess(); }
          else { erro.textContent="PIN incorreto"; pinAtual=""; dots.forEach(d=>d.classList.remove("active")); }
        }
      });
      teclado.appendChild(btn);
    });
  }

  // Outro utilizador
  document.getElementById("cal-outro-utilizador").addEventListener("click", () => {
    saveSession(null);
    renderLogin();
  });
}

// ─── ECRÃ DE CONFIGURAÇÃO PIN/BIOMETRIA ──────────────────────
function renderConfigurarSeguranca() {
  const modal = document.createElement("div");
  modal.className = "cal-modal-overlay";
  const temBio = temBiometriaRegistada(session.tel);
  const pinAtual = getPin();

  modal.innerHTML = `
    <div class="cal-modal">
      <div class="cal-modal-titulo">🔐 SEGURANÇA DA CONTA</div>

      <div class="cal-modal-sec">
        <div class="cal-modal-label">PIN PESSOAL ${pinAtual ? '<span class="cal-pill-ok">ATIVO</span>' : ''}</div>
        <p class="cal-helper">Define um PIN de 4 dígitos para proteger o teu acesso.</p>
        <div class="cal-pin-dots" id="cfg-pin-dots"><span></span><span></span><span></span><span></span></div>
        <div class="cal-pin-teclado" id="cfg-pin-teclado"></div>
        <div id="cfg-pin-estado" class="cal-helper" style="margin-top:6px;text-align:center;"></div>
        ${pinAtual ? `<button class="cal-btn-secundario" id="cfg-remover-pin" style="margin-top:8px;">🗑 Remover PIN</button>` : ""}
      </div>

      ${biometriaDisponivel() ? `
      <div class="cal-modal-sec">
        <div class="cal-modal-label">IMPRESSÃO DIGITAL ${temBio ? '<span class="cal-pill-ok">REGISTADA</span>' : ''}</div>
        <p class="cal-helper">Usa a tua impressão digital para entrar rapidamente.</p>
        <button class="cal-btn-principal" id="cfg-bio-btn">${temBio ? "🔄 Atualizar biometria" : "👆 Registar impressão digital"}</button>
      </div>` : ""}

      <button class="cal-btn-secundario" id="cfg-fechar" style="margin-top:16px;">FECHAR</button>
    </div>`;

  document.body.appendChild(modal);

  // Teclado PIN configuração
  let pinNovo = "";
  let fase = 1;
  let pinPrimeiro = "";
  const teclado = modal.querySelector("#cfg-pin-teclado");
  const dots    = modal.querySelectorAll("#cfg-pin-dots span");
  const estado  = modal.querySelector("#cfg-pin-estado");

  estado.textContent = "Introduz o novo PIN (4 dígitos)";

  const nums = ["1","2","3","4","5","6","7","8","9","","0","⌫"];
  nums.forEach(n => {
    const btn = document.createElement("button");
    btn.className = "cal-pin-key";
    btn.textContent = n;
    if (!n) { btn.className += " cal-pin-key-vazio"; btn.disabled = true; }
    btn.addEventListener("click", () => {
      if (n === "⌫") { pinNovo = pinNovo.slice(0,-1); }
      else if (pinNovo.length < 4) { pinNovo += n; }
      dots.forEach((d,i) => d.classList.toggle("active", i < pinNovo.length));
      if (pinNovo.length === 4) {
        if (fase === 1) {
          pinPrimeiro = pinNovo; pinNovo = "";
          dots.forEach(d => d.classList.remove("active"));
          estado.textContent = "Confirma o PIN";
          fase = 2;
        } else {
          if (pinNovo === pinPrimeiro) {
            savePin(pinNovo);
            estado.textContent = "✅ PIN guardado!";
            estado.style.color = "#4a8a3a";
            pinNovo = ""; fase = 1; pinPrimeiro = "";
          } else {
            estado.textContent = "❌ PINs não coincidem. Tenta de novo.";
            estado.style.color = "#8a2a2a";
            pinNovo = ""; fase = 1; pinPrimeiro = "";
            dots.forEach(d => d.classList.remove("active"));
          }
        }
      }
    });
    teclado.appendChild(btn);
  });

  modal.querySelector("#cfg-remover-pin")?.addEventListener("click", () => {
    if (confirm("Remover PIN?")) { removePin(); modal.remove(); }
  });

  modal.querySelector("#cfg-bio-btn")?.addEventListener("click", async () => {
    const btn = modal.querySelector("#cfg-bio-btn");
    btn.disabled = true; btn.textContent = "A registar...";
    const ok = await registarBiometria(session.tel);
    btn.textContent = ok ? "✅ Biometria registada!" : "❌ Falhou. Tenta de novo.";
    btn.disabled = false;
  });

  modal.querySelector("#cfg-fechar").addEventListener("click", () => modal.remove());
  modal.addEventListener("click", e => { if (e.target === modal) modal.remove(); });
}

// ─── LOGIN (1ª VEZ) ───────────────────────────────────────────
function renderLogin() {
  const wrap = document.getElementById("cal-wrap");
  wrap.innerHTML = `
    <div class="cal-login-box">
      <img src="./imagens/logo.png" class="cal-login-logo" alt="CrossFit Moita"/>
      <div class="cal-login-title">CALENDÁRIO DE AULAS</div>
      <div class="cal-login-sub">CROSSFIT MOITA</div>

      <div id="cal-form-normal">
        <input class="cal-input" id="cal-nome" type="text" placeholder="Primeiro e último nome" autocomplete="name"/>
        <input class="cal-input" id="cal-tel" type="tel" placeholder="Nº Telemóvel" autocomplete="tel"/>
        <button class="cal-btn-principal" id="cal-entrar">▶ ENTRAR</button>
        <div class="cal-divider-txt">— ou —</div>
        <button class="cal-btn-secundario" id="cal-toggle-conv">🎟️ TENHO UM CÓDIGO DE CONVITE</button>
      </div>

      <div id="cal-form-conv" style="display:none;">
        <input class="cal-input" id="cal-conv-nome" type="text" placeholder="Primeiro e último nome" autocomplete="name"/>
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

  const validarNome = nome => {
    const partes = nome.trim().split(/\s+/);
    return partes.length >= 2 && partes.every(p => p.length >= 2);
  };

  document.getElementById("cal-entrar").addEventListener("click", async () => {
    const nome = document.getElementById("cal-nome").value.trim();
    const tel  = document.getElementById("cal-tel").value.trim().replace(/\s/g,"");
    if (!validarNome(nome)) { alert("Introduz o primeiro e último nome."); return; }
    if (tel.length < 9) { alert("Nº de telemóvel inválido."); return; }
    const btn = document.getElementById("cal-entrar");
    btn.disabled=true; btn.textContent="A verificar...";
    const bloq = await isAlunoBloqueado(tel);
    if (bloq) { alert("❌ Acesso não autorizado.\nContacta o professor para seres adicionado."); btn.disabled=false; btn.textContent="▶ ENTRAR"; return; }
    saveSession({ nome, tel, tipo:"aluno" });
    await entrarNaApp();
  });

  document.getElementById("cal-conv-entrar").addEventListener("click", async () => {
    const nome   = document.getElementById("cal-conv-nome").value.trim();
    const tel    = document.getElementById("cal-conv-tel").value.trim().replace(/\s/g,"");
    const codigo = document.getElementById("cal-conv-code").value.trim().toUpperCase();
    if (!validarNome(nome)) { alert("Introduz o primeiro e último nome."); return; }
    if (tel.length < 9 || !codigo) { alert("Preenche todos os campos."); return; }
    const btn = document.getElementById("cal-conv-entrar");
    btn.disabled=true; btn.textContent="A validar...";
    const ok = await validarConvite(codigo);
    if (!ok) { alert("❌ Código inválido ou já utilizado."); btn.disabled=false; btn.textContent="▶ VALIDAR E ENTRAR"; return; }
    await registarAluno(nome, tel);
    saveSession({ nome, tel, tipo:"aluno" });
    await entrarNaApp();
  });

  document.getElementById("cal-prof").addEventListener("click", () => {
    const pin = prompt("🔐 PIN do professor:");
    if (pin===PIN_PROFESSOR) {
      saveSession({nome:"Professor",tel:"prof",tipo:"prof"});
      entrarNaApp();
    } else if (pin!==null) alert("PIN incorreto.");
  });
}

// ─── CALENDÁRIO PRINCIPAL ─────────────────────────────────────
function renderCalendario() {
  const wrap   = document.getElementById("cal-wrap");
  const isProf = session?.tipo === "prof";

  wrap.innerHTML = `
    <div class="cal-toolbar">
      <div class="cal-topbar">
        <span class="cal-user-pill">${isProf?"🏋️ PROFESSOR":`👤 ${session.nome.split(" ")[0].toUpperCase()}`}</span>
        <div style="display:flex;gap:6px;align-items:center;">
          ${!isProf ? `<button class="cal-btn-icon" id="cal-seguranca" title="Segurança">🔐</button>` : ""}
          <button class="cal-btn-sair" id="cal-sair">SAIR</button>
        </div>
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
      </div>
      <div id="cal-debug" style="font-size:.7rem;color:#555;margin-top:4px;"></div>`:""}
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
    saveSession(null); if(poolIntv) clearInterval(poolIntv); renderLogin();
  });
  document.getElementById("cal-prev").addEventListener("click", () => { semanaOff--; atualizarSemana(); });
  document.getElementById("cal-next").addEventListener("click", () => { semanaOff++; atualizarSemana(); });
  document.getElementById("cal-seguranca")?.addEventListener("click", renderConfigurarSeguranca);

  if (isProf) {
    document.getElementById("cal-gerar").addEventListener("click", async () => {
      const btn = document.getElementById("cal-gerar");
      btn.disabled=true; btn.textContent="A gerar...";
      await gerarSemana(semanaOff);
      await atualizarSemana();
      btn.textContent="✅ GERADO!";
      setTimeout(()=>{btn.disabled=false;btn.textContent="⚙️ GERAR AULAS";},2000);
    });

    let painelAtivo = null;
    const togglePainel = (id, renderFn) => {
      const p = document.getElementById(id);
      const dbg = document.getElementById("cal-debug");
      if (!p) { if(dbg) dbg.textContent="ERRO: "+id+" não encontrado"; return; }
      if (painelAtivo === id) {
        p.style.display="none"; painelAtivo=null; if(dbg) dbg.textContent="";
      } else {
        document.querySelectorAll(".cal-painel").forEach(x=>x.style.display="none");
        p.style.display="block"; p.scrollIntoView({behavior:"smooth",block:"start"});
        painelAtivo=id; if(dbg) dbg.textContent="";
        if (renderFn) renderFn();
      }
    };
    document.getElementById("cal-tab-alunos").addEventListener("click", ()=>togglePainel("cal-painel-alunos",renderAlunos));
    document.getElementById("cal-tab-conv").addEventListener("click",   ()=>togglePainel("cal-painel-conv",renderConvites));
  }

  // Pedir permissão notificações
  pedirPermissaoNotif();
  // Verificar aulas canceladas
  verificarAulasCanceladas();

  atualizarSemana();
}

function atualizarSemana() {
  const lbl = document.getElementById("cal-semana-lbl");
  if (lbl) lbl.textContent = semanaLabel(semanaOff);
  escutarSemana(semanaOff);
}

// ─── ENTRAR NA APP (após autenticação) ───────────────────────
async function entrarNaApp() {
  // Se for aluno e não tiver PIN nem biometria, sugerir configurar
  const pin    = getPin();
  const temBio = session.tipo !== "prof" && temBiometriaRegistada(session.tel);

  if (session.tipo === "aluno" && !pin && !temBio) {
    // Primeira entrada — sugerir segurança
    const wrap = document.getElementById("cal-wrap");
    wrap.innerHTML = `
      <div class="cal-login-box">
        <img src="./imagens/logo.png" class="cal-login-logo" alt="CrossFit Moita"/>
        <div class="cal-login-title">PROTEGE O TEU ACESSO</div>
        <div class="cal-login-sub">OPCIONAL MAS RECOMENDADO</div>
        <p class="cal-helper" style="text-align:center;">Define um PIN ou usa a impressão digital para entrar mais rápido nas próximas vezes.</p>
        <button class="cal-btn-principal" id="cal-config-seg">🔐 CONFIGURAR AGORA</button>
        <button class="cal-btn-secundario" id="cal-skip-seg" style="margin-top:8px;">Saltar por agora</button>
      </div>`;
    document.getElementById("cal-config-seg").addEventListener("click", () => {
      renderConfigurarSeguranca();
      // Após fechar modal, ir para calendário
      const obs = new MutationObserver(() => {
        if (!document.querySelector(".cal-modal-overlay")) { obs.disconnect(); renderCalendario(); }
      });
      obs.observe(document.body, { childList: true });
    });
    document.getElementById("cal-skip-seg").addEventListener("click", renderCalendario);
  } else {
    renderCalendario();
  }
}

// ─── INIT ────────────────────────────────────────────────────
export function initCalendario() {
  try {
    const s = localStorage.getItem(STORAGE_SESSION);
    if (s) session = JSON.parse(s);
  } catch {}

  if (session) {
    const pin    = getPin();
    const temBio = temBiometriaRegistada(session?.tel || "");
    if (pin || temBio) {
      // Tem proteção — mostrar ecrã de desbloqueio
      renderDesbloqueio(() => entrarNaApp());
    } else {
      // Sem proteção — entra direto
      entrarNaApp();
    }
  } else {
    renderLogin();
  }
}
