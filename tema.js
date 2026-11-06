(function () {
    try {
        if (!sessionStorage.getItem('painel-sessao')) {
            sessionStorage.setItem('painel-sessao', '1');
            if (/\/(index\.html)?$/i.test(location.pathname)) location.replace('inicio.html');
        }
    } catch (e) {}

    const CHAVE = 'tema-painel';
    const CHAVE_MENU = 'menu-painel';

    function lerTema() {
        try {
            return localStorage.getItem(CHAVE) === 'escuro' ? 'escuro' : 'claro';
        } catch (e) {
            return 'claro';
        }
    }

    function salvarTema(tema) {
        try {
            localStorage.setItem(CHAVE, tema);
        } catch (e) {}
    }

    function aplicarTema(tema) {
        document.documentElement.setAttribute('data-tema', tema);
        document.documentElement.style.backgroundColor = tema === 'escuro' ? '#0b1220' : '#f8fafc';
        const botao = document.getElementById('btn-tema');
        if (botao) botao.textContent = tema === 'escuro' ? 'Modo claro' : 'Modo escuro';
    }

    function lerMenu() {
        try {
            return JSON.parse(localStorage.getItem(CHAVE_MENU)) || null;
        } catch (e) {
            return null;
        }
    }

    window.salvarMenuCache = function (html, admin) {
        try {
            localStorage.setItem(CHAVE_MENU, JSON.stringify({ html: html, admin: !!admin }));
        } catch (e) {}
    };

    window.limparMenuCache = function () {
        try {
            localStorage.removeItem(CHAVE_MENU);
            localStorage.removeItem('almoco-painel');
        } catch (e) {}
    };

    function criarBotaoTema() {
        if (document.getElementById('btn-tema')) return;

        const botao = document.createElement('button');
        botao.type = 'button';
        botao.id = 'btn-tema';

        const menu = document.querySelector('.navegacao-menu');
        if (menu) {
            botao.className = 'link-nav btn-tema';
            menu.insertBefore(botao, document.getElementById('area-autenticacao'));
        } else {
            botao.className = 'btn-tema btn-tema-flutuante';
            document.body.appendChild(botao);
        }

        botao.addEventListener('click', () => {
            const novo = document.documentElement.getAttribute('data-tema') === 'escuro' ? 'claro' : 'escuro';
            const raiz = document.documentElement;
            raiz.classList.add('trocando-tema');
            salvarTema(novo);
            aplicarTema(novo);
            setTimeout(() => raiz.classList.remove('trocando-tema'), 450);
            document.dispatchEvent(new CustomEvent('tema-alterado', { detail: novo }));
        });

        aplicarTema(lerTema());
    }

    window.mostrarLinksAdmin = function () {
        const gestao = document.getElementById('link-menu-admin');
        const divergencias = document.getElementById('link-menu-divergencias');
        if (gestao) gestao.classList.remove('oculto');
        if (divergencias) {
            if (divergencias.classList.contains('ativo') && gestao) {
                gestao.classList.add('ativo');
                divergencias.classList.remove('ativo');
            }
            divergencias.classList.add('oculto');
        }
    };

    const MENU_LATERAL = true;
    const CHAVE_MENU_FIXO = 'menu-lateral-fixo';
    const SVG = c => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${c}</svg>`;
    const ICONES = {
        inicio: SVG('<path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>'),
        agendamentos: SVG('<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 10h18M9 15l2 2 4-4"/>'),
        almoco: SVG('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
        divergencias: SVG('<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>'),
        gestao: SVG('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
        relatorios: SVG('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
        fixar: SVG('<path d="M9 4h6l-1 6 3 3H7l3-3-1-6zM12 13v8"/>')
    };

    function iconeDoLink(a) {
        const h = (a.getAttribute('href') || '').toLowerCase();
        if (h.startsWith('inicio')) return ICONES.inicio;
        if (h.startsWith('index')) return ICONES.agendamentos;
        if (h.startsWith('almoco')) return ICONES.almoco;
        if (h.startsWith('divergencias')) return ICONES.divergencias;
        if (h.startsWith('admin')) return ICONES.gestao;
        return ICONES.relatorios;
    }

    function garantirLinkInicio(links) {
        if (document.getElementById('link-menu-inicio')) return;
        const a = document.createElement('a');
        a.href = 'inicio.html';
        a.id = 'link-menu-inicio';
        a.className = 'link-nav' + (document.body.classList.contains('pagina-inicio') ? ' ativo' : '');
        a.textContent = 'Início';
        links.insertBefore(a, links.firstChild);
    }

    function montarMenuLateral() {
        const links = document.querySelector('.links-paginas');
        if (!links) return;
        garantirLinkInicio(links);
        if (!MENU_LATERAL || document.getElementById('menu-lateral')) return;

        let fixo = false;
        try { fixo = localStorage.getItem(CHAVE_MENU_FIXO) === '1'; } catch (e) {}

        const aside = document.createElement('aside');
        aside.id = 'menu-lateral';
        aside.className = 'menu-lateral';
        const nav = document.createElement('nav');
        nav.className = 'menu-lateral-links';
        aside.appendChild(nav);

        Array.from(links.querySelectorAll('a.link-nav')).forEach(a => {
            const texto = a.textContent.trim();
            a.title = texto;
            a.innerHTML = `<span class="ml-icone">${iconeDoLink(a)}</span><span class="ml-texto">${texto}</span>`;
            nav.appendChild(a);
        });

        const fixar = document.createElement('button');
        fixar.type = 'button';
        fixar.className = 'ml-fixar';
        fixar.title = 'Fixar menu';
        fixar.innerHTML = `<span class="ml-icone">${ICONES.fixar}</span><span class="ml-texto">Fixar menu</span>`;
        fixar.addEventListener('click', () => {
            const novo = !document.body.classList.contains('ml-fixo');
            document.body.classList.toggle('ml-fixo', novo);
            try { localStorage.setItem(CHAVE_MENU_FIXO, novo ? '1' : '0'); } catch (e) {}
        });
        aside.appendChild(fixar);

        document.body.classList.add('menu-lateral-ativo');
        document.body.classList.toggle('ml-fixo', fixo);
        document.body.insertBefore(aside, document.body.firstChild);
        links.classList.add('oculto-lateral');
    }

    window.montarMenu = function () {
        const menu = lerMenu();
        const area = document.getElementById('area-autenticacao');
        if (menu && area && !area.innerHTML.trim()) area.innerHTML = menu.html;
        try {
            if (localStorage.getItem('almoco-painel') === '1') {
                const almoco = document.getElementById('link-menu-almoco');
                if (almoco) almoco.classList.remove('oculto');
            }
        } catch (e) {}
        if (menu && menu.admin) {
            window.mostrarLinksAdmin();
        }
        criarBotaoTema();
        montarMenuLateral();
    };

    window.mostrarConteudo = function () {
        document.querySelectorAll('.conteudo-carregando').forEach(e => e.classList.remove('conteudo-carregando'));
    };

    aplicarTema(lerTema());

    document.addEventListener('DOMContentLoaded', () => {
        if (document.body.classList.contains('corpo-login')) window.limparMenuCache();
        criarBotaoTema();
        const menuSalvo = lerMenu();
        if (menuSalvo && menuSalvo.admin) document.querySelectorAll('#abas-gestao.oculto').forEach(e => e.classList.remove('oculto'));
        setTimeout(window.mostrarConteudo, 8000);
    });
})();
