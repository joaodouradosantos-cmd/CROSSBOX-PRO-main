// service-worker.js – CrossBox PRO
// v11: corrige arranque do calendário e injeta benchmarks no WOD sem alterar o aspeto base.
const CACHE_NAME = "crossbox-cache-v11-calendar-benchmarks";

const APP_SHELL = [
  "./",
  "./index.html?v=11",
  "./manifest.json?v=11",
  "./calendario.js?v=11",
  "./imagens/crossbox_logo.png",
  "./imagens/crossbox_logo-192.png",
  "./imagens/crossbox_logo-512.png",
  "./js/chart.umd.min.js",
  "./css/fonts.css",
  "./fonts/stardos-stencil-regular.woff2",
  "./fonts/stardos-stencil-700.woff2"
];

const CAL_FIX = `
\n// ─── FIX CROSSBOX v11 ─────────────────────────────────────────
// Algumas versões anteriores chamavam entrarNaApp(), mas a função não estava definida.
// Esta função fica hoisted no módulo e permite abrir calendário, sair e voltar a entrar.
async function entrarNaApp() {
  renderCalendario();
}
`;

const BENCHMARK_INJECTION = `
<script>
(function(){
  const BENCHMARKS = ["Randy", "Jackie", "Murph", "Fran", "Isabel", "400m Corrida", "Milha", "5k Corrida"];

  function parseTimeToSeconds(value){
    if(!value) return null;
    const clean = String(value).trim().toLowerCase().replace(',', '.');
    const m = clean.match(/^(\\d{1,2}):(\\d{2})(?::(\\d{2}))?$/);
    if(m){
      if(m[3]) return Number(m[1])*3600 + Number(m[2])*60 + Number(m[3]);
      return Number(m[1])*60 + Number(m[2]);
    }
    const n = Number(clean);
    return Number.isFinite(n) && n > 0 ? Math.round(n*60) : null;
  }

  function secondsToTime(sec){
    if(sec == null) return "—";
    const h = Math.floor(sec/3600);
    const m = Math.floor((sec%3600)/60);
    const s = sec%60;
    return h ? String(h)+":"+String(m).padStart(2,'0')+":"+String(s).padStart(2,'0') : String(m)+":"+String(s).padStart(2,'0');
  }

  function getBenchmarkHistory(name){
    let treinos = [];
    try { treinos = JSON.parse(localStorage.getItem('crossfit_treinos') || '[]'); } catch(e) {}
    return treinos
      .filter(t => (t.formato === 'Benchmark' || BENCHMARKS.includes(t.ex)) && t.ex === name)
      .map(t => ({...t, seconds: parseTimeToSeconds(t.tempo)}))
      .filter(t => t.seconds != null)
      .sort((a,b) => String(a.date||'').localeCompare(String(b.date||'')));
  }

  function renderBenchmarkInfo(name){
    const info = document.getElementById('benchmarkInfo');
    if(!info) return;
    if(!name){ info.textContent = ''; return; }
    const hist = getBenchmarkHistory(name);
    if(!hist.length){
      info.textContent = 'Ainda sem registos anteriores para ' + name + '. Regista o tempo para começares a acompanhar a evolução.';
      return;
    }
    const best = hist.reduce((a,b) => b.seconds < a.seconds ? b : a, hist[0]);
    const last = hist[hist.length-1];
    const delta = last.seconds - best.seconds;
    const deltaTxt = delta === 0 ? 'melhor resultado atual' : (delta > 0 ? '+' + secondsToTime(delta) + ' face ao melhor' : '-' + secondsToTime(Math.abs(delta)) + ' face ao melhor anterior');
    info.textContent = 'Histórico ' + name + ': ' + hist.length + ' registo(s). Melhor: ' + secondsToTime(best.seconds) + ' (' + (best.date || 'sem data') + '). Último: ' + secondsToTime(last.seconds) + ' — ' + deltaTxt + '.';
  }

  function initBenchmarks(){
    const formato = document.getElementById('treinoFormato');
    const ex = document.getElementById('treinoExercicio');
    const tempo = document.getElementById('treinoTempo');
    if(!formato || document.getElementById('benchmarkSelect')) return;

    if(!Array.from(formato.options).some(o => o.value === 'Benchmark')){
      const opt = document.createElement('option');
      opt.value = 'Benchmark';
      opt.textContent = 'Benchmark / Teste';
      formato.appendChild(opt);
    }

    const field = document.createElement('div');
    field.className = 'field';
    field.id = 'benchmarkField';
    field.style.display = 'none';
    field.innerHTML = '<label>Benchmark / Teste</label><select id="benchmarkSelect"><option value="">— escolher —</option>' + BENCHMARKS.map(b => '<option value="'+b+'">'+b+'</option>').join('') + '</select><div class="helper-text" id="benchmarkInfo" style="margin-top:4px;"></div>';

    const row = formato.closest('.form-row') || formato.parentElement?.parentElement;
    if(row) row.appendChild(field);

    const select = document.getElementById('benchmarkSelect');

    function sync(){
      const isBenchmark = formato.value === 'Benchmark';
      field.style.display = isBenchmark ? '' : 'none';
      if(isBenchmark && select.value){
        if(ex){
          let option = Array.from(ex.options).find(o => o.value === select.value);
          if(!option){
            option = document.createElement('option');
            option.value = select.value;
            option.textContent = select.value;
            ex.appendChild(option);
          }
          ex.value = select.value;
          ex.dispatchEvent(new Event('change', { bubbles:true }));
        }
        if(tempo && !tempo.value) tempo.placeholder = 'Tempo final. Ex.: 5:21, 43:10, 1:12';
        renderBenchmarkInfo(select.value);
      }
    }

    formato.addEventListener('change', sync);
    select.addEventListener('change', sync);
    if(tempo) tempo.addEventListener('input', () => renderBenchmarkInfo(select.value));
    sync();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initBenchmarks);
  else initBenchmarks();
  new MutationObserver(initBenchmarks).observe(document.documentElement, { childList:true, subtree:true });
})();
</script>
`;

function injectHtml(html) {
  if (html.includes('benchmarkSelect')) return html;
  return html.replace('</body>', BENCHMARK_INJECTION + '\n</body>');
}

function patchCalendario(js) {
  if (js.includes('function entrarNaApp')) return js;
  return js + CAL_FIX;
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(APP_SHELL.map((u) => cache.add(u)));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve())));
    self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (url.pathname.endsWith('/calendario.js')) {
    event.respondWith((async () => {
      const res = await fetch(req, { cache: 'no-store' });
      const js = patchCalendario(await res.text());
      return new Response(js, { headers: { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-store' } });
    })());
    return;
  }

  if (req.mode === "navigate" || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/')) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: "no-store" });
        const type = fresh.headers.get('content-type') || '';
        if (type.includes('text/html')) {
          const html = injectHtml(await fresh.text());
          const cache = await caches.open(CACHE_NAME);
          const response = new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
          cache.put("./index.html", response.clone());
          return response;
        }
        return fresh;
      } catch (e) {
        const cached = await caches.match("./index.html");
        return cached || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const res = await fetch(req);
      const cache = await caches.open(CACHE_NAME);
      cache.put(req, res.clone());
      return res;
    } catch (e) {
      return cached || Response.error();
    }
  })());
});
