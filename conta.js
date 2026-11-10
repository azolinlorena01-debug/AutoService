(function () {
    const SUPABASE_URL = 'https://potvtrepcoswvzmkewic.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_iMbay5YOnrrehpqI9qU7HA_vMapr-DY';
    if (!window.supabase) return;
    const cliente = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    let saidaVoluntaria = false;
    let encerrando = false;

    function aviso(texto, tipo) {
        if (typeof window.avisar === 'function') window.avisar(texto, tipo);
    }

    function encerrarSessao() {
        if (encerrando || saidaVoluntaria) return;
        encerrando = true;
        try { sessionStorage.setItem('sessao_expirada', '1'); } catch (e) {}
        aviso('Sua sessão expirou. Entre novamente para continuar.');
        setTimeout(() => { window.location.href = 'login.html'; }, 1800);
    }

    document.addEventListener('click', e => {
        if (e.target.closest && e.target.closest('#btn-sair-header')) saidaVoluntaria = true;
    }, true);

    cliente.auth.onAuthStateChange(evento => {
        if (evento === 'SIGNED_OUT') encerrarSessao();
    });

    async function verificarSessao() {
        if (encerrando || saidaVoluntaria) return;
        try {
            const { data, error } = await cliente.auth.getSession();
            if (error) return;
            if (!data || !data.session) encerrarSessao();
        } catch (e) {}
    }

    setInterval(verificarSessao, 120000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) verificarSessao(); });
    const ICONE_SINO = '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M5 8a5 5 0 0 1 10 0c0 4 1.6 5.2 1.6 5.2H3.4S5 12 5 8z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M8.3 15.6a1.8 1.8 0 0 0 3.4 0" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';

    function escaparHtml(texto) {
        return String(texto === null || texto === undefined ? '' : texto).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function dataLocalISO(data) {
        return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
    }

    async function coletarNotificacoes() {
        const itens = [];
        const { data: dadosSessao } = await cliente.auth.getSession();
        const usuario = dadosSessao && dadosSessao.session ? dadosSessao.session.user : null;
        if (!usuario) return itens;
        let perfil = null;
        try {
            const { data } = await cliente.from('perfis').select('role, equipe').eq('id', usuario.id).maybeSingle();
            perfil = data;
        } catch (e) {}
        const admin = !!perfil && perfil.role === 'admin';
        const toyota = admin || /toyota/i.test((perfil && perfil.equipe) || '');

        try {
            const { data } = await cliente.from('divergencias').select('status, resolvido_em');
            if (Array.isArray(data)) {
                if (admin) {
                    const abertas = data.filter(d => d.status === 'aberta').length;
                    if (abertas) itens.push({ tipo: 'alerta', texto: `${abertas} ${abertas === 1 ? 'divergência aguardando resposta' : 'divergências aguardando resposta'}`, href: 'divergencias.html' });
                } else {
                    let visto = 0;
                    try { visto = Number(localStorage.getItem(`divergenciasVistas_${usuario.id}`)) || 0; } catch (e) {}
                    const respondidas = data.filter(d => d.status !== 'aberta' && d.resolvido_em && new Date(d.resolvido_em).getTime() > visto).length;
                    if (respondidas) itens.push({ tipo: 'info', texto: `${respondidas} ${respondidas === 1 ? 'divergência respondida' : 'divergências respondidas'}`, href: 'divergencias.html' });
                }
            }
        } catch (e) {}

        if (admin) {
            try {
                const hoje = new Date();
                const anterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
                const mes = `${anterior.getFullYear()}-${String(anterior.getMonth() + 1).padStart(2, '0')}`;
                const { data, error } = await cliente.from('meses_fechados').select('mes').eq('mes', mes);
                if (!error && Array.isArray(data) && data.length === 0) {
                    itens.push({ tipo: 'alerta', texto: `O mês ${mes.split('-').reverse().join('/')} ainda não foi fechado`, href: 'admin.html#fechamento' });
                }
            } catch (e) {}
        }

        if (toyota) {
            try {
                const { count, error } = await cliente.from('almoco_itens').select('id', { count: 'exact', head: true }).eq('data', dataLocalISO(new Date())).is('responsavel_id', null).eq('status', 'pendente');
                if (!error && count) itens.push({ tipo: 'alerta', texto: `${count} ${count === 1 ? 'evento de almoço sem responsável' : 'eventos de almoço sem responsável'} hoje`, href: 'almoco.html' });
            } catch (e) {}
        }
        return itens;
    }

    function montarSino() {
        const sair = document.getElementById('btn-sair-header');
        if (!sair || document.getElementById('btn-sino')) return;
        const envoltorio = document.createElement('div');
        envoltorio.className = 'sino-envoltorio';
        envoltorio.innerHTML = `<button type="button" id="btn-sino" class="botao-sino-header" aria-label="Notificações" aria-expanded="false">${ICONE_SINO}<span class="sino-contador oculto" id="sino-contador">0</span></button><div id="painel-sino" class="painel-sino oculto" role="dialog" aria-label="Notificações"><div class="painel-sino-topo">Notificações</div><ul class="painel-sino-lista" id="lista-sino"></ul></div>`;
        sair.parentNode.insertBefore(envoltorio, sair);
        const botao = envoltorio.querySelector('#btn-sino');
        const painel = envoltorio.querySelector('#painel-sino');
        const contador = envoltorio.querySelector('#sino-contador');
        const lista = envoltorio.querySelector('#lista-sino');

        function pintar(itens) {
            contador.textContent = String(itens.length);
            contador.classList.toggle('oculto', itens.length === 0);
            lista.innerHTML = itens.length
                ? itens.map(i => `<li><a class="item-sino item-sino-${i.tipo}" href="${i.href}"><span class="ponto-sino"></span><span>${escaparHtml(i.texto)}</span></a></li>`).join('')
                : '<li class="sino-vazio">Nenhuma pendência no momento.</li>';
        }

        async function atualizar() {
            let itens = null;
            try { itens = await coletarNotificacoes(); } catch (e) {}
            if (!itens) return;
            pintar(itens);
            try { localStorage.setItem('sino-painel', JSON.stringify(itens)); } catch (e) {}
        }

        try {
            const salvo = JSON.parse(localStorage.getItem('sino-painel'));
            if (Array.isArray(salvo)) pintar(salvo);
        } catch (e) {}

        function alternar(abrir) {
            painel.classList.toggle('oculto', !abrir);
            botao.setAttribute('aria-expanded', abrir ? 'true' : 'false');
            if (abrir) atualizar();
        }

        botao.addEventListener('click', e => {
            e.stopPropagation();
            alternar(painel.classList.contains('oculto'));
        });
        document.addEventListener('click', e => {
            if (!envoltorio.contains(e.target)) alternar(false);
        });
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') alternar(false);
        });
        atualizar();
        setInterval(() => { if (!document.hidden) atualizar(); }, 180000);
    }

    montarSino();
    new MutationObserver(montarSino).observe(document.documentElement, { childList: true, subtree: true });
    function rotularTabelas() {
        document.querySelectorAll('.tabela-container table').forEach(tabela => {
            const cabecalhos = Array.from(tabela.querySelectorAll('thead th')).map(th => th.textContent.trim().replace(/\s+/g, ' '));
            if (!cabecalhos.length) return;
            tabela.querySelectorAll('tbody tr').forEach(tr => {
                const celulas = Array.from(tr.children).filter(el => el.tagName === 'TD');
                if (celulas.length !== cabecalhos.length) return;
                celulas.forEach((td, i) => {
                    if (td.dataset.label !== cabecalhos[i]) td.dataset.label = cabecalhos[i];
                });
            });
        });
    }

    let rotuloAgendado = false;
    function agendarRotulos() {
        if (rotuloAgendado) return;
        rotuloAgendado = true;
        requestAnimationFrame(() => { rotuloAgendado = false; rotularTabelas(); });
    }

    rotularTabelas();
    new MutationObserver(agendarRotulos).observe(document.documentElement, { childList: true, subtree: true });
})();
