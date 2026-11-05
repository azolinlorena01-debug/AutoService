function fecharTodosDropdowns() {
    document.querySelectorAll('.dd-operador-menu.visivel').forEach(m => m.classList.remove('visivel'));
    document.querySelectorAll('.dd-operador-trigger.aberto').forEach(t => t.classList.remove('aberto'));
}

document.addEventListener('click', (e) => {
    if (!e.target.closest('.dd-operador')) fecharTodosDropdowns();
});

function transformarEmDropdown(select, classeExtra) {
    const container = document.createElement('div');
    container.className = classeExtra ? `dd-operador ${classeExtra}` : 'dd-operador';

    const trigger = document.createElement('div');
    trigger.className = 'dd-operador-trigger';
    trigger.tabIndex = 0;
    trigger.innerHTML = '<span class="dd-operador-label"></span><span class="dd-operador-seta">▼</span>';
    const label = trigger.querySelector('.dd-operador-label');

    const menu = document.createElement('div');
    menu.className = 'dd-operador-menu';
    container.appendChild(trigger);
    container.appendChild(menu);

    const sincronizar = () => {
        menu.innerHTML = '';
        label.textContent = '';
        const selecionada = select.options[select.selectedIndex];
        label.textContent = selecionada ? selecionada.textContent : '';
        trigger.classList.toggle('vazio', !select.value);
        if (container.classList.contains('dd-pilula')) {
            ['pendente', 'compareceu', 'faltou', 'finalizado', 'nao_finalizado'].forEach(s => trigger.classList.toggle('status-' + s, select.value === s));
        }

        const criarItem = (opt) => {
            if (opt.disabled) return;
            const el = document.createElement('div');
            const ativo = opt.value === select.value;
            el.className = 'dd-operador-item' + (ativo ? ' selecionado' : '');
            el.textContent = opt.textContent;
            if (container.classList.contains('dd-pilula')) el.classList.add('item-status-' + opt.value);
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                select.value = opt.value;
                sincronizar();
                select.dispatchEvent(new Event('change'));
                fecharTodosDropdowns();
            });
            menu.appendChild(el);
        };

        Array.from(select.children).forEach(no => {
            if (no.tagName === 'OPTGROUP') {
                const titulo = document.createElement('div');
                titulo.className = 'dd-operador-grupo';
                titulo.textContent = no.label;
                menu.appendChild(titulo);
                Array.from(no.children).forEach(criarItem);
            } else {
                criarItem(no);
            }
        });
    };

    const posicionarFixo = () => {
        const r = trigger.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.left = r.left + 'px';
        menu.style.top = (r.bottom + 4) + 'px';
        menu.style.minWidth = r.width + 'px';
    };

    const ajustarDirecao = () => {
        container.classList.remove('abre-cima');
        menu.style.maxHeight = '';
        const r = trigger.getBoundingClientRect();
        const abaixo = window.innerHeight - r.bottom - 16;
        const acima = r.top - 16;
        const alvo = Math.min(parseFloat(getComputedStyle(menu).maxHeight) || 220, 420);
        const natural = Math.min(menu.scrollHeight || alvo, alvo);
        if (abaixo < natural && acima > abaixo) {
            container.classList.add('abre-cima');
            menu.style.maxHeight = Math.max(140, Math.min(alvo, acima)) + 'px';
        } else {
            menu.style.maxHeight = Math.max(140, Math.min(alvo, abaixo)) + 'px';
        }
        if (container.classList.contains('dd-fixo') && container.classList.contains('abre-cima')) {
            menu.style.top = 'auto';
            menu.style.bottom = (window.innerHeight - r.top + 4) + 'px';
        }
    };

    const alternar = () => {
        if (select.disabled) return;
        if (menu.classList.contains('visivel')) { fecharTodosDropdowns(); return; }
        fecharTodosDropdowns();
        if (container.classList.contains('dd-fixo')) posicionarFixo();
        ajustarDirecao();
        menu.classList.add('visivel');
        trigger.classList.add('aberto');
        const ativo = menu.querySelector('.selecionado');
        if (ativo) menu.scrollTop = Math.max(0, ativo.offsetTop - 40);
    };
    trigger.addEventListener('click', (e) => { e.stopPropagation(); alternar(); });
    trigger.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); alternar(); }
        else if (e.key === 'Escape') fecharTodosDropdowns();
    });

    const descricao = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
    Object.defineProperty(select, 'value', {
        configurable: true,
        get() { return descricao.get.call(this); },
        set(v) { descricao.set.call(this, v); sincronizar(); }
    });
    new MutationObserver(sincronizar).observe(select, { childList: true });
    trigger.classList.toggle('desabilitado', select.disabled);

    select.classList.add('select-nativo-oculto');
    sincronizar();
    return { container, sincronizar };
}

(function () {
    const REGRAS = [
        { seletor: 'select.select-funcao', classe: 'dd-auto dd-fixo' },
        { seletor: 'select.select-marca-embutido', classe: 'dd-cheio dd-embutido' },
        { seletor: 'select.select-equipe-estilizado', classe: 'dd-cheio dd-login' },
        { seletor: 'select.select-filtro-status', classe: 'dd-auto' },
        { seletor: 'select.select-status-tabela', classe: 'dd-pilula dd-fixo' }
    ];

    function ativar() {
        REGRAS.forEach(regra => {
            document.querySelectorAll(regra.seletor).forEach(select => {
                if (select.dataset.ddAtivo || select.classList.contains('select-nativo-oculto')) return;
                select.dataset.ddAtivo = '1';
                const dd = transformarEmDropdown(select, regra.classe);
                select.parentNode.insertBefore(dd.container, select.nextSibling);
            });
        });
    }

    let agendado = false;
    function agendar() {
        if (agendado) return;
        agendado = true;
        requestAnimationFrame(() => { agendado = false; ativar(); });
    }

    document.addEventListener('scroll', (e) => {
        if (e.target.closest && e.target.closest('.dd-operador-menu')) return;
        document.querySelectorAll('.dd-fixo .dd-operador-menu.visivel').forEach(() => fecharTodosDropdowns());
    }, true);
    window.addEventListener('resize', fecharTodosDropdowns);

    const iniciar = () => {
        ativar();
        new MutationObserver(agendar).observe(document.body, { childList: true, subtree: true });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
    else iniciar();
})();
