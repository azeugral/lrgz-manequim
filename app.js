/* LRGZ Manequim: orçamento de tatuagem tocando no corpo.
   Um código só; cada cliente é um JSON em clientes/<slug>.json. */
(async () => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- Cliente: pela página gerada ou pelo domínio ---------- */
  const BASE = window.MANEQUIM_BASE || "./";
  let C = window.MANEQUIM_CLIENTE;
  if (!C) {
    const slug = (window.MANEQUIM_HOSTS || {})[location.hostname];
    if (!slug) { location.replace("https://lrgz.com.br/"); return; }
    C = await (await fetch(`${BASE}clientes/${slug}.json`)).json();
  }
  const raiz = document.documentElement.style;
  Object.entries(C.tema).forEach(([k, v]) => raiz.setProperty("--" + k, v));
  if (C.fontes && !$("link[data-fontes]")) {
    const l = document.createElement("link");
    l.rel = "stylesheet"; l.href = C.fontes; l.dataset.fontes = "1";
    document.head.append(l);
  }
  document.title = C.titulo || `Orçamento | ${C.nome}`;
  const url = (p) => (/^https?:/.test(p) ? p : BASE + p);

  $("#logo").src = url(C.logo);
  $("#logo").alt = C.nome;
  $("#marca").textContent = C.nome;
  $("#voltar").href = C.site || "#";
  $("#voltar").textContent = C.siteRotulo || "Ver o site";
  $("#voltar").hidden = !C.site;
  $("#t-titulo").innerHTML = esc(C.textos.titulo).replace(/\n/g, "<br>");
  $("#t-sub").textContent = C.textos.sub;

  /* ---------- Regiões do corpo ---------- */
  const LD = ["Esquerdo", "Direito"], LF = ["Esquerda", "Direita"];
  const ehLado = (o) => o === LD || o === LF;
  const IO = { Interno: ".in", Externo: ".out" };
  const REG = [
    { id: "ombro", nome: "Ombro", ops: [["Frontal", "Lateral", "Posterior"], LD], pick: (p) => ({ v: p[0] === "Posterior" ? "b" : "f", k: [p[0] === "Lateral" ? "sh.{S}.out" : "sh.{S}"] }), hit: { f: ["sh.{S}"], b: ["sh.{S}"] } },
    { id: "braco", nome: "Braço", ops: [["Bíceps", "Tríceps"], ["Interno", "Externo"], LD], pick: (p) => ({ v: p[0] === "Tríceps" ? "b" : "f", k: ["arm.{S}" + (IO[p[1]] || "")] }), hit: { f: ["arm.{S}"], b: ["arm.{S}"] } },
    { id: "antebraco", nome: "Antebraço", ops: [["Interno", "Externo"], LD], pick: (p) => ({ v: "f", k: ["fore.{S}" + (IO[p[0]] || "")] }), hit: { f: ["fore.{S}"], b: ["fore.{S}"] } },
    { id: "mao", nome: "Mão", ops: [["Palma", "Dorso", "Lateral"], LD], pick: (p) => ({ v: p[0] === "Dorso" ? "b" : "f", k: [p[0] === "Lateral" ? "hand.{S}.out" : "hand.{S}"] }), hit: { f: ["hand.{S}"], b: ["hand.{S}"] } },
    { id: "peito", nome: "Peito", ops: [LD, ["Interno", "Externo"]], pick: (p) => ({ v: "f", k: ["chest.{S}" + (IO[p[1]] || "")] }), hit: { f: ["chest.{S}"] } },
    { id: "costela", nome: "Costela", ops: [LF, ["Frontal", "Lateral"]], pick: (p) => ({ v: "f", k: [p[1] ? "rib.{S}." + (p[1] === "Frontal" ? "fr" : "lat") : "rib.{S}"] }), hit: { f: ["rib.{S}"] } },
    { id: "abdomen", nome: "Abdômen", ops: [["Superior", "Central", "Inferior"], LF], pick: (p) => { const i = ["Superior", "Central", "Inferior"].indexOf(p[0]); return { v: "f", k: i >= 0 ? [`abd.${i + 1}.{S}`] : ["abd.1.{S}", "abd.2.{S}", "abd.3.{S}"] }; }, hit: { f: ["abd.1.{S}", "abd.2.{S}", "abd.3.{S}"] } },
    { id: "costas", nome: "Costas", ops: [["Alta", "Média", "Lombar"], LF], pick: (p) => { const i = ["Alta", "Média", "Lombar"].indexOf(p[0]); return { v: "b", k: i >= 0 ? [`back.${i + 1}.{S}`] : ["back.1.{S}", "back.2.{S}", "back.3.{S}"] }; }, hit: { b: ["back.1.{S}", "back.2.{S}"] } },
    { id: "lombar", nome: "Lombar", ops: [LF], pick: () => ({ v: "b", k: ["back.3.{S}"] }), hit: { b: ["back.3.{S}"] } },
    { id: "quadril", nome: "Quadril", ops: [["Frontal", "Posterior"], LD], pick: (p) => ({ v: p[0] === "Posterior" ? "b" : "f", k: ["hip.{S}"] }), hit: { f: ["hip.{S}"], b: ["hip.{S}"] } },
    { id: "coxa", nome: "Coxa", ops: [["Frontal", "Lateral", "Posterior", "Interna"], LF], pick: (p) => ({ v: p[0] === "Posterior" ? "b" : "f", k: ["thigh.{S}" + ({ Lateral: ".out", Interna: ".in" }[p[0]] || "")] }), hit: { f: ["thigh.{S}"], b: ["thigh.{S}"] } },
    { id: "joelho", nome: "Joelho", ops: [["Frontal", "Lateral", "Posterior"], LD], pick: (p) => ({ v: p[0] === "Posterior" ? "b" : "f", k: ["knee.{S}" + (p[0] === "Lateral" ? ".out" : "")] }), hit: { f: ["knee.{S}"], b: ["knee.{S}"] } },
    { id: "panturrilha", nome: "Panturrilha", ops: [["Frontal", "Lateral", "Posterior", "Interna"], LF], pick: (p) => ({ v: p[0] === "Posterior" || !p[0] ? "b" : "f", k: ["shin.{S}" + ({ Lateral: ".out", Interna: ".in" }[p[0]] || "")] }), hit: { b: ["shin.{S}"] } },
    { id: "canela", nome: "Canela", ops: [["Frontal", "Lateral"], LF], pick: (p) => ({ v: "f", k: ["shin.{S}" + (p[0] === "Lateral" ? ".out" : "")] }), hit: { f: ["shin.{S}"] } },
    { id: "pe", nome: "Pé", ops: [["Superior", "Lateral", "Tornozelo"], LD], pick: (p) => ({ v: "f", k: [p[0] === "Tornozelo" ? "ankle.{S}" : p[0] === "Lateral" ? "foot.{S}.out" : "foot.{S}"] }), hit: { f: ["foot.{S}", "ankle.{S}"], b: ["foot.{S}", "ankle.{S}"] } },
  ];
  const reg = (id) => REG.find((r) => r.id === id);
  /* A = lado esquerdo da imagem. De frente o lado direito da pessoa fica em A; de costas, em B. */
  const ladoNaImagem = (rotulo, v) => ((rotulo[0] === "D") === (v === "f") ? "A" : "B");
  function chaves(r, p) {
    const li = r.ops.findIndex(ehLado), o = r.pick(p), rot = li >= 0 ? p[li] : "";
    const lados = rot ? [ladoNaImagem(rot, o.v)] : ["A", "B"];
    return { v: o.v, keys: o.k.flatMap((t) => lados.map((s) => t.replace("{S}", s))) };
  }

  /* ---------- Estado ---------- */
  const PASSOS = [["corpo", "Corpo"], ["local", "Local"], ["estilo", "Estilo"], ["enviar", "Enviar"]];
  const COM_PALCO = { corpo: 1, local: 1, enviar: 1 };
  const vazio = () => ({ g: "", r: "", p: [], estilo: "", tam: "", cor: "", ideia: "", nome: "", idade: "", max: 0 });
  const CH = "manequim:" + C.slug;
  let D = vazio();
  try { D = { ...D, ...JSON.parse(sessionStorage.getItem(CH) || "{}") }; } catch (_) {}
  const salvar = () => { try { sessionStorage.setItem(CH, JSON.stringify(D)); } catch (_) {} };
  let passo = 0, VW = "f", tudo = 0, hover = "", previa = null;

  const regiaoPronta = () => { const r = reg(D.r); return !!r && r.ops.every((_, i) => D.p[i]); };
  function partes() {
    const r = reg(D.r);
    if (!r) return { reg: "-", lado: "" };
    const li = r.ops.findIndex(ehLado);
    return { reg: [r.nome, ...D.p.filter((x, i) => i !== li && x)].join(" · "), lado: li >= 0 ? D.p[li] : "" };
  }
  const textoRegiao = () => { const g = partes(); return [g.reg.toUpperCase(), g.lado.toUpperCase()].filter(Boolean).join(" · "); };

  /* ---------- Palco: câmera por transform, zonas em SVG por cima ---------- */
  const ZONAS = await (await fetch(url("assets/zonas.json"))).json();
  const stg = $("#stg"), cam = $("#cam"), img = $("#corpo"), ovl = $("#ovl"), cp = $("#cp");
  let Z = null;
  const estreito = () => matchMedia("(max-width: 820px)").matches;

  function preparaPalco() {
    $("#emp").hidden = !!D.g;
    if (!D.g) { cam.style.visibility = "hidden"; Z = null; ovl.innerHTML = ""; cp.hidden = true; $("#vistas").hidden = true; $("#zo").hidden = true; return; }
    const g = D.g === "Feminino" ? "F" : "M";
    Z = ZONAS[g];
    if (img.dataset.g !== g) { img.dataset.g = g; img.src = url(`assets/${g}.webp`); }
    cam.style.width = Z.W + "px"; cam.style.height = Z.H + "px";
    ovl.setAttribute("viewBox", `0 0 ${Z.W} ${Z.H}`);
    cam.style.visibility = "visible";
    img.style.clipPath = estreito() ? (VW === "f" ? "inset(0 50% 0 0)" : "inset(0 0 0 50%)") : "none";
    $("#zo").hidden = !(D.r && !tudo);
    $("#vistas").hidden = !estreito();
    $$("#vistas button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.v === VW));
  }
  function enquadra(rc, seco) {
    const sw = stg.clientWidth || 300, sh = stg.clientHeight || 300;
    let [x, y, w, h] = rc;
    const cx = x + w / 2, cy = y + h / 2;
    if (w / h < sw / sh) w = (h * sw) / sh; else h = (w * sh) / sw;
    const s = sw / w;
    if (seco) cam.style.transition = "none";
    cam.style.transform = `translate(${sw / 2 - cx * s}px,${sh / 2 - cy * s}px) scale(${s})`;
    if (seco) { void cam.offsetWidth; cam.style.transition = ""; }
  }
  function caixaGeral() {
    const m = (b, w, h) => [b[0] - w * 0.06, b[1] - h * 0.03, w * 1.12, h * 1.06];
    if (estreito()) { const b = Z.box[VW], r = m(b, b[2] - b[0], b[3] - b[1]); r[3] *= 1.1; return r; }
    const f = Z.box.f, b = Z.box.b, x0 = Math.min(f[0], b[0]), y0 = Math.min(f[1], b[1]), x1 = Math.max(f[2], b[2]), y1 = Math.max(f[3], b[3]);
    return m([x0, y0, x1, y1], x1 - x0, y1 - y0);
  }
  function ajusta(seco) {
    if (!Z) return;
    let rc = caixaGeral();
    const g = $("#hl");
    if (g && !tudo && g.childNodes.length) {
      const b = g.getBBox();
      if (b.width > 1) {
        const F = Z.box[VW], w = Math.max(b.width * 3.4, (F[2] - F[0]) * 0.72), h = (w * stg.clientHeight) / stg.clientWidth;
        rc = [b.x + b.width / 2 - w / 2, b.y + b.height / 2 - h / 2, w, h];
      }
    }
    enquadra(rc, seco);
  }
  function desenha() {
    if (!Z) return;
    const r = reg(D.r), zv = Z.z[VW];
    let h = "";
    ["f", "b"].forEach((v) => {
      const zz = Z.z[v];
      REG.forEach((x) => (x.hit[v] || []).forEach((tp) => ["A", "B"].forEach((s) => {
        const k = tp.replace("{S}", s);
        if (zz[k]) h += `<path class="ht${hover === x.id ? " on" : ""}" data-r="${x.id}" data-s="${s}" data-v="${v}" d="${zz[k]}" tabindex="0" role="button" aria-label="${x.nome} (${v === "f" ? "frente" : "costas"})"/>`;
      })));
    });
    if (r) {
      const o = chaves(r, D.p);
      let ks = null;
      if (o.v === VW) ks = o.keys;
      else if (r.hit[VW]) {
        const li = r.ops.findIndex(ehLado), rot = li >= 0 ? D.p[li] : "", ls = rot ? [ladoNaImagem(rot, VW)] : ["A", "B"];
        ks = r.hit[VW].flatMap((t) => ls.map((s) => t.replace("{S}", s)));
      }
      if (ks) h += `<g id="hl">${ks.map((k) => (zv[k] ? `<path class="hz" d="${zv[k]}"/>` : "")).join("")}</g>`;
    }
    if (previa && previa.v === VW) h += previa.keys.map((k) => (zv[k] ? `<path class="pv" d="${zv[k]}"/>` : "")).join("");
    ovl.innerHTML = h;
  }
  function legenda() {
    const r = reg(D.r), noLocal = PASSOS[passo][0] === "local";
    let t = "";
    if (D.g) t = hover ? reg(hover).nome.toUpperCase() : r ? (noLocal ? "" : "LOCAL: " + textoRegiao()) : "TOQUE NO CORPO PARA ESCOLHER";
    cp.textContent = t;
    cp.hidden = !t;
  }
  const atualiza = () => { preparaPalco(); desenha(); ajusta(false); legenda(); };

  function escolheRegiao(id, v) {
    const r = reg(id);
    tudo = 0;
    if (D.r !== id) { D.r = id; D.p = r.ops.map(() => ""); }
    hover = ""; previa = null;
    VW = v && r.hit[v] ? v : r.hit[VW] ? VW : chaves(r, D.p).v;
    salvar(); pinta(true); atualiza();
  }
  function escolheNivel(j, rot) {
    const r = reg(D.r);
    tudo = 0; hover = ""; D.p[j] = rot; previa = null;
    VW = chaves(r, D.p).v;
    salvar(); pinta(true); atualiza();
  }
  function tocouZona(el) {
    const id = el.dataset.r, v = el.dataset.v;
    if (id !== D.r || tudo) return escolheRegiao(id, v);
    const r = reg(id), li = r.ops.findIndex(ehLado);
    if (li >= 0) {
      const pessoa = (el.dataset.s === "A") === (v === "f") ? 1 : 0;
      if (D.p[li] !== r.ops[li][pessoa]) escolheNivel(li, r.ops[li][pessoa]);
    }
  }

  /* ---------- Passos ---------- */
  const voltar = (rot, acao) => `<button class="vt" data-act="${acao}"><span aria-hidden="true">←</span> Voltar <small>${esc(rot)}</small></button>`;
  const continuar = (ok) => `<div class="fim"><button class="b" data-act="nx"${ok ? "" : " disabled"}>Continuar →</button></div>`;
  const lista = (itens, chave) => `<div class="op" data-k="${chave}" role="group">${itens.map((o) => `<button data-v="${esc(o)}" aria-pressed="${D[chave] === o}">${esc(o)}</button>`).join("")}</div>`;

  function telaCorpo() {
    return `<h3>Escolha o corpo.</h3><div class="gen" role="group">${["Feminino", "Masculino"].map((g, i) => `<button data-g="${g}" aria-pressed="${D.g === g}"><b>0${i + 1}</b><span>${g}</span></button>`).join("")}</div>`;
  }
  function telaLocal() {
    const r = reg(D.r);
    let h = voltar(r ? [r.nome, ...D.p.filter(Boolean)].slice(-1)[0] : "Corpo", "vl");
    h += r ? `<span class="rt">Região selecionada</span><h3 class="sel">${esc(r.nome)}</h3>` : "<h3>Onde será a tatuagem?</h3>";
    if (r) r.ops.forEach((o, j) => { h += `<div class="sub" role="group">${o.map((x) => `<button data-li="${j}" data-lv="${x}" aria-pressed="${D.p[j] === x}">${x}</button>`).join("")}</div>`; });
    h += `<button class="ls" data-act="ls" aria-expanded="false" aria-controls="rgl">Escolher pela lista</button><div class="rgl" id="rgl" hidden>${REG.map((x) => `<button data-r="${x.id}" aria-pressed="${D.r === x.id}">${x.nome}</button>`).join("")}</div>`;
    return h + (r ? continuar(regiaoPronta()) : "");
  }
  function telaEstilo() {
    const tiles = C.estilos.map((e, i) => `<button data-v="${esc(e.nome)}" aria-pressed="${D.estilo === e.nome}">${e.foto ? `<img src="${esc(url(e.foto))}" alt="" loading="lazy">` : `<img class="sem" src="${esc(url(C.logo))}" alt="">`}<i>${["I", "II", "III", "IV", "V", "VI"][i] || ""}</i><span>${esc(e.nome)}</span></button>`).join("");
    const cores = C.cores && C.cores.length ? `<span class="rt">Cor <em>(opcional)</em></span>${lista(C.cores, "cor")}` : "";
    return voltar("Local", "bk") + `<h3>Seu estilo.</h3><div class="op tiles" data-k="estilo" role="group">${tiles}</div><span class="rt">Tamanho</span>${lista(C.tamanhos, "tam")}${cores}` + continuar(D.estilo && D.tam);
  }
  function telaEnviar() {
    const g = partes();
    const chips = [[[D.g, [g.reg, g.lado].filter(Boolean).join(" ")].join(" · "), 1], [D.estilo, 2], [D.tam, 2], [D.cor, 2]].filter((x) => x[0]);
    const canal = C.modo === "dm" ? "Instagram" : "WhatsApp";
    const nome = C.modo === "dm" ? "Copiar pedido e abrir o Instagram →" : "Enviar pelo WhatsApp →";
    return voltar("Estilo", "bk") + `<h3>Pronto.</h3><div class="chips">${chips.map((x) => `<button data-step="${x[1]}" aria-label="Alterar: ${esc(x[0])}">${esc(x[0])}</button>`).join("")}</div>
      <div class="fld"><label class="rt" for="f-nome">Nome completo <em>(obrigatório)</em></label><input id="f-nome" autocomplete="name" autocapitalize="words" maxlength="80" placeholder="Como você se chama?" value="${esc(D.nome)}"><p class="err" id="e-nome" role="alert" hidden></p></div>
      <div class="fld f2"><label class="rt" for="f-idade">Idade <em>(obrigatório)</em></label><input id="f-idade" inputmode="numeric" maxlength="3" autocomplete="off" placeholder="Somente números" value="${esc(D.idade)}"><p class="err" id="e-idade" role="alert" hidden></p></div>
      <div class="fld"><label class="rt" for="f-ideia">Sua ideia <em>(opcional)</em></label><textarea id="f-ideia" rows="2" placeholder="${esc(C.textos.ideia || "Conte em uma frase o que você imagina.")}">${esc(D.ideia)}</textarea></div>
      <p class="nota"><b>Depois de enviar o orçamento</b>, mande também as fotos de referência (desenhos, tatuagens e inspirações) na mesma conversa do ${canal}.</p>
      <div class="fim"><a class="b" id="send" href="#" target="_blank" rel="noopener">${nome}</a><button class="l" data-act="rs">Recomeçar</button></div><p class="copiado" id="copiado" hidden>Pedido copiado. Cole na conversa.</p>`;
  }

  const nomeLimpo = () => (D.nome || "").trim().replace(/\s+/g, " ");
  function mensagem() {
    const g = partes(), L = [C.textos.saudacao, "*NOVO PEDIDO DE ORÇAMENTO*", `*Nome:* ${nomeLimpo() || "-"}`, `*Idade:* ${(D.idade || "").trim() || "-"}`, `*Modelo:* ${D.g || "-"}`, `*Região:* ${g.reg}`];
    if (g.lado) L.push(`*Lado:* ${g.lado}`);
    L.push(`*Estilo:* ${D.estilo || "-"}`, `*Tamanho:* ${D.tam || "-"}`);
    if (D.cor) L.push(`*Cor:* ${D.cor}`);
    L.push(`*Observações:* ${(D.ideia || "").trim() || "-"}`, "Gostaria de saber sobre disponibilidade e os próximos passos.");
    return L.join("\n\n");
  }
  const destino = () => (C.modo === "dm" ? C.instagram : `https://wa.me/${C.whatsapp}?text=${encodeURIComponent(mensagem())}`);
  function erro(k, msg) {
    const e = $("#e-" + k), i = $("#f-" + k);
    e.hidden = !msg; e.textContent = msg || ""; i.setAttribute("aria-invalid", msg ? "true" : "false");
  }
  function valida() {
    const n = nomeLimpo(), a = (D.idade || "").trim(), id = parseInt(a, 10);
    const nOk = n.length >= 3 && /^[\p{L}\p{M}][\p{L}\p{M}'’.\- ]*$/u.test(n);
    const iOk = /^\d{1,3}$/.test(a) && id >= 1 && id <= 120;
    erro("nome", nOk ? "" : n ? "Use apenas letras no nome." : "Informe seu nome completo.");
    erro("idade", iOk ? "" : "Informe sua idade, somente números.");
    const p = !nOk ? $("#f-nome") : !iOk ? $("#f-idade") : null;
    if (p) p.focus();
    return !p;
  }

  function pinta(manter) {
    const k = PASSOS[passo][0], stp = $("#stp");
    const topo = manter ? 0 : stp.getBoundingClientRect().top;
    D.max = Math.max(D.max || 0, passo);
    $("#pr").innerHTML = PASSOS.map((p, i) => `<li class="${i < passo ? "d" : i === passo ? "on" : ""}"><button data-step="${i}"${i > D.max || i === passo ? " disabled" : ""}${i === passo ? ' aria-current="step"' : ""}><span>0${i + 1}</span>${p[1]}</button></li>`).join("");
    $("#pb").classList.toggle("v", !!COM_PALCO[k]);
    $("#pb").dataset.k = k;
    stp.innerHTML = `<div class="sp${manter ? " nk" : ""}">${{ corpo: telaCorpo, local: telaLocal, estilo: telaEstilo, enviar: telaEnviar }[k]()}</div>`;
    salvar();
    if (k === "enviar") $("#send").href = destino();
    if (COM_PALCO[k]) { preparaPalco(); desenha(); if (!manter) ajusta(true); legenda(); }
    if (!manter) { const dy = stp.getBoundingClientRect().top - topo; if (Math.abs(dy) > 1) scrollBy({ top: dy, behavior: "instant" }); }
  }
  const irPara = (n) => { passo = n; pinta(); };

  /* ---------- Eventos ---------- */
  $("#stp").addEventListener("click", (e) => {
    const t = e.target.closest("button");
    if (!t) return;
    const d = t.dataset;
    if (d.step !== undefined) return irPara(+d.step);
    if (d.g) {
      D.g = d.g; salvar();
      $$("#stp .gen button").forEach((b) => b.setAttribute("aria-pressed", b === t));
      preparaPalco(); desenha(); ajusta(true); legenda();
      setTimeout(() => { if (passo === 0 && D.g) irPara(1); }, 300);
      return;
    }
    if (d.act === "nx") return irPara(passo + 1);
    if (d.act === "bk") return irPara(passo - 1);
    if (d.act === "vl") {
      let u = -1; D.p.forEach((x, i) => { if (x) u = i; });
      if (u >= 0) { D.p[u] = ""; VW = chaves(reg(D.r), D.p).v; salvar(); pinta(true); atualiza(); }
      else if (D.r) { D.r = ""; D.p = []; salvar(); pinta(true); atualiza(); }
      else irPara(0);
      return;
    }
    if (d.act === "ls") {
      const l = $("#rgl"), abre = l.hidden;
      l.hidden = !abre; t.setAttribute("aria-expanded", abre); t.textContent = abre ? "Ocultar a lista" : "Escolher pela lista";
      return;
    }
    if (d.act === "rs") { D = vazio(); VW = "f"; tudo = 0; salvar(); return irPara(0); }
    if (d.r) return escolheRegiao(d.r);
    if (d.lv !== undefined) return escolheNivel(+d.li, d.lv);
    const o = t.closest(".op[data-k]");
    if (o && d.v) {
      const c = o.dataset.k;
      D[c] = D[c] === d.v && c === "cor" ? "" : d.v;
      salvar();
      $$("button", o).forEach((b) => b.setAttribute("aria-pressed", D[c] === b.dataset.v));
      const nx = $('#stp [data-act="nx"]');
      if (nx) nx.disabled = !(D.estilo && D.tam);
    }
  });
  $("#stp").addEventListener("input", (e) => {
    const m = { "f-nome": "nome", "f-idade": "idade", "f-ideia": "ideia" }[e.target.id];
    if (!m) return;
    if (m === "idade") e.target.value = e.target.value.replace(/\D/g, "");
    D[m] = e.target.value; salvar();
    $("#send").href = destino();
    if (m !== "ideia" && e.target.getAttribute("aria-invalid") === "true") erro(m, "");
  });
  $("#stp").addEventListener("click", async (e) => {
    const a = e.target.closest("#send");
    if (!a) return;
    if (!valida()) return e.preventDefault();
    if (C.modo === "dm") {
      try { await navigator.clipboard.writeText(mensagem()); $("#copiado").hidden = false; } catch (_) {}
    }
  });
  const temMouse = () => matchMedia("(hover:hover) and (pointer:fine)").matches;
  const marcaHover = (id) => { hover = id; $$(".ht").forEach((p) => p.classList.toggle("on", p.dataset.r === id)); legenda(); };
  $("#stp").addEventListener("mouseover", (e) => {
    if (!temMouse()) return;
    const t = e.target.closest("button");
    if (!t) return;
    if (t.dataset.r) marcaHover(t.dataset.r);
    else if (t.dataset.lv !== undefined && D.r) { const p = D.p.slice(); p[+t.dataset.li] = t.dataset.lv; previa = chaves(reg(D.r), p); desenha(); }
  });
  $("#stp").addEventListener("mouseout", (e) => {
    if (!temMouse() || !e.target.closest("button")) return;
    if (hover) marcaHover("");
    if (previa) { previa = null; desenha(); }
  });
  ovl.addEventListener("click", (e) => { const p = e.target.closest(".ht"); if (p) tocouZona(p); });
  ovl.addEventListener("mouseover", (e) => { if (!temMouse()) return; const p = e.target.closest(".ht"); if (p) marcaHover(p.dataset.r); });
  ovl.addEventListener("mouseout", (e) => { if (temMouse() && e.target.closest(".ht")) marcaHover(""); });
  ovl.addEventListener("keydown", (e) => { const p = e.target.closest(".ht"); if (p && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); tocouZona(p); } });
  $("#pr").addEventListener("click", (e) => { const b = e.target.closest("button[data-step]"); if (b && !b.disabled) irPara(+b.dataset.step); });
  $("#zo").addEventListener("click", () => { tudo = 1; preparaPalco(); ajusta(false); });
  $("#vistas").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    VW = b.dataset.v; tudo = 1; preparaPalco(); desenha(); ajusta(false);
  });
  stg.addEventListener("click", (e) => {
    if (!temMouse() || !Z || !D.r || tudo || e.target.closest(".ht")) return;
    tudo = 1; preparaPalco(); ajusta(false);
  });
  new ResizeObserver(() => { if (Z) { preparaPalco(); ajusta(true); } }).observe(stg);

  passo = D.g ? (D.max >= 1 ? Math.min(D.max, 3) : 1) : 0;
  if (D.r) { VW = chaves(reg(D.r), D.p).v; }
  pinta(true);
  if (COM_PALCO[PASSOS[passo][0]]) ajusta(true);
})();
