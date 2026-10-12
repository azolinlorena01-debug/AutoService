document.addEventListener('DOMContentLoaded', async function() {
    // 1. Configuração do Supabase
    const SUPABASE_URL = 'https://potvtrepcoswvzmkewic.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_iMbay5YOnrrehpqI9qU7HA_vMapr-DY';
    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    // 2. Validação da Sessão
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session || !session.user) {
        window.location.href = 'login.html';
        return;
    }

    const usuarioAtual = session.user;

    const areaAuth = document.getElementById('area-autenticacao');
    if (areaAuth && usuarioAtual) {
        let nomeExibicao = 'Usuário';

        // 1. Tenta obter o nome guardado convertendo com segurança para texto
        const metaNome = usuarioAtual.user_metadata?.nome_completo;
        if (typeof metaNome === 'string' && metaNome.trim().length > 0) {
            nomeExibicao = metaNome.trim().split(' ')[0];
        } 
        // 2. Caso contrário, trata o prefixo do e-mail
        else if (usuarioAtual.email) {
            const prefixoEmail = usuarioAtual.email.split('@')[0];
            const apenasLetras = prefixoEmail.replace(/[0-9]/g, '');
            if (apenasLetras.length > 0) {
                nomeExibicao = apenasLetras.charAt(0).toUpperCase() + apenasLetras.slice(1);
            } else {
                nomeExibicao = prefixoEmail;
            }
        }

        areaAuth.innerHTML = `
            <span class="usuario-logado-tag">Olá, <strong>${nomeExibicao}</strong> 👋</span>
            <button id="btn-sair-header" class="botao-sair-header">Sair</button>
        `;

        const btnSair = document.getElementById('btn-sair-header');
        if (btnSair) {
            btnSair.addEventListener('click', async () => {
                await supabaseClient.auth.signOut();
                window.location.href = 'login.html';
            });
        }
    }

    // 4. Procurar agendamentos do utilizador autenticado
    const { data: agendamentos, error } = await supabaseClient
        .from('agendamentos')
        .select('*')
        .order('data_revisao', { ascending: true });

    if (error) {
        console.error('Erro ao procurar dados para o relatório:', error);
        return;
    }

    const lista = agendamentos || [];

    // 5. Agrupar dados cronologicamente por mês (AAAA-MM)
    const dadosPorMes = {};

    lista.forEach(item => {
        if (!item.data_revisao) return;
        const mesChave = item.data_revisao.substring(0, 7); // Ex: "2026-10"

        if (!dadosPorMes[mesChave]) {
            dadosPorMes[mesChave] = {
                totalAgendados: 0,
                compareceram: 0,
                bonusConfirmado: 0
            };
        }

        dadosPorMes[mesChave].totalAgendados++;

        if (item.status === 'compareceu') {
            dadosPorMes[mesChave].compareceram++;
            dadosPorMes[mesChave].bonusConfirmado += parseFloat(item.valor_unitario) || 0;
        }
    });

    // Se ainda não existirem registos, define o mês corrente como referência visual
    const chavesMeses = Object.keys(dadosPorMes).sort();
    if (chavesMeses.length === 0) {
        const hoje = new Date();
        const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
        chavesMeses.push(mesAtual);
        dadosPorMes[mesAtual] = { totalAgendados: 0, compareceram: 0, bonusConfirmado: 0 };
    }

    // Formatar etiquetas do eixo X (ex: "10/2026")
    const rotulos = chavesMeses.map(chave => {
        const [ano, mes] = chave.split('-');
        return `${mes}/${ano}`;
    });

    const valoresBonus = chavesMeses.map(m => dadosPorMes[m].bonusConfirmado);
    const valoresTotal = chavesMeses.map(m => dadosPorMes[m].totalAgendados);
    const valoresPresenca = chavesMeses.map(m => dadosPorMes[m].compareceram);

    // 6. Renderizar Gráfico 1: Evolução do Bónus Realizado
    const canvasBonus = document.getElementById('graficoBonus');
    if (canvasBonus) {
        new Chart(canvasBonus, {
            type: 'line',
            data: {
                labels: rotulos,
                datasets: [{
                    label: 'Bónus Realizado (R$)',
                    data: valoresBonus,
                    borderColor: '#16a34a',
                    backgroundColor: 'rgba(22, 163, 74, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 5,
                    pointBackgroundColor: '#16a34a'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: valor => `R$ ${valor.toFixed(2).replace('.', ',')}`
                        }
                    }
                }
            }
        });
    }

    // 7. Renderizar Gráfico 2: Volume de Agendamentos & Presença
    const canvasVolume = document.getElementById('graficoVolume');
    if (canvasVolume) {
        new Chart(canvasVolume, {
            type: 'bar',
            data: {
                labels: rotulos,
                datasets: [
                    {
                        label: 'Total Agendado',
                        data: valoresTotal,
                        backgroundColor: '#3b82f6',
                        borderRadius: 4
                    },
                    {
                        label: 'Compareceram',
                        data: valoresPresenca,
                        backgroundColor: '#10b981',
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { precision: 0 }
                    }
                }
            }
        });
    }
});