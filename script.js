document.addEventListener('DOMContentLoaded', async function() {
    // 1. Conexão ao Supabase
    const SUPABASE_URL = 'https://potvtrepcoswvzmkewic.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_iMbay5YOnrrehpqI9qU7HA_vMapr-DY';

    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    // 2. Elementos do Ecrã
    const formulario = document.querySelector('.formulario-agendamento');
    const corpoTabela = document.querySelector('tbody');
    const contadorRegistros = document.querySelector('.contador-registros');
    const valorConfirmadoEl = document.querySelector('.bonus-confirmado');
    const valorPrevistoEl = document.querySelector('.bonus-previsto');
    const detalheConfirmadoEl = document.querySelector('.card:first-child .card-detalhe');
    const filtroMes = document.getElementById('filtro-mes');
    const inputDataContato = document.getElementById('data-contato');

    // 3. Verificar se o utilizador tem sessão iniciada
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session || !session.user) {
        // Se não tiver sessão iniciada, redireciona para a página de login
        window.location.href = 'login.html';
        return;
    }

    const usuarioAtual = session.user;

    // Configurar Menu Superior (E-mail e Botão Sair)
    const areaAuth = document.getElementById('area-autenticacao');
    if (areaAuth && usuarioAtual) {
        let nomeExibicao = 'Usuário';

        // 1. Tenta obter o nome guardado convertendo com segurança para texto
        const metaNome = usuarioAtual.user_metadata?.nome_completo;
        if (typeof metaNome === 'string' && metaNome.trim().length > 0) {
            nomeExibicao = metaNome.trim().split(' ')[0];
        } 
        // 2. Caso contrário, trata o prefixo do e-mail
        else if (usuarioAtual.email) {
            const prefixoEmail = usuarioAtual.email.split('@')[0];
            const apenasLetras = prefixoEmail.replace(/[0-9]/g, '');
            if (apenasLetras.length > 0) {
                nomeExibicao = apenasLetras.charAt(0).toUpperCase() + apenasLetras.slice(1);
            } else {
                nomeExibicao = prefixoEmail;
            }
        }

        areaAuth.innerHTML = `
            <span class="usuario-logado-tag">Olá, <strong>${nomeExibicao}</strong> 👋</span>
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

    // 4. Configurar datas padrão
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

    // 5. Regras de bonificação da Toyota
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

    // 6. Consultar dados do Supabase
    async function renderizarTabela() {
        const mesSelecionado = filtroMes.value; // Ex: "2026-10"
        corpoTabela.innerHTML = '<tr><td colspan="8" style="text-align:center;">A carregar dados...</td></tr>';

        // O RLS do Supabase garante que apenas os agendamentos deste utilizador chegam aqui
        const { data: agendamentos, error } = await supabaseClient
            .from('agendamentos')
            .select('*')
            .order('data_revisao', { ascending: true });

        if (error) {
            console.error('Erro ao procurar agendamentos:', error);
            corpoTabela.innerHTML = '<tr><td colspan="8" style="text-align:center; color:red;">Erro ao carregar dados.</td></tr>';
            return;
        }

        corpoTabela.innerHTML = '';

        // Filtra pelo mês selecionado
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

            const tr = document.createElement('tr');
            tr.dataset.id = item.id;
            tr.innerHTML = `
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
            `;

            corpoTabela.appendChild(tr);
        });

        // Atualização dos cartões superiores
        if (valorConfirmadoEl) valorConfirmadoEl.textContent = `R$ ${somaBonusRealizado.toFixed(2).replace('.', ',')}`;
        if (valorPrevistoEl) valorPrevistoEl.textContent = `R$ ${somaBonusPrevisto.toFixed(2).replace('.', ',')}`;
        if (detalheConfirmadoEl) detalheConfirmadoEl.textContent = `${totalComparecidas} revisões comparecidas`;
        if (contadorRegistros) contadorRegistros.textContent = `${agendamentosDoMes.length} registos neste mês`;
    }

    // 7. Gravar novo agendamento no Supabase
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

    // 8. Alterar dados em tempo real (Status ou Data)
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

    // 9. Seletor de mês
    if (filtroMes) {
        filtroMes.addEventListener('change', renderizarTabela);
    }

    // Inicialização da tabela
    await renderizarTabela();
});