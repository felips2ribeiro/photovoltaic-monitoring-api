# API de Monitoramento de Usinas Fotovoltaicas - Desafio TECSCI

Protótipo de API para monitoramento de usinas fotovoltaicas, desenvolvido como parte do processo seletivo da TECSCI.

## Objetivos do Sistema

- Ingerir, armazenar e validar dados operacionais de geração de energia provenientes de fontes externas (arquivo `metrics.json`).
- Persistir os dados em um banco de dados relacional (SQLite).
- Fornecer insights operacionais simples com base nos dados, como potência máxima, médias de temperatura e geração de energia.

## Tecnologias Utilizadas

- **Linguagem:** TypeScript
- **Framework:** NestJS
- **Banco de Dados:** SQLite (via TypeORM)
- **ORM:** TypeORM
- **Validação de Dados:** `class-validator`, `class-transformer`
- **Documentação da API:** Swagger (OpenAPI) via `@nestjs/swagger`
- **Testes:** Jest (Testes Unitários e End-to-End) com `supertest` para E2E.

## Estrutura do Projeto

O projeto segue a arquitetura modular padrão do NestJS, com clara separação por domínios:

- **`src/database`**: Configuração da conexão com o banco de dados (TypeORM).
- **`src/plants`**: Gerenciamento de Usinas (CRUD, DTOs, Entidade, Service, Controller, Testes).
- **`src/inverters`**: Gerenciamento de Inversores (CRUD, DTOs, Entidade, Service, Controller, Testes), com associação a Usinas.
- **`src/metrics`**: Ingestão e armazenamento de dados de medição dos inversores (DTOs, Entidade, Service, Controller para ingestão).
- **`src/analytics`**: Endpoints para fornecer insights e agregações dos dados (DTOs, Service, Controller).
- **`src/main.ts`**: Ponto de entrada da aplicação, configuração de pipes globais (Validação), prefixo de API global (se aplicável) e inicialização do Swagger.
- **`src/app.module.ts`**: Módulo raiz da aplicação, responsável por importar todos os outros módulos principais e realizar o seeding inicial de dados.
- **`test/`**: Contém os testes End-to-End (`app.e2e-spec.ts`).

## Configuração e Execução

### Pré-requisitos

- Node.js (versão LTS recomendada, ex: v18.x ou v20.x)
- npm (geralmente vem com o Node.js) ou yarn

### Instalação

1.  Clone o repositório:
    ```bash
    git clone https://github.com/felips2ribeiro/photovoltaic-monitoring-api.git
    cd photovoltaic-monitoring-api
    ```
2.  Instale as dependências:
    ```bash
    npm install
    ```
    ou
    ```bash
    yarn install
    ```
3.  Configure as variáveis de ambiente:
    Crie um arquivo `.env` na raiz do projeto copiando o conteúdo de `.env.example` e ajuste se necessário. Para este projeto, as configurações padrão do `.env.example` devem funcionar para SQLite:
    ```env
    # .env
    NODE_ENV=development
    API_PORT=3000
    DATABASE_TYPE=sqlite
    DATABASE_NAME=photovoltaic.sqlite
    # TYPEORM_LOGGING=true # Descomente para ver logs SQL detalhados (pode poluir o console)
    ```

### Executando a Aplicação

-   **Modo de Desenvolvimento (com watch mode para recarregamento automático):**
    ```bash
    npm run start:dev
    ```
    A aplicação estará disponível em `http://localhost:3000` (ou a porta definida em `API_PORT`).
    A documentação interativa da API (Swagger UI) estará disponível em `http://localhost:3000/api-docs`.

-   **Build para Produção:**
    ```bash
    npm run build
    ```

-   **Rodar em Modo de Produção (após o build):**
    ```bash
    npm run start:prod
    ```

### Populando o Banco de Dados

O sistema é configurado para facilitar a inicialização dos dados:

1.  **Dados Base (Usinas e Inversores):**
    *   Ao iniciar a aplicação pela primeira vez (ex: `npm run start:dev`), os dados base para **Usina 1**, **Usina 2** e os **Inversores com `externalId` de 1 a 8** (associados corretamente às suas usinas) são automaticamente criados no banco de dados, caso ainda não existam.
    *   Esta etapa é gerenciada pelo hook `onModuleInit` no `AppModule` e garante que a estrutura fundamental para as métricas esteja presente.

