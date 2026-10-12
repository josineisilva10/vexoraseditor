# Vexoraseditor

CRIAR UM EDITOR DE VÍDEO PROFISSIONAL — PROJETO COMPLETO

Desenvolva uma aplicação web profissional de edição de vídeo chamada provisoriamente Studio Video AI, inspirada na experiência de uso de editores como CapCut, mas com identidade visual própria, código original e interface responsiva.

O aplicativo deverá funcionar em computadores, tablets e celulares, especialmente Android, por meio do navegador.

REGRA PRINCIPAL: não crie apenas um protótipo visual. Implemente funcionalidades reais, conecte os controles à lógica de edição e teste os fluxos de trabalho. Não exiba mensagens de sucesso quando uma operação não tiver sido concluída.

1. TECNOLOGIAS

Utilize:

- React e TypeScript.
- Tailwind CSS para o design.
- Uma biblioteca de componentes acessíveis.
- Supabase ou Lovable Cloud para autenticação, banco de dados e armazenamento.
- Um motor de renderização de vídeo baseado em FFmpeg, executado no servidor para tarefas pesadas.
- WebCodecs, Canvas e HTMLVideoElement quando apropriados para pré-visualização e processamento no navegador.
- Uma camada de integração com serviço de IA para remoção de fundo de pessoas.
- APIs seguras para comunicação com serviços externos.

Não exponha chaves privadas no frontend. Segredos devem permanecer em variáveis de ambiente ou no armazenamento de segredos do backend.

2. DESIGN E INTERFACE

Crie uma interface profissional, moderna e escura, com detalhes discretos, boa legibilidade e aparência de software de edição real.

No computador:

- Barra superior com nome do projeto, desfazer, refazer, salvar e exportar.
- Painel esquerdo para mídia, áudio, textos, adesivos, efeitos e transições.
- Área central de pré-visualização do vídeo.
- Painel de propriedades à direita.
- Linha do tempo na parte inferior, com múltiplas faixas.

No celular:

- Interface adaptada à tela pequena.
- Pré-visualização na parte superior.
- Linha do tempo com rolagem horizontal.
- Ferramentas em painéis inferiores e menus compactos.
- Controles grandes o suficiente para uso por toque.
- Suporte a arrastar, soltar e redimensionar clipes, quando compatível.
- Não simplesmente comprima a interface desktop.

3. GERENCIAMENTO DE PROJETOS

Implemente:

- Criar, renomear, duplicar e excluir projetos.
- Abrir projetos salvos.
- Salvar automaticamente as alterações.
- Recuperar o estado do projeto após atualizar a página.
- Mostrar a data da última alteração.
- Criar projeto vazio e importar arquivos.
- Mostrar estados de carregamento, erro e confirmação.

Cada projeto deve possuir um identificador único, proporção de tela, resolução, taxa de quadros e configuração de áudio.

4. IMPORTAÇÃO E BIBLIOTECA DE MÍDIA

Permita importar:

- Vídeos.
- Imagens.
- Arquivos de áudio.
- Arquivos de legendas, quando suportados.

Inclua:

- Seleção de arquivos no dispositivo.
- Upload com progresso.
- Validação de formato e tamanho.
- Geração de miniaturas.
- Leitura da duração, resolução e informações técnicas dos vídeos.
- Biblioteca de mídia por projeto.
- Mensagens claras para arquivos incompatíveis.
- Tratamento de interrupções de upload.

Não carregue arquivos grandes inteiramente na memória sem necessidade. Utilize armazenamento em partes ou uploads retomáveis quando disponíveis.

5. LINHA DO TEMPO PROFISSIONAL

Implemente uma timeline funcional com faixas independentes para:

- Vídeo principal.
- Vídeos sobrepostos.
- Imagens e elementos gráficos.
- Textos e legendas.
- Música e efeitos sonoros.
- Narração.

Cada clipe deve ter posição inicial, duração, mídia de origem, faixa, volume quando aplicável, transformações e efeitos.

Implemente:

