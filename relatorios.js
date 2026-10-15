/* ==========================================================================
   CADERNO DE ESTUDOS - JAVASCRIPT (relatorios.js)
   Objetivo do arquivo:
   1. Validar autenticação e perfil (Admin vs Consultor).
   2. Calcular fórmulas de bônus considerando a nota de auditoria (Monitoria).
   3. Renderizar gráficos com Chart.js (Doughnut e Bar Charts).
   4. Permitir drill-down no Admin (ver todas as equipes ou focar em uma equipe).
   5. Responder a parâmetros de URL (?imprimir=true) para automação de PDF.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async function() {
    // 1. CONEXÃO COM O BACKEND
    const SUPABASE_URL = 'https://potvtrepcoswvzmkewic.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_iMbay5YOnrrehpqI9qU7HA_vMapr-DY';
    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    // Dicionário de metas por equipe configurado na regra de negócio da concessionária
    const METAS_POR_EQUIPE = {
        'Pós-Venda': 80,
        'Equipe Alfa': 100,
        'Equipe Beta': 100,
        'Geral': 100
    };
    const META_PADRAO = 100;

    // 2. CAPTURA DE ELEMENTOS HTML (DOM)
    const secaoFiltrosAdmin = document.getElementById('secao-filtros-admin');
    const metricasResumoAdmin = document.getElementById('metricas-resumo-admin');
    const filtroMesAdmin = document.getElementById('filtro-mes-admin');
    const filtroEquipeAdmin = document.getElementById('filtro-equipe-admin');
    const adminTotalAgendados = document.getElementById('admin-total-agendados');
    const adminTotalCompareceu = document.getElementById('admin-total-compareceu');
    const adminTaxaPresenca = document.getElementById('admin-taxa-presenca');
    const adminTotalPendente = document.getElementById('admin-total-pendente');
    const adminTotalFaltas = document.getElementById('admin-total-faltas');

    const secaoMetricasConsultor = document.getElementById('secao-metricas-consultor');
    const filtroMesConsultor = document.getElementById('filtro-mes-consultor');
    const valorConfirmadoEl = document.querySelector('.bonus-confirmado');
    const valorPrevistoEl = document.querySelector('.bonus-previsto');
    const detalheConfirmadoEl = document.querySelector('.bonus-confirmado')?.parentElement.querySelector('.card-detalhe');
    const inputMonitoria = document.getElementById('input-monitoria');
    const badgeAjusteMonitoria = document.getElementById('badge-ajuste-monitoria');

    const linkMenuImportar = document.getElementById('link-menu-importar');
    const secaoMetaEquipe = document.getElementById('secao-meta-equipe');
    const tituloMetaEquipe = document.getElementById('titulo-meta-equipe');
    const textoProgressoMeta = document.getElementById('texto-progresso-meta');
    const textoRestanteMeta = document.getElementById('texto-restante-meta');
    const barraProgressoMeta = document.getElementById('barra-progresso-meta');

    const gradeGraficos = document.getElementById('grade-graficos');
    const cardGraficoBonusMensal = document.getElementById('card-grafico-bonus-mensal');
    const cardGraficoEquipe = document.getElementById('card-grafico-equipe');
    const tituloGraficoVolume = document.getElementById('titulo-grafico-volume');
    const subtituloGraficoVolume = document.getElementById('subtitulo-grafico-volume');
    const tituloGraficoEquipe = document.getElementById('titulo-grafico-equipe');
    const subtituloGraficoEquipe = document.getElementById('subtitulo-grafico-equipe');

    const secaoAdminRanking = document.getElementById('secao-admin-ranking');
    const tituloTabelaAdmin = document.getElementById('titulo-tabela-admin');
    const subtituloTabelaAdmin = document.getElementById('subtitulo-tabela-admin');
    const tabelaCabecalhoAdmin = document.getElementById('tabela-cabecalho-admin');
    const tabelaCorpoAdmin = document.getElementById('tabela-corpo-admin');
    const btnVoltarAdmin = document.getElementById('btn-voltar-admin');

    // 3. SEGURANÇA E AUTHENTICATION GUARD
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session || !session.user) {
        window.location.href = 'login.html';
        return;
    }
    const usuarioAtual = session.user;

    // Busca o papel (role) e a equipe do usuário logado
    let isAdmin = false;
    let equipeUsuario = 'Geral';
    try {
        const { data: perfil } = await supabaseClient
            .from('perfis')
            .select('role, equipe')
            .eq('id', usuarioAtual.id)
            .maybeSingle();

        if (perfil) {
            if (perfil.role === 'admin') isAdmin = true;
            if (perfil.equipe) equipeUsuario = perfil.equipe;
        }
    } catch (e) {
        console.warn('Erro ao carregar permissões:', e);
    }

    // 4. CONFIGURAÇÃO VISUAL INICIAL POR PAPEL
    if (isAdmin) {
        if (linkMenuImportar) linkMenuImportar.classList.remove('oculto');
        if (secaoFiltrosAdmin) secaoFiltrosAdmin.classList.remove('oculto');
        if (metricasResumoAdmin) metricasResumoAdmin.classList.remove('oculto');
        if (secaoMetricasConsultor) secaoMetricasConsultor.classList.add('oculto');
    } else {
        if (linkMenuImportar) linkMenuImportar.classList.add('oculto');
        if (secaoFiltrosAdmin) secaoFiltrosAdmin.classList.add('oculto');
        if (metricasResumoAdmin) metricasResumoAdmin.classList.add('oculto');
        if (secaoMetricasConsultor) secaoMetricasConsultor.classList.remove('oculto');
    }

    // 5. CABEÇALHO DO USUÁRIO LOGADO
    const areaAuth = document.getElementById('area-autenticacao');
    if (areaAuth && usuarioAtual) {
        let nomeExibicao = 'Usuário';
        const metaNome = usuarioAtual.user_metadata?.nome_completo;
        if (typeof metaNome === 'string' && metaNome.trim().length > 0) {
            nomeExibicao = metaNome.trim().split(' ')[0];
        } else if (usuarioAtual.email) {
            const prefixoEmail = usuarioAtual.email.split('@')[0];
            const apenasLetras = prefixoEmail.replace(/[0-9]/g, '');
            nomeExibicao = apenasLetras.length > 0 ? apenasLetras.charAt(0).toUpperCase() + apenasLetras.slice(1) : prefixoEmail;
        }

        const tagAdmin = isAdmin ? '<span class="tag-badge-admin">Admin</span>' : '';
        const tagEquipe = !isAdmin ? `<span class="tag-badge-equipe">${equipeUsuario}</span>` : '';

        areaAuth.innerHTML = `
            <span class="usuario-logado-tag">Olá, <strong>${nomeExibicao}</strong>${tagEquipe}${tagAdmin}</span>
            <button id="btn-sair-header" class="botao-sair-header">Sair</button>
        `;

        document.getElementById('btn-sair-header')?.addEventListener('click', async () => {
            await supabaseClient.auth.signOut();
            window.location.href = 'login.html';
        });
    }

    // Inicialização do mês padrão
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = String(hoje.getMonth() + 1).padStart(2, '0');
    const valorMesPadrao = `${anoAtual}-${mesAtual}`;

    if (filtroMesAdmin) filtroMesAdmin.value = valorMesPadrao;
    if (filtroMesConsultor) filtroMesConsultor.value = valorMesPadrao;

    // Instâncias do Chart.js (armazenadas em variáveis para destruição antes do redraw)
    let graficoVolumeInstance = null;
    let graficoBonusMensalInstance = null;
    let graficoEquipeInstance = null;
    let todosAgendamentosHistorico = [];
    let agendamentosMesAtual = [];

    // 6. POPULA O SELECT DE EQUIPES PARA O ADMIN
    async function carregarOpcoesEquipes() {
        if (!isAdmin || !filtroEquipeAdmin) return;
        try {
            const { data: perfis } = await supabaseClient.from('perfis').select('equipe');
            const listaEquipes = new Set();
            (perfis || []).forEach(p => {
                if (p.equipe && p.equipe.trim().length > 0) listaEquipes.add(p.equipe.trim());
            });
            ['Pós-Venda', 'Equipe Alfa', 'Equipe Beta'].forEach(e => listaEquipes.add(e));
            const equipesOrdenadas = [...listaEquipes].sort();

            filtroEquipeAdmin.innerHTML = '<option value="todas">Todas as Equipes</option>';
            equipesOrdenadas.forEach(eq => {
                const opt = document.createElement('option');
                opt.value = eq;
                opt.textContent = eq;
                filtroEquipeAdmin.appendChild(opt);
            });
        } catch (e) {
            console.warn('Erro ao carregar lista de equipes:', e);
        }
    }

    // 7. CARREGAMENTO DOS DADOS NO SUPABASE
    async function carregarDados() {
        const mesSelecionado = isAdmin ? filtroMesAdmin.value : filtroMesConsultor.value;

        if (isAdmin) {
            // O Admin baixa todos os dados do banco para ter visão holística
            const { data, error } = await supabaseClient
                .from('vw_agendamentos_completos')
                .select('*')
                .order('data_revisao', { ascending: true });

            if (error) return console.error(error);
            todosAgendamentosHistorico = data || [];
        } else {
            // O Consultor só baixa os dados da sua própria equipe
            const { data, error } = await supabaseClient
                .from('vw_agendamentos_completos')
                .select('*')
                .eq('autor_equipe', equipeUsuario)
                .order('data_revisao', { ascending: true });

            if (error) return console.error(error);
            todosAgendamentosHistorico = data || [];
        }

        // Filtra os agendamentos do mês selecionado
        agendamentosMesAtual = todosAgendamentosHistorico.filter(item =>
            item.data_revisao && item.data_revisao.startsWith(mesSelecionado)
        );

        aplicarVisaoRelatorio();
    }

    // 8. CÁLCULO DE REGRAS DE NEGÓCIO E MONTAGEM DA INTERFACE
    function aplicarVisaoRelatorio() {
        if (!isAdmin) {
            // ==========================================
            // LÓGICA DO CONSULTOR
            // ==========================================
            if (secaoAdminRanking) secaoAdminRanking.classList.add('oculto');
            if (secaoMetaEquipe) secaoMetaEquipe.classList.remove('oculto');

            if (gradeGraficos) {
                gradeGraficos.classList.add('grid-duas-colunas');
                gradeGraficos.classList.remove('grid-coluna-unica');
            }
            if (cardGraficoBonusMensal) cardGraficoBonusMensal.classList.remove('oculto');
            if (cardGraficoEquipe) {
                cardGraficoEquipe.classList.remove('oculto');
                cardGraficoEquipe.classList.add('card-grafico-expansivel');
            }

            // FÓRMULA DE AUDITORIA / MONITORIA:
            // Nota >= 80% ganha multiplicador de 1.10 (+10% no bônus)
            // Nota < 80% ganha multiplicador de 0.90 (-10% no bônus)
            let notaMonitoria = inputMonitoria ? parseFloat(inputMonitoria.value) : 100;
            if (isNaN(notaMonitoria)) notaMonitoria = 100;

            let fatorMonitoria = 1.0;
            if (notaMonitoria >= 80) {
                fatorMonitoria = 1.10;
                if (badgeAjusteMonitoria) {
                    badgeAjusteMonitoria.textContent = '+10% Bônus';
                    badgeAjusteMonitoria.className = 'badge-ajuste-monitoria';
                }
            } else {
                fatorMonitoria = 0.90;
                if (badgeAjusteMonitoria) {
                    badgeAjusteMonitoria.textContent = '-10% Redução';
                    badgeAjusteMonitoria.className = 'badge-ajuste-monitoria-reducao';
                }
            }

            const meusAgendamentosMes = agendamentosMesAtual.filter(item => item.user_id === usuarioAtual.id);
            let totalCompareceu = 0, totalPendente = 0, totalFaltou = 0, somaBonusBaseRealizado = 0, somaBonusBasePrevisto = 0;

            meusAgendamentosMes.forEach(item => {
                const valorUnitario = parseFloat(item.valor_unitario) || 0;
                const status = item.status || 'pendente';

                if (status === 'compareceu') {
                    totalCompareceu++;
                    somaBonusBaseRealizado += valorUnitario;
                    somaBonusBasePrevisto += valorUnitario;
                } else if (status === 'pendente') {
                    totalPendente++;
                    somaBonusBasePrevisto += valorUnitario;
                } else if (status === 'faltou') {
                    totalFaltou++;
                }
            });

            const bonusFinalRealizado = somaBonusBaseRealizado * fatorMonitoria;
            const bonusFinalPrevisto = somaBonusBasePrevisto * fatorMonitoria;

            if (valorConfirmadoEl) valorConfirmadoEl.textContent = `R$ ${bonusFinalRealizado.toFixed(2).replace('.', ',')}`;
            if (valorPrevistoEl) valorPrevistoEl.textContent = `R$ ${bonusFinalPrevisto.toFixed(2).replace('.', ',')}`;
            if (detalheConfirmadoEl) {
                detalheConfirmadoEl.textContent = `${totalCompareceu} ${totalCompareceu === 1 ? 'presença confirmada' : 'presenças confirmadas'}`;
            }

            // Cálculo da Meta da Equipe:
            const totalAgendamentosEquipe = agendamentosMesAtual.length;
            const metaDefinida = METAS_POR_EQUIPE[equipeUsuario] || META_PADRAO;
            const percentualMeta = Math.min(100, Math.round((totalAgendamentosEquipe / metaDefinida) * 100));
            const restanteMeta = Math.max(0, metaDefinida - totalAgendamentosEquipe);

            tituloMetaEquipe.textContent = `META DA EQUIPE (${equipeUsuario.toUpperCase()})`;
            textoProgressoMeta.textContent = `${totalAgendamentosEquipe} / ${metaDefinida} agendamentos (${percentualMeta}%)`;
            barraProgressoMeta.style.width = `${percentualMeta}%`;

            if (restanteMeta === 0) {
                textoRestanteMeta.textContent = 'Parabéns! Meta do mês atingida!';
                textoRestanteMeta.className = 'meta-badge-sucesso';
            } else {
                textoRestanteMeta.textContent = `Faltam ${restanteMeta} agendamento${restanteMeta === 1 ? '' : 's'} para bater a meta`;
                textoRestanteMeta.className = 'meta-badge-restante';
            }

            // Renderiza os gráficos do Consultor
            if (tituloGraficoVolume) tituloGraficoVolume.textContent = 'Minha Efetividade';
            if (subtituloGraficoVolume) subtituloGraficoVolume.textContent = 'Taxa de presença';
            renderizarGraficoVolume(totalCompareceu, totalPendente, totalFaltou);

            const meusAgendamentosHistorico = todosAgendamentosHistorico.filter(item => item.user_id === usuarioAtual.id);
            renderizarGraficoBonusMensal(meusAgendamentosHistorico);

            if (tituloGraficoEquipe) tituloGraficoEquipe.textContent = `Volume da Equipe: ${equipeUsuario}`;
            if (subtituloGraficoEquipe) subtituloGraficoEquipe.textContent = 'Volume por operador desta equipe';
            renderizarGraficoBarrasHorizontaisOperadores(agendamentosMesAtual);

        } else {
            // ==========================================
            // LÓGICA DO ADMINISTRADOR
            // ==========================================
            if (secaoMetaEquipe) secaoMetaEquipe.classList.add('oculto');
            if (cardGraficoBonusMensal) cardGraficoBonusMensal.classList.add('oculto');
            if (secaoAdminRanking) secaoAdminRanking.classList.remove('oculto');

            const equipeFiltro = filtroEquipeAdmin ? filtroEquipeAdmin.value : 'todas';
            let dadosFiltrados = agendamentosMesAtual;
            if (equipeFiltro !== 'todas') {
                dadosFiltrados = agendamentosMesAtual.filter(item => (item.autor_equipe || 'Geral') === equipeFiltro);
            }

            let totalCompareceu = 0, totalPendente = 0, totalFaltou = 0;
            dadosFiltrados.forEach(item => {
                const status = item.status || 'pendente';
                if (status === 'compareceu') totalCompareceu++;
                else if (status === 'pendente') totalPendente++;
                else if (status === 'faltou') totalFaltou++;
            });

            const totalGeral = totalCompareceu + totalPendente + totalFaltou;
            const taxa = totalGeral > 0 ? Math.round((totalCompareceu / totalGeral) * 100) : 0;

            if (adminTotalAgendados) adminTotalAgendados.textContent = totalGeral;
            if (adminTotalCompareceu) adminTotalCompareceu.textContent = totalCompareceu;
            if (adminTaxaPresenca) adminTaxaPresenca.textContent = `${taxa}% taxa de presença`;
            if (adminTotalPendente) adminTotalPendente.textContent = totalPendente;
            if (adminTotalFaltas) adminTotalFaltas.textContent = totalFaltou;

            renderizarGraficoVolume(totalCompareceu, totalPendente, totalFaltou);

            if (equipeFiltro === 'todas') {
                // Modo Geral: Efetividade ocupa a largura toda em cima e a tabela lista cada equipe embaixo
                if (gradeGraficos) {
                    gradeGraficos.classList.add('grid-coluna-unica');
                    gradeGraficos.classList.remove('grid-duas-colunas');
                }
                if (cardGraficoEquipe) cardGraficoEquipe.classList.add('oculto');
                if (btnVoltarAdmin) btnVoltarAdmin.classList.add('oculto');

                if (tituloGraficoVolume) tituloGraficoVolume.textContent = 'Efetividade Geral';
                if (subtituloGraficoVolume) subtituloGraficoVolume.textContent = 'Taxa de presença de todas as equipes';

                renderizarTabelaEquipes(agendamentosMesAtual);

            } else {
                // Modo Equipe Selecionada: Efetividade + Gráfico de Barras dos Operadores lado a lado
                if (gradeGraficos) {
                    gradeGraficos.classList.add('grid-duas-colunas');
                    gradeGraficos.classList.remove('grid-coluna-unica');
                }
                if (cardGraficoEquipe) {
                    cardGraficoEquipe.classList.remove('oculto');
                    cardGraficoEquipe.classList.remove('card-grafico-expansivel');
                }
                if (btnVoltarAdmin) btnVoltarAdmin.classList.remove('oculto');

                if (tituloGraficoVolume) tituloGraficoVolume.textContent = `Efetividade: ${equipeFiltro}`;
                if (subtituloGraficoVolume) subtituloGraficoVolume.textContent = 'Taxa de presença desta equipe';
                
                if (tituloGraficoEquipe) tituloGraficoEquipe.textContent = `Operadores de ${equipeFiltro}`;
                if (subtituloGraficoEquipe) subtituloGraficoEquipe.textContent = 'Volume por operador desta equipe';

                renderizarGraficoBarrasHorizontaisOperadores(dadosFiltrados);
                renderizarTabelaOperadores(dadosFiltrados, equipeFiltro);
            }
        }
    }

    // 9. FUNÇÕES DE CRIAÇÃO DOS GRÁFICOS COM CHART.JS

    // Gráfico de Rosca (Doughnut Chart) com percentuais nas legendas
    function renderizarGraficoVolume(compareceu, pendente, faltou) {
        const ctx = document.getElementById('graficoVolume')?.getContext('2d');
        if (!ctx) return;
        if (graficoVolumeInstance) graficoVolumeInstance.destroy(); // Evita sobreposição ao redesenhar

        const total = compareceu + pendente + faltou;
        const pComp = total > 0 ? Math.round((compareceu / total) * 100) : 0;
        const pPend = total > 0 ? Math.round((pendente / total) * 100) : 0;
        const pFalt = total > 0 ? Math.round((faltou / total) * 100) : 0;

        graficoVolumeInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: [
                    `Compareceu (${pComp}%)`,
                    `Pendente (${pPend}%)`,
                    `Faltou (${pFalt}%)`
                ],
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
                plugins: { legend: { position: 'bottom' } }
            }
        });
    }

    // Gráfico de Barras Verticais para evolução mensal
    function renderizarGraficoBonusMensal(agendamentosHistorico) {
        const ctx = document.getElementById('graficoBonusMensal')?.getContext('2d');
        if (!ctx) return;
        if (graficoBonusMensalInstance) graficoBonusMensalInstance.destroy();

        const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const totaisPorMes = {};

        agendamentosHistorico.forEach(item => {
            if (item.data_revisao && item.status === 'compareceu') {
                const mesAno = item.data_revisao.substring(0, 7);
                totaisPorMes[mesAno] = (totaisPorMes[mesAno] || 0) + (parseFloat(item.valor_unitario) || 0);
            }
        });

        const chavesOrdenadas = Object.keys(totaisPorMes).sort();
        const labelsFormatados = chavesOrdenadas.map(c => {
            const [ano, mes] = c.split('-');
            return `${mesesNomes[parseInt(mes, 10) - 1]}/${ano.slice(2)}`;
        });
        const valores = chavesOrdenadas.map(c => totaisPorMes[c]);

        graficoBonusMensalInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labelsFormatados.length > 0 ? labelsFormatados : ['Sem dados'],
                datasets: [{
                    label: 'Bônus Base Confirmado (R$)',
                    data: valores.length > 0 ? valores : [0],
                    backgroundColor: '#2563eb',
                    borderRadius: 4,
                    maxBarThickness: 45
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } },
                scales: {
                    y: {
                        beginAtZero: true,
                        suggestedMax: 50,
                        ticks: {
                            precision: 0,
                            callback: value => `R$ ${value}`
                        }
                    }
                }
            }
        });
    }

    // Gráfico de Barras Horizontais (indexAxis: 'y')
    function renderizarGraficoBarrasHorizontaisOperadores(agendamentos) {
        const ctx = document.getElementById('graficoEquipe')?.getContext('2d');
        if (!ctx) return;
        if (graficoEquipeInstance) graficoEquipeInstance.destroy();

        const operadores = {};
        agendamentos.forEach(item => {
            const nome = (item.autor_nome || 'Operador').split(' ')[0];
            if (!operadores[nome]) operadores[nome] = { total: 0, compareceu: 0 };
            operadores[nome].total++;
            if (item.status === 'compareceu') operadores[nome].compareceu++;
        });

        const labels = Object.keys(operadores);
        const dataTotal = labels.map(l => operadores[l].total);
        const dataComp = labels.map(l => operadores[l].compareceu);

        graficoEquipeInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels.length > 0 ? labels : ['Sem operadores'],
                datasets: [
                    { 
                        label: 'Total de Agendados', 
                        data: dataTotal, 
                        backgroundColor: '#cbd5e1', 
                        borderRadius: 4,
                        maxBarThickness: 20
                    },
                    { 
                        label: 'Compareceram', 
                        data: dataComp, 
                        backgroundColor: '#22c55e', 
                        borderRadius: 4,
                        maxBarThickness: 20
                    }
                ]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } },
                scales: { 
                    x: { 
                        beginAtZero: true, 
                        suggestedMax: 10,
                        ticks: { precision: 0 } 
                    } 
                }
            }
        });
    }

    // 10. TABELAS DINÂMICAS DO ADMINISTRADOR
    function renderizarTabelaEquipes(agendamentos) {
        tituloTabelaAdmin.textContent = 'Desempenho por Equipe';
        subtituloTabelaAdmin.textContent = 'Acompanhe por equipe ou filtre individualmente';
        tabelaCabecalhoAdmin.innerHTML = `
            <tr>
                <th>EQUIPE</th>
                <th class="col-centro">TOTAL AGENDADOS</th>
                <th class="col-centro">COMPARECIDOS</th>
                <th class="col-centro">FALTAS</th>
                <th class="col-centro">TAXA DE PRESENÇA</th>
                <th class="col-centro">AÇÃO</th>
            </tr>
        `;

        const grupos = {};
        agendamentos.forEach(item => {
            const eq = item.autor_equipe || 'Geral';
            if (!grupos[eq]) grupos[eq] = { equipe: eq, total: 0, compareceu: 0, faltou: 0 };
            grupos[eq].total++;
            if (item.status === 'compareceu') grupos[eq].compareceu++;
            else if (item.status === 'faltou') grupos[eq].faltou++;
        });

        const lista = Object.values(grupos).sort((a, b) => b.total - a.total);
        tabelaCorpoAdmin.innerHTML = '';

        if (lista.length === 0) {
            tabelaCorpoAdmin.innerHTML = '<tr><td colspan="6" class="celula-vazia-mensagem">Nenhum agendamento neste mês.</td></tr>';
            return;
        }

        lista.forEach(eq => {
            const taxa = eq.total > 0 ? Math.round((eq.compareceu / eq.total) * 100) : 0;
            const badgeClasse = taxa >= 70 ? 'badge-taxa-alta' : 'badge-taxa-normal';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${eq.equipe}</strong></td>
                <td class="col-centro"><strong>${eq.total}</strong></td>
                <td class="col-centro admin-val-sucesso"><strong>${eq.compareceu}</strong></td>
                <td class="col-centro admin-val-perigo">${eq.faltou}</td>
                <td class="col-centro">
                    <span class="badge-taxa-tabela ${badgeClasse}">
                        ${taxa}%
                    </span>
                </td>
                <td class="col-centro">
                    <button class="btn-ver-equipe" data-equipe="${eq.equipe}">
                        Ver Operadores ➔
                    </button>
                </td>
            `;
            tabelaCorpoAdmin.appendChild(tr);
        });

        // Botão que permite entrar no drill-down da equipe selecionada
        document.querySelectorAll('.btn-ver-equipe').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const equipe = e.currentTarget.dataset.equipe;
                if (filtroEquipeAdmin) filtroEquipeAdmin.value = equipe;
                aplicarVisaoRelatorio();
            });
        });
    }

    function renderizarTabelaOperadores(agendamentos, nomeEquipe) {
        tituloTabelaAdmin.textContent = `Operadores da Equipe: ${nomeEquipe}`;
        subtituloTabelaAdmin.textContent = `Métricas individuais dos consultores da equipe ${nomeEquipe}`;
        tabelaCabecalhoAdmin.innerHTML = `
            <tr>
                <th>OPERADOR</th>
                <th class="col-centro">TOTAL AGENDADOS</th>
                <th class="col-centro">COMPARECIDOS</th>
                <th class="col-centro">PENDENTES</th>
                <th class="col-centro">FALTAS</th>
                <th class="col-centro">TAXA DE PRESENÇA</th>
            </tr>
        `;

        const operadores = {};
        agendamentos.forEach(item => {
            const chave = item.user_id || 'desconhecido';
            if (!operadores[chave]) {
                operadores[chave] = {
                    nome: item.autor_nome || 'Operador',
                    email: item.autor_email || '-',
                    total: 0,
                    compareceu: 0,
                    pendente: 0,
                    faltou: 0
                };
            }
            operadores[chave].total++;
            if (item.status === 'compareceu') operadores[chave].compareceu++;
            else if (item.status === 'pendente') operadores[chave].pendente++;
            else if (item.status === 'faltou') operadores[chave].faltou++;
        });

        const lista = Object.values(operadores).sort((a, b) => b.total - a.total);
        tabelaCorpoAdmin.innerHTML = '';

        if (lista.length === 0) {
            tabelaCorpoAdmin.innerHTML = '<tr><td colspan="6" class="celula-vazia-mensagem">Nenhum agendamento para esta equipe.</td></tr>';
            return;
        }

        lista.forEach(op => {
            const taxa = op.total > 0 ? Math.round((op.compareceu / op.total) * 100) : 0;
            const badgeClasse = taxa >= 70 ? 'badge-taxa-alta' : 'badge-taxa-normal';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <strong>${op.nome}</strong><br>
                    <span class="subtexto-operador">${op.email}</span>
                </td>
                <td class="col-centro"><strong>${op.total}</strong></td>
                <td class="col-centro admin-val-sucesso"><strong>${op.compareceu}</strong></td>
                <td class="col-centro admin-val-alerta">${op.pendente}</td>
                <td class="col-centro admin-val-perigo">${op.faltou}</td>
                <td class="col-centro">
                    <span class="badge-taxa-tabela ${badgeClasse}">
                        ${taxa}%
                    </span>
                </td>
            `;
            tabelaCorpoAdmin.appendChild(tr);
        });
    }

    // 11. EVENT LISTENERS
    if (filtroMesAdmin) filtroMesAdmin.addEventListener('change', carregarDados);
    if (filtroEquipeAdmin) filtroEquipeAdmin.addEventListener('change', aplicarVisaoRelatorio);
    if (filtroMesConsultor) filtroMesConsultor.addEventListener('change', carregarDados);
    if (inputMonitoria) inputMonitoria.addEventListener('input', aplicarVisaoRelatorio);

    if (btnVoltarAdmin) {
        btnVoltarAdmin.addEventListener('click', () => {
            if (filtroEquipeAdmin) filtroEquipeAdmin.value = 'todas';
            aplicarVisaoRelatorio();
        });
    }

    // 12. PARÂMETROS DE URL E DISPARO DE IMPRESSÃO (PDF)
    // Permite que a tela de importar.html chame esta página já filtrada e abrindo a janela de impressão
    const urlParams = new URLSearchParams(window.location.search);
    const parametroMes = urlParams.get('mes');
    const parametroEquipe = urlParams.get('equipe');
    const dispararImpressao = urlParams.get('imprimir') === 'true';

    if (parametroMes) {
        if (filtroMesAdmin) filtroMesAdmin.value = parametroMes;
        if (filtroMesConsultor) filtroMesConsultor.value = parametroMes;
    }

    await carregarOpcoesEquipes();

    if (parametroEquipe && filtroEquipeAdmin) {
        filtroEquipeAdmin.value = decodeURIComponent(parametroEquipe);
    }

    await carregarDados();

    // Aguarda o Chart.js desenhar os canvas na tela antes de abrir o print
    if (dispararImpressao) {
        setTimeout(() => {
            window.print();
        }, 900);
    }
});