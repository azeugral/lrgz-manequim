/* LRGZ Manequim · Provador 3D: os disponíveis do cliente viram decalques na pele de um corpo 3D
   (malhas realistas da Blender Studio, CC0). Girar e aproximar com OrbitControls; cada peça é uma malha própria
   sobre a pele ligada ao ponto, com a arte "abraçando" as curvas. Um código só; o cliente vem do JSON
   (clientes/<slug>.json, bloco "provador"), e os desenhos saem de tools/provador.py. */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const C = window.MANEQUIM_CLIENTE, PV = C.provador || {};
const BASE = new URL(window.MANEQUIM_BASE || "./", location.href).href;
const url = (p) => (/^https?:/.test(p) ? p : BASE + p);
const DIR = `${BASE}clientes/${C.slug}/provador/`;
const D3 = `${BASE}assets/3d/`;
// tinta: cada desenho na cor da própria folha (preto ou colorido). Trocar a cor só se o cliente pedir (PV.cores).
const CORES = PV.cores || null;
const TINTA = "#151517";
const TOQUE = matchMedia("(pointer: coarse)").matches;
// ponto 3D -> posição na tela; e para que lado o desenho gira na tela quando o giro aumenta
function naTela(p) { const c = p.clone().project(camera), r = renderer.domElement.getBoundingClientRect(); return { x: (c.x + 1) / 2 * r.width + r.left, y: (1 - c.y) / 2 * r.height + r.top }; }
function sentidoNaTela(q) {
  const ang = (g) => { const g0 = q.giro; q.giro = g; const Y = eixos(q).Y; q.giro = g0;
    const a = naTela(q.p), b = naTela(q.p.clone().addScaledVector(Y, .04)); return Math.atan2(b.y - a.y, b.x - a.x); };
  let d = ang(q.giro + 5) - ang(q.giro); d = Math.atan2(Math.sin(d), Math.cos(d));
  return d >= 0 ? 1 : -1;
}
const ALTURA = 1.70;
const Q = new URLSearchParams(location.search);
const DEBUG = Q.has("zonas");
const DEMO = C.modo === "demo";
// ?vitrine=1: dentro de outro site (lrgz.com.br/agenda). Avisa a própria altura para o site de fora.
const VITRINE = parent !== window && Q.has("vitrine");

/* ---------- identidade do cliente ---------- */
Object.entries(C.tema || {}).forEach(([k, v]) => document.documentElement.style.setProperty("--" + k, v));
document.documentElement.dataset.cliente = C.slug;
if (VITRINE) document.documentElement.classList.add("vitrine");
// dentro do próprio site do cliente (PV.semTopo), sem o cabeçalho de Instagram e site: já estão na página de fora
if (VITRINE && PV.semTopo) document.documentElement.classList.add("sem-topo");
$("#logo").src = url(C.logo); $("#logo").alt = C.nome;
$("#marca").textContent = C.nome;
{
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
}
$("#t-titulo").innerHTML = esc(PV.titulo || "Provador").replace(/\n/g, "<br>");
$("#t-sub").textContent = PV.sub || "Gire o corpo, arraste um desenho até a pele e ajuste tamanho, giro e cor. A tinta acompanha as curvas do corpo como ficaria tatuada.";
if (!CORES) $("#pv-cores").remove();
else $("#pv-cores").innerHTML = ["original", ...Object.keys(CORES)].map((k) =>
  `<button type="button" data-cor="${k}" aria-pressed="false"${k === "original" ? " hidden" : ""}><i style="background:${k === "original" ? "conic-gradient(#c1121c 0 25%,#1d40d2 0 50%,#e8b21c 0 75%,#1f8a3b 0)" : CORES[k]}"></i>${k === "original" ? "Original" : k[0].toUpperCase() + k.slice(1)}</button>`).join("");
$("#nota-quem").textContent = DEMO ? "O estúdio" : C.nome;
if (DEMO) $("#b-pede span").textContent = "Enviar pedido";
else if (C.modo === "dm") $("#b-pede span").textContent = "Pedir pelo Instagram";
if (VITRINE) {
  const avisaAltura = () => parent.postMessage({ manequim: 1, altura: Math.ceil(document.body.getBoundingClientRect().height) }, "*");
  new ResizeObserver(avisaAltura).observe(document.body); addEventListener("load", avisaAltura);
}

/* ---------- medidas de cada corpo (metros, malha original) para dar nome ao local ---------- */
const MED = {
  feminino: {
    H: 1.639, queixo: 1.45, pesc: 1.37, axila: 1.19, busto: 1.10, lombar: .98, gluteo: .86, virilha: .70,
    joelho: .47, tornozelo: .085, ombroX: .135, cotovelo: 1.05, pulso: .80,
    braco: [[.69, .29], [.78, .27], [.87, .236], [.96, .194], [1.05, .157], [1.11, .149], [1.19, .149]],
  },
  masculino: {
    H: 1.69, queixo: 1.48, pesc: 1.42, axila: 1.19, busto: 1.12, lombar: 1.0, gluteo: .88, virilha: .72,
    joelho: .49, tornozelo: .09, ombroX: .165, cotovelo: 1.07, pulso: .82,
    braco: [[.72, .30], [.78, .295], [.87, .258], [.96, .23], [1.05, .204], [1.11, .193], [1.19, .183]],
  },
};
const FEM = new Set(["Costela", "Mão", "Coxa", "Lateral da coxa", "Canela", "Panturrilha", "Nuca", "Dobra do braço", "Posterior da coxa", "Lateral da coxa"]);
const costasDe = (x) => (Math.abs(x) < .03 ? "Costas" : `Costas (lado ${x > 0 ? "esquerdo" : "direito"})`);
const lado = (nome, x) => `${nome} ${x > 0 ? (FEM.has(nome) ? "esquerda" : "esquerdo") : (FEM.has(nome) ? "direita" : "direito")}`;
const interp = (t, y) => {
  if (y <= t[0][0]) return t[0][1];
  for (let i = 1; i < t.length; i++) if (y <= t[i][0]) { const [y0, a] = t[i - 1], [y1, b] = t[i]; return a + (b - a) * (y - y0) / (y1 - y0); }
  return t[t.length - 1][1];
};
// p e n no espaço da cena (corpo de 1,70 m, pés em y = 0, frente para +z, esquerda da pessoa em +x)
function onde(p, n) {
  const M = MED[corpoAtual], s = ALTURA / M.H, x = p.x / s, y = p.y / s, ax = Math.abs(x);
  const frente = n.z > .28, costas = n.z < -.28;
  if (y > M.queixo) return n.z > .15 ? "Rosto" : "Cabeça";
  if (y > M.pesc) return costas || (n.z < .1 && Math.abs(n.x) < .6) ? "Nuca" : "Pescoço";
  // braço: fora do contorno do tronco, abaixo da axila
  if (y < M.axila && y > M.virilha - .04 && ax > interp(M.braco, y)) {
    if (y < M.pulso - .03) return lado("Mão", x);
    if (y < M.pulso + .03) return lado("Pulso", x);
    if (Math.abs(y - M.cotovelo) < .035) return lado(n.z < -.1 ? "Cotovelo" : "Dobra do braço", x);
    if (y < M.cotovelo) return lado("Antebraço", x);
    return lado(n.z < -.15 ? "Tríceps" : n.z > .15 ? "Bíceps" : "Braço", x);
  }
  if (y >= M.axila) {
    if (ax > M.ombroX && !(frente && ax < M.ombroX + .03 && y < M.axila + .08)) return lado("Ombro", x);
    if (costas) return costasDe(x);
    return ax < .035 ? "Esterno" : lado("Peito", x);
  }
  if (y >= M.virilha) {
    if (!frente && !costas) return y > M.lombar ? lado("Costela", x) : lado("Quadril", x);
    if (frente) {
      if (y > M.busto) return ax < .035 ? "Esterno" : lado(ax > .11 ? "Costela" : "Peito", x);
      if (y > M.virilha + .1) return ax > .12 ? lado("Costela", x) : "Abdômen";
      return ax > .09 ? lado("Quadril", x) : "Baixo-ventre";
    }
    if (y > M.busto) return costasDe(x);
    if (y > M.lombar) return "Costas (meio)";
    if (y > M.gluteo) return "Lombar";
    return lado("Glúteo", x);
  }
  // pernas
  const fora = n.x * x > 0 && Math.abs(n.x) > .75;
  if (y > M.joelho + .05) return lado(costas ? (y > M.virilha - .07 ? "Glúteo" : "Posterior da coxa") : fora ? "Lateral da coxa" : "Coxa", x);
  if (y > M.joelho - .05) return lado(costas ? "Atrás do joelho" : "Joelho", x);
  if (y > M.tornozelo + .03) return lado(costas ? "Panturrilha" : "Canela", x);
  if (y > M.tornozelo - .02) return lado("Tornozelo", x);
  return lado(costas ? "Calcanhar" : "Pé", x);
}

/* ---------- elementos ---------- */
const palco = $("#palco"), gaveta = $("#gaveta"), lista = $("#lista"), ajuste = $("#ajuste");
const dica = $("#dica"), localEl = $("#local"), aviso = $("#aviso"), carregando = $("#carregando");
const rTam = $("#r-tam"), rGiro = $("#r-giro"), oTam = $("#o-tam"), oGiro = $("#o-giro");
const bPede = $("#b-pede"), bSalva = $("#b-salva");

