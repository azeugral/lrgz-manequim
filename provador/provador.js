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
const GIRO_SENTIDO = 1;
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

const pele = new THREE.MeshStandardMaterial({ color: 0xe9e3da, roughness: .6, metalness: 0, vertexColors: DEBUG });
const controles = new OrbitControls(camera, renderer.domElement);
Object.assign(controles, { enableDamping: true, dampingFactor: .09, rotateSpeed: .75, zoomSpeed: .9, screenSpacePanning: true, minDistance: .38, minPolarAngle: .28, maxPolarAngle: 2.75, zoomToCursor: true });
controles.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };

/* ---------- corpos ---------- */
const corpos = {}; let corpoAtual = "feminino", malha = null, corpoInfo = null;
const carregador = new GLTFLoader();
function prepara(geo) {
  if (!geo.index) geo = mergeVertices(geo);
  geo.computeBoundingBox();
  const s = ALTURA / geo.boundingBox.max.y;
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
    const info = prepara(geo);
    const m = new THREE.Mesh(info.geo, pele);
    if (DEBUG) pintaZonas(info.geo, nome);
    ok({ malha: m, ...info });
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
  vai(VISTAS[v], ALVO, distanciaInteira(), rapido);
}
$$(".pv-vistas button").forEach((b) => b.addEventListener("click", () => mostraVista(b.dataset.vista)));
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
controles.addEventListener("start", () => $$(".pv-vistas button").forEach((b) => b.setAttribute("aria-pressed", "false")));
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
    im.onerror = erro; im.src = `${DIR}${id}.webp`;
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
let FL = [];
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
function eixos(q) {
  const r = orientacao(q);
  return { X: new THREE.Vector3(1, 0, 0).applyQuaternion(r), Y: new THREE.Vector3(0, 1, 0).applyQuaternion(r) };
}
function local(v, q, E, out) {
  const dx = v.x - q.p.x, dy = v.y - q.p.y, dz = v.z - q.p.z, n = q.n;
  const h = dx * n.x + dy * n.y + dz * n.z, tx = dx - h * n.x, ty = dy - h * n.y, tz = dz - h * n.z;
  const lt = Math.hypot(tx, ty, tz), ld = Math.hypot(dx, dy, dz), k = lt > 1e-6 ? ld / lt : 1;
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
  for (const t of fila) {
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
  q.malha.renderOrder = 2 + pecas.indexOf(q);
  cena.add(q.malha);
  const orig = q.cor === "original";
  if (q.mat.map !== (orig ? q.texCor : q.tex)) { q.mat.map = orig ? q.texCor : q.tex; q.mat.needsUpdate = true; }
  q.mat.color.set(orig ? "#ffffff" : q.cor === "base" ? TINTA : CORES[q.cor]);
  q.zona = onde(q.p, q.n);
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
  if (!q) { localEl.hidden = true; dica.hidden = false; dica.textContent = pecas.length ? "Toque numa peça para ajustar" : "Arraste um desenho até a pele"; ajuste.setAttribute("aria-disabled", "true"); $("#aj-nome").textContent = pecas.length ? "Toque numa peça no corpo" : "Ponha um desenho no corpo"; return; }
  ajuste.setAttribute("aria-disabled", "false");
  $("#aj-nome").textContent = q.nome;
  rTam.value = q.cm; oTam.textContent = `${q.cm} cm`;
  rGiro.value = Math.round(q.giro); oGiro.textContent = `${Math.round(q.giro)}°`;
  $$("#pv-cores button").forEach((b) => { b.setAttribute("aria-pressed", b.dataset.cor === q.cor); if (b.dataset.cor === "original") b.hidden = !q.colorido; });
  localEl.hidden = false; dica.hidden = true;
  localEl.innerHTML = `<b>${esc(q.nome)}</b> · ${q.zona} · ~${q.cm} cm · ${Math.round(q.giro)}°${TOQUE ? "<small>Pinça muda o tamanho · gire os dois dedos para girar</small>" : ""}`;
}
function escolhe(i) {
  atual = i; mostraSel();
  palco.classList.toggle("sel", i >= 0);
  $$("li", lista).forEach((li) => li.classList.toggle("ativo", +li.dataset.i === i));
}
async function poe(f, p) {
  if (!malha) return;
  const t = await textura(f.id);
  const tex = new THREE.CanvasTexture(t.canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  let texCor = null;
  if (f.colorido) { texCor = new THREE.CanvasTexture(t.cor); texCor.colorSpace = THREE.SRGBColorSpace; texCor.anisotropy = 8; }
  const cor0 = f.colorido ? "original" : "base";
  ativa();
  const mat = new THREE.MeshStandardMaterial({ map: tex, color: "#ffffff", transparent: true, opacity: .94, roughness: .5, metalness: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
  const q = { id: f.id, nome: f.nome, r: f.r, colorido: !!f.colorido, cm: 12, giro: 0, flip: false, cor: cor0, p: p.clone(), n: null, tex, texCor, mat };
  q.n = normalEm(q.p, .05);
  pecas.push(q);
  desenha(q); escolhe(pecas.length - 1); atualizaLista();
  palco.classList.remove("vazio");
}
function tira(i) {
  const q = pecas[i]; if (!q) return;
  cena.remove(q.malha); q.malha.geometry.dispose(); q.mat.dispose(); q.tex.dispose(); if (q.texCor) q.texCor.dispose();
  pecas.splice(i, 1);
  escolhe(Math.min(i, pecas.length - 1)); atualizaLista();
  if (!pecas.length) { palco.classList.add("vazio"); dica.hidden = false; }
  pedeQuadro();
}
function atualizaLista() {
  bPede.disabled = bSalva.disabled = !pecas.length;
  if (!pecas.length) { lista.innerHTML = '<li class="pv-vazio">Nenhum desenho no corpo ainda.</li>'; return; }
  // cartões iguais, centrados: miniatura no papel, nome, local e tamanho
  lista.innerHTML = pecas.map((q, i) => `<li data-i="${i}" class="${i === atual ? "ativo" : ""}" tabindex="0"><b class="pv-ico">${q.cor === "original" ? `<img src="${DIR}${q.id}-p.webp" alt="">` : `<i style="--m:url(${DIR}${q.id}-p.webp);background:${q.cor === "base" ? TINTA : CORES[q.cor]}"></i>`}</b>
    <span>${esc(q.nome)}</span><small>${q.zona}</small><small>~${q.cm} cm</small></li>`).join("");
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
const redesenha = (q) => { if (agendado) return; agendado = requestAnimationFrame(() => { agendado = null; desenha(q); }); };
rTam.addEventListener("input", () => { const q = pecas[atual]; if (!q) return; q.cm = +rTam.value; redesenha(q); });
rTam.addEventListener("change", atualizaLista);
rGiro.addEventListener("input", () => { const q = pecas[atual]; if (!q) return; q.giro = +rGiro.value; redesenha(q); });
$$("#pv-cores button").forEach((b) => b.addEventListener("click", () => { const q = pecas[atual]; if (!q) return; q.cor = b.dataset.cor; desenha(q); atualizaLista(); }));
$("#b-espelha").addEventListener("click", () => { const q = pecas[atual]; if (!q) return; q.flip = !q.flip; desenha(q); });
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
  gaveta.innerHTML = FL.map((f, i) => `<li><button type="button" data-i="${i}" aria-label="Pôr no corpo: ${esc(f.nome)}" title="${esc(f.nome)}">${f.colorido ? `<img src="${DIR}${f.id}-p.webp" alt="" draggable="false">` : `<i style="--m:url(${DIR}${f.id}-p.webp)"></i>`}<em>${String(i + 1).padStart(2, "0")}</em></button><span>${esc(f.nome)}</span></li>`).join("");
  $$("button", gaveta).forEach((b) => {
    const f = FL[+b.dataset.i];
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
        fant = document.createElement("div"); fant.className = "pv-fantasma" + (f.colorido ? " cor" : ""); fant.style.setProperty("--m", `url(${DIR}${f.id}-p.webp)`);
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
  const pontos = $("#pontos"), pags = Math.ceil(FL.length / 3);
  pontos.innerHTML = Array.from({ length: pags }, (_, k) => `<i data-k="${k}"></i>`).join("");
  const marca = () => { const k = Math.round(gaveta.scrollLeft / Math.max(1, gaveta.clientWidth)); $$("i", pontos).forEach((p, n) => p.classList.toggle("ativo", n === k)); };
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
      gesto = { tipo: "pinca", q, d0: Math.max(m.d, 1), a0: m.a, cm0: q.cm, g0: q.giro };
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
    const m = par(), q = gesto.q;
    q.cm = THREE.MathUtils.clamp(Math.round(gesto.cm0 * m.d / gesto.d0), 4, 45);
    q.giro = angulo(gesto.g0 - THREE.MathUtils.radToDeg(m.a - gesto.a0) * GIRO_SENTIDO);
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
  if (gesto && gesto.tipo === "gira" && Math.hypot(e.clientX - gesto.x, e.clientY - gesto.y) < 5 && e.type === "pointerup" && atual >= 0) escolhe(-1);
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
  if (f === "menor") q.cm = Math.max(4, q.cm - 2);
  else if (f === "maior") q.cm = Math.min(45, q.cm + 2);
  else if (f === "gira") q.giro = angulo(q.giro - 15);   // sentido do relógio, como o ícone
  else if (f === "espelha") q.flip = !q.flip;
  else if (f === "tira") return tira(atual);
  else if (f === "ok") return escolhe(-1);
  desenha(q); atualizaLista();
});
tela.addEventListener("wheel", (e) => {
  const q = pecas[atual];
  if (q && acerta(tocaCorpo(e.clientX, e.clientY)) === atual) {   // em cima da peça escolhida: tamanho (Shift: giro)
    e.preventDefault(); e.stopImmediatePropagation();
    if (e.shiftKey) q.giro = (((q.giro + (e.deltaY || e.deltaX) * .15) + 540) % 360) - 180;
    else q.cm = THREE.MathUtils.clamp(Math.round(q.cm * Math.exp(-e.deltaY * .0015) + (e.deltaY < 0 ? .5 : -.5)), 4, 45);
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
  if (malha) cena.remove(malha);
  malha = info.malha; corpoInfo = info; cena.add(malha);
  palco.classList.remove("carregando"); carregando.hidden = true;
  for (const q of pecas) {
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
  o.fillText(pecas.map((q) => q.zona).filter((z, i, a) => a.indexOf(z) === i).join(" · ").slice(0, 70), W - 28, H + rodape / 2);
  return new Promise((ok) => out.toBlob(ok, "image/png"));
}
function textoPedido() {
  const l = pecas.map((q, i) => `${i + 1}. ${q.nome}\n   ${q.zona} · ~${q.cm} cm`);
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
window.__provador = { pecas, camera, controles, onde: (x, y, z, nx, ny, nz) => onde(new THREE.Vector3(x, y, z), new THREE.Vector3(nx, ny, nz)), poe: (i, x, y) => poe(FL[i], tocaCorpo(x, y) || centroDaTela()), montagem, mostraVista };

/* ---------- início ---------- */
palco.classList.add("vazio");
if (TOQUE) $(".pv-sob").textContent = "Toque num desenho para pôr no corpo. Deslize para ver todos.";
ajustaTamanho();
requestAnimationFrame(quadro);
fetch(`${DIR}flashes.json?v=${window.PV_V || 1}`).then((r) => r.json()).then((fl) => { FL = fl; montaGaveta(); });
/* ---------- começar: até o clique, o corpo é só imagem e a página rola por cima dele ---------- */
let ativo = false;
function ativa() {
  if (ativo) return;
  ativo = true; palco.classList.add("ativo"); pedeQuadro();
}
$("#pv-comecar").addEventListener("click", ativa);

trocaCorpo("feminino", true).catch((e) => { console.error(e); semTresD(); });
carregaCorpo("masculino");   // já deixa o outro pronto
