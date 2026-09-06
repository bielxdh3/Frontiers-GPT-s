# Registro de validação

Aplicação local: **http://127.0.0.1:4173/**. Evidências produzidas em 06/09/2026 UTC, dentro de `E:\GPT-6-ASTRA`. Os testes usam a aplicação compilada, um Chromium instalado no projeto e perfis novos isolados. A leitura local externa limita-se ao arquivo de requisitos explicitamente autorizado.

<!-- RELEASE_RESULT -->
**Resultado final: 19 testes numéricos/armazenamento e 48 cenários de navegador aprovados, sem erros de página reportados.** O [registro final](../test-results/release.json) vincula os relatórios posteriores ao build, os hashes dos arquivos e a conferência HTTP dos 13 recursos de produção (JS, CSS e 11 imagens).
<!-- END_RELEASE_RESULT -->

## Evidências reproduzíveis

| Verificação | Evidência |
| --- | --- |
| Cálculos, catálogo e armazenamento | `node --test tests/model.test.js tests/storage.test.js`: 19 testes. |
| Jornadas principais, exportação, acessibilidade e falhas | [browser.json](../test-results/browser.json): 21 cenários. |
| Catálogo completo, atividades, passeios, fotografia e responsividade | [acceptance/report.json](../test-results/acceptance/report.json): 16 cenários. |
| Recuperação de textura, estado inválido, visibilidade e foco | [recovery.json](../test-results/recovery.json): 4 cenários. |
| Favoritos, ordenação, apresentações, passos de tempo e interrupção de órbita | [controls.json](../test-results/controls.json): 7 cenários. |

Os 48 cenários de navegador verificam estados e resultados de ações reais no produto. Não representam 48 dispositivos nem uma certificação de acessibilidade. Os nomes e resultados individuais ficam nos relatórios. Os scripts completos estão em `tests/`; os comandos de execução estão em [IMPLEMENTATION.md](IMPLEMENTATION.md).

A verificação adicional reproduziu um defeito no qual uma alteração manual da data conservava o ponto de parada de “Observar uma órbita”. A correção libera essa demonstração quando um comando assume o relógio, restaurando a taxa anterior. Os testes verificam a data escolhida, a pausa manual e a conclusão normal em exatamente um período. `controls-before-fix.json` preserva a reprodução anterior; imagens `failure-*` são evidências históricas de investigação, não resultados vigentes.

## Matriz de aceitação do produto

“Verificado” abaixo significa interação automatizada no navegador, acrescida de inspeção visual das vistas indicadas quando pertinente. Não se atribuiu aprovação de interação apenas pela existência de um handler no código.

