(function () {
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
