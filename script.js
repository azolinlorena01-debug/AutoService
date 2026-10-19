document.addEventListener('DOMContentLoaded', async function() {
    const SUPABASE_URL = 'https://potvtrepcoswvzmkewic.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_iMbay5YOnrrehpqI9qU7HA_vMapr-DY';
    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    const linkMenuImportar = document.getElementById('link-menu-importar');
    const areaAuth = document.getElementById('area-autenticacao');
    const inputBusca = document.getElementById('input-busca');
    const filtroStatus = document.getElementById('filtro-status');
    const filtroMes = document.getElementById('filtro-mes');
    const contadorRegistros = document.getElementById('contador-registros');
    const tabelaCorpo = document.getElementById('tabela-corpo-agendamentos');

    const btnPagAnterior = document.getElementById('btn-pag-anterior');
    const btnPagProxima = document.getElementById('btn-pag-proxima');
    const indicadorPagina = document.getElementById('indicador-pagina');
    const textoPaginacaoInfo = document.getElementById('texto-paginacao-info');

    const totalAgendamentosTopo = document.getElementById('total-agendamentos-topo');
    const totalComparecidosTopo = document.getElementById('total-comparecidos-topo');
    const percentualPresencaTopo = document.getElementById('percentual-presenca-topo');
    const totalPendentesTopo = document.getElementById('total-pendentes-topo');
    const totalNoShowTopo = document.getElementById('total-noshow-topo');

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
        console.warn('Erro ao carregar perfil:', e);
    }

    if (usuarioAtual.email === 'usuariotestesite01@gmail.com' || usuarioAtual.email?.includes('admin')) {
        isAdmin = true;
    }

    if (isAdmin && linkMenuImportar) {
        linkMenuImportar.classList.remove('oculto');
    }

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

    const ITENS_POR_PAGINA = 20;
    let paginaAtual = 1;
    let listaFiltradaAtual = [];
    let todosAgendamentosMes = [];

    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = String(hoje.getMonth() + 1).padStart(2, '0');
    const valorMesPadrao = `${anoAtual}-${mesAtual}`;

    if (filtroMes) {
        filtroMes.value = valorMesPadrao;
    }

    function formatarDataBR(dataString) {
        if (!dataString) return '-';
        const partes = dataString.split('-');
        if (partes.length === 3) {
            return `${partes[2]}/${partes[1]}/${partes[0]}`;
        }
        return dataString;
    }

    async function carregarDados() {
        const mesSelecionado = filtroMes ? filtroMes.value : valorMesPadrao;

        tabelaCorpo.innerHTML = '<tr><td colspan="10" class="celula-vazia-mensagem">Buscando agendamentos...</td></tr>';

        try {
            let query = supabaseClient
                .from('vw_agendamentos_completos')
                .select('*')
                .order('data_revisao', { ascending: true });

            if (!isAdmin) {
                query = query.eq('user_id', usuarioAtual.id);
            }

            const { data, error } = await query;
            if (error) throw error;

            todosAgendamentosMes = (data || []).filter(item =>
                item.data_revisao && item.data_revisao.startsWith(mesSelecionado)
            );

            atualizarCardsResumo(todosAgendamentosMes);
            paginaAtual = 1;
            aplicarFiltrosTabela();

        } catch (err) {
            console.error('Erro ao carregar agendamentos:', err);
            tabelaCorpo.innerHTML = `<tr><td colspan="10" class="celula-vazia-mensagem">Erro ao carregar dados: ${err.message}</td></tr>`;
        }
    }

    function atualizarCardsResumo(lista) {
        const total = lista.length;
        let compareceu = 0;
        let pendente = 0;
        let noshow = 0;

        lista.forEach(item => {
            const st = item.status || 'pendente';
            if (st === 'compareceu') compareceu++;
            else if (st === 'faltou') noshow++;
            else pendente++;
        });

        const percPresenca = total > 0 ? Math.round((compareceu / total) * 100) : 0;

        if (totalAgendamentosTopo) totalAgendamentosTopo.textContent = total;
        if (totalComparecidosTopo) totalComparecidosTopo.textContent = compareceu;
        if (percentualPresencaTopo) percentualPresencaTopo.textContent = `${percPresenca}% de presença`;
        if (totalPendentesTopo) totalPendentesTopo.textContent = pendente;
        if (totalNoShowTopo) totalNoShowTopo.textContent = noshow;
    }

    function aplicarFiltrosTabela() {
        const termoBusca = (inputBusca?.value || '').trim().toLowerCase();
        const statusSelecionado = filtroStatus ? filtroStatus.value : 'todos';

        listaFiltradaAtual = todosAgendamentosMes.filter(item => {
            const placa = (item.placa || '').toLowerCase();
            const evento = (item.evento || '').toLowerCase();
            const os = (item.os || '').toLowerCase();
            const nome = (item.autor_nome || '').toLowerCase();

            const bateBusca = !termoBusca || 
                placa.includes(termoBusca) || 
                evento.includes(termoBusca) || 
                os.includes(termoBusca) || 
                nome.includes(termoBusca);

            let bateStatus = false;
            const statusItem = item.status || 'pendente';
            const obsItem = (item.observacao || '').toLowerCase();

            if (statusSelecionado === 'todos') {
                bateStatus = true;
            } else if (statusSelecionado === 'reagendado') {
                bateStatus = obsItem.includes('reagendado');
            } else {
                bateStatus = (statusItem === statusSelecionado);
            }

            return bateBusca && bateStatus;
        });

        if (contadorRegistros) {
            contadorRegistros.textContent = `${listaFiltradaAtual.length} registros encontrados`;
        }

        renderizarPaginaAtual();
    }

    function renderizarPaginaAtual() {
        const totalItens = listaFiltradaAtual.length;
        const totalPaginas = Math.max(1, Math.ceil(totalItens / ITENS_POR_PAGINA));

        if (paginaAtual > totalPaginas) paginaAtual = totalPaginas;
        if (paginaAtual < 1) paginaAtual = 1;

        const inicio = (paginaAtual - 1) * ITENS_POR_PAGINA;
        const fim = Math.min(inicio + ITENS_POR_PAGINA, totalItens);
        const itensDaPagina = listaFiltradaAtual.slice(inicio, fim);

        if (indicadorPagina) {
            indicadorPagina.textContent = `${paginaAtual} de ${totalPaginas}`;
        }
        if (textoPaginacaoInfo) {
            textoPaginacaoInfo.textContent = totalItens === 0 
                ? 'Nenhum agendamento' 
                : `Mostrando ${inicio + 1}–${fim} de ${totalItens} agendamentos`;
        }

        if (btnPagAnterior) btnPagAnterior.disabled = (paginaAtual <= 1);
        if (btnPagProxima) btnPagProxima.disabled = (paginaAtual >= totalPaginas);

        renderizarLinhas(itensDaPagina);
    }

    function renderizarLinhas(lista) {
        tabelaCorpo.innerHTML = '';

        if (lista.length === 0) {
            tabelaCorpo.innerHTML = '<tr><td colspan="10" class="celula-vazia-mensagem">Nenhum agendamento encontrado para este filtro.</td></tr>';
            return;
        }

        lista.forEach(item => {
            const tr = document.createElement('tr');

            const st = item.status || 'pendente';
            let textoStatus = 'Pendente';
            let classeStatus = 'tag-status-pendente';

            if (st === 'compareceu') {
                textoStatus = 'Compareceu';
                classeStatus = 'tag-status-compareceu';
            } else if (st === 'faltou') {
                textoStatus = 'Não Compareceu';
                classeStatus = 'tag-status-faltou';
            }

            const valorFormatado = (parseFloat(item.valor_unitario) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

            let celulaObservacao = '<span style="color: #94a3b8;">-</span>';
            if (item.observacao && item.observacao.trim().toLowerCase().includes('reagendado')) {
                celulaObservacao = '<span class="tag-reagendado">Reagendado</span>';
            }

            tr.innerHTML = `
                <td><strong>${item.autor_nome || 'Operador'}</strong></td>
                <td class="col-centro">${formatarDataBR(item.data_contato)}</td>
                <td class="col-centro">${formatarDataBR(item.data_revisao)}</td>
                <td class="col-centro"><span class="chip-placa">${item.placa || 'SEM-PLACA'}</span></td>
                <td class="col-centro">${item.evento || 'SEM-EVENTO'}</td>
                <td class="col-centro"><strong>${item.os || 'SEM-OS'}</strong></td>
                <td class="col-centro">${item.revisao ? item.revisao + 'ª Revisão' : '-'}</td>
                <td class="col-centro"><span class="tag-status-pill ${classeStatus}">${textoStatus}</span></td>
                <td class="col-centro">${celulaObservacao}</td>
                <td class="col-centro valor-celula-destaque">${valorFormatado}</td>
            `;

            tabelaCorpo.appendChild(tr);
        });
    }

    if (inputBusca) {
        inputBusca.addEventListener('input', () => {
            paginaAtual = 1;
            aplicarFiltrosTabela();
        });
    }

    if (filtroStatus) {
        filtroStatus.addEventListener('change', () => {
            paginaAtual = 1;
            aplicarFiltrosTabela();
        });
    }

    if (filtroMes) {
        filtroMes.addEventListener('change', carregarDados);
    }

    if (btnPagAnterior) {
        btnPagAnterior.addEventListener('click', () => {
            if (paginaAtual > 1) {
                paginaAtual--;
                renderizarPaginaAtual();
            }
        });
    }

    if (btnPagProxima) {
        btnPagProxima.addEventListener('click', () => {
            const totalPaginas = Math.ceil(listaFiltradaAtual.length / ITENS_POR_PAGINA);
            if (paginaAtual < totalPaginas) {
                paginaAtual++;
                renderizarPaginaAtual();
            }
        });
    }

    await carregarDados();
});