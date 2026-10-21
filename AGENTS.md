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

# Ajustes visuais da cave e navegação — 1.39

Retirar medidas da planta, banner e popup da cave. A cave passa à proporção visual equivalente a 2 m de largura, expandindo para a esquerda através de .cellar-outline e preservando o alinhamento da parede direita, porta e carro. Não reintroduzir cotas visíveis. Bolinhas de 5/8 px, próximas (28 px entre centros), mantendo alvos de toque separados de 44 px. Reservar margem lateral para não encostar à planta. Garantir contraste em dia e noite. A indicação inferior usa apenas texto/seta subtil, sem cápsula nem sombra, com espaço acima do menu principal.

# Carregamento do carro — 1.40

Associação opcional `ev` na mesma configuração Shelly Cloud: meter, totalMeter opcional, relay e thresholdWatts (1..1000, omissão 50 W). Shelly EM pode usar o mesmo ID para a pinça e o relé, com canais independentes. Validação e backup via ShellyCore.config; preservar configurações antigas sem ev. Duplicar saída de atuação de luz/estore é proibido; partilhar ID/canal apenas para leitura é permitido. Consultas de até 12 dispositivos distintos em lotes de no máximo 10, na fila comum.

EVCore normaliza W/kWh: emeters Gen1 total Wh, meters Gen1 total Watt-minute, Gen2 switch/pm1 aenergy.total Wh, em1data.total_act_energy Wh e emdata.total_act Wh. Não inventar zeros ausentes, não converter consumo negativo para positivo, não somar famílias ambíguas. O tipo auto exige só uma família no canal exato.

A alimentação visual segue exclusivamente o booleano do relé reportado; o cabo conectado e a animação seguem apenas potência válida, online e recente acima do limiar. Sem dados recentes (45 s), erro ou offline: cabo recolhido, consumo por confirmar, atuação bloqueada; total anterior identificado como última leitura. Não inferir ficha física, bateria ou carga completa. Atualização a cada 15 s visível; não controlar automaticamente pelo consumo.

Ligar/desligar o ponto é só por botão explícito no popup, com ID/canal do relay e set/switch, estado recente e configuração guardada. Usar a mesma fila, geração, proteção de credenciais e confirmação por consulta. Não retry, não estado otimista. O carregador nunca pertence a all-lights, all-blinds, cenários nem reset. Guardar/importar/carregar/abrir popup só consulta.

UI em ev.js/ev.css, associada à parking-space depois de floors.js e antes de meteo.js. Os pixeis do carro e renders da casa não são alterados. Testes apenas com fixture fictícia; ver CARREGAMENTO-EV.md e tests/ev.test.cjs.


# Navegação simplificada — 1.44
Por pedido do utilizador, retirar a legenda «Cave · Entrada pela porta inferior» e os textos/botões «Subir/Descer» do rodapé. A indicação dos pisos usa apenas as duas bolinhas discretas à esquerda, centradas verticalmente: cima = casa, baixo = cave, piso atual mais carregado. Preservar clique nas bolinhas, scroll, swipe e botão Casa.

# Porta de entrada — 1.46

A entrada na esquerda da sala usa três pequenos recortes gerados de porta fechada, um por ambiente, aplicados apenas à sala por CasaDoor.patch dentro de drawRoomLighting. Preservar todo o resto da planta e a máscara branca. Só ocultar esses recortes para mostrar a porta aberta com leitura true válida; unknown/offline/error/stale mostram visual fechado e legenda por confirmar. Config opcional door na mesma conta Shelly, validação e backup partilhados; apenas leituras na fila normal. Modo BLU window e alternativa BTHomeSensor de gateway configurado para contacto obj_id45; nunca inferir por luminosidade, ângulo, bateria ou saída de relé e nunca configurar/acionar o sensor. Ver PORTA-ENTRADA.md sobre limites dos payloads Cloud e testes fictícios.

