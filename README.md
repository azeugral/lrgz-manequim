# LRGZ Manequim

Orçamento de tatuagem tocando no corpo. Um código só; cada cliente é um JSON.

- Novo cliente: criar `clientes/<slug>.json` + `clientes/<slug>/`, rodar `python tools/build.py`, push.
- Link: `/<slug>/`. Subdomínio: pôr o host em `dominios` no JSON e adicionar como Custom domain no projeto Cloudflare Pages.
- `modo`: `whatsapp` ou `dm` (copia o pedido e abre o Instagram).
- Corpo: um manequim único, sem sexo definido (`assets/N.webp`). Máscara e limpeza da fonte em `tools/neutro.py`, recorte fino com alfa e sombra nos pés em `tools/recorte.py`, zonas e exportação em `tools/zonas.py` (fontes em `tools/src`). Ordem: neutro → recorte → zonas → build.
- Palco estilizado no CSS (`#palco`, `#cena`): luz de estúdio, chão, anel de plataforma, grão e vinheta. Cor da luz em `--luz` e `--anel` (padrão = cor do título do cliente); a pele do cliente pode trocar o fundo inteiro (ver `clientes/samtto/skin.css`).

## Subdomínio do cliente

Padrão: `orcamento.<dominio-do-cliente>` (sem cedilha: endereço com "ç" vira `xn--...` e quebra em link de WhatsApp/Instagram).
1. Pôr o subdomínio em `dominios` no JSON do cliente e rodar `python tools/build.py`.
2. Cloudflare → Workers & Pages → `lrgz-manequim` → Custom domains → adicionar `orcamento.<dominio>`.
   Se o domínio do cliente já está na Cloudflare, o CNAME é criado sozinho; se não, criar CNAME `orcamento` → `lrgz-manequim.pages.dev` no DNS dele.

## Horário (Google Agenda)

Opcional. Com o bloco `agenda` no JSON, o pedido ganha o passo "Horário" (4 passos em vez de 3):

```json
"agenda": { "api": "https://lrgz-agenda.azeugral.workers.dev/v1/<slug>", "turnstile": "<sitekey>", "horario": "08:00-18:00", "dias": [1,2,3,4,5,6] }
```

- Agenda vinculada: calendário com os horários livres; ao enviar, o horário é pré-reservado no Google Agenda do tatuador e a mensagem sai com "(pré-reservado no site)".
- Agenda ainda não vinculada ou fora do ar (API 503): a pessoa marca os melhores dias e o período, ou "Prefiro combinar a data no chat". `horario` e `dias` (0 = domingo) só servem para esse modo; padrão 08:00-18:00, segunda a sábado.
- Ligar a agenda real: ver "Tatuador com o LRGZ Manequim" no README do `lrgz-agenda`. O Manequim não precisa de novo deploy.

## Fotos da demo

Os estilos da demo mostram desenhos em papel (como "tatuagens disponíveis"), nunca corpos reais:
- `papel-fine-line.jpg`, `papel-blackwork.jpg`, `papel-realismo.jpg`: Unsplash (licença Unsplash, uso livre), IDs 1766083274361-ed1f8c94c191, 1789823285320-b545e9ecedf2, 1593472807861-5bb884af28f6.
- `papel-old-school.jpg`: recorte de "Tattoo Flash SAAM-1998.84.50C" (Smithsonian American Art Museum, CC0, Wikimedia Commons).

Cortadas em 480x600. Cliente real usa fotos do próprio portfólio.
