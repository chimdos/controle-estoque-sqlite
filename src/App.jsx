import React, { useState, useEffect, useMemo } from 'react';
import { Trash2, Plus, Package, Save, Database, AlertCircle, Loader2, Search, Edit, X, Download, Upload } from 'lucide-react';
// Certifique-se de ter instalado o sql.js: npm install sql.js
const SQL_JS_URL = "sql-wasm.js";
const SQL_WASM_URL = "sql-wasm.wasm";
import initSqlJs from 'sql.js';

export default function App() {
    const [db, setDb] = useState(null);
    const [produtos, setProdutos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filtro, setFiltro] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [novoProduto, setNovoProduto] = useState({
        nome: '',
        preco: '',
        quantidade: '',
        categoria: 'Geral'
    });

    // 1. Inicialização do Banco de Dados (SQLite)
    useEffect(() => {
        const initDB = async () => {
            try {
                // Detecta se estamos rodando no Android via AssetLoader ou no PC
                const isAndroidAssetLoader = window.location.hostname === 'appassets.androidplatform.net';
                
                // Define a URL base para os arquivos (wasm e sqlite)
                // No Android, usamos o caminho absoluto virtual. No PC, o relativo './'
                const baseUrl = isAndroidAssetLoader 
                    ? 'https://appassets.androidplatform.net/assets/' 
                    : './';

                console.log("Ambiente detectado:", isAndroidAssetLoader ? "Android WebView" : "Web Browser");
                console.log("Base URL para assets:", baseUrl);

                // Inicializa o SQL.js com o caminho correto do arquivo WASM
                const SQL = await initSqlJs({
                    // A função locateFile permite dizer ao sql.js onde buscar o .wasm
                    locateFile: file => `${baseUrl}${file}`
                });

                // Guarda referência global para depuração, se necessário
                window.SQL = SQL; 

                // Tenta recuperar dados salvos no localStorage primeiro (persistência simples)
                const savedDb = localStorage.getItem("estoque_sqlite_db");
                let database;

                if (savedDb) {
                    console.log("Carregando banco de dados do localStorage...");
                    const uInt8Array = new Uint8Array(JSON.parse(savedDb));
                    database = new SQL.Database(uInt8Array);
                } else {
                    // Se não houver localStorage, tenta carregar o arquivo inicial 'dados_apresentacao.sqlite'
                    console.log(`Tentando baixar banco inicial de: ${baseUrl}dados_apresentacao.sqlite`);
                    
                    try {
                        const response = await fetch(`${baseUrl}dados_apresentacao.sqlite`);
                        
                        if (response.ok) {
                            const buf = await response.arrayBuffer();
                            database = new SQL.Database(new Uint8Array(buf));
                            console.log("Banco de dados inicial carregado com sucesso!");
                        } else {
                            throw new Error(`Arquivo inicial não encontrado (Status: ${response.status})`);
                        }
                    } catch (fetchErr) {
                        console.warn("Falha ao carregar arquivo inicial, criando banco vazio.", fetchErr);
                        // Fallback: Cria um banco novo vazio na memória se o arquivo não for encontrado
                        database = new SQL.Database();
                        database.run(`
                            CREATE TABLE IF NOT EXISTS produtos (
                              id INTEGER PRIMARY KEY AUTOINCREMENT,
                              nome TEXT NOT NULL,
                              preco REAL NOT NULL,
                              quantidade INTEGER NOT NULL,
                              categoria TEXT
                            );
                        `);
                    }
                }

                setDb(database);
                // Garante que a tabela existe (mesmo se carregou um arquivo corrompido/velho)
                database.run(`
                    CREATE TABLE IF NOT EXISTS produtos (
                      id INTEGER PRIMARY KEY AUTOINCREMENT,
                      nome TEXT NOT NULL,
                      preco REAL NOT NULL,
                      quantidade INTEGER NOT NULL,
                      categoria TEXT
                    );
                `);
                
                atualizarLista(database);
                setLoading(false);

            } catch (err) {
                console.error("ERRO FATAL ao iniciar SQLite:", err);
                setError(`Falha na inicialização: ${err.message}`);
                setLoading(false);
            }
        };

        initDB();
    }, []);

    // 2. Persistência no LocalStorage
    const salvarBanco = (database) => {
        try {
            const data = database.export();
            const array = Array.from(data);
            localStorage.setItem("estoque_sqlite_db", JSON.stringify(array));
        } catch (e) {
            console.error("Erro ao salvar no localStorage:", e);
        }
    };

    // 3. Função R (Read)
    const atualizarLista = (database = db) => {
        if (!database) return;
        try {
            const resultado = database.exec("SELECT * FROM produtos ORDER BY id DESC");

            if (resultado.length > 0 && resultado[0].values) {
                const colunas = resultado[0].columns;
                const valores = resultado[0].values;

                const listaFormatada = valores.map(row => {
                    let obj = {};
                    colunas.forEach((col, index) => {
                        obj[col] = row[index];
                    });
                    return obj;
                });
                setProdutos(listaFormatada);
            } else {
                setProdutos([]);
            }
        } catch (e) {
            console.error("Erro ao ler tabela:", e);
        }
    };

    // === FUNÇÕES DE EXPORTAR / IMPORTAR ===

    const handleExportarBanco = () => {
        if (!db) return;
        try {
            const data = db.export();
            const blob = new Blob([data], { type: 'application/x-sqlite3' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = 'meu_estoque.sqlite';
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            alert("Erro ao exportar: " + e.message);
        }
    };

    const handleImportarBanco = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            try {
                const uInt8Array = new Uint8Array(reader.result);
                // Reinicia o SQL.js com o novo arquivo
                const newDb = new window.SQL.Database(uInt8Array);

                setDb(newDb);
                salvarBanco(newDb); // Salva no localStorage
                atualizarLista(newDb);
                alert("Banco de dados carregado com sucesso!");
            } catch (err) {
                alert("Erro ao ler arquivo: " + err.message);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    // 4. Função C (Create) e U (Update)
    const handleSalvar = (e) => {
        e.preventDefault();
        if (!db) return;

        try {
            if (editingId) {
                const stmt = db.prepare("UPDATE produtos SET nome=$nome, preco=$preco, quantidade=$qtd, categoria=$cat WHERE id=$id");
                stmt.bind({
                    $nome: novoProduto.nome,
                    $preco: parseFloat(novoProduto.preco),
                    $qtd: parseInt(novoProduto.quantidade),
                    $cat: novoProduto.categoria,
                    $id: editingId
                });
                stmt.step();
                stmt.free();
            } else {
                const stmt = db.prepare("INSERT INTO produtos (nome, preco, quantidade, categoria) VALUES ($nome, $preco, $qtd, $cat)");
                stmt.bind({
                    $nome: novoProduto.nome,
                    $preco: parseFloat(novoProduto.preco),
                    $qtd: parseInt(novoProduto.quantidade),
                    $cat: novoProduto.categoria
                });
                stmt.step();
                stmt.free();
            }

            salvarBanco(db);
            atualizarLista(db);
            handleCancelar();

        } catch (err) {
            alert("Erro ao salvar: " + err.message);
        }
    };

    const handleEditar = (produto) => {
        setNovoProduto({
            nome: produto.nome,
            preco: produto.preco,
            quantidade: produto.quantidade,
            categoria: produto.categoria
        });
        setEditingId(produto.id);
    };

    const handleCancelar = () => {
        setNovoProduto({ nome: '', preco: '', quantidade: '', categoria: 'Geral' });
        setEditingId(null);
    };

    const handleRemover = (id) => {
        if (!db) return;
        if (!window.confirm("Tem certeza que deseja excluir este item?")) return;

        try {
            db.run("DELETE FROM produtos WHERE id = ?", [id]);
            salvarBanco(db);
            atualizarLista(db);

            if (editingId === id) {
                handleCancelar();
            }
        } catch (err) {
            alert("Erro ao remover: " + err.message);
        }
    };

    const totais = useMemo(() => {
        return produtos.reduce((acc, curr) => {
            acc.qtd += curr.quantidade;
            acc.valor += curr.quantidade * curr.preco;
            return acc;
        }, { qtd: 0, valor: 0 });
    }, [produtos]);

    const produtosFiltrados = produtos.filter(p =>
        p.nome.toLowerCase().includes(filtro.toLowerCase()) ||
        p.categoria.toLowerCase().includes(filtro.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-slate-50 text-slate-600">
                <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-600" />
                <p className="text-lg font-medium">Carregando Banco de Dados SQLite...</p>
                <p className="text-sm text-slate-400">Inicializando WebAssembly (WASM)</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 font-sans text-slate-800 p-4 md:p-8">
            <div className="max-w-5xl mx-auto space-y-6">

                {/* Header */}
                <header className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-3 mb-4 md:mb-0">
                        <div className="bg-blue-600 p-3 rounded-lg text-white">
                            <Database size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">Estoque SQLite</h1>
                            <p className="text-sm text-slate-500">Gerenciamento local via Browser</p>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 text-right items-center">

                        {/* Botões de Arquivo (Backup) */}
                        <div className="flex gap-2 mr-4">
                            <button
                                onClick={handleExportarBanco}
                                className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition border border-slate-300"
                                title="Baixar arquivo .sqlite"
                            >
                                <Download size={16} />
                                Exportar
                            </button>
                            <label className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition border border-slate-300 cursor-pointer">
                                <Upload size={16} />
                                Importar
                                <input
                                    type="file"
                                    accept=".sqlite,.db"
                                    className="hidden"
                                    onChange={handleImportarBanco}
                                />
                            </label>
                        </div>

                        <div className="flex gap-4">
                            <div className="bg-slate-50 px-4 py-2 rounded-lg border border-slate-200">
                                <p className="text-xs text-slate-500 uppercase font-bold">Itens</p>
                                <p className="text-2xl font-bold text-blue-600">{totais.qtd}</p>
                            </div>
                            <div className="bg-slate-50 px-4 py-2 rounded-lg border border-slate-200">
                                <p className="text-xs text-slate-500 uppercase font-bold">Valor</p>
                                <p className="text-2xl font-bold text-emerald-600">
                                    {totais.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </p>
                            </div>
                        </div>
                    </div>
                </header>

                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2 border border-red-200">
                        <AlertCircle size={20} />
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1">
                        <div className={`p-6 rounded-xl shadow-sm border sticky top-6 transition-colors ${editingId ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
                            <h2 className={`text-lg font-bold mb-4 flex items-center justify-between ${editingId ? 'text-amber-700' : 'text-slate-800'}`}>
                                <span className="flex items-center gap-2">
                                    {editingId ? <Edit size={20} /> : <Plus size={20} className="text-blue-600" />}
                                    {editingId ? 'Editar Produto' : 'Novo Produto'}
                                </span>
                                {editingId && (
                                    <button onClick={handleCancelar} className="text-xs bg-white border border-amber-300 px-2 py-1 rounded text-amber-700 hover:bg-amber-100">
                                        Cancelar
                                    </button>
                                )}
                            </h2>

                            <form onSubmit={handleSalvar} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">Nome do Produto</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white"
                                        placeholder="Ex: Teclado Mecânico"
                                        value={novoProduto.nome}
                                        onChange={e => setNovoProduto({ ...novoProduto, nome: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1">Preço (R$)</label>
                                        <input
                                            required
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                            placeholder="0.00"
                                            value={novoProduto.preco}
                                            onChange={e => setNovoProduto({ ...novoProduto, preco: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1">Quantidade</label>
                                        <input
                                            required
                                            type="number"
                                            min="1"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                            placeholder="0"
                                            value={novoProduto.quantidade}
                                            onChange={e => setNovoProduto({ ...novoProduto, quantidade: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">Categoria</label>
                                    <select
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                        value={novoProduto.categoria}
                                        onChange={e => setNovoProduto({ ...novoProduto, categoria: e.target.value })}
                                    >
                                        <option>Geral</option>
                                        <option>Eletrônicos</option>
                                        <option>Móveis</option>
                                        <option>Vestuário</option>
                                        <option>Alimentos</option>
                                    </select>
                                </div>

                                <div className="flex gap-2">
                                    {editingId && (
                                        <button
                                            type="button"
                                            onClick={handleCancelar}
                                            className="w-1/3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2.5 rounded-lg transition flex items-center justify-center gap-2 mt-2"
                                        >
                                            <X size={18} />
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        className={`flex-1 font-bold py-2.5 rounded-lg transition flex items-center justify-center gap-2 mt-2 text-white ${editingId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                                    >
                                        <Save size={18} />
                                        {editingId ? 'Atualizar' : 'Salvar'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    <div className="lg:col-span-2 flex flex-col gap-4">
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-3">
                            <Search className="text-slate-400" size={20} />
                            <input
                                type="text"
                                placeholder="Buscar por nome ou categoria..."
                                className="flex-1 bg-transparent outline-none text-slate-700 placeholder-slate-400"
                                value={filtro}
                                onChange={(e) => setFiltro(e.target.value)}
                            />
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            {produtosFiltrados.length === 0 ? (
                                <div className="p-12 text-center text-slate-400 flex flex-col items-center">
                                    <Package size={48} className="mb-4 opacity-20" />
                                    <p>Nenhum produto encontrado no banco de dados.</p>
                                    <p className="text-sm mt-1">Use o formulário para adicionar o primeiro item.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-bold tracking-wider border-b border-slate-200">
                                                <th className="p-4">Produto</th>
                                                <th className="p-4">Categoria</th>
                                                <th className="p-4 text-right">Preço Unit.</th>
                                                <th className="p-4 text-center">Estoque</th>
                                                <th className="p-4 text-right">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {produtosFiltrados.map((item) => (
                                                <tr key={item.id} className={`transition group ${editingId === item.id ? 'bg-amber-50' : 'hover:bg-slate-50'}`}>
                                                    <td className="p-4 font-medium text-slate-800">{item.nome}</td>
                                                    <td className="p-4">
                                                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium border border-slate-200">
                                                            {item.categoria}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-right text-slate-600">
                                                        {item.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <span className={`font-bold ${item.quantidade < 5 ? 'text-amber-500' : 'text-slate-600'}`}>
                                                            {item.quantidade}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-right flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleEditar(item)}
                                                            className="text-slate-400 hover:text-blue-600 transition p-2 rounded-full hover:bg-blue-50"
                                                            title="Editar"
                                                        >
                                                            <Edit size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleRemover(item.id)}
                                                            className="text-slate-400 hover:text-red-500 transition p-2 rounded-full hover:bg-red-50"
                                                            title="Excluir registro"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <footer className="text-center text-slate-400 text-sm py-6 mt-8">
                    <p>Projeto de Controle de Estoque - React + SQLite (WASM)</p>
                    <p className="text-xs mt-1">Dados persistem no localStorage do navegador.</p>
                </footer>
            </div>
        </div>
    );
}