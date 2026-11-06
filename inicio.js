document.addEventListener('DOMContentLoaded', async function () {
    const SUPABASE_URL = 'https://potvtrepcoswvzmkewic.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_iMbay5YOnrrehpqI9qU7HA_vMapr-DY';
    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session || !session.user) {
        window.location.href = 'login.html';
        return;
    }

    const usuarioAtual = session.user;
    let isAdmin = false;
    let nomeLogado = usuarioAtual.user_metadata?.nome_completo || 'Usuário';
    let equipeUsuario = '';

    try {
        const { data: perfil } = await supabaseClient.from('perfis').select('role, nome, equipe').eq('id', usuarioAtual.id).maybeSingle();
        if (perfil) {
            if (perfil.role === 'admin') isAdmin = true;
            if (perfil.nome && perfil.nome.trim()) nomeLogado = perfil.nome.trim();
            if (perfil.equipe) equipeUsuario = perfil.equipe;
        }
    } catch (e) {}

    function escaparHtml(texto) {
        return String(texto ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    const areaAuth = document.getElementById('area-autenticacao');
    if (areaAuth) {
        areaAuth.innerHTML = `
            <span class="usuario-logado-tag">Olá, <strong>${escaparHtml(nomeLogado)}</strong>${!isAdmin ? `<span class="tag-badge-equipe">${escaparHtml(equipeUsuario || 'Sem marca')}</span>` : ''}${isAdmin ? '<span class="tag-badge-admin">Admin</span>' : ''}</span>
            <button id="btn-sair-header" class="botao-sair-header">Sair</button>
        `;
        window.salvarMenuCache(areaAuth.innerHTML, isAdmin);
        document.getElementById('btn-sair-header').addEventListener('click', async () => {
            window.limparMenuCache();
            await supabaseClient.auth.signOut();
            window.location.href = 'login.html';
        });
    }

    if (isAdmin) window.mostrarLinksAdmin();
    window.atualizarContadorDivergencias(supabaseClient);

    const raiz = document.getElementById('inicio-conteudo');
    const hoje = new Date();
    const hojeISO = hoje.toLocaleDateString('sv-SE');
    const mes = hojeISO.slice(0, 7);
    const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const nomeMes = `${MESES[hoje.getMonth()].charAt(0).toUpperCase()}${MESES[hoje.getMonth()].slice(1)} de ${hoje.getFullYear()}`;
    const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
    const fracaoMes = hoje.getDate() / ultimoDia;
    const mesAnterior = (() => {
        const d = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    })();
    const META_GERAL_PADRAO = 6000;

    const moeda = v => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const classePct = p => (p >= 80 ? 'meta-alta' : (p >= 50 ? 'meta-media' : 'meta-baixa'));
    const chavePct = p => (p >= 80 ? 'ok' : (p >= 50 ? 'alerta' : 'perigo'));

    async function buscarTodas(montar) {
        let todas = [];
        let de = 0;
        const tamanho = 1000;
        while (true) {
            const { data, error } = await montar().range(de, de + tamanho - 1);
            if (error) throw error;
            const bloco = data || [];
            todas = todas.concat(bloco);
            if (bloco.length < tamanho) break;
            de += tamanho;
        }
        return todas;
    }

    async function seguro(promessa, padrao) {
        try {
            const r = await promessa;
            if (r && r.error) return padrao;
            return r && r.data !== undefined ? r.data : padrao;
        } catch (e) {
            return padrao;
        }
    }

    const metasBanco = {};
    const dadosMetas = await seguro(supabaseClient.from('metas_mensais').select('*').eq('mes_referencia', mes), []);
    (dadosMetas || []).forEach(m => {
        const chave = m.equipe === 'Geral' ? 'Geral' : window.Bonus.normalizarMarca(m.equipe);
        metasBanco[chave] = parseInt(m.meta_valor, 10);
    });
    const metaGeral = metasBanco.Geral > 0 ? metasBanco.Geral : META_GERAL_PADRAO;
    const obterMeta = marca => (metasBanco[marca] > 0 ? metasBanco[marca] : window.Bonus.metaPadrao(marca));

    const inicioMes = `${mes}-01`;
    const fimMes = `${mes}-${String(ultimoDia).padStart(2, '0')}`;
    let agendamentos = [];
    try {
        agendamentos = await buscarTodas(() => supabaseClient.from('vw_agendamentos_completos').select('*')
            .gte('data_revisao', inicioMes).lte('data_revisao', fimMes)
            .order('data_revisao', { ascending: true }).order('id', { ascending: true }));
        await window.aplicarInativos(supabaseClient, agendamentos);
    } catch (e) {
        raiz.innerHTML = `<p class="dash-vazio">Não foi possível carregar os dados: ${escaparHtml(e.message || e)}</p>`;
        window.mostrarConteudo();
        return;
    }

    const contar = (lista, status) => lista.filter(a => a.status === status).length;
    const comparecido = a => a.status === 'compareceu';
    const pendente = a => a.status !== 'compareceu' && a.status !== 'faltou';

    function cabecalho(subtitulo) {
        return `<div class="dash-hero">
            <div>
                <h2 class="dash-titulo-pagina">Olá, ${escaparHtml(nomeLogado.split(' ')[0])}</h2>
                <p class="dash-subtitulo-pagina">${escaparHtml(subtitulo)}</p>
            </div>
            <span class="dash-chip-mes">${escaparHtml(nomeMes)}</span>
        </div>`;
    }

    function cartaoNumero(titulo, valor, sub, classe) {
        return `<div class="dash-card"><span class="dash-card-titulo">${titulo}</span><span class="dash-valor ${classe || ''}">${valor}</span><span class="dash-sub">${sub || ''}</span></div>`;
    }

    function cartaoMeta(titulo, qtd, meta, rodape) {
        const pct = Math.min(100, Math.floor((qtd / Math.max(1, meta)) * 100));
        return `<div class="dash-card">
            <span class="dash-card-titulo">${escaparHtml(titulo)}</span>
            <div class="dash-linha"><span class="dash-valor">${qtd} / ${meta}</span><span class="dash-chip ${chavePct(pct)}">${pct}%</span></div>
            <div class="dash-trilho"><div class="dash-preenchimento ${classePct(pct)}" style="width: ${pct}%"></div></div>
            <span class="dash-sub">${rodape}</span>
        </div>`;
    }

    function rodapeMeta(qtd, meta) {
        const pct = Math.min(100, Math.floor((qtd / Math.max(1, meta)) * 100));
        const minimo = Math.ceil(meta * 0.8);
        if (qtd >= meta) return 'Meta atingida.';
        if (pct < 80) return `Faltam ${minimo - qtd} para liberar o bônus (80%) e ${meta - qtd} para a meta.`;
        return `Bônus liberado. Faltam ${meta - qtd} para a meta.`;
    }

    async function montarConsultor() {
        const marcas = window.Bonus.listarMarcas(equipeUsuario);
        const agsEquipe = agendamentos.filter(a => marcas.includes(window.Bonus.normalizarMarca(a.marca)));
        const meus = agendamentos.filter(a => a.user_id === usuarioAtual.id);
        const comp = contar(meus, 'compareceu');
        const falt = contar(meus, 'faltou');
        const pend = meus.filter(pendente).length;
        const presenca = (comp + falt) > 0 ? Math.round((comp / (comp + falt)) * 100) : 0;

        const fechamento = await seguro(supabaseClient.from('fechamentos').select('nota_monitoria').eq('mes', mes).eq('user_id', usuarioAtual.id).maybeSingle(), null);
        const nota = fechamento && fechamento.nota_monitoria !== null && fechamento.nota_monitoria !== undefined ? parseFloat(fechamento.nota_monitoria) : null;
        const perfilAtual = { id: usuarioAtual.id, equipe: equipeUsuario };
        const atual = window.Bonus.calcularOperador(perfilAtual, agendamentos, obterMeta, nota);
        const potencialLista = agendamentos.map(a => pendente(a) ? Object.assign({}, a, { status: 'compareceu' }) : a);
        const potencial = window.Bonus.calcularOperador(perfilAtual, potencialLista, obterMeta, nota);

        const detalhes = window.Bonus.bonusPorMarca(marcas, agsEquipe, obterMeta, true).itens;
        const linhasMetaEquipe = detalhes.map(i => {
            const pct = Math.min(100, Math.floor((i.qtd / Math.max(1, i.meta)) * 100));
            const minimo = Math.ceil(i.meta * 0.8);
            const curto = i.qtd >= i.meta ? 'Meta atingida' : (pct < 80 ? `Faltam ${minimo - i.qtd} para o bônus` : `Bônus liberado · faltam ${i.meta - i.qtd} para a meta`);
            return `<div class="dash-meta-linha">
                <div class="dash-linha"><strong>${escaparHtml(i.marca)}</strong><span>${i.qtd} / ${i.meta} <span class="dash-chip ${chavePct(pct)}">${pct}%</span></span></div>
                <div class="dash-trilho"><div class="dash-preenchimento ${classePct(pct)}" style="width: ${pct}%"></div></div>
                <span class="dash-sub">${curto}</span>
            </div>`;
        }).join('');
        const cartoesMeta = detalhes.length
            ? `<div class="dash-card"><div class="dash-metas-grade">${linhasMetaEquipe}</div></div>`
            : '<div class="dash-card"><span class="dash-sub">Nenhuma marca vinculada ao seu usuário.</span></div>';

        const contagem = {};
        agsEquipe.filter(a => !a.inativo && a.user_id && comparecido(a)).forEach(a => { contagem[a.user_id] = (contagem[a.user_id] || 0) + 1; });
        const operadores = new Set(agsEquipe.filter(a => !a.inativo && a.user_id).map(a => a.user_id));
        operadores.add(usuarioAtual.id);
        const minhaContagem = contagem[usuarioAtual.id] || 0;
        const posicao = 1 + Object.entries(contagem).filter(([id, q]) => id !== usuarioAtual.id && q > minhaContagem).length;

        const divergencias = await seguro(supabaseClient.from('divergencias').select('id, status').eq('user_id', usuarioAtual.id), []);
        const abertas = (divergencias || []).filter(d => d.status === 'aberta').length;
        const respondidas = (divergencias || []).filter(d => d.status !== 'aberta').length;

        let cartaoAlmoco = '';
        if (/toyota/i.test(equipeUsuario)) {
            const { count, error } = await supabaseClient.from('almoco_itens').select('id', { count: 'exact', head: true }).eq('data', hojeISO).is('responsavel_id', null).eq('status', 'pendente');
            if (!error) {
                cartaoAlmoco = `<a class="dash-card" href="almoco.html"><span class="dash-card-titulo">Almoço Toyota</span><span class="dash-valor ${count ? 'alerta' : 'sucesso'}">${count || 0}</span><span class="dash-sub">${count ? 'evento(s) sem responsável hoje' : 'Nenhum evento sem responsável hoje.'}</span></a>`;
            }
        }

        const fatorTexto = atual.fator === 1 ? 'sem ajuste de monitoria' : (atual.fator > 1 ? 'monitoria +10%' : 'monitoria -10%');

        raiz.innerHTML = `
            ${cabecalho('Resumo do seu mês')}
            <div class="dash-secao-titulo">Seus números</div>
            <div class="dash-grade">
                ${cartaoNumero('Agendamentos', meus.length, 'Registrados por você no mês')}
                ${cartaoNumero('Comparecidos', comp, `${presenca}% de presença`, 'sucesso')}
                ${cartaoNumero('Pendentes', pend, 'Aguardando comparecimento', 'alerta')}
                ${cartaoNumero('No-show', falt, 'Não compareceram', 'perigo')}
            </div>
            <div class="dash-secao-titulo">Meta da equipe</div>
            ${cartoesMeta}
            <div class="dash-secao-titulo">Bônus e posição</div>
            <div class="dash-grade">
                <div class="dash-card">
                    <span class="dash-card-titulo">Previsão do bônus</span>
                    <span class="dash-valor">${moeda(atual.total)}</span>
                    <span class="dash-sub">Se os pendentes comparecerem: <strong>${moeda(potencial.total)}</strong></span>
                </div>
                ${cartaoNumero('Posição no ranking', `${posicao}º`)}
                <a class="dash-card" href="divergencias.html">
                    <span class="dash-card-titulo">Divergências</span>
                    <span class="dash-valor ${abertas ? 'alerta' : ''}">${abertas}</span>
                    <span class="dash-sub">${abertas === 1 ? 'aberta' : 'abertas'} · ${respondidas} ${respondidas === 1 ? 'respondida' : 'respondidas'}</span>
                </a>
                ${cartaoAlmoco}
            </div>`;
    }

    async function montarAdmin() {
        const perfis = await seguro(supabaseClient.from('perfis').select('*'), []);
        const nomePor = new Map((perfis || []).map(p => [p.id, p.nome || 'Sem nome']));
        const inativosPerfil = new Set((perfis || []).filter(p => p.inativo_desde).map(p => p.id));

        const porMarca = {};
        agendamentos.forEach(a => {
            const m = window.Bonus.normalizarMarca(a.marca);
            if (!porMarca[m]) porMarca[m] = { comp: 0, falt: 0, pend: 0, total: 0 };
            porMarca[m].total++;
            if (comparecido(a)) porMarca[m].comp++;
            else if (a.status === 'faltou') porMarca[m].falt++;
            else porMarca[m].pend++;
        });
        Object.keys(metasBanco).forEach(k => { if (k !== 'Geral' && !porMarca[k]) porMarca[k] = { comp: 0, falt: 0, pend: 0, total: 0 }; });
        (perfis || []).filter(p => p.role !== 'admin' && !p.inativo_desde).forEach(p => {
            window.Bonus.listarMarcas(p.equipe).forEach(m => { if (!porMarca[m]) porMarca[m] = { comp: 0, falt: 0, pend: 0, total: 0 }; });
        });

        const compGeral = contar(agendamentos, 'compareceu');
        const pctGeral = Math.min(100, Math.floor((compGeral / Math.max(1, metaGeral)) * 100));

        const alertas = [];
        const marcasOrdenadas = Object.keys(porMarca).sort((a, b) => porMarca[b].total - porMarca[a].total);
        marcasOrdenadas.forEach(m => {
            const d = porMarca[m];
            const meta = obterMeta(m);
            const pct = Math.floor((d.comp / Math.max(1, meta)) * 100);
            const pctPotencial = Math.floor(((d.comp + d.pend) / Math.max(1, meta)) * 100);
            if (fracaoMes >= 0.5 && pct < 80) alertas.push({ tipo: 'alerta', texto: `${m} está em ${pct}% da meta (${d.comp}/${meta}) com o mês passando da metade.` });
            if (fracaoMes >= 0.5 && pctPotencial < 80 && d.pend > 0) alertas.push({ tipo: 'perigo', texto: `${m}: mesmo se todos os pendentes comparecerem, chega a ${pctPotencial}% e não libera o bônus de equipe.` });
        });

        const { count: totalDivAbertas } = await supabaseClient.from('divergencias').select('id', { count: 'exact', head: true }).eq('status', 'aberta');
        const mesesFechados = await seguro(supabaseClient.from('meses_fechados').select('mes'), []);
        const fechados = new Set((mesesFechados || []).map(m => m.mes));
        const anteriorAberto = !fechados.has(mesAnterior);

        if (totalDivAbertas) alertas.push({ tipo: 'alerta', texto: `${totalDivAbertas} divergência(s) aberta(s) aguardando resposta.`, href: 'divergencias.html' });
        if (anteriorAberto) alertas.push({ tipo: 'alerta', texto: `O mês ${mesAnterior.split('-').reverse().join('/')} ainda não foi fechado.`, href: 'admin.html#fechamento' });

        const operadoresFech = (perfis || []).filter(p => p.role !== 'admin' && !p.inativo_desde);
        const fechamentos = await seguro(supabaseClient.from('fechamentos').select('user_id, valor_pago, nota_monitoria').eq('mes', mes), []);
        const comPago = (fechamentos || []).filter(f => f.valor_pago !== null && f.valor_pago !== undefined).length;
        const comNota = (fechamentos || []).filter(f => f.nota_monitoria !== null && f.nota_monitoria !== undefined).length;
        const mesFechado = fechados.has(mes);

        const contagemOp = {};
        agendamentos.filter(a => !a.inativo && a.user_id).forEach(a => {
            if (!contagemOp[a.user_id]) contagemOp[a.user_id] = { comp: 0, falt: 0, total: 0 };
            contagemOp[a.user_id].total++;
            if (comparecido(a)) contagemOp[a.user_id].comp++;
            else if (a.status === 'faltou') contagemOp[a.user_id].falt++;
        });
        const ranking = Object.entries(contagemOp).sort((a, b) => b[1].comp - a[1].comp).slice(0, 5);

        const agsInativos = agendamentos.filter(a => a.inativo);
        const compInativos = agsInativos.filter(comparecido).length;
        const pendInativos = agsInativos.filter(pendente).length;
        const marcasInativos = {};
        agsInativos.forEach(a => { const m = window.Bonus.normalizarMarca(a.marca); marcasInativos[m] = (marcasInativos[m] || 0) + 1; });
        const resumoInativos = Object.keys(marcasInativos).sort().map(m => `${m} ${marcasInativos[m]}`).join(' · ');

        let almocoSemResponsavel = null;
        try {
            const { count, error } = await supabaseClient.from('almoco_itens').select('id', { count: 'exact', head: true }).eq('data', hojeISO).is('responsavel_id', null).eq('status', 'pendente');
            if (!error) almocoSemResponsavel = count || 0;
        } catch (e) {}

        const historico = await seguro(supabaseClient.from('historico_alteracoes').select('*').order('criado_em', { ascending: false }).limit(5), []);
        const ultimaImportacao = await seguro(supabaseClient.from('historico_alteracoes').select('*').eq('tabela', 'importacoes').order('criado_em', { ascending: false }).limit(1), []);
        const ROTULO_AREA = { agendamentos: 'Agendamento', perfis: 'Usuário', fechamentos: 'Fechamento', meses_fechados: 'Mês fechado', metas_mensais: 'Meta', divergencias: 'Divergência', importacoes: 'Importação' };
        const ROTULO_ACAO = { INSERT: 'Inclusão', UPDATE: 'Alteração', DELETE: 'Exclusão', IMPORTACAO: 'Importação' };
        const descrever = item => {
            const d = item.dados_depois || item.dados_antes || {};
            if (item.tabela === 'agendamentos') return `${d.placa || 'Sem placa'}${d.os ? ' · O.S ' + d.os : ''}`;
            if (item.tabela === 'importacoes') return d.arquivo || 'Planilha';
            if (item.tabela === 'perfis') return d.nome || 'Usuário';
            if (item.tabela === 'fechamentos') return `${nomePor.get(d.user_id) || ''} · ${d.mes || ''}`;
            if (item.tabela === 'meses_fechados') return d.mes || '';
            if (item.tabela === 'metas_mensais') return `${d.equipe || ''} · ${d.mes_referencia || ''}`;
            return item.registro_id || '';
        };
        const quando = iso => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

        const alertasHtml = alertas.length
            ? `<div class="dash-alertas">${alertas.map(a => `<${a.href ? 'a href="' + a.href + '"' : 'div'} class="dash-alerta ${a.tipo}">${escaparHtml(a.texto)}</${a.href ? 'a' : 'div'}>`).join('')}</div>`
            : '<div class="dash-alertas"><div class="dash-alerta ok">Nenhum alerta no momento.</div></div>';

        const faltamGeral = Math.max(0, metaGeral - compGeral);
        const diasRestantes = ultimoDia - hoje.getDate();
        const ritmoNecessario = diasRestantes > 0 && faltamGeral > 0 ? Math.ceil(faltamGeral / diasRestantes) : 0;
        const projecao = hoje.getDate() > 0 ? Math.round((compGeral / hoje.getDate()) * ultimoDia) : 0;
        const pctProjecao = Math.min(999, Math.floor((projecao / Math.max(1, metaGeral)) * 100));
        const totalPend = agendamentos.filter(pendente).length;
        const totalFalt = contar(agendamentos, 'faltou');
        const mini = (valor, rotulo, classe) => `<div class="dash-mini"><span class="dash-mini-valor ${classe || ''}">${valor}</span><span class="dash-sub">${rotulo}</span></div>`;
        const cartaoCentral = `<div class="dash-card">
            <span class="dash-card-titulo">Meta total da central</span>
            <div class="dash-linha"><span class="dash-valor">${compGeral} / ${metaGeral}</span><span class="dash-chip ${chavePct(pctGeral)}">${pctGeral}%</span></div>
            <div class="dash-trilho"><div class="dash-preenchimento ${classePct(pctGeral)}" style="width: ${pctGeral}%"></div></div>
            <span class="dash-sub">${faltamGeral > 0 ? `Faltam ${faltamGeral} comparecimentos para a meta.` : 'Meta atingida.'}</span>
            <div class="dash-mini-grade">
                ${mini(agendamentos.length, 'agendamentos')}
                ${mini(compGeral, 'comparecidos', 'sucesso')}
                ${mini(totalPend, 'pendentes', 'alerta')}
                ${mini(totalFalt, 'no-show', 'perigo')}
            </div>
            <ul class="dash-lista">
                <li><span>Dias restantes no mês</span><strong>${diasRestantes}</strong></li>
                <li><span>Ritmo necessário</span><strong>${ritmoNecessario ? ritmoNecessario + ' comparecimentos/dia' : (faltamGeral > 0 ? 'Último dia' : '-')}</strong></li>
                <li><span>Projeção no ritmo atual</span><strong>${projecao} <span class="dash-chip ${chavePct(Math.min(100, pctProjecao))}">${pctProjecao}%</span></strong></li>
            </ul>
        </div>`;

        const linhasMarca = marcasOrdenadas.map(m => {
            const d = porMarca[m];
            const meta = obterMeta(m);
            const pct = Math.min(100, Math.floor((d.comp / Math.max(1, meta)) * 100));
            const presenca = (d.comp + d.falt) > 0 ? Math.round((d.comp / (d.comp + d.falt)) * 100) : 0;
            return `<li>
                <div style="flex: 1; min-width: 0;">
                    <div class="dash-linha"><strong>${escaparHtml(m)}</strong><span>${d.comp} / ${meta} <span class="dash-chip ${chavePct(pct)}">${pct}%</span></span></div>
                    <div class="dash-trilho" style="margin-top: 6px;"><div class="dash-preenchimento ${classePct(pct)}" style="width: ${pct}%"></div></div>
                    <span class="dash-sub">${d.pend} pendente(s) · presença ${presenca}%</span>
                </div>
            </li>`;
        }).join('') || '<li class="dash-vazio">Sem agendamentos no mês.</li>';

        const linhasRanking = ranking.map(([id, d], i) => {
            const pres = (d.comp + d.falt) > 0 ? Math.round((d.comp / (d.comp + d.falt)) * 100) : 0;
            return `<li><span>${i + 1}º ${escaparHtml(nomePor.get(id) || 'Operador')}</span><span><strong>${d.comp}</strong> <span class="dash-sub">comp. · ${pres}%</span></span></li>`;
        }).join('') || '<li class="dash-vazio">Sem dados no mês.</li>';

        const linhasHistorico = (historico || []).map(h => `<li><div><div>${ROTULO_ACAO[h.operacao] || h.operacao} · ${ROTULO_AREA[h.tabela] || h.tabela}</div><div class="dash-sub">${escaparHtml(descrever(h))}</div></div><span class="dash-sub">${quando(h.criado_em)}</span></li>`).join('') || '<li class="dash-vazio">Sem alterações registradas.</li>';

        const imp = (ultimaImportacao && ultimaImportacao[0]) ? ultimaImportacao[0] : null;
        const impDados = imp ? (imp.dados_depois || {}) : null;

        raiz.innerHTML = `
            ${cabecalho('Visão geral da central')}
            ${alertasHtml}
            <div class="dash-secao-titulo">Meta da central</div>
            <div class="dash-grade dash-largo">
                ${cartaoCentral}
                <div class="dash-card"><span class="dash-card-titulo">Metas por marca</span><ul class="dash-lista dash-rolavel">${linhasMarca}</ul></div>
            </div>
            <div class="dash-secao-titulo">Pendências e fechamento</div>
            <div class="dash-grade">
                <a class="dash-card" href="divergencias.html"><span class="dash-card-titulo">Divergências abertas</span><span class="dash-valor ${totalDivAbertas ? 'alerta' : 'sucesso'}">${totalDivAbertas || 0}</span><span class="dash-sub">Aguardando resposta</span></a>
                <a class="dash-card" href="admin.html#fechamento"><span class="dash-card-titulo">Fechamento do mês</span><span class="dash-valor">${comPago} / ${operadoresFech.length}</span></a>
                <a class="dash-card" href="admin.html#inativos"><span class="dash-card-titulo">Agendamentos de inativos</span><span class="dash-valor">${agsInativos.length}</span><span class="dash-sub">${compInativos} comparecido(s) · ${pendInativos} pendente(s)${resumoInativos ? ' · ' + escaparHtml(resumoInativos) : ''}</span></a>
                ${almocoSemResponsavel === null ? '' : `<a class="dash-card" href="almoco.html"><span class="dash-card-titulo">Almoço Toyota hoje</span><span class="dash-valor ${almocoSemResponsavel ? 'alerta' : 'sucesso'}">${almocoSemResponsavel}</span><span class="dash-sub">${almocoSemResponsavel ? 'evento(s) sem responsável' : 'Nenhum evento sem responsável'}</span></a>`}
            </div>
            <div class="dash-secao-titulo">Desempenho e atividade</div>
            <div class="dash-grade dash-largo">
                <div class="dash-card"><span class="dash-card-titulo">Ranking do mês</span><ul class="dash-lista">${linhasRanking}</ul></div>
                <div class="dash-card"><span class="dash-card-titulo">Últimas alterações</span><ul class="dash-lista">${linhasHistorico}</ul></div>
                <div class="dash-card"><span class="dash-card-titulo">Última importação</span>${imp ? `<span class="dash-valor" style="font-size: 20px;">${escaparHtml(impDados.arquivo || 'Planilha')}</span><span class="dash-sub">${quando(imp.criado_em)} · ${escaparHtml(impDados.periodo || '')}</span><span class="dash-sub">${impDados.total ?? 0} agendamentos (${impDados.comparecidos ?? 0} comparecidos, ${impDados.no_show ?? 0} no-show)</span>` : '<span class="dash-vazio">Nenhuma importação registrada.</span>'}</div>
            </div>`;
    }

    try {
        if (isAdmin) await montarAdmin();
        else await montarConsultor();
    } catch (e) {
        raiz.innerHTML = `<p class="dash-vazio">Não foi possível montar o painel: ${escaparHtml(e.message || e)}</p>`;
    }
    window.mostrarConteudo();
});
