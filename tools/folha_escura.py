"""Folha de disponível em fundo ESCURO (arte digital sobre textura, ex.: Samtto).

Separa a arte do fundo e devolve (cor RGB uint8, alfa float 0..1) já no formato de tinta do provador:
- o claro da arte (branco ou creme) é pele: some; o preto é tinta preta; cor saturada é tinta colorida;
- textura, arame, símbolos apagados do fundo e assinatura saem.
A arte é digital: preto puro (< 10), branco/creme, vermelho vivo e poucos cinzas. O fundo é cinza escuro com textura.
Borda com alfa suave (sem serrilhado).
"""
import numpy as np
from scipy import ndimage

VIVA = 70          # "vermelhidão" (r - max(g, b)): símbolos do fundo ficam abaixo de ~60, a tinta viva passa de 140
CLARO_MIN = 150    # menor canal acima disso = claro da arte (branco ou creme)
PRETO = 10         # maior canal abaixo disso = preto puro da arte
OITO = np.ones((3, 3))


def _maior_e_vizinhos(m, raio):
    lab, n = ndimage.label(m, structure=OITO)
    if not n:
        return m
    area = ndimage.sum(m, lab, range(1, n + 1))
    k = int(np.argmax(area)) + 1
    perto = ndimage.binary_dilation(lab == k, iterations=raio)
    manter = np.unique(lab[perto & m])
    return np.isin(lab, manter[manter > 0])


_SESSAO = None


def _silhueta(src):
    """Silhueta da arte pelo rembg (isnet): separa bem arte x textura, mas a borda é borrada; refinamos depois."""
    global _SESSAO
    from rembg import new_session, remove
    if _SESSAO is None:
        _SESSAO = new_session("isnet-general-use")
    return np.asarray(remove(src.convert("RGB"), session=_SESSAO, only_mask=True), dtype=np.float32) / 255


def folha_escura(src):
    a = np.asarray(src.convert("RGB"), dtype=np.float32)
    mn, mx = a.min(2), a.max(2)
    viva = a[..., 0] - np.maximum(a[..., 1], a[..., 2])
    claro = (mn > CLARO_MIN) & (mx - mn < 90)

    # 1) silhueta (rembg), sem furinhos, só o bloco da arte (assinatura e restos do fundo saem)
    arte = ndimage.binary_closing(_silhueta(src) > .4, iterations=2)
    furos = ndimage.binary_fill_holes(arte) & ~arte
    lab, n = ndimage.label(furos, structure=OITO)
    if n:
        area = ndimage.sum(furos, lab, range(1, n + 1))
        arte |= np.concatenate([[False], area < 1500])[lab]       # furo pequeno é traço; furo grande é fundo vazado
    arte = _maior_e_vizinhos(arte, 28)
    # o rembg às vezes corta a ponta de uma chama: cor viva ou claro que encosta na arte entra inteiro
    solto = ndimage.binary_opening((viva > VIVA) | claro, iterations=1)
    lab, n = ndimage.label(solto, structure=OITO)
    ids = np.unique(lab[ndimage.binary_dilation(arte, iterations=2) & solto]); ids = ids[ids > 0]
    arte |= np.isin(lab, ids)
    # tudo que a borda clara (ou viva) da arte cerca é arte: preto sobre preto (terno, chapéu) que o rembg perde
    contorno = arte & (claro | (viva > VIVA))
    arte |= ndimage.binary_fill_holes(ndimage.binary_closing(contorno, iterations=3))
    # 2) borda refinada: na faixa da borda só fica o que é da arte de verdade (claro, cor viva ou preto do traço)
    faixa = arte & ~ndimage.binary_erosion(arte, iterations=8)
    arte &= ~faixa | claro | (viva > VIVA) | (mx < 22)
    arte = ndimage.binary_opening(arte, iterations=1)
    # a passagem do claro para o fundo (cinza do antisserrilhado) não pode virar contorno cinza na pele
    beira = arte & ~ndimage.binary_erosion(arte, iterations=4)
    arte &= ~(beira & ndimage.binary_dilation(claro, iterations=3) & (mx >= 22) & (viva <= VIVA))

    # 3) cor do papel (branco ou creme): mediana do claro da arte
    cl = arte & claro
    papel = np.median(a[cl], 0) if cl.sum() > 50 else np.array([255, 255, 255], np.float32)
    n_ = np.clip(a / papel * 255, 0, 255)                         # papel vira branco
    lum = n_ @ np.array([.299, .587, .114], np.float32)
    sat = n_.max(2) - n_.min(2)

    # 4) alfa: escuro = tinta, papel = pele, cor saturada = tinta colorida (mesma regra das folhas brancas)
    al = np.clip((246 - lum) / (246 - 40), 0, 1)
    al = np.maximum(al, np.clip((sat - 18) / 50, 0, 1))
    al *= ndimage.gaussian_filter(arte.astype(np.float32), .8)   # borda da silhueta sem degrau
    al[al < .04] = 0

    # 5) cor sem o branco do papel misturado na borda
    a3 = np.clip(al, .2, 1)[..., None]
    cor = np.clip((n_ - 255 * (1 - a3)) / a3, 0, 255).astype(np.uint8)
    return cor, al
