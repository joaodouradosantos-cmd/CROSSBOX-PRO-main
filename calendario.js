/* ============================================================
   CROSSBOX – CALENDÁRIO v11
   Sessão automática · PIN · Biometria · Push notifications
   Avisos cancelamentos · Professor inscreve alunos
   Presenças · Alunos · Convites
   ============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, doc, getDocs, getDoc,
  setDoc, updateDoc, serverTimestamp, onSnapshot,
  query, where, runTransaction, writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA5zi1kpgIO2U4ZL4IepIgrSxmAQP8tfPw",
  authDomain: "crossfit-moita.firebaseapp.com",
  projectId: "crossfit-moita",
  storageBucket: "crossfit-moita.firebasestorage.app",
  messagingSenderId: "417574003149",
  appId: "1:417574003149:web:76ab3a33e8d42a52502484"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ─── CONSTANTES ──────────────────────────────────────────────
const PIN_PROFESSOR   = "nj_1985";
const STORAGE_SESSION = "crossbox_cal_v11";
const STORAGE_PIN     = "crossbox_pin_v11";
const STORAGE_NOTIF   = "crossbox_notif_v11";

const HORARIOS = {
  1: ["07:00","10:00","17:30","18:30","19:30"],
  2: ["07:00","10:00","17:00","18:00","19:00"],
  3: ["07:00","10:00","17:30","18:30","19:30"],
  4: ["07:00","10:00","17:00","18:00","19:00"],
  5: ["07:00","10:00","17:30","18:30","19:30"],
  6: ["09:00","10:00","11:00"],
};
const TIPOS = ["WOD","Open Box","Halterofilismo","Mobilidade","Hyrox","Competição"];
const DIAS  = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
               "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

// ─── ESTADO ──────────────────────────────────────────────────
let session   = null;
let semanaOff = 0;
let cache     = {};
let poolIntv  = null;
let unsubscribeAulas = null;

// ─── UTILS ───────────────────────────────────────────────────
const isoDate = d => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const aulaId  = (dt,h) => `${dt}_${h.replace(":","h")}`;

function getMonday(off=0) {
  const h = new Date(), dow = h.getDay();
  const m = new Date(h);
  m.setDate(h.getDate() + ((dow===0?-6:1)-dow) + off*7);
  m.setHours(0,0,0,0);
  return m;
}
function semanaLabel(off) {
  const m = getMonday(off), s = new Date(m);
  s.setDate(m.getDate()+6);
  const f = d => `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}`;
  return `${f(m)} — ${f(s)}`;
}

// ─── SESSÃO / PIN ─────────────────────────────────────────────
function saveSession(s) {
  session = s;
  s ? localStorage.setItem(STORAGE_SESSION, JSON.stringify(s))
    : localStorage.removeItem(STORAGE_SESSION);
}
function getPin()       { return localStorage.getItem(STORAGE_PIN)||null; }
function savePin(p)     { localStorage.setItem(STORAGE_PIN, p); }
function removePin()    { localStorage.removeItem(STORAGE_PIN); }

// ─── BIOMETRIA ────────────────────────────────────────────────
const bioKey = tel => "crossbox_bio_v11_"+tel;
function temBio(tel) { return !!localStorage.getItem(bioKey(tel)); }

async function registarBio(tel) {
  if (!window.PublicKeyCredential) return false;
  try {
    const enc = new TextEncoder();
    const c = await navigator.credentials.create({ publicKey: {
      challenge: enc.encode("cb-"+tel+"-"+Date.now()),
      rp: { name:"CrossBox" },
      user: { id: enc.encode(tel), name: tel, displayName: session?.nome||tel },
      pubKeyCredParams: [{ type:"public-key", alg:-7 }],
      authenticatorSelection: { authenticatorAttachment:"platform", userVerification:"required" },
      timeout: 60000
    }});
    if (c) { localStorage.setItem(bioKey(tel),"1"); return true; }
  } catch(e) { console.log("Bio reg:",e.message); }
  return false;
}

async function autenticarBio(tel) {
  if (!window.PublicKeyCredential || !temBio(tel)) return false;
  try {
    const enc = new TextEncoder();
    const c = await navigator.credentials.get({ publicKey: {
      challenge: enc.encode("cb-auth-"+Date.now()),
      userVerification:"required", timeout:60000
    }});
    return !!c;
  } catch(e) { return false; }
}

// ─── NOTIFICAÇÕES ─────────────────────────────────────────────
async function pedirNotif() {
  if (!("Notification" in window)) return;
  if (Notification.permission==="default") await Notification.requestPermission();
}

function notif(titulo, corpo) {
  if (Notification.permission==="granted")
    new Notification(titulo, { body:corpo, icon:"./imagens/logo.png" });
}

// ─── AVISOS CANCELAMENTOS ─────────────────────────────────────
async function verificarCancelamentos() {
  if (!session || session.tipo==="prof") return;
  const hoje = isoDate(new Date());
  const vistas = JSON.parse(localStorage.getItem(STORAGE_NOTIF)||"[]");
  const snap = await getDocs(collection(db,"aulas"));
  const novas = [];
  snap.forEach(d => {
    const a = d.data();
    if (a.cancelada && a.data>=hoje &&
        (a.inscritos||[]).some(x=>x.tel===session.tel) &&
        !vistas.includes(d.id))
      novas.push({id:d.id,...a});
  });
  if (!novas.length) return;
  localStorage.setItem(STORAGE_NOTIF, JSON.stringify([...vistas,...novas.map(a=>a.id)]));
  const wrap = document.getElementById("cal-wrap");
  if (!wrap) return;
  const div = document.createElement("div");
  div.className = "cal-aviso-banner";
  div.innerHTML = `
    <div class="cal-aviso-titulo">⚠️ AULAS CANCELADAS</div>
    ${novas.map(a=>`<div class="cal-aviso-item">🚫 <strong>${DIAS[new Date(a.data+"T12:00:00").getDay()]} ${a.data.slice(8)} — ${a.hora}</strong></div>`).join("")}
    <button class="btn-secondary" id="cal-aviso-ok" style="margin-top:8px;width:100%;">OK, entendido</button>`;
  wrap.prepend(div);
  document.getElementById("cal-aviso-ok").addEventListener("click",()=>div.remove());
  novas.forEach(a => notif("🚫 Aula Cancelada",`${DIAS[new Date(a.data+"T12:00:00").getDay()]} às ${a.hora} foi cancelada`));
}

// ─── FIREBASE OPS ────────────────────────────────────────────
async function isBloqueado(tel) {
  try {
    const s = await getDoc(doc(db,"alunos",tel));
    return !s.exists() || s.data().bloqueado===true;
  } catch { return false; }
}

async function registarAluno(nome,tel) {
  const r = doc(db,"alunos",tel);
  if (!(await getDoc(r)).exists())
    await setDoc(r,{nome,tel,bloqueado:false,criadoEm:serverTimestamp()});
}

async function bloquearAluno(tel) {
  await updateDoc(doc(db,"alunos",tel),{bloqueado:true});
  const hoje = isoDate(new Date());
  const snap = await getDocs(collection(db,"aulas"));
  await Promise.all(snap.docs.filter(d=>d.data().data>=hoje).map(d=>{
    const lista=(d.data().inscritos||[]).filter(x=>x.tel!==tel);
    return lista.length!=(d.data().inscritos||[]).length
      ? updateDoc(doc(db,"aulas",d.id),{inscritos:lista}) : null;
  }).filter(Boolean));
}

async function gerarSemana(off) {
  const mon = getMonday(off);

  for (let i = 0; i < 7; i++) {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);

    const dt = isoDate(d);
    const dow = d.getDay();

    for (const h of (HORARIOS[dow] || [])) {
      const r = doc(db, "aulas", aulaId(dt, h));
      const s = await getDoc(r);

      if (!s.exists()) {
        await setDoc(r, {
          data: dt,
          hora: h,
          tipo: h === "11:00" ? "Hyrox" : "WOD",
          vagas: 8,
          inscritos: [],
          cancelada: false,
          criadoEm: serverTimestamp()
        });
      }
    }
  }
}

function getAulaFromCache(id) {
  return cache[id] || null;
}

function validarInscricaoAula(a, tel) {
  if (!a) return "Aula não encontrada.";
  if (a.cancelada) return "Aula cancelada.";

  const inscritos = a.inscritos || [];

  if (inscritos.some(x => x.tel === tel)) {
    return "Já inscrito.";
  }

  if (inscritos.length >= (a.vagas || 8)) {
    return "Sem vagas.";
  }

  return "";
}

async function inscrever(id) {
  if (!session) return;

  const anterior = getAulaFromCache(id);
  const erroInicial = validarInscricaoAula(anterior, session.tel);

  if (erroInicial) {
    alert(erroInicial);
    return;
  }

  const inscricao = {
    nome: session.nome,
    tel: session.tel
  };

  cache[id] = {
    ...anterior,
    inscritos: [...(anterior.inscritos || []), inscricao]
  };
  renderGrid();

  try {
    await runTransaction(db, async transaction => {
      const r = doc(db, "aulas", id);
      const snap = await transaction.get(r);

      if (!snap.exists()) {
        throw new Error("Aula não encontrada.");
      }

      const a = snap.data();
      const erro = validarInscricaoAula(a, session.tel);

      if (erro) {
        throw new Error(erro);
      }

      transaction.update(r, {
        inscritos: [...(a.inscritos || []), inscricao]
      });
    });
  } catch (e) {
    cache[id] = anterior;
    renderGrid();
    alert(e.message || "Erro ao marcar aula. Tenta novamente.");
  }
}

async function cancelarInscricao(id) {
  if (!session) return;

  const anterior = getAulaFromCache(id);
  if (!anterior) return;

  cache[id] = {
    ...anterior,
    inscritos: (anterior.inscritos || []).filter(x => x.tel !== session.tel)
  };
  renderGrid();

  try {
    await runTransaction(db, async transaction => {
      const r = doc(db, "aulas", id);
      const snap = await transaction.get(r);

      if (!snap.exists()) {
        throw new Error("Aula não encontrada.");
      }

      const a = snap.data();

      transaction.update(r, {
        inscritos: (a.inscritos || []).filter(x => x.tel !== session.tel)
      });
    });
  } catch (e) {
    cache[id] = anterior;
    renderGrid();
    alert(e.message || "Erro ao cancelar inscrição. Tenta novamente.");
  }
}

async function removerDaAula(id, tel) {
  await runTransaction(db, async transaction => {
    const r = doc(db, "aulas", id);
    const snap = await transaction.get(r);

    if (!snap.exists()) return;

    const a = snap.data();

    transaction.update(r, {
      inscritos: (a.inscritos || []).filter(x => x.tel !== tel)
    });
  });
}

async function cancelarAula(id, val) {
  await updateDoc(doc(db, "aulas", id), {
    cancelada: val
  });

  if (!val) {
    const v = JSON.parse(localStorage.getItem(STORAGE_NOTIF) || "[]").filter(x => x !== id);
    localStorage.setItem(STORAGE_NOTIF, JSON.stringify(v));
  }
}

async function cancelarDia(dt, val) {
  const q = query(collection(db, "aulas"), where("data", "==", dt));
  const snap = await getDocs(q);
  const batch = writeBatch(db);

  snap.forEach(d => {
    batch.update(doc(db, "aulas", d.id), {
      cancelada: val
    });
  });

  await batch.commit();
}

async function profInscrever(id, nome, tel) {
  let inscrito = false;

  try {
    await runTransaction(db, async transaction => {
      const r = doc(db, "aulas", id);
      const snap = await transaction.get(r);

      if (!snap.exists()) {
        throw new Error("Aula não encontrada.");
      }

      const a = snap.data();
      const erro = validarInscricaoAula(a, tel);

      if (erro) {
        throw new Error(erro);
      }

      transaction.update(r, {
        inscritos: [...(a.inscritos || []), { nome, tel }]
      });

      inscrito = true;
    });
  } catch (e) {
    if (e.message === "Sem vagas.") {
      alert("Sem vagas.");
    }
    return false;
  }

  return inscrito;
}

async function alterarHoraAula(id, dt, novaHora) {
  const oldRef = doc(db, "aulas", id);
  const newId = aulaId(dt, novaHora);
  const newRef = doc(db, "aulas", newId);

  await runTransaction(db, async transaction => {
    const oldSnap = await transaction.get(oldRef);

    if (!oldSnap.exists()) {
      throw new Error("Aula original não encontrada.");
    }

    if (newId !== id) {
      const newSnap = await transaction.get(newRef);

      if (newSnap.exists()) {
        throw new Error("Já existe uma aula nessa hora.");
      }
    }

    const aula = oldSnap.data();

    transaction.set(newRef, {
      ...aula,
      hora: novaHora,
      atualizadoEm: serverTimestamp()
    });

    if (newId !== id) {
      transaction.delete(oldRef);
    }
  });
}

async function criarConvite() {
  const c=Math.random().toString(36).slice(2,8).toUpperCase();
  await setDoc(doc(db,"convites",c),{usado:false,criadoEm:serverTimestamp()});
  return c;
}

async function validarConvite(c) {
  const r=doc(db,"convites",c.toUpperCase());
  const s=await getDoc(r);
  if (!s.exists()||s.data().usado) return false;
  await updateDoc(r,{usado:true});
  return true;
}

async function profInscrever(id,nome,tel) {
  const snap=await getDoc(doc(db,"aulas",id));
  if (!snap.exists()) return false;
  const a=snap.data(), l=a.inscritos||[];
  if (l.some(x=>x.tel===tel)) return false;
  if (l.length>=(a.vagas||8)){alert("Sem vagas.");return false;}
  await updateDoc(doc(db,"aulas",id),{inscritos:[...l,{nome,tel}]});
  return true;
}

// ─── CARREGAR AULAS ──────────────────────────────────────────
function escutarSemana(off) {
  if (poolIntv) {
    clearInterval(poolIntv);
    poolIntv = null;
  }

  if (unsubscribeAulas) {
    unsubscribeAulas();
    unsubscribeAulas = null;
  }

  cache = {};

  const mon = getMonday(off);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);

  const ini = isoDate(mon);
  const fim = isoDate(sun);

  const g = document.getElementById("cal-grid");
  if (g) {
    g.innerHTML = '<div class="cal-loading">🔄 A carregar aulas...</div>';
  }

  const q = query(
    collection(db, "aulas"),
    where("data", ">=", ini),
    where("data", "<=", fim)
  );

  unsubscribeAulas = onSnapshot(
    q,
    snap => {
      cache = {};

      snap.forEach(d => {
        cache[d.id] = d.data();
      });

      renderGrid();
    },
    e => {
      const grid = document.getElementById("cal-grid");
      if (grid) {
        grid.innerHTML = `<div class="cal-erro">⚠️ ${e.message} <button onclick="location.reload()" style="margin-left:8px;padding:4px 10px;background:#c8b84a;border:none;border-radius:3px;cursor:pointer;font-weight:700;">🔄 Recarregar</button></div>`;
      }
    }
  );
}

// ─── RENDER GRID ─────────────────────────────────────────────
function renderGrid() {
  const grid=document.getElementById("cal-grid");
  if (!grid) return;
  const mon=getMonday(semanaOff), hoje=isoDate(new Date()), agora=new Date().toTimeString().slice(0,5);
  const isProf=session?.tipo==="prof";

  if (!Object.keys(cache).length) {
    grid.innerHTML=`<div class="cal-vazio-msg">
      <div style="font-size:2rem;margin-bottom:8px">📋</div>
      <div>Sem aulas para esta semana.</div>
      ${isProf?`<button class="cal-btn-principal" id="cal-gerar-inline" style="margin-top:12px">⚙️ GERAR AULAS</button>`:"<small style='opacity:.7;margin-top:8px;display:block'>Aguarda o professor criar as aulas.</small>"}
    </div>`;
    document.getElementById("cal-gerar-inline")?.addEventListener("click",async e=>{
      e.target.disabled=true;e.target.textContent="A gerar...";
      await gerarSemana(semanaOff);
    });
    return;
  }

  // Guardar qual dia estava aberto antes de re-render
  const diaAbertoAntes = grid.querySelector(".cal-dia-aulas.cal-dia-aulas-open")?.dataset.dt || null;

  let html="";
  for (let i=0;i<7;i++) {
    const d=new Date(mon);d.setDate(mon.getDate()+i);
    const dow=d.getDay(),dt=isoDate(d);
    if (!(HORARIOS[dow]||[]).length) continue;
    const isHoje=dt===hoje;
    const horasDia=[...(HORARIOS[dow]||[]), ...Object.values(cache).filter(a=>a.data===dt&&a.hora).map(a=>a.hora)]
      .filter((h,idx,arr)=>arr.indexOf(h)===idx)
      .sort((a,b)=>a.localeCompare(b));
    const aulasDia=horasDia.map(h=>cache[aulaId(dt,h)]).filter(Boolean);
    const diaCancelado=aulasDia.length>0&&aulasDia.every(a=>a.cancelada);

    // Contadores para o card do dia
    const totalAulas=aulasDia.length;
    const inscritoNesteDia=aulasDia.some(a=>(a.inscritos||[]).some(x=>x.tel===session?.tel));
    const aulasComVaga=aulasDia.filter(a=>!a.cancelada&&(a.vagas||8)-(a.inscritos||[]).length>0).length;

    // Decidir se abre por omissão: hoje abre sempre, ou o que estava aberto, ou nenhum
    const deveAbrir = dt===hoje || dt===diaAbertoAntes;

    // Badge de resumo no card do dia
    let resumoBadge="";
    if(diaCancelado) resumoBadge=`<span class="cal-dia-badge cal-dia-badge-cancel">CANCELADO</span>`;
    else if(inscritoNesteDia) resumoBadge=`<span class="cal-dia-badge cal-dia-badge-inscrito">✔ INSCRITO</span>`;
    else if(aulasComVaga>0) resumoBadge=`<span class="cal-dia-badge cal-dia-badge-vaga">${aulasComVaga} AULA${aulasComVaga>1?"S":""}</span>`;
    else resumoBadge=`<span class="cal-dia-badge cal-dia-badge-cheio">ESGOTADO</span>`;

    html+=`<div class="cal-dia${isHoje?" cal-dia-hoje":""}${diaCancelado?" cal-dia-cancelado":""}">
      <button class="cal-dia-hdr cal-dia-toggle" data-dt="${dt}" aria-expanded="${deveAbrir}">
        <div class="cal-dia-hdr-left">
          <span class="cal-dia-nome">${DIAS[dow]}</span>
          <span class="cal-dia-data">${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}</span>
          ${isHoje?`<span class="cal-hoje-pill">HOJE</span>`:""}
        </div>
        <div class="cal-dia-hdr-right">
          ${resumoBadge}
          <span class="cal-dia-chevron">${deveAbrir?"▲":"▼"}</span>
        </div>
      </button>`;

    // Conteúdo colapsável das aulas
    html+=`<div class="cal-dia-aulas${deveAbrir?" cal-dia-aulas-open":""}" data-dt="${dt}">`;

    // Botão cancelar dia (professor) — dentro do painel colapsável
    if(isProf) {
      html+=`<div class="cal-prof-dia-bar">
        <button class="cal-btn-cancelar-dia${diaCancelado?" cal-btn-reabrir-dia":""}" data-dt="${dt}" data-cancelado="${diaCancelado}">${diaCancelado?"✅ REABRIR DIA":"🚫 CANCELAR DIA"}</button>
      </div>`;
    }

    for (const hora of horasDia) {
      const id=aulaId(dt,hora),aula=cache[id];
      if (!aula) continue;
      const inscritos=aula.inscritos||[],vagas=aula.vagas||8,livres=vagas-inscritos.length;
      const inscrito=session&&inscritos.some(x=>x.tel===session.tel);
      const passado=dt<hoje||(dt===hoje&&hora<agora);
      const cheia=livres<=0,cancelada=aula.cancelada===true;

      let cls="cal-aula";
      if(cancelada)cls+=" cal-cancelada";
      else if(inscrito)cls+=" cal-inscrito";
      else if(cheia||passado)cls+=" cal-dim";

      let vagaCls="cal-vg-ok";
      if(cheia||cancelada)vagaCls="cal-vg-cheio";
      else if(livres<=2)vagaCls="cal-vg-quase";

      const nomesHtml=inscritos.length
        ?inscritos.map(x=>`<span class="cal-nome${x.tel===session?.tel?" cal-nome-eu":""}">${x.nome.split(" ")[0]}${isProf?` <button class="cal-rm" data-id="${id}" data-tel="${x.tel}">✕</button>`:""}</span>`).join("")
        :`<span class="cal-nome-vazio">— sem inscrições —</span>`;

      let acaoHtml="";
      if (!passado&&!cancelada&&session?.tipo==="aluno") {
        acaoHtml=inscrito
          ?`<button class="cal-acao cal-acao-cancel" data-id="${id}" data-acao="cancelar">✕ CANCELAR</button>`
          :cheia?`<span class="cal-nome-vazio">Sem vagas</span>`
          :`<button class="cal-acao cal-acao-marcar" data-id="${id}" data-acao="inscrever">✔ MARCAR</button>`;
      }

      let profHtml="";
      if (isProf) {
        profHtml=`<div class="cal-prof-bar">
          <label>🕐<input class="cal-inp-hora" type="time" data-id="${id}" data-dt="${dt}" data-oldhora="${hora}" value="${hora}"></label>
          <label>👥<input class="cal-inp-v" type="number" data-id="${id}" value="${vagas}" min="1" max="30"></label>
          <select class="cal-sel-t" data-id="${id}">${TIPOS.map(t=>`<option${t===aula.tipo?" selected":""}>${t}</option>`).join("")}</select>
          ${cancelada?`<button class="cal-btn-reabrir" data-id="${id}">✅</button>`:`<button class="cal-btn-cancelar-aula" data-id="${id}">🚫</button>`}
        </div>
        ${!cancelada?`<div class="cal-prof-inscrever">
          <input class="cal-inp-prof-nome" type="text" placeholder="Nome visitante" data-id="${id}"/>
          <input class="cal-inp-prof-tel" type="tel" placeholder="Telemóvel" data-id="${id}"/>
          <button class="cal-btn-prof-add" data-id="${id}">➕</button>
        </div>`:""}`;
      }

      html+=`<div class="${cls}">
        <div class="cal-aula-top">
          <span class="cal-hora">${hora}</span>
          <span class="cal-tipo-pill">${aula.tipo||"WOD"}</span>
          <span class="cal-vagas ${vagaCls}">${cancelada?"CANCELADA":`${livres}/${vagas}`}</span>
        </div>
        <div class="cal-nomes">${nomesHtml}</div>
        ${acaoHtml}${profHtml}
      </div>`;
    }
    html+=`</div></div>`; // fecha cal-dia-aulas + cal-dia
  }
  grid.innerHTML=html;

  // ── Toggle colapso dos dias ──────────────────────────────────
  grid.querySelectorAll(".cal-dia-toggle").forEach(btn=>{
    btn.addEventListener("click", e=>{
      // impedir que cliques nos botões filhos (prof) abram/fechem o dia
      if(e.target.closest(".cal-btn-cancelar-dia")) return;
      const dt=btn.dataset.dt;
      const painel=grid.querySelector(`.cal-dia-aulas[data-dt="${dt}"]`);
      if(!painel) return;
      const aberto=painel.classList.toggle("cal-dia-aulas-open");
      btn.setAttribute("aria-expanded", aberto);
      btn.querySelector(".cal-dia-chevron").textContent=aberto?"▲":"▼";
    });
  });

  // ── Eventos das aulas ────────────────────────────────────────
  grid.querySelectorAll("[data-acao]").forEach(btn=>btn.addEventListener("click",async()=>{
    if(btn.dataset.acao==="inscrever"){btn.disabled=true;await inscrever(btn.dataset.id);}
    if(btn.dataset.acao==="cancelar"){if(!confirm("Cancelar inscrição?"))return;btn.disabled=true;await cancelarInscricao(btn.dataset.id);}
  }));
  grid.querySelectorAll(".cal-rm").forEach(btn=>btn.addEventListener("click",async()=>{
    if(!confirm("Remover desta aula?"))return;await removerDaAula(btn.dataset.id,btn.dataset.tel);
  }));
  grid.querySelectorAll(".cal-inp-v").forEach(inp=>inp.addEventListener("change",()=>updateDoc(doc(db,"aulas",inp.dataset.id),{vagas:parseInt(inp.value)||8})));
  grid.querySelectorAll(".cal-sel-t").forEach(sel=>sel.addEventListener("change",()=>updateDoc(doc(db,"aulas",sel.dataset.id),{tipo:sel.value})));
  grid.querySelectorAll(".cal-btn-cancelar-aula").forEach(btn=>btn.addEventListener("click",async()=>{
    if(!confirm("Cancelar esta aula?"))return;await cancelarAula(btn.dataset.id,true);
  }));
  grid.querySelectorAll(".cal-btn-reabrir").forEach(btn=>btn.addEventListener("click",async()=>{
    await cancelarAula(btn.dataset.id,false);
  }));
  grid.querySelectorAll(".cal-btn-cancelar-dia").forEach(btn=>btn.addEventListener("click",async()=>{
    const c=btn.dataset.cancelado==="true";
    if(!confirm(c?"Reabrir este dia?":"Cancelar TODAS as aulas deste dia?"))return;
    btn.disabled=true;await cancelarDia(btn.dataset.dt,!c);btn.disabled=false;
  }));
  grid.querySelectorAll(".cal-inp-hora").forEach(inp=>inp.addEventListener("change",async()=>{
    const nova=inp.value;

    if(!nova||nova===inp.dataset.oldhora) return;

    if(!confirm(`Alterar hora para ${nova}?`)){
      inp.value=inp.dataset.oldhora;
      return;
    }

    inp.disabled=true;

    try {
      await alterarHoraAula(inp.dataset.id, inp.dataset.dt, nova);
      inp.dataset.oldhora=nova;
    } catch(e) {
      alert(e.message || "Erro ao alterar hora da aula.");
      inp.value=inp.dataset.oldhora;
    } finally {
      inp.disabled=false;
    }
  }));
  grid.querySelectorAll(".cal-btn-prof-add").forEach(btn=>btn.addEventListener("click",async()=>{
    const id=btn.dataset.id;
    const nome=grid.querySelector(`.cal-inp-prof-nome[data-id="${id}"]`).value.trim();
    const tel=grid.querySelector(`.cal-inp-prof-tel[data-id="${id}"]`).value.trim().replace(/\s/g,"");
    if(!nome||tel.length<9){alert("Preenche nome e telemóvel.");return;}
    btn.disabled=true;await registarAluno(nome,tel);
    const ok=await profInscrever(id,nome,tel);
    if(ok){grid.querySelector(`.cal-inp-prof-nome[data-id="${id}"]`).value="";grid.querySelector(`.cal-inp-prof-tel[data-id="${id}"]`).value="";}
    else alert("Aluno já inscrito.");
    btn.disabled=false;
  }));
}

// ─── RENDER TOOLBAR PROFESSOR ────────────────────────────────
function renderToolbarProf(wrap) {
  const isProf=session?.tipo==="prof";
  if (!isProf) return;
  // Injetar botão gerar na toolbar se existir
  const toolbar=document.getElementById("cal-prof-toolbar");
  if (!toolbar) return;
  toolbar.innerHTML=`<button class="cal-btn-gerar" id="cal-gerar-btn">⚙️ GERAR AULAS</button>`;
  document.getElementById("cal-gerar-btn").addEventListener("click",async()=>{
    const btn=document.getElementById("cal-gerar-btn");
    btn.disabled=true;btn.textContent="A gerar...";
    await gerarSemana(semanaOff);await atualizarSemana();
    btn.textContent="✅ GERADO!";setTimeout(()=>{btn.disabled=false;btn.textContent="⚙️ GERAR AULAS";},2000);
  });
}

// ─── VIEWS ───────────────────────────────────────────────────
function renderLogin() {
  const wrap=document.getElementById("cal-wrap");
  wrap.innerHTML=`
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
        <input class="cal-input" id="cal-conv-nome" type="text" placeholder="Primeiro e último nome"/>
        <input class="cal-input" id="cal-conv-tel" type="tel" placeholder="Nº Telemóvel"/>
        <input class="cal-input cal-input-code" id="cal-conv-code" type="text" placeholder="CÓDIGO" maxlength="6"/>
        <button class="cal-btn-principal" id="cal-conv-entrar">▶ VALIDAR E ENTRAR</button>
        <button class="cal-btn-secundario" id="cal-conv-back">← VOLTAR</button>
      </div>
      <div class="cal-divider-txt" style="margin-top:20px;">— acesso restrito —</div>
      <button class="cal-btn-prof" id="cal-prof">🔐 ACESSO PROFESSOR</button>
    </div>`;

  document.getElementById("cal-toggle-conv").addEventListener("click",()=>{
    document.getElementById("cal-form-normal").style.display="none";
    document.getElementById("cal-form-conv").style.display="block";
  });
  document.getElementById("cal-conv-back").addEventListener("click",()=>{
    document.getElementById("cal-form-normal").style.display="block";
    document.getElementById("cal-form-conv").style.display="none";
  });

  const validarNome=n=>{const p=n.trim().split(/\s+/);return p.length>=2&&p.every(x=>x.length>=2);};

  document.getElementById("cal-entrar").addEventListener("click",async()=>{
    const nome=document.getElementById("cal-nome").value.trim();
    const tel=document.getElementById("cal-tel").value.trim().replace(/\s/g,"");
    if(!validarNome(nome)){alert("Introduz o primeiro e último nome.");return;}
    if(tel.length<9){alert("Nº de telemóvel inválido.");return;}
    const btn=document.getElementById("cal-entrar");
    btn.disabled=true;btn.textContent="A verificar...";
    if(await isBloqueado(tel)){alert("❌ Acesso não autorizado.\nContacta o professor.");btn.disabled=false;btn.textContent="▶ ENTRAR";return;}
    saveSession({nome,tel,tipo:"aluno"});
    entrarNaApp();
  });

  document.getElementById("cal-conv-entrar").addEventListener("click",async()=>{
    const nome=document.getElementById("cal-conv-nome").value.trim();
    const tel=document.getElementById("cal-conv-tel").value.trim().replace(/\s/g,"");
    const codigo=document.getElementById("cal-conv-code").value.trim().toUpperCase();
    if(!validarNome(nome)){alert("Introduz o primeiro e último nome.");return;}
    if(tel.length<9||!codigo){alert("Preenche todos os campos.");return;}
    const btn=document.getElementById("cal-conv-entrar");
    btn.disabled=true;btn.textContent="A validar...";
    if(!await validarConvite(codigo)){alert("❌ Código inválido ou já utilizado.");btn.disabled=false;btn.textContent="▶ VALIDAR E ENTRAR";return;}
    await registarAluno(nome,tel);
    saveSession({nome,tel,tipo:"aluno"});
    entrarNaApp();
  });

  document.getElementById("cal-prof").addEventListener("click",()=>{
    const pin=prompt("🔐 PIN do professor:");
    if(pin===PIN_PROFESSOR){saveSession({nome:"Professor",tel:"prof",tipo:"prof"});entrarNaApp();}
    else if(pin!==null)alert("PIN incorreto.");
  });
}

function renderDesbloqueio(onSuccess) {
  const wrap=document.getElementById("cal-wrap");
  const pin=getPin(), bio=temBio(session.tel);
  wrap.innerHTML=`
    <div class="cal-login-box">
      <img src="./imagens/logo.png" class="cal-login-logo" alt="CrossFit Moita"/>
      <div class="cal-login-title">BEM-VINDO DE VOLTA</div>
      <div class="cal-login-sub">${session.nome.toUpperCase()}</div>
      ${bio?`<button class="cal-btn-principal" id="cal-bio-btn" style="margin-bottom:12px">👆 IMPRESSÃO DIGITAL</button>`:""}
      ${pin?`
        <div class="cal-divider-txt">${bio?"— ou o PIN —":"— introduz o PIN —"}</div>
        <div class="cal-pin-dots" id="cal-pin-dots"><span></span><span></span><span></span><span></span></div>
        <div class="cal-pin-teclado" id="cal-pin-teclado"></div>
        <div id="cal-pin-erro" class="cal-pin-erro"></div>`:""}
      <div class="cal-divider-txt" style="margin-top:16px">— ou —</div>
      <button class="cal-btn-secundario" id="cal-outro">👤 Outro utilizador</button>
    </div>`;

  if(bio){
    document.getElementById("cal-bio-btn").addEventListener("click",async()=>{
      if(await autenticarBio(session.tel))onSuccess();else alert("Biometria falhou. Usa o PIN.");
    });
    setTimeout(async()=>{if(await autenticarBio(session.tel))onSuccess();},500);
  }

  if(pin){
    let atual="";
    const tec=document.getElementById("cal-pin-teclado");
    const dots=document.getElementById("cal-pin-dots").querySelectorAll("span");
    const erro=document.getElementById("cal-pin-erro");
    ["1","2","3","4","5","6","7","8","9","","0","⌫"].forEach(n=>{
      const btn=document.createElement("button");
      btn.className="cal-pin-key"+(n?" ":" cal-pin-key-vazio");
      btn.textContent=n;if(!n)btn.disabled=true;
      btn.addEventListener("click",()=>{
        if(n==="⌫")atual=atual.slice(0,-1);else if(atual.length<4)atual+=n;
        dots.forEach((d,i)=>d.classList.toggle("active",i<atual.length));
        if(atual.length===4){
          if(atual===pin)onSuccess();
          else{erro.textContent="PIN incorreto";atual="";dots.forEach(d=>d.classList.remove("active"));}
        }
      });
      tec.appendChild(btn);
    });
  }

  document.getElementById("cal-outro").addEventListener("click",()=>{saveSession(null);renderLogin();});
}

function renderCalendario() {
  const wrap=document.getElementById("cal-wrap");
  const isProf=session?.tipo==="prof";

  wrap.innerHTML=`
    <div class="cal-toolbar">
      <div class="cal-topbar">
        <span class="cal-user-pill">${isProf?"🏋️ PROFESSOR":`👤 ${session.nome.split(" ")[0].toUpperCase()}`}</span>
        <div style="display:flex;gap:6px;align-items:center;">
          ${!isProf?`<button class="cal-btn-icon" id="cal-seg" title="Segurança">🔐</button>`:""}
          <button class="cal-btn-sair" id="cal-sair">SAIR</button>
        </div>
      </div>
      <div class="cal-nav">
        <button class="cal-nav-btn" id="cal-prev">◀</button>
        <span class="cal-semana-label" id="cal-semana-lbl">${semanaLabel(semanaOff)}</span>
        <button class="cal-nav-btn" id="cal-next">▶</button>
      </div>
      ${isProf?`<div style="margin-top:8px;"><button class="cal-btn-gerar" id="cal-gerar">⚙️ GERAR AULAS</button></div>`:""}
    </div>
    <div id="cal-grid" class="cal-grid"><div class="cal-loading">🔄 A carregar...</div></div>`;

document.getElementById("cal-sair").addEventListener("click",()=>{
  saveSession(null);

  if (poolIntv) {
    clearInterval(poolIntv);
    poolIntv = null;
  }

  if (unsubscribeAulas) {
    unsubscribeAulas();
    unsubscribeAulas = null;
  }

  atualizarBotoesProf();
  renderLogin();
});
  document.getElementById("cal-prev").addEventListener("click",()=>{semanaOff--;atualizarSemana();});
  document.getElementById("cal-next").addEventListener("click",()=>{semanaOff++;atualizarSemana();});
  document.getElementById("cal-seg")?.addEventListener("click",renderSeguranca);

  if(isProf){
    document.getElementById("cal-gerar").addEventListener("click",async()=>{
      const btn=document.getElementById("cal-gerar");
      btn.disabled=true;btn.textContent="A gerar...";
      await gerarSemana(semanaOff);await atualizarSemana();
      btn.textContent="✅ GERADO!";setTimeout(()=>{btn.disabled=false;btn.textContent="⚙️ GERAR AULAS";},2000);
    });
  }

  atualizarBotoesProf();
  pedirNotif();
  verificarCancelamentos();
  atualizarSemana();
}

function atualizarSemana() {
  const lbl=document.getElementById("cal-semana-lbl");
  if(lbl)lbl.textContent=semanaLabel(semanaOff);
  escutarSemana(semanaOff);
}

function atualizarBotoesProf() {
  const isProf=session?.tipo==="prof";
  document.querySelectorAll(".cal-prof-only").forEach(btn=>{
    btn.style.display=isProf?"":"none";
  });
}

function entrarNaApp() {
  const pin=getPin(), bio=session.tipo!=="prof"&&temBio(session.tel||"");
  if(session.tipo==="aluno"&&!pin&&!bio){
    const wrap=document.getElementById("cal-wrap");
    wrap.innerHTML=`
      <div class="cal-login-box">
        <img src="./imagens/logo.png" class="cal-login-logo"/>
        <div class="cal-login-title">PROTEGE O TEU ACESSO</div>
        <div class="cal-login-sub">OPCIONAL MAS RECOMENDADO</div>
        <p class="cal-helper" style="text-align:center;">Define um PIN ou usa a impressão digital para entrar mais rápido.</p>
        <button class="cal-btn-principal" id="cal-config-seg">🔐 CONFIGURAR AGORA</button>
        <button class="cal-btn-secundario" id="cal-skip" style="margin-top:8px;">Saltar por agora</button>
      </div>`;
    document.getElementById("cal-config-seg").addEventListener("click",()=>{
      renderSeguranca();
      new MutationObserver(()=>{
        if(!document.querySelector(".cal-modal-overlay")){renderCalendario();}
      }).observe(document.body,{childList:true});
    });
    document.getElementById("cal-skip").addEventListener("click",renderCalendario);
  } else {
    renderCalendario();
  }
}

function renderSeguranca() {
  const modal=document.createElement("div");
  modal.className="cal-modal-overlay";
  const bio=temBio(session.tel), pin=getPin();
  modal.innerHTML=`
    <div class="cal-modal">
      <div class="cal-modal-titulo">🔐 SEGURANÇA</div>
      <div class="cal-modal-sec">
        <div class="cal-modal-label">PIN ${pin?'<span class="cal-pill-ok">ATIVO</span>':''}</div>
        <p class="cal-helper">PIN de 4 dígitos.</p>
        <div class="cal-pin-dots" id="cfg-dots"><span></span><span></span><span></span><span></span></div>
        <div class="cal-pin-teclado" id="cfg-teclado"></div>
        <div id="cfg-estado" class="cal-helper" style="text-align:center;margin-top:6px;">Novo PIN (4 dígitos)</div>
        ${pin?`<button class="cal-btn-secundario" id="cfg-rm-pin" style="margin-top:8px;">🗑 Remover PIN</button>`:""}
      </div>
      ${window.PublicKeyCredential?`
      <div class="cal-modal-sec">
        <div class="cal-modal-label">BIOMETRIA ${bio?'<span class="cal-pill-ok">ATIVA</span>':''}</div>
        <button class="cal-btn-principal" id="cfg-bio">${bio?"🔄 Atualizar":"👆 Registar impressão digital"}</button>
      </div>`:""}
      <button class="cal-btn-secundario" id="cfg-fechar" style="margin-top:16px;">FECHAR</button>
    </div>`;
  document.body.appendChild(modal);

  let pNovo="",fase=1,pPrim="";
  const tec=modal.querySelector("#cfg-teclado"),dots=modal.querySelectorAll("#cfg-dots span"),est=modal.querySelector("#cfg-estado");
  est.textContent="Novo PIN (4 dígitos)";
  ["1","2","3","4","5","6","7","8","9","","0","⌫"].forEach(n=>{
    const btn=document.createElement("button");
    btn.className="cal-pin-key"+(n?" ":" cal-pin-key-vazio");
    btn.textContent=n;if(!n)btn.disabled=true;
    btn.addEventListener("click",()=>{
      if(n==="⌫")pNovo=pNovo.slice(0,-1);else if(pNovo.length<4)pNovo+=n;
      dots.forEach((d,i)=>d.classList.toggle("active",i<pNovo.length));
      if(pNovo.length===4){
        if(fase===1){pPrim=pNovo;pNovo="";dots.forEach(d=>d.classList.remove("active"));est.textContent="Confirma o PIN";fase=2;}
        else{
          if(pNovo===pPrim){savePin(pNovo);est.textContent="✅ PIN guardado!";est.style.color="#4a8a3a";pNovo="";fase=1;pPrim="";}
          else{est.textContent="❌ PINs não coincidem";est.style.color="#8a2a2a";pNovo="";fase=1;pPrim="";dots.forEach(d=>d.classList.remove("active"));}
        }
      }
    });
    tec.appendChild(btn);
  });
  modal.querySelector("#cfg-rm-pin")?.addEventListener("click",()=>{if(confirm("Remover PIN?"))removePin();modal.remove();});
  modal.querySelector("#cfg-bio")?.addEventListener("click",async()=>{
    const btn=modal.querySelector("#cfg-bio");btn.disabled=true;btn.textContent="A registar...";
    btn.textContent=await registarBio(session.tel)?"✅ Registado!":"❌ Falhou.";btn.disabled=false;
  });
  modal.querySelector("#cfg-fechar").addEventListener("click",()=>modal.remove());
  modal.addEventListener("click",e=>{if(e.target===modal)modal.remove();});
}

// ─── EXPORTS PÚBLICOS ─────────────────────────────────────────
export async function renderAlunosPublic(div) {
  if (!div) return;
  div.innerHTML=`<div class="cal-loading">A carregar...</div>`;
  const snap=await getDocs(collection(db,"alunos"));
  if(snap.empty){div.innerHTML="<em>Nenhum aluno.</em>";return;}
  let html=`<div class="cal-alunos-count">${snap.size} aluno(s)</div>`;
  snap.forEach(d=>{
    const a=d.data();
    html+=`<div class="cal-aluno-row${a.bloqueado?" cal-row-bloq":""}">
      <div><strong>${a.nome}</strong> <small>${a.tel}</small>${a.bloqueado?` <span class="cal-pill-bloq">BLOQUEADO</span>`:""}</div>
      ${a.bloqueado
        ?`<button class="cal-btn-reativar" data-tel="${a.tel}">✅ Reativar</button>`
        :`<button class="cal-btn-bloquear" data-tel="${a.tel}" data-nome="${a.nome}">🚫 Remover</button>`}
    </div>`;
  });
  div.innerHTML=html;
  div.querySelectorAll(".cal-btn-bloquear").forEach(btn=>btn.addEventListener("click",async()=>{
    if(!confirm(`Remover ${btn.dataset.nome}?`))return;btn.disabled=true;
    await bloquearAluno(btn.dataset.tel);await renderAlunosPublic(div);
  }));
  div.querySelectorAll(".cal-btn-reativar").forEach(btn=>btn.addEventListener("click",async()=>{
    await updateDoc(doc(db,"alunos",btn.dataset.tel),{bloqueado:false});await renderAlunosPublic(div);
  }));
}

export function renderConvitesPublic(div) {
  if (!div) return;
  div.innerHTML=`
    <p class="helper-text">Gera um código único. Só funciona uma vez.</p>
    <button class="btn-primary" id="conv-novo-btn">🔗 Gerar Convite</button>
    <div id="conv-result" style="margin-top:12px;"></div>`;
  document.getElementById("conv-novo-btn").addEventListener("click",async()=>{
    const btn=document.getElementById("conv-novo-btn");
    btn.disabled=true;btn.textContent="A gerar...";
    const c=await criarConvite();
    document.getElementById("conv-result").innerHTML=`
      <div class="cal-conv-box">
        <div class="cal-conv-code">${c}</div>
        <p class="helper-text">Envia ao aluno. Na app clica em "Tenho um código de convite".</p>
        <button class="btn-secondary" onclick="navigator.clipboard.writeText('${c}');this.textContent='✅ Copiado!'">📋 Copiar</button>
      </div>`;
    btn.disabled=false;btn.textContent="🔗 Gerar Novo Convite";
  });
}

export async function carregarPresencas() {
  const wrap=document.getElementById("presencas-wrap");
  if (!wrap) return;
  let s=null;
  try{s=JSON.parse(localStorage.getItem(STORAGE_SESSION));}catch{}
  if(!s){wrap.innerHTML=`<div class="helper-text">Abre o <strong>Calendário</strong> e entra com os teus dados.</div>`;return;}

  const isProf=s.tipo==="prof";
  if(isProf){await renderPresencasProf(wrap);return;}

  wrap.innerHTML=`<div class="helper-text">A carregar...</div>`;
  const hoje=new Date(),hojeStr=isoDate(hoje),agoraStr=hoje.toTimeString().slice(0,5);
  try{
    const snap=await getDocs(collection(db,"aulas"));
    const minhas=[];
    snap.forEach(d=>{
      const a=d.data();
      const passou=a.data<hojeStr||(a.data===hojeStr&&a.hora<agoraStr);
      if(passou&&!a.cancelada&&(a.inscritos||[]).some(x=>x.tel===s.tel))minhas.push(a);
    });
    minhas.sort((a,b)=>(b.data+b.hora).localeCompare(a.data+a.hora));
    const porMes={};
    minhas.forEach(a=>{const m=a.data.slice(0,7);if(!porMes[m])porMes[m]=[];porMes[m].push(a);});
    if(!minhas.length){wrap.innerHTML=`<div class="helper-text">Ainda sem presenças. Marca aulas no Calendário!</div>`;return;}
    const mesAtual=hojeStr.slice(0,7);
    let html=`<div class="presencas-resumo">
      <div class="presencas-stat"><div class="presencas-num">${(porMes[mesAtual]||[]).length}</div><div class="presencas-label">ESTE MÊS</div></div>
      <div class="presencas-stat"><div class="presencas-num">${minhas.length}</div><div class="presencas-label">TOTAL GERAL</div></div>
    </div>`;
    Object.keys(porMes).sort().reverse().forEach(mes=>{
      const[ano,m]=mes.split("-");
      html+=`<div class="presencas-mes">
        <div class="presencas-mes-hdr"><span>${MESES[parseInt(m)-1]} ${ano}</span><span class="presencas-mes-total">${porMes[mes].length} aula(s)</span></div>
        <div class="presencas-lista">${porMes[mes].map(a=>`<div class="presencas-item">
          <span class="presencas-dia">${DIAS[new Date(a.data+"T12:00:00").getDay()]} ${a.data.slice(8)}/${m}</span>
          <span class="presencas-hora">${a.hora}</span>
          <span class="presencas-tipo">${a.tipo||"WOD"}</span>
        </div>`).join("")}</div>
      </div>`;
    });
    wrap.innerHTML=html;
  }catch(e){wrap.innerHTML=`<div class="helper-text">Erro: ${e.message}</div>`;}
}

async function renderPresencasProf(wrap) {
  wrap.innerHTML=`<div class="helper-text">A carregar...</div>`;
  const hojeStr=isoDate(new Date()),agoraStr=new Date().toTimeString().slice(0,5);
  const mesesStr=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  try{
    const[alunosSnap,aulasSnap]=await Promise.all([getDocs(collection(db,"alunos")),getDocs(collection(db,"aulas"))]);
    const alunos=[],aulasPassadas=[];
    alunosSnap.forEach(d=>{if(!d.data().bloqueado)alunos.push(d.data());});
    aulasSnap.forEach(d=>{
      const a=d.data();
      const passou=a.data<hojeStr||(a.data===hojeStr&&a.hora<agoraStr);
      if(passou&&!a.cancelada)aulasPassadas.push(a);
    });
    const meses=[];
    for(let i=0;i<6;i++){const d=new Date();d.setMonth(d.getMonth()-i);meses.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);}
    const stats=alunos.map(a=>{
      const pm={};
      aulasPassadas.forEach(x=>{if((x.inscritos||[]).some(y=>y.tel===a.tel)){const m=x.data.slice(0,7);pm[m]=(pm[m]||0)+1;}});
      return{...a,pm,total:Object.values(pm).reduce((s,v)=>s+v,0)};
    }).sort((a,b)=>b.total-a.total);
    let html=`<div class="cal-presencas-tabela">
      <div class="cal-pres-hdr"><span>ALUNO</span>${meses.map(m=>`<span>${mesesStr[parseInt(m.slice(5))-1]}</span>`).join("")}<span>TOTAL</span></div>
      ${stats.map(a=>`<div class="cal-pres-row">
        <span class="cal-pres-nome">${a.nome}</span>
        ${meses.map(m=>`<span class="cal-pres-val ${(a.pm[m]||0)===0?"cal-pres-zero":""}">${a.pm[m]||0}</span>`).join("")}
        <span class="cal-pres-total">${a.total}</span>
      </div>`).join("")}
    </div>`;
    wrap.innerHTML=html;
  }catch(e){wrap.innerHTML=`<div class="helper-text">Erro: ${e.message}</div>`;}
}

// ─── INIT ────────────────────────────────────────────────────
export function initCalendario() {
  try{const s=localStorage.getItem(STORAGE_SESSION);if(s)session=JSON.parse(s);}catch{}
  atualizarBotoesProf();
  if(session){
    const pin=getPin(),bio=temBio(session?.tel||"");
    if(pin||bio)renderDesbloqueio(()=>entrarNaApp());
    else entrarNaApp();
  } else {
    renderLogin();
  }
}