- Arrastar clipes.
- Mover clipes entre faixas.
- Cortar no ponto de reprodução.
- Dividir clipes.
- Ajustar início e fim.
- Excluir clipes.
- Duplicar clipes.
- Reorganizar camadas.
- Controle de zoom da timeline.
- Régua de tempo.
- Indicador de reprodução.
- Seleção de um ou vários clipes, quando possível.
- Desfazer e refazer operações.
- Atalhos de teclado no computador.
- Interações por toque no celular.

Use uma estrutura de dados consistente para representar o projeto. Não dependa apenas dos elementos visuais da timeline para armazenar o estado da edição.

6. PRÉ-VISUALIZAÇÃO

Crie um player funcional que represente a composição atual.

Inclua:

- Reproduzir e pausar.
- Avançar e retroceder na timeline.
- Exibir o tempo atual e o tempo total.
- Visualizar a posição e o tamanho dos elementos.
- Exibir camadas sobrepostas.
- Reproduzir áudio sincronizado quando possível.
- Mostrar o resultado dos efeitos implementados.
- Selecionar e transformar elementos na pré-visualização.

A pré-visualização e a exportação devem utilizar a mesma definição de composição, para que o vídeo final corresponda ao que foi editado.

Se determinado efeito ainda não estiver implementado, não o represente como se funcionasse.

7. FERRAMENTAS DE EDIÇÃO

Implemente progressivamente:

- Corte e divisão.
- Ajuste de velocidade.
- Volume e silenciamento.
- Controle de proporção: 16:9, 9:16, 1:1 e 4:5.
- Rotação e espelhamento.
- Escala, posição e enquadramento.
- Brilho, contraste e saturação.
- Fade de entrada e saída de áudio.
- Fade visual quando suportado.
- Sobreposição de imagens e vídeos.
- Transições entre clipes.
- Controle de opacidade.
- Textos personalizados.
- Fontes, cores, contorno, sombra e alinhamento.
- Animações básicas de entrada, saída e movimento.
- Legendas editáveis.
- Formas e adesivos.

Cada ferramenta deverá atualizar o estado real do projeto e ser refletida na pré-visualização e na exportação.

8. REMOÇÃO AUTOMÁTICA DO FUNDO COM IA

Implemente uma ferramenta chamada “Remover fundo”.

Fluxo:

1. O usuário seleciona um clipe de vídeo.
2. O usuário solicita a remoção do fundo.
3. O sistema envia o arquivo para um serviço de segmentação de pessoas configurado no backend.
4. O processamento retorna um vídeo com canal alfa ou uma sequência de máscaras que possa ser composta corretamente.
5. O resultado fica disponível como uma nova mídia ou como uma versão processada do clipe.
6. O usuário pode colocar outro vídeo, imagem ou cor atrás da pessoa.
7. O usuário pode desativar ou remover o efeito.

Requisitos:

- Mostrar progresso real do processamento.
- Tratar falhas, cancelamento e tempo limite.
- Não afirmar que o fundo foi removido antes de existir um resultado válido.
- Não enviar arquivos para serviços externos sem informar o usuário.
- Não colocar chaves de API no frontend.
- Utilizar um adaptador de serviço para que o fornecedor de IA possa ser substituído.
- Não simular a remoção do fundo com um botão que apenas altera a interface.
- Se o serviço de IA ainda não estiver configurado, mostrar “Configure o serviço de IA para ativar este recurso”.

9. ÁUDIO

Implemente:

- Importar músicas e efeitos sonoros.
- Adicionar faixas de áudio independentes.
- Ajustar volume.
- Silenciar faixas.
- Recortar áudio.
- Ajustar posição e duração.
- Fade de entrada e saída.
- Sincronização com a timeline.
- Controle de reprodução e mixagem na exportação.

Não inclua músicas protegidas sem autorização. Permita ao usuário importar arquivos que tenha direito de utilizar.

10. EXPORTAÇÃO REAL DE VÍDEO

A exportação é uma funcionalidade essencial e deve gerar um arquivo de vídeo verdadeiro.

Crie um fluxo de exportação que:

1. Valide o projeto.
2. Reúna as mídias e os parâmetros necessários.
3. Gere uma representação serializada da composição.
4. Envie uma solicitação autenticada ao backend de renderização.
5. Crie uma tarefa de renderização.
6. Mostre o progresso real da tarefa.
7. Permita consultar o estado: aguardando, processando, concluído ou falhou.
8. Disponibilize o arquivo final somente após a renderização ser concluída e validada.
9. Permita baixar o MP4 gerado.
10. Mostre mensagens claras quando houver erros.

