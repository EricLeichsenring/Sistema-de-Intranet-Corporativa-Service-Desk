import { useState } from 'react';
import { Layout } from '../components/Layout';
import {
  Headphones, Upload, Send, Loader2, CheckCircle, ArrowLeft,
  Search, X, Clock, XCircle, PauseCircle // 1. IMPORTADO PauseCircle
} from 'lucide-react';
import { client } from '../lib/sanity';

interface TicketResult {
  _id: string;
  nome: string;
  // 2. ADICIONADO 'aguardando' NA INTERFACE
  status: 'pendente' | 'concluido' | 'cancelado' | 'aguardando';
  _createdAt: string;
  local: string;
  justificativa?: string;
}

export function ServiceTicket() {
  // --- ESTADOS DO FORMULÁRIO ---
  const [formData, setFormData] = useState({
    name: '',
    local: '',
    ticketType: '',
    description: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdTicketId, setCreatedTicketId] = useState<string | null>(null);
  const [ticketSector, setTicketSector] = useState<string>('');

  // --- ESTADOS DA PESQUISA ---
  const [searchId, setSearchId] = useState('');
  const [searchResult, setSearchResult] = useState<TicketResult[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  // --- HANDLERS DO FORMULÁRIO ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // 1. DEFINIR A LÓGICA DE ROTEAMENTO
      const tiposTI = [
        "Hardware - Equipamentos",
        "Rede - Conectividade",
        "Impressora"
      ];

      const setorResponsavel = tiposTI.includes(formData.ticketType)
        ? 'ti'
        : 'manutencao';

      setTicketSector(setorResponsavel);

      let imageAssetId = null;
      if (selectedFile) {
        const asset = await client.assets.upload('image', selectedFile, {
          contentType: selectedFile.type, filename: selectedFile.name,
        });
        imageAssetId = asset._id;
      }

      const doc = await client.create({
        _type: 'chamado',
        nome: formData.name,
        local: formData.local,
        tipo: formData.ticketType,
        descricao: formData.description,
        status: 'pendente',
        setor: setorResponsavel,
        anexo: imageAssetId ? { _type: 'image', asset: { _type: 'reference', _ref: imageAssetId } } : undefined
      });

      setCreatedTicketId(doc._id);
    } catch (error) {
      console.error("Erro:", error);
      alert('Erro ao enviar. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewTicket = () => {
    setFormData({ name: '', local: '', ticketType: '', description: '' });
    setSelectedFile(null);
    setCreatedTicketId(null);
  };

  // --- HANDLER DA PESQUISA ---
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (searchId.length < 3) {
      setSearchError('Digite pelo menos 3 caracteres para buscar.');
      return;
    }

    setIsSearching(true);
    setSearchError('');
    setSearchResult(null);

    try {
      const query = `
        *[_type == "chamado" && (
            _id match "*" + $term || 
            nome match "*" + $term + "*"
        )] | order(_createdAt desc) {
          _id, nome, status, _createdAt, local, justificativa
        }
      `;

      const result = await client.fetch(query, { term: searchId });

      if (result && result.length > 0) {
        setSearchResult(result);
      } else {
        setSearchError('Nenhum chamado encontrado com este protocolo ou nome.');
      }
    } catch (err) {
      console.error(err);
      setSearchError('Erro ao buscar.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <Layout>
      <div className='w-full flex justify-center'>

        <div className="w-full max-w-3xl px-4 md:px-6 py-8">

          {/* === ÁREA DE PESQUISA === */}
          <div className="mb-8 bg-blue-50 border border-blue-100 rounded-lg p-6">
            <h3 className="text-blue-800 font-bold mb-3 flex items-center gap-2">
              <Search size={18} /> Consultar Situação
            </h3>
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Protocolo ou Nome (ex: AB34CD ou Maria)"
                className="flex-1 p-2 border border-blue-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 uppercase"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
              />
              <button
                type="submit"
                disabled={isSearching}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-medium disabled:opacity-50 flex items-center justify-center"
              >
                {isSearching ? (
                  <Loader2 className="animate-spin" size={20} />) : (
                  <>
                    <Search size={20} className='block md:hidden' />
                    <span className='hidden md:block'>Buscar</span>
                  </>
                )}
              </button>
            </form>

            {searchError && <p className="text-red-600 text-sm mt-2">{searchError}</p>}

            {/* RESULTADO DA PESQUISA */}
            {searchResult && searchResult.map((ticket) => (
              <div key={ticket._id} className="mt-4 bg-white border border-gray-200 rounded-lg p-4 shadow-sm animate-fade-in relative">
                <button onClick={() => setSearchResult(null)} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"><X size={18} /></button>

                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Protocolo #{ticket._id.slice(-6).toUpperCase()}</span>
                  <span className="text-xs text-gray-500">{new Date(ticket._createdAt).toLocaleDateString('pt-BR')}</span>
                </div>

                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {/* 3. LÓGICA DO ÍCONE ATUALIZADA */}
                    {ticket.status === 'pendente' && <Clock className="text-blue-500" />}
                    {ticket.status === 'aguardando' && <PauseCircle className="text-orange-500" />}
                    {ticket.status === 'concluido' && <CheckCircle className="text-green-500" />}
                    {ticket.status === 'cancelado' && <XCircle className="text-red-500" />}
                  </div>

                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                        {/* Tratamento visual para o texto Aguardando */}
                        <p className={`font-bold text-lg capitalize mb-1 ${ticket.status === 'aguardando' ? 'text-orange-600' : 'text-gray-800'}`}>
                          {ticket.status.replace('_', ' ')}
                        </p>
                        <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">{ticket.nome}</span>
                    </div>
                    
                    <p className="text-sm text-gray-600">Local: {ticket.local}</p>

                    {/* 4. NOVA ÁREA: EXIBIÇÃO DA JUSTIFICATIVA DE ESPERA */}
                    {ticket.status === 'aguardando' && ticket.justificativa && (
                      <div className="mt-3 bg-orange-50 border border-orange-100 p-3 rounded text-sm text-orange-800 animate-fade-in">
                        <span className="font-bold block mb-1">Motivo da Espera:</span>
                        "{ticket.justificativa}"
                      </div>
                    )}

                    {/* ÁREA EXISTENTE: JUSTIFICATIVA DE CANCELAMENTO */}
                    {ticket.status === 'cancelado' && ticket.justificativa && (
                      <div className="mt-3 bg-red-50 border border-red-100 p-3 rounded text-sm text-red-800">
                        <span className="font-bold block mb-1">Motivo do Cancelamento:</span>
                        "{ticket.justificativa}"
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* === FORMULÁRIO OU TELA DE SUCESSO === */}
          {createdTicketId ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center animate-fade-in">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
              </div>

              <h2 className="text-3xl font-bold text-gray-800 mb-2">Chamado Aberto com Sucesso!</h2>
              <p className="text-gray-600 mb-8">Sua solicitação foi enviada para a equipe de <strong>{ticketSector === 'ti' ? 'TI' : 'Manutenção'}</strong>.</p>

              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 inline-block mb-8">
                <p className="text-sm text-gray-500 uppercase font-bold tracking-wider mb-1">Número do Protocolo</p>
                <p className="text-4xl font-mono font-bold text-blue-600">
                  #{createdTicketId.slice(-6).toUpperCase()}
                </p>
              </div>

              <p className="text-sm text-gray-500 mb-6">Anote este número para consultar a situação acima.</p>

              <div>
                <button
                  onClick={handleNewTicket}
                  className="flex items-center justify-center gap-2 mx-auto text-blue-600 hover:text-blue-800 font-medium"
                >
                  <ArrowLeft size={20} />
                  Abrir novo chamado
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-lg">
                  <Headphones className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-800">Abrir Chamado</h1>
                  <p className="text-gray-600">Central de Atendimento Técnico</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">Nome Completo</label>
                  <input type="text" id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Digite seu nome completo" required disabled={isSubmitting} />
                </div>

                <div>
                  <label htmlFor="local" className="block text-sm font-medium text-gray-700 mb-2">Local</label>
                  <input type="text" id="local" value={formData.local} onChange={(e) => setFormData({ ...formData, local: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: Secretaria de Educação - Sala 205" required disabled={isSubmitting} />
                </div>

                <div>
                  <label htmlFor="ticketType" className="block text-sm font-medium text-gray-700 mb-2">Tipo de Chamado</label>
                  <select id="ticketType" value={formData.ticketType} onChange={(e) => setFormData({ ...formData, ticketType: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white" required disabled={isSubmitting}>
                    <option value="">Selecione o tipo de chamado</option>
                    <option value="Hardware - Equipamentos">Hardware - Equipamentos</option>
                    <option value="Rede - Conectividade">Rede - Conectividade</option>
                    <option value="Impressora">Impressora</option>
                    <option value="Eletrica">Elétrica - lâmpadas, tomadas, fios</option>
                    <option value="Hidraulica">Hidráulica - torneiras, chuveiros, pias, sanitários</option>
                    <option value="Conserto de mobilia">Conserto de mobília - mesa, cadeira, armários</option>
                    <option value="Outro">Outros</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">Descrição do Problema</label>
                  <textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={5} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none" placeholder="Descreva detalhadamente o problema..." required disabled={isSubmitting} />
                </div>

                <div>
                  <label htmlFor="attachment" className="block text-sm font-medium text-gray-700 mb-2">Anexar Imagem</label>
                  <div className="relative">
                    <input type="file" id="attachment" accept="image/*" onChange={handleFileChange} className="hidden" disabled={isSubmitting} />
                    <label htmlFor="attachment" className={`flex items-center justify-center gap-3 w-full px-4 py-6 border-2 border-dashed rounded-lg transition-all cursor-pointer ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-400 hover:bg-blue-50 border-gray-300'}`}>
                      <Upload className="w-6 h-6 text-gray-400" />
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-700">{selectedFile ? selectedFile.name : 'Clique para selecionar uma imagem'}</p>
                        <p className="text-xs text-gray-500 mt-1">PNG, JPG ou JPEG</p>
                      </div>
                    </label>
                  </div>
                </div>

                <button type="submit" disabled={isSubmitting} className={`w-full flex items-center justify-center gap-3 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg transition-colors shadow-sm ${isSubmitting ? 'bg-blue-400 cursor-not-allowed' : 'hover:bg-blue-700'}`}>
                  {isSubmitting ? (<><Loader2 className="w-5 h-5 animate-spin" /><span>Enviando...</span></>) : (<><Send className="w-5 h-5" /><span>Enviar Chamado</span></>)}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}