function semTresD() {
  carregando.hidden = false; carregando.classList.add("erro");
  carregando.textContent = "Este aparelho não abriu o 3D. Tente em outro navegador ou no computador.";
}

/* ---------- cena ---------- */
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: false });
} catch (e) { semTresD(); throw e; }
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.domElement.className = "pv-tela";
palco.prepend(renderer.domElement);

const cena = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(28, 1, .05, 30);
cena.add(new THREE.HemisphereLight(0xffffff, 0xcfc6b8, 1.35));
const chave = new THREE.DirectionalLight(0xfff4e6, 2.1), preenche = new THREE.DirectionalLight(0xe8eefc, .55), contra = new THREE.DirectionalLight(0xffffff, 1.1);
cena.add(chave, chave.target, preenche, preenche.target, contra, contra.target);

// sombra de contato: um disco com degradê embaixo dos pés
{
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const g = c.getContext("2d"), r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, "rgba(40,34,28,.30)"); r.addColorStop(.45, "rgba(40,34,28,.12)"); r.addColorStop(1, "rgba(40,34,28,0)");
  g.fillStyle = r; g.fillRect(0, 0, 256, 256);
  const chao = new THREE.Mesh(new THREE.PlaneGeometry(1.1, .8), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  chao.rotation.x = -Math.PI / 2; chao.position.y = .002; cena.add(chao);
}
// sombra de verdade no chão: luz fixa de cima (estúdio), o corpo projeta, o chão só recebe a sombra
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
{
  const sol = new THREE.DirectionalLight(0xffffff, .45);
  sol.position.set(.7, 3.4, 1.4); sol.target.position.set(0, .85, 0);
  sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048);
  Object.assign(sol.shadow.camera, { left: -.9, right: .9, top: 1.2, bottom: -1.2, near: 1, far: 6 });
  sol.shadow.bias = -.0004; sol.shadow.normalBias = .01;
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.ShadowMaterial({ color: 0x1a140e, opacity: .2 }));
  piso.rotation.x = -Math.PI / 2; piso.receiveShadow = true;
  cena.add(sol, sol.target, piso);
}

const pele = new THREE.MeshStandardMaterial({ color: 0xe9e3da, roughness: .6, metalness: 0, vertexColors: DEBUG });
const controles = new OrbitControls(camera, renderer.domElement);
Object.assign(controles, { enableDamping: true, dampingFactor: .09, rotateSpeed: .75, zoomSpeed: .9, screenSpacePanning: true, minDistance: .38, minPolarAngle: .28, maxPolarAngle: 2.75, zoomToCursor: true });
controles.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };

/* ---------- corpos ---------- */
const corpos = {}; let corpoAtual = "feminino", malha = null, corpoVis = null, corpoInfo = null;
const carregador = new GLTFLoader();
// Malha fina: cada triângulo vira 4, e o ponto novo de cada aresta sai da reta e segue a curva da pele
// (tesselação de Phong). Os vértices originais não mudam, então medidas e travas valem igual.
// A tinta passa a ter ~4x mais pontos para acompanhar o corpo; os raios (toque, travas) seguem na malha leve.
function malhaFina(geo) {
  const pos = geo.attributes.position, nor = geo.attributes.normal, ix = geo.index.array, nv = pos.count;
  const arestas = new Map(), P = [], N = [];
  for (let i = 0; i < nv; i++) { P.push(pos.getX(i), pos.getY(i), pos.getZ(i)); N.push(nor.getX(i), nor.getY(i), nor.getZ(i)); }
  const A = .75;
  const meio = (a, b) => {
    const k = a < b ? a * nv + b : b * nv + a; let m = arestas.get(k);
    if (m !== undefined) return m;
    const ax = P[a * 3], ay = P[a * 3 + 1], az = P[a * 3 + 2], bx = P[b * 3], by = P[b * 3 + 1], bz = P[b * 3 + 2];
    const mx = (ax + bx) / 2, my = (ay + by) / 2, mz = (az + bz) / 2;
    const nax = N[a * 3], nay = N[a * 3 + 1], naz = N[a * 3 + 2], nbx = N[b * 3], nby = N[b * 3 + 1], nbz = N[b * 3 + 2];
    const da = (mx - ax) * nax + (my - ay) * nay + (mz - az) * naz, db = (mx - bx) * nbx + (my - by) * nby + (mz - bz) * nbz;
    const px = mx - (da * nax + db * nbx) / 2, py = my - (da * nay + db * nby) / 2, pz = mz - (da * naz + db * nbz) / 2;
    P.push(mx + (px - mx) * A, my + (py - my) * A, mz + (pz - mz) * A);
    let nx = nax + nbx, ny = nay + nby, nz = naz + nbz; const l = Math.hypot(nx, ny, nz) || 1;
    N.push(nx / l, ny / l, nz / l);
    m = P.length / 3 - 1; arestas.set(k, m); return m;
  };
  const nt = Math.floor(geo.index.count / 3), I = new Uint32Array(nt * 12);
  for (let t = 0, o = 0; t < nt * 3; t += 3) {
    const a = ix[t], b = ix[t + 1], c = ix[t + 2], ab = meio(a, b), bc = meio(b, c), ca = meio(c, a);
    I[o++] = a; I[o++] = ab; I[o++] = ca; I[o++] = ab; I[o++] = b; I[o++] = bc;
    I[o++] = ca; I[o++] = bc; I[o++] = c; I[o++] = ab; I[o++] = bc; I[o++] = ca;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3));
  g.setIndex(new THREE.BufferAttribute(I, 1));
  return g;
}
function prepara(geo, escala = true) {
  if (!geo.index) geo = mergeVertices(geo);
  geo.computeBoundingBox();
  const s = escala ? ALTURA / geo.boundingBox.max.y : 1;
  geo.scale(s, s, s);
  if (!geo.attributes.normal) geo.computeVertexNormals();
  geo.computeBoundingBox(); geo.computeBoundingSphere();
  // centro de cada triângulo, para recortar só o pedaço da pele perto de cada peça
  const pos = geo.attributes.position, idx = geo.index, nt = idx ? idx.count / 3 : pos.count / 3;
  const cen = new Float32Array(nt * 3);
  for (let t = 0; t < nt; t++) {
    let sx = 0, sy = 0, sz = 0;
    for (let k = 0; k < 3; k++) { const v = idx ? idx.getX(t * 3 + k) : t * 3 + k; sx += pos.getX(v); sy += pos.getY(v); sz += pos.getZ(v); }
    cen[t * 3] = sx / 3; cen[t * 3 + 1] = sy / 3; cen[t * 3 + 2] = sz / 3;
  }
  // vértice -> triângulos, para andar só pela pele ligada
  const ini = new Uint32Array(pos.count + 1), ix = idx.array;
  for (let i = 0; i < ix.length; i++) ini[ix[i] + 1]++;
  for (let v = 0; v < pos.count; v++) ini[v + 1] += ini[v];
  const tri = new Uint32Array(ix.length), cur = ini.slice(0, pos.count);
  for (let i = 0; i < ix.length; i++) tri[cur[ix[i]]++] = (i / 3) | 0;
  return { geo, cen, nt, adj: { ini, tri }, marca: new Int32Array(nt) };
}
function carregaCorpo(nome) {
  return corpos[nome] || (corpos[nome] = new Promise((ok, erro) => carregador.load(`${D3}${nome}.glb?v=1`, (g) => {
    let geo = null; g.scene.traverse((o) => { if (o.isMesh && !geo) { o.updateWorldMatrix(true, false); geo = o.geometry.clone().applyMatrix4(o.matrixWorld); } });
    // só posição e normal: a costura do UV não parte a pele em pedaços
    for (const k of Object.keys(geo.attributes)) if (k !== "position" && k !== "normal") geo.deleteAttribute(k);
    geo = mergeVertices(geo.index ? geo.toNonIndexed() : geo, 1e-5);
    const leve = prepara(geo);
    const info = prepara(malhaFina(leve.geo), false);
    const m = new THREE.Mesh(info.geo, pele); m.castShadow = true;
    if (DEBUG) pintaZonas(info.geo, nome);
    // malha: a fina, que aparece; raioMalha: a leve, para os raios (4x mais rápida)
    ok({ malha: m, raioMalha: new THREE.Mesh(leve.geo, pele), ...info });
  }, undefined, erro)));
}

