<div align="center">

# Benchmark do Sistema Solar / Orbitário

**Frontier Models · benchmark de geração de produto completo**

`3D / Canvas` · `simulação` · `design de produto` · `honestidade científica` · `UX responsiva` · `robustez`

[English](./README.md)

</div>

## ⚔️ Arena Frontier V2 atual

| Modelo | Esforço | Projeto ao vivo | Snapshot |
| --- | --- | --- | --- |
| ☀️ **GPT-5.6 Sun Max** | Max | [Abrir Sun V2](https://gpt-5.6-sun-v2.biel.dev.br) | `93d43ae62f…` |
| ✦ **GPT-6 Astra Max** | Max | [Abrir Astra](https://gpt-6-astra.biel.dev.br) | `fca2ef51b4…` |
| 𝕏 **Grok 4.6** | **XHIGH** | [Abrir Grok 4.6](https://grok-4-6-solar-system.vercel.app) | arquivo `5d77eeb509…` |
| ◆ **Fable 5.1** | **Max** | [Abrir Fable 5.1](https://fable-solar-system.vercel.app) | `7e079669e41b…` |

Os quatro concorrentes atuais usam exatamente o mesmo [`frontier-v2.md`](./prompts/frontier-v2.md).

> Os rótulos de raciocínio são preservados exatamente como metadados da execução. `Max` e `XHIGH` são configurações do fornecedor/execução e não são tratados como escalas de computação diretamente equivalentes.

<details>
<summary><strong>Baseline histórico — GPT-5.6 Sun Max V1</strong></summary>

O GPT-5.6 Sun Max V1 é preservado apenas para análise histórica do efeito do prompt. Ele é excluído da arena atual porque usou [`sun-original.md`](./prompts/sun-original.md), e não Frontier V2.

- [Abrir Sun V1](https://gpt-5.6-sun-v1.biel.dev.br)
- Snapshot: `67eb9fc51f…`
- Arquivo: [`runs/gpt-5.6-sun-max/original`](./runs/gpt-5.6-sun-max/original/)

</details>

## O que este benchmark testa

A tarefa pede ao modelo que transforme uma especificação extensa em uma experiência completa do Sistema Solar no navegador, e não apenas em uma demo simples. Ela testa interpretação do produto, hierarquia visual, simulação, tempo e órbitas, sistemas aninhados como Terra–Lua, câmera e navegação, ferramentas de escala e medição, desempenho, robustez, responsividade, acessibilidade, honestidade científica e validação.

## Entrada compartilhada Frontier V2

```text
SHA-256  7c2833a0486938c38671139807bd4a8c16371c3740175376ad02a6c0c3c06d65
Tamanho  115.983 bytes
Linhas   1.153
```

```text
                       EXATAMENTE O MESMO PROMPT FRONTIER V2
               ↙                ↓               ↓               ↘
      SUN MAX V2         ASTRA MAX        GROK 4.6          FABLE 5.1
         MAX                MAX              XHIGH               MAX
```

## Mapa das execuções

| Execução | Modelo | Prompt | Proveniência | Arena |
| --- | --- | --- | --- | --- |
| Baseline histórico | GPT-5.6 Sun Max V1 | `sun-original.md` | commit `67eb9fc51f…` | oculto |
| Frontier V2 | GPT-5.6 Sun Max | `frontier-v2.md` | commit `93d43ae62f…` | atual |
| Frontier V2 | GPT-6 Astra Max | `frontier-v2.md` | commit `fca2ef51b4…` | atual |
| Frontier V2 / XHIGH | Grok 4.6 | `frontier-v2.md` | SHA-256 do arquivo `5d77eeb509…` | atual |
| Frontier V2 / Max | Fable 5.1 | `frontier-v2.md` | commit `7e079669e41b…` | atual |

A proveniência legível por máquina fica em [`RUNS.json`](./RUNS.json).

## Política de snapshots

Arquivos produzidos pelos modelos são preservados dentro de `runs/` sem edições do avaliador. Material escrito pelo avaliador fica fora desses snapshots.

## Avaliação

Cada dimensão recebe nota de **0 a 10** e depois é convertida em pontos ponderados. Um defeito deve ser penalizado na categoria que ele realmente viola, não simplesmente onde foi percebido durante o uso.

| Dimensão | Peso | Objetivo e critério |
| --- | ---: | --- |
| **Completude de recursos** | 20 | **Objetivo:** medir se as capacidades exigidas pelo prompt existem e entregam o comportamento completo pretendido.<br>**Critério:** descontar por recursos ausentes, falsos, superficiais ou feitos para contornar a intenção; quebras comuns pertencem à Robustez, salvo quando o recurso se torna efetivamente ausente ou inutilizável. |
| **Interação / UX** | 15 | **Objetivo:** medir clareza, descobribilidade, ergonomia, fluxo de navegação/controles e qualidade do feedback quando o produto funciona como projetado.<br>**Critério:** descontar por interação confusa ou desnecessariamente difícil, não por falhas de implementação ou de estado que apenas aparecem durante a interação. |
| **Execução visual** | 15 | **Objetivo:** medir hierarquia visual, legibilidade, coerência, qualidade de renderização e acabamento geral da interface e da cena.<br>**Critério:** descontar por defeitos visuais ou de design persistentes; falhas funcionais só contam aqui quando prejudicam de forma independente o resultado visual. |
| **Fidelidade científica / da simulação** | 15 | **Objetivo:** medir a correção e a coerência do comportamento orbital, temporal, de escala e astronômico, incluindo limites de aproximação explicitados com honestidade.<br>**Critério:** descontar por dados, semântica ou modelos cientificamente incorretos; quebras em tempo de execução pertencem à Robustez, salvo quando a lógica científica subjacente também estiver errada. |
| **Robustez** | 10 | **Objetivo:** medir se os comportamentos centrais continuam confiáveis durante uso normal, repetido e em casos-limite, incluindo mudanças de estado, resets e altas velocidades.<br>**Critério:** bugs, dessincronização, estado de câmera/seguimento quebrado, exceções, estado corrompido e comportamentos que deixam de funcionar são penalizados aqui. |
| **Desempenho** | 10 | **Objetivo:** medir responsividade, estabilidade dos frames, carregamento e eficiência de recursos nos ambientes pretendidos.<br>**Critério:** descontar por lentidão mensurável, engasgos, travamentos ou uso excessivo de recursos; controles confusos e correção pertencem a outras categorias. |
| **Código / arquitetura** | 10 | **Objetivo:** medir manutenibilidade, modularidade, tipagem/limites de estado, disciplina de dependências, testabilidade e qualidade da validação a partir do código-fonte.<br>**Critério:** descontar por fraquezas estruturais ou de engenharia; um bug visível ao usuário não gera também penalidade arquitetural sem evidência independente no código. |
| **Acessibilidade / comportamento responsivo** | 5 | **Objetivo:** medir acesso por teclado/foco, suporte a movimento reduzido, usabilidade semântica e adaptação do layout aos tamanhos de tela-alvo.<br>**Critério:** descontar por falhas concretas de acessibilidade ou responsividade; atritos genéricos de UX e bugs funcionais não relacionados permanecem em suas categorias principais. |

**Regra de fronteira entre categorias:** não penalizar duas vezes o mesmo defeito em categorias diferentes, salvo quando ele violar de forma independente mais de um critério. Penalidades secundárias exigem evidência separada de outra falha.

**Exemplo:** se o Sol seguir incorretamente o usuário ou a câmera enquanto ele se movimenta pelo orbitário por causa de um estado de seguimento, câmera ou cena quebrado, isso é **Robustez**, e não **Interação / UX**. Só afeta UX se o próprio desenho da interação for confuso mesmo quando estiver funcionando corretamente.

Veja [`comparison/SCORECARD.md`](./comparison/SCORECARD.md) para notas e evidências e [`../../docs/METHODOLOGY.md`](../../docs/METHODOLOGY.md) para as regras gerais do repositório.

## Justiça da comparação

Um concorrente não deve receber a implementação, nota, crítica ou dicas posteriores de outro concorrente durante a geração do próprio projeto. O benchmark segue a regra: **primeiro geração, depois avaliação**.

---

<div align="center">

**Frontier Models · mesma tarefa, resultados inspecionáveis, evidências explícitas.**

</div>
