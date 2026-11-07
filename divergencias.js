document.addEventListener('DOMContentLoaded', async function () {
    const SUPABASE_URL = 'https://potvtrepcoswvzmkewic.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_iMbay5YOnrrehpqI9qU7HA_vMapr-DY';
    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    window.atualizarContadorDivergencias(supabaseClient, { marcarVisto: true });

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session || !session.user) {
        window.location.href = 'login.html';
        return;
    }

    const usuarioAtual = session.user;
    let isAdmin = false;
    let nomeLogado = usuarioAtual.user_metadata?.nome_completo || 'Usuário';
    let equipeUsuario = 'Toyota';

    try {
        const { data: perfil } = await supabaseClient.from('perfis').select('role, nome, equipe').eq('id', usuarioAtual.id).maybeSingle();
        if (perfil) {
            if (perfil.role === 'admin') isAdmin = true;
            if (perfil.nome && perfil.nome.trim()) nomeLogado = perfil.nome.trim();
            if (perfil.equipe) equipeUsuario = perfil.equipe;
        }
    } catch (e) {}


    function escaparHtml(texto) {
        return String(texto ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    const areaAuth = document.getElementById('area-autenticacao');
    if (areaAuth) {
        areaAuth.innerHTML = `
            <span class="usuario-logado-tag">Olá, <strong>${escaparHtml(nomeLogado)}</strong>${!isAdmin ? `<span class="tag-badge-equipe">${escaparHtml(equipeUsuario)}</span>` : ''}${isAdmin ? '<span class="tag-badge-admin">Admin</span>' : ''}</span>
            <button id="btn-sair-header" class="botao-sair-header">Sair</button>
        `;
        window.salvarMenuCache(areaAuth.innerHTML, isAdmin);
        document.getElementById('btn-sair-header').addEventListener('click', async () => {
            window.limparMenuCache();
            await supabaseClient.auth.signOut();
            window.location.href = 'login.html';
        });
    }

    if (isAdmin) {
        window.mostrarLinksAdmin();
        document.getElementById('link-menu-admin').classList.add('ativo');
        document.getElementById('link-menu-divergencias').classList.remove('ativo');
        document.getElementById('abas-gestao').classList.remove('oculto');
    }

    const corpo = document.getElementById('corpo-divergencias');
    const busca = document.getElementById('div-busca');
    const filtroStatus = document.getElementById('div-filtro-status');
    const contador = document.getElementById('div-contador');
    const colunas = 9;

    document.getElementById('div-titulo').textContent = isAdmin ? 'Divergências' : 'Minhas divergências';
    if (!isAdmin) document.getElementById('div-th-operador').classList.add('oculto');

    const ROTULO_STATUS = { aberta: 'Aberta', resolvida: 'Resolvida', recusada: 'Recusada' };
    const nomes = new Map();
    let itens = [];

    function formatarMes(mes) {
        const [ano, m] = String(mes || '').split('-');
        return ano && m ? `${m}/${ano}` : '-';
    }

    function formatarData(iso) {
        const d = new Date(iso);
        return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }

    async function carregar() {
        corpo.innerHTML = linhaCarregando(colunas);
        let consulta = supabaseClient.from('divergencias').select('*').order('criado_em', { ascending: false }).limit(1000);
        if (!isAdmin) consulta = consulta.eq('user_id', usuarioAtual.id);
        const { data, error } = await consulta;
        if (error) {
            corpo.innerHTML = `<tr><td colspan="${colunas}" class="celula-vazia-mensagem">Não foi possível carregar as divergências. Execute o script SQL das divergências no Supabase. (${escaparHtml(error.message)})</td></tr>`;
            return;
        }
        itens = data || [];
        if (isAdmin) {
            const { data: perfis } = await supabaseClient.from('perfis').select('id, nome');
            (perfis || []).forEach(p => nomes.set(p.id, p.nome));
        }
        renderizar();
    }

    function renderizar() {
        const termo = busca.value.trim().toLowerCase();
        const status = filtroStatus.value;
        const lista = itens.filter(i =>
            (status === 'todas' || i.status === status) &&
            (!termo || `${i.placa || ''} ${i.os || ''} ${i.descricao || ''} ${i.tipo || ''} ${nomes.get(i.user_id) || ''}`.toLowerCase().includes(termo)));

        const abertas = itens.filter(i => i.status === 'aberta').length;
        contador.textContent = `${lista.length} ${lista.length === 1 ? 'solicitação' : 'solicitações'} · ${abertas} ${abertas === 1 ? 'aberta' : 'abertas'}`;

        if (lista.length === 0) {
            corpo.innerHTML = linhaVazia(colunas, 'Nenhuma divergência encontrada.', 'Tente outro filtro ou aguarde novas solicitações.');
            return;
        }

        corpo.innerHTML = lista.map(i => {
            const referencia = [i.placa, i.os ? 'O.S ' + i.os : ''].filter(Boolean).join(' · ') || '-';
            const badge = `<span class="badge-divergencia badge-divergencia-${i.status}">${ROTULO_STATUS[i.status] || i.status}</span>`;
            let resposta;
            if (isAdmin) {
                const aberta = i.status === 'aberta';
                resposta = `<div class="resposta-linha">
                    <textarea class="input-valor-facilitada input-resposta" rows="1" maxlength="300" placeholder="Resposta ao operador" ${aberta ? '' : 'disabled'}>${escaparHtml(i.resposta || '')}</textarea>
                    <div class="acoes-divergencia">
                        ${aberta
                            ? '<button type="button" class="btn-adicionar-agendamento btn-resolver">Resolver</button><button type="button" class="btn-abrir-config-metas btn-recusar">Recusar</button>'
                            : '<button type="button" class="btn-abrir-config-metas btn-reabrir">Reabrir</button>'}
                    </div></div>`;
            } else {
                resposta = i.resposta ? escaparHtml(i.resposta) : '<span class="texto-pequeno">Aguardando resposta da gestão</span>';
            }
            return `
                <tr data-id="${i.id}">
                    <td class="texto-pequeno">${formatarData(i.criado_em)}</td>
                    ${isAdmin ? `<td><strong>${escaparHtml(nomes.get(i.user_id) || 'Usuário removido')}</strong></td>` : ''}
                    <td class="col-centro">${formatarMes(i.mes)}</td>
                    <td>${escaparHtml(i.tipo)}</td>
                    <td>${escaparHtml(referencia)}</td>
                    <td class="celula-descricao">${escaparHtml(i.descricao)}</td>
                    <td class="col-centro">${badge}</td>
                    <td class="celula-resposta">${resposta}</td>
                </tr>`;
        }).join('');

        corpo.querySelectorAll('tr[data-id]').forEach(tr => {
            const id = parseInt(tr.dataset.id, 10);
            const ligar = (seletor, status) => {
                const botao = tr.querySelector(seletor);
                if (botao) botao.addEventListener('click', () => atualizar(id, status, tr.querySelector('.input-resposta').value.trim(), botao));
            };
            ligar('.btn-resolver', 'resolvida');
            ligar('.btn-recusar', 'recusada');
            ligar('.btn-reabrir', 'aberta');
        });
    }

    async function atualizar(id, status, resposta, botao) {
        if (status === 'recusada' && !resposta) {
            avisar('Informe o motivo da recusa no campo de resposta.');
            return;
        }
        botao.disabled = true;
        const reabrindo = status === 'aberta';
        const { data, error } = await supabaseClient.from('divergencias').update({
            status,
            resposta: resposta || null,
            resolvido_por: reabrindo ? null : usuarioAtual.id,
            resolvido_em: reabrindo ? null : new Date().toISOString()
        }).eq('id', id).select('id');
        if (error || !data || data.length === 0) {
            botao.disabled = false;
            avisar('Não foi possível salvar: ' + (error ? error.message : 'sem permissão.'));
            return;
        }
        const item = itens.find(i => i.id === id);
        item.status = status;
        item.resposta = resposta || null;
        renderizar();
        window.atualizarContadorDivergencias(supabaseClient, { marcarVisto: true });
    }

    busca.addEventListener('input', renderizar);
    filtroStatus.addEventListener('change', renderizar);

    await carregar();
    window.mostrarConteudo();
});
