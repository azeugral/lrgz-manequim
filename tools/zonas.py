"""Zonas clicáveis do LRGZ Manequim (v3: renders 3D em contrapposto, fundo mantido).

Os corpos não são espelhados, então cada lado de cada vista tem as próprias medidas.
A = lado esquerdo da imagem, B = lado direito, C = zona central.
Medidas em pixels da imagem original (1024); a saída é em 2048.
Rodar de tools/: python zonas.py
"""
import json
import cv2
import numpy as np

ESC = 2

# braço: c1 = (externo, axila) no fim do deltoide, c2 = cotovelo, c3 = punho, mao = fim da mão (y)
# eixo = centro do tronco; virilha = (x, y) do vão das pernas (o contrapposto inclina o eixo)
def V(eixo, virilha, topo, pescoco, ombro, braco, perna, **kw):
    return dict(eixo=eixo, virilha=virilha, topo=topo, pescoco=pescoco, ombro=ombro, braco=braco, perna=perna, **kw)

M = {
    "F": {
        "f": V(285, (272, 500), 162, (124, 160, 28, 44), {"A": 172, "B": 411},
               {"A": dict(c1=((167, 292), (218, 288)), c2=((144, 376), (199, 372)), c3=((118, 470), (144, 470)), mao=575),
                "B": dict(c1=((414, 292), (366, 288)), c2=((428, 376), (384, 372)), c3=((437, 470), (416, 470)), mao=575)},
               {"A": dict(xo=60, coxa=(168, 430), joelho=(640, 718), tornozelo=(868, 905), pe=985),
                "B": dict(xo=500, coxa=(366, 430), joelho=(648, 726), tornozelo=(878, 912), pe=985)},
               peito=315, lat=365, tronco=400, abW=36, vao={"A": 228, "B": 350}),
        "b": V(741, (752, 500), 162, (124, 160, 28, 42), {"A": 621, "B": 856},
               {"A": dict(c1=((618, 292), (668, 288)), c2=((601, 376), (648, 372)), c3=((587, 470), (610, 470)), mao=568),
                "B": dict(c1=((860, 292), (811, 288)), c2=((884, 376), (834, 372)), c3=((904, 470), (880, 470)), mao=568)},
               {"A": dict(xo=540, joelho=(650, 722), tornozelo=(872, 905), pe=980),
                "B": dict(xo=960, joelho=(650, 722), tornozelo=(872, 905), pe=980)},
               costas=(275, 335, 395), gluteo=565, vao={"A": 672, "B": 806}),
    },
    "M": {
        "f": V(309, (305, 515), 150, (116, 150, 36, 52), {"A": 151, "B": 448},
               {"A": dict(c1=((150, 296), (214, 290)), c2=((131, 400), (181, 400)), c3=((129, 466), (159, 466)), mao=566),
                "B": dict(c1=((450, 296), (394, 290)), c2=((469, 400), (419, 400)), c3=((470, 466), (443, 466)), mao=566)},
               {"A": dict(xo=60, coxa=(212, 470), joelho=(640, 722), tornozelo=(868, 905), pe=980),
                "B": dict(xo=520, coxa=(402, 470), joelho=(640, 722), tornozelo=(868, 905), pe=980)},
               peito=266, lat=345, tronco=410, abW=50, vao={"A": 228, "B": 382}),
        "b": V(736, (734, 515), 148, (116, 148, 34, 50), {"A": 577, "B": 886},
               {"A": dict(c1=((577, 296), (640, 290)), c2=((559, 400), (608, 400)), c3=((560, 466), (588, 466)), mao=566),
                "B": dict(c1=((887, 296), (826, 290)), c2=((905, 400), (856, 400)), c3=((904, 466), (877, 466)), mao=566)},
               {"A": dict(xo=540, joelho=(645, 722), tornozelo=(870, 905), pe=980),
                "B": dict(xo=950, joelho=(645, 722), tornozelo=(870, 905), pe=980)},
               costas=(270, 335, 405), gluteo=548, vao={"A": 656, "B": 812}),
    },
}


def preenche(pts, forma):
    m = np.zeros(forma, np.uint8)
    cv2.fillPoly(m, [np.array(pts, np.int32)], 255)
    return m


