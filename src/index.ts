import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { z } from "zod";

// Constantes de rendimento baseadas em dados reais
const RENDIMENTO = {
	GASOLINA: 1.0,    // Base de comparação
	ETANOL: 0.7,      // Etanol rende ~70% da gasolina
	GNV: 0.6,         // GNV rende ~60% da gasolina
};

// Validação de preços realistas (Brasil 2024-2025)
const PRECO_MIN = 2.5;
const PRECO_MAX = 10.0;

export class CalculadoraCombustivel extends McpAgent {
	server = new McpServer({
		name: "Calculadora de Combustível v2",
		version: "2.0.0",
	});

	async init() {
		// Tool 1: Qual combustível abastecer (com lógica de rendimento CORRIGIDA)
		this.server.tool(
			"qual_combustivel_abastecer",
			{
				preco_gasolina: z.number().min(PRECO_MIN).max(PRECO_MAX),
				preco_etanol: z.number().min(PRECO_MIN).max(PRECO_MAX),
				preco_gnv: z.number().min(PRECO_MIN).max(PRECO_MAX).optional(),
				modo_saida: z.enum(["completo", "resumido"]).default("completo"),
			},
			async ({ preco_gasolina, preco_etanol, preco_gnv, modo_saida }) => {
				// Calcula custo real por litro equivalente considerando rendimento
				// Custo real = preço / rendimento (porque rende menos, custa mais por km)
				const custo_real_gasolina = preco_gasolina / RENDIMENTO.GASOLINA;
				const custo_real_etanol = preco_etanol / RENDIMENTO.ETANOL;
				const custo_real_gnv = preco_gnv ? preco_gnv / RENDIMENTO.GNV : Infinity;

				// Encontra o mais econômico
				let melhor_opcao = "gasolina";
				let menor_custo = custo_real_gasolina;

				if (custo_real_etanol < menor_custo) {
					melhor_opcao = "etanol";
					menor_custo = custo_real_etanol;
				}

				if (custo_real_gnv < menor_custo) {
					melhor_opcao = "gnv";
					menor_custo = custo_real_gnv;
				}

				// Calcula economia percentual
				const economia_etanol = ((custo_real_gasolina - custo_real_etanol) / custo_real_gasolina) * 100;
				const economia_gnv = preco_gnv ? ((custo_real_gasolina - custo_real_gnv) / custo_real_gasolina) * 100 : null;

				// Output resumido
				if (modo_saida === "resumido") {
					const opcoes = ["🚗 Gasolina"];
					if (economia_etanol > 0) opcoes.push("⛽ Etanol");
					if (economia_gnv && economia_gnv > 0) opcoes.push("🔵 GNV");

					const economia_melhor =
						melhor_opcao === "etanol"
							? economia_etanol
							: melhor_opcao === "gnv"
								? (economia_gnv ?? 0)
								: 0;

					const economia_texto =
						economia_melhor > 0 ? `${economia_melhor.toFixed(1)}%` : "0.0%";

					return {
						content: [{
							type: "text",
							text: `✅ Abasteça com ${melhor_opcao.toUpperCase()}\nEconomia: ${economia_texto}\nOpções viáveis: ${opcoes.join(", ")}`,
						}],
					};
				}

				// Output completo
				let explicacao = "";

				if (melhor_opcao === "gnv") {
					explicacao = `🔵 Abasteça com GNV!

💰 Análise de Custo Real (considerando rendimento):
   Gasolina: R$ ${preco_gasolina.toFixed(2)} → Custo real: R$ ${custo_real_gasolina.toFixed(2)}/L equiv.
   Etanol: R$ ${preco_etanol.toFixed(2)} → Custo real: R$ ${custo_real_etanol.toFixed(2)}/L equiv.
   GNV: R$ ${preco_gnv!.toFixed(2)} → Custo real: R$ ${custo_real_gnv.toFixed(2)}/L equiv.

✅ GNV é ${economia_gnv!.toFixed(1)}% mais econômico que gasolina
💡 Rendimento GNV: ${(RENDIMENTO.GNV * 100).toFixed(0)}% da gasolina

💵 Economia estimada: R$ ${(custo_real_gasolina - custo_real_gnv).toFixed(2)} por litro equivalente`;
				} else if (melhor_opcao === "etanol") {
					explicacao = `⛽ Abasteça com Etanol!

💰 Análise de Custo Real (considerando rendimento):
   Gasolina: R$ ${preco_gasolina.toFixed(2)} → Custo real: R$ ${custo_real_gasolina.toFixed(2)}/L
   Etanol: R$ ${preco_etanol.toFixed(2)} → Custo real: R$ ${custo_real_etanol.toFixed(2)}/L equiv.
   ${preco_gnv ? `GNV: R$ ${preco_gnv.toFixed(2)} → Custo real: R$ ${custo_real_gnv.toFixed(2)}/L equiv.` : ""}

✅ Etanol é ${economia_etanol.toFixed(1)}% mais econômico que gasolina
💡 Rendimento etanol: ${(RENDIMENTO.ETANOL * 100).toFixed(0)}% da gasolina
📊 Relação preço: ${(preco_etanol / preco_gasolina * 100).toFixed(1)}% (ideal: abaixo de 70%)

💵 Economia estimada: R$ ${(custo_real_gasolina - custo_real_etanol).toFixed(2)} por litro equivalente`;
				} else {
					explicacao = `🚗 Abasteça com Gasolina!

💰 Análise de Custo Real (considerando rendimento):
   Gasolina: R$ ${preco_gasolina.toFixed(2)} → Custo real: R$ ${custo_real_gasolina.toFixed(2)}/L
   Etanol: R$ ${preco_etanol.toFixed(2)} → Custo real: R$ ${custo_real_etanol.toFixed(2)}/L equiv.
   ${preco_gnv ? `GNV: R$ ${preco_gnv.toFixed(2)} → Custo real: R$ ${custo_real_gnv.toFixed(2)}/L equiv.` : ""}

❌ Nenhum combustível alternativo compensa
📊 Etanol está ${(preco_etanol / preco_gasolina * 100).toFixed(1)}% do preço (acima de 70%)
${preco_gnv ? `📊 GNV está ${(preco_gnv / preco_gasolina * 100).toFixed(1)}% do preço` : ""}

✅ Gasolina é a melhor opção no momento`;
				}

				return { content: [{ type: "text", text: explicacao }] };
			},
		);

		// Tool 2: Calcular economia em volume específico
		this.server.tool(
			"calcular_economia",
			{
				preco_gasolina: z.number().min(PRECO_MIN).max(PRECO_MAX),
				preco_etanol: z.number().min(PRECO_MIN).max(PRECO_MAX),
				litros: z.number().min(1).max(1000),
				preco_gnv: z.number().min(PRECO_MIN).max(PRECO_MAX).optional(),
			},
			async ({ preco_gasolina, preco_etanol, litros, preco_gnv }) => {
				// Custo real considerando rendimento
				const custo_gasolina = preco_gasolina * litros;
				const litros_etanol_equivalente = (litros * RENDIMENTO.GASOLINA) / RENDIMENTO.ETANOL;
				const custo_etanol = preco_etanol * litros_etanol_equivalente;

				let custo_gnv = Infinity;
				let m3_gnv_equivalente = 0;

				if (preco_gnv) {
					m3_gnv_equivalente = (litros * RENDIMENTO.GASOLINA) / RENDIMENTO.GNV;
					custo_gnv = preco_gnv * m3_gnv_equivalente;
				}

				const economia_etanol = custo_gasolina - custo_etanol;
				const economia_gnv = preco_gnv ? custo_gasolina - custo_gnv : null;

				let melhor = "gasolina";
				let melhor_economia = 0;

				if (economia_etanol > melhor_economia) {
					melhor = "etanol";
					melhor_economia = economia_etanol;
				}

				if (economia_gnv && economia_gnv > melhor_economia) {
					melhor = "gnv";
					melhor_economia = economia_gnv;
				}

				let mensagem = `💰 Análise de Economia para ${litros}L de gasolina:

📊 Custos para mesma distância:
   • Gasolina: ${litros}L × R$ ${preco_gasolina.toFixed(2)} = R$ ${custo_gasolina.toFixed(2)}
   • Etanol: ${litros_etanol_equivalente.toFixed(1)}L × R$ ${preco_etanol.toFixed(2)} = R$ ${custo_etanol.toFixed(2)}
   ${preco_gnv ? `• GNV: ${m3_gnv_equivalente.toFixed(1)}m³ × R$ ${preco_gnv.toFixed(2)} = R$ ${custo_gnv.toFixed(2)}` : ""}

`;

				if (melhor === "etanol") {
					mensagem += `✅ Melhor opção: ETANOL
💵 Economia: R$ ${economia_etanol.toFixed(2)}
📈 Percentual: ${((economia_etanol / custo_gasolina) * 100).toFixed(1)}% mais barato`;
				} else if (melhor === "gnv") {
					mensagem += `✅ Melhor opção: GNV
💵 Economia: R$ ${economia_gnv!.toFixed(2)}
📈 Percentual: ${((economia_gnv! / custo_gasolina) * 100).toFixed(1)}% mais barato`;
				} else {
					const prejuizoEtanol = economia_etanol < 0 ? Math.abs(economia_etanol) : 0;
					const prejuizoGnv = economia_gnv && economia_gnv < 0 ? Math.abs(economia_gnv) : 0;

					mensagem += `⚠️ Nenhuma economia com combustíveis alternativos`;
					if (prejuizoEtanol > 0) {
						mensagem += `\n💸 Prejuízo com etanol: R$ ${prejuizoEtanol.toFixed(2)}`;
					}
					if (preco_gnv && prejuizoGnv > 0) {
						mensagem += `\n💸 Prejuízo com GNV: R$ ${prejuizoGnv.toFixed(2)}`;
					}
					mensagem += `\n✅ Mantenha gasolina!`;
				}

				return { content: [{ type: "text", text: mensagem }] };
			},
		);

		// Tool 3: Comparar viagem entre combustíveis
		this.server.tool(
			"comparar_viagem",
			{
				distancia: z.number().min(1).max(10000),
				consumo_gasolina: z.number().min(3).max(30),
				preco_gasolina: z.number().min(PRECO_MIN).max(PRECO_MAX),
				preco_etanol: z.number().min(PRECO_MIN).max(PRECO_MAX),
				preco_gnv: z.number().min(PRECO_MIN).max(PRECO_MAX).optional(),
			},
			async ({ distancia, consumo_gasolina, preco_gasolina, preco_etanol, preco_gnv }) => {
				const consumo_etanol = consumo_gasolina * RENDIMENTO.ETANOL;
				const consumo_gnv = consumo_gasolina * RENDIMENTO.GNV;

				const litros_gasolina = distancia / consumo_gasolina;
				const litros_etanol = distancia / consumo_etanol;
				const m3_gnv = distancia / consumo_gnv;

				const custo_gasolina = litros_gasolina * preco_gasolina;
				const custo_etanol = litros_etanol * preco_etanol;
				const custo_gnv = preco_gnv ? m3_gnv * preco_gnv : null;

				let mensagem = `🗺️ Comparação de Custo de Viagem - ${distancia} km

⛽ Consumo estimado do veículo: ${consumo_gasolina.toFixed(1)} km/L (gasolina)

💰 GASOLINA:
   • ${litros_gasolina.toFixed(1)}L × R$ ${preco_gasolina.toFixed(2)} = R$ ${custo_gasolina.toFixed(2)}
   • Custo/km: R$ ${(custo_gasolina / distancia).toFixed(3)}

💰 ETANOL:
   • ${litros_etanol.toFixed(1)}L × R$ ${preco_etanol.toFixed(2)} = R$ ${custo_etanol.toFixed(2)}
   • Economia: R$ ${(custo_gasolina - custo_etanol).toFixed(2)} (${((custo_gasolina - custo_etanol) / custo_gasolina * 100).toFixed(1)}%)
   • Custo/km: R$ ${(custo_etanol / distancia).toFixed(3)}
`;

				if (custo_gnv !== null) {
					mensagem += `
💰 GNV:
   • ${m3_gnv.toFixed(1)}m³ × R$ ${preco_gnv!.toFixed(2)} = R$ ${custo_gnv.toFixed(2)}
   • Economia: R$ ${(custo_gasolina - custo_gnv).toFixed(2)} (${((custo_gasolina - custo_gnv) / custo_gasolina * 100).toFixed(1)}%)
   • Custo/km: R$ ${(custo_gnv / distancia).toFixed(3)}
`;
				}

				// Recomendação
				const custos = [
					{ tipo: "gasolina", valor: custo_gasolina },
					{ tipo: "etanol", valor: custo_etanol },
				];

				if (custo_gnv !== null) {
					custos.push({ tipo: "gnv", valor: custo_gnv });
				}

				custos.sort((a, b) => a.valor - b.valor);

				mensagem += `\n✅ Recomendação: ${custos[0].tipo.toUpperCase()} (R$ ${custos[0].valor.toFixed(2)})`;

				return { content: [{ type: "text", text: mensagem }] };
			},
		);

		// Tool 4: Dicas de economia
		this.server.tool("dicas_economia_combustivel", {}, async () => {
			const dicas = `🚗 7 Dicas para Economizar Combustível:

1️⃣ Mantenha os pneus calibrados
   A pressão correta reduz o atrito e economiza até 10% de combustível.

2️⃣ Evite acelerações bruscas
   Acelere suavemente e mantenha velocidade constante. Economia de até 20%!

3️⃣ Desligue o ar-condicionado quando possível
   O AC pode aumentar o consumo em até 20%. Use apenas quando necessário.

4️⃣ Não deixe o carro ligado parado
   Se for ficar parado por mais de 1 minuto, desligue o motor.

5️⃣ Mantenha a manutenção em dia
   Troca de óleo, filtros limpos e velas em bom estado melhoram a eficiência.

6️⃣ Retire peso desnecessário do porta-malas
   Cada 50kg extras aumentam o consumo em até 2%.

7️⃣ Planeje suas rotas
   Evite horários de trânsito intenso e escolha rotas mais diretas.

💡 Seguindo essas dicas, você pode economizar até 30% no consumo!`;

			return { content: [{ type: "text", text: dicas }] };
		});
	}
}

export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);

		if (url.pathname === "/sse" || url.pathname === "/sse/message") {
			return CalculadoraCombustivel.serveSSE("/sse").fetch(request, env, ctx);
		}

		if (url.pathname === "/mcp") {
			return CalculadoraCombustivel.serve("/mcp").fetch(request, env, ctx);
		}

		// Health check endpoint
		if (url.pathname === "/health") {
			return new Response(
				JSON.stringify({
					status: "ok",
					version: "2.0.0",
					tools: [
						"qual_combustivel_abastecer",
						"calcular_economia",
						"comparar_viagem",
						"dicas_economia_combustivel",
					],
				}),
				{ headers: { "Content-Type": "application/json" } }
			);
		}

		return new Response("Not found", { status: 404 });
	},
};
