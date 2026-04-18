require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// 1. Função auxiliar para criar a estrutura do relatório sempre zerada
const criarBaseRelatorio = () => ({
    usuarios_uni: 0,
    page_views: 0,
    start_funil: 0,
    ja_jogou: 0,
    nao_jogou: 0,
    tem_pc: 0,
    nao_pc: 0,
    click_grupo: 0,
    plays: 0,
    funil_25: 0,
    funil_50: 0,
    funil_75: 0,
    funil_95: 0, // <-- AQUI: Novo funil de 95% adicionado
    funil_100: 0,
    soma_retencao: 0
});

// 2. Função que pega a "sessao" do banco e soma dentro do objeto passado
const somarDadosSessao = (relatorio, sessao) => {
    relatorio.usuarios_uni++;
    relatorio.page_views += (sessao.total_page_views || 1);
    
    if (sessao.clicked_whatsapp) relatorio.start_funil++;
    if (sessao.clicked_whatsapp_2) relatorio.click_grupo++;
    
    if (sessao.plays_gta_rp === true) relatorio.ja_jogou++;
    if (sessao.plays_gta_rp === false) relatorio.nao_jogou++;
    
    if (sessao.has_pc === true) relatorio.tem_pc++;
    if (sessao.has_pc === false) relatorio.nao_pc++;
    
    if (sessao.played_video) {
        relatorio.plays++;
        relatorio.soma_retencao += Number(sessao.exact_percentage_viewed || 0);
    }
    
    // <-- AQUI: Adicionada a verificação para os 95%
    if (sessao.max_percentage_viewed >= 25) relatorio.funil_25++;
    if (sessao.max_percentage_viewed >= 50) relatorio.funil_50++;
    if (sessao.max_percentage_viewed >= 75) relatorio.funil_75++;
    if (sessao.max_percentage_viewed >= 95) relatorio.funil_95++; 
    if (sessao.max_percentage_viewed >= 100) relatorio.funil_100++;
};

app.get('/api/relatorio', async (req, res) => {
    const clientKey = req.headers['x-api-key'] || req.query.key;
    
    /* Descomente esta validação em produção! 
    
    if (!clientKey || clientKey !== process.env.API_KEY) {
        return res.status(401).json({ erro: "Acesso negado. Chave de API inválida ou ausente." });
    }
    */

    try {
        const { inicio, fim } = req.query;

        // 3. Criamos o nosso objeto mestre que vai agrupar os 4 relatórios
        const relatorioAgrupado = {
            geral: criarBaseRelatorio(),
            adsinstagram: criarBaseRelatorio(),
            adstiktok: criarBaseRelatorio(),
            direto: criarBaseRelatorio()
        };

        let from = 0;
        const step = 1000;
        let temMaisDados = true;

        while (temMaisDados) {
            let query = supabase
                .from('video_analytics_sessions')
                .select('*')
                .range(from, from + step - 1);

            // Ajuste do fuso horário e período completo do dia
            if (inicio && fim) {
                let dataInicio = inicio;
                let dataFim = fim;

                // Verifica se a data veio no formato curto (YYYY-MM-DD)
                if (inicio.length === 10) {
                    // Adiciona hora 00:00:00 e o fuso horário do Brasil (-03:00)
                    dataInicio = `${inicio}T00:00:00.000-03:00`;
                }
                if (fim.length === 10) {
                    // Adiciona hora 23:59:59 e o fuso horário do Brasil (-03:00)
                    dataFim = `${fim}T23:59:59.999-03:00`;
                }

                query = query.gte('created_at', dataInicio).lte('created_at', dataFim);
            }

            const { data, error } = await query;

            if (error) throw error;

            if (!data || data.length === 0) {
                temMaisDados = false;
                break;
            }

            data.forEach(sessao => {
                // Sempre somamos no 'geral'
                somarDadosSessao(relatorioAgrupado.geral, sessao);

                // Pegamos o remetente da linha (se for nulo, consideramos 'direto')
                const remetente = sessao.remetente || 'direto';

                // Verificamos se o remetente existe nas chaves que você pediu (adsinstagram, adstiktok, direto)
                if (relatorioAgrupado[remetente]) {
                    somarDadosSessao(relatorioAgrupado[remetente], sessao);
                } else {
                    // Caso venha uma URL maluca que você inventou e não mapeou (ex: /facebook), 
                    // o código vai criar a chave dinamicamente na hora pra você não perder o dado!
                    relatorioAgrupado[remetente] = criarBaseRelatorio();
                    somarDadosSessao(relatorioAgrupado[remetente], sessao);
                }
            });

            if (data.length < step) {
                temMaisDados = false;
            } else {
                from += step;
            }
        }

        if (relatorioAgrupado.geral.usuarios_uni === 0) {
            return res.json({ mensagem: "Nenhum dado encontrado para este período." });
        }

        // 4. Calculamos a média de retenção e limpamos a variável auxiliar de CADA uma das categorias
        for (const chave in relatorioAgrupado) {
            const grupo = relatorioAgrupado[chave];
            
            if (grupo.plays > 0) {
                grupo.media_ret = (grupo.soma_retencao / grupo.plays).toFixed(2);
            } else {
                grupo.media_ret = "0.00";
            }
            
            delete grupo.soma_retencao; // Removemos o dado temporário de soma
        }

        // Retorna o super objeto!
        return res.json(relatorioAgrupado);

    } catch (error) {
        console.error("Erro interno:", error);
        return res.status(500).json({ erro: "Erro ao gerar o relatorio" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});