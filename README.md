📊 Documentação da API - Relatório de Vídeo (Analytics)
Esta API foi construída para consolidar e calcular dados de retenção e conversão de usuários a partir do banco de dados do Supabase. Ela já lida automaticamente com a paginação de registros (bypassa o limite de 1k do Supabase) e processa os cálculos de retenção em tempo real.

🔗 Endpoint Base
URL Base: https://api-lpmaresia-production.up.railway.app/

🔒 Autenticação
A API é privada e protegida por uma chave de segurança. Todas as requisições precisam incluir o parâmetro key diretamente na URL. Se a chave não for enviada ou estiver errada, a API retornará um erro 401 - Acesso Negado.

📡 Rota Principal

GET /api/relatorio

Retorna o consolidado de métricas gerais e o funil de retenção de vídeo. Pode retornar os dados de todo o período (Lifetime) ou ser filtrada por data.

🎛️ Parâmetros de URL (Query Params)

- key (obrigatório): Sua chave de acesso à API.
- inicio (opcional): Data inicial no formato YYYY-MM-DD.
- fim (opcional): Data final no formato YYYY-MM-DD.

📦 Exemplo de Resposta (JSON)Quando a requisição dá certo (Status 200 OK), a API devolve exatamente os dados neste formato:

{
  "usuarios_uni": 3729,
  "page_views": 4025,
  "start_funil": 167,
  "ja_jogou": 45,
  "nao_jogou": 122,
  "tem_pc": 89,
  "nao_pc": 33,
  "click_grupo": 134,
  "plays": 228,
  "funil_25": 180,
  "funil_50": 138,
  "funil_75": 116,
  "funil_100": 74,
  "media_ret": "60.60"
}

🧠 Entendendo as Métricas (Regras de Negócio)

usuarios_uni: Total de registros/linhas processadas no período.
page_views: Soma bruta da coluna total_page_views.
start_funil: Contagem de usuários que clicaram no WhatsApp 1 (iniciaram o modal).
ja_jogou / nao_jogou: Contagem baseada na resposta da primeira etapa do modal (coluna plays_gta_rp).
tem_pc / nao_pc: Contagem baseada na resposta da segunda etapa do modal (coluna has_pc).
click_grupo: Contagem de usuários que chegaram ao final aprovados e clicaram no botão final do WhatsApp 2.
plays: Quantidade de usuários que de fato iniciaram o vídeo (played_video = true).
funil_X: Quantidade de usuários que assistiram, no mínimo, X% do vídeo.
media_ret: Média exata de retenção calculada exclusivamente sobre a base de usuários que deram Play no vídeo.


🚀 Como Invocar (Exemplos de Uso)

Aqui estão os exemplos práticos de como chamar a sua API dependendo de onde você está puxando os dados:

1. Acesso direto pelo Navegador (Ou PowerBI / Planilhas Google):Basta colar a URL inteira com a chave. Excelente para importar no Excel/Sheets!

Lifetime (Todo o histórico):https://sua-api-aqui.up.railway.app/api/relatorio?key=SUA_CHAVE_AQUI

Filtrando por Datas (Ex: Janeiro de 2024):https://sua-api-aqui.up.railway.app/api/relatorio?key=SUA_CHAVE_AQUI&inicio=2024-01-01&fim=2024-01-31

2. Invocando via JavaScript (Fetch API):Se for construir um painel web próprio depois.

const url = "https://sua-api-aqui.up.railway.app/api/relatorio?key=SUA_CHAVE_AQUI&inicio=2024-04-01";

fetch(url)
  .then(response => response.json())
  .then(dados => {
      console.log("Dados do Relatório:", dados);
      console.log("Média de retenção atual:", dados.media_ret + "%");
  })
  .catch(erro => console.error("Erro ao puxar API:", erro));