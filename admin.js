document.addEventListener('DOMContentLoaded', async function () {
    const SUPABASE_URL = 'https://potvtrepcoswvzmkewic.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_iMbay5YOnrrehpqI9qU7HA_vMapr-DY';
    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    window.atualizarContadorDivergencias(supabaseClient);
    const Bonus = window.Bonus;

    const MARCAS = ['Audi', 'BYD', 'Chery', 'Citroen', 'Fiat', 'Ford', 'Geely', 'Hyundai', 'Jeep', 'Kia', 'Nissan', 'Omoda', 'Renault', 'Toyota', 'Volkswagen'];
    const TAMANHO_HISTORICO = 100;

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session || !session.user) {
        window.location.href = 'login.html';
        return;
    }

    const usuarioAtual = session.user;
    let isAdmin = false;
    let nomeLogado = usuarioAtual.user_metadata?.nome_completo || 'Admin';

    try {
        const { data: perfil } = await supabaseClient.from('perfis').select('role, nome').eq('id', usuarioAtual.id).maybeSingle();
        if (perfil) {
            if (perfil.role === 'admin') isAdmin = true;
            if (perfil.nome && perfil.nome.trim()) nomeLogado = perfil.nome.trim();
        }
    } catch (e) {}


    if (!isAdmin) {
        window.location.href = 'relatorios.html';
        return;
    }

    window.mostrarLinksAdmin();

    function escaparHtml(texto) {
        return String(texto ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function moeda(valor) {
        return (Number(valor) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function numeroOuNulo(texto) {
        const limpo = String(texto ?? '').trim().replace(',', '.');
        if (limpo === '') return null;
        const n = parseFloat(limpo);
        return isNaN(n) ? null : n;
    }

    const areaAuth = document.getElementById('area-autenticacao');
    if (areaAuth) {
        areaAuth.innerHTML = `
            <span class="usuario-logado-tag">Olá, <strong>${escaparHtml(nomeLogado)}</strong><span class="tag-badge-admin">Admin</span></span>
            <button id="btn-sair-header" class="botao-sair-header">Sair</button>
        `;
        window.salvarMenuCache(areaAuth.innerHTML, true);
        document.getElementById('btn-sair-header').addEventListener('click', async () => {
            window.limparMenuCache();
            await supabaseClient.auth.signOut();
            window.location.href = 'login.html';
        });
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

    let perfis = [];
    const perfisPorId = new Map();

    async function carregarPerfis() {
        const { data, error } = await supabaseClient.from('perfis').select('*').order('nome', { ascending: true });
        if (error) throw error;
        perfis = (data || []).filter(p => p.id);
        perfisPorId.clear();
        perfis.forEach(p => perfisPorId.set(p.id, p));
    }

    function nomeDe(id) {
        const p = perfisPorId.get(id);
        return p && p.nome ? p.nome : 'Usuário removido';
    }

    const historicoSelecionados = new Set();
    let linhasHistoricoVisiveis = [];

    let moduloBackup = null;

    const abas = {
        fechamento: { botao: document.getElementById('aba-fechamento'), secao: document.getElementById('secao-fechamento') },
        usuarios: { botao: document.getElementById('aba-usuarios'), secao: document.getElementById('secao-usuarios') },
        inativos: { botao: document.getElementById('aba-inativos'), secao: document.getElementById('secao-inativos') },
        backup: { botao: document.getElementById('aba-backup'), secao: document.getElementById('secao-backup') },
        historico: { botao: document.getElementById('aba-historico'), secao: document.getElementById('secao-historico') }
    };

    function trocarAba(nome) {
        Object.entries(abas).forEach(([chave, aba]) => {
            aba.botao.classList.toggle('ativo', chave === nome);
            aba.secao.classList.toggle('oculto', chave !== nome);
        });
        if (nome === 'historico' && !historicoCarregado) carregarHistorico(true);
        if (nome === 'inativos') carregarInativosAdmin();
        if (nome === 'backup' && moduloBackup) moduloBackup.carregarRegistro();
    }

    Object.entries(abas).forEach(([chave, aba]) => aba.botao.addEventListener('click', () => trocarAba(chave)));

    const inputMes = document.getElementById('admin-mes');
    const corpoFechamento = document.getElementById('corpo-fechamento');
    const btnFecharMes = document.getElementById('btn-fechar-mes');
    const btnReabrirMes = document.getElementById('btn-reabrir-mes');
    const btnPreencher = document.getElementById('btn-preencher-pagos');
    const btnLimpar = document.getElementById('btn-limpar-lancamentos');
    const btnExportar = document.getElementById('btn-exportar-fechamento');

    const hoje = new Date();
    inputMes.value = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;

    let estado = { mes: '', agendamentos: [], metas: {}, salvos: new Map(), fechado: false, linhas: [], soPendentes: new URLSearchParams(window.location.search).get('pendentes') === '1' };

    function intervaloDoMes(mes) {
        const [ano, m] = mes.split('-');
        const ultimo = new Date(parseInt(ano, 10), parseInt(m, 10), 0).getDate();
        return { inicio: `${mes}-01`, fim: `${mes}-${String(ultimo).padStart(2, '0')}` };
    }

    function obterMeta(marca) {
        const valor = estado.metas[`${estado.mes}_${marca}`];
        return valor || Bonus.metaPadrao(marca);
    }

    async function carregarFechamento() {
        const mes = inputMes.value;
        if (!mes) return;
        corpoFechamento.innerHTML = linhaCarregando(10);

        const { inicio, fim } = intervaloDoMes(mes);
        try {
            const [agendamentos, metasRes, salvosRes, fechadoRes] = await Promise.all([
                buscarTodasLinhas(() => supabaseClient.from('vw_agendamentos_completos').select('*')
                    .gte('data_revisao', inicio).lte('data_revisao', fim)
                    .order('data_revisao', { ascending: true }).order('id', { ascending: true })),
                supabaseClient.from('metas_mensais').select('*'),
                supabaseClient.from('fechamentos').select('*').eq('mes', mes),
                supabaseClient.from('meses_fechados').select('mes').eq('mes', mes)
            ]);

            const metas = {};
            (metasRes.data || []).forEach(m => {
                metas[`${m.mes_referencia}_${Bonus.normalizarMarca(m.equipe)}`] = parseInt(m.meta_valor, 10);
            });

            estado = {
                mes,
                agendamentos: agendamentos.map(a => ({ ...a, marca: Bonus.normalizarMarca(a.marca || a.autor_equipe || 'Toyota') })),
                metas,
                salvos: new Map((salvosRes.data || []).map(s => [s.user_id, s])),
                fechado: (fechadoRes.data || []).length > 0,
                linhas: []
            };
            renderizarFechamento();
        } catch (e) {
            corpoFechamento.innerHTML = `<tr><td colspan="10" class="celula-vazia-mensagem">Não foi possível carregar: ${escaparHtml(e.message || e)}</td></tr>`;
        }
    }

    function calcularLinha(perfil, nota) {
        return Bonus.calcularOperador({ id: perfil.id, equipe: perfil.equipe }, estado.agendamentos, obterMeta, nota);
    }

    function mesDoFechamentoAntesDe(inativoDesde) {
        return estado.mes < String(inativoDesde).slice(0, 7);
    }

    function renderizarFechamento() {
        const operadores = perfis.filter(p => p.role !== 'admin' && (!p.inativo_desde || mesDoFechamentoAntesDe(p.inativo_desde)));
        const desabilitado = estado.fechado ? 'disabled' : '';

        if (operadores.length === 0) {
            corpoFechamento.innerHTML = linhaVazia(10, 'Nenhum operador cadastrado.', 'Os operadores aparecem aqui assim que forem cadastrados.');
            return;
        }

        estado.linhas = operadores.map(perfil => {
            const salvo = estado.salvos.get(perfil.id);
            const nota = salvo && salvo.nota_monitoria !== null && salvo.nota_monitoria !== undefined ? Number(salvo.nota_monitoria) : null;
            return { perfil, nota, calculo: calcularLinha(perfil, nota), pago: salvo && salvo.valor_pago !== null ? Number(salvo.valor_pago) : null, observacao: salvo?.observacao || '' };
        });

        corpoFechamento.innerHTML = estado.linhas.map(l => {
            const marcas = l.calculo.detalheEquipe.map(i => `<span class="item-marca-pct">${escaparHtml(i.marca)} ${i.pct}%</span>`).join('') || '-';
            return `
                <tr data-id="${escaparHtml(l.perfil.id)}">
                    <td><strong>${escaparHtml(l.perfil.nome || 'Sem nome')}</strong></td>
                    <td class="col-centro texto-pequeno">${marcas}</td>
                    <td class="col-centro" data-campo="comparecidos">${l.calculo.comparecidos} / ${l.calculo.agendados}</td>
                    <td class="col-centro" data-campo="individual">${moeda(l.calculo.individual)}</td>
                    <td class="col-centro" data-campo="equipe">${moeda(l.calculo.equipe)}</td>
                    <td class="col-centro"><div class="campo-sufixo"><input type="number" class="input-valor-facilitada input-curto" data-campo="nota" min="0" max="100" step="1" value="${l.nota !== null ? l.nota : ''}" placeholder="Aguardando" ${desabilitado}><span class="sufixo-campo">%</span></div></td>
                    <td class="col-centro"><strong data-campo="calculado">${moeda(l.calculo.total)}</strong></td>
                    <td class="col-centro"><div class="celula-pago"><input type="number" class="input-valor-facilitada" data-campo="pago" min="0" step="0.01" value="${l.pago !== null ? l.pago.toFixed(2) : ''}" placeholder="Valor pago" ${desabilitado}>${estado.fechado ? '' : '<button type="button" class="btn-usar-calculado ico ico-check" title="Usar o valor calculado" aria-label="Usar o valor calculado"></button>'}</div></td>
                    <td class="col-centro" data-campo="diferenca">-</td>
                    <td class="col-centro"><input type="text" class="input-valor-facilitada input-largo" data-campo="obs" value="${escaparHtml(l.observacao)}" placeholder="Motivo do ajuste" ${desabilitado}></td>
                </tr>
            `;
        }).join('');

        corpoFechamento.querySelectorAll('tr[data-id]').forEach(tr => {
            atualizarDiferenca(tr);
            tr.querySelectorAll('input').forEach(input => {
                input.addEventListener('input', () => {
                    if (input.dataset.campo === 'nota') recalcularLinha(tr);
                    atualizarDiferenca(tr);
                });
                input.addEventListener('change', () => salvarLinha(tr));
            });
        });

        corpoFechamento.querySelectorAll('.btn-usar-calculado').forEach(botao => {
            botao.addEventListener('click', () => {
                const tr = botao.closest('tr');
                const linha = linhaDoElemento(tr);
                tr.querySelector('[data-campo="pago"]').value = linha.calculo.total.toFixed(2);
                atualizarDiferenca(tr);
                salvarLinha(tr);
            });
        });

        atualizarEstadoFechamento();
        aplicarFiltroPendentes();
    }

    function aplicarFiltroPendentes() {
        const aviso = document.getElementById('aviso-pendentes-fechamento');
        const linhasTabela = corpoFechamento.querySelectorAll('tr[data-id]');
        if (!aviso) return;
        if (!estado.soPendentes) {
            aviso.classList.add('oculto');
            linhasTabela.forEach(tr => tr.classList.remove('oculto'));
            return;
        }
        let visiveis = 0;
        linhasTabela.forEach(tr => {
            const linha = linhaDoElemento(tr);
            const pendente = linha && linha.pago === null && linha.calculo.agendados > 0;
            tr.classList.toggle('oculto', !pendente);
            if (pendente) visiveis++;
        });
        aviso.classList.remove('oculto');
        aviso.innerHTML = `<span>${visiveis === 0 ? 'Nenhum operador pendente neste mês.' : `Mostrando só os ${visiveis} ${visiveis === 1 ? 'operador sem valor pago' : 'operadores sem valor pago'}.`}</span><button type="button" class="btn-abrir-config-metas" id="btn-mostrar-todos-fechamento">Mostrar todos</button>`;
        document.getElementById('btn-mostrar-todos-fechamento').addEventListener('click', () => {
            estado.soPendentes = false;
            aplicarFiltroPendentes();
        });
    }

    function linhaDoElemento(tr) {
        return estado.linhas.find(l => l.perfil.id === tr.dataset.id);
    }

    function recalcularLinha(tr) {
        const linha = linhaDoElemento(tr);
        const nota = numeroOuNulo(tr.querySelector('[data-campo="nota"]').value);
        linha.nota = nota === null ? null : Math.min(100, Math.max(0, nota));
        linha.calculo = calcularLinha(linha.perfil, linha.nota);
        tr.querySelector('[data-campo="calculado"]').textContent = moeda(linha.calculo.total);
    }

    function atualizarDiferenca(tr) {
        const linha = linhaDoElemento(tr);
        linha.pago = numeroOuNulo(tr.querySelector('[data-campo="pago"]').value);
        linha.observacao = tr.querySelector('[data-campo="obs"]').value.trim();
        const celula = tr.querySelector('[data-campo="diferenca"]');
        if (linha.pago === null) {
            celula.textContent = '-';
            celula.className = 'col-centro';
        } else {
            const dif = Math.round((linha.pago - linha.calculo.total) * 100) / 100;
            celula.textContent = moeda(dif);
            celula.className = 'col-centro ' + (dif === 0 ? 'admin-val-sucesso' : (dif > 0 ? 'admin-val-alerta' : 'admin-val-perigo'));
        }
    }

    function atualizarEstadoFechamento() {
        window.definirSeloFechado(estado.fechado);
        btnFecharMes.classList.toggle('oculto', estado.fechado);
        btnPreencher.classList.toggle('oculto', estado.fechado);
        btnLimpar.classList.toggle('oculto', estado.fechado);
        btnReabrirMes.classList.toggle('oculto', !estado.fechado);
        document.getElementById('fechamento-subtitulo').textContent = estado.fechado
            ? 'Mês fechado: valores e agendamentos estão travados.'
            : 'Informe o valor pago a cada operador e feche o mês.';
    }

    function montarPayload(linha) {
        return {
            mes: estado.mes,
            user_id: linha.perfil.id,
            valor_calculado: linha.calculo.total,
            valor_pago: linha.pago,
            nota_monitoria: linha.nota,
            observacao: linha.observacao || null,
            atualizado_por: usuarioAtual.id,
            atualizado_em: new Date().toISOString()
        };
    }

    async function salvarLinha(tr) {
        if (estado.fechado) return;
        const linha = linhaDoElemento(tr);
        const campoPago = tr.querySelector('[data-campo="pago"]');
        const { data, error } = await supabaseClient.from('fechamentos')
            .upsert(montarPayload(linha), { onConflict: 'mes,user_id' }).select('id');
        if (error || !data || data.length === 0) {
            avisar('Não foi possível salvar: ' + (error ? error.message : 'sem permissão.'));
            return;
        }
        campoPago.classList.add('valor-salvo');
        setTimeout(() => campoPago.classList.remove('valor-salvo'), 1500);
    }

    btnPreencher.addEventListener('click', async () => {
        const vazias = estado.linhas.filter(l => l.pago === null);
        if (vazias.length === 0) return;
        corpoFechamento.querySelectorAll('tr[data-id]').forEach(tr => {
            const linha = linhaDoElemento(tr);
            if (linha.pago === null) tr.querySelector('[data-campo="pago"]').value = linha.calculo.total.toFixed(2);
            atualizarDiferenca(tr);
        });
        const payload = estado.linhas.map(montarPayload);
        const { error } = await supabaseClient.from('fechamentos').upsert(payload, { onConflict: 'mes,user_id' });
        if (error) avisar('Não foi possível salvar: ' + error.message);
    });

    btnLimpar.addEventListener('click', async () => {
        if (estado.fechado) return;
        if (!(await confirmar(`Limpar todos os lançamentos de ${estado.mes}? Serão apagados valor pago, nota de monitoria e observação de todos os operadores. Os agendamentos não são alterados.`, { titulo: 'Limpar lançamentos', confirmar: 'Limpar', perigo: true }))) return;
        const { error } = await supabaseClient.from('fechamentos').delete().eq('mes', estado.mes);
        if (error) {
            avisar('Não foi possível limpar: ' + error.message);
            return;
        }
        await carregarFechamento();
    });

    btnFecharMes.addEventListener('click', async () => {
        const backupFeito = window.verificarBackupDoMes ? await window.verificarBackupDoMes(estado.mes) : null;
        if (backupFeito === false) {
            avisar('Antes de fechar o mês, gere o backup dele hoje na aba Backup.');
            return;
        }
        const faltando = estado.linhas.filter(l => l.pago === null && l.calculo.agendados > 0);
        if (faltando.length > 0) {
            avisar(`Informe o valor pago de todos os operadores com agendamentos antes de fechar. Faltam ${faltando.length}: ${faltando.slice(0, 5).map(l => l.perfil.nome).join(', ')}${faltando.length > 5 ? '...' : ''}.`);
            return;
        }
        const semMonitoria = estado.linhas.filter(l => l.nota === null && l.calculo.agendados > 0);
        if (semMonitoria.length > 0) {
            const nomes = semMonitoria.slice(0, 5).map(l => l.perfil.nome).join(', ') + (semMonitoria.length > 5 ? '...' : '');
            const textoMonitoria = `${semMonitoria.length} ${semMonitoria.length === 1 ? 'operador está' : 'operadores estão'} sem nota de monitoria (${nomes}). Sem a nota, o cálculo considera fator 1,00. Fechar mesmo assim? Depois disso ninguém consegue alterar agendamentos, valores ou importar esse mês, até você reabrir.`;
            if (!(await confirmar(textoMonitoria, { titulo: 'Monitoria pendente', confirmar: 'Fechar mesmo assim', cancelar: 'Voltar e preencher', perigo: true }))) return;
        } else if (!(await confirmar(`Fechar ${estado.mes}? Depois disso ninguém consegue alterar agendamentos, valores ou importar esse mês, até você reabrir.`, { titulo: 'Fechar mês', confirmar: 'Fechar mês' }))) return;

        const { error: erroSalvar } = await supabaseClient.from('fechamentos')
            .upsert(estado.linhas.map(montarPayload), { onConflict: 'mes,user_id' });
        if (erroSalvar) {
            avisar('Não foi possível salvar os valores: ' + erroSalvar.message);
            return;
        }
        const { error } = await supabaseClient.from('meses_fechados').insert({ mes: estado.mes, fechado_por: usuarioAtual.id });
        if (error) {
            avisar('Não foi possível fechar o mês: ' + error.message);
            return;
        }
        await carregarFechamento();
    });

    btnReabrirMes.addEventListener('click', async () => {
        if (!(await confirmar(`Reabrir ${estado.mes}? Os agendamentos desse mês voltam a poder ser alterados.`, { titulo: 'Reabrir mês', confirmar: 'Reabrir' }))) return;
        const { data, error } = await supabaseClient.from('meses_fechados').delete().eq('mes', estado.mes).select('mes');
        if (error || !data || data.length === 0) {
            avisar('Não foi possível reabrir o mês: ' + (error ? error.message : 'sem permissão.'));
            return;
        }
        await carregarFechamento();
    });

    btnExportar.addEventListener('click', () => {
        if (!estado.linhas.length) {
            avisar('Não há dados de fechamento para exportar neste mês.');
            return;
        }
        const overlay = abrirModalGenerico('modalExportarFechamento', `
            <div class="modal-card-metas">
                <div class="modal-topo-metas">
                    <h3>Exportar fechamento</h3>
                    <button type="button" class="btn-fechar-modal-metas" data-fechar>&times;</button>
                </div>
                <div class="modal-corpo-metas">
                    <p class="texto-pequeno">Escolha o formato do arquivo do mês ${escaparHtml(window.FechamentoExport.rotuloMes(estado.mes))}.</p>
                    <div class="opcoes-exportacao">
                        <button type="button" class="btn-abrir-config-metas" data-formato="excel">Excel (.xlsx)</button>
                        <button type="button" class="btn-abrir-config-metas" data-formato="pdf">PDF</button>
                        <button type="button" class="btn-abrir-config-metas" data-formato="csv">CSV</button>
                    </div>
                    <p class="texto-pequeno">No PDF, a janela de impressão abre e basta escolher "Salvar como PDF".</p>
                </div>
            </div>`);
        const fechar = () => { overlay.style.display = 'none'; };
        overlay.querySelectorAll('[data-fechar]').forEach(b => b.addEventListener('click', fechar));
        overlay.querySelectorAll('[data-formato]').forEach(botao => botao.addEventListener('click', async () => {
            const formato = botao.dataset.formato;
            const meta = { geradoEm: new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }), usuario: nomeLogado };
            botao.disabled = true;
            try {
                if (formato === 'excel') await window.FechamentoExport.excel(estado, meta);
                else if (formato === 'pdf') window.FechamentoExport.pdf(estado, meta);
                else window.FechamentoExport.csv(estado);
                fechar();
            } catch (e) {
                avisar('Não foi possível gerar o arquivo agora. Verifique a conexão e tente de novo.');
            } finally {
                botao.disabled = false;
            }
        }));
    });

    inputMes.addEventListener('change', carregarFechamento);

    const corpoUsuarios = document.getElementById('corpo-usuarios');
    const buscaUsuarios = document.getElementById('usuarios-busca');
    const rascunhos = new Map();

    function renderizarUsuarios() {
        const termo = buscaUsuarios.value.trim().toLowerCase();
        const lista = perfis.filter(p => !p.inativo_desde && (!termo || (p.nome || '').toLowerCase().includes(termo)));
        document.getElementById('usuarios-contador').textContent = `${lista.length} ${lista.length === 1 ? 'usuário' : 'usuários'}`;

        if (lista.length === 0) {
            corpoUsuarios.innerHTML = linhaVazia(5, 'Nenhum usuário encontrado.', 'Ajuste a busca para ver outros nomes.');
            return;
        }

        corpoUsuarios.innerHTML = lista.map(p => {
            const r = rascunhos.get(p.id) || { nome: p.nome || '', equipe: p.equipe || '', role: p.role || 'consultor', dealer: p.dealer || '' };
            const ehEu = p.id === usuarioAtual.id;
            return `
                <tr data-id="${escaparHtml(p.id)}">
                    <td class="celula-nome-usuario"><input type="text" class="input-valor-facilitada input-nome-usuario" maxlength="80" value="${escaparHtml(r.nome)}" placeholder="Nome">${ehEu ? ' <span class="tag-badge-equipe">Você</span>' : ''}${(r.role !== 'admin' && !r.equipe) ? ' <span class="tag-sem-marcas">Sem marcas</span>' : ''}${p.inativo_desde ? ' <span class="tag-inativo">Inativo</span>' : ''}</td>
                    <td class="col-centro">
                        <input type="text" class="input-valor-facilitada input-dealer-usuario" maxlength="40" value="${escaparHtml(r.dealer)}" placeholder="Código do dealer">
                    </td>
                    <td class="col-centro">
                        <button type="button" class="btn-abrir-config-metas btn-editar-marcas">${escaparHtml(r.equipe || 'Definir marcas')}</button>
                    </td>
                    <td class="col-centro">
                        <select class="select-filtro-status select-funcao" ${ehEu ? 'disabled title="Você não pode alterar a própria função"' : ''}>
                            <option value="consultor" ${r.role !== 'admin' ? 'selected' : ''}>Consultor</option>
                            <option value="admin" ${r.role === 'admin' ? 'selected' : ''}>Administrador</option>
                        </select>
                    </td>
                    <td class="col-centro">
                        <div class="acoes-usuario">
                            <button type="button" class="btn-adicionar-agendamento btn-salvar-usuario">Salvar</button>
                            ${ehEu || p.role === 'admin' ? '' : `<button type="button" class="btn-abrir-config-metas btn-alternar-inativo">${p.inativo_desde ? 'Reativar' : 'Inativar'}</button>`}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        corpoUsuarios.querySelectorAll('tr[data-id]').forEach(tr => {
            const id = tr.dataset.id;
            const perfil = perfisPorId.get(id);
            const rascunho = () => {
                if (!rascunhos.has(id)) rascunhos.set(id, { nome: perfil.nome || '', equipe: perfil.equipe || '', role: perfil.role || 'consultor', dealer: perfil.dealer || '' });
                return rascunhos.get(id);
            };
            tr.querySelector('.input-nome-usuario').addEventListener('input', e => { rascunho().nome = e.target.value; });
            tr.querySelector('.input-dealer-usuario').addEventListener('input', e => { rascunho().dealer = e.target.value; });
            tr.querySelector('.select-funcao').addEventListener('change', e => { rascunho().role = e.target.value; });
            tr.querySelector('.btn-editar-marcas').addEventListener('click', () => {
                abrirModalMarcas(rascunho().equipe, nova => {
                    rascunho().equipe = nova;
                    tr.querySelector('.btn-editar-marcas').textContent = nova || 'Definir marcas';
                });
            });
            const botaoInativo = tr.querySelector('.btn-alternar-inativo');
            if (botaoInativo) {
                botaoInativo.addEventListener('click', async () => {
                    const reativar = !!perfil.inativo_desde;
                    const hoje = new Date();
                    const desde = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`;
                    const texto = reativar
                        ? `Reativar ${perfil.nome}? Ela volta para o Fechamento, ranking e filtros.`
                        : `Inativar ${perfil.nome} a partir de ${desde.slice(5, 7)}/${desde.slice(0, 4)}? Os agendamentos continuam contando nas metas, mas ela sai do Fechamento (a partir desse mês), do ranking, dos filtros e da lista de usuários.`;
                    if (!(await confirmar(texto, { titulo: reativar ? 'Reativar usuário' : 'Inativar usuário', confirmar: reativar ? 'Reativar' : 'Inativar', perigo: !reativar }))) return;
                    const { data, error } = await supabaseClient.from('perfis')
                        .update({ inativo_desde: reativar ? null : desde }).eq('id', id).select('id');
                    if (error || !data || data.length === 0) {
                        avisar('Não foi possível alterar: ' + (error ? error.message : 'sem permissão.') + (error && /inativo_desde/.test(error.message) ? ' Execute o SQL de inativação no Supabase.' : ''));
                        return;
                    }
                    perfil.inativo_desde = reativar ? null : desde;
                    window.carregarPerfisInativos(supabaseClient, true);
                    avisar(reativar ? 'Usuário reativado.' : 'Usuário inativado.', 'sucesso');
                    renderizarUsuarios();
                    if (estado.mes) renderizarFechamento();
                });
            }
            tr.querySelector('.btn-salvar-usuario').addEventListener('click', async () => {
                const r = rascunho();
                const nomeNovo = String(r.nome || '').trim();
                if (!nomeNovo) {
                    avisar('Informe o nome do usuário.');
                    return;
                }
                const mudouRole = r.role !== (perfil.role || 'consultor');
                if (mudouRole && perfil.role === 'admin' && r.role !== 'admin' && perfis.filter(p => p.role === 'admin').length <= 1) {
                    avisar('Não é possível remover o único administrador do sistema.');
                    return;
                }
                if (mudouRole) {
                    const promover = r.role === 'admin';
                    const mensagemFuncao = promover
                        ? `Tornar ${perfil.nome} Administrador? A pessoa poderá importar planilhas, fechar meses, alterar valores, criar e excluir usuários e ver todos os dados.`
                        : `Remover o acesso de Administrador de ${perfil.nome}? O usuário passa a ser Consultor.`;
                    if (!(await confirmar(mensagemFuncao, { titulo: promover ? 'Conceder acesso de administrador' : 'Remover acesso de administrador', confirmar: promover ? 'Conceder acesso' : 'Remover acesso', perigo: true }))) return;
                }
                const dealerNovo = normalizarDealerUsuario(r.dealer);
                const atualizacao = { nome: nomeNovo, equipe: r.equipe || null, role: r.role };
                const colunaDealer = Object.prototype.hasOwnProperty.call(perfil, 'dealer');
                if (colunaDealer) atualizacao.dealer = dealerNovo || null;
                const { data, error } = await supabaseClient.from('perfis')
                    .update(atualizacao).eq('id', id).select('id');
                if (error || !data || data.length === 0) {
                    const duplicado = error && /perfis_dealer_unico|duplicate/i.test(error.message);
                    avisar(duplicado ? `O dealer ${dealerNovo} já está vinculado a outro usuário.` : 'Não foi possível salvar: ' + (error ? error.message : 'sem permissão.'));
                    return;
                }
                if (colunaDealer) perfil.dealer = dealerNovo || null;
                perfil.nome = nomeNovo;
                perfil.equipe = r.equipe || null;
                perfil.role = r.role;
                rascunhos.delete(id);
                const botao = tr.querySelector('.btn-salvar-usuario');
                botao.textContent = 'Salvo';
                setTimeout(() => { botao.textContent = 'Salvar'; }, 1500);
                if (estado.mes) renderizarFechamento();
            });
        });
    }

    buscaUsuarios.addEventListener('input', renderizarUsuarios);

    function normalizarDealerUsuario(texto) {
        return String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/\s+/g, '').trim();
    }

    function gerarSenhaTemporaria() {
        const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
        const bytes = new Uint32Array(10);
        crypto.getRandomValues(bytes);
        return Array.from(bytes, b => letras[b % letras.length]).join('') + '#7';
    }

    async function chamarFuncaoUsuarios(corpo) {
        const { data, error } = await supabaseClient.functions.invoke('hyper-action', { body: corpo });
        if (error) {
            let mensagem = error.message || 'Falha na chamada.';
            try {
                if (error.context && typeof error.context.json === 'function') {
                    const detalhe = await error.context.json();
                    if (detalhe && detalhe.erro) mensagem = detalhe.erro;
                }
            } catch (e) {}
            if (/Failed to send|not found|404|FunctionsFetchError/i.test(mensagem)) mensagem = 'A função hyper-action ainda não foi publicada no Supabase.';
            return { erro: mensagem };
        }
        if (data && data.erro) return { erro: data.erro };
        return { dados: data };
    }

    function abrirModalGenerico(id, html) {
        let overlay = document.getElementById(id);
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = id;
            overlay.className = 'modal-overlay';
            overlay.addEventListener('click', e => { if (e.target === overlay) overlay.style.display = 'none'; });
            document.body.appendChild(overlay);
        }
        overlay.innerHTML = html;
        overlay.style.display = 'flex';
        return overlay;
    }

    function abrirModalNovoUsuario(previa) {
        const dados = { equipe: '' };
        const overlay = abrirModalGenerico('modalNovoUsuario', `
            <div class="modal-card-metas">
                <div class="modal-topo-metas">
                    <h3>Novo usuário</h3>
                    <button type="button" class="btn-fechar-modal-metas" data-fechar>&times;</button>
                </div>
                <div class="modal-corpo-metas">
                    <div class="form-novo-usuario">
                        <div class="campo-form"><span>Nome completo</span><input type="text" id="nu-nome" class="input-busca-padrao" maxlength="80" autocomplete="off"></div>
                        <div class="campo-form"><span>E-mail de acesso</span><input type="email" id="nu-email" class="input-busca-padrao" maxlength="120" autocomplete="off"></div>
                        <div class="campo-form"><span>Código do dealer (opcional)</span><input type="text" id="nu-dealer" class="input-busca-padrao" maxlength="40" placeholder="Como aparece na planilha" autocomplete="off"></div>
                        <div class="campo-form"><span>Função</span><select id="nu-role" class="select-filtro-status select-funcao">
                                <option value="consultor" selected>Consultor</option>
                                <option value="admin">Administrador</option>
                            </select>
                        </div>
                        <div class="campo-form"><span>Marcas</span><button type="button" id="nu-marcas" class="btn-abrir-config-metas">Definir marcas</button></div>
                        <div class="campo-form"><span>Senha temporária</span><input type="text" id="nu-senha" class="input-busca-padrao" maxlength="60" autocomplete="off"></div>
                    </div>
                    <p class="texto-pequeno">Informe a senha temporária ao usuário. Ele pode usá-la para entrar imediatamente.</p>
                </div>
                <div class="modal-rodape-metas">
                    <button type="button" class="btn-cancelar-modal" data-fechar>Cancelar</button>
                    <button type="button" id="nu-criar" class="btn-salvar-modal">Criar usuário</button>
                </div>
            </div>`);
        const fechar = () => { overlay.style.display = 'none'; };
        overlay.querySelectorAll('[data-fechar]').forEach(b => b.addEventListener('click', fechar));
        overlay.querySelector('#nu-senha').value = gerarSenhaTemporaria();
        if (previa && previa.nome) overlay.querySelector('#nu-nome').value = previa.nome;
        if (previa && previa.dealer) overlay.querySelector('#nu-dealer').value = previa.dealer;
        overlay.querySelector('#nu-marcas').addEventListener('click', () => {
            abrirModalMarcas(dados.equipe, nova => {
                dados.equipe = nova;
                overlay.querySelector('#nu-marcas').textContent = nova || 'Definir marcas';
            });
        });
        overlay.querySelector('#nu-criar').addEventListener('click', async () => {
            const botao = overlay.querySelector('#nu-criar');
            const corpo = {
                acao: 'criar',
                nome: overlay.querySelector('#nu-nome').value.trim(),
                email: overlay.querySelector('#nu-email').value.trim(),
                dealer: overlay.querySelector('#nu-dealer').value,
                role: overlay.querySelector('#nu-role').value,
                equipe: dados.equipe,
                senha: overlay.querySelector('#nu-senha').value
            };
            if (!corpo.nome || !corpo.email) { avisar('Informe nome e e-mail.'); return; }
            if (corpo.senha.length < 8) { avisar('A senha temporária precisa ter pelo menos 8 caracteres.'); return; }
            if (corpo.role !== 'admin' && !corpo.equipe) {
                if (!(await confirmar('Este usuário ficará sem marcas e não aparecerá nas metas por marca. Criar mesmo assim?', { titulo: 'Sem marcas', confirmar: 'Criar' }))) return;
            }
            botao.disabled = true;
            botao.textContent = 'Criando...';
            const { erro } = await chamarFuncaoUsuarios(corpo);
            botao.disabled = false;
            botao.textContent = 'Criar usuário';
            if (erro) { avisar(erro); return; }
            fechar();
            await carregarPerfis();
            window.carregarPerfisInativos(supabaseClient, true);
            renderizarUsuarios();
            avisar(`Usuário criado. Senha temporária: ${corpo.senha}`, 'sucesso');
        });
    }

    function abrirModalSenha() {
        const overlay = abrirModalGenerico('modalSenhaUsuario', `
            <div class="modal-card-metas">
                <div class="modal-topo-metas">
                    <h3>Nova senha</h3>
                    <button type="button" class="btn-fechar-modal-metas" data-fechar>&times;</button>
                </div>
                <div class="modal-corpo-metas">
                    <div class="form-novo-usuario">
                        <div class="campo-form"><span>Usuário</span>
                            <select id="ns-usuario" class="select-filtro-status select-funcao">
                                <option value="">Selecione o usuário</option>
                                ${perfis.filter(p => p.nome).map(p => `<option value="${escaparHtml(p.id)}">${escaparHtml(p.nome)}${p.inativo_desde ? ' (inativo)' : ''}</option>`).join('')}
                            </select>
                        </div>
                        <div class="campo-form"><span>Nova senha temporária</span><input type="text" id="ns-senha" class="input-busca-padrao" maxlength="60" autocomplete="off"></div>
                    </div>
                    <p class="texto-pequeno">A senha atual deixa de funcionar assim que você confirmar.</p>
                </div>
                <div class="modal-rodape-metas">
                    <button type="button" class="btn-cancelar-modal" data-fechar>Cancelar</button>
                    <button type="button" id="ns-salvar" class="btn-salvar-modal">Definir senha</button>
                </div>
            </div>`);
        const fechar = () => { overlay.style.display = 'none'; };
        overlay.querySelectorAll('[data-fechar]').forEach(b => b.addEventListener('click', fechar));
        overlay.querySelector('#ns-senha').value = gerarSenhaTemporaria();
        overlay.querySelector('#ns-salvar').addEventListener('click', async () => {
            const senha = overlay.querySelector('#ns-senha').value;
            const alvo = overlay.querySelector('#ns-usuario').value;
            if (!alvo) { avisar('Selecione o usuário.'); return; }
            if (senha.length < 8) { avisar('A senha precisa ter pelo menos 8 caracteres.'); return; }
            const botao = overlay.querySelector('#ns-salvar');
            botao.disabled = true;
            const { erro } = await chamarFuncaoUsuarios({ acao: 'senha', user_id: alvo, senha });
            botao.disabled = false;
            if (erro) { avisar(erro); return; }
            fechar();
            avisar(`Senha definida. Nova senha temporária: ${senha}`, 'sucesso');
        });
    }

    document.getElementById('btn-novo-usuario').addEventListener('click', () => abrirModalNovoUsuario());
    document.getElementById('btn-senha-usuario').addEventListener('click', abrirModalSenha);

    const corpoInativos = document.getElementById('corpo-inativos');
    const campoDealerInativo = document.getElementById('inativo-dealer');
    const campoApelidoInativo = document.getElementById('inativo-apelido');

    function normalizarDealer(texto) {
        return String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
    }

    async function carregarInativosAdmin() {
        corpoInativos.innerHTML = linhaCarregando(5, 3);
        try {
            const { data: lista, error } = await supabaseClient.from('operadores_inativos').select('id, dealer, apelido').order('dealer', { ascending: true });
            if (error) throw error;
            const linhas = await buscarTodasLinhas(() => supabaseClient.from('agendamentos').select('id, inativo_id, status, data_revisao, marca').not('inativo_id', 'is', null).order('id', { ascending: true }));
            const contagem = new Map();
            const detalhes = new Map();
            linhas.forEach(l => {
                if (!detalhes.has(l.inativo_id)) detalhes.set(l.inativo_id, []);
                detalhes.get(l.inativo_id).push(l);
                const c = contagem.get(l.inativo_id) || { total: 0, comp: 0 };
                c.total++;
                if (l.status === 'compareceu') c.comp++;
                contagem.set(l.inativo_id, c);
            });
            const perfisInativos = perfis.filter(p => p.inativo_desde);
            const contagemPerfis = new Map();
            if (perfisInativos.length > 0) {
                const ids = perfisInativos.map(p => p.id);
                const linhasPerfis = await buscarTodasLinhas(() => supabaseClient.from('agendamentos').select('id, user_id, status, data_revisao, marca').in('user_id', ids).order('id', { ascending: true }));
                linhasPerfis.forEach(l => {
                    if (!detalhes.has(l.user_id)) detalhes.set(l.user_id, []);
                    detalhes.get(l.user_id).push(l);
                    const c = contagemPerfis.get(l.user_id) || { total: 0, comp: 0 };
                    c.total++;
                    if (l.status === 'compareceu') c.comp++;
                    contagemPerfis.set(l.user_id, c);
                });
            }
            const totalInativos = lista.length + perfisInativos.length;
            document.getElementById('inativos-contador').textContent = `${totalInativos} ${totalInativos === 1 ? 'inativo' : 'inativos'}`;
            if (totalInativos === 0) {
                corpoInativos.innerHTML = linhaVazia(5, 'Nenhum inativo cadastrado.', 'Inative um usuário na aba Usuários ou cadastre o código do dealer acima.');
                return;
            }
            const linhasPerfilHtml = perfisInativos.map(p => {
                const c = contagemPerfis.get(p.id) || { total: 0, comp: 0 };
                const desde = String(p.inativo_desde).slice(0, 7).split('-').reverse().join('/');
                return `
                    <tr data-perfil="${escaparHtml(p.id)}">
                        <td><strong>${escaparHtml(p.nome || 'Sem nome')}</strong> <span class="tag-inativo">Inativo</span></td>
                        <td>Usuário inativado desde ${escaparHtml(desde)}</td>
                        <td class="col-centro">${c.total}</td>
                        <td class="col-centro">${c.comp}</td>
                        <td class="col-centro"><div class="acoes-usuario"><button type="button" class="btn-abrir-config-metas btn-detalhes-inativo">Ver detalhes</button><button type="button" class="btn-abrir-config-metas btn-reativar-perfil">Reativar</button><button type="button" class="btn-abrir-config-metas ico ico-lixeira btn-excluir-inativo btn-excluir-perfil" title="Excluir usuário" aria-label="Excluir usuário"></button></div></td>
                    </tr>`;
            }).join('');
            corpoInativos.innerHTML = linhasPerfilHtml + lista.map(i => {
                const c = contagem.get(i.id) || { total: 0, comp: 0 };
                return `
                    <tr data-id="${escaparHtml(i.id)}">
                        <td><strong>${escaparHtml(i.dealer)}</strong> <span class="tag-inativo">Inativo</span></td>
                        <td><input type="text" class="input-valor-facilitada input-largo input-apelido-inativo" maxlength="60" value="${escaparHtml(i.apelido || '')}" placeholder="Apelido (opcional)"></td>
                        <td class="col-centro">${c.total}</td>
                        <td class="col-centro">${c.comp}</td>
                        <td class="col-centro">
                            <div class="acoes-usuario">
                                <button type="button" class="btn-abrir-config-metas btn-detalhes-inativo">Ver detalhes</button>
                                <button type="button" class="btn-abrir-config-metas btn-salvar-inativo">Salvar</button>
                                <button type="button" class="btn-abrir-config-metas ico ico-lixeira btn-excluir-inativo btn-remover-inativo" title="Excluir código" aria-label="Excluir código"></button>
                            </div>
                        </td>
                    </tr>`;
            }).join('');
            corpoInativos.querySelectorAll('tr[data-perfil], tr[data-id]').forEach(tr => {
                const chave = tr.dataset.perfil || tr.dataset.id;
                tr.querySelector('.btn-detalhes-inativo').addEventListener('click', () => {
                    abrirDetalhesInativo(tr.querySelector('strong').textContent, detalhes.get(chave) || []);
                });
            });
            corpoInativos.querySelectorAll('tr[data-perfil]').forEach(tr => {
                tr.querySelector('.btn-excluir-perfil').addEventListener('click', async () => {
                    const perfil = perfisPorId.get(tr.dataset.perfil);
                    const qtd = (contagemPerfis.get(perfil.id) || { total: 0 }).total;
                    if (qtd > 0) {
                        avisar(`${perfil.nome} possui ${qtd} agendamento(s) e não pode ser excluído. Mantenha como inativo para que eles continuem contando nas metas.`);
                        return;
                    }
                    if (!(await confirmar(`Excluir ${perfil.nome} definitivamente? O login e o perfil serão apagados e isso não pode ser desfeito.`, { titulo: 'Excluir usuário', confirmar: 'Excluir', perigo: true }))) return;
                    const { erro } = await chamarFuncaoUsuarios({ acao: 'excluir', user_id: perfil.id });
                    if (erro) { avisar(erro); return; }
                    await carregarPerfis();
                    window.carregarPerfisInativos(supabaseClient, true);
                    avisar('Usuário excluído.', 'sucesso');
                    renderizarUsuarios();
                    carregarInativosAdmin();
                });
                tr.querySelector('.btn-reativar-perfil').addEventListener('click', async () => {
                    const perfil = perfisPorId.get(tr.dataset.perfil);
                    if (!(await confirmar(`Reativar ${perfil.nome}? Ela volta para o Fechamento, ranking e filtros.`, { titulo: 'Reativar usuário', confirmar: 'Reativar' }))) return;
                    const { data, error: erro } = await supabaseClient.from('perfis').update({ inativo_desde: null }).eq('id', perfil.id).select('id');
                    if (erro || !data || data.length === 0) {
                        avisar('Não foi possível reativar: ' + (erro ? erro.message : 'sem permissão.'));
                        return;
                    }
                    perfil.inativo_desde = null;
                    window.carregarPerfisInativos(supabaseClient, true);
                    avisar('Usuário reativado.', 'sucesso');
                    renderizarUsuarios();
                    if (estado.mes) renderizarFechamento();
                    carregarInativosAdmin();
                });
            });
            corpoInativos.querySelectorAll('tr[data-id]').forEach(tr => {
                const id = tr.dataset.id;
                tr.querySelector('.btn-salvar-inativo').addEventListener('click', async () => {
                    const apelido = tr.querySelector('.input-apelido-inativo').value.trim();
                    const { data, error: erro } = await supabaseClient.from('operadores_inativos').update({ apelido: apelido || null }).eq('id', id).select('id');
                    if (erro || !data || data.length === 0) {
                        avisar('Não foi possível salvar: ' + (erro ? erro.message : 'sem permissão.'));
                        return;
                    }
                    window.carregarInativos(supabaseClient, true);
                    const botao = tr.querySelector('.btn-salvar-inativo');
                    botao.textContent = 'Salvo';
                    setTimeout(() => { botao.textContent = 'Salvar'; }, 1500);
                });
                tr.querySelector('.btn-remover-inativo').addEventListener('click', async () => {
                    const dealer = tr.querySelector('strong').textContent;
                    if (!(await confirmar(`Remover ${dealer} da lista de inativos? Só é possível se não houver agendamentos vinculados a ele.`, { titulo: 'Remover inativo', confirmar: 'Remover', perigo: true }))) return;
                    const { data, error: erro } = await supabaseClient.from('operadores_inativos').delete().eq('id', id).select('id');
                    if (erro) {
                        avisar(/foreign key|violates/i.test(erro.message) ? 'Não foi possível remover: existem agendamentos vinculados a este código.' : 'Não foi possível remover: ' + erro.message);
                        return;
                    }
                    if (!data || data.length === 0) {
                        avisar('Não foi possível remover: sem permissão.');
                        return;
                    }
                    window.carregarInativos(supabaseClient, true);
                    carregarInativosAdmin();
                });
            });
        } catch (e) {
            corpoInativos.innerHTML = `<tr><td colspan="5" class="celula-vazia-mensagem">Não foi possível carregar os inativos. Execute o script SQL dos inativos no Supabase. (${escaparHtml(e.message || e)})</td></tr>`;
        }
    }

    document.getElementById('btn-adicionar-inativo').addEventListener('click', async () => {
        const dealer = normalizarDealer(campoDealerInativo.value);
        const apelido = campoApelidoInativo.value.trim();
        if (dealer.length < 3) {
            avisar('Informe o código do dealer.');
            return;
        }
        const { error } = await supabaseClient.from('operadores_inativos').insert({ dealer, apelido: apelido || null });
        if (error) {
            avisar(/duplicate|unique/i.test(error.message) ? 'Este código já está cadastrado.' : 'Não foi possível cadastrar: ' + error.message);
            return;
        }
        campoDealerInativo.value = '';
        campoApelidoInativo.value = '';
        avisar('Inativo cadastrado. Importe a planilha novamente para incluir os agendamentos dele.', 'sucesso');
        window.carregarInativos(supabaseClient, true);
        carregarInativosAdmin();
    });

    function abrirDetalhesInativo(titulo, linhas) {
        let overlay = document.getElementById('modalDetalhesInativo');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'modalDetalhesInativo';
            overlay.className = 'modal-overlay';
            overlay.addEventListener('click', e => { if (e.target === overlay) overlay.style.display = 'none'; });
            document.body.appendChild(overlay);
        }
        const hoje = new Date();
        const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
        const meses = new Map();
        linhas.forEach(l => {
            const mes = (l.data_revisao || '').slice(0, 7) || 'sem-data';
            if (!meses.has(mes)) meses.set(mes, { total: 0, comp: 0, falt: 0, pend: 0, marcas: new Map() });
            const m = meses.get(mes);
            m.total++;
            if (l.status === 'compareceu') m.comp++;
            else if (l.status === 'faltou') m.falt++;
            else m.pend++;
            const marca = l.marca || 'Sem marca';
            m.marcas.set(marca, (m.marcas.get(marca) || 0) + 1);
        });
        const rotuloMes = mes => mes === 'sem-data' ? 'Sem data' : mes.split('-').reverse().join('/');
        const ordenados = [...meses.entries()].sort((x, y) => x[0].localeCompare(y[0]));
        const soma = { total: 0, comp: 0, falt: 0, pend: 0 };
        ordenados.forEach(([, m]) => { soma.total += m.total; soma.comp += m.comp; soma.falt += m.falt; soma.pend += m.pend; });
        const corpo = ordenados.length === 0
            ? linhaVazia(6, 'Nenhum agendamento vinculado.', 'Importe a planilha para incluir os agendamentos deste inativo.')
            : ordenados.map(([mes, m]) => `
                <tr>
                    <td><strong>${escaparHtml(rotuloMes(mes))}</strong>${mes > mesAtual ? ' <span class="tag-inativo">Futuro</span>' : ''}</td>
                    <td class="col-centro">${m.total}</td>
                    <td class="col-centro">${m.comp}</td>
                    <td class="col-centro">${m.falt}</td>
                    <td class="col-centro">${m.pend}</td>
                    <td>${[...m.marcas.entries()].map(([marca, n]) => `${escaparHtml(marca)} ${n}`).join(' · ')}</td>
                </tr>`).join('') + `
                <tr>
                    <td><strong>Total</strong></td>
                    <td class="col-centro"><strong>${soma.total}</strong></td>
                    <td class="col-centro"><strong>${soma.comp}</strong></td>
                    <td class="col-centro"><strong>${soma.falt}</strong></td>
                    <td class="col-centro"><strong>${soma.pend}</strong></td>
                    <td></td>
                </tr>`;
        overlay.innerHTML = `
            <div class="modal-card-metas modal-card-inativo">
                <div class="modal-topo-metas">
                    <h3>Detalhes de ${escaparHtml(titulo)}</h3>
                    <button type="button" id="btnDetInativoFechar" class="btn-fechar-modal-metas">&times;</button>
                </div>
                <div class="modal-corpo-metas">
                    <p class="lista-inativos-aviso">Agendamentos por mês de revisão. A coluna Pendentes mostra o que ainda deve entrar na meta.</p>
                    <div class="tabela-container">
                        <table class="tabela-admin">
                            <thead>
                                <tr>
                                    <th>MÊS</th>
                                    <th class="col-centro">AGENDAMENTOS</th>
                                    <th class="col-centro">COMPARECERAM</th>
                                    <th class="col-centro">NO-SHOW</th>
                                    <th class="col-centro">PENDENTES</th>
                                    <th>MARCAS</th>
                                </tr>
                            </thead>
                            <tbody>${corpo}</tbody>
                        </table>
                    </div>
                </div>
                <div class="modal-rodape-metas">
                    <button type="button" id="btnDetInativoOk" class="btn-cancelar-modal">Fechar</button>
                </div>
            </div>`;
        const fechar = () => { overlay.style.display = 'none'; };
        overlay.querySelector('#btnDetInativoFechar').addEventListener('click', fechar);
        overlay.querySelector('#btnDetInativoOk').addEventListener('click', fechar);
        overlay.style.display = 'flex';
    }

    function abrirModalMarcas(equipeAtual, aoConfirmar) {
        let overlay = document.getElementById('modalMarcas');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'modalMarcas';
            overlay.className = 'modal-overlay';
            overlay.addEventListener('click', e => { if (e.target === overlay) overlay.style.display = 'none'; });
            document.body.appendChild(overlay);
        }
        const selecionadas = new Set(Bonus.listarMarcas(equipeAtual));
        const extras = [...selecionadas].filter(m => !MARCAS.includes(m));
        const todas = [...MARCAS, ...extras];

        overlay.innerHTML = `
            <div class="modal-card-metas">
                <div class="modal-topo-metas">
                    <h3>Marcas do operador</h3>
                    <button type="button" id="btnMarcasFechar" class="btn-fechar-modal-metas">&times;</button>
                </div>
                <div class="modal-corpo-metas">
                    <div class="grade-marcas">
                        ${todas.map(m => `<label class="item-marca"><input type="checkbox" value="${escaparHtml(m)}" ${selecionadas.has(m) ? 'checked' : ''}> ${escaparHtml(m)}</label>`).join('')}
                    </div>
                </div>
                <div class="modal-rodape-metas">
                    <button type="button" id="btnMarcasCancelar" class="btn-cancelar-modal">Cancelar</button>
                    <button type="button" id="btnMarcasOk" class="btn-salvar-modal">Aplicar</button>
                </div>
            </div>
        `;
        const fechar = () => { overlay.style.display = 'none'; };
        overlay.querySelector('#btnMarcasFechar').addEventListener('click', fechar);
        overlay.querySelector('#btnMarcasCancelar').addEventListener('click', fechar);
        overlay.querySelector('#btnMarcasOk').addEventListener('click', () => {
            const marcadas = [...overlay.querySelectorAll('input:checked')].map(i => i.value);
            aoConfirmar(marcadas.join(' | '));
            fechar();
        });
        overlay.style.display = 'flex';
    }

    const corpoHistorico = document.getElementById('corpo-historico');
    const filtroTabela = document.getElementById('historico-tabela');
    const btnHistoricoMais = document.getElementById('btn-historico-mais');
    let historicoCarregado = false;
    let historicoItens = [];
    let historicoTemMais = false;

    const ROTULO_AREA = { agendamentos: 'Agendamento', perfis: 'Usuário', fechamentos: 'Fechamento', meses_fechados: 'Mês fechado', metas_mensais: 'Meta', divergencias: 'Divergência', importacoes: 'Importação' };
    const ROTULO_ACAO = { INSERT: 'Inclusão', UPDATE: 'Alteração', DELETE: 'Exclusão', IMPORTACAO: 'Importação' };
    const ROTULO_CAMPO = { status: 'status', valor_unitario: 'valor', revisao: 'revisão', observacao: 'observação', data_revisao: 'data da revisão', data_contato: 'data do contato', placa: 'placa', os: 'O.S', marca: 'marca', user_id: 'operador', equipe: 'marcas', role: 'função', nome: 'nome', valor_pago: 'valor pago', valor_calculado: 'valor calculado', nota_monitoria: 'monitoria', meta_valor: 'meta', resposta: 'resposta', descricao: 'descrição', tipo: 'tipo' };
    const IGNORAR = ['resolvido_em', 'resolvido_por', 'atualizado_em', 'atualizado_por', 'importacao_id', 'id', 'criado_em'];

    function valorLegivel(campo, valor) {
        if (valor === null || valor === undefined || valor === '') return 'vazio';
        if (campo === 'user_id') return nomeDe(valor);
        return String(valor);
    }

    function descreverRegistro(item) {
        const d = item.dados_depois || item.dados_antes || {};
        if (item.tabela === 'agendamentos') return `${d.placa || 'Sem placa'}${d.os ? ' · O.S ' + d.os : ''}`;
        if (item.tabela === 'importacoes') return d.arquivo || 'Planilha';
        if (item.tabela === 'perfis') return d.nome || 'Usuário';
        if (item.tabela === 'fechamentos') return `${nomeDe(d.user_id)} · ${d.mes || ''}`;
        if (item.tabela === 'meses_fechados') return d.mes || '';
        if (item.tabela === 'divergencias') return `${d.tipo || ''} · ${nomeDe(d.user_id)}`;
        if (item.tabela === 'metas_mensais') return `${d.equipe || ''} · ${d.mes_referencia || ''}`;
        return item.registro_id || '';
    }

    function descreverMudanca(item) {
        if (item.tabela === 'importacoes') {
            const i = item.dados_depois || {};
            return `${i.periodo || ''}; ${i.total ?? 0} agendamentos (${i.comparecidos ?? 0} comparecidos, ${i.no_show ?? 0} no-show); marcas: ${i.marcas || '-'}`;
        }
        const antes = item.dados_antes || {};
        const depois = item.dados_depois || {};
        if (item.operacao === 'UPDATE') {
            const partes = Object.keys(depois)
                .filter(k => !IGNORAR.includes(k) && JSON.stringify(antes[k]) !== JSON.stringify(depois[k]))
                .map(k => `${ROTULO_CAMPO[k] || k}: ${valorLegivel(k, antes[k])} → ${valorLegivel(k, depois[k])}`);
            return partes.join('; ') || 'Sem alteração relevante';
        }
        const base = item.operacao === 'INSERT' ? depois : antes;
        const partes = Object.keys(base)
            .filter(k => !IGNORAR.includes(k) && base[k] !== null && base[k] !== '' && k !== 'evento')
            .slice(0, 6)
            .map(k => `${ROTULO_CAMPO[k] || k}: ${valorLegivel(k, base[k])}`);
        return partes.join('; ');
    }

    const LIMITE_HISTORICO_CONSULTA = 1000;
    const POR_PAGINA_HISTORICO = 15;
    const filtroMesHistorico = document.getElementById('historico-mes');
    const btnHistoricoAnterior = document.getElementById('btn-historico-anterior');
    let paginaHistorico = 1;

    if (filtroMesHistorico && !filtroMesHistorico.value) {
        const hoje = new Date();
        filtroMesHistorico.value = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
    }

    async function carregarHistorico(reiniciar) {
        paginaHistorico = 1;
        historicoItens = [];
        corpoHistorico.innerHTML = linhaCarregando(8);
        let consulta = supabaseClient.from('historico_alteracoes').select('*')
            .order('criado_em', { ascending: false })
            .limit(LIMITE_HISTORICO_CONSULTA);
        if (filtroTabela.value) consulta = consulta.eq('tabela', filtroTabela.value);
        const mesEscolhido = filtroMesHistorico ? filtroMesHistorico.value : '';
        if (/^\d{4}-\d{2}$/.test(mesEscolhido)) {
            const [ano, mes] = mesEscolhido.split('-').map(Number);
            const inicio = new Date(ano, mes - 1, 1).toISOString();
            const fim = new Date(ano, mes, 1).toISOString();
            consulta = consulta.gte('criado_em', inicio).lt('criado_em', fim);
        }

        const { data, error } = await consulta;
        if (error) {
            corpoHistorico.innerHTML = `<tr><td colspan="8" class="celula-vazia-mensagem">Não foi possível carregar o histórico. Execute o script SQL do fechamento no Supabase. (${escaparHtml(error.message)})</td></tr>`;
            return;
        }
        historicoCarregado = true;
        historicoItens = data || [];
        historicoTemMais = historicoItens.length === LIMITE_HISTORICO_CONSULTA;
        renderizarHistorico();
    }

    function renderizarHistorico() {
        const todas = historicoItens.map(item => ({
            item,
            registro: descreverRegistro(item),
            mudanca: descreverMudanca(item),
            quem: item.usuario_id ? nomeDe(item.usuario_id) : 'Sistema'
        }));

        const totalPaginas = Math.max(1, Math.ceil(todas.length / POR_PAGINA_HISTORICO));
        if (paginaHistorico > totalPaginas) paginaHistorico = totalPaginas;
        const inicioPagina = (paginaHistorico - 1) * POR_PAGINA_HISTORICO;
        const linhas = todas.slice(inicioPagina, inicioPagina + POR_PAGINA_HISTORICO);

        document.getElementById('historico-contador').textContent = `${todas.length} ${todas.length === 1 ? 'registro' : 'registros'}`;
        document.getElementById('historico-info').textContent = todas.length === 0
            ? (historicoTemMais ? `Exibindo os ${LIMITE_HISTORICO_CONSULTA} mais recentes` : '')
            : `Mostrando ${inicioPagina + 1}–${inicioPagina + linhas.length} de ${todas.length}${historicoTemMais ? ' (limite de ' + LIMITE_HISTORICO_CONSULTA + ' mais recentes)' : ''}`;
        document.getElementById('historico-indicador').textContent = `${paginaHistorico} de ${totalPaginas}`;
        btnHistoricoAnterior.disabled = paginaHistorico <= 1;
        btnHistoricoMais.disabled = paginaHistorico >= totalPaginas;
        linhasHistoricoVisiveis = linhas.map(l => String(l.item.id));

        if (linhas.length === 0) {
            corpoHistorico.innerHTML = linhaVazia(8, 'Nenhuma alteração registrada.', 'As alterações feitas no sistema aparecem aqui.');
            sincronizarSelecaoHistorico();
            return;
        }

        corpoHistorico.innerHTML = linhas.map(l => {
            const data = new Date(l.item.criado_em);
            const quando = data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            return `
                <tr>
                    <td class="col-selecao"><input type="checkbox" class="chk-historico" data-id="${l.item.id}" aria-label="Selecionar registro" ${historicoSelecionados.has(String(l.item.id)) ? 'checked' : ''}></td>
                    <td class="texto-pequeno">${quando}</td>
                    <td><strong>${escaparHtml(l.quem)}</strong></td>
                    <td class="col-centro">${escaparHtml(ROTULO_AREA[l.item.tabela] || l.item.tabela)}</td>
                    <td class="col-centro">${escaparHtml(ROTULO_ACAO[l.item.operacao] || l.item.operacao)}</td>
                    <td>${escaparHtml(l.registro)}</td>
                    <td class="texto-pequeno">${escaparHtml(l.mudanca)}</td>
                </tr>
            `;
        }).join('');
        sincronizarSelecaoHistorico();
    }

    function sincronizarSelecaoHistorico() {
        const botao = document.getElementById('btn-historico-excluir');
        botao.classList.toggle('oculto', historicoSelecionados.size === 0);
        botao.textContent = `Excluir selecionados (${historicoSelecionados.size})`;
        const todos = document.getElementById('historico-selecionar-todos');
        const marcados = linhasHistoricoVisiveis.filter(id => historicoSelecionados.has(id)).length;
        todos.checked = linhasHistoricoVisiveis.length > 0 && marcados === linhasHistoricoVisiveis.length;
        todos.indeterminate = marcados > 0 && marcados < linhasHistoricoVisiveis.length;
    }

    corpoHistorico.addEventListener('change', (e) => {
        if (!e.target.classList.contains('chk-historico')) return;
        if (e.target.checked) historicoSelecionados.add(e.target.dataset.id);
        else historicoSelecionados.delete(e.target.dataset.id);
        sincronizarSelecaoHistorico();
    });

    document.getElementById('historico-selecionar-todos').addEventListener('change', (e) => {
        linhasHistoricoVisiveis.forEach(id => {
            if (e.target.checked) historicoSelecionados.add(id);
            else historicoSelecionados.delete(id);
        });
        corpoHistorico.querySelectorAll('.chk-historico').forEach(c => { c.checked = e.target.checked; });
        sincronizarSelecaoHistorico();
    });

    const btnSelecionarHistorico = document.getElementById('btn-historico-selecionar');

    function definirModoSelecaoHistorico(ativo) {
        corpoHistorico.closest('table').classList.toggle('modo-selecao', ativo);
        btnSelecionarHistorico.classList.toggle('ativo', ativo);
        btnSelecionarHistorico.textContent = ativo ? 'Cancelar seleção' : 'Selecionar';
        if (!ativo) {
            historicoSelecionados.clear();
            corpoHistorico.querySelectorAll('.chk-historico').forEach(c => { c.checked = false; });
        }
        sincronizarSelecaoHistorico();
    }

    btnSelecionarHistorico.addEventListener('click', () => {
        definirModoSelecaoHistorico(!corpoHistorico.closest('table').classList.contains('modo-selecao'));
    });

    async function concluirExclusaoHistorico(erro, quantidade, esperado) {
        historicoSelecionados.clear();
        definirModoSelecaoHistorico(false);
        if (erro) avisar('Não foi possível excluir: ' + erro.message);
        else if (!quantidade && esperado) avisar('Não foi possível excluir: sem permissão. Execute o SQL de limpeza do histórico no Supabase.');
        else avisar(quantidade === 1 ? 'Registro excluído.' : `${quantidade} registros excluídos.`, 'sucesso');
        await carregarHistorico(true);
    }

    document.getElementById('btn-historico-excluir').addEventListener('click', async () => {
        const ids = Array.from(historicoSelecionados);
        if (ids.length === 0) return;
        const texto = ids.length === 1 ? 'Excluir o registro selecionado do histórico?' : `Excluir os ${ids.length} registros selecionados do histórico?`;
        if (!(await confirmar(texto + ' Esta ação não pode ser desfeita.', { titulo: 'Excluir do histórico', confirmar: 'Excluir', perigo: true }))) return;
        ocupado(true);
        let total = 0;
        let falha = null;
        for (let i = 0; i < ids.length; i += 100) {
            const { data, error } = await supabaseClient.from('historico_alteracoes').delete().in('id', ids.slice(i, i + 100)).select('id');
            if (error) { falha = error; break; }
            total += (data || []).length;
        }
        ocupado(false);
        await concluirExclusaoHistorico(falha, total, ids.length);
    });

    document.getElementById('btn-historico-apagar-tudo').addEventListener('click', async () => {
        if (!(await confirmar('Apagar TODO o histórico de alterações, de todas as áreas? Esta ação não pode ser desfeita.', { titulo: 'Apagar todo o histórico', confirmar: 'Apagar tudo', perigo: true }))) return;
        ocupado(true);
        const { error, count } = await supabaseClient.from('historico_alteracoes').delete({ count: 'exact' }).gte('id', 0);
        ocupado(false);
        await concluirExclusaoHistorico(error, count || 0, historicoItens.length);
    });

    if (filtroMesHistorico) filtroMesHistorico.addEventListener('change', () => carregarHistorico(true));
    btnHistoricoAnterior.addEventListener('click', () => { paginaHistorico--; renderizarHistorico(); });
    filtroTabela.addEventListener('change', () => carregarHistorico(true));
    btnHistoricoMais.addEventListener('click', () => { paginaHistorico++; renderizarHistorico(); });

    if (typeof window.montarBackup === 'function') {
        moduloBackup = window.montarBackup({ supabaseClient, usuarioAtual, getPerfis: () => perfis, buscarTodasLinhas, escaparHtml, aoRestaurar: () => { if (estado.mes) carregarFechamento(); } });
    }

    try {
        await carregarPerfis();
        renderizarUsuarios();
        await carregarFechamento();
    } catch (e) {
        corpoFechamento.innerHTML = `<tr><td colspan="10" class="celula-vazia-mensagem">Não foi possível carregar: ${escaparHtml(e.message || e)}</td></tr>`;
    }
    const abaInicial = window.location.hash.replace('#', '');
    if (abas[abaInicial]) trocarAba(abaInicial);
    const parametrosPagina = new URLSearchParams(window.location.search);
    const novoNome = (parametrosPagina.get('novoUsuario') || '').trim();
    if (novoNome) {
        trocarAba('usuarios');
        abrirModalNovoUsuario({ nome: novoNome, dealer: (parametrosPagina.get('dealer') || '').trim() });
        window.history.replaceState(null, '', window.location.pathname + '#usuarios');
    }
    window.mostrarConteudo();
});
