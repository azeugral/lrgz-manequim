"""Gera as paginas do LRGZ Manequim a partir de clientes/*.json.

- <slug>/index.html: pagina de cada cliente, com titulo e previa proprios
- index.html: raiz para dominio proprio; descobre o cliente pelo hostname
Rodar da raiz do repo: python tools/build.py
"""
import glob
import html
import json
import os

MOLDE = """<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{titulo}</title>
<meta name="description" content="{descricao}">
<meta name="robots" content="noindex">
<meta name="theme-color" content="{cor}">
<meta property="og:title" content="{titulo}">
<meta property="og:description" content="{descricao}">
<meta property="og:type" content="website">
{og}
{icones}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
{fontes}
<link rel="stylesheet" href="{base}app.css?v=20">
{skin}
<style>body{{background:{cor}}}</style>
</head>
<body>
<header class="topo"><a id="insta" target="_blank" rel="noopener" hidden></a><div class="marca"><img id="logo" alt=""><strong id="marca"></strong></div><a id="voltar" hidden></a></header>
<main>
<div class="cab"><h1 id="t-titulo"></h1><p class="lead" id="t-sub"></p></div>
<ol class="pr" id="pr"></ol>
<section id="local" class="local" aria-label="Escolha o local da tatuagem">
<div class="controles"><div class="grupo" id="grupo-v"><span class="rot">Vista</span><div class="seg" id="seg-v" role="group" aria-label="Vista"><button data-v="f">Frente</button><button data-v="b">Costas</button></div></div></div>
<div class="palco-wrap"><svg id="palco" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" role="group" aria-label="Manequim: toque na região da tatuagem"><defs><clipPath id="cv"><rect id="cvr"/></clipPath><radialGradient id="g-luz"><stop offset="0" class="luz0"/><stop offset=".55" class="luz5"/><stop offset="1" class="luz1"/></radialGradient><radialGradient id="g-chao"><stop offset="0" class="chao0"/><stop offset="1" class="chao1"/></radialGradient></defs><g id="cena" aria-hidden="true"></g><image id="corpo" clip-path="url(#cv)"/><g id="zonas"></g><g id="sel"></g><g id="rotulos"></g></svg></div>
<p class="legenda" id="legenda" aria-live="polite"></p>
<div class="painel" id="painel"></div>
</section>
<section id="tela" class="tela" hidden></section>
<div class="acao" id="acao"></div>
<div id="ag-verif" class="ag-verif"></div>
</main>
<footer class="rod">Orçamento por <a href="https://lrgz.com.br">L R G Z</a></footer>
<script>{inicio}</script>
<script src="{base}app.js?v=20"></script>
</body>
</html>
"""


def pagina(c, base, inicio, og_url=""):
    titulo = c.get("titulo") or f"Orçamento | {c['nome']}"
    desc = c["textos"]["sub"]
    og = []
    if og_url:
        og.append(f'<meta property="og:url" content="{og_url}">')
    if c.get("og"):
        og.append(f'<meta property="og:image" content="{c["og"]}">')
    fontes = f'<link rel="stylesheet" href="{html.escape(c["fontes"])}" data-fontes="1">' if c.get("fontes") else ""
    icones = f'<link rel="icon" href="{base + (c.get("favicon") or c["logo"])}">'
    if c.get("icone192"):
        icones += f'\n<link rel="apple-touch-icon" href="{base + c["icone192"]}">'
    skin = f'<link rel="stylesheet" href="{base + c["css"]}?v=20" data-skin="1">' if c.get("css") else ""
    return MOLDE.format(titulo=html.escape(titulo), descricao=html.escape(desc), cor=c["tema"].get("fundo", "#0d0d0d"),
                        og="\n".join(og), icones=icones, fontes=fontes, skin=skin, base=base, inicio=inicio)