2.  **Dados de Métricas (do arquivo `metrics.json`):**
    *   Certifique-se de que o arquivo `metrics.json` (fornecido pelo desafio ou um exemplo com o mesmo formato) está presente na **raiz do projeto**.
    *   Após a aplicação iniciar e os dados base serem criados, você precisa disparar a ingestão das métricas. Para isso, envie uma requisição **POST** para o seguinte endpoint:
        `POST http://localhost:3000/metrics/ingest-file`
    *   Você pode usar a interface do Swagger UI (em `/api-docs`) para executar este endpoint (procure pela tag `metrics`). Não é necessário enviar um corpo na requisição.
    *   Recomenda-se executar esta etapa uma única vez após a primeira inicialização e criação do banco. O endpoint retornará um resumo da operação de ingestão.

### Executando os Testes

-   **Rodar todos os testes (unitários e E2E):**
    ```bash
    npm test
    ```
-   **Rodar apenas os testes End-to-End:**
    ```bash
    npm run test:e2e
    ```
-   **Gerar relatório de cobertura de testes:**
    ```bash
    npm run test:cov
    ```
    O relatório interativo será gerado na pasta `coverage/lcov-report/index.html`.

## Endpoints da API

A documentação completa e interativa da API está disponível via Swagger UI em `/api-docs` quando a aplicação está em execução.

Principais grupos de endpoints:

-   **Usinas (`/plants`):** CRUD completo para gerenciamento de usinas.
-   **Inversores (`/inverters`):** CRUD completo para gerenciamento de inversores, incluindo associação a usinas e filtro por `plantId`.
-   **Métricas (`/metrics`):**
    -   `POST /metrics/ingest-file`: Dispara a ingestão dos dados de medição do arquivo `metrics.json`.
-   **Analytics (`/analytics`):**
    -   `GET /analytics/inverters/:inverterId/max-power-by-day`: Retorna a potência ativa máxima registrada por dia para um inversor específico, dentro de um intervalo de datas (`data_inicio`, `data_fim` como query params).
    -   *(Outros endpoints de analytics a serem implementados)*

## Decisões de Design e Justificativas

-   **DTOs de Entrada e Resposta:** DTOs (Data Transfer Objects) são utilizados extensivamente para:
    -   Validar os dados de entrada das requisições (`class-validator`).
    -   Transformar dados de entrada (`class-transformer`).
    -   Definir contratos claros para as respostas da API (`XxxResponseDto`), permitindo a omissão seletiva de campos (ex: `updatedAt` de entidades) e o desacoplamento da representação da API das entidades internas. Isso é ativado usando o `ClassSerializerInterceptor` do NestJS.
-   **Seeding e Ingestão de Dados:**
    -   **Dados Base (Usinas e Inversores):** São automaticamente "semeados" no banco de dados na inicialização da aplicação (`onModuleInit` no `AppModule`). Isso garante que o ambiente de desenvolvimento e teste esteja pronto rapidamente com a estrutura de dados fundamental, verificando a existência antes de criar para evitar duplicatas.
    -   **Ingestão de Métricas:** A ingestão dos dados volumosos do `metrics.json` é controlada por um endpoint dedicado (`POST /metrics/ingest-file`). Esta abordagem foi escolhida para:
        -   Dar controle explícito sobre quando essa operação (potencialmente mais longa) é executada.
        -   Evitar re-ingestões automáticas e desnecessárias a cada reinício da aplicação no modo de desenvolvimento (watch mode).
        -   Permitir um feedback claro ao usuário sobre o resultado do processo de ingestão.
-   **Tratamento de Dados de Métricas:**
    -   **`potencia_ativa_watt: null`:** O sistema foi configurado para aceitar `null` como um valor válido para `potencia_ativa_watt` no arquivo `metrics.json`. Esses valores são persistidos como `NULL` no banco de dados, representando momentos em que pode ter ocorrido uma falha na leitura do sensor ou ausência de dados. Isso permite registrar todos os timestamps de medição. Os endpoints de analytics são responsáveis por tratar esses valores nulos apropriadamente (ex: ignorando-os em cálculos de `MAX` ou `AVG`).
    -   **Estrutura de Data Aninhada (`datetime: { $date: "ISO_STRING" }`):** O DTO de ingestão (`IngestMetricRecordDto`) utiliza `@Transform` do `class-transformer` para converter essa estrutura aninhada em um objeto `Date` padrão do JavaScript antes da validação e persistência.
-   **Validação de Datas em Query Parameters:** Para parâmetros de data como `data_inicio` e `data_fim`, a validação estrita `@IsISO8601()` foi comentada nos DTOs de query para melhor compatibilidade com a forma como o Swagger UI pode enviar os dados. A transformação para objetos `Date` e a validação subsequente com `@IsDate()` são mantidas para garantir que datas válidas sejam processadas pelo backend.
-   **Consultas de Analytics:** Utilizam o QueryBuilder do TypeORM para flexibilidade e para construir queries SQL otimizadas para agregações e agrupamentos. Funções específicas do banco (ex: `strftime` para SQLite) são usadas para manipulação de datas nas queries.
