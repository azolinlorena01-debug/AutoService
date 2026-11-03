(function () {
    const ICONES = {
        erro: '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10 5.8v5M10 13.6v.1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
        aviso: '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M10 2.8 18 16.5H2z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M10 8v4M10 14.2v.1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
        sucesso: '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="m6.4 10.3 2.4 2.4 4.8-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    };

    function detectarTipo(texto) {
        if (/^(n[ãa]o foi poss[ií]vel|erro|acesso restrito)/i.test(texto)) return 'erro';
        if (/sucesso|conclu[ií]d/i.test(texto)) return 'sucesso';
        return 'aviso';
    }

    function pilha() {
        let el = document.getElementById('aviso-pilha');
        if (!el) {
            el = document.createElement('div');
            el.id = 'aviso-pilha';
            el.className = 'aviso-pilha';
            el.setAttribute('aria-live', 'polite');
            document.body.appendChild(el);
        }
        return el;
    }

    function avisar(mensagem, tipo) {
        const texto = String(mensagem);
        const categoria = tipo || detectarTipo(texto);
        const item = document.createElement('div');
        item.className = `aviso aviso-${categoria}`;
        item.setAttribute('role', categoria === 'erro' ? 'alert' : 'status');
        item.innerHTML = `<span class="aviso-icone">${ICONES[categoria]}</span><span class="aviso-texto"></span><button type="button" class="aviso-fechar" aria-label="Fechar">&times;</button>`;
        item.querySelector('.aviso-texto').textContent = texto;
        const remover = () => {
            if (!item.parentNode) return;
            item.classList.add('saindo');
            setTimeout(() => item.remove(), 200);
        };
        item.querySelector('.aviso-fechar').addEventListener('click', remover);
        pilha().appendChild(item);
        requestAnimationFrame(() => item.classList.add('visivel'));
        setTimeout(remover, categoria === 'erro' ? 9000 : 5500);
    }

    function confirmar(mensagem, opcoes) {
        const config = Object.assign({ titulo: 'Confirmar', confirmar: 'Confirmar', cancelar: 'Cancelar', perigo: false }, opcoes || {});
        return new Promise(resolve => {
            const fundo = document.createElement('div');
            fundo.className = 'confirmar-fundo';
            fundo.innerHTML = `
                <div class="confirmar-card" role="dialog" aria-modal="true">
                    <h3 class="confirmar-titulo"></h3>
                    <p class="confirmar-texto"></p>
                    <div class="confirmar-acoes">
                        <button type="button" class="confirmar-btn confirmar-cancelar"></button>
                        <button type="button" class="confirmar-btn confirmar-ok${config.perigo ? ' perigo' : ''}"></button>
                    </div>
                </div>`;
            fundo.querySelector('.confirmar-titulo').textContent = config.titulo;
            fundo.querySelector('.confirmar-texto').textContent = String(mensagem);
            const btnOk = fundo.querySelector('.confirmar-ok');
            const btnCancelar = fundo.querySelector('.confirmar-cancelar');
            btnOk.textContent = config.confirmar;
            btnCancelar.textContent = config.cancelar;

            const fechar = (valor) => {
                document.removeEventListener('keydown', teclas, true);
                fundo.classList.remove('visivel');
                setTimeout(() => fundo.remove(), 160);
                resolve(valor);
            };
            const teclas = (e) => {
                if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fechar(false); }
            };
            document.addEventListener('keydown', teclas, true);
            btnOk.addEventListener('click', () => fechar(true));
            btnCancelar.addEventListener('click', () => fechar(false));
            fundo.addEventListener('click', (e) => { if (e.target === fundo) fechar(false); });
            document.body.appendChild(fundo);
            requestAnimationFrame(() => { fundo.classList.add('visivel'); btnCancelar.focus(); });
        });
    }

    function ocupado(ativo) {
        document.body.classList.toggle('ocupado', !!ativo);
    }

    function linhaCarregando(colunas, linhas) {
        const faixas = '<div class="esqueleto"></div>'.repeat(linhas || 4);
        return `<tr class="linha-esqueleto"><td colspan="${colunas}">${faixas}</td></tr>`;
    }

    function linhaVazia(colunas, titulo, dica) {
        const icone = '<svg class="estado-vazio-icone" viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><path d="M3 13h5l1.5 3h5L16 13h5M3 13l2.6-7.2A1.5 1.5 0 0 1 7 5h10a1.5 1.5 0 0 1 1.4.8L21 13v5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        const detalhe = dica ? `<span class="estado-vazio-dica">${dica}</span>` : '';
        return `<tr><td colspan="${colunas}" class="celula-vazia-mensagem estado-vazio">${icone}<strong class="estado-vazio-titulo">${titulo}</strong>${detalhe}</td></tr>`;
    }

    const ICONE_CADEADO = '<svg viewBox="0 0 20 20" width="13" height="13" aria-hidden="true"><rect x="4" y="9" width="12" height="8" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M7 9V6.5a3 3 0 0 1 6 0V9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';

    function definirSeloFechado(fechado) {
        document.querySelectorAll('.selo-fechado').forEach(selo => {
            if (!selo.dataset.pronto) {
                selo.innerHTML = `${ICONE_CADEADO}<span>Mês fechado</span>`;
                selo.dataset.pronto = '1';
            }
            selo.classList.toggle('oculto', !fechado);
        });
    }

    async function atualizarSeloFechado(client, mes) {
        if (!mes) { definirSeloFechado(false); return; }
        try {
            const { data } = await client.from('meses_fechados').select('mes').eq('mes', mes);
            definirSeloFechado(Array.isArray(data) && data.length > 0);
        } catch (e) {
            definirSeloFechado(false);
        }
    }

    function pintarBarraMeta(barra, percentual) {
        if (!barra) return;
        barra.classList.remove('meta-baixa', 'meta-media', 'meta-alta');
        barra.classList.add(percentual >= 80 ? 'meta-alta' : (percentual >= 50 ? 'meta-media' : 'meta-baixa'));
    }

    function definirContador(elemento, quantidade) {
        if (!elemento) return;
        let marca = elemento.querySelector('.contador-menu');
        if (!quantidade) {
            if (marca) marca.remove();
            return;
        }
        if (!marca) {
            marca = document.createElement('span');
            marca.className = 'contador-menu';
            elemento.appendChild(marca);
        }
        marca.textContent = quantidade > 99 ? '99+' : String(quantidade);
    }

    async function atualizarContadorDivergencias(client, opcoes) {
        try {
            const { data: { session } } = await client.auth.getSession();
            if (!session || !session.user) return;
            const id = session.user.id;
            const { data: perfil } = await client.from('perfis').select('role').eq('id', id).maybeSingle();
            const admin = !!perfil && perfil.role === 'admin';
            const { data, error } = await client.from('divergencias').select('status, resolvido_em');
            if (error || !Array.isArray(data)) return;
            const chave = `divergenciasVistas_${id}`;
            let quantidade;
            if (admin) {
                quantidade = data.filter(d => d.status === 'aberta').length;
            } else {
                let visto = 0;
                try { visto = Number(localStorage.getItem(chave)) || 0; } catch (e) {}
                quantidade = data.filter(d => d.status !== 'aberta' && d.resolvido_em && new Date(d.resolvido_em).getTime() > visto).length;
                if (opcoes && opcoes.marcarVisto) {
                    try { localStorage.setItem(chave, String(Date.now())); } catch (e) {}
                    quantidade = 0;
                }
            }
            definirContador(document.getElementById(admin ? 'link-menu-admin' : 'link-menu-divergencias'), quantidade);
            document.querySelectorAll('#abas-gestao a[href="divergencias.html"]').forEach(a => definirContador(a, admin ? quantidade : 0));
        } catch (e) {}
    }

    window.definirSeloFechado = definirSeloFechado;
    window.atualizarSeloFechado = atualizarSeloFechado;
    window.pintarBarraMeta = pintarBarraMeta;
    window.atualizarContadorDivergencias = atualizarContadorDivergencias;
    window.linhaCarregando = linhaCarregando;
    window.linhaVazia = linhaVazia;
    window.avisar = avisar;
    window.confirmar = confirmar;
    window.ocupado = ocupado;
})();