Desde 1.47, IDs BLU podem ter formato XB seguido de dígitos decimais. Preservar o ID completo nas leituras/config/backup e usar ShellyCore.statusDeviceId só no transporte de consultas. Não substituir pelo MAC nem remover XB. Todos os atuadores e o gateway BTHome continuam a exigir ShellyCore.deviceId hexadecimal. Comparar resposta e associação BLU sem distinguir maiúsculas/minúsculas, inclusive na deteção de alterações do formulário.


# Geometria correta da entrada — 1.48
A porta principal fecha na HORIZONTAL, no vão inferior do recanto à esquerda da sala, entre x129 e x194 junto a y1058. Não fechar ao longo da parede esquerda vertical. Usar variantes porta-fechada-*-v2.png com recorte SVG x119,y975,w76,h89; preservar paredes brancas e todos os restantes pixels dos renders originais. A versão v1 tinha orientação incorreta.

# Contador geral — 1.49

energy-core/energy.js/energy.css: monitor apenas de leitura. Reutiliza ID do EM do carro por omissão, canal 0, contrato 6,9 kVA; não modificar a associação do carro. homeEnergy opcional validado em ShellyCore.config e no backup; ID manual possível. deviceIds deduplica também este ID; todos os lotes continuam até dez, sem limite total artificial de 12. Ler emeters[channel] com validade/frescura; calcular kVA com hypot(power,reactive), nunca equiparar kW/kVA nem assumir reativa zero quando ausente. Cor neutra em offline/erro/stale/desconhecido; total anterior explicitamente antigo. Banner esquerdo na sala com popup, preferência booleana casa-nl-show-energy-banner, check igual/alinhado aos outros e acesso em Controlos gerais. Ocultar/guardar/importar/carregar/consultar nunca aciona equipamentos. Usar fila, conta, geração e temporizador partilhados existentes. Ver CONTADOR-GERAL.md e testes fictícios.

# Porta da cave — 1.51

cellarDoor opcional na configuração Shelly, independente do campo legado door da entrada. Mesmo schema BLU/BTHome, IDs XB preservados, config/backup/consultas partilhados. Rejeitar contacto duplicado para as duas portas, permitir gateway com componentes distintos. doorSnapshot('cellar') e doorEnsureFresh('cellar') apenas leem. Cave mostra estado no banner/popup e atalho de associação. O desenho da cave é SVG nativo em floors.js: grupos cellar-door-closed (horizontal no vão inferior, por omissão) e cellar-door-open (folha/arco originais). Só mostrar aberto com leitura true válida, através de body.cellar-door-is-open; erros/unknown/offline/stale mantêm desenho fechado e legenda por confirmar. Não alterar a porta principal, chão, carro, paredes nem geometria. Testes sempre fictícios; ver PORTA-ENTRADA.md.

# Alarme e banners da cave — 1.52

alarm opcional na configuração Cloud, com papéis arm (atuador) e trigger (só leitura). Utilizador confirmou ON=armado, OFF=desarmado. Outro Shelly indica disparo; nunca o comandar. Config/polaridade/IDs/canais em alarm-form.js; validação, backup e transporte partilhados. Estado estritamente de relays/switch, online/fresco; disparo true tem prioridade mesmo com arm false/desconhecido. Halo verde armado, cinzento desarmado, vermelho intermitente no disparo, âmbar desconhecido/parcial. Sem respostas não inventar silêncio nem desarmado. Atuação explícita de arm, sem retry/estado otimista, confirmar por consulta e suspender protetor enquanto pendente; nunca grupos/reset/cenários.

Cave, alarme e EV são arrastáveis por rato/toque através de basement-layout.js, depois de floors/alarm/ev e antes de meteo. Preservar clique normal e suprimir clique após drag; excluir .basement-movable de swipes de piso. Posições percentuais em casa-nl-basement-layout-v1, validadas/restauradas pelo backup-core e ajustadas dentro da cave/estacionamento ao redimensionar/mudar piso. Não reposicionar/alterar carro ou renders. Ver ALARME-CAVE.md, testes de alarm e basement-layout, e fixtures estritamente fictícias.

