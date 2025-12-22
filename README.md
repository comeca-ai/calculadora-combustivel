# Calculadora de Combustivel

Servidor MCP (Model Context Protocol) para calcular qual combustivel abastecer com base nos precos e rendimento real.

## Sobre

Este servidor MCP roda na Cloudflare Workers e pode ser integrado com:
- ChatGPT (via Actions/GPTs)
- Claude Desktop
- Cursor IDE
- Cloudflare AI Playground

## A Regra dos 70%

O etanol tem aproximadamente 70% do poder calorifico da gasolina. Isso significa que voce precisa de mais etanol para percorrer a mesma distancia.

- **Etanol compensa** se custar ate 70% do preco da gasolina
- **GNV compensa** se custar ate 60% do preco da gasolina
- **Gasolina e melhor** quando os alternativos custam mais que esses limites

## Ferramentas Disponiveis

### 1. `qual_combustivel_abastecer`
Calcula qual combustivel e mais economico considerando o rendimento real.

**Parametros:**
| Parametro | Tipo | Obrigatorio | Descricao |
|-----------|------|-------------|-----------|
| preco_gasolina | number | Sim | Preco do litro (R$ 2.50 - 10.00) |
| preco_etanol | number | Sim | Preco do litro (R$ 2.50 - 10.00) |
| preco_gnv | number | Nao | Preco do m3 (R$ 2.50 - 10.00) |
| modo_saida | string | Nao | "completo" ou "resumido" |

**Exemplo:**
```
Gasolina: R$ 5.89, Etanol: R$ 3.99
Resultado: Etanol e 3.2% mais economico
```

### 2. `calcular_economia`
Calcula a economia em reais para um volume especifico.

**Parametros:**
| Parametro | Tipo | Obrigatorio | Descricao |
|-----------|------|-------------|-----------|
| preco_gasolina | number | Sim | Preco do litro |
| preco_etanol | number | Sim | Preco do litro |
| litros | number | Sim | Quantidade (1 - 1000) |
| preco_gnv | number | Nao | Preco do m3 |

### 3. `comparar_viagem`
Compara custos para uma viagem especifica.

**Parametros:**
| Parametro | Tipo | Obrigatorio | Descricao |
|-----------|------|-------------|-----------|
| distancia | number | Sim | Distancia em km (1 - 10000) |
| consumo_gasolina | number | Sim | Consumo do veiculo em km/L (3 - 30) |
| preco_gasolina | number | Sim | Preco do litro |
| preco_etanol | number | Sim | Preco do litro |
| preco_gnv | number | Nao | Preco do m3 |

**Exemplo:**
```
Viagem: 500 km, Consumo: 12 km/L
Gasolina: 41.7L = R$ 245.42
Etanol: 59.5L = R$ 237.50
Economia: R$ 7.92 (3.2%)
```

### 4. `dicas_economia_combustivel`
Retorna 7 dicas praticas para economizar combustivel.

## Instalacao

```bash
# Clonar repositorio
git clone https://github.com/SEU_USUARIO/calculadora-combustivel.git
cd calculadora-combustivel

# Instalar dependencias
npm install

# Gerar tipos do Cloudflare
npm run cf-typegen

# Rodar localmente
npm run dev
```

## Deploy

```bash
# Login na Cloudflare (primeira vez)
npx wrangler login

# Deploy
npm run deploy
```

## Endpoints

| Endpoint | Descricao |
|----------|-----------|
| `/sse` | MCP via Server-Sent Events |
| `/mcp` | MCP via HTTP |
| `/health` | Health check com versao e tools |

## Integracoes

### ChatGPT (Actions/GPTs)
1. Crie um GPT personalizado
2. Adicione uma Action com a URL: `https://seu-worker.workers.dev/sse`
3. As 4 ferramentas serao importadas automaticamente

### Claude Desktop
Adicione ao arquivo de configuracao:
```json
{
  "mcpServers": {
    "calculadora-combustivel": {
      "command": "npx",
      "args": ["mcp-remote", "https://seu-worker.workers.dev/sse"]
    }
  }
}
```

### Cloudflare AI Playground
1. Acesse: https://playground.ai.cloudflare.com/
2. Conecte usando a URL do seu worker

## Tecnologias

- [Cloudflare Workers](https://workers.cloudflare.com/) - Serverless edge computing
- [MCP Protocol](https://modelcontextprotocol.io/) - Model Context Protocol
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Zod](https://zod.dev/) - Schema validation

## Scripts

```bash
npm run dev        # Desenvolvimento local
npm run deploy     # Deploy para Cloudflare
npm run type-check # Verificar tipos TypeScript
npm run cf-typegen # Gerar tipos do Cloudflare
```

## Licenca

MIT
