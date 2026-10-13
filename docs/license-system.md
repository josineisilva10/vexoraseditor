# VEXORA SAMPLER — sistema de licenciamento

## Regras aprovadas

- Teste gratuito de 5 minutos.
- Licença paga individual, vinculada a um único dispositivo.
- A mesma chave não pode registrar outro dispositivo por conta própria.
- Após a ativação inicial, a autorização assinada pode ser verificada offline.
- Formatação/troca de máquina exige contato com o administrador para reativação ou nova chave.
- Bancos, presets, configurações e arquivos de áudio nunca são apagados por causa do estado da licença.

## O que já foi implementado nesta branch

- Tela de entrada e ativação em `src/components/ActivationGate.tsx`.
- Contador local do teste de cinco minutos.
- Chamada para a Edge Function `activate-license`.
- Verificação da assinatura Ed25519 e do vínculo com o identificador de instalação.
- Painel administrativo em `/admin/licenses`.
- Edge Function `admin-licenses` para emitir, listar, bloquear e remover o vínculo de uma licença.
- Migration para cadastro privado de chaves e histórico de ativações.
- Documentação de implantação em `docs/license-deployment.md`.

## Limitações que precisam ficar claras

O projeto atual é uma aplicação web React, não a versão desktop nativa final. O identificador salvo em `localStorage` é apenas um identificador de instalação do navegador, não uma prova física do computador. Pode ser apagado ou copiado. O teste local também pode ser reiniciado se os dados do navegador forem apagados ou o relógio do sistema for alterado.

A assinatura Ed25519 impede que o cliente invente ou altere o conteúdo da autorização sem a chave privada do servidor. Porém, a camada desktop Windows ainda precisa ser implementada para proteger a identidade da instalação e verificar a autorização no código nativo. Não distribua esta versão web como mecanismo antifraude definitivo.

Uma licença offline não recebe bloqueios remotos enquanto a máquina fica desconectada. Essa é uma consequência do requisito de funcionamento offline.

## Modelo de dados

- `license_keys`: hash da chave (a chave original não é armazenada no banco), e-mail, estado, vínculo do dispositivo e datas.
- `license_activation_events`: histórico de ativações, tentativas recusadas, bloqueios e reativações.

As tabelas têm RLS habilitado e não possuem políticas de acesso público. As operações passam pelas Edge Functions, que usam a chave de serviço apenas no backend.

## Etapas necessárias antes de vender

1. Aplicar a migration e configurar os segredos conforme `docs/license-deployment.md`.
2. Publicar as Edge Functions e testar a emissão/ativação/revogação/reativação.
3. Implementar a camada desktop Windows e a identidade de dispositivo resistente à cópia casual.
4. Testar segundo computador bloqueado, ativação offline, formatação, reativação e preservação dos dados locais.
5. Adicionar rate limiting e monitoramento às tentativas de ativação e revisar a segurança do painel administrativo.

Não considerar a ativação pronta para produção até essas etapas serem concluídas e verificadas.
