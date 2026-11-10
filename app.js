/* LRGZ Manequim v5: orçamento de tatuagem em passos.
   1 Local (um toque no corpo já define região e lado) · 2 Projeto · 3 Horário (se o cliente tem agenda) · 4 Enviar.
   Um manequim só, sem sexo definido. Um código só; cada cliente é um JSON em clientes/<slug>.json. */
(async () => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const NS = "http://www.w3.org/2000/svg";
  const V = "12";

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
  if (C.css && !$("link[data-skin]")) { const k = document.createElement("link"); k.rel = "stylesheet"; k.href = url(C.css) + "?v=" + V; k.dataset.skin = "1"; document.head.append(k); }
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

  /* ---------- Agenda (opcional por cliente: C.agenda) ----------
     Com C.agenda.api, o passo Horário mostra os horários livres do Google Agenda (serviço lrgz-agenda)
     e o envio pré-reserva o horário. Sem agenda vinculada (a API responde 503) ou com falha de rede,
     a pessoa marca os melhores dias e o período, dentro do horário padrão de 08:00 às 18:00. */
  const AG = C.agenda || null;
  const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const SEM = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const SEM_LONGO = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  const [ABRE, FECHA] = ((AG && AG.horario) || "08:00-18:00").split("-");
  const DIAS_ATEND = (AG && AG.dias) || [1, 2, 3, 4, 5, 6];
  const hBonita = (h) => h.replace(/^0(\d)/, "$1").replace(":00", "h").replace(":", "h");
  const dBonita = (d) => { const [a, m, dia] = d.split("-").map(Number); const x = new Date(Date.UTC(a, m - 1, dia)); return `${SEM[x.getUTCDay()].toLowerCase()}, ${dia} de ${MESES[m - 1]}`; };
  const faixaDias = () => {
    const s = DIAS_ATEND.join(",");
    if (s === "1,2,3,4,5,6") return "de segunda a sábado";
    if (s === "1,2,3,4,5") return "de segunda a sexta";
    return DIAS_ATEND.map((n) => SEM_LONGO[n]).join(", ");
  };
  const PERIODOS = [["Manhã", `${hBonita(ABRE)} às 12h`], ["Tarde", `12h às ${hBonita(FECHA)}`], ["Qualquer horário", `${hBonita(ABRE)} às ${hBonita(FECHA)}`]];
  const ag = { st: "", dias: {}, mes: "", tam: null, n: 0, token: "", widget: null, aviso: "" };

  /* ---------- Estado ---------- */
  const PASSOS = AG ? ["Local", "Projeto", "Horário", "Enviar"] : ["Local", "Projeto", "Enviar"];
  const HOR = AG ? 2 : -1, ENV = PASSOS.length - 1;
  // sel: lista "zona:S" (várias regiões); semLocal: a pessoa decide o local depois
  // ag: {data, hora} escolhido na agenda; agDia: dia aberto no calendário; pdias/per: preferência sem agenda
  const vazio = () => ({ sel: [], semLocal: false, outro: "", estilo: "", tam: "", cor: "", ideia: "", nome: "", idade: "", max: 0,
    ag: null, agDia: "", pdias: [], per: "", combinar: false, reservado: "" });
  const CH = "manequim5:" + C.slug;
  let D = vazio();
  try { D = { ...D, ...JSON.parse(sessionStorage.getItem(CH) || "{}") }; } catch (_) {}
  D.sel = (D.sel || []).filter((x) => zona(x.split(":")[0]));
  const avisa = () => EMBED && parent !== window && parent.postMessage({ manequim: 1, local: D.sel.length || outroTxt() ? regiaoTexto() : "", corpo: "", altura: document.documentElement.scrollHeight }, "*");
  const salvar = () => { try { sessionStorage.setItem(CH, JSON.stringify(D)); } catch (_) {} avisa(); };
  let passo = 0, VW = "f";

  // Link com escolha pronta: ?estilo=Flash&tamanho=Pequena&desenho=Morcego (ex.: vindo dos disponíveis do site)
  const Q = new URLSearchParams(location.search);
  if (Q.has("estilo") || Q.has("desenho") || Q.has("tamanho")) {
    const acha = (lista, v) => lista.find((x) => x.toLowerCase().startsWith((v || "").toLowerCase().trim()));
    D = { ...vazio(), nome: D.nome, idade: D.idade };
    D.estilo = acha(C.estilos.map((e) => e.nome), Q.get("estilo")) || "";
    D.tam = Q.get("tamanho") ? acha(C.tamanhos, Q.get("tamanho")) || "" : "";
    if (Q.get("desenho")) D.ideia = `Desenho: ${Q.get("desenho").slice(0, 80)}`;
    history.replaceState(null, "", location.pathname);
  }

  const outroTxt = () => (D.outro || "").trim();
  const localPronto = () => !!(D.sel.length || outroTxt() || D.semLocal);
  const projetoPronto = () => !!(D.estilo && D.tam);
  const horarioPronto = () => !!(D.combinar || D.ag || D.pdias.length || D.per);
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
  function horarioTexto() {
    if (D.ag) return `${dBonita(D.ag.data)}, às ${hBonita(D.ag.hora)}`;
    const l = [];
    if (D.pdias.length) l.push([...D.pdias].sort().map((n) => SEM[n]).join(", "));
    if (D.per) l.push(D.per.toLowerCase());
    return l.length ? l.join(" · ") : "A combinar no chat";
  }

  /* ---------- Palco: um manequim só ---------- */
  const ZONAS = await (await fetch(url(`assets/zonas.json?v=${V}`))).json();
  const Zg = () => ZONAS.N;
  const CORPO = url(`assets/N.webp?v=${V}`);
  const svg = $("#palco"), img = $("#corpo"), gz = $("#zonas"), gs = $("#sel"), legenda = $("#legenda");
  const estreito = () => matchMedia("(max-width: 760px)").matches;
  if (Zg().fundo) document.documentElement.style.setProperty("--estudio", Zg().fundo);   // resumo certo mesmo abrindo direto no último passo

  function caixa() {
    const Z = Zg(), pad = (b) => { const w = b[2] - b[0], h = b[3] - b[1]; return [b[0] - w * 0.08, b[1] - h * 0.03, w * 1.16, h * 1.1]; };
    if (estreito()) return pad(Z.box[VW]);
    const f = Z.box.f, b = Z.box.b;
    return pad([Math.min(f[0], b[0]), Math.min(f[1], b[1]), Math.max(f[2], b[2]), Math.max(f[3], b[3])]);
  }
  // caminhos SVG das regiões marcadas; so = só a vista "f" ou "b" (celular mostra uma vista por vez)
  const caminhosSel = (so) => D.sel.map((x) => { const [id, s] = x.split(":"), z = zona(id); return so && z.v !== so ? "" : Zg().z[z.v][z.k.replace("{S}", s)] || ""; }).filter(Boolean);
  function desenhaPalco() {
    const Z = Zg();
    if (!img.getAttribute("href")) img.setAttribute("href", CORPO);
    img.setAttribute("width", Z.W); img.setAttribute("height", Z.H);
    const [x, y, w, h] = caixa();
    // no celular só a vista atual aparece: corta a outra metade da imagem
    const meio = (Z.box.f[2] + Z.box.b[0]) / 2, so = estreito(), r0 = $("#cvr");
    r0.setAttribute("x", so && VW === "b" ? meio : 0); r0.setAttribute("y", 0);
    r0.setAttribute("width", so ? (VW === "f" ? meio : Z.W - meio) : Z.W); r0.setAttribute("height", Z.H);
    svg.setAttribute("viewBox", `${x} ${y} ${w} ${h}`);
    // palco: luz de estúdio atrás de cada vista, brilho no chão e anel de plataforma sob os pés
    $("#cena").innerHTML = ["f", "b"].filter((v) => !so || v === VW).map((v) => {
      const b = Z.box[v], cx = (b[0] + b[2]) / 2, bw = b[2] - b[0], bh = b[3] - b[1], pe = b[3];
      return `<ellipse class="luz" cx="${cx}" cy="${b[1] + bh * 0.4}" rx="${bw * 0.8}" ry="${bh * 0.62}"/>`
        + `<ellipse class="chao" cx="${cx}" cy="${pe - 6}" rx="${bw * 0.66}" ry="${bw * 0.11}"/>`
        + `<ellipse class="anel" cx="${cx}" cy="${pe - 6}" rx="${bw * 0.4}" ry="${bw * 0.055}"/>`
        + `<ellipse class="anel a2" cx="${cx}" cy="${pe - 6}" rx="${bw * 0.56}" ry="${bw * 0.078}"/>`;
    }).join("");
    let html = "";
    Zs.forEach((z) => {
      if (so && z.v !== VW) return;
      (z.lado ? ["A", "B"] : ["C"]).forEach((s) => {
        const d = Z.z[z.v][z.k.replace("{S}", s)];
        if (!d) return;
        const lado = ladoDe(s, z.v), rot = z.nome + (lado ? " " + lado.toLowerCase() : "");
        const on = D.sel.includes(`${z.id}:${s}`);
        html += `<path class="z${on ? " on" : ""}" data-z="${z.id}" data-s="${s}" d="${d}" tabindex="0" role="button" aria-pressed="${on}" aria-label="${rot}"><title>${rot}</title></path>`;
      });
    });
    gz.innerHTML = html;
    gs.innerHTML = caminhosSel(estreito() ? VW : "").map((d) => `<path class="hz" d="${d}"/>`).join("");
    // rótulos de vista no desktop
    const r = $("#rotulos");
    if (estreito()) { r.innerHTML = ""; }
    else {
      const yb = Math.max(Z.box.f[3], Z.box.b[3]) + h * 0.045, cx = (b) => (b[0] + b[2]) / 2;
      r.innerHTML = `<text x="${cx(Z.box.f)}" y="${yb}">FRENTE</text><text x="${cx(Z.box.b)}" y="${yb}">COSTAS</text>`;
      $$("text", r).forEach((t) => t.setAttribute("font-size", Math.round(h * 0.016)));
    }
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
  function telaHorario() {
    const aviso = ag.aviso ? `<p class="ag-aviso" role="alert">${esc(ag.aviso)}</p>` : "";
    const combinar = `<button class="pular ag-combinar" data-combinar aria-pressed="${D.combinar}">Prefiro combinar a data no chat</button>`;
    if (ag.st === "" || ag.st === "carregando") return `<h3>Dia e horário</h3><p class="ag-msg" aria-live="polite">Buscando os horários livres…</p>`;
    if (ag.st === "ativa") {
      const datas = Object.keys(ag.dias).sort();
      if (!datas.length) return `${aviso}<h3>Dia e horário</h3><p class="ag-msg">Sem horários livres nas próximas semanas. Envie o pedido que a data é combinada no chat.</p><div class="ag-pe">${combinar}</div>`;
      if (!ag.mes || !datas.some((d) => d.startsWith(ag.mes))) ag.mes = (D.agDia || datas[0]).slice(0, 7);
      const meses = [...new Set(datas.map((d) => d.slice(0, 7)))], i = meses.indexOf(ag.mes), [a, m] = ag.mes.split("-").map(Number);
      let g = SEM.map((s) => `<span class="ag-sem">${s}</span>`).join("") + "<span></span>".repeat(new Date(Date.UTC(a, m - 1, 1)).getUTCDay());
      const total = new Date(Date.UTC(a, m, 0)).getUTCDate();
      for (let d = 1; d <= total; d++) {
        const data = `${ag.mes}-${String(d).padStart(2, "0")}`;
        g += ag.dias[data] ? `<button class="ag-dia" data-dia="${data}" aria-pressed="${D.agDia === data}" aria-label="${dBonita(data)}">${d}</button>` : `<span class="ag-dia off" aria-hidden="true">${d}</span>`;
      }
      const seta = (alvo, rot, txt) => `<button class="ag-seta" data-mes="${alvo || ""}" aria-label="${rot}"${alvo ? "" : " disabled"}>${txt}</button>`;
      const horas = D.agDia && ag.dias[D.agDia]
        ? `<p class="ag-rot">${dBonita(D.agDia)}</p><div class="ag-lista">${ag.dias[D.agDia].map((h) => `<button class="ag-hora" data-hora="${h}" aria-pressed="${!!(D.ag && D.ag.data === D.agDia && D.ag.hora === h)}">${hBonita(h)}</button>`).join("")}</div>`
        : `<p class="ag-msg">Escolha um dia para ver os horários.</p>`;
      return `${aviso}<h3>Dia e horário</h3>
        <div class="ag"><div class="ag-cal"><div class="ag-topo">${seta(meses[i - 1], "Mês anterior", "‹")}<strong>${MESES[m - 1]} ${a}</strong>${seta(meses[i + 1], "Próximo mês", "›")}</div><div class="ag-grade">${g}</div></div><div class="ag-horas">${horas}</div></div>
        <p class="nota">O horário fica pré-reservado na agenda quando você enviar. A confirmação vem pelo chat.</p>
        <div class="ag-pe">${combinar}</div>`;
    }
    // sem agenda vinculada: preferência de dias e período
    const dias = DIAS_ATEND.map((n) => `<button data-pdia="${n}" aria-pressed="${D.pdias.includes(n)}"><b>${SEM[n]}</b></button>`).join("");
    const pers = PERIODOS.map(([n, h]) => `<button data-per="${n}" aria-pressed="${D.per === n}"><b>${n}</b><small>${h}</small></button>`).join("");
    return `${aviso}<h3>Melhores dias <em>pode marcar mais de um</em></h3><div class="grade ag-chips" style="--n:${DIAS_ATEND.length}">${dias}</div>
      <h3>Período</h3><div class="grade g3">${pers}</div>
      <p class="nota">Atendimento ${faixaDias()}, das ${hBonita(ABRE)} às ${hBonita(FECHA)}. A data certa é combinada no chat.</p>
      <div class="ag-pe">${combinar}</div>`;
  }
  function telaEnviar() {
    const linhas = [["Local", regiaoTexto(), 0], ["Estilo", D.estilo, 1], ["Tamanho", D.tam, 1]];
    if (D.cor) linhas.push(["Cor", D.cor, 1]);
    if (AG) linhas.push([D.ag ? "Horário" : "Dias", horarioTexto(), HOR]);
    const canal = C.modo === "dm" ? "Instagram" : "WhatsApp";
    return `<div class="resumo">
        <div class="mini-wrap">${D.sel.length ? `<svg class="mini" id="mini" xmlns="${NS}"><image href="${CORPO}" width="${Zg().W}" height="${Zg().H}"/><g>${caminhosSel().map((d) => `<path class="hz" d="${d}"/>`).join("")}</g></svg>` : `<span class="mini-vazio">${D.semLocal && !outroTxt() ? "Local a combinar no chat" : esc(regiaoTexto())}</span>`}</div>
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

  /* ---------- Agenda: busca, verificação e pré-reserva ---------- */
  const agendaViva = () => AG && (AG.api || AG.demo) && ag.st === "ativa";
  // demonstração (lrgz.com.br/agenda): agenda simulada aqui mesmo, ocupação fixa por data para não mudar a cada visita
  const DUR = [120, 180, 240, 360];
  const duracao = () => { const i = (C.tamanhos || []).indexOf(D.tam); return DUR[i] ?? 180; };
  function agendaDemo() {
    const dias = {}, hoje = new Date(), [ha] = ABRE.split(":").map(Number), [hf] = FECHA.split(":").map(Number), dur = duracao() / 60;
    for (let i = 1; i <= 45; i++) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + i);
      if (!DIAS_ATEND.includes(d.getDay())) continue;
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const semente = d.getDate() * 7 + d.getMonth() * 13, livres = [];
      for (let h = ha; h + dur <= hf; h++) if ((semente + h * 5) % 9 > 3) livres.push(`${String(h).padStart(2, "0")}:00`);
      if (livres.length && (semente % 5) !== 0) dias[k] = livres;
    }
    return dias;
  }
  async function buscarAgenda() {
    if (AG && AG.demo) { ag.dias = agendaDemo(); ag.st = "ativa"; ag.tam = D.tam;
      if (D.ag && !(ag.dias[D.ag.data] || []).includes(D.ag.hora)) { D.ag = null; D.reservado = ""; }
      if (D.agDia && !ag.dias[D.agDia]) D.agDia = "";
      if (passo === HOR) { const t = $("#tela .entra"); if (t) t.innerHTML = telaHorario(); rodape(); salvar(); }
      return; }
    if (!AG || !AG.api) { ag.st = "off"; return; }
    if (ag.st && ag.tam === D.tam) return;   // já buscou (ou está buscando) para este tamanho
    const n = ++ag.n; ag.st = "carregando"; ag.tam = D.tam;
    try {
      const q = new URLSearchParams(); if (D.tam) q.append("servico", D.tam);
      const r = await fetch(`${AG.api}/horarios?${q}`, { signal: AbortSignal.timeout(8000) });
      if (!r.ok) throw new Error(r.status);
      const j = await r.json();
      if (n !== ag.n) return;
      ag.dias = j.dias || {}; ag.st = "ativa";
      if (D.ag && !(ag.dias[D.ag.data] || []).includes(D.ag.hora)) { D.ag = null; D.reservado = ""; }
      if (D.agDia && !ag.dias[D.agDia]) D.agDia = "";
    } catch (_) {
      if (n !== ag.n) return;
      ag.st = "off"; D.ag = null; D.agDia = ""; D.reservado = "";
    }
    if (passo === HOR) { const t = $("#tela .entra"); if (t) t.innerHTML = telaHorario(); rodape(); salvar(); }
  }
  function carregarTurnstile() {
    if (!AG || !AG.turnstile || ag.widget !== null || $("#cf-turnstile-js")) return;
    window.manequimTurnstile = () => {
      ag.widget = window.turnstile.render("#ag-verif", {
        sitekey: AG.turnstile, appearance: "interaction-only", theme: "auto", language: "pt-br",
        callback: (t) => { ag.token = t; }, "expired-callback": () => { ag.token = ""; }, "error-callback": () => { ag.token = ""; },
      });
    };
    const s = document.createElement("script");
    s.id = "cf-turnstile-js"; s.async = true;
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=manequimTurnstile&render=explicit";
    document.head.append(s);
  }
  async function esperaToken() {
    if (!AG.turnstile) return "";
    for (let n = 0; n < 40 && !ag.token; n++) await new Promise((r) => setTimeout(r, 200));
    return ag.token;
  }
  /* devolve "ok", "ocupado" ou "falhou" */
  async function reservar() {
    if (AG.demo) { await new Promise((r) => setTimeout(r, 700)); return "ok"; }
    try {
      const turnstile = await esperaToken();
      const corpo = { data: D.ag.data, hora: D.ag.hora, servicos: [D.tam], nome: nomeLimpo(), idade: (D.idade || "").trim(),
        local: regiaoTexto(), estilo: D.estilo, cor: D.cor, ideia: (D.ideia || "").trim(), origem: location.host, turnstile };
      const r = await fetch(`${AG.api}/agendar`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(corpo), signal: AbortSignal.timeout(15000) });
      if (window.turnstile && ag.widget !== null) { ag.token = ""; window.turnstile.reset(ag.widget); }
      if (r.status === 201) return "ok";
      if (r.status === 409) { ag.st = ""; return "ocupado"; }
      return "falhou";
    } catch (_) { return "falhou"; }
  }

  /* ---------- Mensagem ---------- */
  const nomeLimpo = () => (D.nome || "").trim().replace(/\s+/g, " ");
  const chaveAg = () => (D.ag ? `${D.ag.data} ${D.ag.hora}` : "");
  // Mensagem curta e escaneável: apresentação numa linha, ficha em blocos, pergunta de fechamento.
  function mensagem() {
    const T = C.textos, nome = nomeLimpo(), idade = (D.idade || "").trim();
    const ola = T.ola || `Olá, ${C.nome}!`;
    const quem = nome ? `Aqui é *${nome}*${idade ? `, ${idade} anos` : ""}.` : "";
    const local = regiaoTexto() === "A combinar" ? "ainda não decidi, a gente combina" : regiaoTexto();
    const ficha = [["LOCAL", local], ["ESTILO", D.estilo], ["TAMANHO", D.tam], ["COR", D.cor]];
    if (AG && D.ag) ficha.push(["HORÁRIO", horarioTexto() + (D.reservado === chaveAg() ? " (pré-reservado no site)" : "")]);
    else if (AG && (D.pdias.length || D.per)) ficha.push(["DISPONIBILIDADE", horarioTexto()]);
    const linhas = ficha.filter((x) => x[1]).map(([k, v]) => `*${k}:* ${v}`);
    const ideia = (D.ideia || "").trim();
    const L = [`${ola} ${quem} Vim pelo site e quero um orçamento.`.replace(/\s+/g, " ").trim(), linhas.join("\n")];
    if (ideia) L.push(`*IDEIA:*\n_${ideia.replace(/[_*~]/g, "")}_`);
    L.push(AG && D.ag ? T.fechoHorario || "Pode confirmar esse horário? Se precisar, mando referência por aqui." : T.fecho || "Tem horário nas próximas semanas? Se precisar, mando referências por aqui.");
    L.push(`_Pedido feito em ${C.modo === "demo" ? "orcamento.seuestudio.com.br" : location.host || C.siteRotulo}_`);
    return L.join("\n\n");
  }
  const destino = () => (C.modo === "demo" ? "#" : C.modo === "dm" ? C.instagram : `https://wa.me/${C.whatsapp}?text=${encodeURIComponent(mensagem())}`);
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

  /* ---------- Final da demonstração: o que o profissional recebe ---------- */
  const zap = (t) => esc(t).replace(/\*([^*\n]+)\*/g, "<b>$1</b>").replace(/_([^_]+)_/g, "<i>$1</i>").replace(/\n/g, "<br>");
  function mostraDemo() {
    const agora = new Date(), hh = `${agora.getHours()}:${String(agora.getMinutes()).padStart(2, "0")}`;
    let evento = "";
    if (D.ag) {
      const [h, m] = D.ag.hora.split(":").map(Number), fim = h * 60 + m + duracao();
      const fimTxt = `${Math.floor(fim / 60)}:${String(fim % 60).padStart(2, "0")}`;
      evento = `<div class="dm-cal"><p class="dm-rot">No Google Agenda do estúdio</p>
        <div class="dm-ev"><b>PRÉ-AGENDADO · ${esc(nomeLimpo())} · ${esc(D.estilo || "tattoo")}</b>
        <span>${esc(dBonita(D.ag.data))} · ${D.ag.hora.replace(/^0/, "")} às ${fimTxt}</span>
        <small>Local: ${esc(regiaoTexto())}<br>Tamanho: ${esc(D.tam)}</small></div>
        <p class="dm-nota">O horário sai da agenda do site na hora. Você confirma com a pessoa pelo WhatsApp.</p></div>`;
    }
    $("#tela").innerHTML = `<div class="entra demo-fim">
      <h2 class="t">Pedido enviado</h2>
      <p class="dm-intro">Na versão real, o WhatsApp abre com a mensagem pronta e o horário entra na sua agenda.</p>
      <div class="dm-grade${evento ? "" : " so"}">
        <div class="dm-zap"><p class="dm-rot">No WhatsApp do estúdio</p><div class="dm-balao">${zap(mensagem())}<time>${hh}</time></div></div>
        ${evento}
      </div></div>`;
    $("#acao").innerHTML = `<button class="vt" data-refazer>Refazer o teste</button>${C.cta ? `<a class="b" href="${esc(C.cta.url)}" target="_blank" rel="noopener">${esc(C.cta.texto)}</a>` : "<span></span>"}<span class="falta"></span>`;
    $("#pr").scrollIntoView({ block: "start" });
  }

  /* ---------- Render ---------- */
  const pronto = (p) => (p === 0 ? localPronto() : p === 1 ? projetoPronto() : p === HOR ? horarioPronto() : true);
  function falta(p) {
    if (p === 0) return "Marque o local no corpo, ou diga que ainda não sabe.";
    if (p === 1) return !D.estilo && !D.tam ? "Escolha o estilo e o tamanho." : !D.estilo ? "Falta escolher o estilo." : "Falta escolher o tamanho.";
    if (p === HOR) return agendaViva() ? "Escolha o dia e o horário, ou combine no chat." : "Marque os melhores dias ou o período, ou combine no chat.";
    return "";
  }
  function rodape() {
    const ok = pronto(passo);
    const nome = passo === ENV ? (C.modo === "demo" ? "Enviar pedido" : C.modo === "dm" ? "Copiar pedido e abrir o Instagram" : "Enviar pelo WhatsApp") : "Continuar";
    $("#acao").innerHTML = `${passo > 0 ? `<button class="vt" data-act="bk">Voltar</button>` : `<span></span>`}
      ${passo === ENV ? `<a class="b" id="send" href="${esc(destino())}" target="_blank" rel="noopener">${nome}</a>` : `<button class="b" data-act="nx"${ok ? "" : " disabled"}>${nome}</button>`}
      <span class="falta">${ok ? "" : falta(passo)}</span>`;
  }
  function pinta(rolar) {
    D.max = Math.max(D.max || 0, passo);
    const pr = $("#pr");
    pr.style.setProperty("--n", PASSOS.length);
    pr.innerHTML = PASSOS.map((p, i) => `<li class="${i < passo ? "d" : i === passo ? "on" : ""}"><button data-ir="${i}"${i > D.max || i === passo ? " disabled" : ""}${i === passo ? ' aria-current="step"' : ""}><span>0${i + 1}</span>${p}</button></li>`).join("");
    document.body.dataset.passo = passo;
    $("#local").hidden = passo !== 0;
    $("#tela").hidden = passo === 0;
    if (passo === 0) { desenhaPalco(); $("#painel").innerHTML = painelLocal(); }
    else $("#tela").innerHTML = `<div class="entra">${passo === 1 ? telaProjeto() : passo === HOR ? telaHorario() : telaEnviar()}</div>`;
    if (passo === HOR) buscarAgenda();
    if (passo === ENV && D.sel.length) requestAnimationFrame(enquadraMini);
    if (passo === ENV && D.ag && agendaViva()) carregarTurnstile();
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
  const irPara = (n) => { if (n !== HOR) ag.aviso = ""; passo = n; pinta(true); };

  // toque soma a região; tocar de novo tira
  function escolhe(id, s) {
    const k = `${id}:${s}`;
    D.sel = D.sel.includes(k) ? D.sel.filter((x) => x !== k) : [...D.sel, k];
    D.semLocal = false;
    salvar(); desenhaPalco(); $("#painel").innerHTML = painelLocal(); rodape();
  }
  function cliqueHorario(b) {
    const t = $("#tela .entra");
    if (b.dataset.mes !== undefined) { if (b.dataset.mes) ag.mes = b.dataset.mes; }
    else if (b.dataset.dia) { D.agDia = b.dataset.dia; D.combinar = false; }
    else if (b.dataset.hora) { D.ag = { data: D.agDia, hora: b.dataset.hora }; D.reservado = ""; D.combinar = false; ag.aviso = ""; }
    else if (b.dataset.pdia) { const n = +b.dataset.pdia; D.pdias = D.pdias.includes(n) ? D.pdias.filter((x) => x !== n) : [...D.pdias, n]; D.combinar = false; }
    else if (b.dataset.per) { D.per = D.per === b.dataset.per ? "" : b.dataset.per; D.combinar = false; }
    else if (b.dataset.combinar !== undefined) {
      D.combinar = !D.combinar;
      if (D.combinar) { D.ag = null; D.agDia = ""; D.pdias = []; D.per = ""; D.reservado = ""; }
    } else return false;
    t.innerHTML = telaHorario();
    if (b.dataset.dia && estreito()) { const h = $(".ag-horas", t); if (h) h.scrollIntoView({ block: "nearest", behavior: "smooth" }); }
    salvar(); rodape();
    return true;
  }

  /* ---------- Eventos ---------- */
  gz.addEventListener("click", (e) => { const p = e.target.closest(".z"); if (p) escolhe(p.dataset.z, p.dataset.s); });
  gz.addEventListener("keydown", (e) => { const p = e.target.closest(".z"); if (p && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); escolhe(p.dataset.z, p.dataset.s); } });
  gz.addEventListener("mouseover", (e) => { const p = e.target.closest(".z"); if (p) mostraLegenda(p.getAttribute("aria-label")); });
  gz.addEventListener("mouseleave", () => mostraLegenda());
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
    const b = e.target.closest("button"); if (!b || b.disabled) return;
    if (b.dataset.ir !== undefined) return irPara(+b.dataset.ir);
    if (passo === HOR && cliqueHorario(b)) return;
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
  let enviando = false;
  $("#acao").addEventListener("click", async (e) => {
    const a = e.target.closest("#send");
    if (a) {
      if (!valida() || enviando) return e.preventDefault();
      if (C.modo === "demo") {
        e.preventDefault(); enviando = true;
        a.textContent = D.ag ? "Reservando o horário…" : "Enviando…"; a.setAttribute("aria-busy", "true");
        if (D.ag) { await reservar(); D.reservado = chaveAg(); }
        else await new Promise((r) => setTimeout(r, 500));
        enviando = false; salvar(); mostraDemo(); return;
      }
      if (C.modo === "dm") { try { await navigator.clipboard.writeText(mensagem()); $("#copiado").hidden = false; } catch (_) {} return; }
      // com horário da agenda: pré-reserva antes de abrir o WhatsApp (a janela abre já no clique, para não ser bloqueada)
      if (D.ag && agendaViva() && D.reservado !== chaveAg()) {
        e.preventDefault();
        enviando = true;
        const w = window.open("", "_blank");
        const rot = a.textContent; a.textContent = "Reservando o horário…"; a.setAttribute("aria-busy", "true");
        const r = await reservar();
        enviando = false; a.textContent = rot; a.removeAttribute("aria-busy");
        if (r === "ocupado") {
          if (w) w.close();
          D.ag = null; D.reservado = ""; ag.aviso = "Esse horário acabou de ser ocupado. Escolha outro, por favor.";
          passo = HOR; pinta(true); return;
        }
        if (r === "ok") D.reservado = chaveAg();
        salvar();
        const u = destino(); a.href = u;
        if (w) w.location.href = u; else location.href = u;
      }
      return;
    }
    const b = e.target.closest("button"); if (!b) return;
    if (b.hasAttribute("data-refazer")) { D = vazio(); ag.st = ""; passo = 0; pinta(true); return; }
    if (b.dataset.act === "nx") irPara(passo + 1);
    if (b.dataset.act === "bk") irPara(passo - 1);
  });
  $("#pr").addEventListener("click", (e) => { const b = e.target.closest("button[data-ir]"); if (b && !b.disabled) irPara(+b.dataset.ir); });
  let largura = estreito();
  addEventListener("resize", () => { if (estreito() !== largura) { largura = estreito(); if (passo === 0) desenhaPalco(); } });

  if (D.sel.length) VW = zona(D.sel[D.sel.length - 1].split(":")[0]).v;
  const prontos = PASSOS.map((_, i) => pronto(i));
  const primeiro = prontos.indexOf(false);
  passo = EMBED ? 0 : Math.min(D.max || 0, primeiro < 0 ? ENV : primeiro);
  pinta(false);
  if (EMBED) { new ResizeObserver(avisa).observe(document.body); avisa(); }
})();