/* ---------- câmera ---------- */
const VISTAS = { f: [0, 0, 1], b: [0, 0, -1], l: [1, 0, 0] };
let vista = "f", anim = null;
function distanciaInteira() {
  const a = camera.aspect, t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  // as barras de cima (vistas) e de baixo (corpo e zoom) ficam sobre o palco: o corpo cabe entre elas, centrado
  const p = palco.getBoundingClientRect(), v = $(".pv-vistas").getBoundingClientRect();
  const res = p.height ? Math.min(.4, 2 * (v.bottom - p.top + 10) / p.height) : .2;
  return Math.max(1.80 / (1 - res) / 2 / t, .72 / 2 / t / a);
}
function vai(dir, alvo, dist, rapido) {
  const fim = { alvo: alvo.clone(), pos: alvo.clone().add(new THREE.Vector3(...dir).normalize().multiplyScalar(dist)) };
  if (rapido || matchMedia("(prefers-reduced-motion: reduce)").matches) { controles.target.copy(fim.alvo); camera.position.copy(fim.pos); controles.update(); return; }
  // gira em volta do alvo (não atravessa o corpo)
  const a0 = controles.target.clone(), off0 = camera.position.clone().sub(a0), off1 = fim.pos.clone().sub(fim.alvo);
  const s0 = new THREE.Spherical().setFromVector3(off0), s1 = new THREE.Spherical().setFromVector3(off1);
  let dt = s1.theta - s0.theta; if (dt > Math.PI) dt -= 2 * Math.PI; if (dt < -Math.PI) dt += 2 * Math.PI;
  anim = { t0: performance.now(), dur: 700, a0, a1: fim.alvo, s0, dt, dphi: s1.phi - s0.phi, dr: s1.radius - s0.radius };
}
function passoAnim(agora) {
  if (!anim) return;
  let k = Math.min(1, (agora - anim.t0) / anim.dur); k = 1 - Math.pow(1 - k, 3);
  const s = new THREE.Spherical(anim.s0.radius + anim.dr * k, anim.s0.phi + anim.dphi * k, anim.s0.theta + anim.dt * k);
  controles.target.lerpVectors(anim.a0, anim.a1, k);
  camera.position.copy(controles.target).add(new THREE.Vector3().setFromSpherical(s));
  if (k >= 1) anim = null;
}
const ALVO = new THREE.Vector3(0, .87, 0);
function mostraVista(v, rapido) {
  vista = v;
  $$(".pv-vistas button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.vista === v));
  $$(".pv-partes button").forEach((b) => b.setAttribute("aria-pressed", "false"));
  vai(VISTAS[v], ALVO, distanciaInteira(), rapido);
}
$$(".pv-vistas button").forEach((b) => b.addEventListener("click", () => mostraVista(b.dataset.vista)));
// partes do corpo: a câmera chega perto (do lado que já está virado para ela) e enquadra a parte inteira
function enquadra(alto, largo) {
  const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  return Math.max(alto / 2 / t, largo / 2 / t / camera.aspect) * 1.12;
}
function mostraParte(nome) {
  if (!malha) return;
  const M = MED[corpoAtual], s = ALTURA / M.H;
  const off = camera.position.clone().sub(controles.target), fz = off.z >= 0 ? 1 : -1, sx = off.x >= 0 ? 1 : -1;
  $$(".pv-vistas button").forEach((b) => b.setAttribute("aria-pressed", "false"));
  $$(".pv-partes button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.parte === nome));
  if (nome === "rosto") return vai([0, .05, fz], new THREE.Vector3(0, (M.queixo + .1) * s, 0), enquadra(.36, .3));
  if (nome === "tronco") return vai([0, .04, fz], new THREE.Vector3(0, (M.axila + M.virilha) / 2 * s + .03, 0), enquadra((M.pesc - M.virilha + .08) * s, .5));
  if (nome === "braco") {
    // o meio do braço sai de um raio na altura do cotovelo (igual às travas), não de uma medida fixa
    const p = pontoTravado({ ref: "cotovelo", d: .04, braco: true }, sx > 0 ? "e" : "d");
    const x = p ? p.x : sx * .2, y = (M.axila + M.pulso) / 2 * s;
    return vai([sx * .45, .05, fz], new THREE.Vector3(x, y, 0), enquadra((M.axila - M.pulso + .16) * s, .34));
  }
  if (nome === "perna") return vai([sx * .25, .03, fz], new THREE.Vector3(0, M.virilha / 2 * s + .01, 0), enquadra((M.virilha + .1) * s, .5) * 1.22);   // as barras de cima e de baixo cobrem parte do palco
}
$$(".pv-partes button").forEach((b) => b.addEventListener("click", () => mostraParte(b.dataset.parte)));
function zoom(f) {
  const off = camera.position.clone().sub(controles.target);
  const d = THREE.MathUtils.clamp(off.length() * f, controles.minDistance, controles.maxDistance);
  vai(off.toArray(), controles.target, d);
}
$("#z-mais").addEventListener("click", () => zoom(1 / 1.6));
$("#z-menos").addEventListener("click", () => zoom(1.6));

function ajustaTamanho() {
  const w = palco.clientWidth, h = palco.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  controles.maxDistance = distanciaInteira() * 1.08;
  pedeQuadro();
}
new ResizeObserver(ajustaTamanho).observe(palco);

/* ---------- laço de desenho: só quando algo mudou ---------- */
let precisa = true;
const pedeQuadro = () => (precisa = true);
controles.addEventListener("change", pedeQuadro);
controles.addEventListener("start", () => $$(".pv-vistas button, .pv-partes button").forEach((b) => b.setAttribute("aria-pressed", "false")));
function luzes() {
  // a luz principal acompanha a câmera, então qualquer lado do corpo fica bem iluminado
  const dir = camera.position.clone().sub(controles.target).normalize();
  const dir2 = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), dir).normalize();
  chave.position.copy(controles.target).addScaledVector(dir, 3).addScaledVector(dir2, 1.6).add(new THREE.Vector3(0, 2.2, 0)); chave.target.position.copy(controles.target);
  preenche.position.copy(controles.target).addScaledVector(dir, 2).addScaledVector(dir2, -2.4); preenche.target.position.copy(controles.target);
  contra.position.copy(controles.target).addScaledVector(dir, -3).add(new THREE.Vector3(0, 1.8, 0)); contra.target.position.copy(controles.target);
}
function limitaAlvo() {
  const t = controles.target;
  t.x = THREE.MathUtils.clamp(t.x, -.5, .5); t.y = THREE.MathUtils.clamp(t.y, .05, 1.65); t.z = THREE.MathUtils.clamp(t.z, -.3, .3);
}
function quadro(agora) {
  requestAnimationFrame(quadro);
  if (anim) { passoAnim(agora); precisa = true; }
  if (controles.update()) precisa = true;
  if (!precisa) return;
  precisa = false;
  limitaAlvo(); luzes();
  renderer.render(cena, camera);
  atualizaBotoesZoom();
}
function atualizaBotoesZoom() {
  const d = camera.position.distanceTo(controles.target);
  $("#z-mais").disabled = d <= controles.minDistance * 1.05;
  $("#z-menos").disabled = d >= controles.maxDistance * .97;
}

/* ---------- raios ---------- */
const raio = new THREE.Raycaster();
function ndc(cx, cy) { const r = renderer.domElement.getBoundingClientRect(); return new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); }
function tocaCorpo(cx, cy) {
  if (!malha) return null;
  raio.setFromCamera(ndc(cx, cy), camera);
  const h = raio.intersectObject(malha, false)[0];
  return h ? h.point : null;
}
const sobrePalco = (cx, cy) => { const r = palco.getBoundingClientRect(); return cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom; };
// normal média da pele em volta do ponto (mais estável que a do triângulo)
function normalEm(p, raioM) {
  const g = malha.geometry, pos = g.attributes.position, nor = g.attributes.normal, n = new THREE.Vector3(), r2 = raioM * raioM;
  for (let i = 0; i < pos.count; i++) {
    const dx = pos.getX(i) - p.x, dy = pos.getY(i) - p.y, dz = pos.getZ(i) - p.z, d2 = dx * dx + dy * dy + dz * dz;
    if (d2 < r2) { const w = 1 - d2 / r2; n.x += nor.getX(i) * w; n.y += nor.getY(i) * w; n.z += nor.getZ(i) * w; }
  }
  if (n.lengthSq() < 1e-8) { // sem vizinhos: usa a direção da câmera
    n.copy(camera.position).sub(p);
  }
  return n.normalize();
}