# Ventoinha da cave — 1.53

fan opcional {deviceId,channel}, null para remoção explícita. Migração única validada para ID pedido 8819dc/canal0, preservando política de credenciais; nunca atuar ao guardar/carregar/importar. Mesmo transporte, geração, consultas e polling de confirmação. Estado real booleano relays/switch exato, fresco45s, sem inferência de consumo nem atualização otimista. Animação apenas ON confirmado, parar em desconhecido/offline/stale. Excluir grupos de luzes, cenários/reset e alarme. Banner fan arrastável/backup via basement-layout; ícone SVG visto de cima, sem pés. Ver VENTOINHA-CAVE.md e tests/fan.test.cjs. Testes só com mocks.

# Temperatura da cave — 1.54

sensorBindings aceita cellar com type opcional environment/door-window2. Door Window 2 (SHDW-2 ou tipo explicitamente associado) lê tmp no componente0 sem exigir humidade. Preservar a exclusão da temperatura interna de relés genéricos, validade, erros e ausência de valores. Migração única associa ID pedido 7dc19d, componentes0, só leitura, com marcador booleano casa-nl-cellar-temperature-added-v1 incluído/validado no backup; preservar associação existente e permitir retirar sem voltar a adicionar. Mesma conta, fila, lotes e polling dos sensores. Banner Cave mostra temperatura, traço quando inválida e Última leitura em offline/erro/stale. Popup mostra temperatura/bateria/qualidade/hora da consulta, sem humidade inventada e sem confundir contacto da porta com este sensor. Atualizar dados consulta porta e sensor; atalho Sensor de temperatura abre Sensores/Cave. Ver cellar-temperature.js e fixture cellartemp=online/offline/invalid, exclusivamente fictícia.

# Diagnóstico do gateway da porta — 1.56

ID e465b8b9c64c indicado como possível gateway, não confirmado. door-gateway.js acrescenta verificação explícita só de leitura no grupo Porta de entrada. Não migrar BLU para gateway nem supor componente200. Campo de diagnóstico temporário, associação/config/backup anteriores intactos. CasaShelly.inspectDoorGateway usa conta/fila/geração existentes, valida ID hexadecimal, bloqueia configuração suja e só chama status/get. DoorCore.inspectGateway devolve dados mínimos (online/ausente/componentes BTHome, número/booleano/últimoevento); não infere contacto de valor ou nome. Confirmar obj_id45 no gateway antes de associação BTHome manual. Sem criação/configuração de componentes nem atuação. Testes fictícios; estado real continua por verificar.

# Estado BLU window.open — 1.57

DoorCore.status deve aceitar window:N.open além de value legado; false explícito nunca cai num fallback. Se ambos presentes e divergentes/inválidos, manter unknown. Preservar guardas offline/erros/stale/canal e estado/render fechado por omissão. Não substituir o ID BLU pelo gateway só porque este está online. Sensor original funciona na app oficial segundo o utilizador; diagnóstico gateway sem BTHome. Não alegar teste real: regressões com mocks incluem formato open true/false e XB. InspectSensor/inspectDoorSensor e botão Verificar sensor BLU são só leitura, pela mesma fila/conta/geração, com dados mínimos e sem segredos/valores arbitrários. Ver PORTA-ENTRADA.md.

# Diagnóstico BLU também na cave — 1.58

inspectDoorSensor(doorId='entrance') aceita apenas entrance/cellar; cave usa config.cellarDoor e nunca recorre ao ID da entrada quando não associada. Botões e resultados de diagnóstico únicos em ambos os grupos. Preservar normalizador window.open, renders e polling comuns; nenhuma migração/cópia de IDs ou gateway entre portas. Testes de seleção de ID e interface sempre fictícios.

# Popup da consola de televisão — 1.59

