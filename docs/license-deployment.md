# Configuração e implantação do licenciamento VEXORA

## 1. Banco de dados

A migration `supabase/migrations/20261013000000_vexora_license_foundation.sql` precisa ser aplicada ao projeto Supabase conectado ao app.

## 2. Gerar as chaves de assinatura

A chave privada Ed25519 fica somente nos segredos do servidor. Nunca coloque a chave privada em `VITE_*`, no código do navegador ou no repositório.

Em um ambiente com OpenSSL:

```sh
openssl genpkey -algorithm ED25519 -out vexora-license-private.pem
openssl pkcs8 -topk8 -nocrypt -in vexora-license-private.pem -outform DER | base64 -w0
openssl pkey -in vexora-license-private.pem -pubout -outform DER | base64 -w0
openssl rand -hex 32
```

Os comandos imprimem, respectivamente, a chave privada PKCS#8 em Base64, a chave pública SPKI em Base64 e um segredo administrativo aleatório. Guarde a chave privada e o segredo administrativo em local seguro.

## 3. Segredos de backend

Configure no Supabase:
- `VEXORA_LICENSE_SIGNING_PRIVATE_KEY`: primeira saída do comando acima (PKCS#8 DER Base64).
- `VEXORA_LICENSE_PUBLIC_KEY_ID`: identificador, por exemplo `v1`.
- `VEXORA_ADMIN_SECRET`: segredo aleatório do último comando.

O backend já usa `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` fornecidos pelo runtime do Supabase. Não os exponha ao navegador.

## 4. Variáveis públicas do frontend

Configure no ambiente de build do app:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_VEXORA_LICENSE_PUBLIC_KEY`: segunda saída do comando OpenSSL, chave pública SPKI DER Base64.

A chave pública pode ser distribuída no cliente; a chave privada, não.

## 5. Deploy das funções

Depois de configurar o CLI do Supabase e confirmar o projeto correto:

```sh
supabase db push
supabase functions deploy activate-license
supabase functions deploy admin-licenses
```

Confirme que o projeto remoto é o esperado antes de executar os comandos.

## 6. Painel administrativo

Depois do deploy e da configuração das variáveis públicas, abra `/admin/licenses` e informe `VEXORA_ADMIN_SECRET`. O painel permite emitir uma chave, listar licenças, bloquear e remover o vínculo para reativação. A chave emitida aparece apenas na resposta da emissão; copie-a e guarde-a com segurança.

## Limitações desta etapa

- O ID de dispositivo do protótipo web é guardado em localStorage e pode ser apagado/copied; não equivale a um identificador nativo do computador.
- O teste de cinco minutos também depende de dados locais no navegador e pode ser reiniciado se os dados forem apagados.
- A assinatura permite verificar a integridade de uma autorização offline, mas a versão desktop precisa proteger a identidade da instalação e validar a autorização no código nativo.
- A licença offline não pode receber um bloqueio remoto enquanto a máquina permanece desconectada.
- Antes de vender, implemente limitação de tentativas/rate limiting, monitoramento e recuperação administrativa testada. Não considere esta versão web um mecanismo antifraude definitivo.
