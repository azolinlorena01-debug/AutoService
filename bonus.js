window.Bonus = (function () {
    const MINIMO_EQUIPE = 80;

    function normalizarMarca(texto) {
        if (!texto) return 'Toyota';
        const s = String(texto).trim();
        const u = s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
        if (u.includes('TOYOTA')) return 'Toyota';
        if (u.includes('VW') || u.includes('VOLKS')) return 'Volkswagen';
        if (u.includes('FIAT')) return 'Fiat';
        if (u.includes('RENAULT')) return 'Renault';
        if (u.includes('BYD')) return 'BYD';
        if (u.includes('CHERY')) return 'Chery';
        if (u.includes('NISSAN')) return 'Nissan';
        if (u.includes('FORD')) return 'Ford';
        if (u.includes('HYUNDAI')) return 'Hyundai';
        if (u.includes('OMODA')) return 'Omoda';
        if (u.includes('KIA')) return 'Kia';
        if (u.includes('AUDI')) return 'Audi';
        if (u.includes('CITROEN')) return 'Citroen';
        if (u.includes('GEELY')) return 'Geely';
        if (u.includes('JEEP')) return 'Jeep';
        return s;
    }

    function listarMarcas(equipe) {
        return String(equipe || '')
            .split('|')
            .map(s => s.trim())
            .filter(Boolean)
            .map(normalizarMarca);
    }

    function metaPadrao(marca) {
        if (marca === 'Toyota') return 900;
        if (['Renault', 'Fiat', 'Volkswagen'].includes(marca)) return 300;
        return 100;
    }

    function percentual(qtd, meta) {
        return Math.min(100, Math.floor((qtd / Math.max(1, meta)) * 100));
    }

    function bonusPorMarca(marcas, agendamentos, obterMeta, somenteComparecidos) {
        const itens = marcas.map(marca => {
            const daMarca = agendamentos.filter(a => normalizarMarca(a.marca) === marca);
            const qtd = somenteComparecidos ? daMarca.filter(a => a.status === 'compareceu').length : daMarca.length;
            const meta = obterMeta(marca);
            const pct = percentual(qtd, meta);
            return { marca, qtd, meta, pct, bonus: pct >= MINIMO_EQUIPE ? pct : 0 };
        });
        return { itens, total: itens.reduce((soma, i) => soma + i.bonus, 0) };
    }

    function fatorMonitoria(nota) {
        const n = parseFloat(nota);
        if (nota === null || nota === undefined || isNaN(n)) return 1.00;
        return n >= 90 ? 1.10 : 0.90;
    }

    function calcularOperador(operador, agendamentosMes, obterMeta, nota) {
        const marcas = listarMarcas(operador.equipe);
        const meus = agendamentosMes.filter(a => a.user_id === operador.id);
        const comparecidos = meus.filter(a => a.status === 'compareceu');
        const individual = comparecidos.reduce((soma, a) => soma + (parseFloat(a.valor_unitario) || 0), 0);
        const equipe = bonusPorMarca(marcas, agendamentosMes, obterMeta, true);
        const fator = fatorMonitoria(nota);
        return {
            marcas,
            agendados: meus.length,
            comparecidos: comparecidos.length,
            individual,
            equipe: equipe.total,
            detalheEquipe: equipe.itens,
            fator,
            total: Math.round((individual + equipe.total) * fator * 100) / 100
        };
    }

    return { MINIMO_EQUIPE, normalizarMarca, listarMarcas, metaPadrao, percentual, bonusPorMarca, fatorMonitoria, calcularOperador };
})();
