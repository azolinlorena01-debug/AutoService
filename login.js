document.addEventListener('DOMContentLoaded', async function() {
    const SUPABASE_URL = 'https://potvtrepcoswvzmkewic.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_iMbay5YOnrrehpqI9qU7HA_vMapr-DY';
    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session && session.user) {
        window.location.href = 'inicio.html';
        return;
    }

    const abaEntrar = document.getElementById('aba-entrar');
    const abaCadastrar = document.getElementById('aba-cadastrar');
    const grupoNome = document.getElementById('grupo-nome');
    const grupoEquipe = document.getElementById('grupo-equipe');
    const campoNome = document.getElementById('campo-nome');
    const campoEmail = document.getElementById('campo-email');
    const campoSenha = document.getElementById('campo-senha');
    const grupoSenhaConfirma = document.getElementById('grupo-senha-confirma');
    const campoSenhaConfirma = document.getElementById('campo-senha-confirma');
    const campoEquipe = document.getElementById('campo-equipe');
    const btnSubmit = document.getElementById('btn-submit-auth');
    const subtituloLogin = document.getElementById('subtitulo-login');
    const mensagemStatus = document.getElementById('mensagem-status');
    const form = document.getElementById('formulario-autenticacao');
    const btnEsqueci = document.getElementById('btn-esqueci-senha');

    let modoAtual = 'entrar';

    function exibirMensagem(texto, tipo = 'erro') {
        mensagemStatus.textContent = texto;
        if (tipo === 'sucesso') {
            mensagemStatus.className = 'mensagem-status admin-val-sucesso';
        } else {
            mensagemStatus.className = 'mensagem-status admin-val-perigo';
        }
    }

    try {
        if (sessionStorage.getItem('sessao_expirada')) {
            sessionStorage.removeItem('sessao_expirada');
            exibirMensagem('Sua sessão expirou. Entre novamente para continuar.');
        }
    } catch (e) {}

    abaEntrar.addEventListener('click', () => {
        modoAtual = 'entrar';
        abaEntrar.classList.add('ativa');
        abaCadastrar.classList.remove('ativa');
        grupoNome.classList.add('oculto');
        grupoEquipe.classList.add('oculto');
        
        grupoSenhaConfirma.classList.add('oculto');
        campoSenhaConfirma.removeAttribute('required');
        campoEquipe.removeAttribute('required');
        
        btnSubmit.textContent = 'Acessar Painel';
        subtituloLogin.textContent = 'Acesse sua conta para continuar';
        mensagemStatus.textContent = '';
        btnEsqueci.classList.remove('oculto');
    });

    abaCadastrar.addEventListener('click', () => {
        modoAtual = 'cadastrar';
        abaCadastrar.classList.add('ativa');
        abaEntrar.classList.remove('ativa');
        grupoNome.classList.remove('oculto');
        grupoEquipe.classList.remove('oculto');
        
        grupoSenhaConfirma.classList.remove('oculto');
        campoSenhaConfirma.setAttribute('required', 'required');
        campoEquipe.setAttribute('required', 'required');
        
        btnSubmit.textContent = 'Cadastrar Conta';
        subtituloLogin.textContent = 'Crie seu perfil no sistema';
        mensagemStatus.textContent = '';
        btnEsqueci.classList.add('oculto');
    });

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const email = campoEmail.value.trim();
        const senha = campoSenha.value;

        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Processando...';
        mensagemStatus.textContent = '';

        try {
            if (modoAtual === 'entrar') {
                const { data, error } = await supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: senha
                });

                if (error) throw error;

                exibirMensagem('Login realizado com sucesso! Redirecionando...', 'sucesso');
                setTimeout(() => {
                    window.location.href = 'inicio.html';
                }, 700);

            } else {
                const nomeCompleto = campoNome.value.trim();
                const equipeSelecionada = campoEquipe.value;
                const senhaConfirma = campoSenhaConfirma.value;

                const partesNome = nomeCompleto.split(/\s+/).filter(p => p.length >= 2);
                if (partesNome.length < 2) {
                    exibirMensagem('Por favor, informe seu nome e sobrenome completos.');
                    btnSubmit.disabled = false;
                    btnSubmit.textContent = 'Cadastrar Conta';
                    return;
                }
                
                if (senha !== senhaConfirma) {
                    exibirMensagem('As senhas não coincidem. Digite novamente.');
                    btnSubmit.disabled = false;
                    btnSubmit.textContent = 'Cadastrar Conta';
                    return;
                }

                if (!equipeSelecionada) {
                    exibirMensagem('Por favor, selecione sua marca ou equipe de trabalho.');
                    btnSubmit.disabled = false;
                    btnSubmit.textContent = 'Cadastrar Conta';
                    return;
                }

                const { data, error } = await supabaseClient.auth.signUp({
                    email: email,
                    password: senha,
                    options: {
                        data: {
                            nome_completo: nomeCompleto,
                            equipe: equipeSelecionada
                        }
                    }
                });

                if (error) throw error;

                if (data.user) {
                    await supabaseClient.from('perfis').upsert({
                        id: data.user.id,
                        nome: nomeCompleto,
                        equipe: equipeSelecionada,
                        role: 'consultor'
                    });
                }

                exibirMensagem('Conta criada com sucesso! Redirecionando...', 'sucesso');
                setTimeout(() => {
                    window.location.href = 'inicio.html';
                }, 900);
            }
        } catch (erro) {
            console.error('Erro na autenticação:', erro);
            let msgAmigavel = erro.message;
            if (msgAmigavel.includes('Invalid login credentials')) {
                msgAmigavel = 'E-mail ou senha incorretos.';
            } else if (msgAmigavel.includes('User already registered')) {
                msgAmigavel = 'Este e-mail já está cadastrado no sistema.';
            }
            exibirMensagem(msgAmigavel);
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.textContent = modoAtual === 'entrar' ? 'Acessar Painel' : 'Cadastrar Conta';
        }
    });

    btnEsqueci.addEventListener('click', async () => {
        const email = campoEmail.value.trim();
        if (!email) {
            exibirMensagem('Informe seu e-mail acima para receber o link de redefinição.');
            campoEmail.focus();
            return;
        }
        btnEsqueci.disabled = true;
        try {
            const destino = new URL('redefinir.html', window.location.href).href;
            const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: destino });
            if (error) {
                const limite = /rate|limit|seconds/i.test(error.message || '');
                exibirMensagem(limite ? 'Muitas solicitações em pouco tempo. Aguarde alguns minutos e tente de novo.' : 'Não foi possível enviar o e-mail agora. Tente novamente em instantes.');
            } else {
                exibirMensagem('Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha. Verifique também o spam.', 'sucesso');
            }
        } catch (e) {
            exibirMensagem('Não foi possível enviar o e-mail agora. Tente novamente em instantes.');
        } finally {
            btnEsqueci.disabled = false;
        }
    });

    document.querySelectorAll('.campo-olho').forEach(botao => {
        botao.addEventListener('click', () => {
            const alvo = document.getElementById(botao.dataset.alvo);
            const mostrar = alvo.type === 'password';
            alvo.type = mostrar ? 'text' : 'password';
            botao.classList.toggle('ativo', mostrar);
            botao.setAttribute('aria-label', mostrar ? 'Ocultar senha' : 'Mostrar senha');
        });
    });
});
