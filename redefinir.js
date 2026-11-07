document.addEventListener('DOMContentLoaded', function() {
    const SUPABASE_URL = 'https://potvtrepcoswvzmkewic.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_iMbay5YOnrrehpqI9qU7HA_vMapr-DY';
    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    const form = document.getElementById('formulario-redefinir');
    const campoNova = document.getElementById('campo-nova');
    const campoConfirma = document.getElementById('campo-confirma');
    const botao = document.getElementById('btn-redefinir');
    const mensagemStatus = document.getElementById('mensagem-status');
    let pronto = false;

    function exibirMensagem(texto, tipo = 'erro') {
        mensagemStatus.textContent = texto;
        mensagemStatus.className = tipo === 'sucesso' ? 'mensagem-status admin-val-sucesso' : 'mensagem-status admin-val-perigo';
    }

    function liberar() {
        if (pronto) return;
        pronto = true;
        botao.disabled = false;
        botao.textContent = 'Salvar nova senha';
        mensagemStatus.textContent = '';
    }

    supabaseClient.auth.onAuthStateChange((evento, sessao) => {
        if (evento === 'PASSWORD_RECOVERY' || (evento === 'SIGNED_IN' && sessao)) liberar();
    });

    setTimeout(async () => {
        if (pronto) return;
        const { data } = await supabaseClient.auth.getSession();
        if (data && data.session) {
            liberar();
        } else {
            botao.textContent = 'Link inválido';
            exibirMensagem('Este link é inválido ou expirou. Volte ao login e solicite um novo em "Esqueci minha senha".');
        }
    }, 2500);

    form.addEventListener('submit', async e => {
        e.preventDefault();
        if (!pronto) return;
        const nova = campoNova.value;
        if (nova.length < 8) { exibirMensagem('A senha precisa ter pelo menos 8 caracteres.'); return; }
        if (nova !== campoConfirma.value) { exibirMensagem('A confirmação não confere com a nova senha.'); return; }
        botao.disabled = true;
        botao.textContent = 'Salvando...';
        try {
            const { error } = await supabaseClient.auth.updateUser({ password: nova });
            if (error) {
                exibirMensagem(/different|same/i.test(error.message || '') ? 'A nova senha deve ser diferente da atual.' : 'Não foi possível salvar a senha. Solicite um novo link e tente de novo.');
                botao.disabled = false;
                botao.textContent = 'Salvar nova senha';
                return;
            }
            exibirMensagem('Senha alterada com sucesso. Redirecionando para o login...', 'sucesso');
            await supabaseClient.auth.signOut();
            setTimeout(() => { window.location.href = 'login.html'; }, 1800);
        } catch (err) {
            exibirMensagem('Não foi possível salvar a senha. Tente novamente.');
            botao.disabled = false;
            botao.textContent = 'Salvar nova senha';
        }
    });

    document.querySelectorAll('.campo-olho').forEach(b => {
        b.addEventListener('click', () => {
            const alvo = document.getElementById(b.dataset.alvo);
            const mostrar = alvo.type === 'password';
            alvo.type = mostrar ? 'text' : 'password';
            b.classList.toggle('ativo', mostrar);
            b.setAttribute('aria-label', mostrar ? 'Ocultar senha' : 'Mostrar senha');
        });
    });
});