| Área do requisito | Comportamento e evidência observada |
| --- | --- |
| Inicialização | Cena utilizável após recarregar, uma tela WebGL, materiais carregados; `browser`, cenário de startup. |
| Composição inicial | [Desktop](../test-results/desktop-opening.png) e [celular](../test-results/acceptance/mobile-opening.png) inspecionados visualmente: hierarquia de leitura, contexto orbital e controles acessíveis. |
| Catálogo principal | Sol, oito planetas e Lua visitados pelo navegador de objetos e por picking da cena, com desambiguação de sobreposição. |
| Catálogo ampliado | Identidade, dados, fontes e foco dos 32 corpos percorridos; regiões apresentadas explicitamente como esquemas. |
| Materiais | Close-ups dos dez corpos principais, Europa, Vesta e Plutão capturados; Terra, gigantes e Saturno inspecionados visualmente. Texturas substituídas por materiais específicos em falha. |
| Anéis | Foco, perspectivas equatorial/polar, arraste, escala, acompanhamento e fotografia de Saturno; anéis enquadrados também em retrato e paisagem. |
| Iluminação solar | Hemisférios e sombras de anéis inspecionados em vistas de Terra, Saturno e gigantes. Não há alegação de eclipses planetários com precisão de efeméride. |
| Dados científicos | Unidades, definições e fontes nos inspetores; testes independentes de gravidade lunar e referências Horizons; tamanhos dos anões incluem o contexto da estimativa. |
| Relógio | 1× confrontado com intervalo real; pausa, sentido, taxa zero, oito presets, taxa inválida, datas-limite, Agora e resets. Passos por minuto e período; observação de uma órbita com término e interrupção. |
| Órbitas | Testes numéricos de determinismo, fechamento de elipse, simetria temporal, limites finitos e convergência. Reprodução reversa exercitada no navegador. |
| Hierarquia de satélites | Lua e satélite galileano comparados com translação do primário mais órbita local independente; exploração dos sistemas Terra–Lua e Júpiter. |
| Modos de escala | Alternância durante acompanhamento e medição; posições físicas e valores numéricos permanecem coerentes. Escala relativa usa um único fator para raios e distâncias. |
| Laboratório de escala | Tamanhos, distâncias e escala combinada; eixos linear/log, referência, grupos, zoom da régua e rolagem. Arraste real de slider e proporções geométricas conferidos. |
| Câmera | Cinco presets, foco, acompanhamento, modo livre, pan, histórico, aproximação e interrupção por arraste/teclado. |
| Seleção | Picking dos corpos principais, tolerância e catálogo de sobreposições; soltar um arraste não troca o alvo. Gestos de toque emulados. |
| Rótulos | Vistas gerais, sistemas locais e formatos móveis inspecionados; áreas ocupadas por painéis excluem rótulos de cena. Marcadores não ampliam o tamanho físico do corpo. |
| Busca | Nomes PT/EN, aliases, busca parcial, vazio e seleção pelo teclado; favoritos/recentes, filtros e ordenação do catálogo. |
| Inspetor | Troca entre visão geral, dados, sistema e fontes, conforme o corpo; ações de foco, acompanhamento, comparação e coleção. |
| Calendário | Datas válidas, inválidas e extremos 1800/2050; passos, Agora e navegação entre datas guardadas. |
| Sobreposições orbitais | Órbitas e trilhas após reversão, salto de data, mudança de escala e qualidade; sem ponte acumulada entre instantes descontínuos. |
| Referenciais | Referencial heliocêntrico e local/geocêntrico aplicados sem mudar o estado físico; esquema e contexto explicitados. |
| Comparação | Dois a quatro corpos, referência, ordem, remoção, PT/EN, km/mi, CSV e SVG. Círculos móveis preservam razão de diâmetros. |
| Medidas | Distância física, UA, tempo de luz de ida, extremos degenerados, valores vivos/congelados, histórico e pulso esquemático com duração declarada. |
| Estações | Alteração de inclinação, latitude e fase orbital; inclinação zero, equinócio e casos de dia/noite polar. |
| Lua e eclipses | Passos de fase e presets de eclipse solar/lunar separados; fração geométrica da fase não confunde iluminação com sombra de eclipse. |
| Laboratório orbital | Massa central, semieixo, excentricidade, massa de teste desprezível, execução, comparação de referência, gravação e retorno ao sistema canônico. |
| Sistema exterior | Cinco etapas, regiões e distâncias esquemáticas percorridas; retorno ao explorador. |
| Missões | Seis linhas históricas, filtros, marcos, visita à data e fontes. Não são apresentadas trajetórias calculadas de sondas. |
| Passeios | Todas as paradas dos cinco passeios; iniciar, avançar, voltar, pausar, retomar, lista de paradas, reiniciar parada e sair. Interrupção por inspeção e fotografia com restauração. |
| Atividades | As doze atividades foram concluídas usando condições do estado; tentativa incorreta, dica, inspeção e retomada exercitadas. |
| Enciclopédia | Vinte e um artigos, busca, exemplos e rotas de retorno; conteúdo básico e aprofundado. |
| Coleções locais | Favoritos, vistas, datas, notas e experimentos; criar, recarregar, editar, duplicar, renomear, excluir, exportar e importar com revisão/mesclagem. Texto não salvo preservado. |
| Fotografia | Opções de composição, exposição, FOV, rótulos e pausa; PNG renderizado em 2×, 1800×1800 no caso quadrado, conferido em preview. WebM curto baixado e inspecionado como artefato não vazio. |
| Áudio opcional | Narração exige ação explícita e mantém o texto; indisponibilidade simulada verificada. Voz ouvida, pronúncia e saída física de áudio não foram avaliadas. |
| Teclado | Busca, seleção, movimento, zoom, Espaço, Escape e foco de diálogo. Escrever em nota preserva Espaço como texto; o foco volta ao controle que abriu o diálogo. |
| Responsividade | Viewports 360×780, 390×844, 768×1024, 1024×768, 1440×900 e 844×390; painéis, alvo e notas preservados. Verificação de ausência de overflow horizontal do documento. |
| Acessibilidade | Axe no explorador e laboratório sem violações reportadas; movimento reduzido, contraste, texto a 130%, nomes semânticos e foco visível. Não houve sessão com leitor de tela físico. |
| Localização | PT-BR e inglês usados em inspetores, ferramentas, aprendizagem, preferências e exportações; idioma pode mudar com nota em edição. |
| Qualidade | Presets e mudanças de qualidade preservam data, alvo e vista. Escala científica independe da qualidade; amostras de adaptação e recursos registradas. |
| Recuperação | Textura interrompida com nova tentativa, armazenamento negado/malformado, importação inválida, WebGL indisponível e perda/restauração de contexto. |
| Recursos | Entradas/saídas repetidas de ferramentas, qualidade e fotografia; um loop, contagem estável de texturas, geometria retida limitada. Não equivale a uma prova formal de ausência de qualquer vazamento. |
| Conclusão | Jornadas integradas A–G abaixo, aplicação compilada e prévia local. Funcionalidades condicionais mantêm alternativas verificadas. |