media.js/media.css e assets/multimedia-sala.png reutilizam integralmente a imagem fornecida pelo utilizador, sem edição do render da planta. Botão #open-media-console sobre a consola (x310..447/y803..846 nas coordenadas1024x1536), acesso no popup da sala via CasaMedia.decorateRoom e nos Controlos gerais. Popup #media-dialog responsivo, imagem inteira sem recorte e fechar acessível, integrado antes de meteo.js para preservar inert/navegação existente. Estados Ligada/Ligado estão impressos na imagem e são explicitamente ilustrativos; não inferir leituras reais, associar IDs nem enviar comandos. A imagem e os rótulos não são ainda controlos de equipamentos. Preservar associação futura independente de luzes/estores. Verificação iPad vertical820x1180 e desktop, zero comandos na fixture; prova review/multimedia-sala-1.59.png.

# Associações da sala e IDs reservados do escritório — 1.60

Utilizador corrigiu os primeiros quatro IDs: pertencem ao escritório, não à sala. Preservar officeBindings (monitor441db8, apollo e43ad8, terramaster e9df12, blackdrive bb8ac4; canal0) só para guardar/backup/edição futura, sem consulta/controlo pelo popup atual. mediaBindings da sala: tv437c82, soundbar4359bb, playstation435aa1, vodafone e465b8b9c64c, unifi e465b84553bc, canal0 editável. Defaults apenas em campos ausentes, não substituir edições/remover{}; campos opcionais continuam compatíveis e validados no backup. Proibir saídas duplicadas entre todos os atuadores, permitir gateway/contacto só de leitura partilhar ID.

Banners da imagem deixam de ser referências: HTML cobre os textos/estados impressos e pontos, mostrando só energia do relé confirmado. Não chamar a energia estado operacional da TV/consola/router. MC.IDS só admite os cinco da sala, MC.OFFICE_IDS guardados separadamente; deviceIds exclui escritório. Fila/credenciais/geração/polling comuns; sem estado otimista, retry, ligação automática ou participação em cenários/reset/grupos. Popup cabe sem scroll em iPad820×1180 e768×1024 com cabeçalho, imagem e painel fixos. Ver MULTIMEDIA.md, tests/media.test.cjs e fixtures fictícias; não acionar dispositivos reais em testes.

# Consumos na multimédia — 1.61

mediaReadings[id].meter usa EV.meterStatus no mesmo ID/canal, auto sem ambiguidade, na consulta já existente. MC.state powerWatts/energyKWh só com medidor válido online, sem erros e fresco45s; null/Não disponível quando ausente/inválido/offline/stale, preservar zero medido sem o inferir de OFF. BannersW e painelW/kWh acumulados, sem alegar período de consumo. Preservar relé separado de medição, IDs/canais/backup e escritório reservado. Popup continua sem scroll em768×1024. Testes de media e fixture medianometer/mediainvalid/media=offline; só simulação.

# TV e PS5 pelo consumo — 1.62

Nova instrução explícita do utilizador substitui a regra puramente relé apenas paraTV/PS5:0W real=off;Wpositivos=on; ausente/inválido/negativo/offline/stale=unknown. MC.activityFromPower e snapshot.activity não alteram snapshot.on nem comandos/guardas de relé. UI mostra Ligada/Desligada e Relé separado no painel. SVG nativo TVpreta e PS5LEDsoff/onazul, bitmap/fotografia intactos; unknown visual neutro sem emissão com legendaPorconfirmar. Nenhuma atuação automática por potência. Watts pequenos não devem arredondar para0 e contradizer atividade. Outros dispositivos/escritório permanecem como antes. Ver MULTIMEDIA.md e testes fictícios.

# Limiar de standby da TV — 1.63

Por pedido do utilizador, TV off com0..4W inclusive e on apenas>4W. MC.activityThreshold('tv')=4 aplicado por mediaSnapshot. PS5 continua>0W. Não aplicar limiar às leituras exibidas nem comutar relés automaticamente. Unknown mantém guardas anteriores. Ver testes de fronteira e snapshot em media.test.cjs.

