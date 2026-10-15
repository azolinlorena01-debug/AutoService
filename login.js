/* ==========================================================================
   CADERNO DE ESTUDOS - JAVASCRIPT
   Objetivo do arquivo:
   1. Gerenciar o fluxo de Login.
   2. Gerenciar o fluxo de Cadastro gravando metadados no Auth.
   3. Criar ou sincronizar o registro na tabela pública 'perfis'.
   4. Redirecionar usuários logados direto para a aplicação.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async function() {
    // 1. INICIALIZAÇÃO DO CLIENTE SUPABASE
    const SUPABASE_URL = 'https://potvtrepcoswvzmkewic.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_iMbay5YOnrrehpqI9qU7HA_vMapr-DY';
    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    // Se o usuário já tiver uma sessão válida gravada no LocalStorage do navegador,
    // não faz sentido mostrar a tela de login. Redirecionamos para a tela principal
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session && session.user) {
        window.location.href = 'index.html';
        return;
    }

    // 2. CAPTURA DOS ELEMENTOS DA TELA
    const abaEntrar = document.getElementById('aba-entrar');
    const abaCadastrar = document.getElementById('aba-cadastrar');
    const grupoNome = document.getElementById('grupo-nome');
    const grupoEquipe = document.getElementById('grupo-equipe');
    const campoNome = document.getElementById('campo-nome');
    const campoEmail = document.getElementById('campo-email');
    const campoSenha = document.getElementById('campo-senha');
    const campoEquipe = document.getElementById('campo-equipe');
    const btnSubmit = document.getElementById('btn-submit-auth');
    const subtituloLogin = document.getElementById('subtitulo-login');
    const mensagemStatus = document.getElementById('mensagem-status');
    const form = document.getElementById('formulario-autenticacao');

    // Variável que armazena em qual modo estamos: 'entrar' ou 'cadastrar'
    let modoAtual = 'entrar';

    // Função utilitária para exibir alertas de erro ou sucesso
    function exibirMensagem(texto, tipo = 'erro') {
        mensagemStatus.textContent = texto;
        if (tipo === 'sucesso') {
            mensagemStatus.className = 'mensagem-status admin-val-sucesso';
        } else {
            mensagemStatus.className = 'mensagem-status admin-val-perigo';
        }
    }

    // 3. ALTERNÂNCIA DE ABAS (ENTRAR VS CRIAR CONTA)
    abaEntrar.addEventListener('click', () => {
        modoAtual = 'entrar';
        abaEntrar.classList.add('ativa');
        abaCadastrar.classList.remove('ativa');
        grupoNome.classList.add('oculto');
        grupoEquipe.classList.add('oculto');
        btnSubmit.textContent = 'Acessar Painel';
        subtituloLogin.textContent = 'Acesse sua conta para continuar';
        mensagemStatus.textContent = '';
    });

    abaCadastrar.addEventListener('click', () => {
        modoAtual = 'cadastrar';
        abaCadastrar.classList.add('ativa');
        abaEntrar.classList.remove('ativa');
        grupoNome.classList.remove('oculto');
        grupoEquipe.classList.remove('oculto');
        btnSubmit.textContent = 'Cadastrar Conta';
        subtituloLogin.textContent = 'Crie seu perfil profissional no sistema';
        mensagemStatus.textContent = '';
    });

    // 4. SUBMISSÃO DO FORMULÁRIO (LOGIN OU CADASTRO)
    form.addEventListener('submit', async function(e) {
        e.preventDefault(); // Impede o recarregamento tradicional da página

        const email = campoEmail.value.trim();
        const senha = campoSenha.value;

        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Processando...';
        mensagemStatus.textContent = '';

        try {
            if (modoAtual === 'entrar') {
                // FLUXO DE LOGIN:
                const { data, error } = await supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: senha
                });

                if (error) throw error;

                exibirMensagem('Login realizado com sucesso! Redirecionando...', 'sucesso');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 800);

            } else {
                // FLUXO DE CADASTRO:
                const nomeCompleto = campoNome.value.trim();
                const equipeSelecionada = campoEquipe.value;

                if (!nomeCompleto) {
                    exibirMensagem('Por favor, informe seu nome completo.');
                    btnSubmit.disabled = false;
                    btnSubmit.textContent = 'Cadastrar Conta';
                    return;
                }

                if (!equipeSelecionada) {
                    exibirMensagem('Por favor, selecione sua equipe de trabalho.');
                    btnSubmit.disabled = false;
                    btnSubmit.textContent = 'Cadastrar Conta';
                    return;
                }

                // Cria o usuário no Supabase Auth salvando os metadados
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

                // Cria ou atualiza o perfil do operador na tabela pública 'perfis'
                if (data.user) {
                    await supabaseClient.from('perfis').upsert({
                        id: data.user.id,
                        email: email,
                        nome: nomeCompleto,
                        equipe: equipeSelecionada,
                        role: 'consultor' // Padrão seguro: novos cadastros nascem como consultores
                    });
                }

                exibirMensagem('Conta criada com sucesso! Redirecionando...', 'sucesso');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
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
});