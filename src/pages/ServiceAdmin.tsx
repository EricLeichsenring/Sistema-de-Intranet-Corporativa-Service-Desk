import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { 
  Search, CheckCircle, XCircle, Clock, 
  FileText, User, MapPin, ChevronRight, 
  Printer, LogOut, LayoutDashboard, PlayCircle,
  PauseCircle // <--- NOVO ÍCONE IMPORTADO
} from 'lucide-react';
import { client } from '../lib/sanity'; 

// --- INTERFACE ATUALIZADA ---
interface Ticket {
  _id: string;
  nome: string;
  local: string;
  tipo: string;
  descricao: string;
  // Adicionado 'aguardando' no tipo
  status: 'pendente' | 'em_andamento' | 'aguardando' | 'concluido' | 'cancelado'; 
  justificativa?: string; 
  materialUtilizado?: string;
  imagemUrl?: string;
  _createdAt: string;
}

export function ServiceAdmin() {
  const navigate = useNavigate();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  // Adicionado 'aguardando' no estado da tab
  const [activeTab, setActiveTab] = useState<'pendente' | 'em_andamento' | 'aguardando' | 'concluido' | 'cancelado'>('pendente');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [currentUser, setCurrentUser] = useState<{role?: string} | null>(null);

  const fetchTickets = async (userRole?: string) => {
    setLoading(true);
    try {
      const roleLimpa = userRole ? userRole.toLowerCase().trim() : '';
      let filtroSetor = '';

      if (roleLimpa === 'ti') {
        filtroSetor = '&& setor == "ti"';
      } 
      else if (roleLimpa === 'manutencao') {
        filtroSetor = '&& setor == "manutencao"';
      }

      const query = `
        *[_type == "chamado" ${filtroSetor}] | order(_createdAt desc) {
          _id, nome, local, tipo, descricao, status, justificativa, materialUtilizado,
          "imagemUrl": anexo.asset->url,
          _createdAt
        }
      `;
      
      const data = await client.fetch(query);
      setTickets(data);
    } catch (error) {
      console.error("Erro ao buscar chamados:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const userStr = localStorage.getItem('intranet_user');
    if (!userStr) { 
      navigate('/login'); 
      return; 
    }
    const user = JSON.parse(userStr);
    setCurrentUser(user);
    fetchTickets(user.role);
  }, []);

  // --- ATUALIZAR STATUS ---
  const updateStatus = async (id: string, newStatus: 'em_andamento' | 'aguardando' | 'concluido' | 'cancelado') => {
    let textoExtra = ''; 
    
    // CASO 1: CONCLUIR
    if (newStatus === 'concluido') {
      const material = prompt("Informe o material utilizado (ou deixe em branco se não houve):");
      if (material === null) return;
      textoExtra = material || "Sem material utilizado";
    }

    // CASO 2: CANCELAR
    if (newStatus === 'cancelado') {
      const motivo = prompt("Por favor, informe o motivo do cancelamento:");
      if (motivo === null) return; 
      if (motivo.trim() === '') return alert("A justificativa é obrigatória para cancelar.");
      textoExtra = motivo;
    }

    // --- NOVO CASO 3: AGUARDANDO ---
    if (newStatus === 'aguardando') {
      const motivo = prompt("Informe o motivo da espera (ex: Aguardando peça, Aguardando aprovação):");
      if (motivo === null) return;
      if (motivo.trim() === '') return alert("A justificativa é obrigatória para colocar em espera.");
      textoExtra = motivo;
    }

    try {
      const patchData: any = { status: newStatus };
      
      if (newStatus === 'concluido') {
        patchData.materialUtilizado = textoExtra;
      } else if (newStatus === 'cancelado') {
        patchData.justificativa = textoExtra;
      } else if (newStatus === 'aguardando') {
        // Reutilizamos o campo justificativa
        patchData.justificativa = textoExtra;
      }

      await client.patch(id).set(patchData).commit();

      setTickets(prev => prev.map(ticket => 
        ticket._id === id ? { 
          ...ticket, 
          status: newStatus, 
          // Atualiza justificativa se for cancelado OU aguardando
          justificativa: (newStatus === 'cancelado' || newStatus === 'aguardando') ? textoExtra : ticket.justificativa,
          materialUtilizado: newStatus === 'concluido' ? textoExtra : ticket.materialUtilizado
        } : ticket
      ));
      
      setSelectedTicket(null);
      alert(`Status atualizado para: ${newStatus.replace('_', ' ').toUpperCase()}!`);
    } catch (error) {
      console.error("Erro ao atualizar:", error);
      alert("Erro ao atualizar.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('intranet_user');
    navigate('/login');
  };

  // --- IMPRESSÃO ---
  const handlePrintReport = () => {
    const reportData = tickets.filter(t => t.status === activeTab);
    
    if (reportData.length === 0) {
      return alert("Sem dados para imprimir.");
    }

    const printWindow = window.open('', '', 'height=600,width=800');
    if (!printWindow) return;

    const isCancelledTab = activeTab === 'cancelado';
    const isCompletedTab = activeTab === 'concluido'; 
    const isWaitingTab = activeTab === 'aguardando'; // Flag para aguardando

    const titulos = { 
      pendente: 'EM ABERTO', 
      em_andamento: 'EM ANDAMENTO', 
      aguardando: 'AGUARDANDO / EM ESPERA', // Novo título
      concluido: 'REALIZADAS', 
      cancelado: 'CANCELADAS' 
    };

    const styles = `
      <style>
        @page { size: A4; margin: 1cm; }
        body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 10px; color: #000; -webkit-print-color-adjust: exact; }
        .header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 10px; }
        h1 { margin: 0; font-size: 16px; text-transform: uppercase; }
        p { margin: 3px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; table-layout: fixed; }
        th { background-color: #f0f0f0; border: 1px solid #000; padding: 5px; font-weight: bold; text-align: left; vertical-align: middle; }
        td { border: 1px solid #000; padding: 5px; vertical-align: top; word-wrap: break-word; overflow-wrap: break-word; word-break: break-all; }
        
        .col-data { width: 65px; }
        .col-id { width: 45px; text-align: center; }
        .col-solicitante { width: ${isCancelledTab || isCompletedTab || isWaitingTab ? '12%' : '18%'}; }
        .col-local { width: ${isCancelledTab || isCompletedTab || isWaitingTab ? '12%' : '18%'}; }
        .col-tipo { width: ${isCancelledTab || isCompletedTab || isWaitingTab ? '8%' : '12%'}; }
      </style>
    `;

    const tableRows = reportData.map(item => {
      const dataFormatada = `${new Date(item._createdAt).toLocaleDateString('pt-BR')} <br/> ${new Date(item._createdAt).toLocaleTimeString('pt-BR').slice(0,5)}`;
      const idFormatado = `#${item._id.slice(-4).toUpperCase()}`;
      
      // Colunas extras
      const colCancelado = isCancelledTab ? `<td>${item.justificativa || '—'}</td>` : '';
      const colConcluido = isCompletedTab ? `<td>${item.materialUtilizado || '—'}</td>` : '';
      // Se for Aguardando, usa a coluna justificativa também
      const colAguardando = isWaitingTab ? `<td>${item.justificativa || '—'}</td>` : '';

      return `
        <tr>
          <td>${dataFormatada}</td>
          <td class="col-id"><strong>${idFormatado}</strong></td>
          <td>${item.nome}</td>
          <td>${item.local}</td>
          <td>${item.tipo}</td>
          <td>${item.descricao}</td>
          ${colCancelado}
          ${colAguardando}
          ${colConcluido}
        </tr>
      `;
    }).join('');

    const tableHeader = `
      <thead>
        <tr>
          <th class="col-data">Data</th>
          <th class="col-id">ID</th>
          <th class="col-solicitante">Solicitante</th>
          <th class="col-local">Local</th>
          <th class="col-tipo">Tipo</th>
          <th>Descrição</th>
          ${isCancelledTab ? '<th>Motivo Cancelamento</th>' : ''}
          ${isWaitingTab ? '<th>Motivo da Espera</th>' : ''} 
          ${isCompletedTab ? '<th>Material Utilizado</th>' : ''}
        </tr>
      </thead>
    `;

    const bodyContent = `
      <div class="header">
        <h1>Relatório de Ordens de Serviço</h1>
        <p>Status: <strong>${titulos[activeTab]}</strong></p>
        <p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
      </div>
      <table>${tableHeader}<tbody>${tableRows}</tbody></table>
      <div style="margin-top: 20px; font-size: 9px; text-align: right;">Sistema Intranet - Controle Interno</div>
    `;

    printWindow.document.title = "Relatório de O.S.";
    printWindow.document.head.innerHTML = styles;
    printWindow.document.body.innerHTML = bodyContent;
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  const filteredTickets = tickets.filter(t => {
    const matchesTab = t.status === activeTab;
    const matchesSearch = t._id.slice(-4).includes(searchTerm) || t.nome.toLowerCase().includes(searchTerm.toLowerCase()) || t.local.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col md:flex-row gap-6">
        
        {/* MENU LATERAL */}
        <div className="w-full md:w-64 flex-shrink-0 flex flex-col h-fit space-y-2">
          
          <button onClick={() => { setActiveTab('pendente'); setSelectedTicket(null); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'pendente' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}>
            <Clock className="w-5 h-5" /> <span className="font-medium">Em Aberto</span>
            <span className="ml-auto text-xs bg-white/20 px-2 py-0.5 rounded-full">{tickets.filter(t => t.status === 'pendente').length}</span>
          </button>

          <button onClick={() => { setActiveTab('em_andamento'); setSelectedTicket(null); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'em_andamento' ? 'bg-yellow-500 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}>
            <PlayCircle className="w-5 h-5" /> <span className="font-medium">Em Andamento</span>
            <span className="ml-auto text-xs bg-white/20 px-2 py-0.5 rounded-full">{tickets.filter(t => t.status === 'em_andamento').length}</span>
          </button>

          {/* --- NOVO BOTÃO MENU: AGUARDANDO --- */}
          <button onClick={() => { setActiveTab('aguardando'); setSelectedTicket(null); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'aguardando' ? 'bg-orange-500 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}>
            <PauseCircle className="w-5 h-5" /> <span className="font-medium">Aguardando</span>
            <span className="ml-auto text-xs bg-white/20 px-2 py-0.5 rounded-full">{tickets.filter(t => t.status === 'aguardando').length}</span>
          </button>

          <button onClick={() => { setActiveTab('concluido'); setSelectedTicket(null); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'concluido' ? 'bg-green-100 text-green-700 shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}>
            <CheckCircle className="w-5 h-5" /> <span className="font-medium">Realizadas</span>
          </button>

          <button onClick={() => { setActiveTab('cancelado'); setSelectedTicket(null); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'cancelado' ? 'bg-red-100 text-red-700 shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}>
            <XCircle className="w-5 h-5" /> <span className="font-medium">Canceladas</span>
          </button>

          <div className="pt-4 mt-4 border-t border-gray-200">
            <button onClick={handlePrintReport} className="w-full flex items-center gap-3 px-4 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-all shadow-sm">
              <Printer className="w-5 h-5" /> <span className="font-medium">Relatório</span>
            </button>
          </div>
        </div>

        {/* CONTEÚDO CENTRAL */}
        <div className="flex-1 space-y-6">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Painel de O.S.</h1>
              <p className="text-gray-600">
                {currentUser?.role === 'root' ? 'Administração Geral' : currentUser?.role === 'ti' ? 'Setor de TI' : 'Setor de Manutenção'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {currentUser?.role === 'root' && (
                <button onClick={() => navigate('/admin-site')} className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-all font-medium border border-purple-200">
                  <LayoutDashboard size={18} /> Gerenciar Site
                </button>
              )}
              <button onClick={handleLogout} className="text-red-600 hover:text-red-700 flex gap-2 items-center text-sm font-medium px-2">
                <LogOut size={18} /> Sair
              </button>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input type="text" placeholder="Buscar por ID, Nome ou Local..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>

          {selectedTicket ? (
            <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden animate-fade-in">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Ordem #{selectedTicket._id.slice(-6).toUpperCase()}</h2>
                  <p className="text-sm text-gray-500">{new Date(selectedTicket._createdAt).toLocaleString('pt-BR')}</p>
                </div>
                <button onClick={() => setSelectedTicket(null)} className="text-sm text-blue-600 hover:underline">Voltar para lista</button>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                  <div className="flex gap-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="flex-1"><p className="text-xs text-blue-600 font-bold uppercase mb-1">Solicitante</p><div className="flex items-center gap-2 text-gray-800"><User className="w-4 h-4" /> {selectedTicket.nome}</div></div>
                    <div className="flex-1"><p className="text-xs text-blue-600 font-bold uppercase mb-1">Local</p><div className="flex items-center gap-2 text-gray-800"><MapPin className="w-4 h-4" /> {selectedTicket.local}</div></div>
                    <div className="flex-1"><p className="text-xs text-blue-600 font-bold uppercase mb-1">Tipo</p><div className="flex items-center gap-2 text-gray-800"><FileText className="w-4 h-4" /> {selectedTicket.tipo}</div></div>
                  </div>
                  <div><h3 className="font-bold text-gray-800 mb-2">Descrição</h3><p className="text-gray-600 bg-gray-50 p-4 rounded-lg border border-gray-200">{selectedTicket.descricao}</p></div>
                  
                  {/* --- EXIBIR JUSTIFICATIVA SE CANCELADO OU AGUARDANDO --- */}
                  {selectedTicket.status === 'cancelado' && selectedTicket.justificativa && (
                    <div>
                      <h3 className="font-bold text-red-700 mb-2">Motivo do Cancelamento</h3>
                      <p className="text-red-600 bg-red-50 p-4 rounded-lg border border-red-200 italic">"{selectedTicket.justificativa}"</p>
                    </div>
                  )}

                  {selectedTicket.status === 'aguardando' && selectedTicket.justificativa && (
                    <div>
                      <h3 className="font-bold text-orange-700 mb-2">Motivo da Espera</h3>
                      <p className="text-orange-800 bg-orange-50 p-4 rounded-lg border border-orange-200 italic">"{selectedTicket.justificativa}"</p>
                    </div>
                  )}

                  {selectedTicket.status === 'concluido' && (
                    <div>
                      <h3 className="font-bold text-green-700 mb-2">Material Utilizado</h3>
                      <p className="text-green-800 bg-green-50 p-4 rounded-lg border border-green-200">{selectedTicket.materialUtilizado || "Nenhum material informado."}</p>
                    </div>
                  )}

                  {selectedTicket.imagemUrl && (<div><h3 className="font-bold text-gray-800 mb-2">Anexo</h3><img src={selectedTicket.imagemUrl} className="rounded-lg border border-gray-200 max-h-80 object-contain bg-gray-100" /></div>)}
                </div>

                <div className="md:col-span-1 space-y-3">
                  <h3 className="font-bold text-gray-800 mb-2">Ações</h3>
                  
                  {selectedTicket.status !== 'concluido' && selectedTicket.status !== 'cancelado' && (
                    <>
                      {/* Se Pendente ou Aguardando, pode iniciar */}
                      {(selectedTicket.status === 'pendente' || selectedTicket.status === 'aguardando') && (
                        <button onClick={() => updateStatus(selectedTicket._id, 'em_andamento')} className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-all font-bold">
                          <PlayCircle className="w-5 h-5" /><span>Iniciar Atendimento</span>
                        </button>
                      )}

                      {/* Botão de Aguardando (só aparece se já estiver em andamento ou pendente) */}
                      {selectedTicket.status !== 'aguardando' && (
                        <button onClick={() => updateStatus(selectedTicket._id, 'aguardando')} className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all font-bold">
                          <PauseCircle className="w-5 h-5" /><span>Colocar em Espera</span>
                        </button>
                      )}

                      <button onClick={() => updateStatus(selectedTicket._id, 'concluido')} className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-bold">
                        <CheckCircle className="w-5 h-5" /><span>Marcar Executada</span>
                      </button>
                      
                      <button onClick={() => updateStatus(selectedTicket._id, 'cancelado')} className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-white text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-all">
                        <XCircle className="w-5 h-5" /><span>Cancelar O.S.</span>
                      </button>
                    </>
                  )}

                  { (selectedTicket.status === 'concluido' || selectedTicket.status === 'cancelado') && (
                    <div className={`p-4 rounded-lg text-center border ${selectedTicket.status === 'concluido' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                      <p className="font-bold uppercase">Ordem {selectedTicket.status.replace('_', ' ')}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {loading ? <p className="text-center text-gray-500 py-10">Carregando...</p> : filteredTickets.length > 0 ? filteredTickets.map((ticket) => (
                <div key={ticket._id} onClick={() => setSelectedTicket(ticket)} className="group bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-all cursor-pointer flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center 
                      ${ticket.status === 'pendente' ? 'bg-blue-100 text-blue-600' : 
                        ticket.status === 'em_andamento' ? 'bg-yellow-100 text-yellow-600' :
                        ticket.status === 'aguardando' ? 'bg-orange-100 text-orange-600' : // Cor Laranja para Aguardando
                        ticket.status === 'concluido' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {ticket.status === 'aguardando' ? <PauseCircle className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800 flex items-center gap-2">
                        {ticket.nome} 
                        <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded">#{ticket._id.slice(-6).toUpperCase()}</span>
                      </h4>
                      <p className="text-sm text-gray-500">{ticket.local} • {ticket.tipo}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500" />
                </div>
              )) : <div className="text-center py-12 border border-dashed rounded-lg"><p className="text-gray-500">Nenhum chamado encontrado nesta categoria.</p></div>}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}