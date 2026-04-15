require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

app.get('/api/relatorio', async (req, res) => {
    // ---------------------------------------------------------
    // 1. TRAVA DE SEGURANÇA: Verifica a API Key no Header
    // ---------------------------------------------------------
    const clientKey = req.headers['x-api-key'];
    
    if (!clientKey || clientKey !== process.env.API_KEY) {
        return res.status(401).json({ erro: "Acesso negado. Chave de API inválida ou ausente." });
    }

    // ---------------------------------------------------------
    // 2. BUSCA E PROCESSAMENTO DOS DADOS
    // ---------------------------------------------------------
    try {
        const { inicio, fim } = req.query;

        // O objeto do relatório começa zerado
        const relatorio = {
            usuarios_uni: 0,
            page_views: 0,
            start_funil: 0, 
            tem_pc: 0,
            nao_pc: 0,
            click_grupo: 0, 
            plays: 0,
            funil_25: 0,
            funil_50: 0,
            funil_75: 0,
            funil_100: 0,
            soma_retencao: 0, 
            media_ret: 0
        };

        // Configuração do Looping (Paginação infinita)
        let temMaisDados = true;
        let step = 1000; 
        let from = 0;
        let to = step - 1;

        while (temMaisDados) {
            let query = supabase
                .from('video_analytics_sessions')
                .select('*')
                .range(from, to);

            if (inicio) query = query.gte('created_at', inicio);
            if (fim) query = query.lte('created_at', fim);

            const { data, error } = await query;

            if (error) throw error;
            
            // Se o lote vier vazio, paramos o loop
            if (!data || data.length === 0) {
                temMaisDados = false;
                break;
            }

            // Processa as linhas do lote atual
            data.forEach(sessao => {
                relatorio.usuarios_uni++; 
                relatorio.page_views += (sessao.total_page_views || 0);
                
                if (sessao.clicked_whatsapp) relatorio.start_funil++;
                if (sessao.clicked_whatsapp_2) relatorio.click_grupo++;
                
                if (sessao.has_pc === true) relatorio.tem_pc++;
                if (sessao.has_pc === false) relatorio.nao_pc++; 
                
                // Retenção: só conta se o usuário deu play!
                if (sessao.played_video) {
                    relatorio.plays++;
                    relatorio.soma_retencao += Number(sessao.exact_percentage_viewed || 0);
                }
                
                // Funil visual
                if (sessao.max_percentage_viewed >= 25) relatorio.funil_25++;
                if (sessao.max_percentage_viewed >= 50) relatorio.funil_50++;
                if (sessao.max_percentage_viewed >= 75) relatorio.funil_75++;
                if (sessao.max_percentage_viewed >= 100) relatorio.funil_100++;
            });

            // Prepara a próxima página ou encerra se vieram menos de 1000 registros
            if (data.length < step) {
                temMaisDados = false;
            } else {
                from += step;
                to += step;
            }
        }

        // ---------------------------------------------------------
        // 3. MATEMÁTICA FINAL E RESPOSTA
        // ---------------------------------------------------------
        if (relatorio.usuarios_uni === 0) {
            return res.json({ mensagem: "Nenhum dado encontrado para este período." });
        }

        // Calcula a média dividindo SOMENTE pelos plays
        if (relatorio.plays > 0) {
            relatorio.media_ret = (relatorio.soma_retencao / relatorio.plays).toFixed(2);
        } else {
            relatorio.media_ret = "0.00";
        }
        
        delete relatorio.soma_retencao; 

        res.json(relatorio);

    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: "Deu ruim na hora de buscar os dados." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 API com segurança ativada rodando na porta ${PORT}`);
});