def maior(m, n_=1):
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    if n < 2:
        return m
    ordem = 1 + np.argsort(st[1:, cv2.CC_STAT_AREA])[::-1][:n_]
    return (np.isin(lab, ordem) * 255).astype(np.uint8)


def caminho(m):
    m = (cv2.GaussianBlur(m, (0, 0), 1.6) > 127).astype(np.uint8) * 255
    cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    ds = []
    for c in cs:
        if cv2.contourArea(c) < 25:
            continue
        a = cv2.approxPolyDP(c, 0.8, True).reshape(-1, 2) * ESC
        ds.append("M" + "L".join(f"{x},{y}" for x, y in a) + "Z")
    return "".join(ds)


def meia(m, interno_direita):
    """Divide um membro pelo centro de cada linha: devolve (interno, externo)."""
    i, e = np.zeros_like(m), np.zeros_like(m)
    for y in np.where(m.any(1))[0]:
        xs = np.where(m[y] > 0)[0]
        c = (xs.min() + xs.max()) / 2
        li = xs >= c if interno_direita else xs < c
        i[y, xs[li]] = 255
        e[y, xs[~li]] = 255
    return maior(i), maior(e)


def silhueta(g):
    """Máscara do corpo gerada uma vez com rembg (src/<g>_mask.png)."""
    m = (cv2.imread(f"src/{g}_mask.png", 0) > 128).astype(np.uint8) * 255
    return maior(cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)), 2)


