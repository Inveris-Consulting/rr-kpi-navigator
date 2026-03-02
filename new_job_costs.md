## A tabela de jobs costs precisa ser remodelada para refletir as necessidades da gestão

### 1. O que precisa ser feito

- Cadastro, ativação e inativação de jobs
- Atualização de datas dos jobs
- Cadastro de recebimentos dos clientes
- cadastro de pagamentos do Indeed
- Cadastro de outros pagamentos
- Ativação de employees como custo
- Os employees devem ter uma data de início e fim
- Cada cadastro de operação ex: pagamentos e recebimentos devem ser vinculados a um cliente
- Os clientes devem ser classificados através de uma coluna com uma flag para cada um dos seguintes deparatamentos: Placement, Prospecting, RAR. Podendo um cliente ser vinculado a mais de um deles, por isso deve ser criado uma coluna boolean para cada um deles


### 2. Cadastro de KPIs
- Deve ter uma página de gestão de KPIs onde o admin poderá cadastrar novos KPIs, vincular usuários, vincular um dos 3 departamentos e indicar se aquele KPI é referente a um cliente ou geral.
- Quando os KPIs forem referentes a um cliente, na tela de Add KPI Entry, deve haver um campo para selecionar o cliente ou Geral, mostrando os KPIs referentes a seleção.
- Na parte superior de Add KPI Entry deverá mostrar com base no RLS do usuário, quais clientes ainda não foram cadastrados na data atual.

### 3. Dashboards
- Os dashboards agora terão que ter um filtro por cliente, com opção de todos ou um cliente específico, sendo os KPIs geral mostrados somente em todos.
- Em todos os dashboards das abas Overview, Placement, Prospecting e RAR, deverá haver uma visualização que mostra os KPIs por cliente, incluindo o geral.
- Um novo dashboard deve ser criado focado em Job Costs, mostrando os recebimentos, pagamentos e custos de employees por cliente, além do cálculo já realizado de rateamento por job, tudo deve ser rateado por job respeitando a data de vigência do job em relação as datas de pagamento e recebimento.
- o dashboard de Job Costs deve ter uma tabela que mostra: Cliente, Payment Status, Payment Received Date, Amount due, Amount Received, Outstanding Balance, Follow-Up Required e Notes. Todos esses campos devem ser colunas da tabela de recebimentos e está presente para cadastro na aba de job costs.
- É preciso ainda no dashboar de job costs mostrar um gráfico de recebimentos e pagamentos por cliente.
- É preciso ainda no dashboar de job costs mostrar cards com os principais KPIs.
- no dashboard de job costs é preciso ter uma visão qeu demostre KPI's improtantes para o cliente como: # Hires, Candidates Sent, Candidates Approved, Interviews Scheduled, Interviews Completed, cancellations, No Shows, Not Selected, Indeed Cost for the month (esse vem dos pagamentos) e se o job está ativo. Caso algum dos KPI's acima já não existam, deve-se criar na tabela de KPI's e vincular a RAR.

### obs: toda a plataforma deve estar em inglês
### obs2: utilize o MCP do supabase para as operações de banco de dados