document.addEventListener('DOMContentLoaded', function() {
    const SUPABASE_URL = 'https://potvtrepcoswvzmkewic.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_iMbay5YOnrrehpqI9qU7HA_vMapr-DY';
    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    const formAuth = document.getElementById('form-auth');
    const abaEntrar = document.getElementById('aba-entrar');
    const abaCadastrar = document.getElementById('aba-cadastrar');
    const grupoNome = document.getElementById('grupo-nome');
    const grupoConfirmarSenha = document.getElementById('grupo-confirmar-senha');
    const btnSubmit = document.getElementById('btn-submit');
    const subtituloModo = document.getElementById('subtitulo-modo');
    const msgStatus = document.getElementById('mensagem-status');

    let modoAtual = 'entrar'; // 'entrar' ou 'cadastrar'

    function exibirMensagem(texto, cor = '#dc2626') {
        if (msgStatus) {
            msgStatus.style.color = cor;
            msgStatus.textContent = texto;
        }
    }

    function alternarModo(novoModo) {
        modoAtual = novoModo;
        exibirMensagem('');

        if (modoAtual === 'entrar') {
            abaEntrar.classList.add('ativa');
            abaCadastrar.classList.remove('ativa');
            grupoNome.style.display = 'none';
            grupoConfirmarSenha.style.display = 'none';
            btnSubmit.textContent = 'Entrar';
            subtituloModo.textContent = 'Entre com o seu e-mail para acessar seus agendamentos';
        } else {
            abaCadastrar.classList.add('ativa');
            abaEntrar.classList.remove('ativa');
            grupoNome.style.display = 'flex';
            grupoConfirmarSenha.style.display = 'flex';
            btnSubmit.textContent = 'Criar Conta';
            subtituloModo.textContent = 'Preencha seus dados para criar um novo acesso';
        }
    }

    abaEntrar.addEventListener('click', () => alternarModo('entrar'));
    abaCadastrar.addEventListener('click', () => alternarModo('cadastrar'));

    formAuth.addEventListener('submit', async function(evento) {
        evento.preventDefault();

        const email = document.getElementById('email').value.trim();
        const senha = document.getElementById('senha').value;

        if (modoAtual === 'entrar') {
            exibirMensagem('Validando credenciais...', '#2563eb');

            const { error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: senha
            });

            if (error) {
                exibirMensagem('Erro ao entrar: ' + error.message, '#dc2626');
                return;
            }

            window.location.href = 'index.html';

        } else {
            // Modo Cadastro
            const nomeCompleto = document.getElementById('nome-completo').value.trim();
            const confirmarSenha = document.getElementById('confirmar-senha').value;

            if (!nomeCompleto) {
                exibirMensagem('Por favor, informe seu nome completo.', '#dc2626');
                return;
            }

            if (senha.length < 6) {
                exibirMensagem('A senha deve ter no mínimo 6 caracteres.', '#dc2626');
                return;
            }

            if (senha !== confirmarSenha) {
                exibirMensagem('As senhas não coincidem. Digite novamente.', '#dc2626');
                return;
            }

            exibirMensagem('Criando conta e acessando...', '#2563eb');

            const { error } = await supabaseClient.auth.signUp({
                email: email,
                password: senha,
                options: {
                    data: {
                        nome_completo: nomeCompleto
                    }
                }
            });

            if (error) {
                exibirMensagem('Erro ao registrar: ' + error.message, '#dc2626');
                return;
            }

            // Realiza login imediatamente
            const { error: erroLogin } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: senha
            });

            if (erroLogin) {
                exibirMensagem('Conta criada! Faça login com suas credenciais.', '#16a34a');
                alternarModo('entrar');
            } else {
                window.location.href = 'index.html';
            }
        }
    });
});