/* ---------- texturas dos flashs: máscara preta vira branca (a cor vem do material) ---------- */
const texturas = {}, PAD = 6;   // margem transparente: fora da arte a textura não repete a borda
function textura(id) {
  return texturas[id] || (texturas[id] = new Promise((ok, erro) => {
    const im = new Image(); im.crossOrigin = "anonymous";
    im.onload = () => {
      const c = document.createElement("canvas"); c.width = im.naturalWidth + PAD * 2; c.height = im.naturalHeight + PAD * 2;
      const g = c.getContext("2d"); g.drawImage(im, PAD, PAD);
      const cor = document.createElement("canvas"); cor.width = c.width; cor.height = c.height; cor.getContext("2d").drawImage(c, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height); for (let i = 0; i < d.data.length; i += 4) { d.data[i] = d.data[i + 1] = d.data[i + 2] = 255; }
      g.putImageData(d, 0, 0);
      ok({ canvas: c, cor, img: im });
    };
    im.onerror = erro; im.src = `${DIR}${id}.webp${VV}`;
  }));
}
function texMoldura() {
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const g = c.getContext("2d"); g.strokeStyle = "#fff"; g.lineWidth = 5; g.setLineDash([16, 11]);
  g.strokeRect(6, 6, 244, 244);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const molduraMat = new THREE.MeshBasicMaterial({ map: texMoldura(), color: new THREE.Color(PV.moldura || "#2f6bff"), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -6 });

/* ---------- peças ---------- */
const VV = `?v=${window.PV_V || 1}`;   // desenho refeito com o mesmo nome: a versão fura o cache
let FL = [], VIS = [];   // VIS: o que aparece na gaveta (partes de conjunto ficam de fora)
const pecas = []; let atual = -1, moldura = null;
const dims = (q) => { const base = q.cm / 100; return q.r >= 1 ? { w: base / q.r, h: base } : { w: base, h: base * q.r }; };
function orientacao(q) {
  const m = new THREE.Matrix4().lookAt(q.n, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0));
  // lookAt de Matrix4 aponta o -z para o alvo; aqui queremos o +z saindo da pele
  const qa = new THREE.Quaternion().setFromRotationMatrix(m);
  qa.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -q.giro * Math.PI / 180));
  return qa;
}
// A peça "abraça" a pele: cada vértice perto do ponto ganha coordenadas no plano da peça, mas com a distância
// real (corda) até o centro, não a projetada. Num braço fino a arte dá a volta em vez de ser cortada na lateral.
let carimbo = 1;
// projeção plana: a tinta acaba seca onde a pele vira de lado (cos entre a pele e o ângulo do mockup).
// O corte é feito por pixel com a normal suave da pele: a borda sai lisa, sem degrau de triângulo e sem esfumado.
const CORTE_PLANO = .16;
// desenho livre (abraça a pele): dá a volta até pouco depois da lateral; a parte de trás do braço/perna fica limpa
const CORTE_LIVRE = -.2;
function materialTinta(op) {
  const m = new THREE.MeshStandardMaterial(op);
  m.userData.u = { uQn: { value: new THREE.Vector3(0, 0, 1) }, uCorte: { value: -2 } };
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, m.userData.u);
    s.vertexShader = s.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vNo;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvNo = normal;");
    s.fragmentShader = s.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vNo;\nuniform vec3 uQn;\nuniform float uCorte;")
      .replace("#include <map_fragment>", `#include <map_fragment>
  if (uCorte > -1.0) {
    float dd = dot(normalize(vNo), uQn), aw = max(fwidth(dd), 1e-4);
    float k = smoothstep(uCorte - aw, uCorte + aw, dd);   // 1 pixel de antisserrilhado, nada mais
    if (k <= 0.0) discard;
    diffuseColor.a *= k;
  }`);
  };
  m.customProgramCacheKey = () => "tinta1";
  return m;
}
function eixos(q) {
  const r = orientacao(q);
  return { X: new THREE.Vector3(1, 0, 0).applyQuaternion(r), Y: new THREE.Vector3(0, 1, 0).applyQuaternion(r) };
}
function local(v, q, E, out) {
  const dx = v.x - q.p.x, dy = v.y - q.p.y, dz = v.z - q.p.z, n = q.n;
  const h = dx * n.x + dy * n.y + dz * n.z, tx = dx - h * n.x, ty = dy - h * n.y, tz = dz - h * n.z;
  const lt = Math.hypot(tx, ty, tz), ld = Math.hypot(dx, dy, dz), k = q.plano ? 1 : lt > 1e-6 ? ld / lt : 1;
  out.x = (tx * E.X.x + ty * E.X.y + tz * E.X.z) * k; out.y = (tx * E.Y.x + ty * E.Y.y + tz * E.Y.z) * k; out.z = ld;
  return out;
}
function decal(q, w, h, tex) {
  const { geo, cen, nt, adj } = corpoInfo, pos = geo.attributes.position, nor = geo.attributes.normal, idx = geo.index.array;
  const R = Math.hypot(w, h) / 2 * 1.75 + .012, R2 = R * R, E = eixos(q);
  // semente: triângulo mais perto do ponto
  let semente = 0, dm = Infinity;
  for (let t = 0; t < nt; t++) { const dx = cen[t * 3] - q.p.x, dy = cen[t * 3 + 1] - q.p.y, dz = cen[t * 3 + 2] - q.p.z, d = dx * dx + dy * dy + dz * dz; if (d < dm) { dm = d; semente = t; } }
  // só a pele ligada ao ponto (o braço não puxa o tronco ao lado)
  const marca = corpoInfo.marca, id = ++carimbo, fila = [semente]; marca[semente] = id;
  for (let i = 0; i < fila.length; i++) {
    const t = fila[i];
    for (let k = 0; k < 3; k++) {
      const v = idx[t * 3 + k];
      for (let j = adj.ini[v]; j < adj.ini[v + 1]; j++) {
        const u = adj.tri[j]; if (marca[u] === id) continue; marca[u] = id;
        const dx = cen[u * 3] - q.p.x, dy = cen[u * 3 + 1] - q.p.y, dz = cen[u * 3 + 2] - q.p.z;
        if (dx * dx + dy * dy + dz * dz <= R2) fila.push(u);
      }
    }
  }
  const P = [], N = [], U = [], v3 = new THREE.Vector3(), l = new THREE.Vector3(), uv = [0, 0, 0, 0, 0, 0];
  const ex = tex ? tex.image.width : 1, ey = tex ? tex.image.height : 1, mx = tex ? PAD / ex : 0, my = tex ? PAD / ey : 0;
  // desenho travado no braço: abaixo da axila, só a pele do braço (o lado do tronco fica limpo)
  const soBraco = q.trava && q.trava.braco, MB = MED[corpoAtual], sb = ALTURA / MB.H;
  const sgP = q.lado === "e" ? 1 : q.lado === "d" ? -1 : 0, soPerna = !!(q.trava && sgP && q.p.y / sb < MB.virilha);
  const corte = q.plano ? CORTE_PLANO : CORTE_LIVRE, qn = q.n;
  for (const t of fila) {
    if (corte > -1) {   // fora só o triângulo inteiro de lado; o corte fino é por pixel, no material (sem degrau nem borrão)
      let d = -9;
      for (let k = 0; k < 3; k++) { const v = idx[t * 3 + k]; d = Math.max(d, nor.getX(v) * qn.x + nor.getY(v) * qn.y + nor.getZ(v) * qn.z); }
      if (d < corte) continue;
    }
    if (soBraco) { const cy = cen[t * 3 + 1] / sb, cx = Math.abs(cen[t * 3] / sb); if (cy < MB.axila && cx < interp(MB.braco, cy)) continue; }
    // desenho travado numa perna: abaixo da virilha, só a pele dessa perna (a de dentro da outra perna fica limpa)
    if (soPerna && cen[t * 3 + 1] / sb < MB.virilha && cen[t * 3] * sgP < .004) continue;
    let umin = 9, umax = -9, vmin = 9, vmax = -9;
    for (let k = 0; k < 3; k++) {
      v3.fromBufferAttribute(pos, idx[t * 3 + k]); local(v3, q, E, l);
      let u = .5 + l.x / w, vv = .5 + l.y / h; if (q.flip) u = 1 - u;
      uv[k * 2] = u; uv[k * 2 + 1] = vv;
      umin = Math.min(umin, u); umax = Math.max(umax, u); vmin = Math.min(vmin, vv); vmax = Math.max(vmax, vv);
    }
    if (umax < 0 || umin > 1 || vmax < 0 || vmin > 1) continue;
    for (let k = 0; k < 3; k++) {
      const v = idx[t * 3 + k], nx = nor.getX(v), ny = nor.getY(v), nz = nor.getZ(v);
      P.push(pos.getX(v) + nx * .0006, pos.getY(v) + ny * .0006, pos.getZ(v) + nz * .0006); N.push(nx, ny, nz);
      U.push(mx + uv[k * 2] * (1 - 2 * mx), my + uv[k * 2 + 1] * (1 - 2 * my));
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(U, 2));
  return g;
}
function desenha(q) {
  if (q.malha) { cena.remove(q.malha); q.malha.geometry.dispose(); }
  const { w, h } = dims(q);
  q.malha = new THREE.Mesh(decal(q, w, h, q.tex), q.mat);
  q.mat.userData.u.uQn.value.copy(q.n); q.mat.userData.u.uCorte.value = q.plano ? CORTE_PLANO : CORTE_LIVRE;
  q.malha.renderOrder = 2 + pecas.indexOf(q);
  cena.add(q.malha);
  const orig = q.cor === "original";
  if (q.mat.map !== (orig ? q.texCor : q.tex)) { q.mat.map = orig ? q.texCor : q.tex; q.mat.needsUpdate = true; }
  q.mat.color.set(orig ? "#ffffff" : q.cor === "base" ? TINTA : CORES[q.cor]);
  // peça travada: o nome do local vem do tatuador (o automático chamaria a costela de "Abdômen")
  const z = q.trava && q.trava.zona;
  q.zona = z ? (typeof z === "string" ? z : z[q.lado] || onde(q.p, q.n)) : onde(q.p, q.n);
  if (pecas[atual] === q) mostraSel();
  pedeQuadro();
}
function desenhaMoldura() {
  if (moldura) { cena.remove(moldura); moldura.geometry.dispose(); moldura = null; }
  const q = pecas[atual]; if (!q || salvando) return pedeQuadro();
  const { w, h } = dims(q), f = .018;
  moldura = new THREE.Mesh(decal(q, w + f * 2, h + f * 2), molduraMat);
  moldura.renderOrder = 50; cena.add(moldura); pedeQuadro();
}
function mostraSel() {
  const q = pecas[atual];
  desenhaMoldura();
  if (!q) { localEl.hidden = true; dica.hidden = false; dica.textContent = pecas.length ? "Toque numa peça para ajustar" : TOQUE ? "Toque num desenho para pôr no corpo" : "Arraste um desenho até a pele"; ajuste.setAttribute("aria-disabled", "true"); $("#aj-nome").textContent = pecas.length ? "Toque numa peça no corpo" : "Ponha um desenho no corpo"; return; }
  ajuste.setAttribute("aria-disabled", "false");
  $("#aj-nome").textContent = q.nome;
  rTam.value = q.cm; oTam.textContent = `${q.cm} cm`;
  rGiro.value = Math.round(q.giro); oGiro.textContent = `${Math.round(q.giro)}°`;
  $$("#pv-cores button").forEach((b) => { b.setAttribute("aria-pressed", b.dataset.cor === q.cor); if (b.dataset.cor === "original") b.hidden = !q.colorido; });
  localEl.hidden = false; dica.hidden = true;
  localEl.innerHTML = `<b>${esc(q.nome)}</b> · ${nomeZona(q)}${q.trava ? " (local fixo)" : ""}${q.grupo ? "" : ` · ~${q.cm} cm`}${q.trava ? "" : ` · ${Math.round(q.giro)}°`}${TOQUE ? "<small>Pinça muda o tamanho · gire os dois dedos para girar</small>" : ""}`;
}
function escolhe(i) {
  atual = i; mostraSel();
  palco.classList.toggle("sel", i >= 0);
  const s = pecas[i];
  $$("li", lista).forEach((li) => { const q = pecas[+li.dataset.i]; li.classList.toggle("ativo", !!s && !!q && (q === s || (!!q.grupo && q.grupo === s.grupo))); });
}
/* ---------- desenho com local certo (trava no JSON do cliente): o tatuador só faz aquela peça naquele lugar ----------
   trava: { lado: "d" | "e" | "c", ref: medida do corpo (MED), d: deslocamento na altura, x: afastamento do meio,
            perna: true acha o meio da perna naquela altura, braco: true o meio do braço, dentro: puxa para o meio do corpo, dir: 0 frente / 90 lateral de fora, cm, giro } */
function pontoTravado(t, ladoQ) {
  const M = MED[corpoAtual], s = ALTURA / M.H, y = (M[t.ref] + (t.d || 0)) * s;
  const sg = ladoQ === "e" ? 1 : ladoQ === "d" ? -1 : 0;
  let x = sg * (t.x || 0) * s;
  if (t.perna && sg) {   // varre de frente, de dentro pra fora: o primeiro trecho com pele é a perna (a mão ao lado da coxa fica de fora)
    const xs = [];
    for (let k = .004; k < .32; k += .003) {
      raio.set(new THREE.Vector3(sg * k, y, 2), new THREE.Vector3(0, 0, -1));
      if (raio.intersectObject(malha, false).length) xs.push(k);
      else if (xs.length) break;
    }
    if (xs.length) x = sg * (xs[0] + xs[xs.length - 1]) / 2;
  }
  if (t.braco && sg) {   // de frente, o último trecho com pele daquele lado é o braço (o tronco vem antes)
    let run = [], ant = -1;
    for (let k = .02; k < .5; k += .003) {
      raio.set(new THREE.Vector3(sg * k, y, 2), new THREE.Vector3(0, 0, -1));
      if (raio.intersectObject(malha, false).length) { if (k - ant > .008) run = []; run.push(k); ant = k; }
    }
    if (run.length) x = sg * (run[0] + run[run.length - 1]) / 2;
  }
  if (t.dentro && sg) x -= sg * t.dentro * s;   // desenho que sobe do membro para o ombro: o centro fica mais para dentro
  const a = (t.dir || 0) * Math.PI / 180, fora = new THREE.Vector3(sg * Math.sin(a), 0, Math.cos(a));
  raio.set(new THREE.Vector3(x, y, 0).addScaledVector(fora, 2), fora.clone().negate());
  const h = raio.intersectObject(malha, false)[0];
  return h ? h.point : null;
}
// desenho travado (veio de mockup): projetado reto, do ângulo em que o mockup foi visto (dir), sem "abraçar" o corpo.
// Assim fica igual à foto e não escorrega para as costas nem estica nas laterais.
function colocaTravada(q) {
  const p = pontoTravado(q.trava, q.lado); if (!p) return false;
  const t = q.trava, sg = q.lado === "e" ? 1 : q.lado === "d" ? -1 : 0, a = (t.dir || 0) * Math.PI / 180;
  q.p.copy(p); q.n = new THREE.Vector3(sg * Math.sin(a), 0, Math.cos(a)).normalize(); q.plano = true; return true;
}
const tamanho = (q, v) => q.trava ? THREE.MathUtils.clamp(Math.round(v), Math.round(q.cm0 * .8), Math.round(q.cm0 * 1.2)) : THREE.MathUtils.clamp(Math.round(v), 4, 45);
const avisoTrava = () => avisa("Esse desenho tem local certo no corpo. Dá pra mudar o tamanho e passar pro outro lado.");
// conjunto: uma arte só, feita de partes travadas em lugares diferentes (ex.: corpo inteiro). Entra, sai, espelha e cresce junto.
const membros = (q) => (q && q.grupo ? pecas.filter((x) => x.grupo === q.grupo) : q ? [q] : []);
const unicas = () => pecas.filter((q) => !q.grupo || membros(q)[0] === q);
const nomeZona = (q) => (q.grupo ? q.grupo.zona || q.zona : q.zona);
async function poeConjunto(f) {
  const g = { id: f.id, nome: f.nome, zona: f.zona };
  let primeiro = null;
  for (const id of f.partes) {
    const pf = FL.find((x) => x.id === id); if (!pf) continue;
    const q = await poe(pf, centroDaTela(), g);
    if (q && !primeiro) primeiro = q;
  }
  if (!primeiro) return;
  escolhe(pecas.indexOf(primeiro)); atualizaLista();
  palco.classList.remove("vazio");
  mostraVista("f");   // a arte ocupa o corpo: a câmera mostra ele inteiro
}
async function poe(f, p, grupo) {
  if (!malha) return;
  if (f.partes && !grupo) return poeConjunto(f);
  const t = await textura(f.id);
  const tex = new THREE.CanvasTexture(t.canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  let texCor = null;
  if (f.colorido) { texCor = new THREE.CanvasTexture(t.cor); texCor.colorSpace = THREE.SRGBColorSpace; texCor.anisotropy = 8; }
  const cor0 = f.colorido ? "original" : "base";
  ativa();
  const mat = materialTinta({ map: tex, color: "#ffffff", transparent: true, opacity: .94, roughness: .5, metalness: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
  const q = { id: f.id, nome: f.nome, r: f.r, colorido: !!f.colorido, cm: 12, giro: 0, flip: false, cor: cor0, p: p.clone(), n: null, tex, texCor, mat };
  q.n = normalEm(q.p, .05);
  if (grupo) { q.grupo = grupo; q.nome = grupo.nome; }
  if (f.trava) { q.trava = f.trava; q.lado = f.trava.lado || "c"; q.cm = q.cm0 = f.trava.cm; q.giro = f.trava.giro || 0; if (!colocaTravada(q)) return; }
  pecas.push(q);
  desenha(q);
  if (grupo) return q;
  escolhe(pecas.length - 1); atualizaLista();
  palco.classList.remove("vazio");
  if (mq.matches) olhaPara(q);   // celular: o corpo inteiro fica pequeno; a câmera chega perto da peça nova
}
function tira(i) {
  const q0 = pecas[i]; if (!q0) return;
  for (const q of membros(q0)) {
    cena.remove(q.malha); q.malha.geometry.dispose(); q.mat.dispose(); q.tex.dispose(); if (q.texCor) q.texCor.dispose();
    pecas.splice(pecas.indexOf(q), 1);
  }
  i = Math.min(i, pecas.length - 1);
  escolhe(Math.min(i, pecas.length - 1)); atualizaLista();
  if (!pecas.length) { palco.classList.add("vazio"); dica.hidden = false; }
  pedeQuadro();
}
function atualizaLista() {
  bPede.disabled = bSalva.disabled = !pecas.length;
  if (!pecas.length) { lista.innerHTML = '<li class="pv-vazio">Nenhum desenho no corpo ainda.</li>'; return; }
  // cartões iguais, centrados: miniatura no papel, nome, local e tamanho
  const sel = pecas[atual];
  lista.innerHTML = unicas().map((q) => { const i = pecas.indexOf(q), ic = q.grupo ? q.grupo.id : q.id, on = sel && (sel === q || (q.grupo && sel.grupo === q.grupo));
    return `<li data-i="${i}" class="${on ? "ativo" : ""}" tabindex="0"><b class="pv-ico">${q.cor === "original" ? `<img src="${DIR}${ic}-p.webp${VV}" alt="">` : `<i style="--m:url(${DIR}${ic}-p.webp${VV});background:${q.cor === "base" ? TINTA : CORES[q.cor]}"></i>`}</b>
    <span>${esc(q.nome)}</span><small>${nomeZona(q)}</small><small>${q.grupo ? "Arte completa" : `~${q.cm} cm`}</small></li>`; }).join("");
}
lista.addEventListener("click", (e) => { const li = e.target.closest("li[data-i]"); if (!li) return; escolhe(+li.dataset.i); olhaPara(pecas[atual]); });
lista.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.closest("li[data-i]")) e.target.click(); });
// leva a câmera até a peça
function olhaPara(q) {
  if (!q) return;
  const d = THREE.MathUtils.clamp(q.cm / 100 * 7, .85, distanciaInteira());
  const dir = q.n.clone(); dir.y *= .5;
  vai(dir.toArray(), q.p, d);
}

/* ---------- painel ---------- */
let agendado = null;
const pend = new Set();
const redesenha = (q) => { membros(q).forEach((m) => pend.add(m)); if (agendado) return; agendado = requestAnimationFrame(() => { agendado = null; const l = [...pend]; pend.clear(); l.forEach(desenha); }); };
// tamanho: no conjunto, todas as partes crescem na mesma proporção (cada uma dentro do seu limite)
function mudaTam(q, v) {
  const novo = tamanho(q, v);
  if (q.grupo) { const k = novo / q.cm; for (const m of membros(q)) if (m !== q) m.cm = tamanho(m, m.cm * k); }
  q.cm = novo;
}
rTam.addEventListener("input", () => { const q = pecas[atual]; if (!q) return; mudaTam(q, +rTam.value); if (q.cm !== +rTam.value) rTam.value = q.cm; redesenha(q); });
rTam.addEventListener("change", atualizaLista);
rGiro.addEventListener("input", () => { const q = pecas[atual]; if (!q) return; if (q.trava) { rGiro.value = Math.round(q.giro); return avisoTrava(); } q.giro = +rGiro.value; redesenha(q); });
$$("#pv-cores button").forEach((b) => b.addEventListener("click", () => { const q = pecas[atual]; if (!q) return; for (const m of membros(q)) { m.cor = b.dataset.cor; desenha(m); } atualizaLista(); }));
function espelha(q0) {
  for (const q of membros(q0)) {
    q.flip = !q.flip;
    if (q.trava && q.lado !== "c") { q.lado = q.lado === "d" ? "e" : "d"; q.giro = -q.giro; colocaTravada(q); }
    desenha(q);
  }
  if (q0.trava && !q0.grupo && q0.lado !== "c") olhaPara(q0);
  atualizaLista();
}
$("#b-espelha").addEventListener("click", () => { const q = pecas[atual]; if (q) espelha(q); });
$("#b-apaga").addEventListener("click", () => tira(atual));
addEventListener("keydown", (e) => {
  if (atual < 0 || e.target.closest("input")) return;
  if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); tira(atual); }
});

