# Observatório do Sistema Solar — nota de implementação

## Execução

Abra `index.html` em um navegador moderno. O projeto não possui instalação, servidor, pacote, CDN, conta ou chave de API. Todos os dados necessários à experiência estão empacotados nesta pasta.

## Arquitetura

- `index.html`: estrutura semântica, painéis, barra temporal, onboarding e camadas de diálogo.
- `styles.css`: sistema visual responsivo, estados de foco, alto contraste, movimento reduzido e layouts de tela curta/móvel.
- `data.js`: catálogo bilíngue de 32 corpos, fontes, missões, cinco tours, doze atividades e glossário.
- `science.js`: relógio UTC, elementos orbitais, solver de Kepler limitado, hierarquia de satélites, escalas, medições, gravidade, estações e fases.
- `app.js`: renderizador procedural em Canvas, câmera, seleção, ferramentas, persistência local, exportações e acessibilidade.
- `tests.js`: testes determinísticos do modelo e dos contratos de conteúdo.
- `browser-qa.js`: percurso real no Edge via protocolo de depuração, com capturas e relatório reproduzível.

Não há imagens, texturas, fontes, modelos 3D ou bibliotecas de terceiros. Planetas, anéis, estrelas, cinturões e caudas são desenhados proceduralmente; portanto, não há atribuição de ativos externos pendente.

## Contrato científico

- O instante autoritativo é um único valor UTC. `1×` significa exatamente um segundo simulado por segundo real. Pausa, reversão, passos e taxas preservam esse contrato.
- Os oito planetas usam os elementos médios aproximados publicados pelo JPL para 1800–2050. O solver resolve `M = E − e·sin(E)` por Newton com iteração limitada e fallback determinístico.
- O modelo não é uma efeméride N-corpos de alta precisão. Terra representa o centro do sistema Terra–Lua na aproximação planetária do JPL; a Lua é acrescentada por um modelo local simplificado.
- Luas, planetas anões, asteroides e o cometa educacional usam órbitas keplerianas simplificadas e declaradas como tais. Eclipses e rotas de missão são esquemáticos, não previsões.
- Coordenadas físicas ficam em AU e são independentes da cena. A Escala de Exploração comprime distâncias e exagera raios; Distâncias Relativas usa distância heliocêntrica linear com discos-localizadores. A comparação de diâmetros e a Escala Real Combinada usam fatores lineares comuns.
- Distância, AU, tempo-luz, separação angular, gravidade, peso e período de dois corpos leem dados físicos, nunca pixels da cena.
- O vetor visual usa uma diferença finita na data corrente; a linha dos nodos e o eixo são camadas explicativas. Nenhuma sobreposição altera o estado físico.

## Fontes primárias empacotadas

- [JPL — Approximate Positions of the Planets](https://ssd.jpl.nasa.gov/planets/approx_pos.html)
- [JPL — Planetary Physical Parameters](https://ssd.jpl.nasa.gov/planets/phys_par.html)
- [NASA — Solar System facts](https://science.nasa.gov/solar-system/solar-system-facts/)
- [NASA — Moon eclipses](https://science.nasa.gov/moon/eclipses/?lv=true)
- [NASA — Comet facts](https://science.nasa.gov/solar-system/comets/facts/)
- [NASA — Jupiter moons](https://science.nasa.gov/jupiter/jupiter-moons/)
- [NASA — Saturn moons](https://science.nasa.gov/saturn/moons/)
- [NASA — Uranus moons](https://science.nasa.gov/uranus/moons/facts/)
- [NASA — Neptune moons](https://science.nasa.gov/neptune/moons/)

Cada ficha abre somente as rotas públicas relevantes. O conteúdo quantitativo foi congelado em 5 de setembro de 2026; contagens de luas exibem essa data porque podem mudar.

## Escopo entregue

- Cena principal: Sol, oito planetas, Lua, luas selecionadas, Ceres, Vesta, Plutão, Caronte e cometa; anéis, estrelas e cinturões procedurais.
- Tempo: reprodução, pausa, reversão, taxas exatas, passos, data manual, régua 1800–2050, J2000, agora, limites e política de aba oculta.
- Navegação: catálogo pesquisável, favoritos/visitados, seleção por cena, desambiguação de sobreposição, foco, seguimento, órbita/pan/zoom/pinça, visão geral/superior/baixa e histórico anterior/seguinte.
- Ciência: comparação de 2–4 mundos, distância/tempo-luz/separação angular, laboratório de escala, estações, fases/eclipses, órbita/gravidade, jornada ao sistema externo e missões.
- Aprendizado: cinco tours com pausa/retomada/auto/narração opcional, doze atividades verificáveis, glossário bilíngue e artigo “Sobre este modelo”.
- Trabalho local: vistas, instantes, favoritos, notas, medições, experimentos, importação com prévia, exportação JSON/CSV/SVG, cena pública sem notas e modo Foto PNG.
- Acesso: português brasileiro padrão, inglês completo, teclado, foco visível, regiões ao vivo, alto contraste, UI ampliável, movimento reduzido e modo simplificado.
- Robustez: qualidade automática, limites de DPR/partículas, fallback de Canvas, armazenamento defensivo e ausência de dependências de rede.

PWA instalável, vídeo e conteúdo ao vivo não foram incluídos: eram opcionais e acrescentariam complexidade sem melhorar o núcleo local. A síntese de voz aparece somente quando o navegador a oferece e nunca inicia sozinha.

## Validação registrada

- `node tests.js`: 23 aprovados, 0 falhas.
- `node --check app.js data.js science.js tests.js browser-qa.js`: sem erro sintático.
- Edge headless com estado local limpo: 21 cenários, 19 asserções, 0 erros de console/runtime; resultado em `browser-qa-report.json`.
- A geração de download foi interceptada dentro da página para validar conteúdo sem gravar fora do projeto: SVG de 1.147 bytes, CSV de 332 bytes e PNG de 1.157.392 bytes, com tipos MIME corretos. O fluxo normal continua usando o download padrão do navegador.
- Viewports exercitados: 1440×900, 390×844 e 768×480; nenhum overflow horizontal de página.
- A validação móvel foi emulada no Edge. Não há alegação de teste em aparelho físico, leitor de tela real ou navegador diferente.

As capturas `qa-01` a `qa-11` documentam onboarding, visão geral, comparação, Saturno, estações, Lua, tour, móvel, paisagem curta, sobreposições e Foto.
