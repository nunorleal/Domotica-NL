# Secretária de produção — 1.65

Acesso sobre a secretária vista de cima no quarto do Gui, na área assinalada pelo utilizador. O novo desenho SVG não modifica a fotografia original da planta, as paredes nem as máscaras de iluminação. A imagem do popup foi fornecida pelo utilizador (Secretária de Produção Inteligente.png), copiada para assets/secretaria-gui.png; não foi gerada nem editada. Os banners/cabeçalho impressos são cobertos por controlos HTML acessíveis, associados a leituras reais.

Associações officeBindings já guardadas, mantidas separadas da sala:

| Equipamento | ID inicial | Canal inicial |
| --- | --- | --- |
| Monitor | 441db8 | 0 |
| Apollo | e43ad8 | 0 |
| TerraMaster | e9df12 | 0 |
| Disco externo preto | bb8ac4 | 0 |

Definições → Shelly Cloud → Secretária do Gui permite editar os IDs/canais. O ícone de definições do popup abre diretamente o equipamento selecionado. Backup e validação existentes preservam estas associações. Nenhuma chave ou configuração privada está nos recursos publicados.

Os estados Com energia/Sem energia correspondem ao relé confirmado, não ao funcionamento do sistema operativo. Potência W e energia kWh vêm do medidor do mesmo ID/canal; inexistente, offline, inválido ou antigo aparece indisponível. Ligar/Cortar alimentação são comandos individuais pela fila Shelly partilhada; nunca desligar um servidor/disco pelo relé antes de o encerrar pelo respetivo sistema. Não há novos grupos nem automatismos.

Verificação: 138 testes automáticos; fixture fictícia isolada com quatro equipamentos, leituras, seleção, acesso à associação e um comando Apollo exato no canal0, confirmado pela consulta. Abrir/selecionar não envia comandos. Layout completo sem scroll em iPad768×1024 e820×1180. Provas review/secretaria-planta-1.65.png e review/secretaria-gui-1.65-ipad.png. Não foram acionados equipamentos reais.

## Iluminação da planta — 1.67

A secretária segue imediatamente darkness/electricOpacity do quarto bedroom2 no mesmo ciclo de desenho da planta: brilho proporcional à luz natural, escuro quando sem luz e tom quente com o candeeiro ligado. O efeito aplica-se só ao SVG do móvel; mantém o foco/clique, não altera a fotografia do popup nem as paredes. Respeita movimento reduzido. Prova: review/secretaria-escura-1.67.png. 139 testes passaram; verificação visual com candeeiro fictício.
