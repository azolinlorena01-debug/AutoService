document.addEventListener('DOMContentLoaded', async function() {
    // Conexão ao Supabase
    const SUPABASE_URL = 'https://potvtrepcoswvzmkewic.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_iMbay5YOnrrehpqI9qU7HA_vMapr-DY';

    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    // Elementos do Ecrã
    const formulario = document.querySelector('.formulario-agendamento');
    const corpoTabela = document.querySelector('tbody');
    const contadorRegistros = document.querySelector('.contador-registros');
    const valorConfirmadoEl = document.querySelector('.bonus-confirmado');
    const valorPrevistoEl = document.querySelector('.bonus-previsto');
    const detalheConfirmadoEl = document.querySelector('.card:first-child .card-detalhe');
    const filtroMes = document.getElementById('filtro-mes');
    const inputDataContato = document.getElementById('data-contato');
    const thConsultor = document.getElementById('th-consultor');

    // Verificar se o utilizador tem sessão iniciada
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session || !session.user) {
        window.location.href = 'login.html';
        return;
    }

    const usuarioAtual = session.user;

    // Consulta se o utilizador logado tem cargo de Administrador
    let isAdmin = false;
    try {
        const { data: perfil } = await supabaseClient
            .from('perfis')
            .select('role')
            .eq('id', usuarioAtual.id)
            .maybeSingle();

        if (perfil && perfil.role === 'admin') {
            isAdmin = true;
        }
    } catch (e) {
        console.warn('Não foi possível verificar perfil admin:', e);
    }

    // Se for Admin, exibe a coluna extra
    if (isAdmin && thConsultor) {
        thConsultor.style.display = '';
    }

    // Monta o cabeçalho com indicador se for Admin
    const areaAuth = document.getElementById('area-autenticacao');
    if (areaAuth && usuarioAtual) {
        let nomeExibicao = 'Usuário';

        const metaNome = usuarioAtual.user_metadata?.nome_completo;
        if (typeof metaNome === 'string' && metaNome.trim().length > 0) {
            nomeExibicao = metaNome.trim().split(' ')[0];
        } else if (usuarioAtual.email) {
            const prefixoEmail = usuarioAtual.email.split('@')[0];
            const apenasLetras = prefixoEmail.replace(/[0-9]/g, '');
            nomeExibicao = apenasLetras.length > 0 
                ? apenasLetras.charAt(0).toUpperCase() + apenasLetras.slice(1) 
                : prefixoEmail;
        }

        const tagAdmin = isAdmin 
            ? ' <span style="background-color: #dbeafe; color: #1d4ed8; font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 9999px; margin-left: 4px;">Admin</span>' 
            : '';

        areaAuth.innerHTML = `
            <span class="usuario-logado-tag">Olá, <strong>${nomeExibicao}</strong>${tagAdmin} 👋</span>
            <button id="btn-sair-header" class="botao-sair-header">Sair</button>
        `;

        const btnSair = document.getElementById('btn-sair-header');
        if (btnSair) {
            btnSair.addEventListener('click', async () => {
                await supabaseClient.auth.signOut();
                window.location.href = 'login.html';
            });
        }
    }

    // Configurar datas
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = String(hoje.getMonth() + 1).padStart(2, '0');
    const diaAtual = String(hoje.getDate()).padStart(2, '0');

    if (inputDataContato) {
        inputDataContato.value = `${anoAtual}-${mesAtual}-${diaAtual}`;
    }

    if (filtroMes) {
        filtroMes.value = `${anoAtual}-${mesAtual}`;
    }

    // Regras de bonificação
    function obterValorPorRevisao(numRevisao) {
        const num = parseInt(numRevisao, 10);
        if (num >= 1 && num <= 4) return 2;
        if (num >= 5 && num <= 7) return 6;
        return 10;
    }

    function formatarDataBR(dataISO) {
        if (!dataISO) return '-';
        const partes = dataISO.split('-');
        return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : dataISO;
    }

    // Consultar dados do Supabase
    async function renderizarTabela() {
        const mesSelecionado = filtroMes.value;
        const totalColunas = isAdmin ? 10 : 9;
        corpoTabela.innerHTML = `<tr><td colspan="${totalColunas}" style="text-align:center;">A carregar dados...</td></tr>`;

        // Se for admin consulta a view completa com dados do criador; se for consultor consulta agendamentos
        const fonteTabela = isAdmin ? 'vw_agendamentos_completos' : 'agendamentos';

        const { data: agendamentos, error } = await supabaseClient
            .from(fonteTabela)
            .select('*')
            .order('data_revisao', { ascending: true });

        if (error) {
            console.error('Erro ao procurar agendamentos:', error);
            corpoTabela.innerHTML = `<tr><td colspan="${totalColunas}" style="text-align:center; color:red;">Erro ao carregar dados.</td></tr>`;
            return;
        }

        corpoTabela.innerHTML = '';

        const agendamentosDoMes = (agendamentos || []).filter(item => {
            return item.data_revisao && item.data_revisao.startsWith(mesSelecionado);
        });

        let totalComparecidas = 0;
        let somaBonusRealizado = 0;
        let somaBonusPrevisto = 0;

        agendamentosDoMes.forEach(item => {
            const valorUnitario = parseFloat(item.valor_unitario) || 0;

            if (item.status === 'compareceu') {
                totalComparecidas++;
                somaBonusRealizado += valorUnitario;
                somaBonusPrevisto += valorUnitario;
            } else if (item.status === 'pendente') {
                somaBonusPrevisto += valorUnitario;
            }

            let classeTag = 'tag-pendente';
            let textoValor = `Prev. R$ ${valorUnitario.toFixed(2).replace('.', ',')}`;
            let classeSuave = 'texto-suave';

            if (item.status === 'compareceu') {
                classeTag = 'tag-compareceu';
                textoValor = `R$ ${valorUnitario.toFixed(2).replace('.', ',')}`;
                classeSuave = '';
            } else if (item.status === 'faltou') {
                classeTag = 'tag-faltou';
                textoValor = 'R$ 0,00';
            }

            // Coluna com o e-mail/nome do usuário para Admin
            const colunaAdmin = isAdmin ? `
                <td style="font-size: 12px; color: var(--texto-secundario);">
                    <strong style="color: var(--texto-principal);">${item.autor_nome || 'Consultor'}</strong><br>
                    <span style="font-size: 11px; opacity: 0.8;">${item.autor_email || '-'}</span>
                </td>
            ` : '';

            const tr = document.createElement('tr');
            tr.dataset.id = item.id;
            tr.innerHTML = `
                ${colunaAdmin}
                <td>${formatarDataBR(item.data_contato)}</td>
                <td><input type="date" class="input-data-tabela" value="${item.data_revisao}"></td>
                <td><span class="chip-placa">${item.placa}</span></td>
                <td>${item.evento}</td>
                <td>${item.os}</td>
                <td>${item.revisao}ª Revisão</td>
                <td>
                    <select class="select-status-tabela ${classeTag}">
                        <option value="pendente" ${item.status === 'pendente' ? 'selected' : ''}>Pendente</option>
                        <option value="compareceu" ${item.status === 'compareceu' ? 'selected' : ''}>Compareceu</option>
                        <option value="faltou" ${item.status === 'faltou' ? 'selected' : ''}>Não Compareceu</option>
                    </select>
                </td>
                <td class="valor-tabela ${classeSuave}">${textoValor}</td>
                <td style="text-align: center;">
                    <button class="btn-excluir-linha" title="Excluir agendamento">🗑️</button>
                </td>
            `;

            corpoTabela.appendChild(tr);
        });

        // Atualização dos cartões 
        if (valorConfirmadoEl) valorConfirmadoEl.textContent = `R$ ${somaBonusRealizado.toFixed(2).replace('.', ',')}`;
        if (valorPrevistoEl) valorPrevistoEl.textContent = `R$ ${somaBonusPrevisto.toFixed(2).replace('.', ',')}`;
        if (detalheConfirmadoEl) detalheConfirmadoEl.textContent = `${totalComparecidas} revisões comparecidas`;
        if (contadorRegistros) contadorRegistros.textContent = `${agendamentosDoMes.length} registos neste mês`;
    }

    // Gravar novo agendamento no Supabase
    formulario.addEventListener('submit', async function(evento) {
        evento.preventDefault();

        const dataContato = document.getElementById('data-contato').value;
        const dataRevisao = document.getElementById('data-revisao').value;
        const placa = document.getElementById('placa').value.toUpperCase().trim();
        const eventoNum = document.getElementById('evento').value.trim();
        const osNum = document.getElementById('os').value.trim();
        const revisaoNum = document.getElementById('revisao').value;
        const statusInicial = document.getElementById('status').value;

        const { error } = await supabaseClient
            .from('agendamentos')
            .insert([{
                user_id: usuarioAtual.id,
                data_contato: dataContato,
                data_revisao: dataRevisao,
                placa: placa,
                evento: eventoNum,
                os: osNum,
                revisao: revisaoNum,
                status: statusInicial,
                valor_unitario: obterValorPorRevisao(revisaoNum)
            }]);

        if (error) {
            alert('Erro ao gravar no Supabase: ' + error.message);
            return;
        }

        const mesRevisao = dataRevisao.substring(0, 7);
        if (filtroMes && filtroMes.value !== mesRevisao) {
            filtroMes.value = mesRevisao;
        }

        formulario.reset();
        if (inputDataContato) {
            inputDataContato.value = `${anoAtual}-${mesAtual}-${diaAtual}`;
        }

        await renderizarTabela();
    });

    // Alterar dados em tempo real
    corpoTabela.addEventListener('change', async function(evento) {
        const linha = evento.target.closest('tr');
        if (!linha) return;
        const id = linha.dataset.id;

        if (evento.target.classList.contains('select-status-tabela')) {
            const novoStatus = evento.target.value;
            await supabaseClient
                .from('agendamentos')
                .update({ status: novoStatus })
                .eq('id', id);
            await renderizarTabela();
        }

        if (evento.target.classList.contains('input-data-tabela')) {
            const novaData = evento.target.value;
            await supabaseClient
                .from('agendamentos')
                .update({ data_revisao: novaData })
                .eq('id', id);
            await renderizarTabela();
        }
    });

    // Excluir agendamento
    corpoTabela.addEventListener('click', async function(evento) {
        const btnExcluir = evento.target.closest('.btn-excluir-linha');
        if (!btnExcluir) return;

        const linha = btnExcluir.closest('tr');
        const id = linha.dataset.id;

        const confirmou = confirm('Tem a certeza de que deseja eliminar este agendamento?');
        if (!confirmou) return;

        const { error } = await supabaseClient
            .from('agendamentos')
            .delete()
            .eq('id', id);

        if (error) {
            alert('Erro ao eliminar: ' + error.message);
            return;
        }

        await renderizarTabela();
    });

    // Seletor de mês
    if (filtroMes) {
        filtroMes.addEventListener('change', renderizarTabela);
    }

    // Inicialização da tabela
    await renderizarTabela();
});