(function () {
    try {
        if (!sessionStorage.getItem('painel-sessao')) {
            sessionStorage.setItem('painel-sessao', '1');
            if (/\/(index\.html)?$/i.test(location.pathname) && localStorage.getItem('pagina-inicial-painel') !== 'agendamentos') location.replace('inicio.html');
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

    const CHAVE_ANIMACOES = 'animacoes-painel';

    window.animacoesAtivas = function () {
        let salvo = null;
        try { salvo = localStorage.getItem(CHAVE_ANIMACOES); } catch (e) {}
        if (salvo === '0') return false;
        if (salvo === '1') return true;
        return !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    };

    function aplicarAnimacoes() {
        document.documentElement.setAttribute('data-animacoes', window.animacoesAtivas() ? 'ligadas' : 'desligadas');
    }

    function definirAnimacoes(ligadas) {
        try { localStorage.setItem(CHAVE_ANIMACOES, ligadas ? '1' : '0'); } catch (e) {}
        aplicarAnimacoes();
    }

    const PREFERENCIAS = {
        texto: { chave: 'texto-painel', padrao: 'normal', atributo: 'data-texto' },
        densidade: { chave: 'densidade-painel', padrao: 'confortavel', atributo: 'data-densidade' },
        notificacoes: { chave: 'notificacoes-painel', padrao: 'ligadas', atributo: 'data-notificacoes' },
        paginaInicial: { chave: 'pagina-inicial-painel', padrao: 'inicio', atributo: null }
    };

    function lerPreferencia(nome) {
        const p = PREFERENCIAS[nome];
        try { return localStorage.getItem(p.chave) || p.padrao; } catch (e) { return p.padrao; }
    }

    function salvarPreferencia(nome, valor) {
        const p = PREFERENCIAS[nome];
        try { localStorage.setItem(p.chave, valor); } catch (e) {}
        aplicarPreferencias();
    }

    function aplicarPreferencias() {
        Object.keys(PREFERENCIAS).forEach(nome => {
            const p = PREFERENCIAS[nome];
            if (p.atributo) document.documentElement.setAttribute(p.atributo, lerPreferencia(nome));
        });
    }

    window.paginaInicialPainel = function () {
        return lerPreferencia('paginaInicial') === 'agendamentos' ? 'index.html' : 'inicio.html';
    };

    function infoVersao() {
        const script = document.querySelector('script[src*="tema.js"]');
        const m = /v=(\d{4})(\d{2})(\d{2})([a-z]?)/.exec(script ? script.getAttribute('src') : '');
        return m ? { data: `${m[3]}/${m[2]}/${m[1]}`, build: m[0].slice(2) } : null;
    }

    function opcoesPreferencia(nome, opcoes) {
        const atual = lerPreferencia(nome);
        return `<div class="config-opcoes">${opcoes.map(o => `<button type="button" class="config-opcao${atual === o[0] ? ' ativo' : ''}" data-config="pref" data-pref="${nome}" data-valor="${o[0]}">${o[1]}</button>`).join('')}</div>`;
    }

    function abrirConfiguracoes() {
        let overlay = document.getElementById('modal-configuracoes');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'modal-configuracoes';
            overlay.className = 'modal-overlay';
            overlay.addEventListener('click', e => { if (e.target === overlay) overlay.style.display = 'none'; });
            document.addEventListener('keydown', e => { if (e.key === 'Escape') overlay.style.display = 'none'; });
            document.body.appendChild(overlay);
        }
        const escuro = document.documentElement.getAttribute('data-tema') === 'escuro';
        const animar = window.animacoesAtivas();
        const versaoInfo = infoVersao();
        overlay.innerHTML = `
            <div class="modal-card-metas modal-configuracoes-card">
                <div class="modal-topo-metas">
                    <h3>Configurações</h3>
                    <button type="button" class="btn-fechar-modal-metas" data-config="fechar">&times;</button>
                </div>
                <div class="modal-corpo-metas">
                    <div class="config-grupo">Aparência</div>
                    <div class="config-linha">
                        <div class="config-texto"><strong>Tema</strong><small>Modo claro ou escuro do sistema.</small></div>
                        <div class="config-opcoes">
                            <button type="button" class="config-opcao${escuro ? '' : ' ativo'}" data-config="tema" data-valor="claro">Claro</button>
                            <button type="button" class="config-opcao${escuro ? ' ativo' : ''}" data-config="tema" data-valor="escuro">Escuro</button>
                        </div>
                    </div>
                    <div class="config-linha">
                        <div class="config-texto"><strong>Tamanho do texto</strong><small>Aumenta o conteúdo das telas para facilitar a leitura.</small></div>
                        ${opcoesPreferencia('texto', [['normal', 'Normal'], ['grande', 'Grande']])}
                    </div>
                    <div class="config-linha">
                        <div class="config-texto"><strong>Densidade das tabelas</strong><small>A compacta mostra mais linhas sem rolar a tela.</small></div>
                        ${opcoesPreferencia('densidade', [['confortavel', 'Confortável'], ['compacta', 'Compacta']])}
                    </div>
                    <div class="config-linha">
                        <div class="config-texto"><strong>Animações</strong><small>Transições entre telas, entrada dos blocos e efeito do login.</small></div>
                        <button type="button" class="config-interruptor" role="switch" aria-checked="${animar}" aria-label="Animações" data-config="animacoes"></button>
                    </div>
                    <div class="config-grupo">Navegação</div>
                    <div class="config-linha">
                        <div class="config-texto"><strong>Página inicial</strong><small>Tela aberta ao entrar no sistema.</small></div>
                        ${opcoesPreferencia('paginaInicial', [['inicio', 'Início'], ['agendamentos', 'Agendamentos']])}
                    </div>
                    <div class="config-linha">
                        <div class="config-texto"><strong>Notificações</strong><small>Exibe o sino com as pendências no topo.</small></div>
                        <button type="button" class="config-interruptor" role="switch" aria-checked="${lerPreferencia('notificacoes') === 'ligadas'}" aria-label="Notificações" data-config="notificacoes"></button>
                    </div>
                    <div class="config-grupo">Sobre o sistema</div>
                    <div class="config-sobre">
                        <div><span>Sistema</span><strong>Painel de Bônus · AutoService</strong></div>
                        <div><span>Versão</span><strong>1.0${versaoInfo ? ' · build ' + versaoInfo.build : ''}</strong></div>
                        ${versaoInfo ? `<div><span>Última atualização</span><strong>${versaoInfo.data}</strong></div>` : ''}
                    </div>
                </div>
                <div class="modal-rodape-metas">
                    <button type="button" class="btn-salvar-modal" data-config="fechar">Fechar</button>
                </div>
            </div>
        `;
        overlay.onclick = e => {
            if (e.target === overlay) { overlay.style.display = 'none'; return; }
            const alvo = e.target.closest('[data-config]');
            if (!alvo) return;
            const acao = alvo.getAttribute('data-config');
            if (acao === 'fechar') overlay.style.display = 'none';
            if (acao === 'tema') {
                const novo = alvo.getAttribute('data-valor');
                salvarTema(novo);
                aplicarTema(novo);
                overlay.querySelectorAll('[data-config="tema"]').forEach(b => b.classList.toggle('ativo', b === alvo));
            }
            if (acao === 'pref') {
                salvarPreferencia(alvo.getAttribute('data-pref'), alvo.getAttribute('data-valor'));
                alvo.parentElement.querySelectorAll('[data-config="pref"]').forEach(b => b.classList.toggle('ativo', b === alvo));
            }
            if (acao === 'notificacoes') {
                const ligar = alvo.getAttribute('aria-checked') !== 'true';
                alvo.setAttribute('aria-checked', String(ligar));
                salvarPreferencia('notificacoes', ligar ? 'ligadas' : 'desligadas');
            }
            if (acao === 'animacoes') {
                const ligar = alvo.getAttribute('aria-checked') !== 'true';
                alvo.setAttribute('aria-checked', String(ligar));
                definirAnimacoes(ligar);
            }
        };
        overlay.style.display = 'flex';
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
    aplicarAnimacoes();
    aplicarPreferencias();
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
        config: SVG('<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>'),
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
        const config = document.createElement('button');
        config.type = 'button';
        config.className = 'ml-fixar ml-config';
        config.title = 'Configurações';
        config.innerHTML = `<span class="ml-icone">${ICONES.config}</span><span class="ml-texto">Configurações</span>`;
        config.addEventListener('click', abrirConfiguracoes);
        aside.appendChild(config);
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

    let entradaFeita = false;

    window.entradaPagina = function (alvos) {
        if (entradaFeita) return;
        entradaFeita = true;
        if (!window.animacoesAtivas()) return;
        const centroX = window.innerWidth / 2;
        const centroY = window.innerHeight / 2;
        Array.from(alvos).forEach((el, i) => {
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) return;
            el.style.setProperty('--bx', Math.round(centroX - (r.left + r.width / 2)) + 'px');
            el.style.setProperty('--by', Math.round(centroY - (r.top + r.height / 2)) + 'px');
            el.style.setProperty('--b-atraso', Math.min(i, 14) * 45 + 'ms');
            el.classList.add('entrada-bolha');
            el.addEventListener('animationend', () => el.classList.remove('entrada-bolha'), { once: true });
        });
    };

    window.mostrarConteudo = function () {
        document.querySelectorAll('.conteudo-carregando').forEach(e => e.classList.remove('conteudo-carregando'));
        if (document.body && !document.body.classList.contains('pagina-inicio') && !document.body.classList.contains('corpo-login')) {
            requestAnimationFrame(() => window.entradaPagina(document.querySelectorAll('main > *:not(.oculto):not(script):not(style):not(#abas-gestao)')));
        }
    };

    aplicarTema(lerTema());

    document.addEventListener('DOMContentLoaded', () => {
        if (document.body.classList.contains('corpo-login')) window.limparMenuCache();
        criarBotaoTema();
        const menuSalvo = lerMenu();
        if (menuSalvo && menuSalvo.admin) document.querySelectorAll('#abas-gestao.oculto').forEach(e => e.classList.remove('oculto'));
        setTimeout(window.mostrarConteudo, 8000);
    });

    if (location.protocol.startsWith('http') && window.HTMLScriptElement && HTMLScriptElement.supports && HTMLScriptElement.supports('speculationrules')) {
        const regras = document.createElement('script');
        regras.type = 'speculationrules';
        regras.textContent = JSON.stringify({ prerender: [{ where: { selector_matches: '.link-nav, #abas-gestao a' }, eagerness: 'moderate' }] });
        document.head.appendChild(regras);
    }
})();
