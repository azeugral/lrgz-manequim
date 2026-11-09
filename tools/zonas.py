"""Gera as zonas clicaveis e os corpos recortados do LRGZ Manequim.

Cada zona nasce de um poligono grosseiro, cortado pela silhueta real do corpo.
A = lado esquerdo da imagem, B = lado direito, nas duas vistas.
Rodar de tools/: python zonas.py
"""
import json
import cv2
import numpy as np

ESC = 2                # corpo publicado em 2048 px
LADOS = "AB"


def silhueta(img):
    bg = np.median(img[:40, :40].reshape(-1, 3), axis=0)
    d = np.abs(img.astype(int) - bg).sum(2).astype(np.uint8)
    m = (d > 16).astype(np.uint8) * 255
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    out = np.zeros_like(m)
    for c in cs:
        if cv2.contourArea(c) > 4000:
            cv2.drawContours(out, [c], -1, 255, -1)
    return out


def preenche(pts, forma):
    m = np.zeros(forma, np.uint8)
    cv2.fillPoly(m, [np.array(pts, np.int32)], 255)
    return m


def maior(m):
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    if n < 2:
        return m
    i = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
    return ((lab == i) * 255).astype(np.uint8)


def caminho(m):
    cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    ds = []
    for c in cs:
        if cv2.contourArea(c) < 25:
            continue
        a = cv2.approxPolyDP(c, 0.9, True).reshape(-1, 2) * ESC
        ds.append("M" + "L".join(f"{x},{y}" for x, y in a) + "Z")
    return "".join(ds)


def lado_da_linha(m, p, q, fora):
    """Divide a mascara pela linha p-q; `fora` e um ponto do lado externo."""
    h, w = m.shape
    yy, xx = np.mgrid[0:h, 0:w]
    s = (q[0] - p[0]) * (yy - p[1]) - (q[1] - p[1]) * (xx - p[0])
    sf = (q[0] - p[0]) * (fora[1] - p[1]) - (q[1] - p[1]) * (fora[0] - p[0])
    ext = (s * sf) > 0
    e = m.copy(); e[~ext] = 0
    i = m.copy(); i[ext] = 0
    return i, e


def meio(a, b):
    return ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)


# medidas de cada corpo, lidas na grade (imagem 1024)
C = {
    "F": dict(eixo=250, desl=512, abW=44, vao=168,
              c1=((124, 246), (182, 231)), c2=((86, 348), (146, 312)), c3=((44, 440), (100, 458)),
              ombro=[(212, 150), (135, 150), (112, 246), (124, 246), (182, 231), (200, 212)],
              peitoFim=290, lat=(190, 345), quad=[(135, 345), (128, 442), (250, 496)],
              tronco=(150, 400), costas=(262, 335, 400), quadB=(400, 513),
              coxa=(642, 124), joelho=704, canela=880, tornozelo=905, pe=985),
    "M": dict(eixo=266, desl=494, abW=58, vao=176,
              c1=((112, 252), (173, 247)), c2=((68, 362), (149, 342)), c3=((38, 450), (100, 463)),
              ombro=[(228, 150), (125, 150), (98, 252), (112, 252), (173, 247), (190, 205)],
              peitoFim=282, lat=(186, 352), quad=[(150, 345), (150, 468), (266, 512)],
              tronco=(150, 405), costas=(268, 338, 405), quadB=(405, 535),
              coxa=(640, 128), joelho=702, canela=878, tornozelo=902, pe=985),
}


