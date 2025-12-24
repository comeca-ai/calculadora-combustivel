from fastmcp import FastMCP

mcp = FastMCP("calculadora-combustivel")

# Constantes de rendimento baseadas em dados reais
RENDIMENTO = {
    "GASOLINA": 1.0,    # Base de comparacao
    "ETANOL": 0.7,      # Etanol rende ~70% da gasolina
    "GNV": 0.6,         # GNV rende ~60% da gasolina
}

# Validacao de precos realistas (Brasil 2024-2025)
PRECO_MIN = 2.5
PRECO_MAX = 10.0


@mcp.tool()
def qual_combustivel_abastecer(
    preco_gasolina: float,
    preco_etanol: float,
    preco_gnv: float = None,
    modo_saida: str = "completo"
) -> dict:
    """Use this to determine which fuel is more economical to use.
    Compares gasoline, ethanol and CNG considering efficiency.

    Args:
        preco_gasolina: Gasoline price per liter (R$)
        preco_etanol: Ethanol price per liter (R$)
        preco_gnv: CNG price per m3 (R$) - optional
        modo_saida: "completo" for detailed analysis, "resumido" for quick answer
    """

    # Calcula custo real por litro equivalente considerando rendimento
    custo_real_gasolina = preco_gasolina / RENDIMENTO["GASOLINA"]
    custo_real_etanol = preco_etanol / RENDIMENTO["ETANOL"]
    custo_real_gnv = preco_gnv / RENDIMENTO["GNV"] if preco_gnv else float('inf')

    # Encontra o mais economico
    melhor_opcao = "gasolina"
    menor_custo = custo_real_gasolina

    if custo_real_etanol < menor_custo:
        melhor_opcao = "etanol"
        menor_custo = custo_real_etanol

    if custo_real_gnv < menor_custo:
        melhor_opcao = "gnv"
        menor_custo = custo_real_gnv

    # Calcula economia percentual
    economia_etanol = ((custo_real_gasolina - custo_real_etanol) / custo_real_gasolina) * 100
    economia_gnv = ((custo_real_gasolina - custo_real_gnv) / custo_real_gasolina) * 100 if preco_gnv else None

    # Relacao etanol/gasolina
    relacao_etanol = (preco_etanol / preco_gasolina) * 100

    return {
        "recomendacao": melhor_opcao.upper(),
        "analise": {
            "gasolina": {
                "preco": preco_gasolina,
                "custo_real": round(custo_real_gasolina, 2),
                "rendimento": "100%"
            },
            "etanol": {
                "preco": preco_etanol,
                "custo_real": round(custo_real_etanol, 2),
                "rendimento": "70%",
                "economia_vs_gasolina": f"{economia_etanol:.1f}%",
                "relacao_preco": f"{relacao_etanol:.1f}%",
                "compensa": relacao_etanol < 70
            },
            "gnv": {
                "preco": preco_gnv,
                "custo_real": round(custo_real_gnv, 2) if preco_gnv else None,
                "rendimento": "60%",
                "economia_vs_gasolina": f"{economia_gnv:.1f}%" if economia_gnv else None
            } if preco_gnv else None
        },
        "explicacao": f"Abasteça com {melhor_opcao.upper()}! " + (
            f"Economia de {economia_etanol:.1f}% vs gasolina." if melhor_opcao == "etanol"
            else f"Economia de {economia_gnv:.1f}% vs gasolina." if melhor_opcao == "gnv"
            else "Nenhum combustivel alternativo compensa no momento."
        ),
        "dica": "Etanol compensa quando preco <= 70% da gasolina"
    }


@mcp.tool()
def calcular_economia(
    preco_gasolina: float,
    preco_etanol: float,
    litros: float,
    preco_gnv: float = None
) -> dict:
    """Use this to calculate how much you save with a specific fuel volume.

    Args:
        preco_gasolina: Gasoline price per liter (R$)
        preco_etanol: Ethanol price per liter (R$)
        litros: Amount of gasoline liters as reference
        preco_gnv: CNG price per m3 (R$) - optional
    """

    # Custo com gasolina
    custo_gasolina = preco_gasolina * litros

    # Litros equivalentes de etanol (precisa mais litros por menor rendimento)
    litros_etanol_equivalente = (litros * RENDIMENTO["GASOLINA"]) / RENDIMENTO["ETANOL"]
    custo_etanol = preco_etanol * litros_etanol_equivalente

    # m3 equivalentes de GNV
    m3_gnv_equivalente = None
    custo_gnv = None
    if preco_gnv:
        m3_gnv_equivalente = (litros * RENDIMENTO["GASOLINA"]) / RENDIMENTO["GNV"]
        custo_gnv = preco_gnv * m3_gnv_equivalente

    # Economia
    economia_etanol = custo_gasolina - custo_etanol
    economia_gnv = custo_gasolina - custo_gnv if custo_gnv else None

    # Melhor opcao
    melhor = "gasolina"
    melhor_economia = 0

    if economia_etanol > melhor_economia:
        melhor = "etanol"
        melhor_economia = economia_etanol

    if economia_gnv and economia_gnv > melhor_economia:
        melhor = "gnv"
        melhor_economia = economia_gnv

    return {
        "referencia": f"{litros}L de gasolina",
        "custos": {
            "gasolina": {
                "quantidade": f"{litros}L",
                "custo": round(custo_gasolina, 2)
            },
            "etanol": {
                "quantidade": f"{litros_etanol_equivalente:.1f}L",
                "custo": round(custo_etanol, 2),
                "economia": round(economia_etanol, 2)
            },
            "gnv": {
                "quantidade": f"{m3_gnv_equivalente:.1f}m³",
                "custo": round(custo_gnv, 2),
                "economia": round(economia_gnv, 2)
            } if preco_gnv else None
        },
        "melhor_opcao": melhor.upper(),
        "economia_total": round(melhor_economia, 2),
        "percentual_economia": f"{(melhor_economia / custo_gasolina * 100):.1f}%" if melhor_economia > 0 else "0%"
    }


