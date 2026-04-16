require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

app.get('/api/relatorio', async (req, res) => {
    const clientKey = req.headers['x-api-key'] || req.query.key;
    
    if (!clientKey || clientKey !== process.env.API_KEY) {
        return res.status(401).json({ erro: "Acesso negado. Chave de API inválida ou ausente." });
    }

    try {
        // ✅ CORREÇÃO: era "fim", mas a URL manda "final"
        const { inicio, final } = req.query;

        const relatorio = {
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
            funil_100: 0,
            soma_retencao: 0, 
            media_ret: 0
        };

        let startDateISO, endDateISO;

        if (inicio) {
            // 00:00:00 Brasília = 03:00:00 UTC
            startDateISO = new Date(`${inicio}T03:00:00Z`).toISOString();
        }

        if (final) {
            // 23:59:59 Brasília = dia seguinte 02:59:59 UTC
            const endDate = new Date(`${final}T02:59:59Z`);
            endDate.setUTCDate(endDate.getUTCDate() + 1);
            endDateISO = endDate.toISOString();
        }

        let temMaisDados = true;
        let step = 1000; 
        let from = 0;
        let to = step - 1;

        while (temMaisDados) {
            let query = supabase
                .from('video_analytics_sessions')
                .select('*')
                .range(from, to);

            if (startDateISO) query = query.gte('created_at', startDateISO);
            if (endDateISO) query = query.lte('created_at', endDateISO);

            const { data, error } = await query;

            if (error) throw error;
            
            if (!data || data.length === 0) {
                temMaisDados = false;
                break;
            }

            data.forEach(sessao => {
                relatorio.usuarios_uni++; 
                relatorio.page_views += (sessao.total_page_views || 0);
                
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
                
                if (sessao.max_percentage_viewed >= 25) relatorio.funil_25++;
                if (sessao.max_percentage_viewed >= 50) relatorio.funil_50++;
                if (sessao.max_percentage_viewed >= 75) relatorio.funil_75++;
                if (sessao.max_percentage_viewed >= 100) relatorio.funil_100++;
            });

            if (data.length < step) {
                temMaisDados = false;
            } else {
                from += step;
                to += step;
            }
        }

        if (relatorio.usuarios_uni === 0) {
            return res.json({ mensagem: "Nenhum dado encontrado para este período." });
        }

        if (relatorio.plays > 0) {
            relatorio.media_ret = (relatorio.soma_retencao / relatorio.plays).toFixed(2);
        } else {
            relatorio.media_ret = "0.00";
        }
        
        delete relatorio.soma_retencao; 

        res.json(relatorio);

    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: "Erro ao buscar dados." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 API (Fix fim→final) rodando na porta ${PORT}`);
});