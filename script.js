/* ==========================================================================
   CADERNO DE ESTUDOS - JAVASCRIPT (script.js)
   Objetivo do arquivo:
   1. Verificar se o usuário está autenticado no Supabase.
   2. Descobrir se ele é Administrador ou Consultor.
   3. Carregar os agendamentos da View SQL do banco.
   4. Aplicar busca em tempo real (placa, evento, OS, autor).
   5. Paginar de 20 em 20 para deixar a interface rápida.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async function() {
    // 1. CONFIGURAÇÃO DO CLIENTE SUPABASE
    const SUPABASE_URL = 'https://potvtrepcoswvzmkewic.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_iMbay5YOnrrehpqI9qU7HA_vMapr-DY';
    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    // 2. GUARDA DE SEGURANÇA (AUTH GUARD):
    // Se o usuário não tiver uma sessão ativa, mandamos ele para o login.html
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session || !session.user) {
        window.location.href = 'login.html';
        return;
    }
    const usuarioAtual = session.user;

    // 3. CONSULTA DE PERFIL (ROLE-BASED ACCESS CONTROL - RBAC):
    // Verificamos a tabela 'perfis' para saber o papel (role) e a equipe do usuário.
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
        console.warn('Erro ao carregar perfil do banco:', e);
    }

    // 4. CONTROLE VISUAL CONFORME O PERFIL:
    // O Administrador ganha acesso ao link 'Importar / Exportar' e não precisa ver os cards de bônus aqui.
    const linkMenuImportar = document.getElementById('link-menu-importar');
    const secaoCardsBonusIndex = document.getElementById('secao-cards-bonus-index');

    if (isAdmin) {
        if (linkMenuImportar) linkMenuImportar.classList.remove('oculto');
        if (secaoCardsBonusIndex) secaoCardsBonusIndex.classList.add('oculto');
    } else {
        if (linkMenuImportar) linkMenuImportar.classList.add('oculto');
        if (secaoCardsBonusIndex) secaoCardsBonusIndex.classList.remove('oculto');
    }

    // 5. CABEÇALHO DO USUÁRIO:
    // Monta o "Olá, Nome" e cria o botão de Logout funcional.
    const areaAuth = document.getElementById('area-autenticacao');
    if (areaAuth) {
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

    // 6. ELEMENTOS DO DOM (DOCUMENT OBJECT MODEL):
    const filtroMes = document.getElementById('filtro-mes');
    const filtroBusca = document.getElementById('filtro-busca');
    const valorConfirmadoEl = document.querySelector('.bonus-confirmado');
    const valorPrevistoEl = document.querySelector('.bonus-previsto');
    const detalheConfirmadoEl = document.querySelector('.bonus-confirmado')?.parentElement.querySelector('.card-detalhe');
    const contadorAgendamentos = document.getElementById('contador-agendamentos');
    const corpoTabela = document.getElementById('tabela-agendamentos-corpo');

    const infoPaginacao = document.getElementById('info-paginacao');
    const numPaginaAtualEl = document.getElementById('numero-pagina-atual');
    const btnPagAnt = document.getElementById('btn-pag-anterior');
    const btnPagProx = document.getElementById('btn-pag-proxima');

    // Inicializa o seletor de mês com o ano e mês atuais no formato YYYY-MM
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    if (filtroMes) filtroMes.value = `${ano}-${mes}`;

    // 7. VARIÁVEIS DE ESTADO DA PAGINAÇÃO E DADOS:
    let paginaAtual = 1;
    const itensPorPagina = 20; // Mostra de 20 em 20 para evitar peso na página
    let todosAgendamentosMes = [];
    let agendamentosFiltrados = [];

    // Função utilitária: Converte data do banco (YYYY-MM-DD) para padrão brasileiro (DD/MM/YYYY)
    function formatarDataBR(dataIso) {
        if (!dataIso) return '-';
        const partes = dataIso.split('-');
        if (partes.length < 3) return dataIso;
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }

    // 8. BUSCA NO SUPABASE:
    // Puxa dados da View SQL 'vw_agendamentos_completos' que já junta o agendamento com o autor
    async function carregarAgendamentos() {
        const mesSelecionado = filtroMes.value;
        corpoTabela.innerHTML = '<tr><td colspan="9" class="celula-vazia-mensagem">Carregando agendamentos...</td></tr>';

        let query = supabaseClient.from('vw_agendamentos_completos').select('*');

        // Se for consultor comum, a query é filtrada apenas pelo seu próprio ID
        if (!isAdmin) {
            query = query.eq('user_id', usuarioAtual.id);
        }

        const { data, error } = await query.order('data_revisao', { ascending: true });

        if (error) {
            console.error('Erro na requisição ao Supabase:', error);
            corpoTabela.innerHTML = '<tr><td colspan="9" class="celula-vazia-mensagem admin-val-perigo">Erro ao carregar dados.</td></tr>';
            return;
        }

        // Filtra em memória pelos registros cuja data de revisão inicia com o mês selecionado (ex: "2026-10")
        todosAgendamentosMes = (data || []).filter(item => 
            item.data_revisao && item.data_revisao.startsWith(mesSelecionado)
        );

        paginaAtual = 1;
        aplicarFiltrosEAtualizar();
    }

    // 9. FILTRO DE BUSCA MULTI-CAMPO EM TEMPO REAL:
    // Procura por correspondência em placa, número de evento, ordem de serviço ou nome do consultor
    function aplicarFiltrosEAtualizar() {
        const termoBusca = (filtroBusca?.value || '').trim().toUpperCase();

        if (termoBusca.length > 0) {
            agendamentosFiltrados = todosAgendamentosMes.filter(item => {
                const placa = (item.placa || '').toUpperCase();
                const evento = String(item.evento || '').toUpperCase();
                const os = String(item.os || '').toUpperCase();
                const autor = (item.autor_nome || '').toUpperCase();

                return placa.includes(termoBusca) || 
                       evento.includes(termoBusca) || 
                       os.includes(termoBusca) || 
                       autor.includes(termoBusca);
            });
        } else {
            agendamentosFiltrados = [...todosAgendamentosMes];
        }

        atualizarCardsResumo();
        renderizarTabelaPaginada();
    }

    // 10. ATUALIZAÇÃO DOS CARDS FINANCEIROS DO CONSULTOR:
    function atualizarCardsResumo() {
        let confirmados = 0;
        let somaRealizado = 0;
        let somaPrevisto = 0;

        todosAgendamentosMes.forEach(item => {
            const v = parseFloat(item.valor_unitario) || 0;
            const st = item.status || 'pendente';
            if (st === 'compareceu') {
                confirmados++;
                somaRealizado += v;
                somaPrevisto += v;
            } else if (st === 'pendente') {
                somaPrevisto += v;
            }
        });

        if (valorConfirmadoEl) valorConfirmadoEl.textContent = `R$ ${somaRealizado.toFixed(2).replace('.', ',')}`;
        if (valorPrevistoEl) valorPrevistoEl.textContent = `R$ ${somaPrevisto.toFixed(2).replace('.', ',')}`;
        if (detalheConfirmadoEl) detalheConfirmadoEl.textContent = `${confirmados} revisões comparecidas`;
        if (contadorAgendamentos) contadorAgendamentos.textContent = `${todosAgendamentosMes.length} registros neste mês`;
    }

    // 11. RENDERIZAÇÃO DA TABELA COM PAGINAÇÃO (ALGORITMO SLICE):
    function renderizarTabelaPaginada() {
        const total = agendamentosFiltrados.length;
        const totalPaginas = Math.ceil(total / itensPorPagina) || 1;

        if (paginaAtual > totalPaginas) paginaAtual = totalPaginas;
        if (paginaAtual < 1) paginaAtual = 1;

        // O 'slice' recorta apenas o intervalo de 20 registros pertencentes à página atual
        const inicio = (paginaAtual - 1) * itensPorPagina;
        const fim = Math.min(inicio + itensPorPagina, total);
        const paginaItens = agendamentosFiltrados.slice(inicio, fim);

        corpoTabela.innerHTML = '';

        if (paginaItens.length === 0) {
            corpoTabela.innerHTML = '<tr><td colspan="9" class="celula-vazia-mensagem">Nenhum agendamento encontrado para essa busca.</td></tr>';
        } else {
            paginaItens.forEach(item => {
                const tr = document.createElement('tr');
                const v = parseFloat(item.valor_unitario) || 0;
                const status = item.status || 'pendente';

                // Aplica a classe CSS correta de pílula de status
                let tagStatus = `<span class="tag-status-pill tag-status-pendente">Pendente</span>`;
                if (status === 'compareceu') {
                    tagStatus = `<span class="tag-status-pill tag-status-compareceu">Compareceu</span>`;
                } else if (status === 'faltou') {
                    tagStatus = `<span class="tag-status-pill tag-status-faltou">Não Compareceu</span>`;
                }

                tr.innerHTML = `
                    <td>
                        <strong>${item.autor_nome || 'Operador'}</strong><br>
                        <span class="subtexto-operador">${item.autor_email || ''}</span>
                    </td>
                    <td>${formatarDataBR(item.data_contato)}</td>
                    <td>${formatarDataBR(item.data_revisao)}</td>
                    <td><span class="chip-placa">${item.placa || 'SEM-PLACA'}</span></td>
                    <td>${item.evento || '-'}</td>
                    <td>${item.os || '-'}</td>
                    <td>${item.revisao ? item.revisao + 'ª Revisão' : '-'}</td>
                    <td>${tagStatus}</td>
                    <td class="col-direita valor-celula-destaque">R$ ${v.toFixed(2).replace('.', ',')}</td>
                `;
                corpoTabela.appendChild(tr);
            });
        }

        // Atualiza a barra informativa de paginação
        if (infoPaginacao) {
            infoPaginacao.textContent = total > 0 ? `Mostrando ${inicio + 1}–${fim} de ${total} agendamentos` : '0 agendamentos';
        }
        if (numPaginaAtualEl) {
            numPaginaAtualEl.textContent = `${paginaAtual} de ${totalPaginas}`;
        }
        if (btnPagAnt) btnPagAnt.disabled = (paginaAtual <= 1);
        if (btnPagProx) btnPagProx.disabled = (paginaAtual >= totalPaginas);
    }

    // 12. EVENT LISTENERS:
    btnPagAnt?.addEventListener('click', () => {
        if (paginaAtual > 1) {
            paginaAtual--;
            renderizarTabelaPaginada();
        }
    });

    btnPagProx?.addEventListener('click', () => {
        const totalPaginas = Math.ceil(agendamentosFiltrados.length / itensPorPagina);
        if (paginaAtual < totalPaginas) {
            paginaAtual++;
            renderizarTabelaPaginada();
        }
    });

    filtroMes?.addEventListener('change', carregarAgendamentos);
    filtroBusca?.addEventListener('input', () => {
        paginaAtual = 1;
        aplicarFiltrosEAtualizar();
    });

    // Início da execução
    await carregarAgendamentos();
});