@mcp.tool()
def comparar_viagem(
    distancia: float,
    consumo_gasolina: float,
    preco_gasolina: float,
    preco_etanol: float,
    preco_gnv: float = None
) -> dict:
    """Use this to compare fuel costs for a specific trip distance.

    Args:
        distancia: Trip distance in km
        consumo_gasolina: Vehicle consumption in km/L with gasoline
        preco_gasolina: Gasoline price per liter (R$)
        preco_etanol: Ethanol price per liter (R$)
        preco_gnv: CNG price per m3 (R$) - optional
    """

    # Consumo com cada combustivel
    consumo_etanol = consumo_gasolina * RENDIMENTO["ETANOL"]
    consumo_gnv = consumo_gasolina * RENDIMENTO["GNV"]

    # Quantidade necessaria
    litros_gasolina = distancia / consumo_gasolina
    litros_etanol = distancia / consumo_etanol
    m3_gnv = distancia / consumo_gnv

    # Custos
    custo_gasolina = litros_gasolina * preco_gasolina
    custo_etanol = litros_etanol * preco_etanol
    custo_gnv = m3_gnv * preco_gnv if preco_gnv else None

    # Custo por km
    custo_km_gasolina = custo_gasolina / distancia
    custo_km_etanol = custo_etanol / distancia
    custo_km_gnv = custo_gnv / distancia if custo_gnv else None

    # Ordenar por custo
    opcoes = [
        {"tipo": "GASOLINA", "custo": custo_gasolina},
        {"tipo": "ETANOL", "custo": custo_etanol},
    ]
    if custo_gnv:
        opcoes.append({"tipo": "GNV", "custo": custo_gnv})

    opcoes.sort(key=lambda x: x["custo"])

    return {
        "viagem": f"{distancia} km",
        "consumo_veiculo": f"{consumo_gasolina} km/L (gasolina)",
        "comparativo": {
            "gasolina": {
                "quantidade": f"{litros_gasolina:.1f}L",
                "custo_total": round(custo_gasolina, 2),
                "custo_por_km": round(custo_km_gasolina, 3)
            },
            "etanol": {
                "quantidade": f"{litros_etanol:.1f}L",
                "custo_total": round(custo_etanol, 2),
                "custo_por_km": round(custo_km_etanol, 3),
                "economia": round(custo_gasolina - custo_etanol, 2)
            },
            "gnv": {
                "quantidade": f"{m3_gnv:.1f}m³",
                "custo_total": round(custo_gnv, 2),
                "custo_por_km": round(custo_km_gnv, 3),
                "economia": round(custo_gasolina - custo_gnv, 2)
            } if preco_gnv else None
        },
        "ranking": [o["tipo"] for o in opcoes],
        "recomendacao": opcoes[0]["tipo"],
        "melhor_custo": round(opcoes[0]["custo"], 2)
    }


@mcp.tool()
def dicas_economia_combustivel() -> dict:
    """Use this to get tips on how to save fuel.
    Returns 7 practical tips for fuel economy."""

    return {
        "titulo": "7 Dicas para Economizar Combustivel",
        "dicas": [
            {
                "numero": 1,
                "titulo": "Mantenha os pneus calibrados",
                "descricao": "A pressao correta reduz o atrito e economiza ate 10% de combustivel.",
                "economia_potencial": "ate 10%"
            },
            {
                "numero": 2,
                "titulo": "Evite aceleracoes bruscas",
                "descricao": "Acelere suavemente e mantenha velocidade constante.",
                "economia_potencial": "ate 20%"
            },
            {
                "numero": 3,
                "titulo": "Desligue o ar-condicionado quando possivel",
                "descricao": "O AC pode aumentar o consumo em ate 20%. Use apenas quando necessario.",
                "economia_potencial": "ate 20%"
            },
            {
                "numero": 4,
                "titulo": "Nao deixe o carro ligado parado",
                "descricao": "Se for ficar parado por mais de 1 minuto, desligue o motor.",
                "economia_potencial": "variavel"
            },
            {
                "numero": 5,
                "titulo": "Mantenha a manutencao em dia",
                "descricao": "Troca de oleo, filtros limpos e velas em bom estado melhoram a eficiencia.",
                "economia_potencial": "ate 15%"
            },
            {
                "numero": 6,
                "titulo": "Retire peso desnecessario do porta-malas",
                "descricao": "Cada 50kg extras aumentam o consumo em ate 2%.",
                "economia_potencial": "ate 5%"
            },
            {
                "numero": 7,
                "titulo": "Planeje suas rotas",
                "descricao": "Evite horarios de transito intenso e escolha rotas mais diretas.",
                "economia_potencial": "ate 15%"
            }
        ],
        "resumo": "Seguindo essas dicas, voce pode economizar ate 30% no consumo!",
        "regra_de_ouro": "Etanol compensa quando seu preco for ate 70% do preco da gasolina"
    }
