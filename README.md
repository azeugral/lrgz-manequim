# LRGZ Manequim

Orçamento de tatuagem tocando no corpo. Um código só; cada cliente é um JSON.

- Novo cliente: criar `clientes/<slug>.json` + `clientes/<slug>/`, rodar `python tools/build.py`, push.
- Link: `/<slug>/`. Subdomínio: pôr o host em `dominios` no JSON e adicionar como Custom domain no projeto Cloudflare Pages.
- `modo`: `whatsapp` ou `dm` (copia o pedido e abre o Instagram).
- Corpos e zonas: `tools/zonas.py` (fontes em `tools/src`).

## Subdomínio do cliente

Padrão: `orcamento.<dominio-do-cliente>` (sem cedilha: endereço com "ç" vira `xn--...` e quebra em link de WhatsApp/Instagram).
1. Pôr o subdomínio em `dominios` no JSON do cliente e rodar `python tools/build.py`.
2. Cloudflare → Workers & Pages → `lrgz-manequim` → Custom domains → adicionar `orcamento.<dominio>`.
   Se o domínio do cliente já está na Cloudflare, o CNAME é criado sozinho; se não, criar CNAME `orcamento` → `lrgz-manequim.pages.dev` no DNS dele.