## Jornadas integradas A–G

| Jornada | Evidência |
| --- | --- |
| A — Lua acompanhada, tempo, escala e retorno ao sistema | `browser`: Earth → Moon → follow → relative scale → local system; invariância física nas medidas e testes de hierarquia. |
| B — Passeio, Saturno, inspeção, foto e retomada | `browser`: tour interruption → Saturn rings → photo → resume same stop; `acceptance`: todos os passeios e fotografia. |
| C — Comparação, idioma, unidades e exportação | `browser`: comparison 2–4 bodies; `acceptance`: geometria móvel e SVG. |
| D — Experimento hipotético e retorno à Terra | `browser`: hypothetical orbit isolation; `acceptance`: experimento salvo/reaberto e retorno ao estado canônico. |
| E — Medição viva, reversão e salto para data guardada | `acceptance`: journey E; os valores acompanham a nova data e a trilha é recalculada. |
| F — Preferências, importação inválida e armazenamento indisponível | `browser`: persistence/import/recovery; `recovery`: malformed saved state. |
| G — Nota não salva e orientação móvel | `acceptance`: journey G, [retrato](../test-results/acceptance/note-portrait.png) e [paisagem](../test-results/acceptance/note-landscape.png). Rotação emulada por viewport. |

## Referências numéricas independentes

Foram consultados vetores públicos do JPL Horizons, independentes da tabela aproximada implementada. Os três pontos usam J2000 TDB, coordenadas geométricas heliocêntricas na eclíptica ICRF, sem correção de tempo de luz. A [fixture](../tests/fixtures/horizons-j2000.json) contém consultas completas, valores e tolerâncias.

| Baricentro em J2000 | Erro de longitude | Erro de latitude | Erro radial | Escalas nominais JPL correspondentes |
| --- | ---: | ---: | ---: | --- |
| Terra–Lua | 2,756″ | 0,185″ | 380 km | 20″ / 8″ / 6.000 km |
| Marte | 3,676″ | 0,771″ | 7.264 km | 40″ / 2″ / 25.000 km |
| Júpiter | 309,059″ | 4,441″ | 287.987 km | 400″ / 10″ / 600.000 km |

