/* ==========================================================================
   CADERNO DE ESTUDOS - JAVASCRIPT
   Objetivo do arquivo:
   1. Gerenciar o fluxo de Login.
   2. Gerenciar o fluxo de Cadastro gravando metadados no Auth.
   3. Exigir Nome e Sobrenome obrigatórios no cadastro.
   4. Criar ou sincronizar o registro na tabela pública 'perfis'.
   5. Redirecionar usuários logados direto para a aplicação.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async function() {
    // 1. INICIALIZAÇÃO DO CLIENTE SUPABASE
    const SUPABASE_URL = 'https://potvtrepcoswvzmkewic.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_iMbay5YOnrrehpqI9qU7HA_vMapr-DY';
    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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
    const grupoSenhaConfirma = document.getElementById('grupo-senha-confirma');
    const campoSenhaConfirma = document.getElementById('campo-senha-confirma');
    const campoEquipe = document.getElementById('campo-equipe');
    const btnSubmit = document.getElementById('btn-submit-auth');
    const subtituloLogin = document.getElementById('subtitulo-login');
    const mensagemStatus = document.getElementById('mensagem-status');
    const form = document.getElementById('formulario-autenticacao');

    let modoAtual = 'entrar';

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
        
        grupoSenhaConfirma.classList.add('oculto');
        campoSenhaConfirma.removeAttribute('required');
        
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
        
        grupoSenhaConfirma.classList.remove('oculto');
        campoSenhaConfirma.setAttribute('required', 'required');
        
        btnSubmit.textContent = 'Cadastrar Conta';
        subtituloLogin.textContent = 'Crie seu perfil profissional no sistema';
        mensagemStatus.textContent = '';
    });

    // 4. SUBMISSÃO DO FORMULÁRIO (LOGIN OU CADASTRO)
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
                    window.location.href = 'index.html';
                }, 800);

            } else {
                const nomeCompleto = campoNome.value.trim();
                const equipeSelecionada = campoEquipe.value;
                const senhaConfirma = campoSenhaConfirma.value;

                // Validação de Nome e Sobrenome obrigatórios
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
                    exibirMensagem('Por favor, selecione sua equipe de trabalho.');
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

                // Salva na tabela perfis apenas os campos existentes: id, nome, equipe e role
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