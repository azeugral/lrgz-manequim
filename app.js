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
  if (C.fontes && !$("link[data-fontes]")) {
    const l = document.createElement("link");
    l.rel = "stylesheet"; l.href = C.fontes; l.dataset.fontes = "1";
    document.head.append(l);
  }
  const url = (p) => (/^https?:/.test(p) ? p : BASE + p);
  document.title = C.titulo || `Orçamento | ${C.nome}`;
  $("#logo").src = url(C.logo); $("#logo").alt = C.nome;
  $("#marca").textContent = C.nome;
  if (C.site) { $("#voltar").href = C.site; $("#voltar").textContent = C.siteRotulo || "Site"; $("#voltar").hidden = false; }
  if (C.instagram) { $("#insta").href = C.instagram; $("#insta").textContent = "@" + C.instagram.replace(/\/+$/, "").split("/").pop(); $("#insta").hidden = false; }
  $("#t-titulo").innerHTML = esc(C.textos.titulo).replace(/\n/g, "<br>");
  $("#t-sub").textContent = C.textos.sub;

  /* ---------- Zonas: cada uma já é região final ---------- */
  // lado: true = a zona existe dos dois lados (A/B); false = zona central (C).
  // det: detalhe opcional; k é a subzona destacada no corpo quando existe.
  const Zs = [
    { id: "pescoco", nome: "Pescoço", v: "f", k: "neck.{S}", lado: false },
    { id: "ombro", nome: "Ombro", v: "f", k: "sh.{S}", lado: true, det: [["Frente", "sh.{S}"], ["Lateral", "sh.{S}.out"]] },
    { id: "peito", nome: "Peito", v: "f", k: "chest.{S}", lado: true, det: [["Centro", "chest.{S}.in"], ["Lateral", "chest.{S}.out"]] },
    { id: "braco", nome: "Braço", v: "f", k: "arm.{S}", lado: true, det: [["Interno", "arm.{S}.in"], ["Externo", "arm.{S}.out"]] },
    { id: "antebraco-int", nome: "Antebraço interno", v: "f", k: "fore.{S}", lado: true },
    { id: "palma", nome: "Palma da mão", v: "f", k: "hand.{S}", lado: true },
    { id: "costela", nome: "Costela", v: "f", k: "rib.{S}", lado: true, det: [["Frente", "rib.{S}.fr"], ["Lateral", "rib.{S}.lat"]] },
    { id: "abd-sup", nome: "Abdômen superior", v: "f", k: "abd.1.{S}", lado: false },
    { id: "abd-cen", nome: "Abdômen central", v: "f", k: "abd.2.{S}", lado: false },
    { id: "abd-inf", nome: "Abdômen inferior", v: "f", k: "abd.3.{S}", lado: false },
    { id: "quadril", nome: "Quadril", v: "f", k: "hip.{S}", lado: true },
    { id: "coxa", nome: "Coxa", v: "f", k: "thigh.{S}", lado: true, det: [["Frente", "thigh.{S}"], ["Lateral", "thigh.{S}.out"], ["Interna", "thigh.{S}.in"]] },
    { id: "joelho", nome: "Joelho", v: "f", k: "knee.{S}", lado: true },
    { id: "canela", nome: "Canela", v: "f", k: "shin.{S}", lado: true },
    { id: "tornozelo", nome: "Tornozelo", v: "f", k: "ankle.{S}", lado: true },
    { id: "pe", nome: "Peito do pé", v: "f", k: "foot.{S}", lado: true },
    { id: "nuca", nome: "Nuca", v: "b", k: "neck.{S}", lado: false },
    { id: "ombro-post", nome: "Ombro (atrás)", v: "b", k: "sh.{S}", lado: true },
    { id: "triceps", nome: "Tríceps", v: "b", k: "arm.{S}", lado: true },
    { id: "antebraco-ext", nome: "Antebraço externo", v: "b", k: "fore.{S}", lado: true },
    { id: "dorso-mao", nome: "Dorso da mão", v: "b", k: "hand.{S}", lado: true },
    { id: "costas-alta", nome: "Costas alta", v: "b", k: "back.1.{S}", lado: false },
    { id: "costas-media", nome: "Costas média", v: "b", k: "back.2.{S}", lado: false },
    { id: "lombar", nome: "Lombar", v: "b", k: "back.3.{S}", lado: false },
    { id: "gluteo", nome: "Glúteo", v: "b", k: "hip.{S}", lado: true },
    { id: "posterior-coxa", nome: "Posterior da coxa", v: "b", k: "thigh.{S}", lado: true },
    { id: "atras-joelho", nome: "Atrás do joelho", v: "b", k: "knee.{S}", lado: true },
    { id: "panturrilha", nome: "Panturrilha", v: "b", k: "shin.{S}", lado: true, det: [["Centro", "shin.{S}"], ["Lateral", "shin.{S}.out"], ["Interna", "shin.{S}.in"]] },
    { id: "tornozelo-post", nome: "Tornozelo (atrás)", v: "b", k: "ankle.{S}", lado: true },
    { id: "calcanhar", nome: "Calcanhar", v: "b", k: "foot.{S}", lado: true },
  ];
  const zona = (id) => Zs.find((z) => z.id === id);
  // A = lado esquerdo da imagem: de frente é o lado direito da pessoa; de costas, o esquerdo.
  const ladoDe = (s, v) => (s === "C" ? "" : (s === "A") === (v === "f") ? "Direito" : "Esquerdo");
  const sDe = (lado, v) => (!lado ? "C" : (lado === "Direito") === (v === "f") ? "A" : "B");

  /* ---------- Estado ---------- */
  const PASSOS = ["Local", "Projeto", "Enviar"];
  const vazio = () => ({ g: "Feminino", z: "", lado: "", det: "", outro: "", estilo: "", tam: "", cor: "", ideia: "", nome: "", idade: "", max: 0 });
  const CH = "manequim2:" + C.slug;
  let D = vazio();
  try { D = { ...D, ...JSON.parse(sessionStorage.getItem(CH) || "{}") }; } catch (_) {}
  const salvar = () => { try { sessionStorage.setItem(CH, JSON.stringify(D)); } catch (_) {} };
  let passo = 0, VW = "f";

  const localPronto = () => !!(D.z || (D.outro || "").trim());
  const projetoPronto = () => !!(D.estilo && D.tam);
  function regiao() {
    if (!D.z) return { reg: (D.outro || "").trim() || "-", lado: "" };
    const z = zona(D.z);
    return { reg: z.nome + (D.det ? " · " + D.det : ""), lado: D.lado };
  }
  const regiaoTexto = () => { const r = regiao(); return r.reg + (r.lado ? " · lado " + r.lado.toLowerCase() : ""); };

  /* ---------- Palco ---------- */
  const ZONAS = await (await fetch(url("assets/zonas.json"))).json();
  const svg = $("#palco"), img = $("#corpo"), gz = $("#zonas"), gs = $("#sel"), legenda = $("#legenda");
  const estreito = () => matchMedia("(max-width: 760px)").matches;
  const Zg = () => ZONAS[D.g === "Masculino" ? "M" : "F"];

  function caixa() {
    const Z = Zg(), pad = (b) => { const w = b[2] - b[0], h = b[3] - b[1]; return [b[0] - w * 0.08, b[1] - h * 0.03, w * 1.16, h * 1.1]; };
    if (estreito()) return pad(Z.box[VW]);
    const f = Z.box.f, b = Z.box.b;
    return pad([Math.min(f[0], b[0]), Math.min(f[1], b[1]), Math.max(f[2], b[2]), Math.max(f[3], b[3])]);
  }
  function chavesSel() {
    if (!D.z) return [];
    const z = zona(D.z), s = sDe(z.lado ? D.lado : "", z.v);
    const d = D.det && z.det && z.det.find((x) => x[0] === D.det);
    return [(d ? d[1] : z.k).replace("{S}", s)];
  }
  function desenhaPalco() {
    const Z = Zg(), g = D.g === "Masculino" ? "M" : "F";
    if (img.dataset.g !== g) { img.dataset.g = g; img.setAttribute("href", url(`assets/${g}.webp`)); }
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
        const on = D.z === z.id && (!z.lado || D.lado === lado);
        html += `<path class="z${on ? " on" : ""}" data-z="${z.id}" data-s="${s}" d="${d}" tabindex="0" role="button" aria-pressed="${on}" aria-label="${rot}"><title>${rot}</title></path>`;
      });
    });
    gz.innerHTML = html;
    const vs = Z.z, ks = chavesSel(), zz = D.z ? vs[zona(D.z).v] : null;
    gs.innerHTML = ks.map((k) => (zz && zz[k] ? `<path class="hz" d="${zz[k]}"/>` : "")).join("");
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
    legenda.textContent = localPronto() ? regiaoTexto() : (estreito() ? "Toque onde vai a tatuagem" : "Clique onde vai a tatuagem");
  }

  /* ---------- Passos ---------- */
  function painelLocal() {
    const z = D.z ? zona(D.z) : null;
    let h = "";
    if (z && z.lado) h += `<div class="linha"><span class="rot">Lado</span><div class="seg">${["Esquerdo", "Direito"].map((l) => `<button data-lado="${l}" aria-pressed="${D.lado === l}">${l}</button>`).join("")}</div></div>`;
    if (z && z.det) h += `<div class="linha"><span class="rot">Detalhe <em>opcional</em></span><div class="seg">${z.det.map((d) => `<button data-det="${d[0]}" aria-pressed="${D.det === d[0]}">${d[0]}</button>`).join("")}</div></div>`;
    h += `<details class="outro"${D.outro ? " open" : ""}><summary>Não achou o local?</summary><input id="f-outro" maxlength="60" placeholder="Ex.: atrás da orelha, dedos, costela até o quadril" value="${esc(D.outro)}"></details>`;
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
    const r = regiao();
    const linhas = [["Local", r.reg + (r.lado ? " · " + r.lado.toLowerCase() : ""), 0], ["Corpo", D.g, 0], ["Estilo", D.estilo, 1], ["Tamanho", D.tam, 1]];
    if (D.cor) linhas.push(["Cor", D.cor, 1]);
    const canal = C.modo === "dm" ? "Instagram" : "WhatsApp";
    return `<div class="resumo">
        <div class="mini-wrap">${D.z ? `<svg class="mini" id="mini" xmlns="${NS}"><image href="${url(`assets/${D.g === "Masculino" ? "M" : "F"}.webp`)}" width="${Zg().W}" height="${Zg().H}"/><g>${chavesSel().map((k) => `<path class="hz" d="${Zg().z[zona(D.z).v][k] || ""}"/>`).join("")}</g></svg>` : `<span class="mini-vazio">${esc(r.reg)}</span>`}</div>
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
  function mensagem() {
    const r = regiao(), L = [C.textos.saudacao, "*NOVO PEDIDO DE ORÇAMENTO*", `*Nome:* ${nomeLimpo() || "-"}`, `*Idade:* ${(D.idade || "").trim() || "-"}`, `*Corpo:* ${D.g}`, `*Local:* ${r.reg}`];
    if (r.lado) L.push(`*Lado:* ${r.lado}`);
    L.push(`*Estilo:* ${D.estilo || "-"}`, `*Tamanho:* ${D.tam || "-"}`);
    if (D.cor) L.push(`*Cor:* ${D.cor}`);
    L.push(`*Ideia:* ${(D.ideia || "").trim() || "-"}`, "Gostaria de saber sobre disponibilidade e os próximos passos.");
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
    const falta = ["Escolha o local no corpo para continuar.", !D.estilo && !D.tam ? "Escolha o estilo e o tamanho." : !D.estilo ? "Falta escolher o estilo." : "Falta escolher o tamanho.", ""][passo];
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
    if (passo === 2 && D.z) requestAnimationFrame(enquadraMini);
    rodape();
    salvar();
    if (rolar) $("#pr").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }
  function enquadraMini() {
    const m = $("#mini"); if (!m) return;
    const p = $("path", m); if (!p) return;
    const b = p.getBBox(), s = Math.max(b.width, b.height) * 1.9, cx = b.x + b.width / 2, cy = b.y + b.height / 2;
    m.setAttribute("viewBox", `${cx - s / 2} ${cy - s / 2} ${s} ${s}`);
  }
  const irPara = (n) => { passo = n; pinta(true); };

  function escolhe(id, s) {
    const z = zona(id);
    const lado = z.lado ? ladoDe(s, z.v) : "";
    if (D.z !== id) D.det = "";
    D.z = id; D.lado = lado; D.outro = "";
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
    if (b.dataset.lado) D.lado = b.dataset.lado;
    if (b.dataset.det) D.det = D.det === b.dataset.det ? "" : b.dataset.det;
    salvar(); desenhaPalco(); $("#painel").innerHTML = painelLocal(); rodape();
  });
  $("#painel").addEventListener("input", (e) => {
    if (e.target.id !== "f-outro") return;
    D.outro = e.target.value;
    if (D.outro.trim()) { D.z = ""; D.lado = ""; D.det = ""; }
    salvar(); desenhaPalco(); rodape();
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

  if (D.z) VW = zona(D.z).v;
  passo = Math.min(D.max || 0, localPronto() ? (projetoPronto() ? 2 : 1) : 0);
  pinta(false);
})();
