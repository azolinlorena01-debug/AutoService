document.addEventListener('DOMContentLoaded', function() {
    const formulario = document.querySelector('.formulario-agendamento');
    const corpoTabela = document.querySelector('tbody');
    const contadorRegistros = document.querySelector('.contador-registros');
    const valorConfirmadoEl = document.querySelector('.bonus-confirmado');
    const valorPrevistoEl = document.querySelector('.bonus-previsto');
    const detalheConfirmadoEl = document.querySelector('.card:first-child .card-detalhe');
    const filtroMes = document.getElementById('filtro-mes');
    const inputDataContato = document.getElementById('data-contato');

    const STORAGE_KEY = 'agendamentos_toyota_v1';

    // 1. Funções de persistência no localStorage
    function carregarAgendamentos() {
        const dados = localStorage.getItem(STORAGE_KEY);
        return dados ? JSON.parse(dados) : [];
    }

    function salvarAgendamentos(lista) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
    }

    // 2. Data padrão de hoje (DD/MM/AAAA e YYYY-MM)
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

    // 3. Regra de negócio: Faixas de bonificação
    // 1ª a 4ª = R$ 2,00 | 5ª a 7ª = R$ 6,00 | 8ª em diante = R$ 10,00
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

    // 4. Renderização da tabela e dos cards filtrando pelo MÊS DA REVISÃO
    function renderizarTabela() {
        const agendamentos = carregarAgendamentos();
        const mesSelecionado = filtroMes.value; // Ex: "2026-10"

        corpoTabela.innerHTML = '';

        // Filtra pelo mês em que o serviço ocorrerá
        const agendamentosDoMes = agendamentos.filter(item => {
            if (!item.dataRevisao) return false;
            return item.dataRevisao.startsWith(mesSelecionado);
        });

        let totalComparecidas = 0;
        let somaBonusRealizado = 0;
        let somaBonusPrevisto = 0;

        agendamentosDoMes.forEach(item => {
            const valorUnitario = item.valorUnitario;

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
                <td>${formatarDataBR(item.dataContato)}</td>
                <td><input type="date" class="input-data-tabela" value="${item.dataRevisao}"></td>
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

        // Atualiza os cards superiores
        if (valorConfirmadoEl) valorConfirmadoEl.textContent = `R$ ${somaBonusRealizado.toFixed(2).replace('.', ',')}`;
        if (valorPrevistoEl) valorPrevistoEl.textContent = `R$ ${somaBonusPrevisto.toFixed(2).replace('.', ',')}`;
        if (detalheConfirmadoEl) detalheConfirmadoEl.textContent = `${totalComparecidas} revisões comparecidas`;
        if (contadorRegistros) contadorRegistros.textContent = `${agendamentosDoMes.length} registros neste mês`;
    }

    // 5. Cadastrar novo agendamento
    formulario.addEventListener('submit', function(evento) {
        evento.preventDefault();

        const dataContato = document.getElementById('data-contato').value;
        const dataRevisao = document.getElementById('data-revisao').value;
        const placa = document.getElementById('placa').value.toUpperCase().trim();
        const eventoNum = document.getElementById('evento').value.trim();
        const osNum = document.getElementById('os').value.trim();
        const revisaoNum = document.getElementById('revisao').value;
        const statusInicial = document.getElementById('status').value;

        const novoAgendamento = {
            id: Date.now().toString(),
            dataContato: dataContato,
            dataRevisao: dataRevisao,
            placa: placa,
            evento: eventoNum,
            os: osNum,
            revisao: revisaoNum,
            status: statusInicial,
            valorUnitario: obterValorPorRevisao(revisaoNum)
        };

        const lista = carregarAgendamentos();
        lista.push(novoAgendamento);
        salvarAgendamentos(lista);

        // Se o agendamento foi marcado para outro mês, muda o seletor para você já ver o registro
        const mesRevisao = dataRevisao.substring(0, 7);
        if (filtroMes && filtroMes.value !== mesRevisao) {
            filtroMes.value = mesRevisao;
        }

        formulario.reset();
        if (inputDataContato) {
            inputDataContato.value = `${anoAtual}-${mesAtual}-${diaAtual}`;
        }

        renderizarTabela();
    });

    // 6. Atualização em tempo real caso mude Status ou Data na tabela
    corpoTabela.addEventListener('change', function(evento) {
        const linha = evento.target.closest('tr');
        if (!linha) return;
        const id = linha.dataset.id;

        const lista = carregarAgendamentos();
        const item = lista.find(ag => ag.id === id);
        if (!item) return;

        if (evento.target.classList.contains('select-status-tabela')) {
            item.status = evento.target.value;
            salvarAgendamentos(lista);
            renderizarTabela();
        }

        if (evento.target.classList.contains('input-data-tabela')) {
            item.dataRevisao = evento.target.value;
            salvarAgendamentos(lista);
            renderizarTabela();
        }
    });

    // 7. Troca de mês no seletor
    if (filtroMes) {
        filtroMes.addEventListener('change', renderizarTabela);
    }

    // Inicialização
    renderizarTabela();
});