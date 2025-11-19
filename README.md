# Controle de Estoque - Serverless SQLite (WASM)

Aplicação web de gerenciamento de inventário de alta performance, executando um banco de dados relacional completo **diretamente no navegador** através de WebAssembly.

## Sobre o Projeto

Este sistema foi desenvolvido para demonstrar uma arquitetura **Local-First** e **Serverless Client-Side**. Diferente de aplicações web tradicionais que dependem de uma API e um banco de dados na nuvem, este projeto roda o motor do **SQLite** dentro da memória do usuário.

Isso garante:
1.  **Privacidade:** Os dados não saem da máquina do usuário a menos que exportados.
2.  **Velocidade:** Zero latência de rede para operações de banco de dados.
3.  **Portabilidade:** O banco de dados é um arquivo físico (`.sqlite`) que pode ser transportado.

## Funcionalidades

* **CRUD Completo via SQL:**
    * Criação, Leitura, Atualização e Remoção de produtos usando comandos SQL reais (`INSERT`, `SELECT`, `UPDATE`, `DELETE`).
* **Persistência Híbrida:**
    * *Cache:* Salvamento automático no `localStorage` para persistência entre recargas de página.
    * *Arquivo Físico:* Funcionalidade de **Exportar** e **Importar** o banco de dados (`.sqlite`) para backup ou migração entre computadores.
* **Dashboard em Tempo Real:**
    * Cálculo automático de valor total em estoque e quantidade de itens.
* **UX/UI:**
    * Interface moderna com Tailwind CSS.
    * Feedback visual para estoques baixos (alertas coloridos).
    * Filtros de busca instantâneos.

## Tecnologias Utilizadas

* **Frontend:** React.js (Vite)
* **Banco de Dados:** SQLite (via `sql.js` / WebAssembly)
* **Estilização:** Tailwind CSS
* **Ícones:** Lucide React

## Como Executar o Projeto

### Pré-requisitos
* Node.js instalado (v18 ou superior recomendado)

### Passo a Passo

1.  **Clone o repositório:**
    ```bash
    git clone [https://github.com/SEU-USUARIO/controle-estoque-sqlite.git](https://github.com/SEU-USUARIO/controle-estoque-sqlite.git)
    ```

2.  **Entre na pasta:**
    ```bash
    cd controle-estoque-sqlite
    ```

3.  **Instale as dependências:**
    ```bash
    npm install
    ```

4.  **Execute o projeto:**
    ```bash
    npm run dev
    ```

5.  **Acesse no navegador:**
    Abra o link exibido no terminal (geralmente `http://localhost:5173`).

## Estrutura de Arquivos

* `src/App.jsx`: Contém toda a lógica da aplicação, incluindo a inicialização do WASM, manipuladores de eventos e renderização da UI.
* `src/assets`: Recursos estáticos.
* `public/`: Contém os binários do `sql-wasm` (caso opte por rodar offline sem CDN).

## Decisões de Arquitetura

**Por que SQLite no Navegador?**
Para este MVP (Produto Viável Mínimo), optou-se por remover a complexidade de configurar um servidor Backend (Node/Python) + Banco de Dados (Postgres/MySQL).

Utilizando o `sql.js`, compilamos o código C do SQLite para WebAssembly. O React atua como interface, enviando queries SQL para esse módulo WASM na memória RAM. A persistência é garantida serializando o banco de dados em binário e salvando no `localStorage` ou exportando como arquivo.

---
Desenvolvido para fins acadêmicos e de demonstração de tecnologias WebAssembly.
