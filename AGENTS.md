# Âmbito das alterações

Por instrução explícita do utilizador, a partir de agora todas as alterações deste projeto devem ficar exclusivamente dentro de `dist/`, cujo conteúdo é colocado no GitHub. Não alterar ficheiros noutras pastas para implementar, documentar, testar ou versionar mudanças.

Cada entrega deve funcionar apenas com o conteúdo de `dist/`, também quando este estiver na raiz de um branch do GitHub Pages. Manter recursos com caminhos relativos e a ligação direta à Shelly Cloud sem depender de um servidor local.

Preservar o incremento da versão visível a cada alteração funcional, mas respeitar o âmbito acima: não executar o antigo script de versões se este escrever fora de `dist/`. Quando necessário, manter a versão e a respetiva atualização dentro desta pasta. O registo desta preferência, por si só, não altera a versão da aplicação.

Manter as restantes regras de iluminação, configurações, privacidade e comandos Shelly do projeto que sejam compatíveis com esta instrução. Nunca usar equipamentos reais em testes de movimentos.

# Candeeiros em planta

Os candeeiros da sala e dos quartos são vistos rigorosamente de cima: nunca mostrar pés, hastes ou bases. `lamps.js` insere apenas discos locais das imagens `assets/candeeiros-*-v1.png`; os restantes píxeis gerados não são usados. Posições nas coordenadas 1024×1536: quarto principal (737,223), quarto 2 (750,534), sala (475,840). Manter alinhados os três estados: diurno, apagado e elétrico. Os grupos de render noturno/elétrico incluem a imagem original e o respetivo disco para misturar a opacidade em conjunto. Preservar a camada branca de paredes acima de tudo.

A versão atual dentro desta pasta está em `version.json` e nos metadados, texto visível e parâmetros de cache de `index.html`. Não usar o ficheiro de versão antigo fora de `dist/`.

# Associações dos candeeiros

A configuração `casa-nl-shelly-cloud-v1` inclui opcionalmente `lightBindings`, separada de `bindings` dos estores. Chaves das luzes: master, bedroom2, living; cada entrada contém deviceId hexadecimal, canal inteiro 0..15 e tipo switch/light. Não reutilizar o mesmo ID/canal para dois equipamentos. Configurações e backups antigos sem este campo mantêm o formato original e continuam compatíveis. A exportação/importação valida e preserva as luzes através de ShellyCore.config. A chave de autorização segue as regras da conta existente.

Desde a versão 1.27 os três candeeiros associados têm controlo real: comandos explícitos on=true/false por set/switch ou set/light, usando o ID/canal/tipo guardados e a fila partilhada com os estores. O popup, Ligar todas e Apagar todas controlam os candeeiros Cloud; os restantes equipamentos continuam simulados. Cenários de demonstração preservam luzes e estores reais. Repor demonstração reaplica as últimas leituras reais sem enviar comandos.

Guardar/carregar/importar/consultar nunca aciona equipamentos. A consulta inicial ou depois de guardar é apenas de leitura. A planta e os interruptores só mudam com o estado booleano reportado, nunca com a aceitação HTTP de um comando. Dados ausentes, offline, erros e saída/tipo/canal desconhecidos são identificados; não deduzir estados a partir da potência. Os botões reais exigem dados online recentes. Depois de um comando, consultar imediatamente e acompanhar o estado a cada 2 segundos, até 90 segundos; nunca repetir automaticamente um comando falhado. Preservar a compatibilidade Gen1 relays/lights e Gen2 switch:n/light:n.

Testes de configuração, backup, normalização e transporte estão em tests/shelly-lights.test.cjs dentro desta pasta. A fixture tests/serve_lights_fixture.py usa apenas IDs/chave fictícios, interceta todas as chamadas Shelly e simula os estados. Nunca executar testes de botões com dispositivos reais.

# Deteção da saída de luz — 1.28

