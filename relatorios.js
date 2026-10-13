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

    // 3. Consulta se o utilizador autenticado é Admin
    let isAdmin = false;
    try {
        const { data: perfil } = await supabaseClient
            .from('perfis')
            .select('role')
            .eq('id', usuarioAtual.id)
            .maybeSingle();

        if (perfil && perfil.role === 'admin') {
            isAdmin = true;
        }
    } catch (e) {
        console.warn('Não foi possível verificar perfil admin:', e);
    }

    // 4. Montar Cabeçalho (Área de Autenticação)
    const areaAuth = document.getElementById('area-autenticacao');
    if (areaAuth && usuarioAtual) {
        let nomeExibicao = 'Usuário';

        const metaNome = usuarioAtual.user_metadata?.nome_completo;
        if (typeof metaNome === 'string' && metaNome.trim().length > 0) {
            nomeExibicao = metaNome.trim().split(' ')[0];
        } else if (usuarioAtual.email) {
            const prefixoEmail = usuarioAtual.email.split('@')[0];
            const apenasLetras = prefixoEmail.replace(/[0-9]/g, '');
            nomeExibicao = apenasLetras.length > 0 
                ? apenasLetras.charAt(0).toUpperCase() + apenasLetras.slice(1) 
                : prefixoEmail;
        }

        const tagAdmin = isAdmin 
            ? ' <span style="background-color: #dbeafe; color: #1d4ed8; font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 9999px; margin-left: 4px;">Admin</span>' 
            : '';

        areaAuth.innerHTML = `
            <span class="usuario-logado-tag">Olá, <strong>${nomeExibicao}</strong>${tagAdmin} 👋</span>
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

    // 5. Procurar agendamentos (RLS entrega todos se for Admin, ou apenas os próprios)
    const { data: agendamentos, error } = await supabaseClient
        .from('agendamentos')
        .select('*')
        .order('data_revisao', { ascending: true });

    if (error) {
        console.error('Erro ao procurar dados para o relatório:', error);
        return;
    }

    const lista = agendamentos || [];

    // 6. Agrupar dados por mês (AAAA-MM)
    const dadosPorMes = {};

    lista.forEach(item => {
        if (!item.data_revisao) return;
        const mesChave = item.data_revisao.substring(0, 7);

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

    const chavesMeses = Object.keys(dadosPorMes).sort();
    if (chavesMeses.length === 0) {
        const hoje = new Date();
        const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
        chavesMeses.push(mesAtual);
        dadosPorMes[mesAtual] = { totalAgendados: 0, compareceram: 0, bonusConfirmado: 0 };
    }

    const rotulos = chavesMeses.map(chave => {
        const [ano, mes] = chave.split('-');
        return `${mes}/${ano}`;
    });

    const valoresBonus = chavesMeses.map(m => dadosPorMes[m].bonusConfirmado);
    const valoresTotal = chavesMeses.map(m => dadosPorMes[m].totalAgendados);
    const valoresPresenca = chavesMeses.map(m => dadosPorMes[m].compareceram);

    // 7. Renderizar Gráfico 1: Evolução do Bónus Realizado
    const canvasBonus = document.getElementById('graficoBonus');
    if (canvasBonus && typeof Chart !== 'undefined') {
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

    // 8. Renderizar Gráfico 2: Volume de Agendamentos & Presença
    const canvasVolume = document.getElementById('graficoVolume');
    if (canvasVolume && typeof Chart !== 'undefined') {
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