# Iluminação da consola — 1.64

Render alternativo assets/multimedia-sala-luz-apagada-v1.png, gerado com imagegen incorporado a partir do original. Candeeiro e LEDs da consola seguem só a luz living: estado booleano real válido online sem erros e recente45s; sem associação usar a simulação da divisão. Unknown usa render sem emissão e legenda por confirmar. TV/PS5 mantêm estados independentes pelo consumo. Não enviar comandos ao abrir/trocar render; mesma conta/consulta. Prompt em MULTIMEDIA-RENDER.md.

# Secretária do Gui — 1.65

office.js reutiliza integralmente assets/secretaria-gui.png fornecida pelo utilizador; sobrepor HTML aos quatro banners e cabeçalho impressos. Desenho SVG visto de cima na área marcada do quarto bedroom2, botão #open-office-desk; acessos também no popup do quarto e Controlos gerais. Popup completo sem scroll em iPad768×1024 e820×1180.

A instrução atual ativa officeBindings anteriormente reservados: monitor441db8, apollo e43ad8, terramaster e9df12, blackdrive bb8ac4, canais editáveis. Não mover para mediaBindings nem reescrever associações existentes. deviceIds inclui escritório, com lotes até10 e mesma conta/fila/geração. mediaSnapshot normaliza ambos, commandMedia só aceita sala e commandOffice só escritório. Estado/consumo válido online fresco45s; não inventar zeros nem estado operacional. Comandos explícitos set/switch, confirmar por leitura/polling comum, sem retry/otimismo; nunca grupos/cenários/reset. Abrir/guardar/importar só lê. Informar que cortar corrente ao servidor/disco requer encerramento pelo sistema. Ver SECRETARIA-GUI.md e fixture office=normal/offline/unknown; nunca testar equipamentos reais.

# Associação explícita dos IDs do Gui — 1.66

Nova autorização para preencher também officeBindings vazio/parcial: MC.associateOffice completa só papéis em falta com os quatro IDs fornecidos/canal0, preservando edições. Migração única casa-nl-gui-ids-associated-v1 booleana incluída/validada no backup; guardar marcador só após config válida e persistência. Depois de concluída, permitir remoção sem voltar a adicionar. Mesma política de credenciais e validação de saídas duplicadas. Apenas consulta, nunca comando na associação.

# Secretária acompanha a iluminação — 1.67

CasaOffice.syncPlan lê darkness/electricOpacity do quarto bedroom2, as mesmas funções/ciclo drawRoomLighting da planta. Escurecimento proporcional da secretária SVG com estores/luz diurna/noite; luz elétrica devolve brilho e ligeiro tom quente. Sem hover que volte a iluminar o móvel e com movimento reduzido respeitado. Sem alterações a estados/comandos, popup, imagens ou paredes.

# Janelas BLU — 1.68

windowBindings opcional para master/bedroom2/living/kitchen, IDs XB fornecidos pelo utilizador em windows-core.js, mesma conta/fila/consulta15s/lotes<=10. Config/backup preservam IDs completos, source blu/bthome e componente; recusar contacto repetido entre portas e janelas. Migração única casa-nl-window-ids-associated-v1 preenche só papéis em falta, preserva edições e remoções futuras. Não atuar nem configurar gateways. Janela e estore independentes: abertura nunca altera percentagem ou luz natural.

windowSnapshot usa DoorCore.status/state com window:N.open explícito, online/fresco45s; unknown/offline/erro/stale = recorte fechado com texto por confirmar, não falso fechado. UI Janelas colapsável nas definições e estado/consulta no popup da divisão. CasaWindows.patch usa apenas retângulos locais dos renders gerados dia/noite/elétrico; manter máscaras brancas por cima e todos os outros pixels originais. Ocultar recorte apenas com true confirmado. Ver JANELAS.md para recursos/prompts e tests/windows.test.cjs/fixture windows para testes sem equipamentos reais.

