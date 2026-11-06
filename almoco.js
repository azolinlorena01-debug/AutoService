document.addEventListener('DOMContentLoaded', async function () {
    const SUPABASE_URL = 'https://potvtrepcoswvzmkewic.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_iMbay5YOnrrehpqI9qU7HA_vMapr-DY';
    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session || !session.user) {
        window.location.href = 'login.html';
        return;
    }

    const usuarioAtual = session.user;
    let isAdmin = false;
    let nomeLogado = usuarioAtual.user_metadata?.nome_completo || 'Usuário';
    let equipeUsuario = '';

    try {
        const { data: perfil } = await supabaseClient.from('perfis').select('role, nome, equipe').eq('id', usuarioAtual.id).maybeSingle();
        if (perfil) {
            if (perfil.role === 'admin') isAdmin = true;
            if (perfil.nome && perfil.nome.trim()) nomeLogado = perfil.nome.trim();
            if (perfil.equipe) equipeUsuario = perfil.equipe;
        }
    } catch (e) {}

    if (usuarioAtual.email === 'usuariotestesite01@gmail.com' || usuarioAtual.email?.includes('admin')) {
        isAdmin = true;
    }

    if (!isAdmin && !/toyota/i.test(equipeUsuario)) {
        window.location.href = 'inicio.html';
        return;
    }

    function escaparHtml(texto) {
        return String(texto ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    const areaAuth = document.getElementById('area-autenticacao');
    if (areaAuth) {
        areaAuth.innerHTML = `
            <span class="usuario-logado-tag">Olá, <strong>${escaparHtml(nomeLogado)}</strong>${!isAdmin ? `<span class="tag-badge-equipe">${escaparHtml(equipeUsuario || 'Toyota')}</span>` : ''}${isAdmin ? '<span class="tag-badge-admin">Admin</span>' : ''}</span>
            <button id="btn-sair-header" class="botao-sair-header">Sair</button>
        `;
        window.salvarMenuCache(areaAuth.innerHTML, isAdmin);
        document.getElementById('btn-sair-header').addEventListener('click', async () => {
            window.limparMenuCache();
            await supabaseClient.auth.signOut();
            window.location.href = 'login.html';
        });
    }

    if (isAdmin) window.mostrarLinksAdmin();
    window.atualizarContadorDivergencias(supabaseClient);

    const corpo = document.getElementById('corpo-almoco');
    const contador = document.getElementById('almoco-contador');
    const campoData = document.getElementById('almoco-data');
    const filtroStatus = document.getElementById('almoco-filtro-status');
    const formulario = document.getElementById('almoco-form');
    const campoEvento = document.getElementById('almoco-evento');
    const campoOs = document.getElementById('almoco-os');
    const colunas = isAdmin ? 7 : 6;

    const ROTULO_STATUS = { pendente: 'Pendente', finalizado: 'Finalizado', nao_finalizado: 'Não finalizado' };
    let itens = [];
    let equipeToyota = [];
    let recarregarAgendado = null;
    let renderPendente = false;

    function hojeLocal() {
        return new Date().toLocaleDateString('sv-SE');
    }

    function formatarHora(iso) {
        return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }

    function formatarDataBR(data) {
        const [a, m, d] = String(data || '').split('-');
        return a && m && d ? `${d}/${m}/${a}` : '-';
    }

    if (isAdmin) {
        document.getElementById('almoco-filtros-admin').classList.remove('oculto');
        document.querySelectorAll('.col-almoco-data').forEach(e => e.classList.remove('oculto'));
        campoData.value = hojeLocal();
    } else {
        document.querySelectorAll('.col-almoco-data').forEach(e => e.remove());
    }

    async function carregarEquipe() {
        try {
            const { data } = await supabaseClient.from('perfis').select('*');
            equipeToyota = (data || [])
                .filter(p => p.id && p.nome && p.nome.trim() && /toyota/i.test(p.equipe || '') && !p.inativo_desde)
                .map(p => ({ id: p.id, nome: p.nome.trim() }));
        } catch (e) {
            equipeToyota = [];
        }
        if (!equipeToyota.some(p => p.id === usuarioAtual.id)) equipeToyota.push({ id: usuarioAtual.id, nome: nomeLogado });
        equipeToyota.sort((a, b) => {
            if (a.id === usuarioAtual.id) return -1;
            if (b.id === usuarioAtual.id) return 1;
            return a.nome.localeCompare(b.nome, 'pt-BR');
        });
    }

    async function carregar() {
        let consulta = supabaseClient.from('almoco_itens').select('*').order('criado_em', { ascending: true });
        const dia = isAdmin ? campoData.value : hojeLocal();
        if (dia) consulta = consulta.eq('data', dia);
        if (isAdmin && filtroStatus.value !== 'todos') consulta = consulta.eq('status', filtroStatus.value);
        const { data, error } = await consulta;
        if (error) {
            corpo.innerHTML = `<tr><td colspan="${colunas}" class="celula-vazia-mensagem">Não foi possível carregar os eventos. Execute o script SQL do almoço no Supabase. (${escaparHtml(error.message)})</td></tr>`;
            return;
        }
        itens = data || [];
        renderizar();
    }

    function agendarRecarga() {
        clearTimeout(recarregarAgendado);
        recarregarAgendado = setTimeout(carregar, 150);
    }

    function opcoesResponsavel(item) {
        const lista = equipeToyota.slice();
        if (item.responsavel_id && !lista.some(p => p.id === item.responsavel_id)) lista.push({ id: item.responsavel_id, nome: item.responsavel_nome || 'Responsável' });
        return `<option value="">Sem responsável</option>` + lista.map(p => `<option value="${escaparHtml(p.id)}" ${item.responsavel_id === p.id ? 'selected' : ''}>${escaparHtml(p.nome)}${p.id === usuarioAtual.id ? ' (eu)' : ''}</option>`).join('');
    }

    function renderizar() {
        const ativo = document.activeElement;
        if (ativo && ativo.classList && ativo.classList.contains('input-almoco-edicao')) {
            renderPendente = true;
            return;
        }
        renderPendente = false;
        const semResponsavel = itens.filter(i => !i.responsavel_id && i.status === 'pendente').length;
        contador.textContent = `${itens.length} ${itens.length === 1 ? 'evento' : 'eventos'}${semResponsavel ? ` · ${semResponsavel} sem responsável` : ''}`;

        if (itens.length === 0) {
            corpo.innerHTML = linhaVazia(colunas, 'Nenhum evento registrado.', isAdmin ? 'Ajuste a data ou o status para ver outros registros.' : 'Registre acima os eventos que ficarão para cobertura no almoço.');
            return;
        }

        corpo.innerHTML = itens.map(item => {
            const meu = item.criado_por === usuarioAtual.id;
            const editavel = meu || isAdmin;
            const evento = editavel
                ? `<input type="text" class="input-valor-facilitada input-almoco-edicao" data-campo="evento" maxlength="40" value="${escaparHtml(item.evento)}">`
                : `<strong>${escaparHtml(item.evento)}</strong>`;
            const os = editavel
                ? `<input type="text" class="input-valor-facilitada input-almoco-edicao" data-campo="os" maxlength="40" value="${escaparHtml(item.os || '')}" placeholder="-">`
                : escaparHtml(item.os || '-');
            return `
                <tr data-id="${escaparHtml(item.id)}" class="${!item.responsavel_id && item.status === 'pendente' ? 'linha-sem-responsavel' : ''}">
                    ${isAdmin ? `<td>${formatarDataBR(item.data)}</td>` : ''}
                    <td>${evento}</td>
                    <td>${os}</td>
                    <td>${escaparHtml(item.criado_por_nome || '-')} <span class="texto-pequeno">${formatarHora(item.criado_em)}</span></td>
                    <td><select class="select-funcao select-almoco-responsavel">${opcoesResponsavel(item)}</select></td>
                    <td class="col-centro"><select class="select-status-tabela select-almoco-status">${Object.entries(ROTULO_STATUS).map(([v, r]) => `<option value="${v}" ${item.status === v ? 'selected' : ''}>${r}</option>`).join('')}</select></td>
                    <td class="col-centro">${editavel ? '<button type="button" class="btn-abrir-config-metas btn-excluir-almoco">Excluir</button>' : ''}</td>
                </tr>`;
        }).join('');
    }

    function itemDaLinha(el) {
        const tr = el.closest('tr');
        return tr ? itens.find(i => i.id === tr.dataset.id) : null;
    }

    corpo.addEventListener('change', async (e) => {
        const item = itemDaLinha(e.target);
        if (!item) return;

        if (e.target.classList.contains('select-almoco-responsavel')) {
            const novoId = e.target.value || null;
            const pessoa = equipeToyota.find(p => p.id === novoId);
            const valores = { responsavel_id: novoId, responsavel_nome: pessoa ? pessoa.nome : null };
            let consulta = supabaseClient.from('almoco_itens').update(valores).eq('id', item.id);
            if (!item.responsavel_id) consulta = consulta.is('responsavel_id', null);
            const { data, error } = await consulta.select('id');
            if (error) {
                avisar('Não foi possível alterar o responsável: ' + error.message);
            } else if (!data || data.length === 0) {
                avisar('Outra pessoa já assumiu este evento.');
            }
            carregar();
            return;
        }

        if (e.target.classList.contains('select-almoco-status')) {
            const { data, error } = await supabaseClient.from('almoco_itens').update({ status: e.target.value }).eq('id', item.id).select('id');
            if (error || !data || data.length === 0) avisar('Não foi possível alterar o status' + (error ? ': ' + error.message : '.'));
            carregar();
            return;
        }

        if (e.target.classList.contains('input-almoco-edicao')) {
            const campo = e.target.dataset.campo;
            const valor = e.target.value.trim();
            if (campo === 'evento' && !valor) {
                e.target.value = item.evento;
                avisar('Informe o número do evento.');
                return;
            }
            const { data, error } = await supabaseClient.from('almoco_itens').update({ [campo]: valor || null }).eq('id', item.id).select('id');
            if (error || !data || data.length === 0) avisar('Não foi possível salvar' + (error ? ': ' + error.message : '.'));
            item[campo] = valor || null;
        }
    }, true);

    corpo.addEventListener('focusout', (e) => {
        if (renderPendente && e.target.classList && e.target.classList.contains('input-almoco-edicao')) setTimeout(renderizar, 0);
    });

    corpo.addEventListener('click', async (e) => {
        const botao = e.target.closest('.btn-excluir-almoco');
        if (!botao) return;
        const item = itemDaLinha(botao);
        if (!item) return;
        if (!(await confirmar(`Excluir o evento ${item.evento}?`, { titulo: 'Excluir evento', confirmar: 'Excluir', perigo: true }))) return;
        const { data, error } = await supabaseClient.from('almoco_itens').delete().eq('id', item.id).select('id');
        if (error || !data || data.length === 0) avisar('Não foi possível excluir' + (error ? ': ' + error.message : '.'));
        carregar();
    });

    formulario.addEventListener('submit', async (e) => {
        e.preventDefault();
        const evento = campoEvento.value.trim();
        const os = campoOs.value.trim();
        if (!evento) {
            avisar('Informe o número do evento.');
            return;
        }
        const { error } = await supabaseClient.from('almoco_itens').insert({
            data: hojeLocal(),
            evento,
            os: os || null,
            criado_por: usuarioAtual.id,
            criado_por_nome: nomeLogado
        });
        if (error) {
            avisar('Não foi possível registrar: ' + error.message);
            return;
        }
        campoEvento.value = '';
        campoOs.value = '';
        campoEvento.focus();
        if (isAdmin && campoData.value && campoData.value !== hojeLocal()) campoData.value = hojeLocal();
        carregar();
    });

    if (isAdmin) {
        campoData.addEventListener('change', carregar);
        filtroStatus.addEventListener('change', carregar);
    }

    await carregarEquipe();
    await carregar();
    window.mostrarConteudo();

    supabaseClient.channel('almoco-pagina')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'almoco_itens' }, agendarRecarga)
        .subscribe();

    setInterval(carregar, 60000);
});
