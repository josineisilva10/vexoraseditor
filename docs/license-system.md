# VEXORA SAMPLER — Licenciamento (fundação)

## Regras aprovadas

- Teste gratuito de 5 minutos.
- Licença paga individual, vinculada a um único computador.
- A chave não pode registrar um segundo dispositivo por conta própria.
- Depois da ativação inicial, o objetivo é funcionar offline.
- Formatação/troca de máquina exige contato com o administrador para reativação ou emissão de outra chave.
- Bancos, presets, configurações e arquivos de áudio nunca são apagados por causa do estado da licença.

## Estado desta etapa

Esta alteração prepara o esquema de dados do servidor. Ela **não ativa ainda** o bloqueio no aplicativo e não deve ser tratada como sistema pronto para venda. A interface atual é uma aplicação web React; o README informa que a camada desktop Windows ainda não foi concluída.

Uma ID criada no navegador/localStorage não comprova a identidade física de um computador: pode ser apagada ou copiada. Para cumprir a regra de um PC com resistência razoável à cópia, a versão Windows precisa de um identificador de instalação gerado e protegido pela camada nativa, além de uma autorização offline assinada digitalmente. A chave privada de assinatura deve ficar somente no servidor.

## Modelo de dados

A migration cria:
- `license_keys`: hash da chave (nunca a chave em texto puro), e-mail do comprador, estado, dispositivo vinculado e datas.
- `license_activation_events`: histórico de tentativas, ativações e reativações administrativas.

As tabelas não permitem acesso direto via API pública. As operações deverão passar por funções de servidor com segredo administrativo, validação de entrada, limitação de tentativas e logs sem expor a chave completa.

## Próximas etapas obrigatórias

1. Configurar o segredo de assinatura no backend e publicar as funções de licenciamento.
2. Criar painel administrativo autenticado para gerar chaves, revogar e reativar dispositivos.
3. Adicionar a tela inicial de ativação sem alterar o layout aprovado do sampler.
4. Integrar o fluxo com a camada desktop Windows; emitir autorização offline assinada e verificar sua assinatura no aplicativo.
5. Testar primeira ativação online, segundo PC bloqueado, uso offline, formatação, reativação administrativa e preservação dos dados locais.

Não distribuir para clientes até concluir e testar todas as etapas.
