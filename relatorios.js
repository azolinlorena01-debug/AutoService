document.addEventListener('DOMContentLoaded', async function() {
    const SUPABASE_URL = 'https://potvtrepcoswvzmkewic.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_iMbay5YOnrrehpqI9qU7HA_vMapr-DY';
    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    window.atualizarContadorDivergencias(supabaseClient);

    function intervaloDoMes(valorMes) {
        const [ano, mes] = valorMes.split('-');
        const ultimoDia = new Date(parseInt(ano, 10), parseInt(mes, 10), 0).getDate();
        return { inicio: `${ano}-${mes}-01`, fim: `${ano}-${mes}-${String(ultimoDia).padStart(2, '0')}` };
    }

    async function buscarTodasLinhas(montarConsulta, tamanho = 1000) {
        const primeira = await montarConsulta({ count: 'exact' }).range(0, tamanho - 1);
        if (primeira.error) throw primeira.error;
        let todas = primeira.data || [];
        if (todas.length < tamanho) return todas;
        if (typeof primeira.count === 'number') {
            const paginas = [];
            for (let de = tamanho; de < primeira.count; de += tamanho) paginas.push(montarConsulta().range(de, de + tamanho - 1));
            const resultados = await Promise.all(paginas);
            resultados.forEach(r => {
                if (r.error) throw r.error;
                todas = todas.concat(r.data || []);
            });
            return todas;
        }
        let de = tamanho;
        while (true) {
            const { data, error } = await montarConsulta().range(de, de + tamanho - 1);
            if (error) throw error;
            const bloco = data || [];
            todas = todas.concat(bloco);
            if (bloco.length < tamanho) break;
            de += tamanho;
        }
        return todas;
    }

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
        if (u.includes('JEEP')) return 'Jeep';
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

    const secaoFiltrosAdmin = document.getElementById('secao-filtros-admin');
    const filtroMesAdmin = document.getElementById('filtro-mes-admin');
    const filtroEquipeAdmin = document.getElementById('filtro-equipe-admin');
    let ddFiltroEquipe = null;
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
    const elNotaMonitoria = document.getElementById('nota-monitoria-valor');
    const detalheNotaMonitoria = document.getElementById('detalhe-nota-monitoria');
    const badgeAjusteMonitoria = document.getElementById('badge-ajuste-monitoria');


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
    const btnAbaAdmin = document.getElementById('btn-aba-admin');
    const secaoConfigAdmin = document.getElementById('secao-config-admin');

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


    if (isAdmin) {
        window.mostrarLinksAdmin();
        if (secaoFiltrosAdmin) secaoFiltrosAdmin.classList.remove('oculto');
        if (secaoMetricasConsultor) secaoMetricasConsultor.classList.add('oculto');
        if (secaoMetaEquipe) secaoMetaEquipe.classList.remove('oculto');
        if (secaoAdminRanking) secaoAdminRanking.classList.remove('oculto');
        if (badgeBonusEquipe) badgeBonusEquipe.classList.add('oculto');
        if (btnAbaEquipe) btnAbaEquipe.classList.add('oculto');
        if (btnAbaAdmin) btnAbaAdmin.classList.remove('oculto');
        if (cardGraficoBonusMensal) cardGraficoBonusMensal.classList.add('oculto');
        if (btnAbaVisaoGeral) btnAbaVisaoGeral.textContent = 'Efetividade';
    } else {
                const linkGestao = document.getElementById('link-menu-admin');
        if (linkGestao) linkGestao.classList.add('oculto');
        if (secaoFiltrosAdmin) secaoFiltrosAdmin.classList.add('oculto');
        if (secaoMetricasConsultor) secaoMetricasConsultor.classList.remove('oculto');
        if (secaoMetaEquipe) secaoMetaEquipe.classList.remove('oculto');
        if (secaoAdminRanking) secaoAdminRanking.classList.add('oculto');
        if (badgeBonusEquipe) badgeBonusEquipe.classList.remove('oculto');
        if (btnAbaEquipe) btnAbaEquipe.classList.remove('oculto');
        if (cardGraficoBonusMensal) cardGraficoBonusMensal.classList.remove('oculto');
        if (cardGraficoEquipeAdmin) cardGraficoEquipeAdmin.classList.add('oculto');
        if (btnAbaVisaoGeral) btnAbaVisaoGeral.textContent = 'Efetividade & Bônus';

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
        window.salvarMenuCache(areaAuth.innerHTML, isAdmin);

        document.getElementById('btn-sair-header')?.addEventListener('click', async () => {
            window.limparMenuCache();
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
                avisar('Preencha um valor de meta válido.');
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

    function aplicarVisibilidadeAbas() {
        btnAbaVisaoGeral.classList.toggle('ativo', abaGraficoAtual === 'visao-geral');
        btnAbaCategorias.classList.toggle('ativo', abaGraficoAtual === 'categorias');
        if (btnAbaRanking) btnAbaRanking.classList.toggle('ativo', abaGraficoAtual === 'ranking');
        if (btnAbaEquipe) btnAbaEquipe.classList.toggle('ativo', abaGraficoAtual === 'equipe');
        if (btnAbaAdmin) btnAbaAdmin.classList.toggle('ativo', abaGraficoAtual === 'admin');
        if (secaoConfigAdmin) secaoConfigAdmin.classList.toggle('oculto', abaGraficoAtual !== 'admin');

        gradeGraficos.classList.add('oculto');
        secaoGraficoRevisoesTipo.classList.add('oculto');
        if (secaoRankingOperadores) secaoRankingOperadores.classList.add('oculto');
        if (secaoVolumeEquipeConsultor) secaoVolumeEquipeConsultor.classList.add('oculto');

        if (abaGraficoAtual === 'admin') {
            if (secaoAdminRanking) secaoAdminRanking.classList.add('oculto');
        } else if (abaGraficoAtual === 'ranking') {
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
    if (btnAbaAdmin) btnAbaAdmin.addEventListener('click', () => trocarAbaGrafico('admin'));
    document.addEventListener('tema-alterado', () => renderizarGraficosAtivos());

    function sincronizarOpcaoOutrasMarcas(qtdOutras) {
        if (isAdmin || !filtroMarcaConsultor || !wrapperSeletorMarca) return;
        let opt = filtroMarcaConsultor.querySelector('option[value="outras"]');
        if (qtdOutras > 0) {
            if (!opt) {
                opt = document.createElement('option');
                opt.value = 'outras';
                filtroMarcaConsultor.appendChild(opt);
            }
            opt.textContent = `Outras marcas agendadas (${qtdOutras})`;
            wrapperSeletorMarca.classList.remove('oculto');
            if (legendaCardPeriodo) legendaCardPeriodo.textContent = 'Mês e marca de atuação';
        } else {
            if (opt) {
                if (filtroMarcaConsultor.value === 'outras') filtroMarcaConsultor.value = 'todas';
                opt.remove();
            }
            if (marcasPermitidasUsuario.length <= 1) {
                wrapperSeletorMarca.classList.add('oculto');
                if (legendaCardPeriodo) legendaCardPeriodo.textContent = 'Filtre o período de apuração';
            }
        }
    }

    function mostrarNotaMeta(texto, aoClicarDetalhes) {
        if (!secaoMetaEquipe) return;
        let nota = document.getElementById('nota-outras-marcas');
        if (!texto) {
            if (nota) nota.style.display = 'none';
            return;
        }
        if (!nota) {
            nota = document.createElement('div');
            nota.id = 'nota-outras-marcas';
            nota.className = 'nota-meta-detalhe';
            secaoMetaEquipe.appendChild(nota);
        }
        nota.textContent = texto + ' ';
        if (aoClicarDetalhes) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = 'Ver detalhes';
            btn.className = 'btn-link-detalhes';
            btn.addEventListener('click', aoClicarDetalhes);
            nota.appendChild(btn);
        }
        nota.style.display = 'block';
    }

    function nomeCurtoOperador(nomeCompleto) {
        const partes = String(nomeCompleto || 'Operador').trim().split(/\s+/)
            .filter((p, i) => i === 0 || !['DE', 'DA', 'DO', 'DAS', 'DOS', 'E'].includes(p.toUpperCase()));
        return partes.length >= 2 ? `${partes[0]} ${partes[1]}` : partes[0];
    }

    function abrirModalDetalhesMeta(d) {
        const esc = (t) => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
        let overlay = document.getElementById('modalDetalhesMeta');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'modalDetalhesMeta';
            overlay.className = 'modal-overlay';
            overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.style.display = 'none'; });
            document.addEventListener('keydown', (e) => { if (e.key === 'Escape') overlay.style.display = 'none'; });
            document.body.appendChild(overlay);
        }

        const linha = (rotulo, ag, comp, negrito) =>
            `<tr${negrito ? ' class="detalhes-linha-total"' : ''}><td>${rotulo}</td><td>${ag}</td><td>${comp}</td></tr>`;
        const titulo = (txt) =>
            `<tr class="detalhes-titulo-grupo"><td colspan="3">${esc(txt)}</td></tr>`;

        let html = titulo('Dentro da meta (marcas da equipe)');
        d.meusPorMarca.forEach(l => { html += linha(`Você: ${esc(l.marca)}`, l.total, l.comp); });
        d.colegas.forEach(l => { html += linha(`${esc(l.nome)} (${esc(l.marca)})`, l.total, l.comp); });
        html += linha('Total da meta', d.metaTotal, d.metaComp, true);
        if (d.outras.length > 0) {
            html += titulo('Fora da meta (outras marcas)');
            d.outras.forEach(l => { html += linha(`Você: ${esc(l.marca)}`, l.total, l.comp); });
        }
        html += linha('Total seu (conta no bônus)', d.seuTotal, d.seuComp, true);

        overlay.innerHTML = `
            <div class="modal-card-metas modal-card-detalhes">
                <div class="modal-topo-metas"><h3>De onde vêm esses números</h3></div>
                <div class="detalhes-corpo">
                    <table class="detalhes-tabela">
                        <thead><tr>
                            <th>Origem</th>
                            <th>Agendados</th>
                            <th>Compareceram</th>
                        </tr></thead>
                        <tbody>${html}</tbody>
                    </table>
                    <p class="detalhes-nota">
                        A barra de meta soma os comparecidos de todos os operadores nas marcas da equipe, inclusive agendamentos feitos por colegas.
                        Seu bônus considera tudo o que você agendou, em qualquer marca.
                    </p>
                </div>
                <div class="modal-rodape-metas">
                    <button type="button" class="btn-cancelar-modal" id="btnDetalhesVolume">Ver no Volume da Equipe</button>
                    <button type="button" class="btn-salvar-modal" id="btnDetalhesFechar">Fechar</button>
                </div>
            </div>`;
        overlay.style.display = 'flex';
        document.getElementById('btnDetalhesFechar').addEventListener('click', () => { overlay.style.display = 'none'; });
        document.getElementById('btnDetalhesVolume').addEventListener('click', () => {
            overlay.style.display = 'none';
            if (btnAbaEquipe) {
                btnAbaEquipe.click();
                btnAbaEquipe.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
    }

    function ehLancamentoManual(item) {
        return /^manual/i.test(String(item.observacao || '').trim());
    }

    function atualizarBotaoManuais() {
        const botao = document.getElementById('btn-ver-manuais');
        if (!botao) return;
        const qtd = agendamentosMesAtual.filter(ehLancamentoManual).length;
        botao.textContent = `📝 Manuais (${qtd})`;
    }

    function formatarDataCurta(dataString) {
        if (!dataString) return '-';
        const p = String(dataString).split('-');
        return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : dataString;
    }

    function abrirModalLancamentosManuais() {
        if (!isAdmin) return;
        const esc = (t) => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
        const nomesStatus = { compareceu: 'Compareceu', pendente: 'Pendente', faltou: 'No-Show' };

        let overlay = document.getElementById('modalLancamentosManuais');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'modalLancamentosManuais';
            overlay.className = 'modal-overlay';
            overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.style.display = 'none'; });
            document.addEventListener('keydown', (e) => { if (e.key === 'Escape') overlay.style.display = 'none'; });
            document.body.appendChild(overlay);
        }

        const mesSel = filtroMesAdmin ? filtroMesAdmin.value : valorMesPadrao;
        const lista = agendamentosMesAtual
            .filter(ehLancamentoManual)
            .sort((a, b) => String(a.data_revisao).localeCompare(String(b.data_revisao)));

        let linhas = '';
        lista.forEach(item => {
            const revisaoTxt = String(item.revisao || '').toUpperCase().includes('FACILITADA') ? 'Facilitada' : (String(item.revisao || '').toUpperCase() === 'SERVICO' ? 'Serviço' : `${item.revisao}ª`);
            const valor = (parseFloat(item.valor_unitario) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            const motivo = String(item.observacao || '').replace(/^manual:?\s*/i, '');
            linhas += `<tr>
                <td>${esc(item.autor_nome || 'Operador')}</td>
                <td>${esc(item.marca)}</td>
                <td>${formatarDataCurta(item.data_revisao)}</td>
                <td>${esc(item.placa)}</td>
                <td>${esc(item.os)}</td>
                <td>${esc(revisaoTxt)}</td>
                <td>${esc(nomesStatus[item.status] || item.status)}</td>
                <td>${valor}</td>
                <td>${esc(motivo) || '-'}</td>
                <td><button type="button" class="btn-excluir-manual" data-id="${item.id}">Excluir</button></td>
            </tr>`;
        });

        const [anoSel, mm] = mesSel.split('-');
        overlay.innerHTML = `
            <div class="modal-card-metas modal-card-manuais">
                <div class="modal-topo-metas">
                    <h3>Lançamentos manuais - ${mm}/${anoSel}</h3>
                    <button type="button" id="btnManuaisFechar" class="btn-fechar-modal-metas">&times;</button>
                </div>
                <div class="manuais-corpo">
                    ${lista.length === 0
                        ? '<p class="manuais-vazio">Nenhum agendamento foi inserido manualmente neste mês.</p>'
                        : `<table class="tabela-manuais">
                            <thead><tr>
                                <th>Operador</th><th>Marca</th><th>Data revisão</th><th>Placa</th><th>O.S</th>
                                <th>Revisão</th><th>Status</th><th>Valor</th><th>Observação</th><th></th>
                            </tr></thead>
                            <tbody>${linhas}</tbody>
                        </table>`}
                </div>
                <div class="modal-rodape-metas">
                    <button type="button" id="btnManuaisOk" class="btn-salvar-modal">Fechar</button>
                </div>
            </div>`;

        const fechar = () => { overlay.style.display = 'none'; };
        overlay.querySelector('#btnManuaisFechar').addEventListener('click', fechar);
        overlay.querySelector('#btnManuaisOk').addEventListener('click', fechar);

        overlay.querySelectorAll('.btn-excluir-manual').forEach(botao => {
            botao.addEventListener('click', async () => {
                const id = botao.dataset.id;
                const alvo = agendamentosMesAtual.find(a => a.id == id);
                if (!alvo || !ehLancamentoManual(alvo)) return;
                if (!(await confirmar(`Excluir o lançamento manual da placa ${alvo.placa}?`, { titulo: 'Excluir lançamento', confirmar: 'Excluir', perigo: true }))) return;

                botao.disabled = true;
                const { data, error } = await supabaseClient.from('agendamentos').delete().eq('id', id).select('id');
                if (error || !data || data.length === 0) {
                    botao.disabled = false;
                    avisar('Não foi possível excluir' + (error ? ': ' + error.message : ' (sem permissão).'));
                    return;
                }

                agendamentosMesAtual = agendamentosMesAtual.filter(a => a.id != id);
                todosAgendamentosHistorico = todosAgendamentosHistorico.filter(a => a.id != id);
                atualizarBotaoManuais();
                aplicarVisaoRelatorio();
                abrirModalLancamentosManuais();
            });
        });

        overlay.style.display = 'flex';
    }

    async function carregarOpcoesEquipes() {
        if (!isAdmin || !filtroEquipeAdmin) return;
        try {
            const listaMarcas = new Set([
                'Toyota', 'Chery', 'Fiat', 'Ford', 'Nissan', 'Volkswagen',
                'Hyundai', 'Renault', 'BYD', 'Geely', 'Audi', 'Citroen', 'Kia', 'Omoda', 'Jeep'
            ]);
            
            filtroEquipeAdmin.innerHTML = '<option value="todas">Todas as Marcas</option>';
            [...listaMarcas].sort().forEach(m => {
                const opt = document.createElement('option');
                opt.value = m;
                opt.textContent = m;
                filtroEquipeAdmin.appendChild(opt);
            });

            filtroEquipeAdmin.value = 'todas';
            if (!ddFiltroEquipe) {
                ddFiltroEquipe = transformarEmDropdown(filtroEquipeAdmin, 'dd-filtro-marca');
                filtroEquipeAdmin.parentNode.appendChild(ddFiltroEquipe.container);
            } else {
                ddFiltroEquipe.sincronizar();
            }
        } catch (e) {}
    }

    async function lerAgendamentos({ inicio, fim, userId } = {}) {
        const aplicarFiltros = (q) => {
            if (inicio) q = q.gte('data_revisao', inicio);
            if (fim) q = q.lte('data_revisao', fim);
            if (userId) q = q.eq('user_id', userId);
            return q.order('data_revisao', { ascending: true }).order('id', { ascending: true });
        };

        try {
            const dataView = await buscarTodasLinhas(opcoes =>
                aplicarFiltros(supabaseClient.from('vw_agendamentos_completos').select('*', opcoes)));

            if (dataView.length > 0) {
                await window.aplicarInativos(supabaseClient, dataView);
                return dataView.map(i => ({
                    ...i,
                    marca: normalizarNomeMarca(i.marca || i.autor_equipe || 'Toyota')
                }));
            }
        } catch (e) {}

        try {
            const dataRaw = await buscarTodasLinhas(() =>
                aplicarFiltros(supabaseClient.from('agendamentos').select('*')));

            const { data: perfisRaw } = await supabaseClient
                .from('perfis')
                .select('id, nome, equipe');

            const mapaPerfis = new Map();
            (perfisRaw || []).forEach(p => mapaPerfis.set(p.id, p));

            return dataRaw.map(item => {
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
            return [];
        }
    }

    async function carregarDados(aguardar) {
        const mesSelecionado = (isAdmin ? filtroMesAdmin.value : filtroMesConsultor.value) || valorMesPadrao;
        window.atualizarSeloFechado(supabaseClient, mesSelecionado);

        const pFechamento = !isAdmin ? carregarFechamentoConsultor(mesSelecionado) : null;
        const { inicio, fim } = intervaloDoMes(mesSelecionado);
        const pDoMes = lerAgendamentos({ inicio, fim });
        const pHistorico = !isAdmin ? lerAgendamentos({ userId: usuarioAtual.id }) : null;
        if (pFechamento) await pFechamento;
        const doMes = await pDoMes;

        agendamentosMesAtual = doMes.filter(item =>
            item.data_revisao && String(item.data_revisao).startsWith(mesSelecionado)
        );

        todosAgendamentosHistorico = isAdmin
            ? agendamentosMesAtual
            : await pHistorico;

        if (aguardar) await aguardar;
        atualizarBotaoManuais();
        aplicarVisaoRelatorio();
    }

    let notaMonitoriaMes = null;
    let registroFinalMes = null;

    async function carregarFechamentoConsultor(mes) {
        notaMonitoriaMes = null;
        registroFinalMes = null;
        if (isAdmin || !mes) return;
        try {
            const [resFech, resMes] = await Promise.all([
                supabaseClient.from('fechamentos').select('valor_pago, observacao, nota_monitoria').eq('mes', mes).eq('user_id', usuarioAtual.id),
                supabaseClient.from('meses_fechados').select('mes').eq('mes', mes)
            ]);
            const data = resFech.data;
            const mesFechado = ((resMes.data) || []).length > 0;
            const linha = (data || [])[0];
            if (linha) {
                if (linha.nota_monitoria !== null && linha.nota_monitoria !== undefined) notaMonitoriaMes = Number(linha.nota_monitoria);
                if (mesFechado && linha.valor_pago !== null && linha.valor_pago !== undefined) registroFinalMes = linha;
            }
        } catch (e) {}
    }

    function mostrarValorFinal() {
        const card = document.getElementById('card-valor-final');
        const cardPrevisao = document.querySelector('.bonus-previsto')?.closest('.card');
        if (!card) return;
        if (!registroFinalMes) {
            card.classList.add('oculto');
            if (cardPrevisao) cardPrevisao.classList.remove('oculto');
            return;
        }
        document.getElementById('valor-final-mes').textContent = `R$ ${Number(registroFinalMes.valor_pago).toFixed(2).replace('.', ',')}`;
        document.getElementById('detalhe-valor-final').textContent = registroFinalMes.observacao || 'Valor confirmado pela administração';
        card.classList.remove('oculto');
        if (cardPrevisao) cardPrevisao.classList.add('oculto');
    }

    function aplicarVisaoRelatorio() {
        const mesSelecionado = isAdmin ? filtroMesAdmin.value : filtroMesConsultor.value;

        if (!isAdmin) mostrarValorFinal();

        if (!isAdmin) {
            if (secaoAdminRanking) secaoAdminRanking.classList.add('oculto');
            if (secaoMetaEquipe) secaoMetaEquipe.classList.remove('oculto');
            if (cardGraficoBonusMensal) cardGraficoBonusMensal.classList.remove('oculto');
            if (cardGraficoEquipeAdmin) cardGraficoEquipeAdmin.classList.add('oculto');
            if (badgeBonusEquipe) badgeBonusEquipe.classList.remove('oculto');

            const outrasMarcasMinhas = agendamentosMesAtual.filter(i =>
                i.user_id === usuarioAtual.id && !marcasPermitidasUsuario.includes(i.marca));
            sincronizarOpcaoOutrasMarcas(outrasMarcasMinhas.length);

            const marcaFiltroConsultor = filtroMarcaConsultor ? filtroMarcaConsultor.value : 'todas';
            const modoOutras = marcaFiltroConsultor === 'outras';

            const ehMultimarca = marcasPermitidasUsuario.length > 1;
            const ocultaMonitoria = marcaFiltroConsultor !== 'todas' && (ehMultimarca || modoOutras);
            if (cardMonitoriaConsultor) {
                if (ocultaMonitoria) {
                    cardMonitoriaConsultor.classList.add('oculto');
                } else {
                    cardMonitoriaConsultor.classList.remove('oculto');
                }
            }

            if (tituloGraficoVolume) {
                tituloGraficoVolume.textContent = (marcaFiltroConsultor === 'todas') 
                    ? 'Minha Efetividade' 
                    : (modoOutras ? 'Minha Efetividade: Outras marcas' : `Minha Efetividade: ${marcaFiltroConsultor}`);
            }
            if (subtituloGraficoVolume) subtituloGraficoVolume.textContent = 'Taxa de presença';

            const notaMonitoria = notaMonitoriaMes;
            const fatorMonitoria = notaMonitoria === null ? 1.00 : (notaMonitoria >= 90 ? 1.10 : 0.90);
            if (elNotaMonitoria) elNotaMonitoria.textContent = notaMonitoria === null ? 'Aguardando' : `${notaMonitoria}%`;
            if (detalheNotaMonitoria) detalheNotaMonitoria.textContent = notaMonitoria === null ? 'Lançada pela gestão no fechamento do mês' : '≥90% (+10%) | <90% (-10%)';
            if (badgeAjusteMonitoria) {
                badgeAjusteMonitoria.classList.toggle('oculto', notaMonitoria === null);
                badgeAjusteMonitoria.textContent = notaMonitoria >= 90 ? '+10% Bônus' : '-10% Redução';
                badgeAjusteMonitoria.className = (notaMonitoria >= 90 ? 'badge-ajuste-monitoria' : 'badge-ajuste-monitoria-reducao') + (notaMonitoria === null ? ' oculto' : '');
            }

            let agendamentosEquipe = [];
            let metaEquipeDefinida = 0;
            let rotuloMeta = '';

            if (marcaFiltroConsultor === 'todas') {
                agendamentosEquipe = agendamentosMesAtual.filter(i => marcasPermitidasUsuario.includes(i.marca));
                metaEquipeDefinida = marcasPermitidasUsuario.reduce((acc, m) => acc + obterMetaEquipe(mesSelecionado, m), 0);
                rotuloMeta = marcasPermitidasUsuario.join(' | ').toUpperCase();
            } else if (modoOutras) {
                agendamentosEquipe = [];
                metaEquipeDefinida = 0;
                rotuloMeta = 'OUTRAS MARCAS';
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

            const ehMultimarcaGeral = marcaFiltroConsultor === 'todas' && marcasPermitidasUsuario.length > 1;
            const obterMetaMarca = marca => obterMetaEquipe(mesSelecionado, marca);
            let detalheMultimarca = null;
            if (ehMultimarcaGeral) {
                detalheMultimarca = window.Bonus.bonusPorMarca(marcasPermitidasUsuario, agendamentosEquipe, obterMetaMarca, true);
                bonusEquipe = detalheMultimarca.total;
            }

            tituloMetaEquipe.textContent = `META DA MARCA (${rotuloMeta})`;
            textoProgressoMeta.textContent = `${comparecidosEquipe} / ${metaEquipeDefinida} agendamentos (${percentualMeta}%)`;
            barraProgressoMeta.style.width = `${percentualMeta}%`;
            window.pintarBarraMeta(barraProgressoMeta, percentualMeta);

            if (restanteMeta === 0) {
                textoRestanteMeta.textContent = 'Parabéns! Meta da marca atingida!';
                textoRestanteMeta.className = 'meta-badge-sucesso';
            } else {
                textoRestanteMeta.textContent = `Faltam ${restanteMeta} agendamento${restanteMeta === 1 ? '' : 's'} para a meta`;
                textoRestanteMeta.className = 'meta-badge-restante';
            }

            if (badgeBonusEquipe && detalheMultimarca) {
                const resumoMarcas = detalheMultimarca.itens.map(i => `${i.marca} ${i.pct}%`).join(' | ');
                if (detalheMultimarca.total > 0) {
                    badgeBonusEquipe.textContent = `Bônus Equipe: + R$ ${detalheMultimarca.total.toFixed(2).replace('.', ',')} (${resumoMarcas})`;
                    badgeBonusEquipe.className = 'meta-badge-bonus-equipe';
                } else {
                    badgeBonusEquipe.textContent = `Bônus Equipe: R$ 0,00 (Mínimo 80% por marca: ${resumoMarcas})`;
                    badgeBonusEquipe.className = 'meta-badge-bonus-equipe bloqueado';
                }
            } else if (badgeBonusEquipe) {
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
            if (ehMultimarcaGeral) {
                bonusEquipePrevisto = window.Bonus.bonusPorMarca(marcasPermitidasUsuario, agendamentosEquipe, obterMetaMarca, false).total;
            }

            let meusAgendamentosMes = agendamentosMesAtual.filter(item => item.user_id === usuarioAtual.id);
            if (modoOutras) {
                meusAgendamentosMes = outrasMarcasMinhas;
            } else if (marcaFiltroConsultor !== 'todas') {
                meusAgendamentosMes = meusAgendamentosMes.filter(item => item.marca.toUpperCase() === marcaFiltroConsultor.toUpperCase());
            }

            if (secaoMetaEquipe) secaoMetaEquipe.classList.toggle('oculto', modoOutras);
            if (marcaFiltroConsultor === 'todas') {
                const minhasNaEquipe = meusAgendamentosMes.filter(i => marcasPermitidasUsuario.includes(i.marca));
                const compNaEquipe = minhasNaEquipe.filter(i => i.status === 'compareceu').length;
                const compOutras = outrasMarcasMinhas.filter(i => i.status === 'compareceu').length;
                const compTotalMeu = compNaEquipe + compOutras;
                const colegasNaMeta = agendamentosEquipe.length !== minhasNaEquipe.length;

                if (outrasMarcasMinhas.length > 0 || colegasNaMeta) {
                    const compColegas = Math.max(0, comparecidosEquipe - compNaEquipe);
                    const partesNota = [];
                    partesNota.push(compColegas > 0
                        ? `A meta (${comparecidosEquipe}) soma os ${compNaEquipe} comparecidos seus nas marcas da equipe + ${compColegas} ${compColegas === 1 ? 'agendado' : 'agendados'} por colegas nessas marcas.`
                        : `A meta (${comparecidosEquipe}) soma os comparecidos das marcas da equipe.`);
                    if (outrasMarcasMinhas.length > 0) {
                        partesNota.push(`Além disso, você tem ${compOutras} comparecidos em outras marcas (fora da meta).`);
                    }
                    partesNota.push(`Total seu: ${compTotalMeu} comparecidos, todos contam no seu bônus.`);
                    const agrupar = (lista, chaveFn, rotuloFn) => {
                        const mapa = {};
                        lista.forEach(i => {
                            const k = chaveFn(i);
                            if (!mapa[k]) mapa[k] = { ...rotuloFn(i), total: 0, comp: 0 };
                            mapa[k].total++;
                            if (i.status === 'compareceu') mapa[k].comp++;
                        });
                        return Object.values(mapa).sort((a, b) => b.total - a.total);
                    };
                    const dadosDetalhe = {
                        meusPorMarca: agrupar(minhasNaEquipe, i => i.marca, i => ({ marca: i.marca })),
                        colegas: agrupar(
                            agendamentosEquipe.filter(i => i.user_id !== usuarioAtual.id),
                            i => i.inativo ? `inativos|${i.marca}` : `${i.user_id}|${i.marca}`,
                            i => ({ nome: i.inativo ? 'Usuários inativos' : nomeCurtoOperador(i.autor_nome), marca: i.marca })),
                        outras: agrupar(outrasMarcasMinhas, i => i.marca, i => ({ marca: i.marca })),
                        metaTotal: agendamentosEquipe.length,
                        metaComp: comparecidosEquipe,
                        seuTotal: minhasNaEquipe.length + outrasMarcasMinhas.length,
                        seuComp: compTotalMeu
                    };
                    mostrarNotaMeta(partesNota.join(' '), () => abrirModalDetalhesMeta(dadosDetalhe));
                } else {
                    mostrarNotaMeta('');
                }
            } else {
                mostrarNotaMeta('');
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

            const fatorAplicado = ocultaMonitoria ? 1.00 : fatorMonitoria;

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
            window.pintarBarraMeta(barraProgressoMeta, percGeral);

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
            window.pintarBarraMeta(barraProgressoMeta, percMarca);

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

    function temaEscuro() {
        return document.documentElement.getAttribute('data-tema') === 'escuro';
    }

    function aplicarCoresGraficos() {
        if (typeof Chart === 'undefined' || !Chart.defaults) return;
        Chart.defaults.color = temaEscuro() ? '#cbd5e1' : '#666666';
        Chart.defaults.borderColor = temaEscuro() ? 'rgba(148, 163, 184, 0.2)' : 'rgba(0, 0, 0, 0.1)';
    }

    function renderizarGraficosAtivos() {
        aplicarCoresGraficos();
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
            } else if (marcaFiltro === 'outras') {
                dadosFiltrados = agendamentosMesAtual.filter(item =>
                    item.user_id === usuarioAtual.id && !marcasPermitidasUsuario.includes(item.marca));
            } else {
                dadosFiltrados = agendamentosMesAtual.filter(item => item.marca.toUpperCase() === marcaFiltro.toUpperCase());
            }
        }

        let meusAgendamentosMes = agendamentosMesAtual.filter(item => item.user_id === usuarioAtual.id);
        if (!isAdmin && marcaFiltro === 'outras') {
            meusAgendamentosMes = meusAgendamentosMes.filter(item => !marcasPermitidasUsuario.includes(item.marca));
        } else if (!isAdmin && marcaFiltro !== 'todas') {
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
                if (marcaFiltro === 'outras') {
                    meusHistorico = meusHistorico.filter(item => !marcasPermitidasUsuario.includes(item.marca));
                } else if (marcaFiltro !== 'todas') {
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
            const ehOutrasMarcas = !isAdmin && marcaFiltro === 'outras';
            const rotulo = (!isAdmin && marcaFiltro !== 'todas') ? marcaFiltro : marcasPermitidasUsuario.join(' | ');
            if (tituloGraficoEquipeConsultor) {
                tituloGraficoEquipeConsultor.textContent = ehOutrasMarcas
                    ? 'Outras Marcas Agendadas'
                    : `Volume da Equipe: ${rotulo}`;
            }
            if (subtituloGraficoEquipeConsultor) {
                subtituloGraficoEquipeConsultor.textContent = ehOutrasMarcas
                    ? 'Seus agendamentos em marcas fora da sua equipe (contam no seu bônus)'
                    : 'Volume por operador desta equipe';
            }
            renderizarGraficoBarrasHorizontais('graficoEquipeConsultor', dadosFiltrados, ehOutrasMarcas, !isAdmin && !ehOutrasMarcas && marcasPermitidasUsuario.length > 1);
        }
    }

    function renderizarRankingOperadores(agendamentos) {
        if (!containerRankingLista) return;
        containerRankingLista.innerHTML = '';

        const operadores = {};

        agendamentos.filter(item => !item.inativo).forEach(item => {
            const id = item.user_id || (item.inativo_id ? 'inativo:' + item.inativo_id : (item.autor_nome || 'desconhecido'));
            if (!operadores[id]) {
                operadores[id] = {
                    id: id,
                    nome: (item.autor_nome || 'Operador').trim(),
                    inativo: !!item.inativo,
                    marcasInativo: new Set(),
                    equipeOficial: item.autor_equipe || item.marca || 'Geral',
                    total: 0,
                    compareceu: 0,
                    faltou: 0
                };
            }
            if (item.inativo && item.marca) operadores[id].marcasInativo.add(item.marca);
            operadores[id].total++;
            if (item.status === 'compareceu') operadores[id].compareceu++;
            else if (item.status === 'faltou') operadores[id].faltou++;
        });

        Object.values(operadores).forEach(op => {
            if (op.inativo && op.marcasInativo.size > 0) op.equipeOficial = [...op.marcasInativo].join(' | ');
        });

        const listaRanking = Object.values(operadores).sort((a, b) => b.compareceu - a.compareceu);

        if (listaRanking.length === 0) {
            containerRankingLista.innerHTML = '<div class="ranking-vazio">Nenhum comparecimento registrado neste mês.</div>';
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
                classeItem = 'destaque-segundo';
            } else if (posicao === 3) {
                classePos = 'pos-3';
                textoPos = '🥉';
                classeItem = 'destaque-terceiro';
            }

            const itemDiv = document.createElement('div');
            itemDiv.className = `ranking-item ${classeItem}`;

            itemDiv.innerHTML = `
                <div class="ranking-esquerda">
                    <div class="posicao-circulo ${classePos}">${textoPos}</div>
                    <div class="operador-info-bloco">
                        <strong>${op.nome}${op.inativo ? ' <span class="tag-inativo">Inativo</span>' : ''}</strong>
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
                    borderColor: temaEscuro() ? '#131c2e' : '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } }
            }
        });
    }

    async function renderizarGraficoBonusMensal(agendamentosHistorico) {
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

        const pagosPorMes = {};
        try {
            const [resFech, resMeses] = await Promise.all([
                supabaseClient.from('fechamentos').select('mes, valor_pago').eq('user_id', usuarioAtual.id),
                supabaseClient.from('meses_fechados').select('mes')
            ]);
            const fechados = new Set((resMeses.data || []).map(m => m.mes));
            (resFech.data || []).forEach(f => {
                if (fechados.has(f.mes) && f.valor_pago !== null && f.valor_pago !== undefined) pagosPorMes[f.mes] = Number(f.valor_pago);
            });
        } catch (e) {}

        if (graficoBonusMensalInstance) graficoBonusMensalInstance.destroy();

        const chavesOrdenadas = Array.from(new Set(Object.keys(totaisPorMes).concat(Object.keys(pagosPorMes)))).sort();
        const labelsFormatados = chavesOrdenadas.map(c => {
            const [ano, mes] = c.split('-');
            return `${mesesNomes[parseInt(mes, 10) - 1]}/${ano.slice(2)}`;
        });
        const valores = chavesOrdenadas.map(c => totaisPorMes[c] || 0);
        const valoresPagos = chavesOrdenadas.map(c => (c in pagosPorMes ? pagosPorMes[c] : null));
        const temPagos = valoresPagos.some(v => v !== null);

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
                }].concat(temPagos ? [{
                    label: 'Valor Final Pago (R$)',
                    data: valoresPagos,
                    backgroundColor: '#16a34a',
                    borderRadius: 4,
                    maxBarThickness: 45
                }] : [])
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

    function renderizarGraficoBarrasHorizontais(canvasId, agendamentos, agruparPorMarca = false, detalharMarcaColegas = false) {
        const ctx = document.getElementById(canvasId)?.getContext('2d');
        if (!ctx) return;

        if (canvasId === 'graficoEquipeAdmin' && graficoEquipeAdminInstance) graficoEquipeAdminInstance.destroy();
        if (canvasId === 'graficoEquipeConsultor' && graficoEquipeConsultorInstance) graficoEquipeConsultorInstance.destroy();

        const operadores = {};
        agendamentos.forEach(item => {
            const nomeCompleto = (item.autor_nome || 'Operador').trim();
            const partes = nomeCompleto.split(/\s+/).filter((p, i) => i === 0 || !['DE', 'DA', 'DO', 'DAS', 'DOS', 'E'].includes(p.toUpperCase()));
            const nomeOperador = partes.length >= 2 ? `${partes[0]} ${partes[1]}` : partes[0];
            const nomeExibido = item.inativo ? (isAdmin ? `${nomeOperador} (inativo)` : 'Usuários inativos') : nomeOperador;
            const nomeCurto = agruparPorMarca
                ? (item.marca || 'Sem marca')
                : ((detalharMarcaColegas && item.user_id !== usuarioAtual.id) ? `${nomeExibido} (${item.marca})` : nomeExibido);

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
                        backgroundColor: temaEscuro() ? '#475569' : '#cbd5e1',
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
            if (String(item.revisao || '').toUpperCase() === 'SERVICO') return;
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
            tabelaCorpoAdmin.innerHTML = linhaVazia(6, 'Nenhum agendamento neste mês.', 'Importe a planilha ou escolha outro mês.');
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
                if (filtroEquipeAdmin) {
                    if (![...filtroEquipeAdmin.options].some(o => o.value === marca)) {
                        const opt = document.createElement('option');
                        opt.value = marca;
                        opt.textContent = marca;
                        filtroEquipeAdmin.appendChild(opt);
                    }
                    filtroEquipeAdmin.value = marca;
                    if (ddFiltroEquipe) ddFiltroEquipe.sincronizar();
                }
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
            const chave = item.user_id || (item.inativo_id ? 'inativo:' + item.inativo_id : (item.autor_nome || 'desconhecido'));
            if (!operadores[chave]) {
                operadores[chave] = {
                    nome: (item.autor_nome || 'Operador') + (item.inativo ? ' (inativo)' : ''),
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

            if (String(item.revisao || '').toUpperCase() === 'SERVICO') return;
            const rev = parseInt(item.revisao, 10) || 1;
            operadores[chave].revisoes[rev] = (operadores[chave].revisoes[rev] || 0) + 1;
        });

        const lista = Object.values(operadores).sort((a, b) => b.total - a.total);
        tabelaCorpoAdmin.innerHTML = '';

        if (lista.length === 0) {
            tabelaCorpoAdmin.innerHTML = linhaVazia(7, 'Nenhum agendamento para esta marca.', 'Escolha outra marca ou outro mês.');
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

    if (btnVoltarAdmin) {
        btnVoltarAdmin.addEventListener('click', () => {
            if (filtroEquipeAdmin) filtroEquipeAdmin.value = 'todas';
            if (ddFiltroEquipe) ddFiltroEquipe.sincronizar();
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

    const aguardarPreparo = Promise.all([sincronizarMetasBanco(), carregarOpcoesEquipes()]).then(() => {
        document.getElementById('btn-ver-manuais')?.addEventListener('click', abrirModalLancamentosManuais);

        if (parametroEquipe && filtroEquipeAdmin) {
            filtroEquipeAdmin.value = decodeURIComponent(parametroEquipe);
            if (ddFiltroEquipe) ddFiltroEquipe.sincronizar();
        }
    });

    await carregarDados(aguardarPreparo);
    window.mostrarConteudo();

    if (dispararImpressao) {
        setTimeout(() => {
            window.print();
        }, 900);
    }
});
