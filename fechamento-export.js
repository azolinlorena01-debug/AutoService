window.FechamentoExport = (function () {
    const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const CABECALHO = ['Operador', 'Marcas', 'Comparecidos', 'Agendados', 'Individual', 'Equipe', 'Monitoria', 'Calculado', 'Valor pago', 'Diferença', 'Observação'];

    function rotuloMes(mes) {
        const [ano, m] = String(mes).split('-');
        const nome = MESES[Number(m) - 1] || m;
        return `${nome.charAt(0).toUpperCase()}${nome.slice(1)} de ${ano}`;
    }

    function arredondar(v) {
        return Math.round((Number(v) || 0) * 100) / 100;
    }

    function dinheiro(v) {
        return arredondar(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function escapar(t) {
        return String(t === null || t === undefined ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function montarDados(estado) {
        const linhas = (estado.linhas || []).map(l => ({
            nome: l.perfil.nome || '',
            marcas: (l.calculo.detalheEquipe || []).map(i => `${i.marca} ${i.pct}%`).join(' | '),
            comparecidos: l.calculo.comparecidos,
            agendados: l.calculo.agendados,
            individual: arredondar(l.calculo.individual),
            equipe: arredondar(l.calculo.equipe),
            nota: l.nota === null || l.nota === undefined ? null : l.nota,
            calculado: arredondar(l.calculo.total),
            pago: l.pago === null || l.pago === undefined ? null : arredondar(l.pago),
            diferenca: l.pago === null || l.pago === undefined ? null : arredondar(l.pago - l.calculo.total),
            observacao: l.observacao || ''
        }));
        const soma = campo => linhas.reduce((t, l) => t + (Number(l[campo]) || 0), 0);
        const totais = {
            comparecidos: soma('comparecidos'),
            agendados: soma('agendados'),
            individual: arredondar(soma('individual')),
            equipe: arredondar(soma('equipe')),
            calculado: arredondar(soma('calculado')),
            pago: arredondar(soma('pago')),
            diferenca: arredondar(soma('diferenca'))
        };
        return { linhas, totais };
    }

    function nomeArquivo(estado, extensao) {
        return `fechamento-${estado.mes}.${extensao}`;
    }

    function baixar(blob, nome) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = nome;
        document.body.appendChild(link);
        link.click();
        setTimeout(() => { URL.revokeObjectURL(link.href); link.remove(); }, 1500);
    }

    function csv(estado) {
        const { linhas } = montarDados(estado);
        const num = v => v === null ? '' : arredondar(v).toFixed(2).replace('.', ',');
        const corpo = linhas.map(l => [l.nome, l.marcas, l.comparecidos, l.agendados, num(l.individual), num(l.equipe), l.nota === null ? '' : l.nota, num(l.calculado), num(l.pago), num(l.diferenca), l.observacao]);
        const texto = [CABECALHO, ...corpo].map(linha => linha.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n');
        baixar(new Blob(['﻿' + texto], { type: 'text/csv;charset=utf-8;' }), nomeArquivo(estado, 'csv'));
    }

    function carregarScript(urls) {
        const lista = Array.isArray(urls) ? urls.slice() : [urls];
        return new Promise((resolve, reject) => {
            const tentar = () => {
                if (!lista.length) { reject(new Error('Não foi possível carregar a biblioteca de planilhas.')); return; }
                const s = document.createElement('script');
                s.src = lista.shift();
                s.onload = () => resolve();
                s.onerror = () => { s.remove(); tentar(); };
                document.head.appendChild(s);
            };
            tentar();
        });
    }

    async function excel(estado, meta) {
        if (!window.XLSX) {
            await carregarScript(['https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js', 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js']);
        }
        const XLSX = window.XLSX;
        const { linhas, totais } = montarDados(estado);
        const situacao = estado.fechado ? 'Mês fechado' : 'Mês em aberto';
        const aoa = [
            [`Fechamento — ${rotuloMes(estado.mes)}`],
            [`${situacao} · Gerado em ${meta.geradoEm}${meta.usuario ? ' por ' + meta.usuario : ''}`],
            [],
            CABECALHO,
            ...linhas.map(l => [l.nome, l.marcas, l.comparecidos, l.agendados, l.individual, l.equipe, l.nota, l.calculado, l.pago, l.diferenca, l.observacao]),
            ['Total', '', totais.comparecidos, totais.agendados, totais.individual, totais.equipe, '', totais.calculado, totais.pago, totais.diferenca, '']
        ];
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        const primeira = 4;
        const ultima = primeira + linhas.length;
        const formato = 'R$ #,##0.00';
        for (let r = primeira; r <= ultima; r++) {
            [4, 5, 7, 8, 9].forEach(c => {
                const ref = XLSX.utils.encode_cell({ r, c });
                if (ws[ref] && typeof ws[ref].v === 'number') ws[ref].z = formato;
            });
        }
        ws['!cols'] = [{ wch: 30 }, { wch: 34 }, { wch: 14 }, { wch: 11 }, { wch: 14 }, { wch: 14 }, { wch: 11 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 40 }];
        ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 10 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Fechamento');
        XLSX.writeFile(wb, nomeArquivo(estado, 'xlsx'));
    }

    function htmlRelatorio(estado, meta) {
        const { linhas, totais } = montarDados(estado);
        const situacao = estado.fechado ? 'Mês fechado' : 'Mês em aberto';
        const celula = v => v === null ? '<span class="vazio">—</span>' : dinheiro(v);
        const corpo = linhas.map(l => `<tr>
            <td class="nome">${escapar(l.nome)}</td>
            <td>${escapar(l.marcas)}</td>
            <td class="c">${l.comparecidos} / ${l.agendados}</td>
            <td class="d">${dinheiro(l.individual)}</td>
            <td class="d">${dinheiro(l.equipe)}</td>
            <td class="c">${l.nota === null ? '<span class="vazio">—</span>' : escapar(l.nota) + '%'}</td>
            <td class="d">${dinheiro(l.calculado)}</td>
            <td class="d">${celula(l.pago)}</td>
            <td class="d">${celula(l.diferenca)}</td>
            <td>${escapar(l.observacao)}</td>
        </tr>`).join('');
        return `<!DOCTYPE html><html lang="pt-br"><head><meta charset="UTF-8"><title>Fechamento ${escapar(rotuloMes(estado.mes))}</title>
<style>
@page { size: A4 landscape; margin: 12mm; }
* { box-sizing: border-box; }
body { font-family: Arial, Helvetica, sans-serif; color: #111827; font-size: 10.5px; margin: 0; }
h1 { font-size: 18px; margin: 0 0 4px; }
.meta { color: #374151; margin-bottom: 14px; font-size: 11px; }
.selo { display: inline-block; padding: 2px 8px; border-radius: 10px; font-weight: 700; font-size: 10px; background: #fef3c7; color: #92400e; }
.selo.fechado { background: #dcfce7; color: #166534; }
table { width: 100%; border-collapse: collapse; }
th { background: #eef1f6; text-align: left; font-size: 9.5px; text-transform: uppercase; letter-spacing: .3px; padding: 7px 6px; border-bottom: 1.5px solid #9aa6ba; }
td { padding: 6px; border-bottom: 1px solid #d9dfe8; vertical-align: top; }
tr { page-break-inside: avoid; }
td.nome { font-weight: 700; }
td.c, th.c { text-align: center; }
td.d, th.d { text-align: right; white-space: nowrap; }
tfoot td { font-weight: 700; border-top: 1.5px solid #111827; border-bottom: none; background: #f6f8fb; }
.vazio { color: #9ca3af; }
</style></head><body>
<h1>Fechamento — ${escapar(rotuloMes(estado.mes))}</h1>
<div class="meta"><span class="selo ${estado.fechado ? 'fechado' : ''}">${situacao}</span> &nbsp; Gerado em ${escapar(meta.geradoEm)}${meta.usuario ? ' por ' + escapar(meta.usuario) : ''}</div>
<table>
<thead><tr><th>Operador</th><th>Marcas</th><th class="c">Comparecidos</th><th class="d">Individual</th><th class="d">Equipe</th><th class="c">Monitoria</th><th class="d">Calculado</th><th class="d">Valor pago</th><th class="d">Diferença</th><th>Observação</th></tr></thead>
<tbody>${corpo}</tbody>
<tfoot><tr><td>Total</td><td></td><td class="c">${totais.comparecidos} / ${totais.agendados}</td><td class="d">${dinheiro(totais.individual)}</td><td class="d">${dinheiro(totais.equipe)}</td><td></td><td class="d">${dinheiro(totais.calculado)}</td><td class="d">${dinheiro(totais.pago)}</td><td class="d">${dinheiro(totais.diferenca)}</td><td></td></tr></tfoot>
</table>
</body></html>`;
    }

    function pdf(estado, meta) {
        const quadro = document.createElement('iframe');
        quadro.setAttribute('aria-hidden', 'true');
        quadro.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
        document.body.appendChild(quadro);
        const doc = quadro.contentWindow.document;
        doc.open();
        doc.write(htmlRelatorio(estado, meta));
        doc.close();
        const imprimir = () => {
            try {
                quadro.contentWindow.focus();
                quadro.contentWindow.print();
            } finally {
                setTimeout(() => quadro.remove(), 60000);
            }
        };
        setTimeout(imprimir, 350);
    }

    return { csv, excel, pdf, montarDados, htmlRelatorio, rotuloMes };
})();
