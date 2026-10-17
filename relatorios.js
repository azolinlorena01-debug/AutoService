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

    // 2. ELEMENTOS HTML
    const secaoFiltrosAdmin = document.getElementById('secao-filtros-admin');
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

    // Botões de navegação
    const btnAbaVisaoGeral = document.getElementById('btn-aba-visao-geral');
    const btnAbaCategorias = document.getElementById('btn-aba-categorias');
    const btnAbaRanking = document.getElementById('btn-aba-ranking');
    const btnAbaEquipe = document.getElementById('btn-aba-equipe');

    // Containers de Gráficos e Ranking
    const gradeGraficos = document.getElementById('grade-graficos');
    const cardGraficoBonusMensal = document.getElementById('card-grafico-bonus-mensal');
    const cardGraficoEquipeAdmin = document.getElementById('card-grafico-equipe-admin');
    const secaoGraficoRevisoesTipo = document.getElementById('secao-grafico-revisoes-tipo');
    const secaoRankingOperadores = document.getElementById('secao-ranking-operadores');
    const containerRankingLista = document.getElementById('container-ranking-lista');
    const secaoVolumeEquipeConsultor = document.getElementById('secao-volume-equipe-consultor');

    const tituloGraficoVolume = document.getElementById('titulo-grafico-volume');
    const subtituloGraficoVolume = document.getElementById('subtitulo-grafico-volume');
    const tituloGraficoEquipeAdmin = document.getElementById('titulo-grafico-equipe-admin');
    const subtituloGraficoEquipeAdmin = document.getElementById('subtitulo-grafico-equipe-admin');
    const tituloGraficoEquipeConsultor = document.getElementById('titulo-grafico-equipe-consultor');
    const subtituloGraficoEquipeConsultor = document.getElementById('subtitulo-grafico-equipe-consultor');

    const tituloGraficoRevisoesTipo = document.getElementById('titulo-grafico-revisoes-tipo');
    const subtituloGraficoRevisoesTipo = document.getElementById('subtitulo-grafico-revisoes-tipo');

    const secaoAdminRanking = document.getElementById('secao-admin-ranking');
    const tituloTabelaAdmin = document.getElementById('titulo-tabela-admin');
    const subtituloTabelaAdmin = document.getElementById('subtitulo-tabela-admin');
    const tabelaCabecalhoAdmin = document.getElementById('tabela-cabecalho-admin');
    const tabelaCorpoAdmin = document.getElementById('tabela-corpo-admin');
    const btnVoltarAdmin = document.getElementById('btn-voltar-admin');

    if (btnVoltarAdmin) {
        btnVoltarAdmin.classList.add('oculto');
        btnVoltarAdmin.style.setProperty('display', 'none', 'important');
    }

    // 3. SEGURANÇA E AUTH GUARD
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

    if (usuarioAtual.email === 'usuariotestesite01@gmail.com' || usuarioAtual.email?.includes('admin')) {
        isAdmin = true;
    }

    // 4. CONFIGURAÇÃO VISUAL INICIAL POR PAPEL
    if (isAdmin) {
        if (linkMenuImportar) linkMenuImportar.classList.remove('oculto');
        if (secaoFiltrosAdmin) secaoFiltrosAdmin.classList.remove('oculto');
        if (secaoMetricasConsultor) secaoMetricasConsultor.classList.add('oculto');
        if (secaoMetaEquipe) secaoMetaEquipe.classList.remove('oculto');
        if (btnAbaEquipe) btnAbaEquipe.classList.add('oculto');
        if (cardGraficoBonusMensal) cardGraficoBonusMensal.classList.add('oculto');
        if (btnAbaVisaoGeral) btnAbaVisaoGeral.textContent = 'Efetividade';
    } else {
        if (linkMenuImportar) linkMenuImportar.classList.add('oculto');
        if (secaoFiltrosAdmin) secaoFiltrosAdmin.classList.add('oculto');
        if (secaoMetricasConsultor) secaoMetricasConsultor.classList.remove('oculto');
        if (secaoMetaEquipe) secaoMetaEquipe.classList.remove('oculto');
        if (btnAbaEquipe) btnAbaEquipe.classList.remove('oculto');
        if (cardGraficoBonusMensal) cardGraficoBonusMensal.classList.remove('oculto');
        if (cardGraficoEquipeAdmin) cardGraficoEquipeAdmin.classList.add('oculto');
        if (btnAbaVisaoGeral) btnAbaVisaoGeral.textContent = 'Efetividade & Bônus';
    }

    // 5. CABEÇALHO DO USUÁRIO
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
    let graficoEquipeAdminInstance = null;
    let graficoEquipeConsultorInstance = null;
    let graficoRevisoesTipoInstance = null;

    let todosAgendamentosHistorico = [];
    let agendamentosMesAtual = [];

    // =========================================================================
    // NAVEGAÇÃO ENTRE OS GRÁFICOS
    // =========================================================================
    let abaGraficoAtual = 'visao-geral';

    function aplicarVisibilidadeAbas() {
        btnAbaVisaoGeral.classList.toggle('ativo', abaGraficoAtual === 'visao-geral');
        btnAbaCategorias.classList.toggle('ativo', abaGraficoAtual === 'categorias');
        if (btnAbaRanking) btnAbaRanking.classList.toggle('ativo', abaGraficoAtual === 'ranking');
        if (btnAbaEquipe) btnAbaEquipe.classList.toggle('ativo', abaGraficoAtual === 'equipe');

        gradeGraficos.classList.add('oculto');
        secaoGraficoRevisoesTipo.classList.add('oculto');
        if (secaoRankingOperadores) secaoRankingOperadores.classList.add('oculto');
        if (secaoVolumeEquipeConsultor) secaoVolumeEquipeConsultor.classList.add('oculto');

        // Se for a aba de ranking, oculta a tabela de desempenho da equipe para não duplicar visualmente
        if (abaGraficoAtual === 'ranking') {
            if (secaoAdminRanking) secaoAdminRanking.classList.add('oculto');
            if (secaoRankingOperadores) secaoRankingOperadores.classList.remove('oculto');
        } else {
            // Nas abas "Efetividade" e "Detalhes", a tabela de desempenho volta a aparecer para administradores
            if (isAdmin && secaoAdminRanking) {
                secaoAdminRanking.classList.remove('oculto');
            }

            if (abaGraficoAtual === 'visao-geral') {
                gradeGraficos.classList.remove('oculto');

                if (isAdmin) {
                    const equipeFiltro = filtroEquipeAdmin ? filtroEquipeAdmin.value : 'todas';
                    if (equipeFiltro === 'todas') {
                        gradeGraficos.classList.add('coluna-unica');
                        if (cardGraficoEquipeAdmin) cardGraficoEquipeAdmin.classList.add('oculto');
                    } else {
                        gradeGraficos.classList.remove('coluna-unica');
                        if (cardGraficoEquipeAdmin) cardGraficoEquipeAdmin.classList.remove('oculto');
                    }
                } else {
                    gradeGraficos.classList.remove('coluna-unica');
                }

            } else if (abaGraficoAtual === 'categorias') {
                secaoGraficoRevisoesTipo.classList.remove('oculto');

            } else if (abaGraficoAtual === 'equipe') {
                if (secaoVolumeEquipeConsultor) secaoVolumeEquipeConsultor.classList.remove('oculto');
            }
        }
    }

    function trocarAbaGrafico(abaDestino) {
        abaGraficoAtual = abaDestino;
        aplicarVisibilidadeAbas();
        renderizarGraficosAtivos();
    }

    btnAbaVisaoGeral.addEventListener('click', () => trocarAbaGrafico('visao-geral'));
    btnAbaCategorias.addEventListener('click', () => trocarAbaGrafico('categorias'));
    if (btnAbaRanking) btnAbaRanking.addEventListener('click', () => trocarAbaGrafico('ranking'));
    if (btnAbaEquipe) btnAbaEquipe.addEventListener('click', () => trocarAbaGrafico('equipe'));

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
                filtroEquipeAdmin.appendChild(opt);
            });

            filtroEquipeAdmin.value = 'todas';
        } catch (e) {}
    }

    async function carregarDados() {
        const mesSelecionado = isAdmin ? filtroMesAdmin.value : filtroMesConsultor.value;

        const { data, error } = await supabaseClient
            .from('vw_agendamentos_completos')
            .select('*')
            .order('data_revisao', { ascending: true });

        if (error) return console.error(error);
        todosAgendamentosHistorico = data || [];

        agendamentosMesAtual = todosAgendamentosHistorico.filter(item =>
            item.data_revisao && item.data_revisao.startsWith(mesSelecionado)
        );

        aplicarVisaoRelatorio();
    }

    function aplicarVisaoRelatorio() {
        if (!isAdmin) {
            if (secaoAdminRanking) secaoAdminRanking.classList.add('oculto');
            if (secaoMetaEquipe) secaoMetaEquipe.classList.remove('oculto');
            if (cardGraficoBonusMensal) cardGraficoBonusMensal.classList.remove('oculto');
            if (cardGraficoEquipeAdmin) cardGraficoEquipeAdmin.classList.add('oculto');

            let notaMonitoria = inputMonitoria ? parseFloat(inputMonitoria.value) : 100;
            if (isNaN(notaMonitoria)) notaMonitoria = 100;

            let fatorMonitoria = (notaMonitoria >= 80) ? 1.10 : 0.90;
            if (badgeAjusteMonitoria) {
                badgeAjusteMonitoria.textContent = notaMonitoria >= 80 ? '+10% Bônus' : '-10% Redução';
                badgeAjusteMonitoria.className = notaMonitoria >= 80 ? 'badge-ajuste-monitoria' : 'badge-ajuste-monitoria-reducao';
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

            const agendamentosToyota = agendamentosMesAtual.filter(i => (i.autor_equipe || 'Toyota') === equipeUsuario);
            const comparecidosEquipe = agendamentosToyota.filter(item => item.status === 'compareceu').length;
            const metaDefinida = METAS_POR_EQUIPE[equipeUsuario] || META_PADRAO;
            const percentualMeta = Math.min(100, Math.round((comparecidosEquipe / metaDefinida) * 100));
            const restanteMeta = Math.max(0, metaDefinida - comparecidosEquipe);

            tituloMetaEquipe.textContent = `META DA EQUIPE (${equipeUsuario.toUpperCase()})`;
            textoProgressoMeta.textContent = `${comparecidosEquipe} / ${metaDefinida} agendamentos (${percentualMeta}%)`;
            barraProgressoMeta.style.width = `${percentualMeta}%`;

            if (restanteMeta === 0) {
                textoRestanteMeta.textContent = 'Parabéns! Meta do mês atingida!';
                textoRestanteMeta.className = 'meta-badge-sucesso';
            } else {
                textoRestanteMeta.textContent = `Faltam ${restanteMeta} agendamento${restanteMeta === 1 ? '' : 's'} para bater a meta`;
                textoRestanteMeta.className = 'meta-badge-restante';
            }

        } else {
            if (secaoMetaEquipe) secaoMetaEquipe.classList.remove('oculto');
            if (cardGraficoBonusMensal) cardGraficoBonusMensal.classList.add('oculto');
            if (secaoVolumeEquipeConsultor) secaoVolumeEquipeConsultor.classList.add('oculto');

            const equipeFiltro = filtroEquipeAdmin ? filtroEquipeAdmin.value : 'todas';
            let dadosFiltrados = agendamentosMesAtual;
            if (equipeFiltro !== 'todas') {
                dadosFiltrados = agendamentosMesAtual.filter(item => (item.autor_equipe || 'Geral') === equipeFiltro);
            }

            const comparecidosGeral = agendamentosMesAtual.filter(item => item.status === 'compareceu').length;
            const percentualMetaAdmin = Math.min(100, Math.round((comparecidosGeral / META_GLOBAL) * 100));
            const restanteMetaAdmin = Math.max(0, META_GLOBAL - comparecidosGeral);

            if (tituloMetaEquipe) tituloMetaEquipe.textContent = 'META TOTAL DA CENTRAL DE AGENDAMENTOS';
            textoProgressoMeta.textContent = `${comparecidosGeral} / ${META_GLOBAL} agendamentos (${percentualMetaAdmin}%)`;
            barraProgressoMeta.style.width = `${percentualMetaAdmin}%`;

            if (textoRestanteMeta) {
                textoRestanteMeta.textContent = restanteMetaAdmin === 0 
                    ? 'Parabéns! Meta atingida!' 
                    : `Faltam ${restanteMetaAdmin} agendamentos no total`;
                textoRestanteMeta.className = restanteMetaAdmin === 0 ? 'meta-badge-sucesso' : 'meta-badge-restante';
            }

            // CONTROLE DO BOTÃO VOLTAR E DA TABELA DE DESEMPENHO
            if (equipeFiltro === 'todas') {
                if (btnVoltarAdmin) {
                    btnVoltarAdmin.classList.add('oculto');
                    btnVoltarAdmin.style.setProperty('display', 'none', 'important');
                }
                renderizarTabelaEquipes(agendamentosMesAtual);
            } else {
                if (btnVoltarAdmin) {
                    btnVoltarAdmin.classList.remove('oculto');
                    btnVoltarAdmin.style.setProperty('display', 'inline-flex', 'important');
                }
                renderizarTabelaOperadores(dadosFiltrados, equipeFiltro);
            }
        }

        aplicarVisibilidadeAbas();
        renderizarGraficosAtivos();
    }

    function renderizarGraficosAtivos() {
        const equipeFiltro = isAdmin ? (filtroEquipeAdmin ? filtroEquipeAdmin.value : 'todas') : equipeUsuario;
        let dadosFiltrados = agendamentosMesAtual;
        if (isAdmin && equipeFiltro !== 'todas') {
            dadosFiltrados = agendamentosMesAtual.filter(item => (item.autor_equipe || 'Geral') === equipeFiltro);
        }
        const meusAgendamentosMes = agendamentosMesAtual.filter(item => item.user_id === usuarioAtual.id);

        if (abaGraficoAtual === 'visao-geral') {
            let totalCompareceu = 0, totalPendente = 0, totalFaltou = 0;
            const listaPresenca = isAdmin ? dadosFiltrados : meusAgendamentosMes;

            listaPresenca.forEach(item => {
                const status = item.status || 'pendente';
                if (status === 'compareceu') totalCompareceu++;
                else if (status === 'pendente') totalPendente++;
                else if (status === 'faltou') totalFaltou++;
            });

            if (!isAdmin) {
                if (tituloGraficoVolume) tituloGraficoVolume.textContent = 'Minha Efetividade';
                if (subtituloGraficoVolume) subtituloGraficoVolume.textContent = 'Taxa de presença';
                renderizarGraficoVolume(totalCompareceu, totalPendente, totalFaltou);

                const meusAgendamentosHistorico = todosAgendamentosHistorico.filter(item => item.user_id === usuarioAtual.id);
                renderizarGraficoBonusMensal(meusAgendamentosHistorico);
            } else {
                if (tituloGraficoVolume) {
                    tituloGraficoVolume.textContent = equipeFiltro === 'todas' ? 'Efetividade Geral' : `Efetividade: ${equipeFiltro}`;
                }
                if (subtituloGraficoVolume) {
                    subtituloGraficoVolume.textContent = equipeFiltro === 'todas' ? 'Taxa de presença de todas as equipes' : 'Taxa de presença desta equipe';
                }
                renderizarGraficoVolume(totalCompareceu, totalPendente, totalFaltou);

                if (equipeFiltro !== 'todas') {
                    if (tituloGraficoEquipeAdmin) tituloGraficoEquipeAdmin.textContent = `Operadores de ${equipeFiltro}`;
                    if (subtituloGraficoEquipeAdmin) subtituloGraficoEquipeAdmin.textContent = 'Volume por operador desta equipe';
                    renderizarGraficoBarrasHorizontais('graficoEquipeAdmin', dadosFiltrados);
                }
            }

        } else if (abaGraficoAtual === 'categorias') {
            const listaCategorias = isAdmin ? dadosFiltrados : meusAgendamentosMes;
            if (tituloGraficoRevisoesTipo) {
                tituloGraficoRevisoesTipo.textContent = !isAdmin 
                    ? 'Minhas Revisões por Categoria' 
                    : (equipeFiltro === 'todas' ? 'Revisões por Categoria (Todas as Equipes)' : `Revisões por Categoria: Equipe ${equipeFiltro}`);
            }
            renderizarGraficoRevisoesPorTipo(listaCategorias);

        } else if (abaGraficoAtual === 'ranking') {
            // Ranking contempla TODAS as equipes sem filtros de equipe aplicados
            renderizarRankingOperadores(agendamentosMesAtual);

        } else if (abaGraficoAtual === 'equipe') {
            if (tituloGraficoEquipeConsultor) tituloGraficoEquipeConsultor.textContent = `Volume da Equipe: ${equipeUsuario}`;
            if (subtituloGraficoEquipeConsultor) subtituloGraficoEquipeConsultor.textContent = 'Volume por operador desta equipe';
            renderizarGraficoBarrasHorizontais('graficoEquipeConsultor', agendamentosMesAtual);
        }
    }

    // =========================================================================
    // RANKING GERAL DE TODOS OS OPERADORES
    // =========================================================================
    function renderizarRankingOperadores(agendamentos) {
        if (!containerRankingLista) return;
        containerRankingLista.innerHTML = '';

        const operadores = {};

        agendamentos.forEach(item => {
            const id = item.user_id || 'desconhecido';
            if (!operadores[id]) {
                operadores[id] = {
                    id: id,
                    nome: (item.autor_nome || 'Operador').trim(),
                    equipe: item.autor_equipe || 'Geral',
                    total: 0,
                    compareceu: 0,
                    faltou: 0
                };
            }
            operadores[id].total++;
            if (item.status === 'compareceu') operadores[id].compareceu++;
            else if (item.status === 'faltou') operadores[id].faltou++;
        });

        const listaRanking = Object.values(operadores).sort((a, b) => b.compareceu - a.compareceu);

        if (listaRanking.length === 0) {
            containerRankingLista.innerHTML = '<div style="text-align: center; color: #64748b; padding: 24px;">Nenhum comparecimento registrado neste mês.</div>';
            return;
        }

        const maxCompareceu = Math.max(1, listaRanking[0].compareceu);

        listaRanking.forEach((op, index) => {
            const posicao = index + 1;
            const percentualBarra = Math.round((op.compareceu / maxCompareceu) * 100);
            const taxaPresenca = op.total > 0 ? Math.round((op.compareceu / op.total) * 100) : 0;

            let classePos = 'pos-padrao';
            let textoPos = `${posicao}º`;
            let classeItem = '';

            if (posicao === 1) {
                classePos = 'pos-1';
                textoPos = '🥇';
                classeItem = 'destaque-primeiro';
            } else if (posicao === 2) {
                classePos = 'pos-2';
                textoPos = '🥈';
            } else if (posicao === 3) {
                classePos = 'pos-3';
                textoPos = '🥉';
            }

            const itemDiv = document.createElement('div');
            itemDiv.className = `ranking-item ${classeItem}`;

            itemDiv.innerHTML = `
                <div class="ranking-esquerda">
                    <div class="posicao-circulo ${classePos}">${textoPos}</div>
                    <div class="operador-info-bloco">
                        <strong>${op.nome}</strong>
                        <span>Equipe ${op.equipe} • ${taxaPresenca}% de presença</span>
                    </div>
                    <div class="ranking-barra-area">
                        <div class="ranking-trilho">
                            <div class="ranking-preenchimento" style="width: ${percentualBarra}%;"></div>
                        </div>
                    </div>
                </div>
                <div class="ranking-direita">
                    <div>
                        <div class="num-comparecidos">${op.compareceu}</div>
                        <div class="num-comparecidos-sub">compareceram</div>
                    </div>
                </div>
            `;

            containerRankingLista.appendChild(itemDiv);
        });
    }

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
                    `No-Show (${pFalt}%)`
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

    function renderizarGraficoBarrasHorizontais(canvasId, agendamentos) {
        const ctx = document.getElementById(canvasId)?.getContext('2d');
        if (!ctx) return;

        if (canvasId === 'graficoEquipeAdmin' && graficoEquipeAdminInstance) graficoEquipeAdminInstance.destroy();
        if (canvasId === 'graficoEquipeConsultor' && graficoEquipeConsultorInstance) graficoEquipeConsultorInstance.destroy();

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

        const novaInstancia = new Chart(ctx, {
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

        if (canvasId === 'graficoEquipeAdmin') graficoEquipeAdminInstance = novaInstancia;
        if (canvasId === 'graficoEquipeConsultor') graficoEquipeConsultorInstance = novaInstancia;
    }

    function renderizarGraficoRevisoesPorTipo(agendamentos) {
        const ctx = document.getElementById('graficoRevisoesTipo')?.getContext('2d');
        if (!ctx) return;
        if (graficoRevisoesTipoInstance) graficoRevisoesTipoInstance.destroy();

        const contagem = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 };

        agendamentos.forEach(item => {
            const rev = parseInt(item.revisao, 10) || 1;
            if (rev >= 8) contagem[8]++;
            else if (rev >= 1 && rev <= 7) contagem[rev]++;
        });

        const labels = [
            '1ª Revisão', '2ª Revisão', '3ª Revisão', '4ª Revisão',
            '5ª Revisão', '6ª Revisão', '7ª Revisão', '8ª+ Revisão'
        ];

        const dados = [
            contagem[1], contagem[2], contagem[3], contagem[4],
            contagem[5], contagem[6], contagem[7], contagem[8]
        ];

        const cores = [
            '#3b82f6', '#3b82f6', '#3b82f6', '#3b82f6',
            '#8b5cf6', '#8b5cf6', '#8b5cf6',
            '#10b981'
        ];

        graficoRevisoesTipoInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Quantidade',
                    data: dados,
                    backgroundColor: cores,
                    borderRadius: 6,
                    maxBarThickness: 34
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const revIdx = context.dataIndex + 1;
                                let valorBonus = 'R$ 2,00';
                                if (revIdx >= 5 && revIdx <= 7) valorBonus = 'R$ 6,00';
                                if (revIdx >= 8) valorBonus = 'R$ 10,00';
                                return ` ${context.raw} agendamento(s) [Faixa: ${valorBonus}]`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { precision: 0 }
                    }
                }
            }
        });
    }

    // 10. TABELAS ADMINISTRATIVAS
    function renderizarTabelaEquipes(agendamentos) {
        tituloTabelaAdmin.textContent = 'Desempenho por Equipe';
        subtituloTabelaAdmin.textContent = 'Acompanhe por equipe ou filtre individualmente';
        tabelaCabecalhoAdmin.innerHTML = `
            <tr>
                <th>EQUIPE</th>
                <th class="col-centro">TOTAL AGENDADOS</th>
                <th class="col-centro">COMPARECIDOS</th>
                <th class="col-centro">NO-SHOW</th>
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

    function renderizarTabelaOperadores(agendamentos, nomeEquipe) {
        tituloTabelaAdmin.textContent = `Operadores da Equipe: ${nomeEquipe}`;
        subtituloTabelaAdmin.textContent = `Métricas individuais e distribuição de revisões dos consultores`;
        tabelaCabecalhoAdmin.innerHTML = `
            <tr>
                <th>OPERADOR</th>
                <th class="col-centro">TOTAL AGENDADOS</th>
                <th class="col-centro">COMPARECIDOS</th>
                <th class="col-centro">PENDENTES</th>
                <th class="col-centro">NO-SHOW</th>
                <th class="col-centro">DISTRIBUIÇÃO POR REVISÃO</th>
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
                    faltou: 0,
                    revisoes: {}
                };
            }
            operadores[chave].total++;
            if (item.status === 'compareceu') operadores[chave].compareceu++;
            else if (item.status === 'pendente') operadores[chave].pendente++;
            else if (item.status === 'faltou') operadores[chave].faltou++;

            const rev = parseInt(item.revisao, 10) || 1;
            operadores[chave].revisoes[rev] = (operadores[chave].revisoes[rev] || 0) + 1;
        });

        const lista = Object.values(operadores).sort((a, b) => b.total - a.total);
        tabelaCorpoAdmin.innerHTML = '';

        if (lista.length === 0) {
            tabelaCorpoAdmin.innerHTML = '<tr><td colspan="7" class="celula-vazia-mensagem">Nenhum agendamento para esta equipe.</td></tr>';
            return;
        }

        lista.forEach(op => {
            const taxa = op.total > 0 ? Math.round((op.compareceu / op.total) * 100) : 0;
            const badgeClasse = taxa >= 70 ? 'badge-taxa-alta' : 'badge-taxa-normal';
            
            let qtdFaixa1a4 = 0;
            let qtdFaixa5a7 = 0;
            let qtdFaixa8Mais = 0;

            const revs1a4 = [];
            const revs5a7 = [];
            const revs8Mais = [];

            Object.keys(op.revisoes)
                .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
                .forEach(r => {
                    const num = parseInt(r, 10);
                    const qtd = op.revisoes[r];
                    const texto = `${num}ª: ${qtd}`;
                    if (num <= 4) {
                        qtdFaixa1a4 += qtd;
                        revs1a4.push(texto);
                    } else if (num <= 7) {
                        qtdFaixa5a7 += qtd;
                        revs5a7.push(texto);
                    } else {
                        qtdFaixa8Mais += qtd;
                        revs8Mais.push(texto);
                    }
                });

            const detalheTooltip = [
                `Faixa R$ 2,00 (1ª a 4ª): ${revs1a4.join(' | ') || '0'}`,
                `Faixa R$ 6,00 (5ª a 7ª): ${revs5a7.join(' | ') || '0'}`,
                `Faixa R$ 10,00 (8ª+): ${revs8Mais.join(' | ') || '0'}`
            ].join('\n');

            const badgesRevisoes = `
                <div class="faixas-revisao-container" title="${detalheTooltip}">
                    <span class="faixa-item faixa-azul">
                        <span class="faixa-dot"></span> 1ª-4ª: <strong>${qtdFaixa1a4}</strong>
                    </span>
                    <span class="faixa-divisor">|</span>
                    <span class="faixa-item faixa-roxa">
                        <span class="faixa-dot"></span> 5ª-7ª: <strong>${qtdFaixa5a7}</strong>
                    </span>
                    <span class="faixa-divisor">|</span>
                    <span class="faixa-item faixa-verde">
                        <span class="faixa-dot"></span> 8ª+: <strong>${qtdFaixa8Mais}</strong>
                    </span>
                </div>
            `;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${op.nome}</strong></td>
                <td class="col-centro"><strong>${op.total}</strong></td>
                <td class="col-centro admin-val-sucesso"><strong>${op.compareceu}</strong></td>
                <td class="col-centro admin-val-alerta">${op.pendente}</td>
                <td class="col-centro admin-val-perigo">${op.faltou}</td>
                <td class="col-centro">${badgesRevisoes}</td>
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
            btnVoltarAdmin.classList.add('oculto');
            btnVoltarAdmin.style.setProperty('display', 'none', 'important');
            aplicarVisaoRelatorio();
        });
    }

    // 12. PARÂMETROS DE URL E PDF
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