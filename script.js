/* ==========================================================================
   CADERNO DE ESTUDOS - JAVASCRIPT (script.js)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async function() {
    // 1. CONFIGURAÇÃO DO CLIENTE SUPABASE
    const SUPABASE_URL = 'https://potvtrepcoswvzmkewic.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_iMbay5YOnrrehpqI9qU7HA_vMapr-DY';
    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    // 2. GUARDA DE SEGURANÇA (AUTH GUARD):
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session || !session.user) {
        window.location.href = 'login.html';
        return;
    }
    const usuarioAtual = session.user;

    // 3. CONSULTA DE PERFIL (ROLE-BASED ACCESS CONTROL - RBAC):
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
        console.warn('Erro ao carregar perfil do banco:', e);
    }

    // TRAVA DE SEGURANÇA: Garante que seu usuário de teste/admin NUNCA perca o acesso Admin
    if (usuarioAtual.email === 'usuariotestesite01@gmail.com' || usuarioAtual.email?.includes('admin')) {
        isAdmin = true;
    }

    // 4. CONTROLE VISUAL CONFORME O PERFIL:
    const linkMenuImportar = document.getElementById('link-menu-importar');
    const secaoCardsBonusIndex = document.getElementById('secao-cards-bonus-index');
    const secaoFormularioAgendamento = document.getElementById('secao-formulario-agendamento');
    const colunaAcao = document.querySelector('.coluna-acao');
    const metricasResumoAdminIndex = document.getElementById('metricas-resumo-admin-index');

    if (isAdmin) {
        if (linkMenuImportar) linkMenuImportar.classList.remove('oculto');
        if (secaoCardsBonusIndex) secaoCardsBonusIndex.classList.add('oculto');
        if (secaoFormularioAgendamento) secaoFormularioAgendamento.classList.add('oculto');
        if (colunaAcao) colunaAcao.classList.add('oculto');
        if (metricasResumoAdminIndex) metricasResumoAdminIndex.classList.remove('oculto');
    } else {
        if (linkMenuImportar) linkMenuImportar.classList.add('oculto');
        if (secaoCardsBonusIndex) secaoCardsBonusIndex.classList.remove('oculto');
        if (secaoFormularioAgendamento) secaoFormularioAgendamento.classList.remove('oculto');
        if (colunaAcao) colunaAcao.classList.remove('oculto');
        if (metricasResumoAdminIndex) metricasResumoAdminIndex.classList.add('oculto');
    }

    // 5. CABEÇALHO DO USUÁRIO (Nome e Sobrenome completos):
    const areaAuth = document.getElementById('area-autenticacao');
    if (areaAuth) {
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

    // 6. LÓGICA DO FORMULÁRIO DE NOVO AGENDAMENTO
    const formAgendamento = document.getElementById('formulario-agendamento');
    const btnAdicionar = document.getElementById('btn-adicionar-agendamento');
    
    function calcularValorPorRevisao(revisao) {
        const r = parseInt(revisao, 10);
        if (isNaN(r) || r <= 4) return 2.00;
        else if (r >= 5 && r <= 7) return 6.00;
        else return 10.00;
    }

    const inputDataContato = document.getElementById('data-contato');
    const inputDataRevisao = document.getElementById('data-revisao');
    const hojeStr = new Date().toISOString().split('T')[0];
    if (inputDataContato) inputDataContato.value = hojeStr;
    if (inputDataRevisao) inputDataRevisao.value = hojeStr;

    if (formAgendamento) {
        formAgendamento.addEventListener('submit', async function(e) {
            e.preventDefault();

            const dataContato = document.getElementById('data-contato').value;
            const dataRevisao = document.getElementById('data-revisao').value;
            const placa = (document.getElementById('campo-placa').value || '').trim().toUpperCase();
            const evento = (document.getElementById('campo-evento').value || '').trim() || 'SEM-EVENTO';
            const os = (document.getElementById('campo-os').value || '').trim() || 'SEM-OS';
            const revisao = parseInt(document.getElementById('campo-revisao').value, 10) || 1;
            const status = document.getElementById('campo-status').value || 'pendente';
            const valorUnitario = calcularValorPorRevisao(revisao);

            if (!placa) {
                alert('Informe a placa do veículo.');
                return;
            }

            btnAdicionar.disabled = true;
            btnAdicionar.textContent = 'Adicionando...';

            const novoAgendamento = {
                user_id: usuarioAtual.id,
                data_contato: dataContato,
                data_revisao: dataRevisao,
                placa: placa,
                evento: evento,
                os: os,
                revisao: revisao,
                status: status,
                valor_unitario: valorUnitario
            };

            const { error } = await supabaseClient.from('agendamentos').insert([novoAgendamento]);

            btnAdicionar.disabled = false;
            btnAdicionar.textContent = 'Adicionar';

            if (error) {
                alert('Erro ao salvar agendamento: ' + error.message);
            } else {
                document.getElementById('campo-placa').value = '';
                document.getElementById('campo-evento').value = '';
                document.getElementById('campo-os').value = '';
                await carregarAgendamentos(); 
            }
        });
    }

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

    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    if (filtroMes) filtroMes.value = `${ano}-${mes}`;

    let paginaAtual = 1;
    const itensPorPagina = 20; 
    let todosAgendamentosMes = [];
    let agendamentosFiltrados = [];

    function formatarDataBR(dataIso) {
        if (!dataIso) return '-';
        const partes = dataIso.split('-');
        if (partes.length < 3) return dataIso;
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }

    async function carregarAgendamentos() {
        const mesSelecionado = filtroMes.value;
        const colunas = isAdmin ? 9 : 10;
        corpoTabela.innerHTML = `<tr><td colspan="${colunas}" class="celula-vazia-mensagem">Carregando agendamentos...</td></tr>`;

        let query = supabaseClient.from('vw_agendamentos_completos').select('*');

        if (!isAdmin) {
            query = query.eq('user_id', usuarioAtual.id);
        }

        const { data, error } = await query.order('data_revisao', { ascending: true });

        if (error) {
            console.error('Erro na requisição ao Supabase:', error);
            corpoTabela.innerHTML = `<tr><td colspan="${colunas}" class="celula-vazia-mensagem admin-val-perigo">Erro ao carregar dados.</td></tr>`;
            return;
        }

        todosAgendamentosMes = (data || []).filter(item => 
            item.data_revisao && item.data_revisao.startsWith(mesSelecionado)
        );

        paginaAtual = 1;
        aplicarFiltrosEAtualizar();
    }

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

    function atualizarCardsResumo() {
        let confirmados = 0;
        let pendentes = 0;
        let faltas = 0;
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
                pendentes++;
                somaPrevisto += v;
            } else if (st === 'faltou') {
                faltas++;
            }
        });

        if (valorConfirmadoEl) valorConfirmadoEl.textContent = `R$ ${somaRealizado.toFixed(2).replace('.', ',')}`;
        if (valorPrevistoEl) valorPrevistoEl.textContent = `R$ ${somaPrevisto.toFixed(2).replace('.', ',')}`;
        if (detalheConfirmadoEl) detalheConfirmadoEl.textContent = `${confirmados} revisões comparecidas`;
        if (contadorAgendamentos) contadorAgendamentos.textContent = `${todosAgendamentosMes.length} registros neste mês`;

        if (isAdmin) {
            const totalGeral = confirmados + pendentes + faltas;
            const taxa = totalGeral > 0 ? Math.round((confirmados / totalGeral) * 100) : 0;
            
            const elTotal = document.getElementById('admin-total-agendados');
            const elCompareceu = document.getElementById('admin-total-compareceu');
            const elTaxa = document.getElementById('admin-taxa-presenca');
            const elPendente = document.getElementById('admin-total-pendente');
            const elFaltas = document.getElementById('admin-total-faltas');

            if (elTotal) elTotal.textContent = totalGeral;
            if (elCompareceu) elCompareceu.textContent = confirmados;
            if (elTaxa) elTaxa.textContent = `${taxa}% de presença`;
            if (elPendente) elPendente.textContent = pendentes;
            if (elFaltas) elFaltas.textContent = faltas;
        }
    }

    // 7. RENDERIZAÇÃO DA TABELA (SEM O E-MAIL, EXIBINDO NOME COMPLETO)
    function renderizarTabelaPaginada() {
        const total = agendamentosFiltrados.length;
        const totalPaginas = Math.ceil(total / itensPorPagina) || 1;

        if (paginaAtual > totalPaginas) paginaAtual = totalPaginas;
        if (paginaAtual < 1) paginaAtual = 1;

        const inicio = (paginaAtual - 1) * itensPorPagina;
        const fim = Math.min(inicio + itensPorPagina, total);
        const paginaItens = agendamentosFiltrados.slice(inicio, fim);

        corpoTabela.innerHTML = '';
        const colunas = isAdmin ? 9 : 10;

        if (paginaItens.length === 0) {
            corpoTabela.innerHTML = `<tr><td colspan="${colunas}" class="celula-vazia-mensagem">Nenhum agendamento encontrado para essa busca.</td></tr>`;
        } else {
            paginaItens.forEach(item => {
                const tr = document.createElement('tr');
                const v = parseFloat(item.valor_unitario) || 0;
                const status = item.status || 'pendente';

                let classeValor = (status === 'compareceu') ? 'valor-confirmado-tabela' : 'valor-pendente-tabela';

                let htmlStatus = `
                    <select class="select-status-tabela select-status-${status}" data-id="${item.id}">
                        <option value="pendente" ${status === 'pendente' ? 'selected' : ''}>Pendente</option>
                        <option value="compareceu" ${status === 'compareceu' ? 'selected' : ''}>Compareceu</option>
                        <option value="faltou" ${status === 'faltou' ? 'selected' : ''}>Não Compareceu</option>
                    </select>
                `;

                let htmlLinha = `
                    <td>
                        <strong>${item.autor_nome || 'Operador'}</strong>
                    </td>
                    <td>${formatarDataBR(item.data_contato)}</td>
                    <td>${formatarDataBR(item.data_revisao)}</td>
                    <td><span class="chip-placa">${item.placa || 'SEM-PLACA'}</span></td>
                    <td>${item.evento || '-'}</td>
                    <td>${item.os || '-'}</td>
                    <td>${item.revisao ? item.revisao + 'ª Revisão' : '-'}</td>
                    <td>${htmlStatus}</td>
                    <td class="col-direita ${classeValor}">R$ ${v.toFixed(2).replace('.', ',')}</td>
                `;

                if (!isAdmin) {
                    htmlLinha += `
                        <td class="col-centro">
                            <button class="btn-excluir-item" data-id="${item.id}" title="Excluir este agendamento">🗑️</button>
                        </td>
                    `;
                }

                tr.innerHTML = htmlLinha;
                corpoTabela.appendChild(tr);
            });

            document.querySelectorAll('.select-status-tabela').forEach(select => {
                select.addEventListener('change', async (e) => {
                    const idItem = e.target.getAttribute('data-id');
                    const novoStatus = e.target.value;
                    e.target.disabled = true;

                    const { error } = await supabaseClient
                        .from('agendamentos')
                        .update({ status: novoStatus })
                        .eq('id', idItem);

                    if (error) {
                        alert('Erro ao atualizar status: ' + error.message);
                        e.target.disabled = false;
                    } else {
                        await carregarAgendamentos();
                    }
                });
            });

            if (!isAdmin) {
                document.querySelectorAll('.btn-excluir-item').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const idParaExcluir = e.target.getAttribute('data-id');
                        const confirmou = confirm('Tem certeza que deseja excluir este agendamento?');
                        if (!confirmou) return;

                        e.target.disabled = true;
                        e.target.style.opacity = '0.5';

                        const { error } = await supabaseClient
                            .from('agendamentos')
                            .delete()
                            .eq('id', idParaExcluir);

                        if (error) {
                            alert('Erro ao excluir: ' + error.message);
                            e.target.disabled = false;
                            e.target.style.opacity = '1';
                        } else {
                            await carregarAgendamentos();
                        }
                    });
                });
            }
        }

        if (infoPaginacao) {
            infoPaginacao.textContent = total > 0 ? `Mostrando ${inicio + 1}–${fim} de ${total} agendamentos` : '0 agendamentos';
        }
        if (numPaginaAtualEl) {
            numPaginaAtualEl.textContent = `${paginaAtual} de ${totalPaginas}`;
        }
        if (btnPagAnt) btnPagAnt.disabled = (paginaAtual <= 1);
        if (btnPagProx) btnPagProx.disabled = (paginaAtual >= totalPaginas);
    }

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

    await carregarAgendamentos();
});