/* ---------- acertar uma peça pelo ponto da pele ---------- */
function acerta(p) {
  if (!p) return -1;
  const l = new THREE.Vector3();
  for (let i = pecas.length - 1; i >= 0; i--) {
    const q = pecas[i], { w, h } = dims(q), folga = .012;
    local(p, q, eixos(q), l);
    if (Math.abs(l.x) <= w / 2 + folga && Math.abs(l.y) <= h / 2 + folga && l.z < Math.max(w, h)) return i;
  }
  return -1;
}

/* ---------- gaveta ---------- */
function centroDaTela() {
  // com zoom, o ponto da pele no meio da tela; com o corpo inteiro, peito ou costas
  const r = palco.getBoundingClientRect();
  const p = camera.position.distanceTo(controles.target) < controles.maxDistance * .8 && tocaCorpo(r.left + r.width / 2, r.top + r.height / 2);
  if (p) return p;
  // nada no centro: peito ou costas, conforme o lado que está virado para a câmera
  const fr = camera.position.z - controles.target.z >= 0;
  const alvo = new THREE.Vector3(0, 1.23, fr ? .5 : -.5);
  raio.set(alvo, new THREE.Vector3(0, 0, fr ? -1 : 1));
  const h = raio.intersectObject(malha, false)[0];
  return h ? h.point : new THREE.Vector3(0, 1.2, 0);
}
function montaGaveta() {
  gaveta.classList.toggle("muitos", VIS.length > 9);   // mais de 9: 4 por linha no computador, sem o nome embaixo
  gaveta.innerHTML = VIS.map((f, i) => `<li><button type="button" data-i="${i}" aria-label="Pôr no corpo: ${esc(f.nome)}" title="${esc(f.nome)}">${f.colorido ? `<img src="${DIR}${f.id}-p.webp${VV}" alt="" draggable="false">` : `<i style="--m:url(${DIR}${f.id}-p.webp${VV})"></i>`}<em>${String(i + 1).padStart(2, "0")}</em></button><span>${esc(f.nome)}</span></li>`).join("");
  $$("button", gaveta).forEach((b) => {
    const f = VIS[+b.dataset.i];
    let ini = null, fant = null;
    b.addEventListener("pointerdown", (e) => {
      if (e.button > 0) return;
      ini = { x: e.clientX, y: e.clientY, id: e.pointerId };
      if (e.pointerType === "mouse") try { b.setPointerCapture(e.pointerId); } catch (_) {}
    });
    b.addEventListener("pointermove", (e) => {
      if (!ini || e.pointerId !== ini.id) return;
      const dx = e.clientX - ini.x, dy = e.clientY - ini.y;
      if (!fant) {
        const toque = e.pointerType !== "mouse";
        // no toque, a grade rola a página: o desenho entra com um toque (e depois anda pela pele)
        if (toque || Math.hypot(dx, dy) < 6) return;
        try { b.setPointerCapture(e.pointerId); } catch (_) {}
        fant = document.createElement("div"); fant.className = "pv-fantasma" + (f.colorido ? " cor" : ""); fant.style.setProperty("--m", `url(${DIR}${f.id}-p.webp${VV})`);
        document.body.appendChild(fant); document.body.classList.add("pv-arrasta");
      }
      fant.style.left = e.clientX + "px"; fant.style.top = e.clientY + "px";
      const sobre = sobrePalco(e.clientX, e.clientY) && tocaCorpo(e.clientX, e.clientY);
      fant.style.transform = `translate(-50%,-50%) scale(${sobre ? 1.08 : .9})`;
      fant.classList.toggle("longe", !sobre);
    });
    const fim = (e, cancelou) => {
      if (!ini) return;
      if (fant) {
        const p = !cancelou && sobrePalco(e.clientX, e.clientY) && tocaCorpo(e.clientX, e.clientY);
        if (p) poe(f, p);
        else if (!cancelou && sobrePalco(e.clientX, e.clientY)) avisa("Solte o desenho em cima do corpo.");
        fant.remove(); fant = null; document.body.classList.remove("pv-arrasta");
        b.dataset.arrastou = "1";
      }
      ini = null;
    };
    b.addEventListener("pointerup", (e) => fim(e, false));
    b.addEventListener("pointercancel", (e) => fim(e, true));
    b.addEventListener("click", () => {
      if (b.dataset.arrastou) { delete b.dataset.arrastou; return; }
      poe(f, centroDaTela());
      if (innerWidth <= 1080 && !VITRINE) { const r = palco.getBoundingClientRect(); if (r.top < 0 || r.bottom > innerHeight) palco.scrollIntoView({ behavior: "smooth", block: "nearest" }); }
    });
  });
  // celular: a grade vira uma faixa de 3 por vez; os pontos mostram a página
  const pontos = $("#pontos"), pags = Math.max(1, Math.ceil(VIS.length / 4));
  pontos.innerHTML = Array.from({ length: pags }, (_, k) => `<i data-k="${k}"></i>`).join("");
  const marca = () => { const max = gaveta.scrollWidth - gaveta.clientWidth, k = max > 0 ? Math.round(gaveta.scrollLeft / max * (pags - 1)) : 0; $$("i", pontos).forEach((p, n) => p.classList.toggle("ativo", n === k)); };
  gaveta.addEventListener("scroll", () => requestAnimationFrame(marca), { passive: true }); marca();
}

