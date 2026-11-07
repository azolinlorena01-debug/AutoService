import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function resposta(status: number, corpo: Record<string, unknown>) {
  return new Response(JSON.stringify(corpo), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

function normalizar(texto: unknown) {
  return String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, '').trim();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return resposta(405, { erro: 'Método não permitido.' });

  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const servico = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const quem = createClient(url, anon, { global: { headers: { Authorization: req.headers.get('Authorization') || '' } } });
    const { data: { user } } = await quem.auth.getUser();
    if (!user) return resposta(401, { erro: 'Sessão inválida. Entre novamente.' });

    const admin = createClient(url, servico);
    const { data: chamador } = await admin.from('perfis').select('role').eq('id', user.id).maybeSingle();
    if (!chamador || chamador.role !== 'admin') return resposta(403, { erro: 'Apenas administradores podem executar esta ação.' });

    const corpo = await req.json();

    if (corpo.acao === 'senha') {
      const senha = String(corpo.senha || '');
      if (!corpo.user_id || senha.length < 8) return resposta(400, { erro: 'Informe uma senha com pelo menos 8 caracteres.' });
      const { error } = await admin.auth.admin.updateUserById(String(corpo.user_id), { password: senha });
      if (error) return resposta(400, { erro: error.message });
      return resposta(200, { ok: true });
    }

    if (corpo.acao === 'excluir') {
      const alvo = String(corpo.user_id || '');
      if (!alvo) return resposta(400, { erro: 'Usuário não informado.' });
      if (alvo === user.id) return resposta(400, { erro: 'Você não pode excluir a própria conta.' });

      const { data: perfilAlvo } = await admin.from('perfis').select('id, nome, role, inativo_desde').eq('id', alvo).maybeSingle();
      if (!perfilAlvo) return resposta(404, { erro: 'Usuário não encontrado.' });
      if (perfilAlvo.role === 'admin') return resposta(400, { erro: 'Administradores não podem ser excluídos por aqui.' });
      if (!perfilAlvo.inativo_desde) return resposta(400, { erro: 'Inative o usuário antes de excluir.' });

      const { count, error: erroContagem } = await admin.from('agendamentos').select('id', { count: 'exact', head: true }).eq('user_id', alvo);
      if (erroContagem) return resposta(500, { erro: erroContagem.message });
      if (count && count > 0) return resposta(409, { erro: `${perfilAlvo.nome} possui ${count} agendamento(s) e não pode ser excluído.` });

      await admin.from('fechamentos').delete().eq('user_id', alvo);
      await admin.from('divergencias').delete().eq('user_id', alvo);

      const { error: erroPerfil } = await admin.from('perfis').delete().eq('id', alvo);
      if (erroPerfil) return resposta(400, { erro: 'Não foi possível excluir o perfil: ' + erroPerfil.message });

      const { error: erroLogin } = await admin.auth.admin.deleteUser(alvo);
      if (erroLogin) return resposta(400, { erro: 'Perfil excluído, mas o login não: ' + erroLogin.message });

      return resposta(200, { ok: true });
    }

    if (corpo.acao === 'criar') {
      const nome = String(corpo.nome || '').trim();
      const email = String(corpo.email || '').trim().toLowerCase();
      const senha = String(corpo.senha || '');
      const dealer = normalizar(corpo.dealer);
      const role = corpo.role === 'admin' ? 'admin' : 'consultor';
      const equipe = String(corpo.equipe || '').trim() || null;

      if (!nome) return resposta(400, { erro: 'Informe o nome completo.' });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return resposta(400, { erro: 'Informe um e-mail válido.' });
      if (senha.length < 8) return resposta(400, { erro: 'A senha temporária precisa ter pelo menos 8 caracteres.' });

      if (dealer) {
        const { data: existente, error: erroBusca } = await admin.from('perfis').select('nome').ilike('dealer', dealer).limit(1);
        if (!erroBusca && existente && existente.length > 0) return resposta(409, { erro: `O dealer ${dealer} já está vinculado a ${existente[0].nome}.` });
      }

      const { data: criado, error: erroCriar } = await admin.auth.admin.createUser({ email, password: senha, email_confirm: true });
      if (erroCriar || !criado || !criado.user) {
        const msg = erroCriar ? erroCriar.message : 'Falha ao criar o login.';
        return resposta(400, { erro: /already|registered|exists/i.test(msg) ? 'Já existe um login com este e-mail.' : msg });
      }

      const id = criado.user.id;
      let { error: erroPerfil } = await admin.from('perfis').upsert({ id, nome, role, equipe, dealer: dealer || null, email });
      if (erroPerfil && /dealer|email/i.test(erroPerfil.message)) {
        ({ error: erroPerfil } = await admin.from('perfis').upsert({ id, nome, role, equipe }));
      }
      if (erroPerfil) {
        await admin.auth.admin.deleteUser(id);
        return resposta(400, { erro: 'Não foi possível criar o perfil: ' + erroPerfil.message });
      }

      return resposta(200, { ok: true, id });
    }

    return resposta(400, { erro: 'Ação inválida.' });
  } catch (e) {
    return resposta(500, { erro: String((e as Error).message || e) });
  }
});
