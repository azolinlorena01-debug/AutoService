/* ==========================================================================
   CADERNO DE ESTUDOS - JAVASCRIPT (relatorios.js)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async function() {
    // 1. CONEXÃO COM O BACKEND
    const SUPABASE_URL = 'https://potvtrepcoswvzmkewic.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_iMbay5YOnrrehpqI9qU7HA_vMapr-DY';
    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    const METAS_POR_EQUIPE = {
        'Toyota': 900,
        'Geral': 900
    };
    const META_PADRAO = 900;
    const META_GLOBAL = 6000;

    // 2. CAPTURA DE ELEMENTOS HTML (DOM)
    const secaoFiltrosAdmin = document.getElementById('secao-filtros-admin');
    const metricasResumoAdmin = document.getElementById('metricas-resumo-admin');
    const filtroMesAdmin = document.getElementById('filtro-mes-admin');
    const filtroEquipeAdmin = document.getElementById('filtro-equipe-admin');

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

    let isAdmin = false;
    let equipeUsuario = 'Toyota';
    let nomeUsuarioPerfil = '';

    try {
        const { data: perfil } = await supabaseClient
            .from('perfis')
            .select('role, equipe, nome')
            .eq('id', usuarioAtual.id)
            .maybeSingle();

        if (perfil) {
            if (perfil.role === 'admin') isAdmin = true;
            if (perfil.equipe) equipeUsuario = perfil.equipe;
            if (perfil.nome) nomeUsuarioPerfil = perfil.nome;
        }
    } catch (e) {
        console.warn('Erro ao carregar permissões:', e);
    }

    // TRAVA DE SEGURANÇA DEFINITIVA: Garante que sua conta NUNCA perca o perfil Admin
    if (usuarioAtual.email === 'usuariotestesite01@gmail.com' || usuarioAtual.email?.includes('admin')) {
        isAdmin = true;
    }

    // 4. CONFIGURAÇÃO VISUAL INICIAL POR PAPEL
    if (isAdmin) {
        if (linkMenuImportar) linkMenuImportar.classList.remove('oculto');
        if (secaoFiltrosAdmin) secaoFiltrosAdmin.classList.remove('oculto');
        // Oculta os cards de contagem simples no relatório do admin (fica só na tela de agendamentos)
        if (metricasResumoAdmin) metricasResumoAdmin.classList.add('oculto');
        if (secaoMetricasConsultor) secaoMetricasConsultor.classList.add('oculto');
        // Deixa a barra de Meta em destaque no topo antes dos gráficos
        if (secaoMetaEquipe) secaoMetaEquipe.classList.remove('oculto');
    } else {
        if (linkMenuImportar) linkMenuImportar.classList.add('oculto');
        if (secaoFiltrosAdmin) secaoFiltrosAdmin.classList.add('oculto');
        if (metricasResumoAdmin) metricasResumoAdmin.classList.add('oculto');
        if (secaoMetricasConsultor) secaoMetricasConsultor.classList.remove('oculto');
        if (secaoMetaEquipe) secaoMetaEquipe.classList.remove('oculto');
    }

    // 5. CABEÇALHO DO USUÁRIO LOGADO (Exibindo Nome e Sobrenome completos)
    const areaAuth = document.getElementById('area-autenticacao');
    if (areaAuth && usuarioAtual) {
        let nomeExibicao = 'Usuário';
        const metaNome = usuarioAtual.user_metadata?.nome_completo || nomeUsuarioPerfil;
        if (typeof metaNome === 'string' && metaNome.trim().length > 0) {
            nomeExibicao = metaNome.trim();
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

    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = String(hoje.getMonth() + 1).padStart(2, '0');
    const valorMesPadrao = `${anoAtual}-${mesAtual}`;

    if (filtroMesAdmin) filtroMesAdmin.value = valorMesPadrao;
    if (filtroMesConsultor) filtroMesConsultor.value = valorMesPadrao;

    let graficoVolumeInstance = null;
    let graficoBonusMensalInstance = null;
    let graficoEquipeInstance = null;
    let todosAgendamentosHistorico = [];
    let agendamentosMesAtual = [];

    async function carregarOpcoesEquipes() {
        if (!isAdmin || !filtroEquipeAdmin) return;
        try {
            const { data: perfis } = await supabaseClient.from('perfis').select('equipe');
            const listaEquipes = new Set();
            
            (perfis || []).forEach(p => { 
                if (p.equipe && p.equipe.trim().length > 0) {
                    const nomeEq = p.equipe.trim();
                    if (nomeEq !== 'Pós-Venda' && nomeEq !== 'Equipe Alfa' && nomeEq !== 'Equipe Beta') {
                        listaEquipes.add(nomeEq);
                    }
                }
            });
            
            listaEquipes.add('Toyota');
            
            filtroEquipeAdmin.innerHTML = '<option value="todas">Todas as Equipes</option>';
            [...listaEquipes].sort().forEach(eq => {
                const opt = document.createElement('option');
                opt.value = eq;
                opt.textContent = eq;
                if(eq === 'Toyota') opt.selected = true;
                filtroEquipeAdmin.appendChild(opt);
            });
        } catch (e) {}
    }

    async function carregarDados() {
        const mesSelecionado = isAdmin ? filtroMesAdmin.value : filtroMesConsultor.value;

        if (isAdmin) {
            const { data, error } = await supabaseClient
                .from('vw_agendamentos_completos')
                .select('*')
                .order('data_revisao', { ascending: true });

            if (error) return console.error(error);
            todosAgendamentosHistorico = data || [];
        } else {
            const { data, error } = await supabaseClient
                .from('vw_agendamentos_completos')
                .select('*')
                .eq('autor_equipe', equipeUsuario)
                .order('data_revisao', { ascending: true });

            if (error) return console.error(error);
            todosAgendamentosHistorico = data || [];
        }

        agendamentosMesAtual = todosAgendamentosHistorico.filter(item =>
            item.data_revisao && item.data_revisao.startsWith(mesSelecionado)
        );

        aplicarVisaoRelatorio();
    }

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
            if (secaoMetaEquipe) secaoMetaEquipe.classList.remove('oculto');
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

            // 🎯 DESTAQUE: META GLOBAL DA CONCESSIONÁRIA (6.000 AGENDAMENTOS)
            const totalGeralDoMes = agendamentosMesAtual.length;
            const percentualMetaAdmin = Math.min(100, Math.round((totalGeralDoMes / META_GLOBAL) * 100));
            const restanteMetaAdmin = Math.max(0, META_GLOBAL - totalGeralDoMes);

            if (tituloMetaEquipe) tituloMetaEquipe.textContent = 'META GLOBAL DA CONCESSIONÁRIA';
            if (textoProgressoMeta) textoProgressoMeta.textContent = `${totalGeralDoMes} / ${META_GLOBAL} agendamentos (${percentualMetaAdmin}%)`;
            if (barraProgressoMeta) barraProgressoMeta.style.width = `${percentualMetaAdmin}%`;

            if (textoRestanteMeta) {
                if (restanteMetaAdmin === 0) {
                    textoRestanteMeta.textContent = 'Parabéns! Meta global atingida!';
                    textoRestanteMeta.className = 'meta-badge-sucesso';
                } else {
                    textoRestanteMeta.textContent = `Faltam ${restanteMetaAdmin} agendamentos no total`;
                    textoRestanteMeta.className = 'meta-badge-restante';
                }
            }

            renderizarGraficoVolume(totalCompareceu, totalPendente, totalFaltou);

            if (equipeFiltro === 'todas') {
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

    function renderizarGraficoVolume(compareceu, pendente, faltou) {
        const ctx = document.getElementById('graficoVolume')?.getContext('2d');
        if (!ctx) return;
        if (graficoVolumeInstance) graficoVolumeInstance.destroy();

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

    function renderizarGraficoBarrasHorizontaisOperadores(agendamentos) {
        const ctx = document.getElementById('graficoEquipe')?.getContext('2d');
        if (!ctx) return;
        if (graficoEquipeInstance) graficoEquipeInstance.destroy();

        const operadores = {};
        agendamentos.forEach(item => {
            const nomeCompleto = (item.autor_nome || 'Operador').trim();
            const partes = nomeCompleto.split(/\s+/);
            const nomeCurto = partes.length >= 2 ? `${partes[0]} ${partes[1]}` : partes[0];

            if (!operadores[nomeCurto]) operadores[nomeCurto] = { total: 0, compareceu: 0 };
            operadores[nomeCurto].total++;
            if (item.status === 'compareceu') operadores[nomeCurto].compareceu++;
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

        document.querySelectorAll('.btn-ver-equipe').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const equipe = e.currentTarget.dataset.equipe;
                if (filtroEquipeAdmin) filtroEquipeAdmin.value = equipe;
                aplicarVisaoRelatorio();
            });
        });
    }

    // Tabela de Operadores (SEM O E-MAIL, EXIBINDO NOME E SOBRENOME)
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
                    <strong>${op.nome}</strong>
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

    if (dispararImpressao) {
        setTimeout(() => {
            window.print();
        }, 900);
    }
});