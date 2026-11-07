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
<link rel="icon" href="{icone}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
{fontes}
<link rel="stylesheet" href="{base}app.css">
<style>body{{background:{cor}}}</style>
</head>
<body>
<header class="topo"><div><img id="logo" alt=""><strong id="marca"></strong></div><a id="voltar" hidden></a></header>
<main>
<h1 id="t-titulo"></h1>
<p class="lead" id="t-sub"></p>
<ol class="pr" id="pr"></ol>
<div class="pb" id="pb">
<div id="stp"></div>
<div class="viz" id="viz">
<div class="stg" id="stg"><div class="cam" id="cam"><img id="corpo" alt="Manequim de frente e de costas"><svg id="ovl" xmlns="http://www.w3.org/2000/svg"></svg></div></div>
<button class="zo" id="zo" hidden>Ver o corpo todo</button>
<div class="vistas" id="vistas" role="group" aria-label="Vista do corpo" hidden><button data-v="f">Frente</button><button data-v="b">Costas</button></div>
<div class="emp" id="emp"><span>Primeiro passo</span><b>Escolha o corpo</b><p>Selecione feminino ou masculino para ver o modelo e marcar onde vai a tatuagem.</p></div>
<div class="cp" id="cp" hidden></div>
</div>
</div>
</main>
<footer class="rod">Orçamento por <a href="https://lrgz.com.br">L R G Z</a></footer>
<script>{inicio}</script>
<script src="{base}app.js"></script>
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
    return MOLDE.format(titulo=html.escape(titulo), descricao=html.escape(desc), cor=c["tema"].get("fundo", "#0d0d0d"),
                        og="\n".join(og), icone=base + c["logo"], fontes=fontes, base=base, inicio=inicio)


def main():
    hosts, primeiro = {}, None
    for f in sorted(glob.glob("clientes/*.json")):
        c = json.load(open(f, encoding="utf8"))
        primeiro = primeiro or c
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
    print("clientes:", len(glob.glob("clientes/*.json")), "dominios:", hosts)


if __name__ == "__main__":
    main()