PV_V = "1"   # subir a cada mudança no provador (js, css ou desenhos)
MOLDE_PV = """<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{titulo}</title>
<meta name="description" content="{descricao}">
<meta name="robots" content="noindex">
<meta name="theme-color" content="{cor}">
<meta property="og:title" content="{titulo}">
<meta property="og:description" content="{descricao}">
<meta property="og:type" content="website">
{og}
{icones}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
{fontes}
<link rel="preload" as="fetch" href="{base}assets/3d/feminino.glb?v=1" crossorigin>
<link rel="modulepreload" href="https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js">
<link rel="stylesheet" href="{base}app.css?v=20">
<link rel="stylesheet" href="{base}provador/provador.css?v={pv}">
<style>body{{background:{cor}}}</style>
</head>
<body class="pv-pagina">
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
<symbol id="zap" viewBox="0 0 24 24"><path fill="currentColor" d="M12 0a11.9 11.9 0 0 0-10.3 18L0 24l6.2-1.6A12 12 0 1 0 12 0Zm0 21.8c-1.8 0-3.6-.5-5.1-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.9 9.9 0 1 1 12 21.8Zm5.4-7.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.2l-1 1.2c-.2.2-.4.2-.7.1-.3-.2-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.5-.6.3-.5c.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.3 5.2 4.6 2.6 1 3.1.8 3.7.8.6-.1 1.8-.7 2-1.5.3-.7.3-1.4.2-1.5l-.7-.3Z"/></symbol>
<symbol id="espelha" viewBox="0 0 24 24"><path d="M12 3v18M9 7 3 17h6zm6 0 6 10h-6z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></symbol>
<symbol id="lixo" viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13" fill="none" stroke="currentColor" stroke-width="1.6"/></symbol>
<symbol id="baixa" viewBox="0 0 24 24"><path d="M12 3v12m-5-5 5 5 5-5M4 20h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"/></symbol>
</svg>
<header class="topo"><a id="insta" target="_blank" rel="noopener" hidden></a><div class="marca"><img id="logo" alt=""><strong id="marca"></strong></div><a id="voltar" hidden></a></header>
<main id="provador">
<div class="cab"><h1 id="t-titulo"></h1><p class="lead" id="t-sub"></p></div>
<div class="pv-app">
<section class="pv-palco" id="palco" aria-label="Corpo 3D para provar os desenhos">
<div class="pv-seg pv-vistas" role="group" aria-label="Vista do corpo"><button type="button" data-vista="f" aria-pressed="true">Frente</button><button type="button" data-vista="b" aria-pressed="false">Costas</button><button type="button" data-vista="l" aria-pressed="false">Lado</button></div>
<div class="pv-seg pv-corpos" role="group" aria-label="Corpo"><button type="button" data-corpo="feminino" aria-pressed="true">Feminino</button><button type="button" data-corpo="masculino" aria-pressed="false">Masculino</button></div>
<div class="pv-zoom" role="group" aria-label="Zoom"><button type="button" id="z-mais" aria-label="Aproximar">+</button><button type="button" id="z-menos" aria-label="Afastar" disabled>&minus;</button></div>
<p class="pv-carregando" id="carregando">Carregando o corpo 3D</p>
<p class="pv-dica" id="dica">Arraste um desenho para o corpo · gire arrastando</p>
<p class="pv-local" id="local" hidden></p>
</section>
<aside class="pv-lado">
<div class="pv-bloco"><h2>{rotulo}</h2><ul class="pv-gaveta" id="gaveta"></ul></div>
<div class="pv-bloco pv-ajuste" id="ajuste" aria-disabled="true">
<h2>Peça escolhida <span id="aj-nome"></span></h2>
<div class="pv-cores" id="pv-cores" role="group" aria-label="Cor da tinta"></div>
<label class="pv-faixa">Tamanho <output id="o-tam">12 cm</output><input type="range" id="r-tam" min="4" max="45" step="1" value="12"></label>
<label class="pv-faixa">Giro <output id="o-giro">0°</output><input type="range" id="r-giro" min="-180" max="180" step="1" value="0"></label>
<div class="pv-acoes"><button type="button" class="pv-mini" id="b-espelha"><svg><use href="#espelha"/></svg>Espelhar</button><button type="button" class="pv-mini" id="b-apaga"><svg><use href="#lixo"/></svg>Tirar</button></div>
<p class="pv-atalhos">Arraste o corpo para girar e a peça para levá-la pela pele. No computador, a rodinha em cima da peça muda o tamanho (com Shift, gira). No celular, um dedo gira e dois aproximam.</p>
</div>
<div class="pv-bloco">
<h2>Sua montagem</h2>
<ol class="pv-lista" id="lista"><li class="pv-vazio">Nenhum desenho no corpo ainda.</li></ol>
<div class="pv-fim"><button type="button" class="pv-btn" id="b-pede" disabled><svg><use href="#zap"/></svg><span>Pedir orçamento</span></button><button type="button" class="pv-btn linha" id="b-salva" disabled><svg><use href="#baixa"/></svg><span>Salvar imagem</span></button></div>
<p class="pv-nota">O tamanho em centímetros é uma estimativa para um corpo de 1,70 m. <span id="nota-quem"></span> ajusta tudo com você antes de tatuar.</p>
</div>
</aside>
</div>
<section class="pv-recebe" id="recebe" hidden></section>
</main>
<div class="pv-aviso" id="aviso" role="status" hidden></div>
<footer class="rod">Provador por <a href="https://lrgz.com.br">L R G Z</a></footer>
<script>{inicio}window.PV_V="{pv}";</script>
<script type="importmap">{{"imports":{{"three":"https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/"}}}}</script>
<script type="module" src="{base}provador/provador.js?v={pv}"></script>
</body>
</html>
"""