/* ---------- palco: peça arrasta pela pele; fora dela, o corpo gira ---------- */
// estes ouvintes entram antes dos do OrbitControls, então decidem primeiro
const tela = renderer.domElement;
let gesto = null; const dedos = new Map();   // dedo -> posição
const par = () => { const [a, b] = [...dedos.values()]; return { d: Math.hypot(b.x - a.x, b.y - a.y), a: Math.atan2(b.y - a.y, b.x - a.x), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; };
const angulo = (g) => (((g % 360) + 540) % 360) - 180;
tela.addEventListener("pointerdown", (e) => {
  dedos.set(e.pointerId, { x: e.clientX, y: e.clientY });
  anim = null;
  if (dedos.size > 1) {
    // dois dedos com um desenho escolhido: pinça = tamanho, girar os dedos = giro (como editar uma imagem)
    const q = gesto && gesto.tipo === "move" ? gesto.q : pecas[atual];
    if (q && dedos.size === 2) {
      const m = par();
      const c = naTela(q.p);
      gesto = { tipo: "pinca", q, d0: Math.max(m.d, 1), cm0: q.cm, g0: q.giro, aAnt: m.a, volta: 0, girando: false, k: sentidoNaTela(q),
        ox: c.x - m.x, oy: c.y - m.y };
      controles.enabled = false; palco.classList.add("pega");
      try { tela.setPointerCapture(e.pointerId); } catch (_) {}
      e.stopImmediatePropagation(); return;
    }
    if (gesto && gesto.tipo !== "pinca") { gesto = null; controles.enabled = true; palco.classList.remove("pega"); }   // sem desenho: zoom do corpo
    return;
  }
  const p = tocaCorpo(e.clientX, e.clientY), i = acerta(p);
  if (i < 0) { controles.enabled = true; gesto = { tipo: "gira", x: e.clientX, y: e.clientY }; return; }
  controles.enabled = false;
  if (i !== atual) escolhe(i);
  if (pecas[i].trava) { controles.enabled = true; gesto = { tipo: "gira", x: e.clientX, y: e.clientY, trava: 1 }; return; }
  const q = pecas[i], c = q.p.clone().project(camera), r = tela.getBoundingClientRect();
  const sx = (c.x + 1) / 2 * r.width + r.left, sy = (1 - c.y) / 2 * r.height + r.top;
  gesto = { tipo: "move", q, dx: sx - e.clientX, dy: sy - e.clientY };
  try { tela.setPointerCapture(e.pointerId); } catch (_) {}
  palco.classList.add("pega");
});
let movePend = null;
tela.addEventListener("pointermove", (e) => {
  if (dedos.has(e.pointerId)) dedos.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (gesto && gesto.tipo === "pinca") {
    e.stopImmediatePropagation();
    if (dedos.size < 2) return;
    const m = par(), q = gesto.q, G = gesto;
    mudaTam(q, G.cm0 * m.d / G.d0);
    if (q.trava) { redesenha(q); return; }
    // giro: soma o quanto os dedos giraram (sem pulo em ±180°); só começa depois de 6° para não girar sem querer no zoom
    let da = m.a - G.aAnt; da = Math.atan2(Math.sin(da), Math.cos(da)); G.aAnt = m.a;
    G.volta += THREE.MathUtils.radToDeg(da);
    if (!G.girando && Math.abs(G.volta) > 6) { G.girando = true; G.volta = 0; }
    if (G.girando) {
      let g = G.g0 + G.volta * G.k;   // k: o desenho gira na tela para o mesmo lado dos dedos, em qualquer vista
      const reto = Math.round(g / 90) * 90;
      if (Math.abs(g - reto) < 5) { if (!G.preso && navigator.vibrate) navigator.vibrate(8); G.preso = true; g = reto; } else G.preso = false;
      q.giro = angulo(g);
    }
    // os dois dedos seguram o desenho: o meio deles leva a peça junto
    const p = tocaCorpo(m.x + G.ox, m.y + G.oy);
    if (p && p.distanceTo(q.p) > .002) { q.p.copy(p); q.n = normalEm(p, Math.min(.06, q.cm / 100 / 3 + .015)); }
    redesenha(q); return;
  }
  if (!gesto || gesto.tipo !== "move") {
    if (e.pointerType === "mouse" && !dedos.size) {   // passar o mouse: mostra se tem peça embaixo
      if (movePend) return;
      movePend = requestAnimationFrame(() => { movePend = null; palco.classList.toggle("sobre", acerta(tocaCorpo(e.clientX, e.clientY)) >= 0); });
    }
    return;
  }
  const x = e.clientX + gesto.dx, y = e.clientY + gesto.dy;
  if (movePend) cancelAnimationFrame(movePend);
  movePend = requestAnimationFrame(() => {
    movePend = null;
    const p = tocaCorpo(x, y); if (!p || !gesto || gesto.tipo !== "move") return;
    const q = gesto.q; q.p.copy(p); q.n = normalEm(p, Math.min(.06, q.cm / 100 / 3 + .015));
    desenha(q);
  });
});
const solta = (e) => {
  dedos.delete(e.pointerId);
  if (gesto && gesto.tipo === "gira" && !gesto.trava && Math.hypot(e.clientX - gesto.x, e.clientY - gesto.y) < 5 && e.type === "pointerup" && atual >= 0) escolhe(-1);
  if (gesto && (gesto.tipo === "move" || gesto.tipo === "pinca")) atualizaLista();
  if (gesto && gesto.tipo === "pinca") gesto = { tipo: "fim" };   // o dedo que sobra não arrasta nada
  if (!dedos.size) { gesto = null; controles.enabled = true; palco.classList.remove("pega"); }
};
tela.addEventListener("pointerup", solta);
tela.addEventListener("pointercancel", solta);

/* ---------- barra de ajuste no palco (celular) ---------- */
$("#ferr").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-f]"), q = pecas[atual]; if (!b || !q) return;
  const f = b.dataset.f;
  if (f === "menor") mudaTam(q, q.cm - 2);
  else if (f === "maior") mudaTam(q, q.cm + 2);
  else if (f === "gira") { if (q.trava) return avisoTrava(); q.giro = angulo(q.giro - 15); }   // sentido do relógio, como o ícone
  else if (f === "espelha") return espelha(q);
  else if (f === "tira") return tira(atual);
  else if (f === "ok") return escolhe(-1);
  membros(q).forEach(desenha); atualizaLista();
});
tela.addEventListener("wheel", (e) => {
  const q = pecas[atual];
  if (q && acerta(tocaCorpo(e.clientX, e.clientY)) === atual) {   // em cima da peça escolhida: tamanho (Shift: giro)
    e.preventDefault(); e.stopImmediatePropagation();
    if (e.shiftKey) { if (!q.trava) q.giro = (((q.giro + (e.deltaY || e.deltaX) * .15) + 540) % 360) - 180; }
    else mudaTam(q, q.cm * Math.exp(-e.deltaY * .0015) + (e.deltaY < 0 ? .5 : -.5));
    redesenha(q); clearTimeout(tela.tl); tela.tl = setTimeout(atualizaLista, 250); return;
  }
  // corpo inteiro na tela e rodinha para baixo: deixa a página rolar
  if (e.deltaY > 0 && camera.position.distanceTo(controles.target) >= controles.maxDistance * .97) { e.stopImmediatePropagation(); return; }
  anim = null;
}, { passive: false });