Opções de exportação:

- MP4 com vídeo H.264 e áudio AAC, quando suportados pelo ambiente de renderização.
- Resolução de 720p e 1080p inicialmente.
- 30 ou 60 FPS, quando compatível com as mídias e o motor.
- Proporções horizontal, vertical e quadrada.
- Nome personalizado para o arquivo.
- Opção de exportar sem áudio, quando solicitada.

Utilize FFmpeg ou um motor de renderização equivalente para compor os clipes, camadas, textos, imagens, efeitos e áudio.

A exportação deverá respeitar os tempos, cortes, posições, transformações, ordem das camadas, volume e efeitos implementados.

Para tarefas pesadas, utilize um serviço de renderização com capacidade adequada, armazenamento temporário e fila de tarefas. Não execute renders longos em uma função serverless de curta duração.

Nunca apresente um arquivo de origem renomeado como se fosse um vídeo renderizado. Nunca mostre 100% de progresso antes da confirmação real do servidor.

11. BACKEND E SEGURANÇA

Crie estruturas para:

- Usuários.
- Projetos.
- Mídias.
- Configurações dos projetos.
- Tarefas de processamento.
- Resultados de exportação.

Implemente políticas de acesso para que cada usuário só possa acessar seus próprios projetos e arquivos.

Utilize URLs assinadas ou mecanismos equivalentes para acesso temporário a arquivos privados.

Valide todas as solicitações de renderização no servidor. Não aceite comandos FFmpeg arbitrários enviados pelo usuário.

Limite tamanhos de arquivos, duração dos vídeos, uso de recursos e frequência das solicitações.

Trate falhas de upload, renderização e IA sem perder os projetos salvos.

12. DESEMPENHO

- Carregue as ferramentas sob demanda.
- Gere miniaturas sem bloquear a interface.
- Utilize versões de baixa resolução para pré-visualização, quando necessário.
- Evite decodificar o mesmo vídeo repetidamente.
- Libere recursos de mídia que não estão mais sendo utilizados.
- Evite carregar o vídeo inteiro na memória.
- Implemente cancelamento de operações quando tecnicamente possível.
- Mostre avisos quando um projeto exceder os limites de processamento.
- Mantenha a interface utilizável enquanto o servidor processa uma exportação.

13. TESTES OBRIGATÓRIOS

Teste os seguintes fluxos:

1. Criar um projeto.
2. Importar um vídeo.
3. Colocar o vídeo na timeline.
4. Reproduzir e pausar.
5. Dividir o clipe.
6. Adicionar texto.
7. Adicionar uma música.
8. Salvar e reabrir o projeto.
9. Exportar um MP4 real.
10. Baixar e reproduzir o arquivo exportado.
11. Testar uma falha de renderização.
12. Testar a remoção de fundo quando o serviço de IA estiver configurado.
13. Testar o layout em celular e computador.
14. Testar a proteção dos arquivos entre usuários diferentes.

14. FORMA DE DESENVOLVIMENTO

Construa o projeto por etapas.

Primeiro, entregue a estrutura da aplicação, o layout responsivo, a biblioteca de mídia e a modelagem do projeto.

Depois, implemente a timeline e a pré-visualização.

Em seguida, implemente o motor de composição e a exportação real.

Depois, adicione áudio, textos, efeitos, transições e remoção de fundo com IA.

Por último, execute os testes, corrija erros e melhore o desempenho.

Antes de implementar cada etapa, examine a estrutura existente para evitar substituir funcionalidades que já estejam funcionando.

Se uma integração exigir credenciais, um serviço externo ou infraestrutura adicional, identifique exatamente o que falta e forneça instruções de configuração.

Não esconda erros. Não crie dados fictícios como se fossem reais. Não use botões sem ação. Não declare uma funcionalidade concluída sem verificar seu funcionamento.

Objetivo final: entregar um editor de vídeo funcional, expansível e responsivo, com edição real, projetos persistentes, processamento de IA integrado e exportação verdadeira de vídeos.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://vexoraseditor.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/0658c536-6214-460e-be17-e9a59e8e5a97).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
