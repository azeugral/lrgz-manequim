"""Recorte do manequim (v6): alfa fino na borda + cor limpa, para pôr sobre qualquer palco.
Entrada: src/N.png (fundo sem emenda) e src/N_mask.png (rembg). Saída: src/N_rgba.png (2048², RGBA)
com sombra de contato sob os pés. zonas.py exporta assets/N.webp a partir dele.

Como: o fundo do render é liso, então ele é estimado por fora do corpo (B) e a cor do corpo
perto da borda por dentro (F). Na faixa da borda, alfa = projeção de (I - B) em (F - B):
matte por diferença de fundo, sem o serrilhado da máscara binária. Onde F e B se parecem
(contraste baixo) vale o alfa suave do rembg. A cor da borda é descontaminada do cinza do fundo.
Rodar de tools/: python recorte.py
"""
import cv2
import numpy as np
from rembg import new_session, remove

ESC = 2
src = cv2.imread("src/N.png").astype(np.float32)
h, w = src.shape[:2]
H, W = h * ESC, w * ESC
I = cv2.resize(src, (W, H), interpolation=cv2.INTER_LANCZOS4)

# máscara binária do rembg (já validada nas zonas) e alfa suave dele, ampliados
m1 = cv2.imread("src/N_mask.png", 0)
suave = np.array(remove(cv2.cvtColor(src.astype(np.uint8), cv2.COLOR_BGR2RGB),
                        session=new_session("isnet-general-use")))[..., 3].astype(np.float32) / 255
suave = cv2.resize(suave, (W, H), interpolation=cv2.INTER_CUBIC).clip(0, 1)
M = (cv2.resize(m1, (W, H), interpolation=cv2.INTER_LINEAR) > 127).astype(np.uint8)

k = lambda r: cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))
dentro = cv2.erode(M, k(5))
fora = 1 - cv2.dilate(M, k(7))
faixa = (1 - dentro) * (1 - fora)


def preenche(img, peso, s):
    num = cv2.GaussianBlur(img * peso[..., None], (0, 0), s)
    den = cv2.GaussianBlur(peso, (0, 0), s)[..., None]
    return num / np.maximum(den, 1e-5)


B = preenche(I, fora.astype(np.float32), 24)            # fundo liso visto atrás da borda
anel = (dentro - cv2.erode(dentro, k(6))).astype(np.float32)   # pele logo para dentro da borda
F = preenche(I, anel, 5)                                # cor do corpo carregada até a borda

d = F - B
n2 = (d * d).sum(2)
a = ((I - B) * d).sum(2) / np.maximum(n2, 1e-3)
contraste = np.sqrt(n2)
confia = np.clip((contraste - 12) / 18, 0, 1)            # contraste baixo: usa o rembg
a = a.clip(0, 1) * confia + suave * (1 - confia)
alfa = np.where(dentro > 0, 1.0, np.where(fora > 0, 0.0, a)).astype(np.float32)
# limpa poeira solta fora do corpo e furos dentro
alfa[(alfa < 0.04)] = 0
alfa = cv2.GaussianBlur(alfa, (0, 0), 0.6) * faixa + alfa * (1 - faixa)
alfa = alfa.clip(0, 1)

# cor sem o cinza do fundo: I = a F + (1-a) B  →  F = (I - (1-a) B) / a
limpa = (I - (1 - alfa[..., None]) * B) / np.maximum(alfa[..., None], 1e-3)
mistura = np.clip((alfa - 0.15) / 0.5, 0, 1)[..., None]   # borda muito fina: cor estimada de dentro
cor = np.where(faixa[..., None] > 0, limpa * mistura + F * (1 - mistura), I)
borrao = cv2.GaussianBlur(cor, (0, 0), 1.3)
cor = cv2.addWeighted(cor, 1.35, borrao, -0.35, 0).clip(0, 255)

# sombra de contato sob os pés de cada vista (preto translúcido, some em fundo escuro, assenta em claro)
sombra = np.zeros((H, W), np.float32)
ys, xs = np.where(M > 0)
for x0, x1 in ((0, W // 2), (W // 2, W)):
    sel = (xs >= x0) & (xs < x1)
    pe = ys[sel].max()
    pes = xs[sel][ys[sel] > pe - 40]
    cx, rx = (pes.min() + pes.max()) / 2, (pes.max() - pes.min()) / 2 + 70
    cv2.ellipse(sombra, (int(cx), int(pe - 6)), (int(rx), 26), 0, 0, 360, 1, -1)
    cv2.ellipse(sombra, (int(cx), int(pe - 4)), (int(rx * .55), 12), 0, 0, 360, 1, -1)
sombra = cv2.GaussianBlur(sombra, (0, 0), 14) * 0.55
sa = sombra * (1 - alfa)
total = alfa + sa
rgb = (cor * alfa[..., None]) / np.maximum(total[..., None], 1e-4)
rgba = np.dstack([rgb, total * 255]).clip(0, 255).astype(np.uint8)
cv2.imwrite("src/N_rgba.png", rgba)

# prova: recorte sobre preto, vermelho e branco, com zoom na borda
prova = []
for fundo in ((12, 10, 10), (0, 0, 200), (240, 240, 240)):
    fb = np.full_like(cor, fundo)
    t = total[..., None]
    prova.append((rgb * t + fb * (1 - t)).astype(np.uint8))
cv2.imwrite("prova_recorte.jpg", np.hstack([p[200:1900, 150:900] for p in prova]))
cv2.imwrite("prova_borda.jpg", np.hstack([cv2.resize(p[700:1000, 180:420], None, fx=2, fy=2, interpolation=cv2.INTER_NEAREST) for p in prova]))
print("faixa px:", int(faixa.sum()), "alfa parcial:", int(((alfa > 0) & (alfa < 1)).sum()), "contraste med:", float(np.median(contraste[faixa > 0])))