def zonas_vista(g, v, sil):
    k = M[g][v]
    e = k["eixo"]
    vx, vy = k["virilha"]
    forma = sil.shape
    h, w = forma
    Z, MS = {}, {}
    vista = np.zeros(forma, np.uint8)
    if v == "f":
        vista[:, :512] = 255
    else:
        vista[:, 512:] = 255
    base = cv2.bitwise_and(sil, vista)
    # linha que divide os lados: eixo do tronco, inclinando até o vão das pernas
    dobra = vy - 100
    jan = {"A": preenche([(0, 0), (e, 0), (e, dobra), (vx, vy), (vx, h), (0, h)], forma)}
    jan["B"] = cv2.bitwise_not(jan["A"])
    usado = np.zeros(forma, np.uint8)

    def corta(pts, lado=None, livre=False):
        m = cv2.bitwise_and(preenche(pts, forma), base)
        if lado:
            m = cv2.bitwise_and(m, jan[lado])
        if not livre:
            m = cv2.bitwise_and(m, cv2.bitwise_not(usado))
        return maior(m)

    def poe(chave, m):
        MS[chave] = m
        Z[chave] = caminho(m)

    y0, y1, w0, w1 = k["pescoco"]
    cab = corta([(e - 100, 0), (e + 100, 0), (e + 100, y0), (e - 100, y0)])
    if v == "f":
        poe("face.A", maior(cv2.bitwise_and(cab, jan["A"])))
        poe("face.B", maior(cv2.bitwise_and(cab, jan["B"])))
    else:
        poe("head.C", cab)
    poe("neck.C", corta([(e - w0, y0), (e + w0, y0), (e + w1, y1), (e - w1, y1)]))
    usado |= cab | MS["neck.C"]

    topo = k["topo"]
    # 1) ombros e braços primeiro; o resto do corpo desconta o que eles ocupam
    for s in "AB":
        sg = -1 if s == "A" else 1
        dentro_dir = s == "A"
        b = k["braco"][s]
        (c1o, c1i), (c2o, c2i), (c3o, c3i) = b["c1"], b["c2"], b["c3"]
        msh = corta([(e + sg * 46, topo - 60), (e + sg * 46, topo + 2), c1i, c1o, (c1o[0] + sg * 50, c1o[1]), (k["ombro"][s] + sg * 50, topo - 60)], s)
        poe(f"sh.{s}", msh)
        xs = np.where(msh.any(0))[0]
        lat = msh.copy()
        corte = int((xs.min() + xs.max()) / 2)
        if s == "A":
            lat[:, corte:] = 0
        else:
            lat[:, :corte] = 0
        poe(f"sh.{s}.out", maior(lat))
        usado |= msh
        fora = lambda p, d=60: (p[0] + sg * d, p[1])
        bra = [fora(c1o), c1o, c1i, c2i, c2o, fora(c2o)]
        ant = [fora(c2o), c2o, c2i, c3i, c3o, fora(c3o)]
        mao = [fora(c3o), c3o, c3i, (c3i[0] - sg * 26, b["mao"] + 14), (c3o[0] + sg * 60, b["mao"] + 14)]
        for nome, pts in (("arm", bra), ("fore", ant), ("hand", mao)):
            m = corta(pts, s)
            poe(f"{nome}.{s}", m)
            i_, x_ = meia(m, dentro_dir)
            if nome != "hand":
                poe(f"{nome}.{s}.in", i_)
            poe(f"{nome}.{s}.out", x_)
            usado |= m
    usado = cv2.dilate(usado, np.ones((3, 3), np.uint8))

    # 2) tronco e pernas
    for s in "AB":
        sg = -1 if s == "A" else 1
        dentro_dir = s == "A"
        b = k["braco"][s]
        c1i = b["c1"][1]
        vao = k["vao"][s]
        p = k["perna"][s]
        xo = p["xo"]
        xi = vx - sg * 80                   # passa do eixo; a janela do lado corta
        if v == "f":
            pf, la, tr, ab = k["peito"], k["lat"], k["tronco"], k["abW"]
            peito = corta([(e, topo - 20), (e + sg * 46, topo - 20), (e + sg * 46, topo + 2), c1i, (vao + sg * 40, pf), (e - sg * 20, pf), (e - sg * 20, topo - 20)], s)
            poe(f"chest.{s}", peito)
            x = e + sg * 48
            ci, ce = peito.copy(), peito.copy()
            if s == "A":
                ci[:, :x] = 0; ce[:, x:] = 0
            else:
                ci[:, x + 1:] = 0; ce[:, :x + 1] = 0
            poe(f"chest.{s}.in", maior(ci)); poe(f"chest.{s}.out", maior(ce))
            cost = corta([(vao + sg * 50, pf), (e + sg * ab, pf), (e + sg * ab, la), (vao + sg * 50, la)], s)
            poe(f"rib.{s}", cost)
            x = e + sg * (ab + 24)
            fr, lt = cost.copy(), cost.copy()
            if s == "A":
                fr[:, :x] = 0; lt[:, x:] = 0
            else:
                fr[:, x + 1:] = 0; lt[:, :x + 1] = 0
            poe(f"rib.{s}.fr", maior(fr)); poe(f"rib.{s}.lat", maior(lt))
            t = (tr - pf) / 3
            for n in (1, 2, 3):
                a_, b_ = int(pf + t * (n - 1)), int(pf + t * n)
                poe(f"abd.{n}.{s}", corta([(e + sg * ab, a_), (e - sg * 30, a_), (e - sg * 30, b_), (e + sg * ab, b_)], s))
            co = p["coxa"]
            poe(f"hip.{s}", corta([(vao + sg * 60, la), (e + sg * ab, la), (e + sg * ab, tr), (xi, tr), (xi, vy), (vx, vy), co, (co[0] + sg * 80, co[1])], s))
            coxa = [(co[0] + sg * 80, co[1]), co, (vx, vy), (xi, vy), (xi, p["joelho"][0]), (xo, p["joelho"][0])]
        else:
            alta, media, lomb = k["costas"]
            gl = k["gluteo"]
            faixas = [[(e - sg * 20, topo - 20), (e + sg * 46, topo - 20), (e + sg * 46, topo + 2), c1i, (vao + sg * 40, alta), (e - sg * 20, alta)],
                      [(vao + sg * 40, alta), (e - sg * 20, alta), (e - sg * 20, media), (vao + sg * 50, media)],
                      [(vao + sg * 50, media), (e - sg * 20, media), (e - sg * 20, lomb), (vao + sg * 60, lomb)]]
            for n, pts in enumerate(faixas, 1):
                poe(f"back.{n}.{s}", corta(pts, s))
            poe(f"hip.{s}", corta([(xo, lomb), (xi, lomb), (xi, gl), (xo, gl)], s))
            coxa = [(xo, gl), (xi, gl), (xi, p["joelho"][0]), (xo, p["joelho"][0])]
        mt = corta(coxa, s)
        poe(f"thigh.{s}", mt)
        i_, x_ = meia(mt, dentro_dir)
        poe(f"thigh.{s}.in", i_); poe(f"thigh.{s}.out", x_)
        j0, j1 = p["joelho"]; t0, t1 = p["tornozelo"]
        mj = corta([(xo, j0), (xi, j0), (xi, j1), (xo, j1)], s)
        poe(f"knee.{s}", mj)
        poe(f"knee.{s}.out", meia(mj, dentro_dir)[1])
        ms = corta([(xo, j1), (xi, j1), (xi, t0), (xo, t0)], s)
        poe(f"shin.{s}", ms)
        i_, x_ = meia(ms, dentro_dir)
        poe(f"shin.{s}.in", i_); poe(f"shin.{s}.out", x_)
        poe(f"ankle.{s}", corta([(xo, t0), (xi, t0), (xi, t1), (xo, t1)], s))
        mp = corta([(xo, t1), (xi, t1), (xi, h), (xo, h)], s)
        poe(f"foot.{s}", mp)
        poe(f"foot.{s}.out", meia(mp, dentro_dir)[1])

    for pref in (("abd.1", "abd.2", "abd.3") if v == "f" else ("back.1", "back.2", "back.3")):
        u = cv2.bitwise_or(MS[pref + ".A"], MS[pref + ".B"])
        u = cv2.morphologyEx(u, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
        MS[pref + ".C"] = u
        Z[pref + ".C"] = caminho(u)
    return Z, MS


def main():
    saida = {}
    for g in "FM":
        img = cv2.imread(f"src/{g}.png")
        h, w = img.shape[:2]
        sil = silhueta(g)
        Z = {}
        prova = img.copy()
        rng = np.random.default_rng(5)
        for v in "fb":
            Z[v], MS = zonas_vista(g, v, sil)
            for chave, m in MS.items():
                partes = chave.split(".")
                if len(partes) > 2 and not chave.endswith(".C"):
                    continue
                if partes[0] in ("abd", "back") and not chave.endswith(".C"):
                    continue
                cor = rng.integers(40, 255, 3).astype(np.uint8)
                prova[m > 0] = (prova[m > 0] * .55 + cor * .45).astype(np.uint8)
                cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
                cv2.drawContours(prova, cs, -1, (20, 20, 20), 1)
        cv2.imwrite(f"prova{g}.jpg", prova)

        def caixa(x0, x1):
            ys, xs = np.where(sil[:, x0:x1] > 0)
            return [int(xs.min() + x0) * ESC, int(ys.min()) * ESC, int(xs.max() + x0) * ESC, int(ys.max()) * ESC]

        # fundo mantido; as bordas da imagem se fundem na cor média para o palco não ter emenda
        borda = np.concatenate([img[:10].reshape(-1, 3), img[-10:].reshape(-1, 3), img[:, :10].reshape(-1, 3), img[:, -10:].reshape(-1, 3)])
        cor = np.median(borda, axis=0)
        grande = cv2.resize(img, (w * ESC, h * ESC), interpolation=cv2.INTER_LANCZOS4)
        borrao = cv2.GaussianBlur(grande, (0, 0), 1.3)
        grande = cv2.addWeighted(grande, 1.35, borrao, -0.35, 0).astype(np.float32)
        H, W = grande.shape[:2]
        yy, xx = np.mgrid[0:H, 0:W]
        dist = np.minimum.reduce([xx, yy, W - 1 - xx, H - 1 - yy]).astype(np.float32)
        a = np.clip(dist / 120, 0, 1)[..., None]
        a = a * a * (3 - 2 * a)
        final = grande * a + cor[None, None, :] * (1 - a)
        cv2.imwrite(f"../assets/{g}.webp", np.clip(final, 0, 255).astype(np.uint8), [cv2.IMWRITE_WEBP_QUALITY, 90])
        saida[g] = {"W": W, "H": H, "fundo": "#%02x%02x%02x" % (int(cor[2]), int(cor[1]), int(cor[0])),
                    "box": {"f": caixa(0, 512), "b": caixa(512, w)}, "z": Z}
    json.dump(saida, open("../assets/zonas.json", "w"), separators=(",", ":"))
    print({g: {v: len(saida[g]["z"][v]) for v in "fb"} for g in saida}, {g: (saida[g]["fundo"], saida[g]["box"]) for g in saida})


if __name__ == "__main__":
    main()
