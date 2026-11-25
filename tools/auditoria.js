/* Auditoria do provador: cada desenho, nos dois corpos, fotografado de 8 ângulos em volta + 2 closes.
   Roda dentro da página do provador (servidor tools/auditoria_servidor.py):
     const A = await import("/tools/auditoria.js"); await A.roda();
   Grava as folhas de contato em _auditoria/ (uma linha por caso, 10 quadros por linha). */
const P = window.__provador;
const THREE_V = (x, y, z) => P.camera.position.clone().set(x, y, z);

export const TRAVADOS = ["peitoral-tribal", "tribal-costela", "tribal-quadril", "tribal-coxa", "tribal-perna", "tribal-canela", "tribal-perna-longa", "corpo-inteiro", "pernas-tribais"];
export const LIVRES = ["tribal-monstro", "shh", "perfil-tribal", "capivara", "mapa", "leon"];
export const LOCAIS = ["peito", "costas", "braco", "coxa"];
const ANG = [0, 45, 90, 135, 180, -135, -90, -45];
const TW = 200, TH = 250, CAB = 34, ROT = 22;

const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));
function limpa() { while (P.pecas.length) P.tira(0); }
function ponto(local) {
  if (local === "peito") return P.pontoTravado({ ref: "busto", d: .05, x: .06 }, "e");
  if (local === "costas") return P.pontoTravado({ ref: "busto", d: .02, dir: 180 }, "c");
  if (local === "braco") return P.pontoTravado({ ref: "cotovelo", d: .09, braco: true }, "e");
  if (local === "coxa") return P.pontoTravado({ ref: "joelho", d: .17, perna: true }, "e");
}
async function poe(id, local) {
  limpa();
  const f = P.FL().find((x) => x.id === id); if (!f) return false;
  await P.poeF(f, local ? ponto(local) : P.centroDaTela());
  for (let n = 0; n < 40 && !P.pecas.length; n++) await espera(50);
  if (local === "braco") for (const q of P.pecas) q.cm = 9;
  P.escolhe(-1);
  return P.pecas.length > 0;
}
// quadros: 8 em volta do desenho (0° = de frente para ele) e 2 closes
function quadros() {
  const c = P.camera.position.clone().set(0, 0, 0), n = c.clone();
  P.pecas.forEach((q) => { c.add(q.p); n.add(q.n); }); c.divideScalar(P.pecas.length);
  let ext = 0; P.pecas.forEach((q) => { ext = Math.max(ext, q.p.distanceTo(c) + q.cm / 200); });
  n.y = 0; if (n.lengthSq() < 1e-4) n.set(0, 0, 1); n.normalize();
  const t = Math.tan(P.camera.fov * Math.PI / 360) * (TW / TH), d = Math.min(Math.max(ext * 2.3 / t, .55), P.distanciaInteira());
  const az = Math.atan2(n.x, n.z), em = (a, dist, y = .06) => ({ alvo: c, pos: c.clone().add(THREE_V(Math.sin(az + a * Math.PI / 180) * dist, y * dist, Math.cos(az + a * Math.PI / 180) * dist)), rot: "" });
  const l = ANG.map((a) => ({ ...em(a, d), rot: `${a}°` }));
  l.push({ ...em(0, Math.max(d * .45, .32)), rot: "close" }, { ...em(35, Math.max(d * .5, .34), .25), rot: "close 35°" });
  return l;
}
function linha(o, y, titulo) {
  const r = P.renderer, cam = P.camera;
  o.fillStyle = "#0c0c0d"; o.fillRect(0, y, TW * 10, ROT + TH);
  o.fillStyle = "#f2efe8"; o.font = "600 14px monospace"; o.textBaseline = "middle"; o.fillText(titulo, 8, y + ROT / 2);
  quadros().forEach((v, k) => {
    P.controles.target.copy(v.alvo); cam.position.copy(v.pos); cam.lookAt(v.alvo); P.luzes();
    o.fillStyle = "#2a2622"; o.fillRect(k * TW, y + ROT, TW, TH);
    r.render(P.cena, cam);
    o.drawImage(r.domElement, k * TW, y + ROT, TW, TH);
    o.fillStyle = "rgba(0,0,0,.55)"; o.fillRect(k * TW, y + ROT, 70, 16); o.fillStyle = "#fff"; o.font = "11px monospace"; o.fillText(v.rot, k * TW + 4, y + ROT + 8);
    o.fillStyle = "#555"; o.fillRect(k * TW + TW - 1, y + ROT, 1, TH);
  });
}
async function salva(canvas, nome) {
  const b = await new Promise((ok) => canvas.toBlob(ok, "image/png"));
  await fetch(`/_salva?n=${nome}`, { method: "POST", body: b });
}
export async function roda({ corpos = ["feminino", "masculino"], travados = TRAVADOS, livres = LIVRES, locais = LOCAIS, porFolha = 6, prefixo = "aud" } = {}) {
  const casos = [...travados.map((id) => ({ id })), ...livres.flatMap((id) => locais.map((local) => ({ id, local })))];
  const r = P.renderer, cam = P.camera, tam = r.getSize(cam.position.clone().set(0, 0, 0)), pr = r.getPixelRatio(), asp = cam.aspect;
  const cam0 = { pos: cam.position.clone(), alvo: P.controles.target.clone() }, feitos = [];
  for (const corpo of corpos) {
    await P.trocaCorpo(corpo);
    for (let i = 0; i < casos.length; i += porFolha) {
      const grupo = casos.slice(i, i + porFolha);
      const out = document.createElement("canvas"); out.width = TW * 10; out.height = CAB + grupo.length * (ROT + TH);
      const o = out.getContext("2d");
      o.fillStyle = "#000"; o.fillRect(0, 0, out.width, CAB); o.fillStyle = "#e33"; o.font = "700 16px monospace"; o.textBaseline = "middle";
      o.fillText(`AUDITORIA PROVADOR · ${corpo.toUpperCase()} · folha ${i / porFolha + 1}`, 8, CAB / 2);
      r.setPixelRatio(1); r.setSize(TW, TH, false); cam.aspect = TW / TH; cam.updateProjectionMatrix();
      for (let k = 0; k < grupo.length; k++) {
        const g = grupo[k], ok = await poe(g.id, g.local);
        r.setPixelRatio(1); r.setSize(TW, TH, false); cam.aspect = TW / TH; cam.updateProjectionMatrix();
        if (!ok) { o.fillStyle = "#e33"; o.fillText(`${g.id} NÃO ENTROU`, 8, CAB + k * (ROT + TH) + 40); continue; }
        linha(o, CAB + k * (ROT + TH), `${g.id}${g.local ? " · " + g.local : " · travado"} · ${P.pecas.map((q) => q.zona).filter((z, j, a) => a.indexOf(z) === j).join(", ")}`);
      }
      const nome = `${prefixo}-${corpo[0]}-${String(i / porFolha + 1).padStart(2, "0")}.png`;
      await salva(out, nome); feitos.push(nome);
    }
  }
  limpa();
  r.setPixelRatio(pr); r.setSize(tam.x, tam.y, false); cam.aspect = asp; cam.updateProjectionMatrix();
  P.controles.target.copy(cam0.alvo); cam.position.copy(cam0.pos);
  return feitos;
}
