document.addEventListener('DOMContentLoaded', async function() {
    const SUPABASE_URL = 'https://potvtrepcoswvzmkewic.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_iMbay5YOnrrehpqI9qU7HA_vMapr-DY';
    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    // 1. SINCRONIZACAO E LEITURA DE METAS POR MARCA
    let cacheMetasBanco = {};
    async function sincronizarMetasBanco() {
        try {
            const { data, error } = await supabaseClient.from('metas_mensais').select('*');
            if (!error && data) {
                cacheMetasBanco = {};
                data.forEach(item => {
                    const chave = `${item.mes_referencia}_${normalizarNomeMarca(item.equipe)}`;
                    cacheMetasBanco[chave] = parseInt(item.meta_valor, 10);
                });
            }
        } catch (e) {
            console.warn('Tabela metas_mensais opcional:', e);
        }
    }

    function normalizarNomeMarca(str) {
        if (!str) return 'Toyota';
        const s = str.trim();
        const u = s.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toUpperCase();
        if (u.includes('TOYOTA')) return 'Toyota';
        if (u.includes('VW') || u.includes('VOLKS')) return 'Volkswagen';
        if (u.includes('FIAT')) return 'Fiat';
        if (u.includes('RENAULT')) return 'Renault';
        if (u.includes('BYD')) return 'BYD';
        if (u.includes('CHERY')) return 'Chery';
        if (u.includes('NISSAN')) return 'Nissan';
        if (u.includes('FORD')) return 'Ford';
        if (u.includes('HYUNDAI')) return 'Hyundai';
        if (u.includes('OMODA')) return 'Omoda';
        if (u.includes('KIA')) return 'Kia';
        if (u.includes('AUDI')) return 'Audi';
        if (u.includes('CITROEN')) return 'Citroen';
        if (u.includes('GEELY')) return 'Geely';
        return s;
    }

    function obterMetaEquipe(mesAno, marca) {
        const marcaNorm = normalizarNomeMarca(marca);
        const chave = `${mesAno}_${marcaNorm}`;
        if (cacheMetasBanco[chave]) return cacheMetasBanco[chave];
        
        const salvoLocal = localStorage.getItem(`meta_${chave}`);
        if (salvoLocal) return parseInt(salvoLocal, 10);
        
        if (marcaNorm === 'Toyota') return 900;
        if (['Renault', 'Fiat', 'Volkswagen'].includes(marcaNorm)) return 300;
        return 100;
    }

    function obterMetaGeral(mesAno) {
        const chave = `${mesAno}_Geral`;
        if (cacheMetasBanco[chave]) return cacheMetasBanco[chave];
        const salvoLocal = localStorage.getItem(`meta_${chave}`);
        if (salvoLocal) return parseInt(salvoLocal, 10);
        return 2000;
    }

    // ELEMENTOS DO DOM
    const secaoFiltrosAdmin = document.getElementById('secao-filtros-admin');
    const filtroMesAdmin = document.getElementById('filtro-mes-admin');
    const filtroEquipeAdmin = document.getElementById('filtro-equipe-admin');
    const btnAbrirModalMetas = document.getElementById('btn-abrir-modal-metas');

    const modalConfigMetas = document.getElementById('modalConfigMetas');
    const btnFecharModalMetas = document.getElementById('btnFecharModalMetas');
    const btnCancelarModalMetas = document.getElementById('btnCancelarModalMetas');
    const btnSalvarModalMetas = document.getElementById('btnSalvarModalMetas');
    const modalMetaMes = document.getElementById('modal-meta-mes');
    const modalMetaEquipe = document.getElementById('modal-meta-equipe');
    const modalMetaValor = document.getElementById('modal-meta-valor');

    const secaoMetricasConsultor = document.getElementById('secao-metricas-consultor');
    const filtroMesConsultor = document.getElementById('filtro-mes-consultor');
    const wrapperSeletorMarca = document.getElementById('wrapper-seletor-marca');
    const filtroMarcaConsultor = document.getElementById('filtro-marca-consultor');
    const legendaCardPeriodo = document.getElementById('legenda-card-periodo');
    const cardMonitoriaConsultor = document.getElementById('card-monitoria-consultor');

    const valorConfirmadoEl = document.querySelector('.bonus-confirmado');
    const valorPrevistoEl = document.querySelector('.bonus-previsto');
    const detalheConfirmadoEl = document.querySelector('.bonus-confirmado')?.parentElement.querySelector('.card-detalhe');
    const inputMonitoria = document.getElementById('input-monitoria');
    const badgeAjusteMonitoria = document.getElementById('badge-ajuste-monitoria');
    const btnAcaoMonitoria = document.getElementById('btn-acao-monitoria');

    const linkMenuImportar = document.getElementById('link-menu-importar');

    const secaoMetaEquipe = document.getElementById('secao-meta-equipe');
    const tituloMetaEquipe = document.getElementById('titulo-meta-equipe');
    const textoProgressoMeta = document.getElementById('texto-progresso-meta');
    const textoRestanteMeta = document.getElementById('texto-restante-meta');
    const barraProgressoMeta = document.getElementById('barra-progresso-meta');
    const badgeBonusEquipe = document.getElementById('badge-bonus-equipe');

    const btnAbaVisaoGeral = document.getElementById('btn-aba-visao-geral');
    const btnAbaCategorias = document.getElementById('btn-aba-categorias');
    const btnAbaRanking = document.getElementById('btn-aba-ranking');
    const btnAbaEquipe = document.getElementById('btn-aba-equipe');

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

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session || !session.user) {
        window.location.href = 'login.html';
        return;
    }
    const usuarioAtual = session.user;

    let isAdmin = false;
    let marcasPermitidasUsuario = ['Toyota'];
    let equipeOficialUsuario = 'Toyota';
    let nomeUsuarioPerfil = '';

    try {
        const { data: perfil } = await supabaseClient
            .from('perfis')
            .select('role, equipe, nome')
            .eq('id', usuarioAtual.id)
            .maybeSingle();

        if (perfil) {
            if (perfil.role === 'admin') isAdmin = true;
            if (perfil.equipe) {
                equipeOficialUsuario = perfil.equipe;
                marcasPermitidasUsuario = perfil.equipe.split('|').map(s => normalizarNomeMarca(s.trim()));
            }
            if (perfil.nome) nomeUsuarioPerfil = perfil.nome;
        }
    } catch (e) {
        console.warn('Erro ao carregar perfil:', e);
    }

    if (usuarioAtual.email === 'usuariotestesite01@gmail.com' || usuarioAtual.email?.includes('admin')) {
        isAdmin = true;
    }

    if (isAdmin) {
        if (linkMenuImportar) linkMenuImportar.classList.remove('oculto');
        if (secaoFiltrosAdmin) secaoFiltrosAdmin.classList.remove('oculto');
        if (secaoMetricasConsultor) secaoMetricasConsultor.classList.add('oculto');
        if (secaoMetaEquipe) secaoMetaEquipe.classList.remove('oculto');
        if (secaoAdminRanking) secaoAdminRanking.classList.remove('oculto');
        if (badgeBonusEquipe) badgeBonusEquipe.classList.add('oculto');
        if (btnAbaEquipe) btnAbaEquipe.classList.add('oculto');
        if (cardGraficoBonusMensal) cardGraficoBonusMensal.classList.add('oculto');
        if (btnAbaVisaoGeral) btnAbaVisaoGeral.textContent = 'Efetividade';
    } else {
        if (linkMenuImportar) linkMenuImportar.classList.add('oculto');
        if (secaoFiltrosAdmin) secaoFiltrosAdmin.classList.add('oculto');
        if (secaoMetricasConsultor) secaoMetricasConsultor.classList.remove('oculto');
        if (secaoMetaEquipe) secaoMetaEquipe.classList.remove('oculto');
        if (secaoAdminRanking) secaoAdminRanking.classList.add('oculto');
        if (badgeBonusEquipe) badgeBonusEquipe.classList.remove('oculto');
        if (btnAbaEquipe) btnAbaEquipe.classList.remove('oculto');
        if (cardGraficoBonusMensal) cardGraficoBonusMensal.classList.remove('oculto');
        if (cardGraficoEquipeAdmin) cardGraficoEquipeAdmin.classList.add('oculto');
        if (btnAbaVisaoGeral) btnAbaVisaoGeral.textContent = 'Efetividade & Bônus';

        // SELETOR EMBUTIDO NO CARD 1 SE O CONSULTOR FOR MULTIMARCA
        if (wrapperSeletorMarca && filtroMarcaConsultor) {
            if (marcasPermitidasUsuario.length > 1) {
                wrapperSeletorMarca.classList.remove('oculto');
                filtroMarcaConsultor.innerHTML = '<option value="todas">Todas as Minhas Marcas</option>';
                marcasPermitidasUsuario.forEach(m => {
                    const opt = document.createElement('option');
                    opt.value = m;
                    opt.textContent = m;
                    filtroMarcaConsultor.appendChild(opt);
                });
                if (legendaCardPeriodo) legendaCardPeriodo.textContent = 'Mês e marca de atuação';
            } else {
                wrapperSeletorMarca.classList.add('oculto');
                if (legendaCardPeriodo) legendaCardPeriodo.textContent = 'Filtre o período de apuração';
            }
        }
    }

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
        const tagEquipe = !isAdmin ? `<span class="tag-badge-equipe">${marcasPermitidasUsuario.join(' | ')}</span>` : '';

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
    let abaGraficoAtual = 'visao-geral';

    if (btnAbrirModalMetas && modalConfigMetas) {
        btnAbrirModalMetas.addEventListener('click', () => {
            const mesAtualSel = filtroMesAdmin ? filtroMesAdmin.value : valorMesPadrao;
            modalMetaMes.value = mesAtualSel;
            const eqAtual = modalMetaEquipe.value || 'Toyota';
            modalMetaValor.value = (eqAtual === 'Geral') ? obterMetaGeral(mesAtualSel) : obterMetaEquipe(mesAtualSel, eqAtual);
            if (typeof window.sincronizarDropdownModal === 'function') {
                window.sincronizarDropdownModal(eqAtual);
            }
            modalConfigMetas.style.display = 'flex';
        });

        const fecharModal = () => { modalConfigMetas.style.display = 'none'; };
        btnFecharModalMetas?.addEventListener('click', fecharModal);
        btnCancelarModalMetas?.addEventListener('click', fecharModal);
        modalConfigMetas.addEventListener('click', (e) => {
            if (e.target === modalConfigMetas) fecharModal();
        });

        modalMetaEquipe?.addEventListener('change', () => {
            const mesSel = modalMetaMes.value;
            const eqSel = modalMetaEquipe.value;
            modalMetaValor.value = (eqSel === 'Geral') ? obterMetaGeral(mesSel) : obterMetaEquipe(mesSel, eqSel);
        });

        modalMetaMes?.addEventListener('change', () => {
            const mesSel = modalMetaMes.value;
            const eqSel = modalMetaEquipe.value;
            modalMetaValor.value = (eqSel === 'Geral') ? obterMetaGeral(mesSel) : obterMetaEquipe(mesSel, eqSel);
        });

        btnSalvarModalMetas?.addEventListener('click', async () => {
            const mesSel = modalMetaMes.value;
            const eqSel = modalMetaEquipe.value;
            const val = parseInt(modalMetaValor.value, 10);

            if (!mesSel || isNaN(val) || val <= 0) {
                alert('Preencha um valor de meta válido.');
                return;
            }

            btnSalvarModalMetas.disabled = true;
            btnSalvarModalMetas.textContent = 'A guardar...';

            const eqNorm = (eqSel === 'Geral') ? 'Geral' : normalizarNomeMarca(eqSel);
            const chave = `${mesSel}_${eqNorm}`;
            localStorage.setItem(`meta_${chave}`, String(val));
            cacheMetasBanco[chave] = val;

            try {
                await supabaseClient.from('metas_mensais').upsert({
                    mes_referencia: mesSel,
                    equipe: eqNorm,
                    meta_valor: val,
                    atualizado_em: new Date().toISOString()
                }, { onConflict: 'mes_referencia, equipe' });
            } catch (err) {
                console.warn('Salvo localmente:', err);
            }

            fecharModal();
            aplicarVisaoRelatorio();
            btnSalvarModalMetas.disabled = false;
            btnSalvarModalMetas.textContent = 'Guardar Meta';
        });
    }

    function obterChaveMonitoria(mes) {
        return `nota_monitoria_${usuarioAtual.id}_${mes}`;
    }

    function atualizarEstadoVisualMonitoria(mes) {
        if (!inputMonitoria || !btnAcaoMonitoria) return;
        const valorSalvo = localStorage.getItem(obterChaveMonitoria(mes));

        if (valorSalvo !== null) {
            inputMonitoria.value = valorSalvo;
            inputMonitoria.disabled = true;
            btnAcaoMonitoria.textContent = 'Editar';
            btnAcaoMonitoria.classList.add('btn-modo-editar');
            btnAcaoMonitoria.title = 'Clique para editar a nota deste mês';
        } else {
            inputMonitoria.disabled = false;
            btnAcaoMonitoria.textContent = 'Salvar';
            btnAcaoMonitoria.classList.remove('btn-modo-editar');
            btnAcaoMonitoria.title = 'Salvar nota deste mês';
        }
    }

    if (btnAcaoMonitoria) {
        btnAcaoMonitoria.addEventListener('click', () => {
            const mesAtualSel = filtroMesConsultor ? filtroMesConsultor.value : valorMesPadrao;
            const chave = obterChaveMonitoria(mesAtualSel);
            const estaSalvo = localStorage.getItem(chave) !== null;

            if (estaSalvo && inputMonitoria.disabled) {
                inputMonitoria.disabled = false;
                inputMonitoria.focus();
                btnAcaoMonitoria.textContent = 'Salvar';
                btnAcaoMonitoria.classList.remove('btn-modo-editar');
            } else {
                let valor = parseFloat(inputMonitoria.value);
                if (isNaN(valor)) valor = 100;
                if (valor < 0) valor = 0;
                if (valor > 100) valor = 100;
                inputMonitoria.value = valor;

                localStorage.setItem(chave, String(valor));
                inputMonitoria.disabled = true;
                btnAcaoMonitoria.textContent = 'Editar';
                btnAcaoMonitoria.classList.add('btn-modo-editar');

                aplicarVisaoRelatorio();
            }
        });
    }

    function aplicarVisibilidadeAbas() {
        btnAbaVisaoGeral.classList.toggle('ativo', abaGraficoAtual === 'visao-geral');
        btnAbaCategorias.classList.toggle('ativo', abaGraficoAtual === 'categorias');
        if (btnAbaRanking) btnAbaRanking.classList.toggle('ativo', abaGraficoAtual === 'ranking');
        if (btnAbaEquipe) btnAbaEquipe.classList.toggle('ativo', abaGraficoAtual === 'equipe');

        gradeGraficos.classList.add('oculto');
        secaoGraficoRevisoesTipo.classList.add('oculto');
        if (secaoRankingOperadores) secaoRankingOperadores.classList.add('oculto');
        if (secaoVolumeEquipeConsultor) secaoVolumeEquipeConsultor.classList.add('oculto');

        if (abaGraficoAtual === 'ranking') {
            if (secaoAdminRanking) secaoAdminRanking.classList.add('oculto');
            if (secaoRankingOperadores) secaoRankingOperadores.classList.remove('oculto');
        } else {
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
            const listaMarcas = new Set([
                'Toyota', 'Chery', 'Fiat', 'Ford', 'Nissan', 'Volkswagen',
                'Hyundai', 'Renault', 'BYD', 'Geely', 'Audi', 'Citroen', 'Kia', 'Omoda'
            ]);
            
            filtroEquipeAdmin.innerHTML = '<option value="todas">Todas as Marcas</option>';
            [...listaMarcas].sort().forEach(m => {
                const opt = document.createElement('option');
                opt.value = m;
                opt.textContent = m;
                filtroEquipeAdmin.appendChild(opt);
            });

            filtroEquipeAdmin.value = 'todas';
        } catch (e) {}
    }

    async function carregarDados() {
        const mesSelecionado = isAdmin ? filtroMesAdmin.value : filtroMesConsultor.value;

        if (!isAdmin) {
            atualizarEstadoVisualMonitoria(mesSelecionado);
        }

        todosAgendamentosHistorico = [];

        try {
            const { data: dataView, error: errorView } = await supabaseClient
                .from('vw_agendamentos_completos')
                .select('*')
                .order('data_revisao', { ascending: true });

            if (!errorView && dataView && dataView.length > 0) {
                todosAgendamentosHistorico = dataView.map(i => ({
                    ...i,
                    marca: normalizarNomeMarca(i.marca || i.autor_equipe || 'Toyota')
                }));
            }
        } catch (e) {}

        if (todosAgendamentosHistorico.length === 0) {
            try {
                const { data: dataRaw } = await supabaseClient
                    .from('agendamentos')
                    .select('*')
                    .order('data_revisao', { ascending: true });

                const { data: perfisRaw } = await supabaseClient
                    .from('perfis')
                    .select('id, nome, equipe');

                const mapaPerfis = new Map();
                (perfisRaw || []).forEach(p => mapaPerfis.set(p.id, p));

                todosAgendamentosHistorico = (dataRaw || []).map(item => {
                    const perfil = mapaPerfis.get(item.user_id);
                    return {
                        ...item,
                        autor_nome: perfil?.nome || 'Consultor',
                        autor_equipe: perfil?.equipe || 'Toyota',
                        marca: normalizarNomeMarca(item.marca || perfil?.equipe || 'Toyota')
                    };
                });
            } catch (err) {
                console.error('Falha de leitura no Supabase:', err);
            }
        }

        agendamentosMesAtual = todosAgendamentosHistorico.filter(item =>
            item.data_revisao && String(item.data_revisao).startsWith(mesSelecionado)
        );

        aplicarVisaoRelatorio();
    }

    function aplicarVisaoRelatorio() {
        const mesSelecionado = isAdmin ? filtroMesAdmin.value : filtroMesConsultor.value;

        if (!isAdmin) {
            // =============================================================
            // VISAO DO CONSULTOR
            // =============================================================
            if (secaoAdminRanking) secaoAdminRanking.classList.add('oculto');
            if (secaoMetaEquipe) secaoMetaEquipe.classList.remove('oculto');
            if (cardGraficoBonusMensal) cardGraficoBonusMensal.classList.remove('oculto');
            if (cardGraficoEquipeAdmin) cardGraficoEquipeAdmin.classList.add('oculto');
            if (badgeBonusEquipe) badgeBonusEquipe.classList.remove('oculto');

            const marcaFiltroConsultor = filtroMarcaConsultor ? filtroMarcaConsultor.value : 'todas';

            // REGRA: Monitoria so aparece se estiver em "Todas as Minhas Marcas" (ou se o usuario so tiver 1 marca)
            const ehMultimarca = marcasPermitidasUsuario.length > 1;
            if (cardMonitoriaConsultor) {
                if (ehMultimarca && marcaFiltroConsultor !== 'todas') {
                    cardMonitoriaConsultor.classList.add('oculto');
                } else {
                    cardMonitoriaConsultor.classList.remove('oculto');
                }
            }

            if (tituloGraficoVolume) {
                tituloGraficoVolume.textContent = (marcaFiltroConsultor === 'todas') 
                    ? 'Minha Efetividade' 
                    : `Minha Efetividade: ${marcaFiltroConsultor}`;
            }
            if (subtituloGraficoVolume) subtituloGraficoVolume.textContent = 'Taxa de presença';

            let notaMonitoria = inputMonitoria ? parseFloat(inputMonitoria.value) : 100;
            if (isNaN(notaMonitoria)) notaMonitoria = 100;

            let fatorMonitoria = (notaMonitoria >= 90) ? 1.10 : 0.90;
            if (badgeAjusteMonitoria) {
                badgeAjusteMonitoria.textContent = notaMonitoria >= 90 ? '+10% Bônus' : '-10% Redução';
                badgeAjusteMonitoria.className = notaMonitoria >= 90 ? 'badge-ajuste-monitoria' : 'badge-ajuste-monitoria-reducao';
            }

            // 1. Filtragem da Marca Ativa
            let agendamentosEquipe = [];
            let metaEquipeDefinida = 0;
            let rotuloMeta = '';

            if (marcaFiltroConsultor === 'todas') {
                agendamentosEquipe = agendamentosMesAtual.filter(i => marcasPermitidasUsuario.includes(i.marca));
                metaEquipeDefinida = marcasPermitidasUsuario.reduce((acc, m) => acc + obterMetaEquipe(mesSelecionado, m), 0);
                rotuloMeta = marcasPermitidasUsuario.join(' | ').toUpperCase();
            } else {
                agendamentosEquipe = agendamentosMesAtual.filter(i => i.marca.toUpperCase() === marcaFiltroConsultor.toUpperCase());
                metaEquipeDefinida = obterMetaEquipe(mesSelecionado, marcaFiltroConsultor);
                rotuloMeta = marcaFiltroConsultor.toUpperCase();
            }

            const comparecidosEquipe = agendamentosEquipe.filter(item => item.status === 'compareceu').length;
            const percentualExatoEquipe = (comparecidosEquipe / Math.max(1, metaEquipeDefinida)) * 100;
            const percentualMeta = Math.min(100, Math.floor(percentualExatoEquipe));
            const restanteMeta = Math.max(0, metaEquipeDefinida - comparecidosEquipe);

            let bonusEquipe = 0.00;
            if (percentualMeta >= 80) {
                bonusEquipe = parseFloat(percentualMeta);
            }

            tituloMetaEquipe.textContent = `META DA MARCA (${rotuloMeta})`;
            textoProgressoMeta.textContent = `${comparecidosEquipe} / ${metaEquipeDefinida} agendamentos (${percentualMeta}%)`;
            barraProgressoMeta.style.width = `${percentualMeta}%`;

            if (restanteMeta === 0) {
                textoRestanteMeta.textContent = 'Parabéns! Meta da marca atingida!';
                textoRestanteMeta.className = 'meta-badge-sucesso';
            } else {
                textoRestanteMeta.textContent = `Faltam ${restanteMeta} agendamento${restanteMeta === 1 ? '' : 's'} para a meta`;
                textoRestanteMeta.className = 'meta-badge-restante';
            }

            if (badgeBonusEquipe) {
                if (percentualMeta >= 80) {
                    badgeBonusEquipe.textContent = `Bônus Equipe: + R$ ${bonusEquipe.toFixed(2).replace('.', ',')} (${percentualMeta}%)`;
                    badgeBonusEquipe.className = 'meta-badge-bonus-equipe';
                } else {
                    badgeBonusEquipe.textContent = `Bônus Equipe: R$ 0,00 (Mínimo 80%)`;
                    badgeBonusEquipe.className = 'meta-badge-bonus-equipe bloqueado';
                }
            }

            const totalAgendadosEquipe = agendamentosEquipe.length;
            const percentualPrevistoEquipe = Math.min(100, Math.floor((totalAgendadosEquipe / Math.max(1, metaEquipeDefinida)) * 100));
            let bonusEquipePrevisto = (percentualPrevistoEquipe >= 80) ? parseFloat(percentualPrevistoEquipe) : 0.00;

            // 2. Meus Agendamentos
            let meusAgendamentosMes = agendamentosMesAtual.filter(item => item.user_id === usuarioAtual.id);
            if (marcaFiltroConsultor !== 'todas') {
                meusAgendamentosMes = meusAgendamentosMes.filter(item => item.marca.toUpperCase() === marcaFiltroConsultor.toUpperCase());
            }

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

            const fatorAplicado = (ehMultimarca && marcaFiltroConsultor !== 'todas') ? 1.00 : fatorMonitoria;

            // REGRA ALINHADA COM O SUPORTE:
            // Soma o Bônus Individual Base com o Bônus de Equipe primeiro,
            // e depois incide a Monitoria sobre o valor total conjunto.
            const subtotalRealizado = somaBonusBaseRealizado + bonusEquipe;
            const bonusFinalRealizado = subtotalRealizado * fatorAplicado;

            const subtotalPrevisto = somaBonusBasePrevisto + bonusEquipePrevisto;
            const bonusFinalPrevisto = subtotalPrevisto * fatorAplicado;

            if (valorConfirmadoEl) valorConfirmadoEl.textContent = `R$ ${bonusFinalRealizado.toFixed(2).replace('.', ',')}`;
            if (valorPrevistoEl) valorPrevistoEl.textContent = `R$ ${bonusFinalPrevisto.toFixed(2).replace('.', ',')}`;
            
            if (detalheConfirmadoEl) {
                const rotuloMonitoria = fatorAplicado >= 1.10 ? ' + 10% mon.' : (fatorAplicado <= 0.90 ? ' - 10% mon.' : '');
                if (bonusEquipe > 0) {
                    detalheConfirmadoEl.textContent = `${totalCompareceu} ${totalCompareceu === 1 ? 'presença' : 'presenças'} (R$ ${somaBonusBaseRealizado.toFixed(2).replace('.', ',')} ind. + R$ ${bonusEquipe.toFixed(2).replace('.', ',')} eq.${rotuloMonitoria})`;
                } else {
                    detalheConfirmadoEl.textContent = `${totalCompareceu} ${totalCompareceu === 1 ? 'presença confirmada' : 'presenças confirmadas'}${rotuloMonitoria ? ' (' + rotuloMonitoria.trim() + ')' : ''}`;
                }
            }

        } else {
            // ADMIN
            if (secaoMetaEquipe) secaoMetaEquipe.classList.remove('oculto');
            if (secaoAdminRanking) secaoAdminRanking.classList.remove('oculto');
            if (badgeBonusEquipe) badgeBonusEquipe.classList.add('oculto');
            if (cardGraficoBonusMensal) cardGraficoBonusMensal.classList.add('oculto');
            if (secaoVolumeEquipeConsultor) secaoVolumeEquipeConsultor.classList.add('oculto');

            const marcaFiltro = filtroEquipeAdmin ? filtroEquipeAdmin.value : 'todas';

            if (marcaFiltro === 'todas') {
                if (tituloGraficoVolume) tituloGraficoVolume.textContent = 'Efetividade Geral';
                if (subtituloGraficoVolume) subtituloGraficoVolume.textContent = 'Taxa de presença de todas as marcas';

                const comparecidosGeral = agendamentosMesAtual.filter(item => item.status === 'compareceu').length;
                const metaGeral = obterMetaGeral(mesSelecionado);
                const percGeral = Math.min(100, Math.round((comparecidosGeral / metaGeral) * 100));
                const restGeral = Math.max(0, metaGeral - comparecidosGeral);

                tituloMetaEquipe.textContent = 'META TOTAL DA CENTRAL DE AGENDAMENTOS';
                textoProgressoMeta.textContent = `${comparecidosGeral} / ${metaGeral} agendamentos (${percGeral}%)`;
                barraProgressoMeta.style.width = `${percGeral}%`;

                if (textoRestanteMeta) {
                    textoRestanteMeta.textContent = restGeral === 0 
                        ? 'Parabéns! Meta geral atingida!' 
                        : `Faltam ${restGeral} agendamentos no total`;
                    textoRestanteMeta.className = restGeral === 0 ? 'meta-badge-sucesso' : 'meta-badge-restante';
                }

                if (btnVoltarAdmin) {
                    btnVoltarAdmin.classList.add('oculto');
                    btnVoltarAdmin.style.setProperty('display', 'none', 'important');
                }
                renderizarTabelaEquipes(agendamentosMesAtual);

            } else {
                if (tituloGraficoVolume) tituloGraficoVolume.textContent = `Efetividade: ${marcaFiltro}`;
                if (subtituloGraficoVolume) subtituloGraficoVolume.textContent = 'Taxa de presença desta marca';

                const agendamentosMarca = agendamentosMesAtual.filter(item => item.marca.toUpperCase() === marcaFiltro.toUpperCase());
                const comparecidosMarca = agendamentosMarca.filter(item => item.status === 'compareceu').length;
                const metaMarca = obterMetaEquipe(mesSelecionado, marcaFiltro);
                const percMarca = Math.min(100, Math.round((comparecidosMarca / Math.max(1, metaMarca)) * 100));
                const restMarca = Math.max(0, metaMarca - comparecidosMarca);

                tituloMetaEquipe.textContent = `META DA MARCA: ${marcaFiltro.toUpperCase()}`;
                textoProgressoMeta.textContent = `${comparecidosMarca} / ${metaMarca} agendamentos (${percMarca}%)`;
                barraProgressoMeta.style.width = `${percMarca}%`;

                if (textoRestanteMeta) {
                    textoRestanteMeta.textContent = restMarca === 0 
                        ? 'Parabéns! Meta da marca atingida!' 
                        : `Faltam ${restMarca} agendamentos para a meta`;
                    textoRestanteMeta.className = restMarca === 0 ? 'meta-badge-sucesso' : 'meta-badge-restante';
                }

                if (btnVoltarAdmin) {
                    btnVoltarAdmin.classList.remove('oculto');
                    btnVoltarAdmin.style.setProperty('display', 'inline-flex', 'important');
                }
                renderizarTabelaOperadores(agendamentosMarca, marcaFiltro);
            }
        }

        aplicarVisibilidadeAbas();
        renderizarGraficosAtivos();
    }

    function renderizarGraficosAtivos() {
        const marcaFiltro = isAdmin 
            ? (filtroEquipeAdmin ? filtroEquipeAdmin.value : 'todas') 
            : (filtroMarcaConsultor ? filtroMarcaConsultor.value : 'todas');
        
        let dadosFiltrados = agendamentosMesAtual;

        if (isAdmin) {
            if (marcaFiltro !== 'todas') {
                dadosFiltrados = agendamentosMesAtual.filter(item => item.marca.toUpperCase() === marcaFiltro.toUpperCase());
            }
        } else {
            if (marcaFiltro === 'todas') {
                dadosFiltrados = agendamentosMesAtual.filter(item => marcasPermitidasUsuario.includes(item.marca));
            } else {
                dadosFiltrados = agendamentosMesAtual.filter(item => item.marca.toUpperCase() === marcaFiltro.toUpperCase());
            }
        }

        let meusAgendamentosMes = agendamentosMesAtual.filter(item => item.user_id === usuarioAtual.id);
        if (!isAdmin && marcaFiltro !== 'todas') {
            meusAgendamentosMes = meusAgendamentosMes.filter(item => item.marca.toUpperCase() === marcaFiltro.toUpperCase());
        }

        if (abaGraficoAtual === 'visao-geral') {
            let totalCompareceu = 0, totalPendente = 0, totalFaltou = 0;
            const listaPresenca = isAdmin ? dadosFiltrados : meusAgendamentosMes;

            listaPresenca.forEach(item => {
                const status = item.status || 'pendente';
                if (status === 'compareceu') totalCompareceu++;
                else if (status === 'pendente') totalPendente++;
                else if (status === 'faltou') totalFaltou++;
            });

            renderizarGraficoVolume(totalCompareceu, totalPendente, totalFaltou);

            if (!isAdmin) {
                let meusHistorico = todosAgendamentosHistorico.filter(item => item.user_id === usuarioAtual.id);
                if (marcaFiltro !== 'todas') {
                    meusHistorico = meusHistorico.filter(item => item.marca.toUpperCase() === marcaFiltro.toUpperCase());
                }
                renderizarGraficoBonusMensal(meusHistorico);
            } else if (marcaFiltro !== 'todas') {
                if (tituloGraficoEquipeAdmin) tituloGraficoEquipeAdmin.textContent = `Operadores de ${marcaFiltro}`;
                if (subtituloGraficoEquipeAdmin) subtituloGraficoEquipeAdmin.textContent = 'Volume por operador desta marca';
                renderizarGraficoBarrasHorizontais('graficoEquipeAdmin', dadosFiltrados);
            }

        } else if (abaGraficoAtual === 'categorias') {
            const listaCategorias = isAdmin ? dadosFiltrados : meusAgendamentosMes;
            if (tituloGraficoRevisoesTipo) {
                tituloGraficoRevisoesTipo.textContent = !isAdmin 
                    ? 'Minhas Revisões por Categoria' 
                    : (marcaFiltro === 'todas' ? 'Revisões por Categoria (Todas as Marcas)' : `Revisões por Categoria: ${marcaFiltro}`);
            }
            renderizarGraficoRevisoesPorTipo(listaCategorias);

        } else if (abaGraficoAtual === 'ranking') {
            renderizarRankingOperadores(agendamentosMesAtual);

        } else if (abaGraficoAtual === 'equipe') {
            const rotulo = (!isAdmin && marcaFiltro !== 'todas') ? marcaFiltro : marcasPermitidasUsuario.join(' | ');
            if (tituloGraficoEquipeConsultor) tituloGraficoEquipeConsultor.textContent = `Volume da Equipe: ${rotulo}`;
            if (subtituloGraficoEquipeConsultor) subtituloGraficoEquipeConsultor.textContent = 'Volume por operador desta equipe';
            renderizarGraficoBarrasHorizontais('graficoEquipeConsultor', dadosFiltrados);
        }
    }

    // RANKING OFICIAL UNIFICADO POR OPERADOR (PUXA A EQUIPE CADASTRADA NO SUPABASE)
    function renderizarRankingOperadores(agendamentos) {
        if (!containerRankingLista) return;
        containerRankingLista.innerHTML = '';

        const operadores = {};

        agendamentos.forEach(item => {
            const id = item.user_id || item.autor_nome || 'desconhecido';
            if (!operadores[id]) {
                operadores[id] = {
                    id: id,
                    nome: (item.autor_nome || 'Operador').trim(),
                    equipeOficial: item.autor_equipe || item.marca || 'Geral',
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
                        <span>${op.equipeOficial} • ${taxaPresenca}% de presença</span>
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
                const mesAno = String(item.data_revisao).substring(0, 7);
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

    function renderizarTabelaEquipes(agendamentos) {
        if (!tituloTabelaAdmin || !tabelaCabecalhoAdmin || !tabelaCorpoAdmin) return;
        
        tituloTabelaAdmin.textContent = 'Desempenho por Marca';
        subtituloTabelaAdmin.textContent = 'Acompanhe por montadora ou filtre individualmente';
        tabelaCabecalhoAdmin.innerHTML = `
            <tr>
                <th>MARCA / MONTADORA</th>
                <th class="col-centro">TOTAL AGENDADOS</th>
                <th class="col-centro">COMPARECIDOS</th>
                <th class="col-centro">NO-SHOW</th>
                <th class="col-centro">TAXA DE PRESENÇA</th>
                <th class="col-centro">AÇÃO</th>
            </tr>
        `;

        const grupos = {};
        agendamentos.forEach(item => {
            const m = normalizarNomeMarca(item.marca || 'Toyota');
            if (!grupos[m]) grupos[m] = { marca: m, total: 0, compareceu: 0, faltou: 0 };
            grupos[m].total++;
            if (item.status === 'compareceu') grupos[m].compareceu++;
            else if (item.status === 'faltou') grupos[m].faltou++;
        });

        const lista = Object.values(grupos).sort((a, b) => b.total - a.total);
        tabelaCorpoAdmin.innerHTML = '';

        if (lista.length === 0) {
            tabelaCorpoAdmin.innerHTML = '<tr><td colspan="6" class="celula-vazia-mensagem">Nenhum agendamento neste mês.</td></tr>';
            return;
        }

        lista.forEach(itemMarca => {
            const taxa = itemMarca.total > 0 ? Math.round((itemMarca.compareceu / itemMarca.total) * 100) : 0;
            const badgeClasse = taxa >= 70 ? 'badge-taxa-alta' : 'badge-taxa-normal';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${itemMarca.marca}</strong></td>
                <td class="col-centro"><strong>${itemMarca.total}</strong></td>
                <td class="col-centro admin-val-sucesso"><strong>${itemMarca.compareceu}</strong></td>
                <td class="col-centro admin-val-perigo">${itemMarca.faltou}</td>
                <td class="col-centro">
                    <span class="badge-taxa-tabela ${badgeClasse}">
                        ${taxa}%
                    </span>
                </td>
                <td class="col-centro">
                    <button class="btn-ver-equipe" data-equipe="${itemMarca.marca}">
                        Ver Operadores ➔
                    </button>
                </td>
            `;
            tabelaCorpoAdmin.appendChild(tr);
        });

        document.querySelectorAll('.btn-ver-equipe').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const marca = e.currentTarget.dataset.equipe;
                if (filtroEquipeAdmin) filtroEquipeAdmin.value = marca;
                aplicarVisaoRelatorio();
            });
        });
    }

    function renderizarTabelaOperadores(agendamentos, nomeMarca) {
        if (!tituloTabelaAdmin || !tabelaCabecalhoAdmin || !tabelaCorpoAdmin) return;

        tituloTabelaAdmin.textContent = `Operadores de ${nomeMarca}`;
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
            const chave = item.user_id || item.autor_nome || 'desconhecido';
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
            tabelaCorpoAdmin.innerHTML = '<tr><td colspan="7" class="celula-vazia-mensagem">Nenhum agendamento para esta marca.</td></tr>';
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

    if (filtroMesAdmin) filtroMesAdmin.addEventListener('change', carregarDados);
    if (filtroEquipeAdmin) filtroEquipeAdmin.addEventListener('change', aplicarVisaoRelatorio);
    if (filtroMesConsultor) filtroMesConsultor.addEventListener('change', carregarDados);
    if (filtroMarcaConsultor) filtroMarcaConsultor.addEventListener('change', aplicarVisaoRelatorio);
    if (inputMonitoria) inputMonitoria.addEventListener('input', aplicarVisaoRelatorio);

    if (btnVoltarAdmin) {
        btnVoltarAdmin.addEventListener('click', () => {
            if (filtroEquipeAdmin) filtroEquipeAdmin.value = 'todas';
            btnVoltarAdmin.classList.add('oculto');
            btnVoltarAdmin.style.setProperty('display', 'none', 'important');
            aplicarVisaoRelatorio();
        });
    }

    const urlParams = new URLSearchParams(window.location.search);
    const parametroMes = urlParams.get('mes');
    const parametroEquipe = urlParams.get('equipe');
    const dispararImpressao = urlParams.get('imprimir') === 'true';

    if (parametroMes) {
        if (filtroMesAdmin) filtroMesAdmin.value = parametroMes;
        if (filtroMesConsultor) filtroMesConsultor.value = parametroMes;
    }

    await sincronizarMetasBanco();
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