/* ---------- trocar de corpo: as peças vão para o mesmo lugar no outro corpo ---------- */
async function trocaCorpo(nome, primeira) {
  corpoAtual = nome;
  $$(".pv-corpos button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.corpo === nome));
  palco.classList.add("carregando");
  const info = await carregaCorpo(nome);
  if (corpoAtual !== nome) return;
  if (corpoVis) cena.remove(corpoVis);
  malha = info.raioMalha; corpoVis = info.malha; corpoInfo = info; cena.add(corpoVis);
  palco.classList.remove("carregando"); carregando.hidden = true;
  for (const q of pecas) {
    if (q.trava && colocaTravada(q)) { desenha(q); continue; }
    raio.set(q.p.clone().addScaledVector(q.n, .25), q.n.clone().negate());
    const h = raio.intersectObject(malha, false)[0];
    if (h) { q.p.copy(h.point); q.n = normalEm(q.p, .05); }
    desenha(q);
  }
  desenhaMoldura(); atualizaLista();
  if (primeira) mostraVista("f", true);
  pedeQuadro();
}
$$(".pv-corpos button").forEach((b) => b.addEventListener("click", () => { if (b.dataset.corpo !== corpoAtual) trocaCorpo(b.dataset.corpo); }));

/* ---------- imagem da montagem: um close de cada lado com peças ---------- */
let salvando = false;
async function montagem() {
  salvando = true; desenhaMoldura();
  const grupos = [[], []];
  for (const q of pecas) grupos[q.n.z >= 0 ? 0 : 1].push(q);
  const usados = grupos.filter((g) => g.length);
  const PW = 900, PH = 1100, rodape = 64;
  const out = document.createElement("canvas"); out.width = PW * usados.length; out.height = PH + rodape;
  const o = out.getContext("2d");
  const tam = renderer.getSize(new THREE.Vector2()), pr = renderer.getPixelRatio(), asp = camera.aspect;
  const cam0 = { pos: camera.position.clone(), alvo: controles.target.clone() };
  renderer.setPixelRatio(1); renderer.setSize(PW, PH, false); camera.aspect = PW / PH; camera.updateProjectionMatrix();
  usados.forEach((g, k) => {
    const c = new THREE.Vector3(), n = new THREE.Vector3(); g.forEach((q) => { c.add(q.p); n.add(q.n); }); c.divideScalar(g.length);
    let ext = 0; g.forEach((q) => { ext = Math.max(ext, q.p.distanceTo(c) + q.cm / 200); });
    n.y *= .3; if (n.lengthSq() < 1e-4) n.set(0, 0, k ? -1 : 1); n.normalize();
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), d = THREE.MathUtils.clamp(ext * 1.9 / t, .55, distanciaInteira());
    controles.target.copy(c); camera.position.copy(c).addScaledVector(n, d); camera.lookAt(c);
    luzes();
    o.fillStyle = "#ffffff"; o.fillRect(PW * k, 0, PW, PH);
    renderer.render(cena, camera);
    o.drawImage(renderer.domElement, PW * k, 0, PW, PH);
  });
  renderer.setPixelRatio(pr); renderer.setSize(tam.x, tam.y, false); camera.aspect = asp; camera.updateProjectionMatrix();
  controles.target.copy(cam0.alvo); camera.position.copy(cam0.pos); camera.lookAt(cam0.alvo);
  salvando = false; desenhaMoldura(); pedeQuadro();
  const W = out.width, H = PH;
  if (usados.length > 1) { o.fillStyle = "#e4e0d6"; o.fillRect(PW - 1, 0, 2, H); }
  o.fillStyle = "#0c0c0d"; o.fillRect(0, H, W, rodape);
  o.fillStyle = "#f2efe8"; o.font = "600 20px 'JetBrains Mono', monospace"; o.textBaseline = "middle"; o.textAlign = "left";
  o.fillText(`${(DEMO ? "Seu Estúdio" : C.nome).toUpperCase()} · PROVADOR`, 28, H + rodape / 2);
  o.textAlign = "right"; o.fillStyle = "#8f8d88"; o.font = "500 16px 'JetBrains Mono', monospace";
  o.fillText(unicas().map(nomeZona).filter((z, i, a) => a.indexOf(z) === i).join(" · ").slice(0, 70), W - 28, H + rodape / 2);
  return new Promise((ok) => out.toBlob(ok, "image/png"));
}
function textoPedido() {
  const l = unicas().map((q, i) => `${i + 1}. ${q.nome}\n   ${nomeZona(q)}${q.grupo ? " (arte completa, local fixo)" : ` · ~${q.cm} cm`}`);
  const ola = DEMO ? "Olá, Seu Estúdio!" : (C.textos && C.textos.ola) || `Olá, ${C.nome}!`;
  return `${ola} Montei no provador do site e queria orçar:\n\n${l.join("\n")}\n\nA imagem da montagem vai junto.`;
}
function avisa(t) { aviso.textContent = t; aviso.hidden = false; clearTimeout(avisa.t); avisa.t = setTimeout(() => (aviso.hidden = true), 6000); }
const arquivo = () => `${DEMO ? "provador" : C.slug}-montagem.png`;
function baixa(blob) {
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = arquivo();
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
bSalva.addEventListener("click", async () => baixa(await montagem()));
// demo: em vez de enviar, mostra o que chega para o estúdio
const recebe = $("#recebe");
function mostraRecebido(blob, texto) {
  const u = URL.createObjectURL(blob), hora = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  recebe.innerHTML = `<div class="pv-rec-cab"><p class="pv-rec-eb">Demonstração · nada foi enviado</p><h2>O que o estúdio recebe</h2><p>A montagem e o pedido chegam juntos no WhatsApp, com o local e o tamanho de cada desenho.</p></div>
    <div class="pv-zap"><div class="pv-zap-topo"><b>Seu Estúdio</b><small>WhatsApp</small></div>
      <div class="pv-zap-msg"><img src="${u}" alt="Montagem enviada pelo provador"><p>${esc(texto).replace(/\n/g, "<br>")}</p><time>${hora}</time></div></div>
    <div class="pv-rec-acoes">${C.cta ? `<a class="pv-btn" href="${esc(C.cta.url)}" target="_blank" rel="noopener">${esc(C.cta.texto)}</a>` : ""}<button type="button" class="pv-btn pv-vazado" id="b-refaz">Montar de novo</button></div>`;
  recebe.hidden = false;
  $("#b-refaz").addEventListener("click", () => {
    recebe.hidden = true;
    if (VITRINE) parent.postMessage({ manequim: 1, rolar: { t: 0, b: 400 } }, "*"); else $("#provador").scrollIntoView({ behavior: "smooth" });
  });
  setTimeout(() => {
    const r = recebe.getBoundingClientRect();
    if (VITRINE) parent.postMessage({ manequim: 1, rolar: { t: r.top + scrollY - 20, b: r.bottom + scrollY } }, "*");
    else recebe.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 120);
}
bPede.addEventListener("click", async () => {
  const blob = await montagem(), texto = textoPedido();
  if (DEMO) return mostraRecebido(blob, texto);
  const arq = new File([blob], arquivo(), { type: "image/png" });
  if (navigator.canShare && navigator.canShare({ files: [arq] })) {
    try { await navigator.share({ files: [arq], text: texto }); return; } catch (e) { if (e.name === "AbortError") return; }
  }
  baixa(blob);
  try { await navigator.clipboard.writeText(texto); } catch (e) {}
  window.open(C.modo === "dm" ? C.instagram : `https://wa.me/${C.whatsapp}`, "_blank", "noopener");
  avisa(`A imagem foi salva e o pedido copiado. Na conversa com ${C.nome}, cole o texto e anexe a imagem.`);
});

/* ---------- depuração: ?zonas pinta cada região ---------- */
function pintaZonas(geo, nome) {
  const ant = corpoAtual; corpoAtual = nome;
  const pos = geo.attributes.position, nor = geo.attributes.normal, cor = new Float32Array(pos.count * 3), mapa = {};
  const p = new THREE.Vector3(), n = new THREE.Vector3(), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i); n.fromBufferAttribute(nor, i);
    const z = onde(p, n);
    if (!(z in mapa)) { const k = Object.keys(mapa).length; mapa[z] = new THREE.Color().setHSL((k * .618) % 1, .65, k % 2 ? .45 : .62); }
    c.copy(mapa[z]); cor[i * 3] = c.r; cor[i * 3 + 1] = c.g; cor[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(cor, 3));
  window.__zonas = Object.keys(mapa);
  corpoAtual = ant;
}
window.__provador = { angTela: (i) => { const q = pecas[i], a = naTela(q.p), b = naTela(q.p.clone().addScaledVector(eixos(q).Y, .04)); return Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI; }, pecas, camera, controles, onde: (x, y, z, nx, ny, nz) => onde(new THREE.Vector3(x, y, z), new THREE.Vector3(nx, ny, nz)), poe: (i, x, y) => poe(VIS[i], tocaCorpo(x, y) || centroDaTela()), montagem, mostraVista,
  // auditoria (tools/auditoria.js): fotografa cada desenho de vários ângulos
  renderer, cena, luzes, FL: () => FL, poeF: (f, p) => poe(f, p), tira, escolhe, trocaCorpo, pontoTravado, centroDaTela, distanciaInteira, mostraParte };

/* ---------- início ---------- */
palco.classList.add("vazio");
if (TOQUE) $(".pv-sob").textContent = "Toque num desenho para pôr no corpo. Deslize para ver todos.";
if (TOQUE) dica.textContent = "Toque num desenho para pôr no corpo";
/* celular: os disponíveis saem da coluna e viram uma bandeja colada embaixo do corpo */
const trilho = $("#trilho"), sobEl = $(".pv-sob"), mq = matchMedia("(max-width: 1080px)");
function arrumaTrilho() {
  if (mq.matches) trilho.append(gaveta, $("#pontos"));
  else sobEl.before(gaveta, $("#pontos"));
}
mq.addEventListener("change", arrumaTrilho); arrumaTrilho();
ajustaTamanho();
requestAnimationFrame(quadro);
fetch(`${DIR}flashes.json?v=${window.PV_V || 1}`).then((r) => r.json()).then((fl) => { FL = fl; VIS = fl.filter((f) => !f.oculto); montaGaveta(); if (Q.get("d")) prova(Q.get("d")); });
/* ---------- desenho pedido de fora: ?d=<id> ou postMessage({manequim:1, provar:<id>}) do site do cliente ---------- */
async function prova(id) {
  const f = FL.find((x) => x.id === id); if (!f) return;
  ativa();
  for (let n = 0; !malha && n < 200; n++) await new Promise((ok) => setTimeout(ok, 50));   // espera o corpo carregar
  poe(f, centroDaTela());
}
addEventListener("message", (e) => { const d = e.data; if (d && d.manequim && typeof d.provar === "string") prova(d.provar); });
/* ---------- começar: até o clique, o corpo é só imagem e a página rola por cima dele ---------- */
let ativo = false;
function ativa() {
  if (ativo) return;
  ativo = true; palco.classList.add("ativo"); pedeQuadro();
}
$("#pv-comecar").addEventListener("click", () => {
  ativa();
  // celular: o palco encaixa na tela (corpo + bandeja de disponíveis), como um app
  if (mq.matches && !VITRINE) scrollTo({ top: palco.getBoundingClientRect().top + scrollY - 8, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
});

/* ---------- celular: "Pedir orçamento" fixo embaixo enquanto a montagem está fora da tela ---------- */
if (!VITRINE) {
  const fixo = document.createElement("div");
  fixo.className = "pv-fixo"; fixo.hidden = true;
  fixo.innerHTML = `<button type="button" class="pv-btn"><svg><use href="#zap"/></svg><span>Pedir orçamento</span><b></b></button>`;
  document.body.append(fixo);
  const mont = $(".pv-mont"), conta = $("b", fixo);
  let montVisivel = false;
  const mostra = () => { fixo.hidden = !(mq.matches && ativo && pecas.length && !montVisivel); $("span", fixo).textContent = $("span", bPede).textContent; conta.textContent = unicas().length > 1 ? `${unicas().length} desenhos` : ""; };
  new IntersectionObserver(([e]) => { montVisivel = e.isIntersecting; mostra(); }).observe(mont);
  $("button", fixo).addEventListener("click", () => bPede.click());
  new MutationObserver(mostra).observe(lista, { childList: true });
  mq.addEventListener("change", mostra);
}

trocaCorpo("feminino", true).catch((e) => { console.error(e); semTresD(); });
carregaCorpo("masculino");   // já deixa o outro pronto
