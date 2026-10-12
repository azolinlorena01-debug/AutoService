const SUPABASE_URL = 'https://potvtrepcoswvzmkewic.supabase.co';
const SUPABASE_KEY = 'sb_publishable_iMbay5YOnrrehpqI9qU7HA_vMapr-DY';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. Elementos da Interface
const formLogin = document.getElementById('form-login');
const emailInput = document.getElementById('email');
const senhaInput = document.getElementById('senha');
const btnCadastrar = document.getElementById('btn-cadastrar');
const mensagemStatus = document.getElementById('mensagem-status');

// Função auxiliar para exibir avisos e erros na tela
function exibirMensagem(texto, cor = '#2563eb') {
    mensagemStatus.textContent = texto;
    mensagemStatus.style.color = cor;
}

// 3. Efetuar Login (Entrar)
formLogin.addEventListener('submit', async function(e) {
    e.preventDefault();
    exibirMensagem('A validar credenciais...');

    const email = emailInput.value.trim();
    const password = senhaInput.value;

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        exibirMensagem(`Erro ao entrar: ${error.message}`, '#b91c1c');
    } else {
        exibirMensagem('Sessão iniciada com sucesso! A redirecionar...', '#15803d');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1200);
    }
});

// 4. Criar Nova Conta (Registo com envio de e-mail de confirmação)
btnCadastrar.addEventListener('click', async function() {
    const email = emailInput.value.trim();
    const password = senhaInput.value;

    if (!email || !password) {
        exibirMensagem('Por favor, preencha o e-mail e a palavra-passe.', '#b45309');
        return;
    }

    if (password.length < 6) {
        exibirMensagem('A palavra-passe deve ter pelo menos 6 caracteres.', '#b45309');
        return;
    }

    exibirMensagem('A registar conta e a enviar e-mail de confirmação...');

const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: password,
        options: {
            data: {
                nome_completo: nome || email.split('@')[0]
            }
        }
    });

    if (error) {
        exibirMensagem(`Erro no registo: ${error.message}`, '#b91c1c');
    } else {
        exibirMensagem('Conta criada com sucesso! Verifique a sua caixa de entrada para confirmar o e-mail.', '#15803d');
        formLogin.reset();
    }
});