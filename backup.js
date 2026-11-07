window.montarBackup = function (ctx) {
    const { supabaseClient, usuarioAtual, getPerfis, buscarTodasLinhas, escaparHtml } = ctx;
    const FORMATO = 'painel-bonus-backup';
    const VERSAO = 1;
    const COLUNAS_AGENDAMENTO = ['user_id', 'inativo_id', 'data_contato', 'data_revisao', 'status', 'placa', 'evento', 'os', 'revisao', 'valor_unitario', 'observacao', 'marca'];

    const campoMesGerar = document.getElementById('backup-mes-gerar');
    const btnGerar = document.getElementById('btn-backup-gerar');
    const campoArquivo = document.getElementById('backup-arquivo');
    const rotuloArquivo = document.getElementById('backup-arquivo-nome');
    const btnRestaurar = document.getElementById('btn-backup-restaurar');
    const corpo = document.getElementById('corpo-backups');
    const contador = document.getElementById('backup-contador');

    const hoje = new Date();
    const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
    campoMesGerar.value = mesAtual;

    const mesValido = m => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(m || ''));
    const formatarMes = m => String(m || '').split('-').reverse().join('/');
    const normalizarDealer = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, '').trim();

    function intervalo(mes) {
        const [ano, m] = mes.split('-').map(Number);
        const ultimo = new Date(ano, m, 0).getDate();
        return { inicio: `${mes}-01`, fim: `${mes}-${String(ultimo).padStart(2, '0')}` };
    }

    function formatarDataHora(iso) {
        const d = new Date(iso);
        if (isNaN(d)) return '-';
        return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }

    function nomeDoPerfil(id) {
        const p = getPerfis().find(x => x.id === id);
        return p && p.nome ? p.nome : '-';
    }

    async function lerTabela(consulta) {
        const { data, error } = await consulta;
        return error ? { erro: error.message, dados: [] } : { dados: data || [] };
    }

    async function registrar(tipo, mes, total, detalhes) {
        const { error } = await supabaseClient.from('backups_registro').insert({ tipo, mes, total_agendamentos: total, detalhes });
        return !error;
    }

    async function carregarRegistro() {
        corpo.innerHTML = '<tr class="linha-esqueleto"><td colspan="5"><div class="esqueleto"></div><div class="esqueleto"></div></td></tr>';
        const { data, error } = await supabaseClient.from('backups_registro').select('*').order('criado_em', { ascending: false }).limit(100);
        if (error) {
            contador.textContent = '';
            corpo.innerHTML = `<tr><td colspan="5" class="celula-vazia-mensagem">O registro de backups ainda não está ativo. Execute o script SQL do backup no Supabase. Você já pode gerar e restaurar backups normalmente.</td></tr>`;
            return;
        }
        contador.textContent = `${data.length} ${data.length === 1 ? 'registro' : 'registros'}`;
        if (data.length === 0) {
            corpo.innerHTML = window.linhaVazia ? window.linhaVazia(5, 'Nenhum backup registrado.', 'Gere o primeiro backup acima.') : '<tr><td colspan="5" class="celula-vazia-mensagem">Nenhum backup registrado.</td></tr>';
            return;
        }
        corpo.innerHTML = data.map(r => {
            const d = r.detalhes || {};
            const resumo = r.tipo === 'restauracao'
                ? `Restaurados ${d.restaurados ?? 0} · já existiam ${d.ja_existiam ?? 0} · sem usuário ${d.sem_usuario ?? 0}`
                : `${d.metas ?? 0} meta(s) · ${d.fechamentos ?? 0} fechamento(s) · ${d.divergencias ?? 0} divergência(s)`;
            return `<tr>
                <td class="texto-pequeno">${formatarDataHora(r.criado_em)}</td>
                <td><span class="badge-backup badge-backup-${r.tipo === 'restauracao' ? 'restauracao' : 'backup'}">${r.tipo === 'restauracao' ? 'Restauração' : 'Backup'}</span></td>
                <td class="col-centro">${formatarMes(r.mes)}</td>
                <td class="col-centro">${r.total_agendamentos ?? 0}</td>
                <td>${escaparHtml(nomeDoPerfil(r.criado_por))} <span class="texto-pequeno">${escaparHtml(resumo)}</span></td>
            </tr>`;
        }).join('');
    }

    async function gerar() {
        const mes = campoMesGerar.value;
        if (!mesValido(mes)) { avisar('Escolha o mês do backup.'); return; }
        btnGerar.disabled = true;
        btnGerar.textContent = 'Gerando...';
        try {
            const { inicio, fim } = intervalo(mes);
            let agendamentos;
            try {
                agendamentos = await buscarTodasLinhas(() => supabaseClient.from('agendamentos').select(COLUNAS_AGENDAMENTO.join(',')).gte('data_revisao', inicio).lte('data_revisao', fim).order('id', { ascending: true }));
            } catch (e) {
                const semInativo = COLUNAS_AGENDAMENTO.filter(c => c !== 'inativo_id');
                agendamentos = await buscarTodasLinhas(() => supabaseClient.from('agendamentos').select(semInativo.join(',')).gte('data_revisao', inicio).lte('data_revisao', fim).order('id', { ascending: true }));
            }
            if (agendamentos.length === 0) { avisar(`Não há agendamentos em ${formatarMes(mes)} para salvar.`); return; }

            const [metasRes, fechamentosRes, fechadoRes, divergenciasRes] = await Promise.all([
                lerTabela(supabaseClient.from('metas_mensais').select('*').eq('mes_referencia', mes)),
                lerTabela(supabaseClient.from('fechamentos').select('*').eq('mes', mes)),
                lerTabela(supabaseClient.from('meses_fechados').select('mes').eq('mes', mes)),
                lerTabela(supabaseClient.from('divergencias').select('*').eq('mes', mes))
            ]);

            const idsUsuarios = new Set();
            agendamentos.forEach(a => { if (a.user_id) idsUsuarios.add(a.user_id); });
            fechamentosRes.dados.forEach(f => { if (f.user_id) idsUsuarios.add(f.user_id); });
            divergenciasRes.dados.forEach(d => { if (d.user_id) idsUsuarios.add(d.user_id); });
            const usuarios = getPerfis().filter(p => idsUsuarios.has(p.id)).map(p => ({ id: p.id, nome: p.nome || null, dealer: p.dealer || null, email: p.email || null, equipe: p.equipe || null, role: p.role || null, inativo_desde: p.inativo_desde || null }));

            const idsInativos = [...new Set(agendamentos.map(a => a.inativo_id).filter(Boolean))];
            const inativosRes = idsInativos.length > 0
                ? await lerTabela(supabaseClient.from('operadores_inativos').select('id, dealer, apelido').in('id', idsInativos))
                : { dados: [] };

            const limpar = obj => { const c = { ...obj }; delete c.id; return c; };
            const conteudo = {
                formato: FORMATO,
                versao: VERSAO,
                gerado_em: new Date().toISOString(),
                gerado_por: usuarioAtual.email || null,
                mes,
                mes_fechado: fechadoRes.dados.length > 0,
                usuarios,
                inativos: inativosRes.dados,
                agendamentos,
                metas_mensais: metasRes.dados.map(limpar),
                fechamentos: fechamentosRes.dados.map(limpar),
                divergencias: divergenciasRes.dados.map(limpar)
            };

            const texto = JSON.stringify(conteudo);
            const blob = new Blob([texto], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const dataArquivo = new Date().toISOString().slice(0, 10);
            const link = document.createElement('a');
            link.href = url;
            link.download = `backup-${mes}-gerado-em-${dataArquivo}.json`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 2000);

            const registrado = await registrar('backup', mes, agendamentos.length, { metas: conteudo.metas_mensais.length, fechamentos: conteudo.fechamentos.length, divergencias: conteudo.divergencias.length, bytes: texto.length });
            avisar(`Backup de ${formatarMes(mes)} gerado: ${agendamentos.length} agendamentos. Guarde o arquivo em um local seguro.${registrado ? '' : ' O registro não foi salvo (script SQL do backup pendente).'}`, 'sucesso');
            carregarRegistro();
        } catch (e) {
            avisar('Não foi possível gerar o backup: ' + (e.message || e));
        } finally {
            btnGerar.disabled = false;
            btnGerar.textContent = 'Gerar backup';
        }
    }

    function validarArquivo(dados) {
        if (!dados || dados.formato !== FORMATO) return 'Este arquivo não é um backup do Painel de Bônus.';
        if (dados.versao !== VERSAO) return 'Versão de backup não suportada.';
        if (!mesValido(dados.mes)) return 'O backup não informa um mês válido.';
        if (!Array.isArray(dados.agendamentos)) return 'O backup está incompleto.';
        return null;
    }

    function abrirModal(html) {
        let overlay = document.getElementById('modalRestaurarBackup');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'modalRestaurarBackup';
            overlay.className = 'modal-overlay';
            document.body.appendChild(overlay);
        }
        overlay.innerHTML = html;
        overlay.style.display = 'flex';
        return overlay;
    }

    async function prepararRestauracao(dados) {
        const { inicio, fim } = intervalo(dados.mes);
        const perfisAtuais = getPerfis();
        const perfisPorId = new Map(perfisAtuais.map(p => [p.id, p]));
        const perfisPorDealer = new Map(perfisAtuais.filter(p => p.dealer).map(p => [normalizarDealer(p.dealer), p]));
        const usuariosBackup = new Map((dados.usuarios || []).map(u => [u.id, u]));
        const inativosBackup = new Map((dados.inativos || []).map(i => [i.id, i]));

        const existentes = await buscarTodasLinhas(() => supabaseClient.from('agendamentos').select('id, placa, revisao, data_revisao').gte('data_revisao', inicio).lte('data_revisao', fim).order('id', { ascending: true }));
        const chaves = new Set(existentes.map(e => `${e.placa}|${e.revisao}|${e.data_revisao}`));

        const inativosAtuaisRes = await lerTabela(supabaseClient.from('operadores_inativos').select('id, dealer, apelido'));
        const inativosPorDealer = new Map(inativosAtuaisRes.dados.map(i => [normalizarDealer(i.dealer), i]));

        function resolverUsuario(idBackup) {
            if (!idBackup) return null;
            if (perfisPorId.has(idBackup)) return idBackup;
            const u = usuariosBackup.get(idBackup);
            const alvo = u && u.dealer ? perfisPorDealer.get(normalizarDealer(u.dealer)) : null;
            return alvo ? alvo.id : null;
        }

        const restaurar = [];
        let jaExistiam = 0;
        const semUsuario = new Map();
        const dealersNovosInativos = new Map();

        dados.agendamentos.forEach(a => {
            if (chaves.has(`${a.placa}|${a.revisao}|${a.data_revisao}`)) { jaExistiam++; return; }
            const linha = {};
            COLUNAS_AGENDAMENTO.forEach(c => { if (a[c] !== undefined) linha[c] = a[c]; });
            delete linha.inativo_id;
            delete linha.user_id;
            if (a.inativo_id) {
                const ref = inativosBackup.get(a.inativo_id);
                const dealer = ref ? normalizarDealer(ref.dealer) : '';
                if (!dealer) { semUsuario.set('Código inativo desconhecido', (semUsuario.get('Código inativo desconhecido') || 0) + 1); return; }
                if (!inativosPorDealer.has(dealer)) dealersNovosInativos.set(dealer, { dealer: ref.dealer, apelido: ref.apelido || null });
                restaurar.push({ linha, dealerInativo: dealer });
                return;
            }
            const alvo = resolverUsuario(a.user_id);
            if (!alvo) {
                const u = usuariosBackup.get(a.user_id);
                const nome = u && u.nome ? u.nome : 'Usuário desconhecido';
                semUsuario.set(nome, (semUsuario.get(nome) || 0) + 1);
                return;
            }
            linha.user_id = alvo;
            restaurar.push({ linha });
        });

        const metasAtuais = await lerTabela(supabaseClient.from('metas_mensais').select('equipe, mes_referencia').eq('mes_referencia', dados.mes));
        const chavesMetas = new Set(metasAtuais.dados.map(m => m.equipe));
        const metasNovas = (dados.metas_mensais || []).filter(m => !chavesMetas.has(m.equipe));

        const fechAtuais = await lerTabela(supabaseClient.from('fechamentos').select('user_id').eq('mes', dados.mes));
        const usuariosComFechamento = new Set(fechAtuais.dados.map(f => f.user_id));
        const fechamentosNovos = [];
        (dados.fechamentos || []).forEach(f => {
            const alvo = resolverUsuario(f.user_id);
            if (alvo && !usuariosComFechamento.has(alvo)) fechamentosNovos.push({ ...f, user_id: alvo });
        });

        const divAtuais = await lerTabela(supabaseClient.from('divergencias').select('user_id, criado_em, descricao').eq('mes', dados.mes));
        const chavesDiv = new Set(divAtuais.dados.map(d => `${d.user_id}|${new Date(d.criado_em).getTime()}|${d.descricao}`));
        const divergenciasNovas = [];
        (dados.divergencias || []).forEach(d => {
            const alvo = resolverUsuario(d.user_id);
            if (!alvo) return;
            if (chavesDiv.has(`${alvo}|${new Date(d.criado_em).getTime()}|${d.descricao}`)) return;
            divergenciasNovas.push({ ...d, user_id: alvo });
        });

        return { restaurar, jaExistiam, semUsuario, dealersNovosInativos, inativosPorDealer, metasNovas, fechamentosNovos, divergenciasNovas };
    }

    async function executarRestauracao(dados, plano) {
        const idsInativos = new Map([...plano.inativosPorDealer].map(([d, i]) => [d, i.id]));
        for (const [dealerNorm, info] of plano.dealersNovosInativos) {
            const { data, error } = await supabaseClient.from('operadores_inativos').insert({ dealer: normalizarDealer(info.dealer), apelido: info.apelido }).select('id').single();
            if (error) throw new Error('Não foi possível recriar o código inativo ' + info.dealer + ': ' + error.message);
            idsInativos.set(dealerNorm, data.id);
        }

        const linhas = plano.restaurar.map(r => {
            const l = { ...r.linha };
            if (r.dealerInativo) { l.user_id = null; l.inativo_id = idsInativos.get(r.dealerInativo); }
            return l;
        });

        let gravados = 0;
        for (let i = 0; i < linhas.length; i += 500) {
            const bloco = linhas.slice(i, i + 500);
            const { error } = await supabaseClient.from('agendamentos').insert(bloco);
            if (error) throw new Error(`Falha após restaurar ${gravados} agendamentos: ${error.message}. Nada do que já existia foi alterado; você pode repetir a restauração.`);
            gravados += bloco.length;
        }

        const avisosExtras = [];
        if (plano.metasNovas.length > 0) {
            const { error } = await supabaseClient.from('metas_mensais').insert(plano.metasNovas.map(m => ({ equipe: m.equipe, mes_referencia: m.mes_referencia, meta_valor: m.meta_valor })));
            if (error) avisosExtras.push('metas');
        }
        if (plano.fechamentosNovos.length > 0) {
            const { error } = await supabaseClient.from('fechamentos').insert(plano.fechamentosNovos.map(f => ({ mes: f.mes, user_id: f.user_id, valor_calculado: f.valor_calculado, valor_pago: f.valor_pago, nota_monitoria: f.nota_monitoria, observacao: f.observacao || null })));
            if (error) avisosExtras.push('fechamentos');
        }
        if (plano.divergenciasNovas.length > 0) {
            const { error } = await supabaseClient.from('divergencias').insert(plano.divergenciasNovas.map(d => ({ criado_em: d.criado_em, user_id: d.user_id, mes: d.mes, tipo: d.tipo, placa: d.placa, os: d.os, descricao: d.descricao, status: d.status, resposta: d.resposta, resolvido_por: d.resolvido_por, resolvido_em: d.resolvido_em })));
            if (error) avisosExtras.push('divergências');
        }

        const semUsuarioTotal = [...plano.semUsuario.values()].reduce((s, q) => s + q, 0);
        await registrar('restauracao', dados.mes, gravados, { restaurados: gravados, ja_existiam: plano.jaExistiam, sem_usuario: semUsuarioTotal, metas: plano.metasNovas.length, fechamentos: plano.fechamentosNovos.length, divergencias: plano.divergenciasNovas.length });
        return { gravados, avisosExtras };
    }

    async function restaurar() {
        const arquivo = campoArquivo.files[0];
        if (!arquivo) { avisar('Escolha o arquivo de backup.'); return; }
        btnRestaurar.disabled = true;
        try {
            let dados;
            try { dados = JSON.parse(await arquivo.text()); } catch (e) { avisar('Não foi possível ler o arquivo. Ele precisa ser um backup gerado pelo sistema (.json).'); return; }
            const problema = validarArquivo(dados);
            if (problema) { avisar(problema); return; }
            if (dados.mes >= mesAtual) { avisar(`Só é possível restaurar meses anteriores ao mês atual. Este backup é de ${formatarMes(dados.mes)}.`); return; }

            const fechado = await lerTabela(supabaseClient.from('meses_fechados').select('mes').eq('mes', dados.mes));
            if (fechado.dados.length > 0) { avisar(`O mês ${formatarMes(dados.mes)} está fechado. Reabra o mês na aba Fechamento, restaure e feche novamente.`); return; }

            const plano = await prepararRestauracao(dados);
            const semUsuarioTotal = [...plano.semUsuario.values()].reduce((s, q) => s + q, 0);
            const linhasResumo = [
                ['Mês do backup', formatarMes(dados.mes)],
                ['Gerado em', formatarDataHora(dados.gerado_em)],
                ['Agendamentos no arquivo', String(dados.agendamentos.length)],
                ['Já existem no sistema (ignorados)', String(plano.jaExistiam)],
                ['Serão restaurados', String(plano.restaurar.length)]
            ];
            if (plano.dealersNovosInativos.size > 0) linhasResumo.push(['Códigos inativos a recriar', [...plano.dealersNovosInativos.values()].map(i => i.dealer).join(', ')]);
            if (semUsuarioTotal > 0) linhasResumo.push(['Sem usuário no sistema (ignorados)', String(semUsuarioTotal)]);
            if (plano.metasNovas.length > 0) linhasResumo.push(['Metas a restaurar', String(plano.metasNovas.length)]);
            if (plano.fechamentosNovos.length > 0) linhasResumo.push(['Fechamentos a restaurar', String(plano.fechamentosNovos.length)]);
            if (plano.divergenciasNovas.length > 0) linhasResumo.push(['Divergências a restaurar', String(plano.divergenciasNovas.length)]);

            const detalheSem = semUsuarioTotal > 0
                ? `<details class="aviso-resumo"><summary>${plano.semUsuario.size} ${plano.semUsuario.size === 1 ? 'usuário não existe mais' : 'usuários não existem mais'} (essas linhas não voltam). Ver lista</summary><ul>${[...plano.semUsuario].map(([n, q]) => `<li><span>${escaparHtml(n)} (${q} ${q === 1 ? 'linha' : 'linhas'})</span></li>`).join('')}</ul></details>`
                : '';

            const overlay = abrirModal(`
                <div class="modal-card-metas">
                    <div class="modal-topo-metas"><h3>Restaurar backup</h3></div>
                    <div class="modal-corpo-metas">
                        <div class="resumo-confirmacao">
                            ${linhasResumo.map(([r, v]) => `<div class="linha-resumo"><span>${escaparHtml(r)}</span><strong>${escaparHtml(v)}</strong></div>`).join('')}
                            ${detalheSem}
                            <p class="aviso-resumo-nota">Nada que já existe no sistema é alterado ou apagado. Só entram os registros que estão faltando. Os dados voltam como estavam naquele mês, vinculados aos mesmos usuários (ou aos inativos). O mês não é fechado automaticamente.</p>
                        </div>
                    </div>
                    <div class="modal-rodape-metas">
                        <button type="button" id="btnRestaurarCancelar" class="btn-cancelar-modal">Cancelar</button>
                        <button type="button" id="btnRestaurarConfirmar" class="btn-salvar-modal" ${plano.restaurar.length + plano.metasNovas.length + plano.fechamentosNovos.length + plano.divergenciasNovas.length === 0 ? 'disabled' : ''}>Restaurar</button>
                    </div>
                </div>`);
            const fechar = () => { overlay.style.display = 'none'; };
            overlay.querySelector('#btnRestaurarCancelar').addEventListener('click', fechar);
            overlay.querySelector('#btnRestaurarConfirmar').addEventListener('click', async () => {
                const botao = overlay.querySelector('#btnRestaurarConfirmar');
                botao.disabled = true;
                botao.textContent = 'Restaurando...';
                try {
                    const { gravados, avisosExtras } = await executarRestauracao(dados, plano);
                    fechar();
                    campoArquivo.value = '';
                    rotuloArquivo.textContent = 'Nenhum arquivo escolhido';
                    avisar(`Restauração concluída: ${gravados} agendamentos restaurados.${avisosExtras.length ? ' Não foi possível restaurar: ' + avisosExtras.join(', ') + '.' : ''}`, avisosExtras.length ? undefined : 'sucesso');
                    carregarRegistro();
                    if (ctx.aoRestaurar) ctx.aoRestaurar();
                } catch (e) {
                    fechar();
                    avisar(e.message || String(e));
                }
            });
        } catch (e) {
            avisar('Não foi possível preparar a restauração: ' + (e.message || e));
        } finally {
            btnRestaurar.disabled = false;
        }
    }

    campoArquivo.addEventListener('change', () => {
        rotuloArquivo.textContent = campoArquivo.files[0] ? campoArquivo.files[0].name : 'Nenhum arquivo escolhido';
    });
    btnGerar.addEventListener('click', gerar);
    btnRestaurar.addEventListener('click', restaurar);

    window.verificarBackupDoMes = async function (mes) {
        const inicioDia = new Date();
        inicioDia.setHours(0, 0, 0, 0);
        const { data, error } = await supabaseClient.from('backups_registro').select('id').eq('tipo', 'backup').eq('mes', mes).gte('criado_em', inicioDia.toISOString()).limit(1);
        if (error) return null;
        return (data || []).length > 0;
    };

    return { carregarRegistro };
};