# Hover da consola e secretária — 1.69

Manter o sombreado verde da TV; aplicar o mesmo à secretária. Móvel da secretária em .office-desk-graphic independente do botão, com iluminação só no gráfico: hover nunca oculta/filtra o móvel. Ícones separados e preferência booleana casa-nl-show-console-icons, check Mostrar ícones da TV e secretária junto dos outros nas definições, validada/incluída no backup. Ocultar só os ícones; manter móvel, zonas clicáveis, hover e foco de teclado. Sem comandos ou alterações aos renders.

# Botão único de alimentação — 1.70

Nos popups media/office, substituir ações on/off por botão circular de energia junto do refresh. Verde = relé on confirmado, cinzento = off; unknown âmbar desativado, nunca inferir de watts. aria-pressed mixed para unknown e aria-busy em confirmação. Clique lê snapshot recente/canControl e envia booleano explícito inverso pelo comando individual existente, nunca endpoint toggle nem mudança otimista. Durante busy/pending bloquear. Preservar nota de encerramento prévio de servidor/disco.

# Backup completo e proteção de associações — 1.71

Exportação recusa formulário Shelly sujo, evitando omitir IDs ainda por guardar. Resumo por categoria conta todos os papéis (incluindo luzes dos quartos), sem imprimir chave. CasaBackup.prepareImport em cópia profunda preserva por omissão associações atuais ausentes de JSON antigo/parcial, apenas na mesma conta/servidor; check na pré-visualização permite reposição exata. Revalidar duplicados antes de escrever, nunca misturar servidores diferentes nem promover rememberKey de ficheiro. Recalcular plano antes da confirmação. Guardar Shelly recusa se outra janela alterou o valor persistido desde o carregamento/último save. Nenhuma operação de backup aciona dispositivos. Teste de roundtrip integral32 associações em tests/backup-complete.test.cjs, sem segredos reais. IDs apagados antes desta versão só recuperáveis de uma cópia anterior ou reintrodução pelo utilizador.

# Aviso de IDs em falta — 1.72

association-warnings.js lista associações sem Device ID nas definições gerais e no menu Shelly, com ligações diretas aos campos e indicação vermelha ID em falta. Atualiza ao editar/preencher/guardar; não usar validação required nem bloquear remoção ou gravação de outros equipamentos. Contador separado EV é opcional; contador geral em origem car usa ID partilhado, só avisar campo próprio quando custom. Não confundir ID em falta com dispositivo offline, não alterar configurações nem enviar pedidos/comandos ao mostrar aviso. Não reconstruir o formulário ao navegar do aviso, para preservar edições.

# IDs reais dos três candeeiros — 1.73

Utilizador voltou a fornecer os IDs: master98cdac1df7e9, bedroom298cdac1f18fa, living98cdac2d2eb6. Migração única casa-nl-lights-restored-v1 associa explicitamente os três, com canal0/preferência switch por omissão; se o mesmo ID já estava guardado, preservar canal/tipo. Preservar toda a restante configuração/conta; validar antes de persistir, marcar só após sucesso. Depois permitir edição/remoção sem reaplicar. Marcador booleano validado/exportado no backup. Guardar/carregar só consulta; não ligar/desligar para testar. Fixtures marcam a migração como concluída para continuar a usar só IDs fictícios.

# IDs confirmados das portas — 1.74

Utilizador corrigiu a porta da cave para XB106582486435511; entrada mantém XB66172384118439. DoorCore.suppliedBindings aplica os dois IDs distintos como BLU, componente0 por omissão, preservando componente do mesmo sensor já guardado. Migração única casa-nl-door-ids-restored-v1 validada/exportada no backup; preservar restante conta/config, permitir edição/remoção posterior sem reaplicar. Apenas consultar contactos; não alterar renders, gateways, estores ou atuadores. Fixtures excluem a migração dos IDs reais.
