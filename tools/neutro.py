"""Prepara o manequim neutro (v5): máscara com rembg e fundo sem emenda.
Entrada: src/neutro/n2.png (render do Figma, frente | costas). Saída: src/N.png e src/N_mask.png.
Rodar de tools/: python neutro.py
"""
import cv2
import numpy as np
from rembg import new_session, remove

img = cv2.imread("src/neutro/n2.png")
rgba = remove(cv2.cvtColor(img, cv2.COLOR_BGR2RGB), session=new_session("isnet-general-use"))
alfa = np.array(rgba)[..., 3]
mask = (alfa > 128).astype(np.uint8) * 255
cv2.imwrite("src/N_mask.png", mask)

# o render veio com as duas metades em tons de fundo um pouco diferentes (emenda em x=512):
# estima o fundo de cada metade e puxa as duas para o fundo médio, sem tocar no formato do corpo
f = img.astype(np.float32)
bg = (cv2.dilate(mask, np.ones((25, 25), np.uint8)) == 0).astype(np.float32)
def borrado(a, w, s=60):
    num = cv2.GaussianBlur(a * w[..., None], (0, 0), s)
    den = cv2.GaussianBlur(w, (0, 0), s)[..., None]
    return num / np.maximum(den, 1e-4)
alvo = borrado(f, bg)
h, w = mask.shape
saida = f.copy()
for x0, x1 in ((0, w // 2), (w // 2, w)):
    wm = np.zeros_like(bg); wm[:, x0:x1] = bg[:, x0:x1]
    est = borrado(f, wm)
    saida[:, x0:x1] += (alvo - est)[:, x0:x1]
cv2.imwrite("src/N.png", np.clip(saida, 0, 255).astype(np.uint8))
g = saida.mean(2)
print("emenda depois:", [round(float(g[y, 505]) - float(g[y, 518]), 1) for y in (20, 300, 600, 900, 1000)])