def pagina_pv(c, base, inicio):
    pv = c["provador"]
    titulo = pv.get("pagina") or f"Provador | {c['nome']}"
    desc = pv.get("sub") or "Prove os desenhos num corpo 3D antes de pedir o orçamento."
    og = f'<meta property="og:image" content="{c["og"]}">' if c.get("og") else ""
    fontes = f'<link rel="stylesheet" href="{html.escape(c["fontes"])}">' if c.get("fontes") else ""
    icones = f'<link rel="icon" href="{base + (c.get("favicon") or c["logo"])}">'
    return MOLDE_PV.format(titulo=html.escape(titulo), descricao=html.escape(desc), cor=c["tema"].get("fundo", "#0d0d0d"), og=og,
                           icones=icones, fontes=fontes, base=base, inicio=inicio, pv=PV_V, rotulo=html.escape(pv.get("rotulo", "Disponíveis")))


MIDDLEWARE = """// Gerado por tools/build.py. Nao editar a mao.
// Na raiz de um dominio de cliente, serve a pagina dele (titulo, favicon, previa e CSS certos).
const HOSTS = __HOSTS__;
export async function onRequest(ctx) {
  const u = new URL(ctx.request.url);
  const slug = HOSTS[u.hostname];
  const pv = /^\\/provador\\/?(index\\.html)?$/.test(u.pathname);
  if (slug && (pv || u.pathname === "/" || u.pathname === "/index.html")) {
    u.pathname = pv ? `/${slug}/provador/` : `/${slug}/`;
    const r = await ctx.env.ASSETS.fetch(new Request(u.toString(), ctx.request));
    return new Response(r.body, r);
  }
  return ctx.next();
}
"""


def main():
    hosts, primeiro = {}, None
    for f in sorted(glob.glob("clientes/*.json")):
        c = json.load(open(f, encoding="utf8"))
        # raiz padrao: Maronez (piloto); sem ele, o primeiro cliente que nao e demo
        if c["slug"] == "maronez" or not primeiro:
            primeiro = c if c.get("modo") != "demo" else primeiro
        for h in c.get("dominios", []):
            hosts[h] = c["slug"]
        os.makedirs(c["slug"], exist_ok=True)
        dados = json.dumps(c, ensure_ascii=False).replace("<", "\\u003c")
        inicio = f'window.MANEQUIM_BASE="../";window.MANEQUIM_CLIENTE={dados};'
        with open(f"{c['slug']}/index.html", "w", encoding="utf8", newline="\n") as s:
            s.write(pagina(c, "../", inicio))
        if c.get("provador"):   # provador 3D dos disponíveis: /<slug>/provador/
            os.makedirs(f"{c['slug']}/provador", exist_ok=True)
            ini = f'window.MANEQUIM_BASE="../../";window.MANEQUIM_CLIENTE={dados};'
            with open(f"{c['slug']}/provador/index.html", "w", encoding="utf8", newline="\n") as s:
                s.write(pagina_pv(c, "../../", ini))
    inicio = f'window.MANEQUIM_BASE="./";window.MANEQUIM_HOSTS={json.dumps(hosts)};'
    with open("index.html", "w", encoding="utf8", newline="\n") as s:
        s.write(pagina({**primeiro, "titulo": "Orçamento", "og": ""}, "./", inicio))
    os.makedirs("functions", exist_ok=True)
    with open("functions/_middleware.js", "w", encoding="utf8", newline="\n") as s:
        s.write(MIDDLEWARE.replace("__HOSTS__", json.dumps(hosts)))
    print("clientes:", len(glob.glob("clientes/*.json")), "dominios:", hosts)


if __name__ == "__main__":
    main()