O tipo guardado é uma preferência. `lightStatus` enumera saídas switch:n/relays e light:n/lights da resposta, apenas no canal configurado. Se só existir uma família nesse canal, utiliza a família real mesmo que a preferência seja outra; se existirem ambas, respeita a preferência. `resolvedLightCommand` usa o tipo detetado e exige correspondência exata de canal. Não reescrever automaticamente as associações, não mudar de canal e não experimentar endpoints por envio de comandos. Sem saída no canal, bloquear e mostrar as saídas disponíveis. A fixture suporta ?wrongtype (três preferências switch com saídas light) e ?wrongchannel.

# Sensores de temperatura e humidade — 1.29

Associações opcionais em `sensorBindings` na mesma configuração Cloud: living e master, com deviceId, temperatureChannel e humidityChannel (ambos 0 por omissão, inteiros 0..255). Não alterar os esquemas antigos quando este campo estiver ausente. Validar na importação e preservar no backup. Sensores podem partilhar o dispositivo com uma saída já associada; deduplicar IDs em `deviceIds`, com até 9 dispositivos distintos numa consulta.

Consultar apenas dados reais em temperatura/humidade: Gen1 H&T tmp/hum com indicadores is_valid e unidades, Gen2+ temperature:n.tC e humidity:n.rh. Nunca usar a temperatura interna de um relé como temperatura ambiente. Valores inválidos/ausentes ficam indisponíveis, não zero. Leituras válidas de sensores offline podem ser exibidas como últimas disponíveis, com indicação de offline/repouso. Mostrar hora de consulta como consulta, nunca como hora da medição. Bateria opcional bat.value/devicepower:0.battery.percent.

Os popups da sala e do quarto principal mostram os sensores, com atualização manual e consulta periódica de 60 segundos quando a app está visível; abertura da divisão renova dados antigos. Guardar sensores e importar só podem provocar leituras. Não adicionar os sensores a nenhum fluxo de comandos de iluminação/estores. Testes em tests/shelly-sensors.test.cjs; fixture isolada suporta ?sensors, ?sensorsonly, sensoroffline e invalidsensor.

# Grupos das definições — 1.30

Os grupos Sensores, Luzes e Estores usam details/summary nativos (`.shelly-equipment-group`), fechados por omissão e independentes. Manter os campos no DOM ao colapsar para preservar a edição e a leitura do formulário. A validação nativa abre todos os details antecessores de um campo inválido para permitir corrigir/focar o campo. Abrir/fechar grupos não guarda configurações nem envia comandos. Os botões gerais Guardar configuração e Consultar dados dos equipamentos ficam fora dos grupos.

# Leituras nos banners — 1.31

Os banners dos nomes de divisões com sensor associado incluem temperatura e humidade por baixo do nome, usando exclusivamente CasaShelly.sensorReading. Sem associação, o banner mantém apenas o nome. Não inventar valores ausentes; mostrar traço. Leituras offline/em erro/desatualizadas com valores são assinaladas como Última leitura. O mesmo botão mantém clique, duplo clique, teclado e arrastamento. Recalcular a contenção do retângulo completo depois de atualizar leituras ou mostrar os banners para manter o banner dentro da divisão. Ocultar nomes oculta também as leituras desse banner.

# Cartões de informação — 1.32

As informações por equipamento em `#shelly-data` também usam details/summary (`data-shelly-result` com tipo + ID estável da divisão), fechados por omissão. O título identifica a divisão e o subtítulo distingue estore, candeeiro e sensor. Preservar quais cartões estão abertos quando summary() atualiza as leituras; abrir/fechar nunca envia pedidos Cloud ou comandos. Não aplicar este colapso aos controlos do popup da divisão.

# MeteoNL integrada — 1.33

MeteoNL funciona em `meteo/`, num iframe da mesma origem, aberto pelo botão de meteorologia ou após 30 segundos sem interação na Casa NL. `meteo-core.js` gere o temporizador e valida as preferências; `meteo.js` gere a navegação e a ponte com a Casa. Preservar os popups/campos em edição ao entrar/sair. O botão de casa no topo da MeteoNL permite regressar. O temporizador nunca envia comandos e adia a mudança durante comunicações Shelly em curso.

