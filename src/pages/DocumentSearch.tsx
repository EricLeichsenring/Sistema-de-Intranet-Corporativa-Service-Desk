import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { 
  Search, Printer, FileText, Folder, 
  ChevronRight, ArrowLeft, FolderOpen 
} from 'lucide-react';
import { client } from '../lib/sanity'; 

// Adicionei o campo 'setor' nas interfaces
interface DocumentoSanity {
  _id: string;
  titulo: string;
  setor: string; // Novo campo
  arquivoUrl: string;
  _createdAt: string;
}

interface Document {
  id: string;
  name: string;
  sector: string; // Novo campo
  type: string;
  date: string;
  url: string;
}

export function DocumentSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estado para controlar qual pasta está aberta (null = vendo todas as pastas)
  const [selectedSector, setSelectedSector] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        // Query atualizada para trazer o setor
        const query = `
          *[_type == "documentosImpressao"] | order(titulo asc) {
            _id,
            titulo,
            setor,
            "arquivoUrl": arquivo.asset->url,
            _createdAt
          }
        `;

        const data: DocumentoSanity[] = await client.fetch(query);

        const formattedDocs = data.map((doc) => ({
          id: doc._id,
          name: doc.titulo,
          sector: doc.setor || 'Outros', // Fallback caso não tenha setor
          type: doc.arquivoUrl.split('.').pop()?.toUpperCase() || 'PDF', 
          date: new Date(doc._createdAt).toLocaleDateString('pt-BR'),
          url: doc.arquivoUrl
        }));

        setDocuments(formattedDocs);
      } catch (error) {
        console.error("Erro ao buscar documentos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  const handlePrint = (url: string) => {
    if (url) window.open(url, '_blank');
    else alert("Arquivo não disponível");
  };

  // --- LÓGICA DE AGRUPAMENTO ---

  // 1. Obtém lista única de setores para criar as pastas
  const sectors = Array.from(new Set(documents.map(d => d.sector))).sort();

  // 2. Filtra documentos baseados na busca OU no setor selecionado
  const getDisplayDocuments = () => {
    // Se o usuário estiver digitando na busca, faz uma busca global (ignora pastas)
    if (searchTerm.trim() !== '') {
      return documents.filter((doc) =>
        doc.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Se tiver um setor selecionado, mostra só os documentos dele
    if (selectedSector) {
      return documents.filter(doc => doc.sector === selectedSector);
    }

    return []; // Se não tiver busca nem setor, não retorna docs (mostraremos as pastas)
  };

  const filteredDocs = getDisplayDocuments();
  const isGlobalSearch = searchTerm.trim() !== '';

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 min-h-[500px]">
          
          {/* CABEÇALHO */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Documentos e Modelos</h1>
            <p className="text-gray-600">
              {selectedSector && !isGlobalSearch 
                ? `Visualizando pasta: ${selectedSector}` 
                : 'Navegue pelas pastas ou pesquise um documento'}
            </p>
          </div>

          {/* BARRA DE PESQUISA */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Pesquisar documento em todos os setores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          {/* CONTEÚDO PRINCIPAL */}
          <div className="space-y-3">
            
            {loading ? (
              <p className="text-center text-gray-500 py-12">Carregando biblioteca...</p>
            ) : (
              <>
                {/* CENÁRIO 1: VISÃO DE PASTAS (Sem busca e nenhum setor selecionado) */}
                {!isGlobalSearch && !selectedSector && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sectors.map((sector) => {
                      const count = documents.filter(d => d.sector === sector).length;
                      return (
                        <button
                          key={sector}
                          onClick={() => setSelectedSector(sector)}
                          className="flex items-center p-4 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 hover:shadow-sm transition-all text-left group"
                        >
                          <div className="p-3 bg-white rounded-full mr-4 text-blue-500 group-hover:text-blue-600">
                            <Folder className="w-6 h-6" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-800 group-hover:text-blue-800">{sector}</h3>
                            <p className="text-xs text-gray-500">{count} documento(s)</p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* CENÁRIO 2: LISTA DE ARQUIVOS (Busca Global OU Dentro de uma Pasta) */}
                {(isGlobalSearch || selectedSector) && (
                  <div>
                    {/* Botão de Voltar (Só aparece se não for busca global) */}
                    {!isGlobalSearch && (
                      <button 
                        onClick={() => setSelectedSector(null)}
                        className="flex items-center text-sm text-gray-500 hover:text-blue-600 mb-4 transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Voltar para pastas
                      </button>
                    )}

                    {/* Lista de Docs */}
                    <div className="space-y-2 animate-fade-in">
                      {filteredDocs.length > 0 ? (
                        filteredDocs.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-white hover:border-blue-200 hover:shadow-sm transition-all"
                          >
                            <div className="flex items-center gap-4 flex-1">
                              <div className="flex items-center justify-center w-10 h-10 bg-white border border-gray-200 rounded text-gray-500">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div className="flex-1">
                                <h3 className="font-medium text-gray-800">{doc.name}</h3>
                                <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                  <span className="bg-gray-200 px-2 py-0.5 rounded text-xs font-semibold text-gray-600">
                                    {doc.type}
                                  </span>
                                  <span>• {doc.date}</span>
                                  {/* Na busca global, mostra de qual setor é o arquivo */}
                                  {isGlobalSearch && (
                                    <span className="text-blue-600 text-xs bg-blue-50 px-2 py-0.5 rounded">
                                      {doc.sector}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => handlePrint(doc.url)}
                              className="flex items-center gap-2 p-2 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                              title='Imprimir'
                            >
                              <Printer className="w-4 h-4" />
                              <span className='hidden sm:block'>Imprimir</span>
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                          <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-500 font-medium">Nenhum documento encontrado.</p>
                          {isGlobalSearch && <p className="text-sm text-gray-400">Tente buscar por outro termo.</p>}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}