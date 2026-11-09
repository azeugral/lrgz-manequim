/* LRGZ Manequim v2: orçamento de tatuagem em 3 passos.
   1 Local (um toque no corpo já define região e lado) · 2 Projeto · 3 Enviar.
   Um código só; cada cliente é um JSON em clientes/<slug>.json. */
(async () => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const NS = "http://www.w3.org/2000/svg";

  /* ---------- Cliente ---------- */
  const BASE = window.MANEQUIM_BASE || "./";
  let C = window.MANEQUIM_CLIENTE;
  if (!C) {
    const slug = (window.MANEQUIM_HOSTS || {})[location.hostname];
    if (!slug) { location.replace("https://lrgz.com.br/"); return; }
    C = await (await fetch(`${BASE}clientes/${slug}.json`)).json();
  }
  Object.entries(C.tema).forEach(([k, v]) => document.documentElement.style.setProperty("--" + k, v));
  if (C.fontes && ![...document.querySelectorAll("link[data-fontes]")].some((x) => x.href === new URL(C.fontes, location.href).href)) {
    const l = document.createElement("link");
    l.rel = "stylesheet"; l.href = C.fontes; l.dataset.fontes = "1";
    document.head.append(l);
  }
  const url = (p) => (/^https?:/.test(p) ? p : BASE + p);
  // ?embed=1: só o manequim, dentro do formulário do site do cliente (iframe). Avisa o site a cada toque.
  const EMBED = new URLSearchParams(location.search).has("embed");
  if (EMBED) document.documentElement.classList.add("embed");
  document.documentElement.dataset.cliente = C.slug;
  if (C.css && !$("link[data-skin]")) { const k = document.createElement("link"); k.rel = "stylesheet"; k.href = url(C.css) + "?v=8"; k.dataset.skin = "1"; document.head.append(k); }
  const ico = $("link[rel=icon]"); if (ico) ico.href = url(C.favicon || C.logo);
  document.title = C.titulo || `Orçamento | ${C.nome}`;
  $("#logo").src = url(C.logo); $("#logo").alt = C.nome;
  $("#marca").textContent = C.nome;
  // Topo: Instagram e site oficial como links claros (ícone + rótulo + endereço); no celular só o ícone.
  const ICO = {
    insta: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.4" cy="6.6" r="1.1" class="p"/></svg>',
    site: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.7 3.9 5.7 3.9 9s-1.3 6.3-3.9 9c-2.6-2.7-3.9-5.7-3.9-9S9.4 5.7 12 3z"/></svg>',
  };
  const linkTopo = (el, href, ico, rot, val) => {
    el.href = href; el.hidden = false; el.setAttribute("aria-label", `${rot}: ${val}`);
    el.innerHTML = `${ICO[ico]}<span><small>${esc(rot)}</small>${esc(val)}</span><i aria-hidden="true">↗</i>`;
  };
  if (C.instagram) linkTopo($("#insta"), C.instagram, "insta", "Instagram", "@" + C.instagram.replace(/\/+$/, "").split("/").pop());
  if (C.site) linkTopo($("#voltar"), C.site, "site", "Site oficial", C.siteRotulo || C.site.replace(/^https?:\/\//, ""));
  $("#t-titulo").innerHTML = esc(C.textos.titulo).replace(/\n/g, "<br>");
  $("#t-sub").textContent = C.textos.sub;

  /* ---------- Zonas v4: regiões amplas (feedback do Samtto) ---------- */
  // lado: true = a zona existe dos dois lados (A/B); false = zona central (C). Toque soma ou tira a região.
  const Zs = [
    { id: "rosto", nome: "Rosto", v: "f", k: "face.{S}", lado: true },
    { id: "pescoco", nome: "Pescoço", v: "f", k: "neck.{S}", lado: false },
    { id: "ombro", nome: "Ombro", v: "f", k: "sh.{S}", lado: true },
    { id: "peito", nome: "Peito", v: "f", k: "chest.{S}", lado: true },
    { id: "braco", nome: "Braço", v: "f", k: "arm.{S}", lado: true },
    { id: "antebraco-int", nome: "Antebraço interno", v: "f", k: "fore.{S}", lado: true },
    { id: "palma", nome: "Palma da mão", v: "f", k: "hand.{S}", lado: true },
    { id: "costela", nome: "Costela", v: "f", k: "rib.{S}", lado: true },
    { id: "abdomen", nome: "Abdômen", v: "f", k: "abd.{S}", lado: false },
    { id: "quadril", nome: "Quadril", v: "f", k: "hip.{S}", lado: true },
    { id: "coxa", nome: "Coxa", v: "f", k: "thigh.{S}", lado: true },
    { id: "joelho", nome: "Joelho", v: "f", k: "knee.{S}", lado: true },
    { id: "canela", nome: "Canela", v: "f", k: "leg.{S}", lado: true },
    { id: "pe", nome: "Pé", v: "f", k: "foot.{S}", lado: true },
    { id: "cabeca", nome: "Cabeça", v: "b", k: "head.{S}", lado: false },
    { id: "nuca", nome: "Nuca", v: "b", k: "neck.{S}", lado: false },
    { id: "ombro-post", nome: "Ombro (atrás)", v: "b", k: "sh.{S}", lado: true },
    { id: "triceps", nome: "Tríceps", v: "b", k: "arm.{S}", lado: true },
    { id: "antebraco-ext", nome: "Antebraço externo", v: "b", k: "fore.{S}", lado: true },
    { id: "dorso-mao", nome: "Dorso da mão", v: "b", k: "hand.{S}", lado: true },
    { id: "costas", nome: "Costas", v: "b", k: "back.top.{S}", lado: false },
    { id: "lombar", nome: "Lombar até o cóccix", v: "b", k: "back.low.{S}", lado: false },
    { id: "gluteo", nome: "Glúteo", v: "b", k: "hip.{S}", lado: true },
    { id: "posterior-coxa", nome: "Posterior da coxa", v: "b", k: "thigh.{S}", lado: true },
    { id: "panturrilha", nome: "Panturrilha", v: "b", k: "leg.{S}", lado: true },
    { id: "calcanhar", nome: "Calcanhar", v: "b", k: "foot.{S}", lado: true },
  ];
  const zona = (id) => Zs.find((z) => z.id === id);
  // A = lado esquerdo da imagem: de frente é o lado direito da pessoa; de costas, o esquerdo.
  const ladoDe = (s, v) => (s === "C" ? "" : (s === "A") === (v === "f") ? "Direito" : "Esquerdo");

  /* ---------- Estado ---------- */
  const PASSOS = ["Local", "Projeto", "Enviar"];
  // sel: lista "zona:S" (várias regiões); semLocal: a pessoa decide o local depois
  const vazio = () => ({ g: "Feminino", sel: [], semLocal: false, outro: "", estilo: "", tam: "", cor: "", ideia: "", nome: "", idade: "", max: 0 });
  const CH = "manequim4:" + C.slug;
  let D = vazio();
  try { D = { ...D, ...JSON.parse(sessionStorage.getItem(CH) || "{}") }; } catch (_) {}
  D.sel = (D.sel || []).filter((x) => zona(x.split(":")[0]));
  const avisa = () => EMBED && parent !== window && parent.postMessage({ manequim: 1, local: D.sel.length || outroTxt() ? regiaoTexto() : "", corpo: D.sel.length ? D.g : "", altura: document.documentElement.scrollHeight }, "*");
  const salvar = () => { try { sessionStorage.setItem(CH, JSON.stringify(D)); } catch (_) {} avisa(); };
  let passo = 0, VW = "f";

  // Link com escolha pronta: ?estilo=Flash&tamanho=Pequena&desenho=Morcego (ex.: vindo dos disponíveis do site)
  const Q = new URLSearchParams(location.search);
  if (Q.has("estilo") || Q.has("desenho") || Q.has("tamanho")) {
    const acha = (lista, v) => lista.find((x) => x.toLowerCase().startsWith((v || "").toLowerCase().trim()));
    D = { ...vazio(), g: D.g, nome: D.nome, idade: D.idade };
    D.estilo = acha(C.estilos.map((e) => e.nome), Q.get("estilo")) || "";
    D.tam = Q.get("tamanho") ? acha(C.tamanhos, Q.get("tamanho")) || "" : "";
    if (Q.get("desenho")) D.ideia = `Desenho: ${Q.get("desenho").slice(0, 80)}`;
    history.replaceState(null, "", location.pathname);
  }

  const outroTxt = () => (D.outro || "").trim();
  const localPronto = () => !!(D.sel.length || outroTxt() || D.semLocal);
  const projetoPronto = () => !!(D.estilo && D.tam);
  // "Braço direito", "Braço (os dois lados)", "Abdômen"
  function nomesSel() {
    const por = new Map();
    D.sel.forEach((x) => { const [id, s] = x.split(":"); if (!por.has(id)) por.set(id, []); por.get(id).push(s); });
    return [...por].map(([id, ss]) => {
      const z = zona(id);
      if (!z.lado) return z.nome;
      if (ss.length > 1) return `${z.nome} (os dois lados)`;
      return `${z.nome} ${ladoDe(ss[0], z.v).toLowerCase()}`;
    });
  }
  function regiaoTexto() {
    const l = nomesSel();
    if (outroTxt()) l.push(outroTxt());
    return l.length ? l.join(" + ") : D.semLocal ? "A combinar" : "-";
  }

  /* ---------- Palco ---------- */
  const ZONAS = await (await fetch(url("assets/zonas.json?v=8"))).json();
  ["F", "M"].forEach((g) => { const i = new Image(); i.src = url(`assets/${g}.webp?v=8`); });   // troca de corpo sem atraso
  const svg = $("#palco"), img = $("#corpo"), gz = $("#zonas"), gs = $("#sel"), legenda = $("#legenda");
  const estreito = () => matchMedia("(max-width: 760px)").matches;
  const Zg = () => ZONAS[D.g === "Masculino" ? "M" : "F"];
  if (ZONAS.F && ZONAS.F.fundo) document.documentElement.style.setProperty("--estudio", ZONAS.F.fundo);   // resumo certo mesmo abrindo direto no passo 3

  function caixa() {
    const Z = Zg(), pad = (b) => { const w = b[2] - b[0], h = b[3] - b[1]; return [b[0] - w * 0.08, b[1] - h * 0.03, w * 1.16, h * 1.1]; };
    if (estreito()) return pad(Z.box[VW]);
    const f = Z.box.f, b = Z.box.b;
    return pad([Math.min(f[0], b[0]), Math.min(f[1], b[1]), Math.max(f[2], b[2]), Math.max(f[3], b[3])]);
  }
  // caminhos SVG das regiões marcadas
  const caminhosSel = () => D.sel.map((x) => { const [id, s] = x.split(":"), z = zona(id); return Zg().z[z.v][z.k.replace("{S}", s)] || ""; }).filter(Boolean);
  function desenhaPalco() {
    const Z = Zg(), g = D.g === "Masculino" ? "M" : "F";
    if (img.dataset.g !== g) { img.dataset.g = g; img.setAttribute("href", url(`assets/${g}.webp?v=8`)); }
    if (Z.fundo) document.documentElement.style.setProperty("--estudio", Z.fundo);
    img.setAttribute("width", Z.W); img.setAttribute("height", Z.H);
    const [x, y, w, h] = caixa();
    // no celular só a vista atual aparece: corta a outra metade da imagem
    const meio = (Z.box.f[2] + Z.box.b[0]) / 2, so = estreito(), r0 = $("#cvr");
    r0.setAttribute("x", so && VW === "b" ? meio : 0); r0.setAttribute("y", 0);
    r0.setAttribute("width", so ? (VW === "f" ? meio : Z.W - meio) : Z.W); r0.setAttribute("height", Z.H);
    svg.setAttribute("viewBox", `${x} ${y} ${w} ${h}`);
    let html = "";
    Zs.forEach((z) => {
      if (so && z.v !== VW) return;
      (z.lado ? ["A", "B"] : ["C"]).forEach((s) => {
        const d = Z.z[z.v][z.k.replace("{S}", s)];
        if (!d) return;
        const lado = ladoDe(s, z.v), rot = z.nome + (lado ? " " + lado.toLowerCase() : "");
        const on = D.sel.includes(`${z.id}:${s}`);
        html +=`<path class="z${on ? " on" : ""}" data-z="${z.id}" data-s="${s}" d="${d}" tabindex="0" role="button" aria-pressed="${on}" aria-label="${rot}"><title>${rot}</title></path>`;
      });
    });
    gz.innerHTML = html;
    gs.innerHTML = caminhosSel().map((d) => `<path class="hz" d="${d}"/>`).join("");
    // rótulos de vista no desktop
    const r = $("#rotulos");
    if (estreito()) { r.innerHTML = ""; }
    else {
      const yb = Math.max(Z.box.f[3], Z.box.b[3]) + h * 0.045, cx = (b) => (b[0] + b[2]) / 2;
      r.innerHTML = `<text x="${cx(Z.box.f)}" y="${yb}">FRENTE</text><text x="${cx(Z.box.b)}" y="${yb}">COSTAS</text>`;
      $$("text", r).forEach((t) => t.setAttribute("font-size", Math.round(h * 0.016)));
    }
    $$("#seg-g button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.g === D.g));
    $$("#seg-v button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.v === VW));
    mostraLegenda();
  }
  function mostraLegenda(hover) {
    if (hover) { legenda.textContent = hover; legenda.classList.add("pre"); return; }
    legenda.classList.remove("pre");
    const toque = estreito() ? "Toque" : "Clique";
    legenda.textContent = D.sel.length || outroTxt() ? regiaoTexto() : `${toque} onde vai a tatuagem`;
  }

  /* ---------- Passos ---------- */
  function painelLocal() {
    let h = "";
    if (D.sel.length) h += `<p class="dica">${estreito() ? "Toque" : "Clique"} em outra região para somar, ou na mesma para tirar.</p><div class="seg"><button data-limpa>Limpar</button></div>`;
    h += `<details class="outro"${D.outro ? " open" : ""}><summary>Não achou o local?</summary><input id="f-outro" maxlength="60" placeholder="Ex.: dedos, atrás da orelha, costela até o quadril" value="${esc(D.outro)}"></details>`;
    if (!EMBED && !D.sel.length && !outroTxt()) h += `<button class="pular" data-pular>Ainda não sei o local, decido depois</button>`;
    return h;
  }
  function telaProjeto() {
    const tiles = C.estilos.map((e) => `<button data-v="${esc(e.nome)}" aria-pressed="${D.estilo === e.nome}">${e.foto ? `<img src="${esc(url(e.foto))}" alt="" loading="lazy">` : `<span class="sem"><img src="${esc(url(C.logo))}" alt=""></span>`}<b>${esc(e.nome)}</b></button>`).join("");
    const tams = C.tamanhos.map((t) => { const [n, m] = t.split(" · "); return `<button data-v="${esc(t)}" aria-pressed="${D.tam === t}"><b>${esc(n)}</b>${m ? `<small>${esc(m)}</small>` : ""}</button>`; }).join("");
    const cores = C.cores && C.cores.length ? `<h3>Cor <em>opcional</em></h3><div class="grade g${C.cores.length}" data-k="cor">${C.cores.map((c) => `<button data-v="${esc(c)}" aria-pressed="${D.cor === c}"><b>${esc(c)}</b></button>`).join("")}</div>` : "";
    return `<h3>Estilo</h3><div class="estilos g${C.estilos.length}" data-k="estilo">${tiles}</div>
      <h3>Tamanho</h3><div class="grade g${C.tamanhos.length}" data-k="tam">${tams}</div>${cores}`;
  }
  function telaEnviar() {
    const linhas = [["Local", regiaoTexto(), 0]];
    if (D.sel.length) linhas.push(["Corpo", D.g, 0]);
    linhas.push(["Estilo", D.estilo, 1], ["Tamanho", D.tam, 1]);
    if (D.cor) linhas.push(["Cor", D.cor, 1]);
    const canal = C.modo === "dm" ? "Instagram" : "WhatsApp";
    return `<div class="resumo">
        <div class="mini-wrap">${D.sel.length ? `<svg class="mini" id="mini" xmlns="${NS}"><image href="${url(`assets/${D.g === "Masculino" ? "M" : "F"}.webp`)}" width="${Zg().W}" height="${Zg().H}"/><g>${caminhosSel().map((d) => `<path class="hz" d="${d}"/>`).join("")}</g></svg>` : `<span class="mini-vazio">${D.semLocal && !outroTxt() ? "Local a combinar no chat" : esc(regiaoTexto())}</span>`}</div>
        <dl>${linhas.map((l) => `<div><dt>${l[0]}</dt><dd>${esc(l[1])}</dd><button class="alt" data-ir="${l[2]}" aria-label="Alterar ${l[0].toLowerCase()}">Alterar</button></div>`).join("")}</dl>
      </div>
      <div class="campos">
        <div class="fld"><label for="f-nome">Nome completo</label><input id="f-nome" autocomplete="name" autocapitalize="words" maxlength="80" placeholder="Como você se chama?" value="${esc(D.nome)}"><p class="err" id="e-nome" role="alert" hidden></p></div>
        <div class="fld"><label for="f-idade">Idade</label><input id="f-idade" inputmode="numeric" maxlength="3" autocomplete="off" placeholder="Somente números" value="${esc(D.idade)}"><p class="err" id="e-idade" role="alert" hidden></p></div>
      </div>
      <div class="fld"><label for="f-ideia">Sua ideia <em>opcional</em></label><textarea id="f-ideia" rows="3" placeholder="${esc(C.textos.ideia || "Conte em uma frase o que você imagina.")}">${esc(D.ideia)}</textarea></div>
      <p class="nota">Depois de enviar, mande as fotos de referência na mesma conversa do ${canal}.</p>
      <p class="copiado" id="copiado" hidden>Pedido copiado. Cole na conversa do Instagram.</p>`;
  }

  /* ---------- Mensagem ---------- */
  const nomeLimpo = () => (D.nome || "").trim().replace(/\s+/g, " ");
  // Mensagem curta e escaneável: apresentação numa linha, ficha em blocos, pergunta de fechamento.
  function mensagem() {
    const T = C.textos, nome = nomeLimpo(), idade = (D.idade || "").trim();
    const ola = T.ola || `Olá, ${C.nome}!`;
    const quem = nome ? `Aqui é *${nome}*${idade ? `, ${idade} anos` : ""}.` : "";
    const local = regiaoTexto() === "A combinar" ? "ainda não decidi, a gente combina" : regiaoTexto() + (D.sel.length ? ` · corpo ${D.g.toLowerCase()}` : "");
    const ficha = [["LOCAL", local], ["ESTILO", D.estilo], ["TAMANHO", D.tam], ["COR", D.cor]].filter((x) => x[1]).map(([k, v]) => `*${k}:* ${v}`);
    const ideia = (D.ideia || "").trim();
    const L = [`${ola} ${quem} Vim pelo site e quero um orçamento.`.replace(/\s+/g, " ").trim(), ficha.join("\n")];
    if (ideia) L.push(`*IDEIA:*\n_${ideia.replace(/[_*~]/g, "")}_`);
    L.push(T.fecho || "Tem horário nas próximas semanas? Se precisar, mando referências por aqui.");
    L.push(`_Pedido feito em ${location.host || C.siteRotulo}_`);
    return L.join("\n\n");
  }
  const destino = () => (C.modo === "dm" ? C.instagram : `https://wa.me/${C.whatsapp}?text=${encodeURIComponent(mensagem())}`);
  function erro(k, msg) { const e = $("#e-" + k), i = $("#f-" + k); e.hidden = !msg; e.textContent = msg || ""; i.setAttribute("aria-invalid", msg ? "true" : "false"); }
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

  /* ---------- Render ---------- */
  function rodape() {
    const ok = [localPronto(), projetoPronto(), true][passo];
    const falta = ["Marque o local no corpo, ou diga que ainda não sabe.", !D.estilo && !D.tam ? "Escolha o estilo e o tamanho." : !D.estilo ? "Falta escolher o estilo." : "Falta escolher o tamanho.", ""][passo];
    const nome = passo === 2 ? (C.modo === "dm" ? "Copiar pedido e abrir o Instagram" : "Enviar pelo WhatsApp") : "Continuar";
    $("#acao").innerHTML = `${passo > 0 ? `<button class="vt" data-act="bk">Voltar</button>` : `<span></span>`}
      ${passo === 2 ? `<a class="b" id="send" href="${esc(destino())}" target="_blank" rel="noopener">${nome}</a>` : `<button class="b" data-act="nx"${ok ? "" : " disabled"}>${nome}</button>`}
      <span class="falta">${ok ? "" : falta}</span>`;
  }
  function pinta(rolar) {
    D.max = Math.max(D.max || 0, passo);
    $("#pr").innerHTML = PASSOS.map((p, i) => `<li class="${i < passo ? "d" : i === passo ? "on" : ""}"><button data-ir="${i}"${i > D.max || i === passo ? " disabled" : ""}${i === passo ? ' aria-current="step"' : ""}><span>0${i + 1}</span>${p}</button></li>`).join("");
    document.body.dataset.passo = passo;
    $("#local").hidden = passo !== 0;
    $("#tela").hidden = passo === 0;
    if (passo === 0) { desenhaPalco(); $("#painel").innerHTML = painelLocal(); }
    else $("#tela").innerHTML = `<div class="entra">${passo === 1 ? telaProjeto() : telaEnviar()}</div>`;
    if (passo === 2 && D.sel.length) requestAnimationFrame(enquadraMini);
    rodape();
    salvar();
    if (rolar) $("#pr").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }
  function enquadraMini() {
    const m = $("#mini"); if (!m) return;
    const p = $("g", m); if (!p || !p.firstChild) return;
    const b = p.getBBox(), s = Math.max(b.width, b.height) * (D.sel.length > 1 ? 1.25 : 1.9), cx = b.x + b.width / 2, cy = b.y + b.height / 2;
    m.setAttribute("viewBox", `${cx - s / 2} ${cy - s / 2} ${s} ${s}`);
  }
  const irPara = (n) => { passo = n; pinta(true); };

  // toque soma a região; tocar de novo tira
  function escolhe(id, s) {
    const k = `${id}:${s}`;
    D.sel = D.sel.includes(k) ? D.sel.filter((x) => x !== k) : [...D.sel, k];
    D.semLocal = false;
    salvar(); desenhaPalco(); $("#painel").innerHTML = painelLocal(); rodape();
  }

  /* ---------- Eventos ---------- */
  gz.addEventListener("click", (e) => { const p = e.target.closest(".z"); if (p) escolhe(p.dataset.z, p.dataset.s); });
  gz.addEventListener("keydown", (e) => { const p = e.target.closest(".z"); if (p && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); escolhe(p.dataset.z, p.dataset.s); } });
  gz.addEventListener("mouseover", (e) => { const p = e.target.closest(".z"); if (p) mostraLegenda(p.getAttribute("aria-label")); });
  gz.addEventListener("mouseleave", () => mostraLegenda());
  $("#seg-g").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) { D.g = b.dataset.g; salvar(); desenhaPalco(); } });
  $("#seg-v").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) { VW = b.dataset.v; desenhaPalco(); } });
  $("#painel").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.pular !== undefined) { D.sel = []; D.outro = ""; D.semLocal = true; return irPara(1); }
    if (b.dataset.limpa !== undefined) D.sel = [];
    salvar(); desenhaPalco(); $("#painel").innerHTML = painelLocal(); rodape();
  });
  $("#painel").addEventListener("input", (e) => {
    if (e.target.id !== "f-outro") return;
    D.outro = e.target.value; D.semLocal = false;
    salvar(); mostraLegenda(); rodape();
  });
  $("#tela").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.ir !== undefined) return irPara(+b.dataset.ir);
    const g = b.closest("[data-k]");
    if (g && b.dataset.v) {
      const k = g.dataset.k;
      D[k] = k === "cor" && D[k] === b.dataset.v ? "" : b.dataset.v;
      $$("button", g).forEach((x) => x.setAttribute("aria-pressed", D[k] === x.dataset.v));
      salvar(); rodape();
    }
  });
  $("#tela").addEventListener("input", (e) => {
    const m = { "f-nome": "nome", "f-idade": "idade", "f-ideia": "ideia" }[e.target.id]; if (!m) return;
    if (m === "idade") e.target.value = e.target.value.replace(/\D/g, "");
    D[m] = e.target.value; salvar();
    const a = $("#send"); if (a) a.href = destino();
    if (m !== "ideia" && e.target.getAttribute("aria-invalid") === "true") erro(m, "");
  });
  $("#acao").addEventListener("click", async (e) => {
    const a = e.target.closest("#send");
    if (a) {
      if (!valida()) return e.preventDefault();
      if (C.modo === "dm") { try { await navigator.clipboard.writeText(mensagem()); $("#copiado").hidden = false; } catch (_) {} }
      return;
    }
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.act === "nx") irPara(passo + 1);
    if (b.dataset.act === "bk") irPara(passo - 1);
  });
  $("#pr").addEventListener("click", (e) => { const b = e.target.closest("button[data-ir]"); if (b && !b.disabled) irPara(+b.dataset.ir); });
  let largura = estreito();
  addEventListener("resize", () => { if (estreito() !== largura) { largura = estreito(); if (passo === 0) desenhaPalco(); } });

  if (D.sel.length) VW = zona(D.sel[D.sel.length - 1].split(":")[0]).v;
  passo = EMBED ? 0 : Math.min(D.max || 0, localPronto() ? (projetoPronto() ? 2 : 1) : 0);
  pinta(false);
  if (EMBED) { new ResizeObserver(avisa).observe(document.body); avisa(); }
})();
