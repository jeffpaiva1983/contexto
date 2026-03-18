"""
Contexto BR — Pré-computador de Rankings Semânticos
====================================================
Usa o modelo LaBSE (Language-agnostic BERT) para calcular
a similaridade semântica entre todas as palavras do vocabulário.

Requisitos:
    pip install sentence-transformers torch numpy

Uso:
    python gerar_rankings.py

Saída:
    rankings.json  ← coloque este arquivo na pasta do jogo (ao lado de index.html)

Tempo estimado: 1-3 minutos (baixa o modelo ~1.8GB na 1ª vez, depois fica em cache)
"""

import json
import numpy as np
from sentence_transformers import SentenceTransformer

# ─── Vocabulário do jogo ──────────────────────────────────────────────────────
# Estas são as palavras secretas possíveis E as palavras com que o jogador pode chutar.
# Quanto maior o vocabulário, mais rico o jogo — mas também maior o JSON.
# Recomendado: 2000-5000 palavras para um bom equilíbrio.

PALAVRAS_SECRETAS = [
    "oceano", "floresta", "montanha", "cidade", "família", "amizade", "coragem", "sonho",
    "liberdade", "música", "viagem", "saudade", "paixão", "silêncio", "alegria", "medo",
    "esperança", "memória", "tempo", "estrela", "chuva", "vento", "fogo", "terra", "luz",
    "sombra", "mar", "rio", "nuvem", "jardim", "castelo", "dragão", "herói", "magia",
    "aventura", "segredo", "mistério", "destino", "amor", "guerra", "paz", "vitória",
    "derrota", "justiça", "verdade", "mentira", "riqueza", "pobreza", "sabedoria", "natureza",
    "animal", "pássaro", "leão", "tigre", "elefante", "cobra", "borboleta", "abelha",
    "escola", "professor", "livro", "história", "ciência", "arte", "dança", "teatro",
    "comida", "água", "fome", "sede", "saúde", "doença", "remédio", "hospital",
    "casa", "porta", "janela", "telhado", "quarto", "cozinha", "banheiro", "sala",
    "carro", "avião", "barco", "trem", "bicicleta", "moto", "ônibus", "navio",
    "sol", "lua", "planeta", "universo", "galáxia", "cometa", "eclipse", "aurora",
]

# Vocabulário amplo para os chutes do jogador
# Adicione quantas palavras quiser aqui — mais palavras = jogo mais rico
VOCABULARIO_CHUTES = PALAVRAS_SECRETAS + [
    # Natureza
    "praia", "cachoeira", "deserto", "savana", "pântano", "lago", "geleira", "vulcão",
    "terremoto", "tsunami", "furacão", "neve", "gelo", "areia", "pedra", "rocha",
    "árvore", "flor", "folha", "raiz", "semente", "fruto", "galho", "tronco",
    # Animais
    "cachorro", "gato", "cavalo", "vaca", "porco", "galinha", "peixe", "baleia",
    "tubarão", "polvo", "caranguejo", "águia", "coruja", "papagaio", "macaco", "gorila",
    "urso", "lobo", "raposa", "veado", "coelho", "rato", "mosquito", "formiga",
    # Pessoas e relações
    "pai", "mãe", "filho", "filha", "irmão", "irmã", "avô", "avó",
    "amigo", "inimigo", "vizinho", "colega", "chefe", "empregado", "parceiro", "rival",
    "rei", "rainha", "príncipe", "princesa", "guerreiro", "soldado", "médico", "juiz",
    # Emoções e estados
    "feliz", "triste", "bravo", "calmo", "ansioso", "surpreso", "orgulhoso", "envergonhado",
    "cansado", "animado", "entediado", "confuso", "determinado", "frustrado", "aliviado",
    # Lugares
    "país", "estado", "capital", "vila", "bairro", "rua", "praça", "parque",
    "museu", "biblioteca", "igreja", "templo", "mercado", "loja", "restaurante", "hotel",
    "aeroporto", "porto", "estação", "banco", "hospital", "clínica", "delegacia", "prisão",
    # Objetos
    "mesa", "cadeira", "cama", "sofá", "espelho", "relógio", "telefone", "computador",
    "televisão", "rádio", "câmera", "livro", "caderno", "caneta", "faca", "colher",
    "prato", "copo", "garrafa", "sacola", "mochila", "carteira", "chave", "cadeado",
    # Comida
    "pão", "arroz", "feijão", "carne", "frango", "peixe", "ovo", "leite",
    "queijo", "manteiga", "açúcar", "sal", "pimenta", "alho", "cebola", "tomate",
    "banana", "maçã", "laranja", "uva", "morango", "abacaxi", "manga", "melancia",
    # Conceitos abstratos
    "poder", "força", "fraqueza", "inteligência", "ignorância", "bondade", "maldade",
    "beleza", "feiura", "riqueza", "pobreza", "sucesso", "fracasso", "começo", "fim",
    "passado", "presente", "futuro", "vida", "morte", "nascimento", "crescimento",
    # Ações (substantivos derivados)
    "corrida", "luta", "batalha", "celebração", "punição", "recompensa", "sacrifício",
    "descoberta", "invenção", "criação", "destruição", "construção", "reforma",
    # Ciência e tecnologia
    "física", "química", "biologia", "matemática", "astronomia", "medicina", "engenharia",
    "átomo", "célula", "DNA", "vírus", "bactéria", "energia", "eletricidade", "magnetismo",
    "gravidade", "velocidade", "temperatura", "pressão", "volume", "massa", "força",
    # Arte e cultura
    "pintura", "escultura", "fotografia", "cinema", "literatura", "poesia", "filosofia",
    "religião", "tradição", "cultura", "idioma", "língua", "escrita", "alfabeto",
    # Esportes
    "futebol", "basquete", "vôlei", "tênis", "natação", "atletismo", "ginástica",
    "boxe", "judô", "karatê", "surfe", "skate", "ciclismo", "corrida",
]

