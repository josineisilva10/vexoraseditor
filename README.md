# VEXORA SAMPLER

Sampler de áudio com identidade visual neon, desenvolvido em React + TypeScript.

## Funcionalidades na interface web

- Pads configuráveis associados a teclas físicas usando `KeyboardEvent.code`.
- Layout visual com teclas de função, letras, números, navegação, modificadoras e teclado numérico.
- Importação local de arquivos de áudio suportados pelo navegador.
- Reprodução de sons, loop, volume por pad, volume master, mudo, pausa, retomada, stop, busca na faixa e Stop Geral.
- Limite configurável de sons simultâneos.
- Três bancos independentes (A, B e C).
- Preferências e associações guardadas no armazenamento local; os áudios importados são guardados em IndexedDB.
- Papel de parede importado e guardado localmente.
- Exportação de configuração JSON.
- Interface responsiva para computador e telas menores.

## Desenvolvimento

Requisitos: Node.js 22 ou compatível e npm.

```sh
npm ci
npm run dev
```

Verificação de produção:

```sh
npm run build
npm test -- --passWithNoTests
```

## Estado da implementação

Esta branch contém a implementação da interface web e das funções de reprodução que funcionam dentro da página. A workflow `.github/workflows/verify.yml` tenta validar a compilação a cada push e pull request.

**Ainda não é a versão desktop completa para Windows.** Atalhos globais quando outro aplicativo está em primeiro plano, motor nativo de áudio de baixa latência, seleção real de dispositivo/buffer, instalador Windows e testes em Windows exigem integração e compilação desktop. Não considerar esses recursos implementados até que a camada nativa seja adicionada e testada.

## Persistência e privacidade

O aplicativo guarda arquivos e configurações no armazenamento local do navegador. Limpar os dados do navegador pode apagar esses dados; exporte a configuração e mantenha cópias dos arquivos originais. A exportação JSON contém metadados e associações, não os próprios arquivos de áudio.

Não há upload automático de áudios ou imagens para um servidor.
