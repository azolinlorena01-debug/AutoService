document.addEventListener('DOMContentLoaded', function() {
    const STORAGE_KEY = 'agendamentos_toyota_v1';

    function carregarAgendamentos() {
        const dados = localStorage.getItem(STORAGE_KEY);
        return dados ? JSON.parse(dados) : [];
    }

    const agendamentos = carregarAgendamentos();

    // 1. Agrupar dados por mês de execução (dataRevisao)
    const consolidadoPorMes = {};

    agendamentos.forEach(item => {
        if (!item.dataRevisao) return;
        const chaveMes = item.dataRevisao.substring(0, 7); // "YYYY-MM"

        if (!consolidadoPorMes[chaveMes]) {
            consolidadoPorMes[chaveMes] = {
                totalAgendados: 0,
                totalComparecidos: 0,
                bonusRealizado: 0
            };
        }

        consolidadoPorMes[chaveMes].totalAgendados++;

        if (item.status === 'compareceu') {
            consolidadoPorMes[chaveMes].totalComparecidos++;
            consolidadoPorMes[chaveMes].bonusRealizado += (item.valorUnitario || 0);
        }
    });

    // 2. Ordenar os meses cronologicamente
    const mesesOrdenados = Object.keys(consolidadoPorMes).sort();

    const rotulos = mesesOrdenados.map(mes => {
        const [ano, m] = mes.split('-');
        return `${m}/${ano}`;
    });

    const dadosBonusReal = mesesOrdenados.map(mes => consolidadoPorMes[mes].bonusRealizado);
    const dadosAgendados = mesesOrdenados.map(mes => consolidadoPorMes[mes].totalAgendados);
    const dadosComparecidos = mesesOrdenados.map(mes => consolidadoPorMes[mes].totalComparecidos);

    // 3. Gráfico 1: Bônus Realizado
    const canvasBonus = document.getElementById('graficoBonus');
    if (canvasBonus) {
        new Chart(canvasBonus.getContext('2d'), {
            type: 'bar',
            data: {
                labels: rotulos.length ? rotulos : ['Sem dados'],
                datasets: [{
                    label: 'Bônus Realizado (R$)',
                    data: dadosBonusReal.length ? dadosBonusReal : [0],
                    backgroundColor: '#15803d',
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: valor => `R$ ${valor}`
                        }
                    }
                }
            }
        });
    }

    // 4. Gráfico 2: Agendados vs Comparecidos
    const canvasVolume = document.getElementById('graficoVolume');
    if (canvasVolume) {
        new Chart(canvasVolume.getContext('2d'), {
            type: 'bar',
            data: {
                labels: rotulos.length ? rotulos : ['Sem dados'],
                datasets: [
                    {
                        label: 'Total Agendados',
                        data: dadosAgendados.length ? dadosAgendados : [0],
                        backgroundColor: '#94a3b8',
                        borderRadius: 6
                    },
                    {
                        label: 'Compareceram',
                        data: dadosComparecidos.length ? dadosComparecidos : [0],
                        backgroundColor: '#2563eb',
                        borderRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }
});