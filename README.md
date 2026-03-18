# Contexto BR — PWA

Jogo de palavras por similaridade semântica em português, com suporte a PWA.

## Arquivos

```
contexto-pwa/
├── index.html      ← App principal (HTML + CSS completo)
├── app.js          ← Lógica do jogo + chamadas à API
├── sw.js           ← Service Worker (cache offline)
├── manifest.json   ← Manifesto PWA
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

## Como publicar (opções gratuitas)

### Opção 1 — Netlify (recomendado, mais fácil)
1. Acesse https://netlify.com e crie uma conta
2. Arraste a pasta `contexto-pwa/` para o painel do Netlify
3. Pronto! Você receberá uma URL como `https://contexto-br.netlify.app`

### Opção 2 — Vercel
1. Acesse https://vercel.com
2. Instale a CLI: `npm i -g vercel`
3. Na pasta do projeto: `vercel --prod`

### Opção 3 — GitHub Pages
1. Crie um repositório no GitHub e suba os arquivos
2. Vá em Settings → Pages → selecione a branch main
3. O site ficará em `https://seuuser.github.io/contexto-br`

## Importante

O jogo usa a **API do Claude** para calcular a similaridade semântica.
A chave de API é gerenciada pelo ambiente do Claude.ai — se você hospedar
externamente, precisará configurar um backend proxy para proteger sua
chave de API (nunca exponha a chave no frontend público).

## PWA — Instalação no celular

- **Android (Chrome):** Banner de instalação aparece automaticamente após 5s
- **iPhone (Safari):** Toque em "Compartilhar" → "Adicionar à Tela de Início"

## Funcionalidades

- 📅 Palavra do Dia — mesma palavra para todos os jogadores no mesmo dia
- 🎲 Modo Livre — jogue quantas vezes quiser com palavras aleatórias
- 🌡️ Escala de calor — ranking visual de #1 a #10.000
- 📱 100% responsivo — funciona em qualquer tamanho de tela
- 📲 PWA — instalável como app nativo no celular
- ✈️ Offline parcial — shell do app funciona sem internet (precisa de conexão para as jogadas)
