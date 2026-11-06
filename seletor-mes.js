(function () {
    const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const ICONE = '<svg class="sm-icone" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M4 1.5v2M12 1.5v2M2 6h12M3 3h10a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
    const descricaoValor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');

    let popover = null;
    let ancora = null;

    function fechar() {
        if (popover) popover.classList.remove('visivel');
        if (ancora) ancora.classList.remove('aberto');
        ancora = null;
    }

    function garantirPopover() {
        if (popover) return popover;
        popover = document.createElement('div');
        popover.className = 'sm-popover';
        popover.addEventListener('click', e => e.stopPropagation());
        document.body.appendChild(popover);
        return popover;
    }

    function abrir(input, trigger) {
        if (ancora === trigger) { fechar(); return; }
        fechar();
        const pop = garantirPopover();
        const hoje = new Date();
        const atual = descricaoValor.get.call(input);
        let ano = /^\d{4}-\d{2}$/.test(atual) ? parseInt(atual.slice(0, 4), 10) : hoje.getFullYear();
        const mesAtual = /^\d{4}-\d{2}$/.test(atual) ? parseInt(atual.slice(5, 7), 10) : 0;
        const anoSelecionado = ano;

        const desenhar = () => {
            pop.innerHTML = `
                <div class="sm-topo">
                    <button type="button" class="sm-seta" data-delta="-1" aria-label="Ano anterior">&#8249;</button>
                    <span class="sm-ano">${ano}</span>
                    <button type="button" class="sm-seta" data-delta="1" aria-label="Próximo ano">&#8250;</button>
                </div>
                <div class="sm-grade">
                    ${MESES_CURTOS.map((nome, i) => `<button type="button" class="sm-mes${(ano === anoSelecionado && i + 1 === mesAtual) ? ' selecionado' : ''}${(ano === hoje.getFullYear() && i === hoje.getMonth()) ? ' atual' : ''}" data-mes="${i + 1}">${nome}</button>`).join('')}
                </div>
                <div class="sm-rodape"><button type="button" class="sm-hoje">Este mês</button></div>`;
            pop.querySelectorAll('.sm-seta').forEach(b => b.addEventListener('click', () => { ano += parseInt(b.dataset.delta, 10); desenhar(); }));
            pop.querySelectorAll('.sm-mes').forEach(b => b.addEventListener('click', () => escolher(ano, parseInt(b.dataset.mes, 10))));
            pop.querySelector('.sm-hoje').addEventListener('click', () => escolher(hoje.getFullYear(), hoje.getMonth() + 1));
        };

        const escolher = (a, m) => {
            const valor = `${a}-${String(m).padStart(2, '0')}`;
            const mudou = descricaoValor.get.call(input) !== valor;
            input.value = valor;
            fechar();
            if (mudou) {
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
            }
        };

        desenhar();
        const r = trigger.getBoundingClientRect();
        pop.style.minWidth = Math.max(r.width, 248) + 'px';
        pop.classList.add('visivel');
        const largura = pop.offsetWidth;
        const altura = pop.offsetHeight;
        let esquerda = Math.min(r.left, window.innerWidth - largura - 8);
        let topo = r.bottom + 6;
        if (topo + altura > window.innerHeight - 8 && r.top - altura - 6 > 0) topo = r.top - altura - 6;
        pop.style.left = Math.max(8, esquerda) + 'px';
        pop.style.top = topo + 'px';
        trigger.classList.add('aberto');
        ancora = trigger;
    }

    window.transformarMes = function (input) {
        if (!input || input.dataset.seletorMes) return;
        input.dataset.seletorMes = '1';

        const trigger = document.createElement('div');
        trigger.className = (input.className + ' sm-trigger').trim();
        trigger.tabIndex = 0;
        trigger.setAttribute('role', 'button');
        trigger.innerHTML = '<span class="sm-rotulo"></span>' + ICONE;
        const rotulo = trigger.querySelector('.sm-rotulo');

        const atualizar = () => {
            const v = descricaoValor.get.call(input);
            const nome = /^\d{4}-\d{2}$/.test(v) ? MESES_LONGOS[parseInt(v.slice(5, 7), 10) - 1] : '';
            rotulo.textContent = nome ? `${nome.charAt(0).toUpperCase()}${nome.slice(1)} de ${v.slice(0, 4)}` : 'Selecione o mês';
        };

        Object.defineProperty(input, 'value', {
            configurable: true,
            get() { return descricaoValor.get.call(this); },
            set(v) { descricaoValor.set.call(this, v); atualizar(); }
        });

        input.classList.add('select-nativo-oculto');
        input.parentNode.insertBefore(trigger, input.nextSibling);
        trigger.addEventListener('click', e => { e.stopPropagation(); abrir(input, trigger); });
        trigger.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(input, trigger); }
            else if (e.key === 'Escape') fechar();
        });
        atualizar();
    };

    function abrirDia(input, trigger) {
        if (ancora === trigger) { fechar(); return; }
        fechar();
        const pop = garantirPopover();
        const hoje = new Date();
        const hojeTexto = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
        const atual = descricaoValor.get.call(input);
        const valido = /^\d{4}-\d{2}-\d{2}$/.test(atual);
        let ano = valido ? parseInt(atual.slice(0, 4), 10) : hoje.getFullYear();
        let mes = valido ? parseInt(atual.slice(5, 7), 10) - 1 : hoje.getMonth();

        const texto = (a, m, d) => `${a}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

        const desenhar = () => {
            const primeiro = new Date(ano, mes, 1);
            const inicio = new Date(ano, mes, 1 - primeiro.getDay());
            let dias = '';
            for (let i = 0; i < 42; i++) {
                const d = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i);
                const t = texto(d.getFullYear(), d.getMonth(), d.getDate());
                const classes = ['sm-dia'];
                if (d.getMonth() !== mes) classes.push('fora');
                if (t === hojeTexto) classes.push('atual');
                if (t === atual) classes.push('selecionado');
                dias += `<button type="button" class="${classes.join(' ')}" data-data="${t}">${d.getDate()}</button>`;
            }
            const nome = MESES_LONGOS[mes];
            pop.innerHTML = `
                <div class="sm-topo">
                    <button type="button" class="sm-seta" data-delta="-1" aria-label="Mês anterior">&#8249;</button>
                    <span class="sm-ano">${nome.charAt(0).toUpperCase()}${nome.slice(1)} de ${ano}</span>
                    <button type="button" class="sm-seta" data-delta="1" aria-label="Próximo mês">&#8250;</button>
                </div>
                <div class="sm-dias">
                    ${['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(l => `<span class="sm-semana">${l}</span>`).join('')}
                    ${dias}
                </div>
                <div class="sm-rodape sm-rodape-dia"><button type="button" class="sm-hoje sm-limpar">Limpar</button><button type="button" class="sm-hoje">Hoje</button></div>`;
            pop.querySelectorAll('.sm-seta').forEach(b => b.addEventListener('click', () => {
                mes += parseInt(b.dataset.delta, 10);
                if (mes < 0) { mes = 11; ano--; }
                if (mes > 11) { mes = 0; ano++; }
                desenhar();
            }));
            pop.querySelectorAll('.sm-dia').forEach(b => b.addEventListener('click', () => escolher(b.dataset.data)));
            pop.querySelector('.sm-limpar').addEventListener('click', () => escolher(''));
            pop.querySelector('.sm-rodape .sm-hoje:not(.sm-limpar)').addEventListener('click', () => escolher(hojeTexto));
        };

        const escolher = (valor) => {
            const mudou = descricaoValor.get.call(input) !== valor;
            input.value = valor;
            fechar();
            if (mudou) {
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
            }
        };

        desenhar();
        const r = trigger.getBoundingClientRect();
        pop.style.minWidth = Math.max(r.width, 264) + 'px';
        pop.classList.add('visivel');
        const largura = pop.offsetWidth;
        const altura = pop.offsetHeight;
        let esquerda = Math.min(r.left, window.innerWidth - largura - 8);
        let topo = r.bottom + 6;
        if (topo + altura > window.innerHeight - 8 && r.top - altura - 6 > 0) topo = r.top - altura - 6;
        pop.style.left = Math.max(8, esquerda) + 'px';
        pop.style.top = topo + 'px';
        trigger.classList.add('aberto');
        ancora = trigger;
    }

    window.transformarData = function (input) {
        if (!input || input.dataset.seletorData) return;
        input.dataset.seletorData = '1';

        const trigger = document.createElement('div');
        trigger.className = (input.className + ' sm-trigger').trim();
        trigger.tabIndex = 0;
        trigger.setAttribute('role', 'button');
        trigger.innerHTML = '<span class="sm-rotulo"></span>' + ICONE;
        const rotulo = trigger.querySelector('.sm-rotulo');

        const atualizar = () => {
            const v = descricaoValor.get.call(input);
            rotulo.textContent = /^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v.slice(8, 10)}/${v.slice(5, 7)}/${v.slice(0, 4)}` : (input.dataset.placeholder || 'Selecione a data');
        };

        Object.defineProperty(input, 'value', {
            configurable: true,
            get() { return descricaoValor.get.call(this); },
            set(v) { descricaoValor.set.call(this, v); atualizar(); }
        });

        input.classList.add('select-nativo-oculto');
        input.parentNode.insertBefore(trigger, input.nextSibling);
        trigger.addEventListener('click', e => { e.stopPropagation(); abrirDia(input, trigger); });
        trigger.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrirDia(input, trigger); }
            else if (e.key === 'Escape') fechar();
        });
        atualizar();
    };

    document.addEventListener('click', e => {
        if (popover && popover.classList.contains('visivel') && !e.target.closest('.sm-popover')) fechar();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') fechar(); });
    window.addEventListener('resize', fechar);
    window.addEventListener('scroll', fechar, true);

    document.querySelectorAll('input[type="month"]').forEach(window.transformarMes);
    document.querySelectorAll('input[type="date"]').forEach(window.transformarData);
})();
