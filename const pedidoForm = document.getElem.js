document.addEventListener('DOMContentLoaded', () => {
    // Seletor de elementos
    const pedidoForm = document.getElementById('pedidoForm');
    const iniciarBtn = document.getElementById('iniciarBtn');
    const pedidosEmAndamentoDiv = document.getElementById('pedidosEmAndamento');
    const pedidosTableBody = document.querySelector('#pedidosTable tbody');
    const exportarBtn = document.getElementById('exportarBtn');
    const limparHistoricoBtn = document.getElementById('limparHistoricoBtn');

    // Elementos do painel de KPIs
    const totalPedidosEl = document.getElementById('total-pedidos');
    const tempoMedioEl = document.getElementById('tempo-medio');
    const pecasPorMinutoEl = document.getElementById('pecas-por-minuto');

    // Elementos de filtro de data
    const filterStartDateEl = document.getElementById('filterStartDate');
    const filterEndDateEl = document.getElementById('filterEndDate');
    const applyFilterBtn = document.getElementById('applyFilterBtn');
    const clearFilterBtn = document.getElementById('clearFilterBtn');

    // Canvas dos gráficos
    const ctxPerfil = document.getElementById('perfilChart').getContext('2d');
    const ctxColaborador = document.getElementById('colaboradorChart').getContext('2d');
    
    // Botões para mostrar/esconder rótulos de dados
    const togglePerfilChartBtn = document.getElementById('togglePerfilChartBtn');
    const toggleColaboradorChartBtn = document.getElementById('toggleColaboradorChartBtn');
    
    const editModal = document.getElementById('editModal');
    const closeButton = editModal.querySelector('.close-button');
    const editPedidoForm = document.getElementById('editPedidoForm');
    const saveEditBtn = document.getElementById('saveEditBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');

    let perfilChart;
    let colaboradorChart;
    let pedidosAtivos = {};
    let isPerfilDatalabelsVisible = true;
    let isColaboradorDatalabelsVisible = true;


    function formatTime(ms) {
        let totalSeconds = Math.floor(ms / 1000);
        let hours = Math.floor(totalSeconds / 3600);
        totalSeconds %= 3600;
        let minutes = Math.floor(totalSeconds / 60);
        let seconds = totalSeconds % 60;

        return [
            String(hours).padStart(2, '0'),
            String(minutes).padStart(2, '0'),
            String(seconds).padStart(2, '0')
        ].join(':');
    }

    function saveHistory(history) {
        localStorage.setItem('pedidosHistory', JSON.stringify(history));
    }

    function loadHistory(filtered = false) {
        const history = JSON.parse(localStorage.getItem('pedidosHistory')) || [];
        pedidosTableBody.innerHTML = '';

        let filteredHistory = history;
        if (filtered) {
            const startDate = filterStartDateEl.value ? new Date(filterStartDateEl.value + 'T00:00:00') : null;
            const endDate = filterEndDateEl.value ? new Date(filterEndDateEl.value + 'T23:59:59') : null;
            
            filteredHistory = history.filter(pedido => {
                const pedidoDate = new Date(pedido.dataHoraFim.split(' ')[0].split('/').reverse().join('-') + 'T' + pedido.dataHoraFim.split(' ')[1]);
                
                let match = true;
                if (startDate && pedidoDate < startDate) {
                    match = false;
                }
                if (endDate && pedidoDate > endDate) {
                    match = false;
                }
                return match;
            });
        }

        filteredHistory.forEach((pedido, index) => {
            const newRow = pedidosTableBody.insertRow();
            newRow.innerHTML = `
                <td>${pedido.numeroPedido}</td>
                <td>${pedido.idColaborador}</td>
                <td>${pedido.nomeColaborador}</td>
                <td>${pedido.perfilPedido}</td>
                <td>${pedido.quantidadePecas}</td>
                <td>${pedido.tempoSeparacao}</td>
                <td>${pedido.dataHoraInicio}</td>
                <td>${pedido.dataHoraFim}</td>
                <td class="action-buttons">
                    <button class="edit-btn" data-index="${index}">Editar</button>
                    <button class="delete-btn" data-index="${index}">Apagar</button>
                </td>
            `;
        });
        updateKPIs(filteredHistory);
        updateChart(filteredHistory);
        updateColaboradorChart(filteredHistory);
    }

    function updateKPIs(currentHistory) {
        const history = currentHistory || JSON.parse(localStorage.getItem('pedidosHistory')) || [];
        const totalPedidos = history.length;
        let totalTimeInSeconds = 0;
        let totalPecas = 0;
        history.forEach(pedido => {
            const parts = pedido.tempoSeparacao.split(':').map(Number);
            if (parts.length === 3) {
                const seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
                totalTimeInSeconds += seconds;
                totalPecas += Number(pedido.quantidadePecas);
            }
        });
        const tempoMedioEmSegundos = totalPedidos > 0 ? totalTimeInSeconds / totalPedidos : 0;
        const tempoMedioFormatado = formatTime(tempoMedioEmSegundos * 1000);
        const totalTimeInMinutes = totalTimeInSeconds / 60;
        const pecasPorMinuto = totalTimeInMinutes > 0 ? (totalPecas / totalTimeInMinutes).toFixed(2) : 0;
        totalPedidosEl.textContent = totalPedidos;
        tempoMedioEl.textContent = tempoMedioFormatado;
        pecasPorMinutoEl.textContent = pecasPorMinuto;
    }

    function updateChart(currentHistory) {
        const history = currentHistory || JSON.parse(localStorage.getItem('pedidosHistory')) || [];
        const perfilCounts = history.reduce((acc, pedido) => {
            acc[pedido.perfilPedido] = (acc[pedido.perfilPedido] || 0) + 1;
            return acc;
        }, {});
        const labels = Object.keys(perfilCounts);
        const data = Object.values(perfilCounts);
        const totalCount = data.reduce((a, b) => a + b, 0);
        const purplePalette = ['#6A0572', '#B967FF', '#E0BBE4', '#D291BC', '#957DAD', '#B452D3'];
        if (perfilChart) {
            perfilChart.destroy();
        }
        perfilChart = new Chart(ctxPerfil, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: purplePalette,
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    datalabels: {
                        color: 'white',
                        formatter: (value, ctx) => {
                            let sum = 0;
                            let dataArr = ctx.chart.data.datasets[0].data;
                            dataArr.map(data => {
                                sum += data;
                            });
                            let percentage = (value * 100 / sum).toFixed(2) + '%';
                            return `${value} (${percentage})`;
                        },
                        display: isPerfilDatalabelsVisible
                    },
                },
                layout: {
                    padding: 20
                }
            },
            plugins: [ChartDataLabels]
        });
    }

    function updateColaboradorChart(currentHistory) {
        const history = currentHistory || JSON.S.parse(localStorage.getItem('pedidosHistory')) || [];
        const colaboradorData = history.reduce((acc, pedido) => {
            if (!acc[pedido.nomeColaborador]) {
                acc[pedido.nomeColaborador] = { pedidos: 0, pecas: 0 };
            }
            acc[pedido.nomeColaborador].pedidos += 1;
            acc[pedido.nomeColaborador].pecas += Number(pedido.quantidadePecas);
            return acc;
        }, {});
        const labels = Object.keys(colaboradorData);
        const pedidosData = labels.map(label => colaboradorData[label].pedidos);
        const pecasData = labels.map(label => colaboradorData[label].pecas);
        const barColorsPedidos = labels.map((_, i) => `rgba(138, 43, 226, ${0.4 + i * 0.1})`);
        const barColorsPecas = labels.map((_, i) => `rgba(147, 112, 219, ${0.4 + i * 0.1})`);
        if (colaboradorChart) {
            colaboradorChart.destroy();
        }
        colaboradorChart = new Chart(ctxColaborador, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Pedidos',
                        data: pedidosData,
                        backgroundColor: barColorsPedidos,
                        borderColor: 'rgba(138, 43, 226, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Peças',
                        data: pecasData,
                        backgroundColor: barColorsPecas,
                        borderColor: 'rgba(147, 112, 219, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: { beginAtZero: true }
                },
                plugins: {
                    legend: { position: 'top' },
                    datalabels: {
                        anchor: 'end',
                        align: 'top',
                        formatter: Math.round,
                        font: { weight: 'bold' },
                        display: isColaboradorDatalabelsVisible
                    }
                }
            },
            plugins: [ChartDataLabels]
        });
    }

    // Botões para mostrar/esconder rótulos de dados
    togglePerfilChartBtn.addEventListener('click', () => {
        isPerfilDatalabelsVisible = !isPerfilDatalabelsVisible;
        if (perfilChart) {
            perfilChart.options.plugins.datalabels.display = isPerfilDatalabelsVisible;
            perfilChart.update();
            togglePerfilChartBtn.textContent = isPerfilDatalabelsVisible ? 'Esconder Dados' : 'Mostrar Dados';
        }
    });
    toggleColaboradorChartBtn.addEventListener('click', () => {
        isColaboradorDatalabelsVisible = !isColaboradorDatalabelsVisible;
        if (colaboradorChart) {
            colaboradorChart.options.plugins.datalabels.display = isColaboradorDatalabelsVisible;
            colaboradorChart.update();
            toggleColaboradorChartBtn.textContent = isColaboradorDatalabelsVisible ? 'Esconder Dados' : 'Mostrar Dados';
        }
    });

    loadHistory();

    exportarBtn.addEventListener('click', () => {
        const history = JSON.parse(localStorage.getItem('pedidosHistory')) || [];
        if (history.length === 0) {
            alert('Não há dados no histórico para exportar.');
            return;
        }
        const headers = ["Número do Pedido", "ID Colaborador", "Nome Colaborador", "Perfil do Pedido", "Quantidade de Peças", "Tempo de Separação", "Início", "Fim"];
        const rows = history.map(pedido => [
            `"${pedido.numeroPedido}"`, `"${pedido.idColaborador}"`, `"${pedido.nomeColaborador}"`, `"${pedido.perfilPedido}"`, `"${pedido.quantidadePecas}"`, `"${pedido.tempoSeparacao}"`, `"${pedido.dataHoraInicio}"`, `"${pedido.dataHoraFim}"`
        ]);
        const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "historico_pedidos.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    limparHistoricoBtn.addEventListener('click', () => {
        if (confirm('Tem certeza que deseja limpar TODO o histórico de pedidos? Esta ação é irreversível.')) {
            localStorage.removeItem('pedidosHistory');
            loadHistory();
            alert('Histórico limpo com sucesso!');
        }
    });

    pedidosTableBody.addEventListener('click', (event) => {
        if (event.target.classList.contains('delete-btn')) {
            const index = event.target.dataset.index;
            deletePedido(index);
        } else if (event.target.classList.contains('edit-btn')) {
            const index = event.target.dataset.index;
            openEditModal(index);
        }
    });

    function deletePedido(indexToDelete) {
        if (confirm('Tem certeza que deseja apagar este pedido do histórico?')) {
            let history = JSON.parse(localStorage.getItem('pedidosHistory')) || [];
            history.splice(indexToDelete, 1);
            saveHistory(history);
            loadHistory();
        }
    }

    function openEditModal(indexToEdit) {
        const history = JSON.parse(localStorage.getItem('pedidosHistory')) || [];
        const pedido = history[indexToEdit];
        if (pedido) {
            document.getElementById('editPedidoIndex').value = indexToEdit;
            document.getElementById('editNumeroPedido').value = pedido.numeroPedido;
            document.getElementById('editIdColaborador').value = pedido.idColaborador;
            document.getElementById('editNomeColaborador').value = pedido.nomeColaborador;
            document.getElementById('editPerfilPedido').value = pedido.perfilPedido;
            document.getElementById('editQuantidadePecas').value = pedido.quantidadePecas;
            editModal.style.display = 'flex';
        }
    }

    closeButton.addEventListener('click', () => {
        editModal.style.display = 'none';
    });
    cancelEditBtn.addEventListener('click', () => {
        editModal.style.display = 'none';
    });
    saveEditBtn.addEventListener('click', () => {
        const indexToUpdate = document.getElementById('editPedidoIndex').value;
        let history = JSON.parse(localStorage.getItem('pedidosHistory')) || [];
        if (history[indexToUpdate]) {
            history[indexToUpdate].numeroPedido = document.getElementById('editNumeroPedido').value;
            history[indexToUpdate].idColaborador = document.getElementById('editIdColaborador').value;
            history[indexToUpdate].nomeColaborador = document.getElementById('editNomeColaborador').value;
            history[indexToUpdate].perfilPedido = document.getElementById('editPerfilPedido').value;
            history[indexToUpdate].quantidadePecas = document.getElementById('editQuantidadePecas').value;
            saveHistory(history);
            loadHistory();
            editModal.style.display = 'none';
        }
    });

    applyFilterBtn.addEventListener('click', () => {
        loadHistory(true);
    });
    clearFilterBtn.addEventListener('click', () => {
        filterStartDateEl.value = '';
        filterEndDateEl.value = '';
        loadHistory();
    });

    iniciarBtn.addEventListener('click', () => {
        if (!pedidoForm.checkValidity()) {
            alert('Por favor, preencha todos os campos obrigatórios antes de adicionar.');
            return;
        }
        const numeroPedido = document.getElementById('numeroPedido').value;
        if (pedidosAtivos[numeroPedido]) {
            alert(`O pedido ${numeroPedido} já está em andamento.`);
            return;
        }
        const agora = new Date();
        const dataInicioFormatada = agora.toLocaleString('pt-BR');
        const pedido = {
            idColaborador: document.getElementById('idColaborador').value,
            nomeColaborador: document.getElementById('nomeColaborador').value,
            numeroPedido: numeroPedido,
            perfilPedido: document.getElementById('perfilPedido').value,
            quantidadePecas: document.getElementById('quantidadePecas').value,
            dataHoraInicio: dataInicioFormatada,
            startTime: Date.now()
        };
        pedidosAtivos[numeroPedido] = pedido;
        const pedidoDiv = document.createElement('div');
        pedidoDiv.className = 'pedido-em-andamento';
        pedidoDiv.dataset.numeroPedido = numeroPedido;
        pedidoDiv.innerHTML = `
            <div class="pedido-info">
                Pedido **${pedido.numeroPedido}**<br>
                Colaborador: ${pedido.nomeColaborador} (${pedido.idColaborador})<br>
                Peças: ${pedido.quantidadePecas}
            </div>
            <div class="timer-info">
                Tempo: <span id="timer-${numeroPedido}">00:00:00</span>
            </div>
            <button class="finalizar-btn" data-numero-pedido="${numeroPedido}">Finalizar</button>
        `;
        pedidosEmAndamentoDiv.prepend(pedidoDiv);
        pedido.timerInterval = setInterval(() => {
            const elapsedTime = Date.now() - pedido.startTime;
            const timerSpan = document.getElementById(`timer-${numeroPedido}`);
            if (timerSpan) {
                timerSpan.textContent = formatTime(elapsedTime);
            }
        }, 1000);
        pedidoForm.reset();
    });

    pedidosEmAndamentoDiv.addEventListener('click', (event) => {
        if (event.target.classList.contains('finalizar-btn')) {
            const numeroPedido = event.target.dataset.numeroPedido;
            const pedido = pedidosAtivos[numeroPedido];
            if (!pedido) return;
            clearInterval(pedido.timerInterval);
            const endTime = Date.now();
            const elapsedTime = endTime - pedido.startTime;
            const tempoSeparacaoFormatado = formatTime(elapsedTime);
            const dataFimFormatada = new Date().toLocaleString('pt-BR');
            const history = JSON.parse(localStorage.getItem('pedidosHistory')) || [];
            history.push({
                ...pedido,
                tempoSeparacao: tempoSeparacaoFormatado,
                dataHoraFim: dataFimFormatada
            });
            saveHistory(history);
            const pedidoDiv = document.querySelector(`.pedido-em-andamento[data-numero-pedido="${numeroPedido}"]`);
            if (pedidoDiv) {
                pedidoDiv.remove();
            }
            delete pedidosAtivos[numeroPedido];
            loadHistory();
        }
    });
});