document.addEventListener('DOMContentLoaded', async function() {
    // Conexão ao Supabase
    const SUPABASE_URL = 'https://potvtrepcoswvzmkewic.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_iMbay5YOnrrehpqI9qU7HA_vMapr-DY';
    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    const filtroMes = document.getElementById('filtro-mes');
    const valorConfirmadoEl = document.querySelector('.bonus-confirmado');
    const valorPrevistoEl = document.querySelector('.bonus-previsto');
    const detalheConfirmadoEl = document.querySelector('.bonus-confirmado')?.parentElement.querySelector('.card-detalhe');
    const gradeGraficos = document.getElementById('grade-graficos');
    const cardGraficoBonus = document.getElementById('card-grafico-bonus');
    const tituloGraficoVolume = document.getElementById('titulo-grafico-volume');
    const subtituloGraficoVolume = document.getElementById('subtitulo-grafico-volume');
    const secaoAdminRanking = document.getElementById('secao-admin-ranking');
    const tabelaCorpoAdmin = document.getElementById('tabela-corpo-admin');

    // Validação de Sessão
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session || !session.user) {
        window.location.href = 'login.html';
        return;
    }
    const usuarioAtual = session.user;

    // Verificar se o utilizador é Administrador
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
        console.warn('Erro ao verificar permissões de admin:', e);
    }

    // Adaptar o layout visual conforme utilizador
    if (isAdmin) {
        // Esconde o cartão de evolução de bónus
        if (cardGraficoBonus) cardGraficoBonus.style.display = 'none';
        // Ajusta a grelha para o gráfico de volume ocupar o topo
        if (gradeGraficos) gradeGraficos.style.gridTemplateColumns = '1fr';
        if (tituloGraficoVolume) tituloGraficoVolume.textContent = 'Volume Total de Agendamentos & Presença (Geral)';
        if (subtituloGraficoVolume) subtituloGraficoVolume.textContent = 'Consolidado de agendamentos e presenças de toda a equipe.';
    }

    // Cabeçalho do Utilizador
    const areaAuth = document.getElementById('area-autenticacao');
    if (areaAuth && usuarioAtual) {
        let nomeExibicao = 'Utilizador';
        const metaNome = usuarioAtual.user_metadata?.nome_completo;
        if (typeof metaNome === 'string' && metaNome.trim().length > 0) {
            nomeExibicao = metaNome.trim().split(' ')[0];
        } else if (usuarioAtual.email) {
            const prefixoEmail = usuarioAtual.email.split('@')[0];
            const apenasLetras = prefixoEmail.replace(/[0-9]/g, '');
            nomeExibicao = apenasLetras.length > 0 ? apenasLetras.charAt(0).toUpperCase() + apenasLetras.slice(1) : prefixoEmail;
        }

        const tagAdmin = isAdmin 
            ? ' <span style="background-color: #dbeafe; color: #1d4ed8; font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 9999px; margin-left: 4px;">Admin</span>' 
            : '';

        areaAuth.innerHTML = `
            <span class="usuario-logado-tag">Olá, <strong>${nomeExibicao}</strong>${tagAdmin} 👋</span>
            <button id="btn-sair-header" class="botao-sair-header">Sair</button>
        `;

        document.getElementById('btn-sair-header')?.addEventListener('click', async () => {
            await supabaseClient.auth.signOut();
            window.location.href = 'login.html';
        });
    }

    // Configuração de datas
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = String(hoje.getMonth() + 1).padStart(2, '0');
    if (filtroMes) {
        filtroMes.value = `${anoAtual}-${mesAtual}`;
    }

    let graficoVolumeInstance = null;
    let graficoBonusInstance = null;

    // 6. Carregamento dos Relatórios
    async function carregarRelatorios() {
        const mesSelecionado = filtroMes.value;
        const fonteTabela = isAdmin ? 'vw_agendamentos_completos' : 'agendamentos';

        const { data: agendamentos, error } = await supabaseClient
            .from(fonteTabela)
            .select('*')
            .order('data_revisao', { ascending: true });

        if (error) {
            console.error('Erro ao recolher dados:', error);
            return;
        }

        const agendamentosDoMes = (agendamentos || []).filter(item => 
            item.data_revisao && item.data_revisao.startsWith(mesSelecionado)
        );

        let totalCompareceu = 0;
        let totalPendente = 0;
        let totalFaltou = 0;
        let somaBonusRealizado = 0;
        let somaBonusPrevisto = 0;

        const operadoresMap = {};

        agendamentosDoMes.forEach(item => {
            const valorUnitario = parseFloat(item.valor_unitario) || 0;
            const status = item.status || 'pendente';

            if (status === 'compareceu') {
                totalCompareceu++;
                somaBonusRealizado += valorUnitario;
                somaBonusPrevisto += valorUnitario;
            } else if (status === 'pendente') {
                totalPendente++;
                somaBonusPrevisto += valorUnitario;
            } else if (status === 'faltou') {
                totalFaltou++;
            }

            // Agrupamento por Operador Administrador
            if (isAdmin) {
                const chave = item.user_id || 'desconhecido';
                const nome = item.autor_nome || 'Operador';
                const email = item.autor_email || 'Sem e-mail';

                if (!operadoresMap[chave]) {
                    operadoresMap[chave] = {
                        nome: nome,
                        email: email,
                        total: 0,
                        compareceu: 0,
                        pendente: 0,
                        faltou: 0
                    };
                }

                operadoresMap[chave].total++;
                if (status === 'compareceu') {
                    operadoresMap[chave].compareceu++;
                } else if (status === 'pendente') {
                    operadoresMap[chave].pendente++;
                } else if (status === 'faltou') {
                    operadoresMap[chave].faltou++;
                }
            }
        });

        // Atualizar cartões 
        if (valorConfirmadoEl) valorConfirmadoEl.textContent = `R$ ${somaBonusRealizado.toFixed(2).replace('.', ',')}`;
        if (valorPrevistoEl) valorPrevistoEl.textContent = `R$ ${somaBonusPrevisto.toFixed(2).replace('.', ',')}`;
        
        if (detalheConfirmadoEl) {
            detalheConfirmadoEl.textContent = `${totalCompareceu} ${totalCompareceu === 1 ? 'presença confirmada' : 'presenças confirmadas'}`;
        }

        // Renderizar o gráfico de Volume & Presença 
        renderizarGraficoVolume(totalCompareceu, totalPendente, totalFaltou);

        // Se for consultor normal, mantém o gráfico de bónus ativo
        if (!isAdmin) {
            renderizarGraficoBonus(agendamentosDoMes);
        }

        // Se for Administrador, preenche a tabela por Operador
        if (isAdmin && secaoAdminRanking && tabelaCorpoAdmin) {
            secaoAdminRanking.style.display = 'block';
            tabelaCorpoAdmin.innerHTML = '';

            const listaOperadores = Object.values(operadoresMap);

            if (listaOperadores.length === 0) {
                tabelaCorpoAdmin.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--texto-secundario);">Nenhum agendamento registado neste mês.</td></tr>';
            } else {
                listaOperadores.sort((a, b) => b.total - a.total);

                listaOperadores.forEach(op => {
                    const taxa = op.total > 0 ? Math.round((op.compareceu / op.total) * 100) : 0;
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>
                            <strong>${op.nome}</strong><br>
                            <span style="font-size: 11px; color: var(--texto-secundario);">${op.email}</span>
                        </td>
                        <td style="text-align: center; font-weight: 600;">${op.total}</td>
                        <td style="text-align: center; color: #16a34a; font-weight: 600;">${op.compareceu}</td>
                        <td style="text-align: center; color: #ca8a04;">${op.pendente}</td>
                        <td style="text-align: center; color: #dc2626;">${op.faltou}</td>
                        <td style="text-align: center;">
                            <span style="background-color: #f1f5f9; padding: 3px 8px; border-radius: 9999px; font-weight: 600; font-size: 12px;">
                                ${taxa}%
                            </span>
                        </td>
                    `;
                    tabelaCorpoAdmin.appendChild(tr);
                });
            }
        } else if (secaoAdminRanking) {
            secaoAdminRanking.style.display = 'none';
        }
    }

    // Funções dos Gráficos 
    function renderizarGraficoVolume(compareceu, pendente, faltou) {
        const ctx = document.getElementById('graficoVolume')?.getContext('2d');
        if (!ctx) return;

        if (graficoVolumeInstance) graficoVolumeInstance.destroy();

        graficoVolumeInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Compareceu', 'Pendente', 'Faltou'],
                datasets: [{
                    data: [compareceu, pendente, faltou],
                    backgroundColor: ['#22c55e', '#eab308', '#ef4444'],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    }

    function renderizarGraficoBonus(agendamentos) {
        const ctx = document.getElementById('graficoBonus')?.getContext('2d');
        if (!ctx) return;

        if (graficoBonusInstance) graficoBonusInstance.destroy();

        const diasMap = {};
        agendamentos.forEach(item => {
            if (item.data_revisao && item.status === 'compareceu') {
                const dia = item.data_revisao.split('-')[2];
                diasMap[dia] = (diasMap[dia] || 0) + (parseFloat(item.valor_unitario) || 0);
            }
        });

        const labels = Object.keys(diasMap).sort((a, b) => a - b).map(d => `Dia ${d}`);
        const valores = Object.keys(diasMap).sort((a, b) => a - b).map(d => diasMap[d]);

        graficoBonusInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels.length > 0 ? labels : ['Sem dados'],
                datasets: [{
                    label: 'O seu Bónus Confirmado (R$)',
                    data: valores.length > 0 ? valores : [0],
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }

    if (filtroMes) {
        filtroMes.addEventListener('change', carregarRelatorios);
    }

    await carregarRelatorios();
});