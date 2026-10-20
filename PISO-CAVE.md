# Piso −1 — Casa NL 1.37

Cave à esquerda, com proporção interna de 1,5 m de largura por 6 m de comprimento (9 m²), paredes brancas e porta na parede inferior. Veículo elétrico branco à direita, em vista superior, com a frente voltada para cima. O chão reutiliza assets/paralelos-seamless-v2.svg; o ambiente exterior acompanha as mesmas variáveis diurnas/noturnas da aplicação.

Na planta do piso 0: scroll para baixo ou swipe vertical para cima abre a cave, situada abaixo da casa. No piso −1: scroll para cima ou swipe para baixo regressa à casa. O botão junto ao rodapé permite alternar sem gesto; Casa regressa ao piso 0. O arranque continua no piso 0. Regressar da MeteoNL mantém o piso selecionado.

Navegação em floors-core.js e floors.js; desenho em floors.css. Não modificar os recortes, renders, IDs ou estados da planta do piso 0. floors.js deve carregar depois de app.js e antes de meteo.js, para a cave e o seu popup ficarem incluídos no contentor inerte quando a MeteoNL abre.

O scroll de popups não muda o piso. Gestos curtos/horizontais não navegam; arrastar banners mantém o comportamento anterior. Um intervalo entre mudanças evita transições por inércia. O gesto suprime o clique seguinte para não abrir o popup debaixo do dedo. Respeitar prefers-reduced-motion.

Cave e carro abrem popups informativos. Nenhum novo dispositivo, estado de carga, bateria ou comando real foi inventado ou associado. As associações Cloud existentes e os backups mantêm o esquema anterior. A geometria do piso é parte da aplicação e não requer configuração no JSON.

## Imagem do carro

Modo: ferramenta image_gen integrada (sem CLI). Edição background-extraction a partir do ficheiro fornecido `Carro branco visto de cima no asfalto.png`. Resultado PNG RGBA 1024 × 1536 com fundo transparente, guardado em assets/carro-eletrico-recortado-v1.png. A imagem original foi preservada.

Ficheiro final:
/Users/nunoleal/Library/Mobile Documents/com~apple~CloudDocs/Documentos NL/12. Outros/1. Backups/12. Aplicações HTML NL/Domótica NL/casa-nl/dist/assets/carro-eletrico-recortado-v1.png

Prompt final utilizado:

> Edit target: attached white electric Volkswagen car seen in exact orthographic top-down view. Background-extraction only: remove all asphalt around the car, including between side mirrors and body, replacing it with genuine transparent alpha. Preserve this same car, white body, black panoramic roof, windows, mirrors, orientation front at top, full silhouette and exact overhead perspective. No added wheels, no side perspective, no labels, no ground plane. Keep car fully inside the image with only a small transparent margin. High fidelity photorealistic transparent PNG cutout for a smart home floor plan.

## Navegação corrigida — 1.37

A cave surge de baixo na transição, e a casa de cima. Os botões indicam Descer/Subir. A roda do rato segue o deslocamento da página; o gesto tátil segue o movimento do conteúdo, com sentidos opostos entre roda e dedo.

## Verificação

75 testes unitários passaram, incluindo destinos do scroll e limiares/direções do swipe. UI a 820 × 1180: scroll para cima/baixo, botão de alternância, popup da cave, popup do carro, scroll dentro do popup, regresso da MeteoNL ao piso selecionado. Fixture com Shellys fictícios: zero comandos. Captura em review/piso-cave-1.36.png.

## Indicadores no lado esquerdo — 1.38

Duas bolinhas verticais à esquerda. Superior: casa/piso 0. Inferior: cave/piso −1. A do piso atual fica preenchida, maior e marcada com aria-current. Os alvos de toque têm 44 × 44 px e permitem escolher diretamente o piso. A seleção acompanha as restantes formas de navegação.
