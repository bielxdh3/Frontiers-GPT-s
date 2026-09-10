# Critérios de avaliação do Sistema Solar

Esta rubrica define o que cada categoria ponderada pretende medir. Um defeito deve ser pontuado na categoria que ele realmente viola, e não simplesmente onde ele foi percebido durante o uso.

## Objetivo e critério de cada categoria

| Dimensão | Peso | Objetivo e critério |
| --- | ---: | --- |
| **Completude de recursos** | 20 | **Objetivo:** medir se as capacidades exigidas pelo prompt existem e entregam o comportamento completo pretendido.<br>**Critério:** descontar por recursos ausentes, falsos, superficiais ou feitos para contornar a intenção; quebras comuns pertencem à Robustez, salvo quando o recurso se torna efetivamente ausente ou inutilizável. |
| **Interação / UX** | 15 | **Objetivo:** medir clareza, descobribilidade, ergonomia, fluxo de navegação/controles e qualidade do feedback quando o produto funciona como projetado.<br>**Critério:** descontar por interação confusa ou desnecessariamente difícil, não por falhas de implementação ou de estado que apenas aparecem durante a interação. |
| **Execução visual** | 15 | **Objetivo:** medir hierarquia visual, legibilidade, coerência, qualidade de renderização e acabamento geral da interface e da cena.<br>**Critério:** descontar por defeitos visuais ou de design persistentes; não penalizar automaticamente aqui falhas funcionais, salvo quando elas também prejudicam de forma independente o resultado visual. |
| **Fidelidade científica / da simulação** | 15 | **Objetivo:** medir a correção e a coerência do comportamento orbital, temporal, de escala e astronômico, incluindo limites de aproximação explicitados com honestidade.<br>**Critério:** descontar por dados, semântica ou modelos cientificamente incorretos; quebras em tempo de execução pertencem à Robustez, salvo quando a lógica científica subjacente também estiver errada. |
| **Robustez** | 10 | **Objetivo:** medir se os comportamentos centrais continuam confiáveis durante uso normal, repetido e em casos-limite, incluindo mudanças de estado, resets e altas velocidades.<br>**Critério:** bugs, dessincronização, estado de câmera/seguimento quebrado, exceções, estado corrompido e comportamentos que deixam de funcionar são penalizados aqui. |
| **Desempenho** | 10 | **Objetivo:** medir responsividade, estabilidade dos frames, carregamento e eficiência de recursos nos ambientes pretendidos.<br>**Critério:** descontar por lentidão mensurável, engasgos, travamentos ou uso excessivo de recursos; controles confusos ou correção funcional pertencem a outras categorias. |
| **Código / arquitetura** | 10 | **Objetivo:** medir manutenibilidade, modularidade, tipagem/limites de estado, disciplina de dependências, testabilidade e qualidade da validação a partir do código-fonte.<br>**Critério:** descontar por fraquezas estruturais ou de engenharia; um bug visível ao usuário não gera também penalidade arquitetural sem evidência independente no código. |
| **Acessibilidade / comportamento responsivo** | 5 | **Objetivo:** medir acesso por teclado/foco, suporte a movimento reduzido, usabilidade semântica e adaptação do layout aos tamanhos de tela-alvo.<br>**Critério:** descontar por falhas concretas de acessibilidade ou responsividade; atritos genéricos de UX e bugs funcionais não relacionados permanecem em suas categorias principais. |

## Regra de fronteira entre categorias

**Não penalizar duas vezes o mesmo defeito em categorias diferentes, salvo quando ele violar de forma independente mais de um critério.** O defeito principal deve ser pontuado onde a falha realmente pertence; qualquer penalidade secundária exige evidência separada de outro problema.

Exemplo: se o Sol seguir incorretamente o usuário ou a câmera enquanto ele se movimenta pelo orbitário por causa de um estado de seguimento, câmera ou cena quebrado, isso é **Robustez**, e não Interação / UX. Só deve afetar UX se o próprio desenho da interação ou dos controles for confuso ou mal comunicado mesmo quando estiver funcionando corretamente.

Recursos opcionais podem ajudar no acabamento ou em um desempate, mas não compensam comportamentos obrigatórios ausentes nem podem elevar uma categoria acima do seu peso máximo.
