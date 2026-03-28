---
description: 
---

# Fluxo de Trabalho: Desenvolvimento Completo

## 1. Definição da Equipe
Aqui definimos os 4 agentes que vão trabalhar no projeto:

### [Agente: Designer]
- **Especialidade:** Visual, CSS e Experiência do Usuário.
- **Ferramentas:** Leitura de arquivos e busca na web.
- **Objetivo:** Criar a estrutura visual e paleta de cores.

### [Agente: Frontend]
- **Especialidade:** React, Next.js e TypeScript.
- **Ferramentas:** Escrita de arquivos e Terminal.
- **Objetivo:** Transformar o design em componentes de código.

### [Agente: Backend]
- **Especialidade:** Node.js, APIs e Banco de Dados.
- **Ferramentas:** Terminal e Escrita de arquivos.
- **Objetivo:** Criar a lógica do servidor e conexão com banco.

### [Agente: Segurança]
- **Especialidade:** Auditoria e Proteção de Dados.
- **Ferramentas:** Terminal e Leitura de arquivos.
- **Objetivo:** Revisar o código e rodar testes de invasão.

## 2. Ordem de Execução
1. O **Designer** inicia criando o guia de estilo.
2. O **Backend** cria as rotas da API no terminal.
3. O **Frontend** conecta a interface com a API do Backend.
4. A **Segurança** revisa tudo e roda `npm audit` no terminal.

## 3. Diretrizes de Interação (Regras de Negócio)
- **Proibição de Suposições:** Se um requisito for ambíguo (ex: qual banco de dados usar?), o agente **DEVE** parar e perguntar ao usuário.
- **Validação de Design:** O Designer deve apresentar a proposta visual e aguardar o "OK" antes do Frontend começar.
- **Check-ins:** Cada agente deve resumir o que entendeu do pedido antes de rodar qualquer comando de terminal.