# Remove duplicatas mantendo a ordem
VOCABULARIO_CHUTES = list(dict.fromkeys(VOCABULARIO_CHUTES))

# ─── Funções ──────────────────────────────────────────────────────────────────
def cosine_similarity(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

def calcular_rankings(modelo, palavras_secretas, vocabulario):
    print(f"\n📊 Calculando rankings para {len(palavras_secretas)} palavras secretas")
    print(f"   contra {len(vocabulario)} palavras do vocabulário...\n")

    # Calcula embeddings do vocabulário completo em batch (mais eficiente)
    print("🔄 Gerando embeddings do vocabulário...")
    embeddings_vocab = modelo.encode(vocabulario, batch_size=64,
                                      show_progress_bar=True, normalize_embeddings=True)

    rankings = {}

    for i, palavra_secreta in enumerate(palavras_secretas):
        print(f"[{i+1}/{len(palavras_secretas)}] Processando: {palavra_secreta}")

        # Embedding da palavra secreta
        emb_secreta = modelo.encode([palavra_secreta], normalize_embeddings=True)[0]

        # Calcula similaridade com todo o vocabulário
        similaridades = []
        for j, palavra_chute in enumerate(vocabulario):
            if palavra_chute.lower() == palavra_secreta.lower():
                sim = 1.0  # Palavra idêntica = rank 1
            else:
                sim = float(np.dot(emb_secreta, embeddings_vocab[j]))
            similaridades.append((palavra_chute, sim))

        # Ordena por similaridade decrescente
        similaridades.sort(key=lambda x: x[1], reverse=True)

        # Monta dicionário {palavra: rank}
        ranking_palavra = {}
        for rank, (palavra, _) in enumerate(similaridades, start=1):
            ranking_palavra[palavra] = rank

        # Garante que a palavra secreta é sempre #1
        ranking_palavra[palavra_secreta] = 1

        rankings[palavra_secreta] = ranking_palavra

    return rankings

# ─── Main ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 60)
    print("  CONTEXTO BR — Gerador de Rankings Semânticos")
    print("=" * 60)
    print("\n🤖 Carregando modelo LaBSE...")
    print("   (Download ~1.8GB na primeira vez — vai ao cache depois)\n")

    # LaBSE: excelente para português e outros idiomas
    modelo = SentenceTransformer("sentence-transformers/LaBSE")

    print("✅ Modelo carregado!\n")

    rankings = calcular_rankings(modelo, PALAVRAS_SECRETAS, VOCABULARIO_CHUTES)

    # Salva o JSON
    output = {
        "meta": {
            "modelo": "LaBSE",
            "total_palavras_secretas": len(PALAVRAS_SECRETAS),
            "total_vocabulario": len(VOCABULARIO_CHUTES),
            "versao": "1.0"
        },
        "rankings": rankings
    }

    with open("rankings.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, separators=(",", ":"))

    size_kb = len(json.dumps(output, ensure_ascii=False)) / 1024
    print(f"\n✅ Pronto! rankings.json gerado com sucesso.")
    print(f"   Tamanho: {size_kb:.0f} KB")
    print(f"   Palavras secretas: {len(PALAVRAS_SECRETAS)}")
    print(f"   Vocabulário: {len(VOCABULARIO_CHUTES)} palavras")
    print(f"\n👉 Copie o rankings.json para a pasta do jogo (ao lado do index.html)")
    print("   e suba no GitHub.\n")
