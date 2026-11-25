# TryTattoo3D: dossiê de referência (24/11/2026)

Referência pedida pelo Daniel para o provador 3D do Maronez: "algo nesse estilo e qualidade".
Fonte: trytattoo3d.com, os 12 exemplos públicos da home (/shared/...) e a API pública que esses exemplos usam.
Só estudo de técnica e de experiência: nada deles (modelos, imagens, marca) entra no nosso.

## O que eles são
- App de "provar tatuagem em corpo 3D" (v0.83.0, Midnight Ray Studio, Holanda). Grátis + planos a partir de US$ 4,99.
- Recursos: pôr / girar / redimensionar, enviar a própria arte, vários modelos 3D, tom de pele, roupa por cima,
  modelo personalizável (medidas por parte do corpo), modelo a partir de fotos, gerar arte por IA, compartilhar por link.

## Como funciona por dentro (medido)
| Item | Eles | Nós (Manequim hoje) |
|---|---|---|
| Motor | three.js r162 + OrbitControls | three.js r170 + controles próprios |
| Algoritmo da tinta | `decal_geometry` (DecalGeometry padrão do three.js) em **todos** os 12 exemplos | decal próprio que "abraça" a pele (corda) + projeção plana com fade nas travas |
| Modelo | **um modelo por parte do corpo**: perna esquerda, braço direito, tronco, cabeça, corpo inteiro M/F, e corpos realistas com textura | 1 corpo inteiro M/F |
| Densidade | **~100 mil triângulos por peça** (só a perna tem 100 mil), ~10 MB cada | 74,5 mil triângulos para o corpo todo, 1,3 MB |
| Dado salvo por tatuagem | posição na pele + rotação (euler) + escala (`scaleFactor`) + giro em graus | ponto + normal + cm + giro (e trava por medidas) |
| Cena | fundo claro rosado, piso cinza com **sombra projetada**, luz suave, render só quando mexe | fundo escuro, chão com brilho, sem sombra |
| Câmera | perto da parte (modelo de perna = câmera na perna) | corpo inteiro e zoom |

## O que explica a "qualidade" que se vê
1. **Malha densa onde a tatuagem fica.** Com 100 mil triângulos numa perna, o recorte da decal fica liso e a imagem
   acompanha a curva sem degrau. A nossa tem ~10x menos triângulos por área: borda serrilhada, corte em degrau,
   e o fade por triângulo vira mancha (as falhas dos prints de 24/11).
2. **Corte limpo, sem fade.** DecalGeometry recorta a malha dentro de uma caixa (largura x altura x profundidade).
   Onde a pele sai da caixa, a tinta acaba seca. Nada de borrão. O borrão que apareceu nos nossos testes era o fade.
3. **Peças do tamanho certo para a curva.** Os exemplos deles têm tatuagens que cabem numa face do membro (rosa de
   10 cm na coxa, sleeve vista de um lado). Eles também não dão a volta de 360° no braço: na lateral a imagem comprime.
4. **Cena clara com sombra.** Piso + sombra + luz suave dão volume e "cara de produto". O corpo cinza claro no fundo claro
   deixa a tinta preta como protagonista.
5. **Foco por parte.** O cliente escolhe "perna", "braço", "costas"... e a câmera já nasce ali.

## O que levar para o nosso (proposta)
1. **Malha:** subdividir o corpo onde há tatuagem (pernas, braços, tronco) até ~300-400 mil triângulos no total,
   ou trocar por um corpo de licença livre mais denso. Testar peso (meta < 6 MB com Draco/meshopt).
2. **Algoritmo:** trocar o decal próprio pela DecalGeometry padrão (corte por caixa, profundidade = metade da largura
   do membro). Para as travas dos mockups: caixa orientada no ângulo do mockup. Sem fade.
3. **Tribais grandes que dão a volta (pernas, braço do corpo inteiro):** dividir a arte em 2-3 faixas, cada uma com a
   sua caixa (frente / lateral), em vez de uma projeção só. É o único jeito de não esticar.
4. **Cena:** fundo claro ou escuro (a definir com a identidade do Maronez), piso com sombra suave, luz de estúdio.
5. **Navegação por parte:** botões "Perna / Braço / Tronco / Costas / Rosto" que levam a câmera para perto.
6. **Compartilhar:** link com a montagem salva (posição, rotação, escala), além do WhatsApp.

## Auditoria antes de publicar (o que faltou desta vez)
Para cada desenho travado e para 10 disponíveis livres, nos dois corpos (F/M):
- 8 ângulos fixos (frente, 45°, lado, 135°, costas, nos dois lados) + 2 closes;
- folha de contato com todas as imagens lado a lado com o mockup;
- checagem automática: tinta fora da caixa, tinta nas costas quando a peça é da frente, área esticada (> 2x);
- só vai pro ar com a folha de contato aprovada pelo Daniel.
