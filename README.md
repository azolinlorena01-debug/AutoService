# Painel de Bônus

Sistema web para controle de agendamentos e cálculo de bonificação de uma equipe de agendamento de revisões automotivas.

Criei este projeto para resolver um problema real do meu trabalho: o controle de agendamentos, comparecimentos e bônus era feito de forma manual, o que tomava tempo e abria espaço para erros. O sistema está em fase de testes, antes de entrar em uso na operação.

🔗 **Acesse:** [azolinlorena01-debug.github.io/AutoService](https://azolinlorena01-debug.github.io/AutoService/) (acesso com login)

<!-- Adicione aqui 2 ou 3 prints com dados fictícios, por exemplo:
![Tela de agendamentos](imagens/print-agendamentos.png)
![Tela de fechamento](imagens/print-fechamento.png)
-->

## Funcionalidades

- **Login com dois perfis:** administrador (gestão) e consultor, cada um com as telas e permissões do seu papel
- **Importação de planilhas mensais**, com regras de contagem por tipo de serviço e confirmação antes de importar
- **Cálculo de bonificação** a partir dos agendamentos e comparecimentos, com metas por marca
- **Fechamento do mês** pela gestão, com valor final por funcionário e exportação em PDF/Excel
- **Divergências:** o consultor sinaliza um problema e a gestão acompanha e resolve
- **Relatórios** e acompanhamento da evolução dos meses fechados
- **Backup** dos dados dentro do próprio sistema
- **Modo claro e escuro**

## Tecnologias

- HTML, CSS e JavaScript
- [Supabase](https://supabase.com/) (banco de dados e autenticação)
- GitHub Pages (hospedagem)

## O que aprendi

Este é meu primeiro projeto. Usei ferramentas de IA como apoio para aprender e resolver o que eu ainda não sabia, e com isso aprendi na prática a:

- transformar regras de negócio reais em funcionalidades
- organizar permissões diferentes para cada tipo de usuário
- trabalhar com banco de dados e autenticação
- versionar e publicar um projeto com Git e GitHub

## Autora

**Lorena Mendes**, estudante de Análise e Desenvolvimento de Sistemas na Universidade Positivo
[LinkedIn](https://www.linkedin.com/in/lorena-mendes-tech)