Os pontos ficam dentro dessas escalas publicadas. Isso não estabelece uma garantia universal de erro em todas as datas, nem transforma o modelo educativo em efeméride de precisão. UTC≈TDB, baricentro Terra–Lua e órbitas simplificadas de luas/pequenos corpos estão declarados no produto e na nota de implementação.

As [46 rotas públicas](../test-results/sources.json) de fontes retornaram HTTP 200 na auditoria. A disponibilidade HTTP foi verificada separadamente da interpretação científica dos dados e da atribuição das texturas.

## Desempenho e limites

O registro de sete vistas está em [acceptance/performance.json](../test-results/acceptance/performance.json), com aproximadamente 3,2 segundos de amostra isolada por vista. Ambiente: Chromium 140.0.7339.16 headless, ANGLE/SwiftShader por software, viewport 1440×900, qualidade média e pixel ratio 1. Use `isolatedTiming` para comparar as vistas; o contador contínuo de diagnóstico inclui uma janela de quadros anteriores.

<!-- PERFORMANCE_TABLE -->
| Vista | FPS na amostra | p95 de intervalo entre quadros |
| --- | ---: | ---: |
| overview | 53.6 | 33.3 ms |
| Earth | 47.0 | 33.4 ms |
| Saturn rings | 60.5 | 16.7 ms |
| Jupiter system | 60.5 | 16.7 ms |
| comparison | 56.9 | 33.3 ms |
| active Kepler lab | 27.8 | 50.0 ms |
| 30 days per second | 60.3 | 16.8 ms |
<!-- END_PERFORMANCE_TABLE -->

O laboratório ativo é o caso mais custoso neste renderizador por software. A amostra curta não mede desempenho universal, GPU física, energia ou latência de rede. A cena de fundo estática de diálogos pausados é reutilizada; o laboratório continua atualizando sua própria geometria. O diagnóstico mantém um único loop.

[performance.json](../test-results/performance.json) também compara ciclos repetidos de ferramentas e qualidade: 12 texturas antes/depois e uma geometria compartilhada adicional retida. Carregar pela primeira vez um sistema com novas luas aumenta recursos correspondentes; isso difere de crescimento contínuo a cada reabertura.

O build de produção conclui. O JavaScript principal contém Three.js e recebe o aviso do Vite por exceder 500 kB minificados (aproximadamente 730 kB; 209 kB gzip). Texturas são arquivos locais separados com fallback imediato. Não houve afirmação de orçamento de transferência celular ou cold start em hardware real.

## Limites de cobertura

- O navegador foi automatizado; toque, mudança de orientação, movimento reduzido e eventos de visibilidade foram emulados. [visibility.json](../test-results/visibility.json) registra a suspensão do relógio sem acumular atraso; não é uma suspensão física do sistema operacional.
- A inspeção visual foi feita sobre screenshots reais do navegador e da fotografia gerada. Foram conferidas as aberturas, vistas de Terra e gigantes, Saturno, comparação móvel, laboratórios, retrato/paisagem e texto ampliado.
- PNG e WebM foram exercitados no Chromium disponível. O teste de WebM grava um trecho curto e comprova um download não vazio; não comprova suporte universal nem todos os quinze segundos em todos os codecs.
- Tela cheia funcionou nesse Chromium; ausência da API também foi simulada. Voz indisponível e clipboard bloqueado mantiveram texto selecionável e exportação. Não se avaliou áudio ouvido ou leitor de tela.
- Não houve ensaio em aparelho físico, Safari, Firefox, instalação nativa, telemetria astronômica ao vivo ou uso offline prolongado. A aplicação não promete essas validações.
- Não houve commit, push, pull request ou publicação externa. A prévia serve o build local em loopback.
