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
<link rel="stylesheet" href="{base}app.css?v=16">
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
<script src="{base}app.js?v=16"></script>
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
    skin = f'<link rel="stylesheet" href="{base + c["css"]}?v=16" data-skin="1">' if c.get("css") else ""
    return MOLDE.format(titulo=html.escape(titulo), descricao=html.escape(desc), cor=c["tema"].get("fundo", "#0d0d0d"),
                        og="\n".join(og), icones=icones, fontes=fontes, skin=skin, base=base, inicio=inicio)


MIDDLEWARE = """// Gerado por tools/build.py. Nao editar a mao.
// Na raiz de um dominio de cliente, serve a pagina dele (titulo, favicon, previa e CSS certos).
const HOSTS = __HOSTS__;
export async function onRequest(ctx) {
  const u = new URL(ctx.request.url);
  const slug = HOSTS[u.hostname];
  if (slug && (u.pathname === "/" || u.pathname === "/index.html")) {
    u.pathname = `/${slug}/`;
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
        primeiro = primeiro or (c if c.get("modo") != "demo" else None)
        for h in c.get("dominios", []):
            hosts[h] = c["slug"]
        os.makedirs(c["slug"], exist_ok=True)
        dados = json.dumps(c, ensure_ascii=False).replace("<", "\\u003c")
        inicio = f'window.MANEQUIM_BASE="../";window.MANEQUIM_CLIENTE={dados};'
        with open(f"{c['slug']}/index.html", "w", encoding="utf8", newline="\n") as s:
            s.write(pagina(c, "../", inicio))
    inicio = f'window.MANEQUIM_BASE="./";window.MANEQUIM_HOSTS={json.dumps(hosts)};'
    with open("index.html", "w", encoding="utf8", newline="\n") as s:
        s.write(pagina({**primeiro, "titulo": "Orçamento", "og": ""}, "./", inicio))
    os.makedirs("functions", exist_ok=True)
    with open("functions/_middleware.js", "w", encoding="utf8", newline="\n") as s:
        s.write(MIDDLEWARE.replace("__HOSTS__", json.dumps(hosts)))
    print("clientes:", len(glob.glob("clientes/*.json")), "dominios:", hosts)


if __name__ == "__main__":
    main()