def zonas_esquerda(g, v):
    """Poligonos do lado A na vista v; retorna dict chave -> pontos + cortes de membro."""
    k = C[g]
    e, ab = k["eixo"], k["abW"]
    c1, c2, c3 = k["c1"], k["c2"], k["c3"]
    z = {}
    z["sh"] = k["ombro"]
    z["arm"] = [c1[0], c1[1], (c2[1][0] + 18, (c1[1][1] + c2[1][1]) // 2 - 6), c2[1], c2[0]]
    z["fore"] = [c2[0], c2[1], c3[1], c3[0]]
    z["hand"] = [c3[0], c3[1], (112, 470), (112, 585), (0, 585), (0, 440)]
    pf = k["peitoFim"]
    if v == "f":
        z["chest"] = [(e, 160), (205, 158), k["ombro"][-1], k["ombro"][4], (e - ab, pf), (e, pf)]
        z["rib"] = [k["ombro"][4], (e - ab, pf), (e - ab, k["lat"][1]), (k["vao"], k["lat"][1]), (k["vao"], 236)]
        y0 = pf
        t = (k["tronco"][1] - pf) / 3
        for i in (1, 2, 3):
            a, b = int(y0 + t * (i - 1)), int(y0 + t * i)
            z[f"abd.{i}"] = [(e - ab, a), (e, a), (e, b), (e - ab, b)]
        q = k["quad"]
        z["hip"] = [(e - ab, k["lat"][1]), q[0], q[1], q[2], (e, k["tronco"][1]), (e - ab, k["tronco"][1])]
        y_coxa_ini = q[1], q[2]
    else:
        ca, cm, cl = k["costas"]
        t0 = k["tronco"][0]
        topo = [(e, t0), (205 if g == "F" else 228, t0), k["ombro"][-1], k["ombro"][4]]
        z["back.1"] = topo + [(k["vao"], ca), (e, ca)]
        z["back.2"] = [(k["vao"], ca), (e, ca), (e, cm), (k["vao"], cm)]
        z["back.3"] = [(150, cm), (e, cm), (e, cl), (150, cl)]
        a, b = k["quadB"]
        z["hip"] = [(120, a), (e, a), (e, b), (120, b)]
        y_coxa_ini = (120, b), (e, b)
    cf, xo = k["coxa"]
    z["thigh"] = [y_coxa_ini[0], y_coxa_ini[1], (e, cf), (xo, cf)]
    z["knee"] = [(xo, cf), (e, cf), (e, k["joelho"]), (xo, k["joelho"])]
    z["shin"] = [(xo - 20, k["joelho"]), (e, k["joelho"]), (e, k["canela"]), (xo - 20, k["canela"])]
    z["ankle"] = [(xo - 20, k["canela"]), (e, k["canela"]), (e, k["tornozelo"]), (xo - 20, k["tornozelo"])]
    z["foot"] = [(xo - 40, k["tornozelo"]), (e, k["tornozelo"]), (e, k["pe"]), (xo - 40, k["pe"])]
    return z


def membros(g):
    """Eixo longitudinal de cada membro (lado A, vista frente), para interno/externo."""
    k = C[g]
    e = k["eixo"]
    c1, c2, c3 = k["c1"], k["c2"], k["c3"]
    return {
        "arm": (meio(*c1), meio(*c2), c1[0]),
        "fore": (meio(*c2), meio(*c3), c3[0]),
        "hand": ((meio(*c3)), (70, 560), (0, 500)),
        "thigh": ((e - 62, 500), (e - 62, k["coxa"][0]), (0, 580)),
        "knee": ((e - 62, k["coxa"][0]), (e - 62, k["joelho"]), (0, 670)),
        "shin": ((e - 66, k["joelho"]), (e - 66, k["canela"]), (0, 780)),
        "foot": ((e - 75, k["tornozelo"]), (e - 75, k["pe"]), (0, 940)),
    }


def main():
    saida = {}
    prova = []
    for g in "FM":
        img = cv2.imread(f"src/{g}.png")
        h, w = img.shape[:2]
        sil = silhueta(img)
        k = C[g]
        meta_x = (k["eixo"] + k["eixo"] + k["desl"]) // 2
        Z = {"f": {}, "b": {}}
        cor = img.copy()
        for v in "fb":
            dx = 0 if v == "f" else k["desl"]
            eixo = k["eixo"] + dx
            base = zonas_esquerda(g, v)
            mem = membros(g)
            for nome, pts in base.items():
                esq = [(x + dx, y) for x, y in pts]
                dir_ = [(2 * eixo - x, y) for x, y in esq]
                for lado, ps in (("A", esq), ("B", dir_)):
                    m = preenche(ps, (h, w))
                    janela = np.zeros((h, w), np.uint8)
                    if v == "f":
                        janela[:, :meta_x] = 255
                    else:
                        janela[:, meta_x:] = 255
                    m = cv2.bitwise_and(cv2.bitwise_and(m, sil), janela)
                    m = maior(m)
                    parts = nome.split(".")
                    chave = parts[0] + "." + lado + ("." + parts[1] if len(parts) > 1 else "")
                    if parts[0] in ("abd", "back"):
                        chave = f"{parts[0]}.{parts[1]}.{lado}"
                    Z[v][chave] = caminho(m)
                    if nome in mem:
                        p, q, fora = mem[nome]
                        tr = (lambda t: (t[0] + dx, t[1])) if lado == "A" else (lambda t: (2 * eixo - t[0] - dx, t[1]))
                        i, ex = lado_da_linha(m, tr(p), tr(q), tr(fora))
                        Z[v][chave + ".in"] = caminho(maior(i))
                        Z[v][chave + ".out"] = caminho(maior(ex))
                    if nome == "sh":
                        # ombro lateral: faixa externa do deltoide
                        x_lim = k["c1"][0][0] + 34 + dx if lado == "A" else 2 * eixo - (k["c1"][0][0] + 34 + dx)
                        ex = m.copy()
                        if lado == "A":
                            ex[:, x_lim:] = 0
                        else:
                            ex[:, :x_lim] = 0
                        Z[v][chave + ".out"] = caminho(maior(ex))
                    if nome == "chest":
                        x = eixo - 48 if lado == "A" else eixo + 48
                        ii, ee = m.copy(), m.copy()
                        if lado == "A":
                            ii[:, :x] = 0; ee[:, x:] = 0
                        else:
                            ii[:, x:] = 0; ee[:, :x] = 0
                        Z[v][chave + ".in"] = caminho(maior(ii))
                        Z[v][chave + ".out"] = caminho(maior(ee))
                    if nome == "rib":
                        x = eixo - k["abW"] - 22 if lado == "A" else eixo + k["abW"] + 22
                        fr, la = m.copy(), m.copy()
                        if lado == "A":
                            fr[:, :x] = 0; la[:, x:] = 0
                        else:
                            fr[:, x:] = 0; la[:, :x] = 0
                        Z[v][chave + ".fr"] = caminho(maior(fr))
                        Z[v][chave + ".lat"] = caminho(maior(la))
                    tint = np.zeros(3, np.uint8)
                    tint[:] = np.random.randint(40, 255, 3)
                    cor[m > 0] = cor[m > 0] // 2 + tint // 2
        # caixas de enquadramento por vista
        ys, xs = np.where(sil[:, :meta_x] > 0)
        bf = [int(xs.min()) * ESC, int(ys.min()) * ESC, int(xs.max()) * ESC, int(ys.max()) * ESC]
        ys, xs = np.where(sil[:, meta_x:] > 0)
        bb = [int(xs.min() + meta_x) * ESC, int(ys.min()) * ESC, int(xs.max() + meta_x) * ESC, int(ys.max()) * ESC]
        saida[g] = {"W": w * ESC, "H": h * ESC, "box": {"f": bf, "b": bb}, "z": Z}
        cv2.imwrite(f"prova{g}.jpg", cor)

        # corpo recortado: fundo transparente, para o palco herdar a cor do cliente
        grande = cv2.resize(img, (w * ESC, h * ESC), interpolation=cv2.INTER_LANCZOS4)
        borrao = cv2.GaussianBlur(grande, (0, 0), 1.4)
        grande = cv2.addWeighted(grande, 1.35, borrao, -0.35, 0)
        alfa = cv2.resize(sil, (w * ESC, h * ESC), interpolation=cv2.INTER_CUBIC)
        alfa = cv2.GaussianBlur(alfa, (0, 0), 4.5)   # alisa o serrilhado da mascara
        alfa = np.clip((alfa.astype(np.float32) - 135) / 40, 0, 1)
        alfa = (alfa * 255).astype(np.uint8)
        rgba = np.dstack([grande, alfa])
        cv2.imwrite(f"../assets/{g}.webp", rgba, [cv2.IMWRITE_WEBP_QUALITY, 88])
    json.dump(saida, open("../assets/zonas.json", "w"), separators=(",", ":"))
    print({g: {v: len(saida[g]["z"][v]) for v in "fb"} for g in saida})


if __name__ == "__main__":
    main()
