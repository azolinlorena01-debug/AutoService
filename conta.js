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
})();
