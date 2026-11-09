// Gerado por tools/build.py. Nao editar a mao.
// Na raiz de um dominio de cliente, serve a pagina dele (titulo, favicon, previa e CSS certos).
const HOSTS = {"orcamento.maronez.com.br": "maronez", "manequim.maronez.com.br": "maronez", "orcamento.samtto.com.br": "samtto"};
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