Não adicionar credenciais/IDs nem um transporte Shelly à MeteoNL. O botão do candeeiro usa exclusivamente CasaShelly.lampSnapshot/commandLight para `master`, com consulta em falta de estado recente, sem atuação nessa primeira consulta. Manter os comandos explícitos, fila única e estado confirmado. `lampSnapshot` só expõe configuração presente, estado, disponibilidade e mensagens seguras: nunca segredo nem ID. A cidade usa CasaEnvironment.selectCity/getState; as preferências visuais não guardam outra cidade. `casa-nl-meteo-v1` é validado e incluído no backup; caches de previsão da MeteoNL são regeneráveis e não exportadas.

Fontes adaptadas em `meteo-src/`, compiladas para `meteo/assets/` com esbuild; não editar apenas o bundle. Não modificar o projeto original MeteoNL. Não registar o antigo service worker da MeteoNL. Preservar caminhos relativos e publicação estática em GitHub Pages. Ver METEONL.md para manutenção e testes.

# Carregamento local da MeteoNL — 1.34

Preservar formato IIFE no build e script clássico (sem type=module). No Safari, documentos file:// diferentes não partilham necessariamente a origem: usar iframe.srcdoc herdando a origem do pai e base para meteo/. Em HTTP/HTTPS manter iframe relativo. Não contornar proteções do navegador nem pedir para as desativar. A montagem React chama CasaMeteoBridge.ready; até essa confirmação, disponibilizar o regresso à casa. Não validar apenas no servidor local: verificar também abertura direta em Safari.

# Tempo configurável do protetor — 1.35

O seletor #screensaver-delay nas definições da Casa controla imediatamente o temporizador, reiniciando a contagem. Opções em segundos: 0 (desativado), 15, 30, 60, 120, 300, 600, 900, 1800; omissão 30 para instalações/cópias antigas. Persistir em casa-nl-screensaver-v1 como {seconds}, validar com CasaMeteoCore.screensaver e incluir no backup. Não reutilizar as preferências React da MeteoNL para não haver escritas concorrentes. Desativar não bloqueia abrir manualmente nem envia pedidos/comandos Shelly. Preservar a suspensão durante comunicações e a edição dos popups.

# Piso −1 — 1.36

Novo piso estático em floors.js/floors.css com cave 6 × 1,5 m e carro à direita (assets/carro-eletrico-recortado-v1.png), usando o mesmo fundo de paralelos. A porta é em baixo; paredes continuam brancas. Não alterar os renders, máscaras, IDs/estados do piso 0. Não acrescentar comandos/percentagens fictícias do veículo ou associações Shelly sem pedido.

Desde 1.37, a cave fica por baixo da casa: scroll para baixo / swipe para cima no piso 0 abre −1; scroll para cima / swipe para baixo em −1 regressa a 0. Animar a cave a entrar de baixo e a casa de cima; botões Descer/Subir. Botão no rodapé e Casa permitem a navegação por clique. Bloquear mudanças dentro dos popups e durante MeteoNL. Preservar arrastamento dos banners, supressão de cliques após swipe, limite entre transições e preferência de movimento reduzido. Incluir os dois pisos e o popup da cave no contentor Casa antes da inicialização de meteo.js. A MeteoNL preserva o piso ao regressar. Ver PISO-CAVE.md para dimensões, recurso gerado, prompt e verificações.

# Indicadores de piso — 1.38

Duas bolinhas verticais no lado esquerdo, a meio da altura: botão superior para piso 0 e inferior para −1. Marcar apenas o piso visível com aria-current=page, círculo preenchido e maior. Cada alvo tem 44 × 44 px, nome acessível e permite mudar de piso. A indicação deve acompanhar scroll, swipe, botão do rodapé e Casa. Incluir a navegação no contentor inerte quando a MeteoNL abre.
