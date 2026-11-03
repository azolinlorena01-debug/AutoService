
document.addEventListener('DOMContentLoaded', async function() {
    const SUPABASE_URL = 'https://potvtrepcoswvzmkewic.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_iMbay5YOnrrehpqI9qU7HA_vMapr-DY';
    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    window.atualizarContadorDivergencias(supabaseClient);

    const META_GLOBAL_CENTRAL = 6000;

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

    const textoProgressoCentral = document.getElementById('texto-progresso-central');
    const badgeRestanteCentral = document.getElementById('badge-restante-central');
    const barraProgressoCentral = document.getElementById('barra-progresso-central');

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

    if (isAdmin) window.mostrarLinksAdmin();

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
        window.salvarMenuCache(areaAuth.innerHTML, isAdmin);

        document.getElementById('btn-sair-header')?.addEventListener('click', async () => {
            window.limparMenuCache();
            await supabaseClient.auth.signOut();
            window.location.href = 'login.html';
        });
    }

    const ITENS_POR_PAGINA = 20;
    let paginaAtual = 1;
    let listaFiltradaAtual = [];
    let todosAgendamentosMes = [];
    const selecionados = new Set();
    let itensPaginaAtual = [];

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

    function intervaloDoMes(valorMes) {
        const [ano, mes] = valorMes.split('-');
        const ultimoDia = new Date(parseInt(ano, 10), parseInt(mes, 10), 0).getDate();
        return { inicio: `${ano}-${mes}-01`, fim: `${ano}-${mes}-${String(ultimoDia).padStart(2, '0')}` };
    }

    async function buscarTodasLinhas(montarConsulta, tamanho = 1000) {
        let todas = [];
        let de = 0;
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

    async function carregarDados() {
        const mesSelecionado = (filtroMes && filtroMes.value) ? filtroMes.value : valorMesPadrao;

        tabelaCorpo.innerHTML = linhaCarregando(totalColunas());
        window.atualizarSeloFechado(supabaseClient, mesSelecionado);

        try {
            const { inicio, fim } = intervaloDoMes(mesSelecionado);
            const data = await buscarTodasLinhas(() => supabaseClient
                .from('vw_agendamentos_completos')
                .select('*')
                .gte('data_revisao', inicio)
                .lte('data_revisao', fim)
                .order('data_revisao', { ascending: true })
                .order('id', { ascending: true }));

            const agendamentosGeraisDoMes = data.filter(item =>
                item.data_revisao && item.data_revisao.startsWith(mesSelecionado)
            );

            atualizarBarraMetaCentral(agendamentosGeraisDoMes);

            if (isAdmin) {
                todosAgendamentosMes = agendamentosGeraisDoMes;
            } else {
                todosAgendamentosMes = agendamentosGeraisDoMes.filter(item => item.user_id === usuarioAtual.id);
            }

            if (isAdmin) await montarFiltroOperador();
            atualizarCardsResumo(aplicarFiltroOperador(todosAgendamentosMes));
            paginaAtual = 1;
            aplicarFiltrosTabela();

        } catch (err) {
            console.error('Erro ao carregar agendamentos:', err);
            tabelaCorpo.innerHTML = `<tr><td colspan="9" class="celula-vazia-mensagem">Erro ao carregar dados: ${err.message}</td></tr>`;
        }
    }

    function atualizarBarraMetaCentral(listaGeral) {
        if (!textoProgressoCentral || !badgeRestanteCentral || !barraProgressoCentral) return;

        const comparecidosCentral = listaGeral.filter(item => item.status === 'compareceu').length;
        const percentual = Math.min(100, Math.round((comparecidosCentral / META_GLOBAL_CENTRAL) * 100));
        const restantes = Math.max(0, META_GLOBAL_CENTRAL - comparecidosCentral);

        textoProgressoCentral.textContent = `${comparecidosCentral} / ${META_GLOBAL_CENTRAL} agendamentos (${percentual}%)`;
        barraProgressoCentral.style.width = `${percentual}%`;
        window.pintarBarraMeta(barraProgressoCentral, percentual);

        if (restantes === 0) {
            badgeRestanteCentral.textContent = 'Parabéns! Meta geral atingida!';
            badgeRestanteCentral.className = 'meta-central-badge sucesso';
        } else {
            badgeRestanteCentral.textContent = `Faltam ${restantes} agendamentos no total`;
            badgeRestanteCentral.className = 'meta-central-badge';
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

    let filtroOperador = null;
    let ddFiltroOperador = null;
    let operadoresCadastrados = null;
    const perfisPorId = new Map();

    const MARCAS_DISPONIVEIS = ['Audi', 'BYD', 'Chery', 'Citroen', 'Fiat', 'Ford', 'Geely', 'Hyundai', 'Jeep', 'Kia', 'Nissan', 'Omoda', 'Renault', 'Toyota', 'Volkswagen'];

    function escaparHtml(texto) {
        return String(texto ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function ehFacilitada(item) {
        return String(item.revisao || '').toUpperCase().includes('FACILITADA');
    }

    function ehManual(item) {
        return /^manual/i.test(String(item.observacao || '').trim());
    }

    function valorDe(item) {
        return parseFloat(item.valor_unitario) || 0;
    }

    function valorPorRevisao(revisao) {
        if (String(revisao).toUpperCase().includes('FACILITADA')) return 0;
        const r = parseInt(revisao, 10);
        if (isNaN(r) || r <= 4) return 2;
        if (r <= 7) return 6;
        return 10;
    }

    async function carregarOperadoresCadastrados() {
        if (operadoresCadastrados !== null) return operadoresCadastrados;
        operadoresCadastrados = [];
        try {
            const { data: perfisTodos } = await supabaseClient.from('perfis').select('id, nome, equipe');
            (perfisTodos || []).forEach(p => {
                if (p.id && p.nome && p.nome.trim()) {
                    operadoresCadastrados.push([p.id, p.nome.trim()]);
                    perfisPorId.set(p.id, p);
                }
            });
        } catch (e) {
            console.warn('Não foi possível listar todos os operadores:', e);
        }
        return operadoresCadastrados;
    }

    async function montarFiltroOperador() {
        if (!isAdmin || !filtroStatus) return;

        if (!filtroOperador) {
            filtroOperador = document.createElement('select');
            filtroOperador.id = 'filtro-operador';
            ddFiltroOperador = transformarEmDropdown(filtroOperador);
            filtroStatus.parentNode.insertBefore(filtroOperador, filtroStatus);
            filtroStatus.parentNode.insertBefore(ddFiltroOperador.container, filtroStatus);
            filtroOperador.addEventListener('change', () => {
                paginaAtual = 1;
                atualizarCardsResumo(aplicarFiltroOperador(todosAgendamentosMes));
                aplicarFiltrosTabela();
            });
            if (inputBusca) inputBusca.placeholder = 'Buscar por placa, ordem de serviço ou nome...';
        }

        await carregarOperadoresCadastrados();

        const anterior = filtroOperador.value;
        const operadores = new Map(operadoresCadastrados);
        todosAgendamentosMes.forEach(item => {
            if (item.user_id && !operadores.has(item.user_id)) {
                operadores.set(item.user_id, (item.autor_nome || 'Operador').trim());
            }
        });

        filtroOperador.innerHTML = '<option value="">Todos os Operadores</option>';
        [...operadores.entries()]
            .sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'))
            .forEach(([id, nome]) => {
                const opt = document.createElement('option');
                opt.value = id;
                opt.textContent = nome;
                filtroOperador.appendChild(opt);
            });

        if (anterior && operadores.has(anterior)) filtroOperador.value = anterior;
        ddFiltroOperador.sincronizar();
    }

    function aplicarFiltroOperador(lista) {
        const escolhido = filtroOperador ? filtroOperador.value : '';
        return escolhido ? lista.filter(item => item.user_id === escolhido) : lista;
    }

    function aplicarFiltrosTabela() {
        const termoBusca = (inputBusca?.value || '').trim().toLowerCase();
        const statusSelecionado = filtroStatus ? filtroStatus.value : 'todos';

        listaFiltradaAtual = aplicarFiltroOperador(todosAgendamentosMes).filter(item => {
            const placa = (item.placa || '').toLowerCase();
            const os = (item.os || '').toLowerCase();
            const nome = (item.autor_nome || '').toLowerCase();
            const revStr = String(item.revisao || '').toLowerCase();
            const obsStr = String(item.observacao || '').toLowerCase();

            const bateBusca = !termoBusca || 
                placa.includes(termoBusca) || 
                os.includes(termoBusca) || 
                nome.includes(termoBusca) ||
                revStr.includes(termoBusca) ||
                obsStr.includes(termoBusca);

            let bateStatus = false;
            const statusItem = item.status || 'pendente';

            if (statusSelecionado === 'todos') {
                bateStatus = true;
            } else if (statusSelecionado === 'reagendado') {
                bateStatus = obsStr.includes('reagendado');
            } else if (statusSelecionado === 'facilitada') {
                bateStatus = revStr.includes('facilitada');
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

    function sincronizarSelecao() {
        const botao = document.getElementById('btn-excluir-selecionados');
        if (botao) {
            botao.classList.toggle('oculto', selecionados.size === 0);
            botao.textContent = `Excluir selecionados (${selecionados.size})`;
        }
        const todos = document.getElementById('selecionar-todos-agendamentos');
        if (todos) {
            const marcados = itensPaginaAtual.filter(i => selecionados.has(String(i.id))).length;
            todos.checked = itensPaginaAtual.length > 0 && marcados === itensPaginaAtual.length;
            todos.indeterminate = marcados > 0 && marcados < itensPaginaAtual.length;
        }
    }

    function totalColunas() {
        const cabecalho = tabelaCorpo.closest('table').querySelectorAll('thead th');
        return cabecalho.length || 9;
    }

    function garantirColunaSelecao() {
        if (document.getElementById('selecionar-todos-agendamentos')) return;
        const linhaCabecalho = tabelaCorpo.closest('table').querySelector('thead tr');
        const th = document.createElement('th');
        th.className = 'col-selecao';
        th.innerHTML = '<input type="checkbox" id="selecionar-todos-agendamentos" aria-label="Selecionar todos da página">';
        linhaCabecalho.insertBefore(th, linhaCabecalho.firstChild);
        th.querySelector('input').addEventListener('change', (e) => {
            itensPaginaAtual.forEach(i => {
                if (e.target.checked) selecionados.add(String(i.id));
                else selecionados.delete(String(i.id));
            });
            tabelaCorpo.querySelectorAll('.chk-agendamento').forEach(c => { c.checked = e.target.checked; });
            sincronizarSelecao();
        });
    }

    async function excluirSelecionados() {
        const ids = Array.from(selecionados);
        if (ids.length === 0) return;
        const texto = ids.length === 1
            ? 'Excluir o agendamento selecionado? Esta ação não pode ser desfeita.'
            : `Excluir os ${ids.length} agendamentos selecionados? Esta ação não pode ser desfeita.`;
        if (!(await confirmar(texto, { titulo: 'Excluir agendamentos', confirmar: 'Excluir', perigo: true }))) return;

        ocupado(true);
        let removidos = 0;
        let mensagemErro = '';
        for (let i = 0; i < ids.length; i += 100) {
            const bloco = ids.slice(i, i + 100);
            const { data, error } = await supabaseClient.from('agendamentos').delete().in('id', bloco).select('id');
            if (error) { mensagemErro = error.message; break; }
            removidos += (data || []).length;
        }
        ocupado(false);

        selecionados.clear();
        if (mensagemErro) avisar('Não foi possível excluir: ' + mensagemErro);
        else if (removidos < ids.length) avisar(`Foram excluídos ${removidos} de ${ids.length}. Os demais estão em mês fechado ou sem permissão.`, 'aviso');
        else avisar(removidos === 1 ? 'Agendamento excluído.' : `${removidos} agendamentos excluídos.`, 'sucesso');
        await carregarDados();
    }

    function renderizarLinhas(lista) {
        itensPaginaAtual = lista;
        if (isAdmin) garantirColunaSelecao();
        tabelaCorpo.innerHTML = '';

        if (lista.length === 0) {
            tabelaCorpo.innerHTML = linhaVazia(totalColunas(), 'Nenhum agendamento encontrado para este filtro.', 'Altere o mês ou os filtros para ver outros registros.');
            return;
        }

        lista.forEach(item => {
            const tr = document.createElement('tr');
            const st = item.status || 'pendente';

            let classeCor = 'status-pendente';
            if (st === 'compareceu') classeCor = 'status-compareceu';
            else if (st === 'faltou') classeCor = 'status-faltou';

            const valorNumerico = parseFloat(item.valor_unitario) || 0;
            const valorFormatado = valorNumerico.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

            const rotuloStatus = { pendente: 'Pendente', compareceu: 'Compareceu', faltou: 'No-Show' }[st] || 'Pendente';
            const seletorStatusHTML = !isAdmin ? `<span class="select-status-tabela status-somente-leitura ${classeCor}">${rotuloStatus}</span>` : `
                <select class="select-status-tabela ${classeCor}" data-id="${item.id}">
                    <option value="pendente" ${st === 'pendente' ? 'selected' : ''}>Pendente</option>
                    <option value="compareceu" ${st === 'compareceu' ? 'selected' : ''}>Compareceu</option>
                    <option value="faltou" ${st === 'faltou' ? 'selected' : ''}>No-Show</option>
                </select>
            `;

            let textoRevisao = '-';
            const revStr = String(item.revisao || '').toUpperCase();
            if (revStr.includes('FACILITADA')) {
                textoRevisao = 'Revisão Facilitada';
            } else if (item.revisao) {
                textoRevisao = `${item.revisao}ª Revisão`;
            }

            let celulaObservacao = '<span class="texto-suave">-</span>';
            if (ehManual(item)) {
                celulaObservacao = `<span class="tag-manual" title="${escaparHtml(item.observacao)}">Manual</span>`;
            } else if (item.observacao && String(item.observacao).toLowerCase().includes('reagendado')) {
                celulaObservacao = '<span class="tag-reagendado">Reagendado</span>';
            }

            const classeValor = (st === 'compareceu' && valorNumerico > 0) ? 'valor-celula-destaque' : '';
            const classeApagada = (st !== 'compareceu' || valorNumerico === 0) ? 'valor-celula-apagado' : '';

            const facilitada = ehFacilitada(item);
            let conteudoValor = valorFormatado;
            let classesValor = `${classeValor} ${classeApagada}`;
            if (facilitada && isAdmin) {
                conteudoValor = `<input type="number" class="input-valor-facilitada" min="0" step="0.01" data-id="${item.id}" value="${valorNumerico > 0 ? valorNumerico.toFixed(2) : ''}" placeholder="Definir valor">`;
                classesValor = '';
            } else if (facilitada && valorNumerico === 0) {
                conteudoValor = 'Aguardando valor';
            }

            const celulaSelecao = isAdmin
                ? `<td class="col-selecao"><input type="checkbox" class="chk-agendamento" data-id="${item.id}" aria-label="Selecionar agendamento" ${selecionados.has(String(item.id)) ? 'checked' : ''}></td>`
                : '';

            tr.innerHTML = `
                ${celulaSelecao}
                <td><strong>${item.autor_nome || 'Operador'}</strong></td>
                <td class="col-centro">${formatarDataBR(item.data_contato)}</td>
                <td class="col-centro">${formatarDataBR(item.data_revisao)}</td>
                <td class="col-centro"><span class="chip-placa">${item.placa || 'SEM-PLACA'}</span></td>
                <td class="col-centro"><strong>${item.os || 'SEM-OS'}</strong></td>
                <td class="col-centro">${textoRevisao}</td>
                <td class="col-centro">${seletorStatusHTML}</td>
                <td class="col-centro">${celulaObservacao}</td>
                <td class="col-centro celula-valor-bonus ${classesValor}">${conteudoValor}</td>
            `;

            const chk = tr.querySelector('.chk-agendamento');
            if (chk) {
                chk.addEventListener('change', () => {
                    if (chk.checked) selecionados.add(String(item.id));
                    else selecionados.delete(String(item.id));
                    sincronizarSelecao();
                });
            }

            tabelaCorpo.appendChild(tr);
        });

        sincronizarSelecao();

        document.querySelectorAll('select.select-status-tabela').forEach(sel => {
            sel.addEventListener('change', async function() {
                const idAgendamento = this.dataset.id;
                const novoStatus = this.value;

                this.classList.remove('status-pendente', 'status-compareceu', 'status-faltou');
                if (novoStatus === 'compareceu') this.classList.add('status-compareceu');
                else if (novoStatus === 'faltou') this.classList.add('status-faltou');
                else this.classList.add('status-pendente');

                const agendamentoAlvo = todosAgendamentosMes.find(a => a.id == idAgendamento);
                if (agendamentoAlvo) {
                    agendamentoAlvo.status = novoStatus;
                }

                const linhaTr = this.closest('tr');
                const celulaValor = linhaTr?.querySelector('.celula-valor-bonus');
                const valorNum = parseFloat(agendamentoAlvo?.valor_unitario) || 0;

                if (celulaValor && !celulaValor.querySelector('input')) {
                    if (novoStatus === 'compareceu' && valorNum > 0) {
                        celulaValor.classList.add('valor-celula-destaque');
                        celulaValor.classList.remove('valor-celula-apagado');
                    } else {
                        celulaValor.classList.remove('valor-celula-destaque');
                        celulaValor.classList.add('valor-celula-apagado');
                    }
                }

                atualizarCardsResumo(todosAgendamentosMes);

                try {
                    const { error } = await supabaseClient
                        .from('agendamentos')
                        .update({ status: novoStatus })
                        .eq('id', idAgendamento);

                    if (error) {
                        avisar('Erro ao salvar alteração: ' + error.message);
                    }
                } catch (err) {
                    console.error('Erro de conexão ao atualizar status:', err);
                }
            });
        });

        ligarEdicaoValorFacilitada();
    }

    function ligarEdicaoValorFacilitada() {
        document.querySelectorAll('.input-valor-facilitada').forEach(campo => {
            campo.addEventListener('change', async function() {
                const alvo = todosAgendamentosMes.find(a => a.id == this.dataset.id);
                const anterior = alvo ? valorDe(alvo) : 0;
                const restaurar = () => { this.value = anterior > 0 ? anterior.toFixed(2) : ''; };

                const bruto = this.value.trim().replace(',', '.');
                const novo = bruto === '' ? 0 : parseFloat(bruto);
                if (isNaN(novo) || novo < 0) {
                    avisar('Informe um valor válido (zero ou maior).');
                    restaurar();
                    return;
                }

                this.disabled = true;
                const { data, error } = await supabaseClient
                    .from('agendamentos')
                    .update({ valor_unitario: novo })
                    .eq('id', this.dataset.id)
                    .select('id');
                this.disabled = false;

                if (error || !data || data.length === 0) {
                    avisar('Não foi possível salvar o valor' + (error ? ': ' + error.message : ' (sem permissão para alterar este agendamento).'));
                    restaurar();
                    return;
                }

                if (alvo) alvo.valor_unitario = novo;
                this.value = novo > 0 ? novo.toFixed(2) : '';
                this.classList.add('valor-salvo');
                setTimeout(() => this.classList.remove('valor-salvo'), 1500);
            });
        });
    }

    function normalizarMarcaPerfil(texto) {
        const base = String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
        if (base.includes('VW') || base.includes('VOLKS')) return 'Volkswagen';
        return MARCAS_DISPONIVEIS.find(m => base.includes(m.toUpperCase())) || '';
    }

    function mostrarAvisoAgendamento(texto) {
        const aviso = document.getElementById('aviso-agendamento');
        if (!aviso) return;
        aviso.textContent = texto;
        aviso.classList.remove('oculto');
        setTimeout(() => aviso.classList.add('oculto'), 5000);
    }

    async function abrirModalNovoAgendamento() {
        await carregarOperadoresCadastrados();

        let overlay = document.getElementById('modalNovoAgendamento');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'modalNovoAgendamento';
            overlay.className = 'modal-overlay';
            overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.style.display = 'none'; });
            document.addEventListener('keydown', (e) => { if (e.key === 'Escape') overlay.style.display = 'none'; });
            document.body.appendChild(overlay);
        }

        overlay.innerHTML = `
            <div class="modal-card-metas modal-card-manual">
                <div class="modal-topo-metas">
                    <h3>Adicionar Agendamento</h3>
                    <button type="button" id="btnManualFechar" class="btn-fechar-modal-metas">&times;</button>
                </div>
                <div class="modal-corpo-metas">
                    <div class="manual-grade">
                        <div class="manual-campo-cheio">
                            <label class="modal-campo-label">Operador</label>
                            <select id="manual-operador"></select>
                        </div>
                        <div>
                            <label class="modal-campo-label">Marca</label>
                            <select id="manual-marca"></select>
                        </div>
                        <div>
                            <label class="modal-campo-label">Revisão</label>
                            <select id="manual-revisao"></select>
                        </div>
                        <div>
                            <label class="modal-campo-label">Placa</label>
                            <input type="text" id="manual-placa" class="modal-input-metas" maxlength="10" placeholder="Ex: ABC1D23">
                        </div>
                        <div>
                            <label class="modal-campo-label">O.S</label>
                            <input type="text" id="manual-os" class="modal-input-metas" maxlength="20" placeholder="Opcional">
                        </div>
                        <div>
                            <label class="modal-campo-label">Data do contato</label>
                            <input type="date" id="manual-data-contato" class="modal-input-metas">
                        </div>
                        <div>
                            <label class="modal-campo-label">Data da revisão</label>
                            <input type="date" id="manual-data-revisao" class="modal-input-metas">
                        </div>
                        <div>
                            <label class="modal-campo-label">Status</label>
                            <select id="manual-status"></select>
                        </div>
                        <div>
                            <label class="modal-campo-label">Valor (R$)</label>
                            <input type="number" id="manual-valor" class="modal-input-metas" min="0" step="0.01">
                        </div>
                        <div class="manual-campo-cheio">
                            <label class="modal-campo-label">Observação</label>
                            <input type="text" id="manual-obs" class="modal-input-metas" maxlength="120" placeholder="Motivo do lançamento manual (opcional)">
                        </div>
                    </div>
                    <p id="manual-erro" class="manual-erro oculto"></p>
                </div>
                <div class="modal-rodape-metas">
                    <button type="button" id="btnManualCancelar" class="btn-cancelar-modal">Cancelar</button>
                    <button type="button" id="btnManualSalvar" class="btn-salvar-modal">Adicionar</button>
                </div>
            </div>`;

        const campo = (id) => overlay.querySelector('#' + id);
        const preencher = (select, opcoes) => {
            select.innerHTML = '';
            opcoes.forEach(([valor, texto]) => {
                const opt = document.createElement('option');
                opt.value = valor;
                opt.textContent = texto;
                select.appendChild(opt);
            });
        };

        const selOperador = campo('manual-operador');
        const selMarca = campo('manual-marca');
        const selRevisao = campo('manual-revisao');
        const selStatus = campo('manual-status');
        const inputValor = campo('manual-valor');

        preencher(selOperador, [['', 'Selecione o operador...'], ...[...operadoresCadastrados].sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'))]);
        preencher(selMarca, [['', 'Selecione a marca...'], ...MARCAS_DISPONIVEIS.map(m => [m, m])]);
        const opcoesRevisao = [];
        for (let n = 1; n <= 12; n++) opcoesRevisao.push([String(n), `${n}ª Revisão`]);
        opcoesRevisao.push(['FACILITADA', 'Revisão Facilitada']);
        preencher(selRevisao, opcoesRevisao);
        preencher(selStatus, [['compareceu', 'Compareceu'], ['pendente', 'Pendente'], ['faltou', 'No-Show']]);

        const dropdowns = [selOperador, selMarca, selRevisao, selStatus].map(sel => {
            const dd = transformarEmDropdown(sel, 'dd-cheio');
            sel.parentNode.appendChild(dd.container);
            return dd;
        });
        const sincronizarTodos = () => dropdowns.forEach(dd => dd.sincronizar());

        const mesSel = (filtroMes && filtroMes.value) ? filtroMes.value : valorMesPadrao;
        const hojeISO = `${anoAtual}-${mesAtual}-${String(hoje.getDate()).padStart(2, '0')}`;
        const dataPadrao = hojeISO.startsWith(mesSel) ? hojeISO : `${mesSel}-01`;
        campo('manual-data-contato').value = dataPadrao;
        campo('manual-data-revisao').value = dataPadrao;

        let valorEditadoAMao = false;
        const atualizarValorAutomatico = () => {
            if (valorEditadoAMao) return;
            const v = valorPorRevisao(selRevisao.value);
            inputValor.value = v > 0 ? v.toFixed(2) : '';
        };
        inputValor.addEventListener('input', () => { valorEditadoAMao = true; });
        selRevisao.addEventListener('change', atualizarValorAutomatico);
        atualizarValorAutomatico();

        selOperador.addEventListener('change', () => {
            const perfil = perfisPorId.get(selOperador.value);
            const primeira = perfil && perfil.equipe ? normalizarMarcaPerfil(String(perfil.equipe).split('|')[0]) : '';
            if (primeira) {
                selMarca.value = primeira;
                dropdowns[1].sincronizar();
            }
        });

        sincronizarTodos();

        const erro = campo('manual-erro');
        const mostrarErro = (texto) => {
            erro.textContent = texto;
            erro.classList.remove('oculto');
        };
        const fechar = () => { overlay.style.display = 'none'; };
        campo('btnManualFechar').addEventListener('click', fechar);
        campo('btnManualCancelar').addEventListener('click', fechar);

        campo('btnManualSalvar').addEventListener('click', async function() {
            erro.classList.add('oculto');

            const operador = selOperador.value;
            const marca = selMarca.value;
            const placa = campo('manual-placa').value.toUpperCase().replace(/[^A-Z0-9]/g, '');
            const dataContato = campo('manual-data-contato').value;
            const dataRevisao = campo('manual-data-revisao').value;
            const status = selStatus.value;
            const revisaoSel = selRevisao.value;
            const osDigitada = campo('manual-os').value.trim();
            const obs = campo('manual-obs').value.trim();
            const valorBruto = inputValor.value.trim().replace(',', '.');
            const valor = valorBruto === '' ? 0 : parseFloat(valorBruto);

            if (!operador) return mostrarErro('Selecione o operador.');
            if (!marca) return mostrarErro('Selecione a marca.');
            if (!placa) return mostrarErro('Informe a placa.');
            if (!dataContato || !dataRevisao) return mostrarErro('Informe as datas do contato e da revisão.');
            if (isNaN(valor) || valor < 0) return mostrarErro('Informe um valor válido (zero ou maior).');

            const registro = {
                user_id: operador,
                data_contato: dataContato,
                data_revisao: dataRevisao,
                status: status,
                placa: placa,
                evento: 'MANUAL',
                os: osDigitada || (status === 'compareceu' ? 'COMPARECEU' : 'SEM-OS'),
                revisao: revisaoSel === 'FACILITADA' ? 'FACILITADA' : parseInt(revisaoSel, 10),
                valor_unitario: valor,
                observacao: obs ? `Manual: ${obs}` : 'Manual',
                marca: marca
            };

            this.disabled = true;
            this.textContent = 'Salvando...';
            const { error } = await supabaseClient.from('agendamentos').insert([registro]);
            this.disabled = false;
            this.textContent = 'Adicionar';

            if (error) {
                mostrarErro('Não foi possível adicionar: ' + error.message);
                return;
            }

            fechar();
            if (filtroMes) filtroMes.value = dataRevisao.slice(0, 7);
            await carregarDados();
            mostrarAvisoAgendamento('Agendamento adicionado manualmente.');
        });

        overlay.style.display = 'flex';
    }

    const TIPOS_DIVERGENCIA = ['Agendamento faltando', 'Status incorreto', 'Valor incorreto', 'Agendamento duplicado', 'Outro'];

    function abrirModalDivergencia() {
        let overlay = document.getElementById('modalDivergencia');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'modalDivergencia';
            overlay.className = 'modal-overlay';
            overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.style.display = 'none'; });
            document.addEventListener('keydown', (e) => { if (e.key === 'Escape') overlay.style.display = 'none'; });
            document.body.appendChild(overlay);
        }

        overlay.innerHTML = `
            <div class="modal-card-metas modal-card-manual">
                <div class="modal-topo-metas">
                    <h3>Sinalizar divergência</h3>
                    <button type="button" id="btnDivFechar" class="btn-fechar-modal-metas">&times;</button>
                </div>
                <div class="modal-corpo-metas">
                    <div class="manual-grade">
                        <div>
                            <label class="modal-campo-label">Mês</label>
                            <input type="month" id="div-mes" class="modal-input-metas">
                        </div>
                        <div>
                            <label class="modal-campo-label">Tipo</label>
                            <select id="div-tipo">${TIPOS_DIVERGENCIA.map(t => `<option value="${t}">${t}</option>`).join('')}</select>
                        </div>
                        <div>
                            <label class="modal-campo-label">Placa</label>
                            <input type="text" id="div-placa" class="modal-input-metas" maxlength="10" placeholder="Opcional">
                        </div>
                        <div>
                            <label class="modal-campo-label">O.S</label>
                            <input type="text" id="div-os" class="modal-input-metas" maxlength="20" placeholder="Opcional">
                        </div>
                        <div class="manual-campo-cheio">
                            <label class="modal-campo-label">Descrição</label>
                            <textarea id="div-descricao" class="modal-input-metas modal-textarea" maxlength="500" rows="4" placeholder="Explique o que está divergente"></textarea>
                        </div>
                    </div>
                    <p id="div-erro" class="manual-erro oculto"></p>
                </div>
                <div class="modal-rodape-metas">
                    <button type="button" id="btnDivCancelar" class="btn-cancelar-modal">Cancelar</button>
                    <button type="button" id="btnDivEnviar" class="btn-salvar-modal">Enviar</button>
                </div>
            </div>`;

        const campo = (id) => overlay.querySelector('#' + id);
        const erro = campo('div-erro');
        const fechar = () => { overlay.style.display = 'none'; };
        campo('div-mes').value = (filtroMes && filtroMes.value) ? filtroMes.value : valorMesPadrao;
        window.transformarMes(campo('div-mes'));
        const selTipo = campo('div-tipo');
        const ddTipo = transformarEmDropdown(selTipo, 'dd-cheio');
        selTipo.parentNode.appendChild(ddTipo.container);
        campo('btnDivFechar').addEventListener('click', fechar);
        campo('btnDivCancelar').addEventListener('click', fechar);

        campo('btnDivEnviar').addEventListener('click', async function() {
            erro.classList.add('oculto');
            const mes = campo('div-mes').value;
            const descricao = campo('div-descricao').value.trim();
            const placa = campo('div-placa').value.toUpperCase().replace(/[^A-Z0-9]/g, '');
            const os = campo('div-os').value.trim();
            const mostrarErro = (texto) => { erro.textContent = texto; erro.classList.remove('oculto'); };
            if (!mes) return mostrarErro('Informe o mês.');
            if (descricao.length < 5) return mostrarErro('Descreva a divergência.');

            this.disabled = true;
            this.textContent = 'Enviando...';
            const { error } = await supabaseClient.from('divergencias').insert([{
                user_id: usuarioAtual.id,
                mes,
                tipo: selTipo.value,
                placa: placa || null,
                os: os || null,
                descricao
            }]);
            this.disabled = false;
            this.textContent = 'Enviar';

            if (error) {
                mostrarErro('Não foi possível enviar: ' + error.message);
                return;
            }
            fechar();
            mostrarAvisoAgendamento('Divergência enviada. Acompanhe na página Divergências.');
        });

        overlay.style.display = 'flex';
    }

    function montarBotaoAdicionar() {
        const cabecalho = document.getElementById('area-botao-adicionar');
        if (!cabecalho || document.getElementById('btn-adicionar-agendamento') || document.getElementById('btn-sinalizar-divergencia')) return;

        const botao = document.createElement('button');
        botao.type = 'button';
        botao.id = isAdmin ? 'btn-adicionar-agendamento' : 'btn-sinalizar-divergencia';
        botao.className = isAdmin ? 'btn-adicionar-agendamento' : 'btn-adicionar-agendamento ico ico-bandeira';
        botao.textContent = isAdmin ? '+ Adicionar Agendamento' : 'Sinalizar divergência';
        botao.addEventListener('click', isAdmin ? abrirModalNovoAgendamento : abrirModalDivergencia);

        const aviso = document.createElement('span');
        aviso.id = 'aviso-agendamento';
        aviso.className = 'aviso-agendamento oculto';

        if (isAdmin) {
            const botaoExcluir = document.createElement('button');
            botaoExcluir.type = 'button';
            botaoExcluir.id = 'btn-excluir-selecionados';
            botaoExcluir.className = 'btn-excluir-selecionados ico ico-lixeira oculto';
            botaoExcluir.textContent = 'Excluir selecionados (0)';
            botaoExcluir.addEventListener('click', excluirSelecionados);
            cabecalho.appendChild(botaoExcluir);
        }

        cabecalho.appendChild(botao);
        cabecalho.appendChild(aviso);
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

    montarBotaoAdicionar();
    await carregarDados();
    window.mostrarConteudo();
});