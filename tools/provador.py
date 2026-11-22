"""Prepara os disponiveis do provador 3D de um cliente: cada folha vira mascara de tinta (alfa pelo escuro do traco).
Folha colorida ("colorido": true) guarda as cores, e o papel branco vira transparente.

Uso (da raiz do repo): python tools/provador.py <slug>
Le clientes/<slug>.json -> provador.flashes [{id, nome, img, colorido?}] e grava em clientes/<slug>/provador/:
<id>.webp (ate 900 px), <id>-p.webp (miniatura) e flashes.json (com a proporcao "r" = altura / largura).
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np
from PIL import Image
from scipy import ndimage

ESCURO, CLARO = 40, 246   # lum <= ESCURO: tinta cheia; >= CLARO: papel


def alfa(rgb, colorido):
    a = np.asarray(rgb, dtype=np.float32)
    lum = a @ np.array([.299, .587, .114], dtype=np.float32)
    al = np.clip((CLARO - lum) / (CLARO - ESCURO), 0, 1)
    if colorido:   # cor saturada tambem e tinta, mesmo clara (amarelo)
        sat = a.max(2) - a.min(2)
        al = np.maximum(al, np.clip((sat - 18) / 50, 0, 1))
    al[al < .05] = 0
    return al


def tira_marca(al):
    """A marca EXEMPLO (e qualquer assinatura) fica sozinha num canto de baixo: some."""
    h, w = al.shape
    lab, n = ndimage.label(al > .12, structure=np.ones((3, 3)))
    for k, sl in enumerate(ndimage.find_objects(lab), 1):
        y0, x0, x1 = sl[0].start / h, sl[1].start / w, sl[1].stop / w
        if y0 > .86 and (x0 > .55 or x1 < .45):
            al[sl][lab[sl] == k] = 0
    return al


def recorta(al, folga=.03):
    ys, xs = np.nonzero(al > .15)
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    p = int(max(y1 - y0, x1 - x0) * folga)
    return y0 - p, y1 + p + 1, x0 - p, x1 + p + 1


def main(slug):
    c = json.load(open(f"clientes/{slug}.json", encoding="utf8"))
    out = f"clientes/{slug}/provador"
    os.makedirs(out, exist_ok=True)
    lista = []
    pv = c["provador"]
    lado = int(pv.get("resolucao", 900))       # lado maior da tinta (folha com muito detalhe: 1200)
    for f in pv["flashes"]:
        src = Image.open(f["img"]).convert("RGB")
        col = bool(f.get("colorido"))
        M = 60   # margem de papel em volta, para a folga do recorte nunca passar da borda
        escura = f.get("fundo", pv.get("fundo")) == "escuro"
        if escura:   # arte sobre fundo escuro (ex.: Samtto): ver tools/folha_escura.py
            from folha_escura import folha_escura
            cor0, al0 = folha_escura(src)
            al = np.pad(al0, M)
            rgb = np.pad(cor0, ((M, M), (M, M), (0, 0)), constant_values=255)
        else:
            al = np.pad(tira_marca(alfa(src, col)), M)
            rgb = np.pad(np.asarray(src), ((M, M), (M, M), (0, 0)), constant_values=255)
        y0, y1, x0, x1 = recorta(al)
        al, rgb = al[y0:y1, x0:x1], rgb[y0:y1, x0:x1]
        if escura:
            cor = rgb if col else np.zeros_like(rgb)
        elif col:
            # cor sem o branco do papel misturado na borda (desfaz a mistura com o branco)
            a3 = np.clip(al, .2, 1)[..., None]
            cor = np.clip((rgb.astype(np.float32) - 255 * (1 - a3)) / a3, 0, 255).astype(np.uint8)
        else:
            cor = np.zeros_like(rgb)
        im = Image.fromarray(np.dstack([cor, (al * 255).astype(np.uint8)]), "RGBA")
        im.thumbnail((lado, lado), Image.LANCZOS)
        im.save(f"{out}/{f['id']}.webp", quality=90, method=6)
        pq = im.copy(); pq.thumbnail((240, 240), Image.LANCZOS)
        pq.save(f"{out}/{f['id']}-p.webp", quality=86, method=6)
        item = {"id": f["id"], "nome": f["nome"], "r": round(im.height / im.width, 4)}
        if col:
            item["colorido"] = True
        lista.append(item)
        print(f["id"], im.size, "colorido" if col else "")
    json.dump(lista, open(f"{out}/flashes.json", "w", encoding="utf8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main(sys.argv[1])
