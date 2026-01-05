import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { 
  Image, FileText, Trash2, Plus, Loader2, LogOut, 
  Wrench, Type 
} from 'lucide-react';
import { client } from '../lib/sanity';

export function SiteAdmin() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'banners' | 'docs'>('banners');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [carouselData, setCarouselData] = useState<any>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<{role?: string} | null>(null);

  const [newSlide, setNewSlide] = useState({ titulo: '', texto: '', file: null as File | null });
  const [newDoc, setNewDoc] = useState({ titulo: '', file: null as File | null });

  useEffect(() => {
    const userStr = localStorage.getItem('intranet_user');
    if (!userStr) { window.location.href = '/login'; return; }
    
    const user = JSON.parse(userStr);
    setCurrentUser(user);

    if (user.role !== 'comunicacao' && user.role !== 'root') {
      alert('Acesso negado para seu perfil.');
      window.location.href = '/login';
    }

    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const bannerQuery = `*[_type == "carousel"][0] { _id, slides[] { titulo, texto, "url": imagem.asset->url, "key": _key } }`;
      const docQuery = `*[_type == "documentosImpressao"] | order(_createdAt desc) { _id, titulo, "url": arquivo.asset->url }`;

      const [bannerResult, docResult] = await Promise.all([
        client.fetch(bannerQuery),
        client.fetch(docQuery)
      ]);

      setCarouselData(bannerResult);
      setDocs(docResult);
    } catch (error) {
      console.error(error);
      alert('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!carouselData?._id) return alert('Erro: Carrosel não encontrado no sistema.');

    setUploading(true);
    try {
      let imageReference = undefined;

      if (newSlide.file) {
        const imageAsset = await client.assets.upload('image', newSlide.file);
        imageReference = {
          _type: 'image',
          asset: {_type: 'reference', _ref: imageAsset._id}
        };
      }
    
      await client.patch(carouselData._id)
        .setIfMissing({ slides: [] })
        .append('slides', [{
          _type: 'object',
          _key: Math.random().toString(36).substring(7),
          titulo: newSlide.titulo,
          texto: newSlide.texto,
          imagem: imageReference
        }])
        .commit();

      alert('Banner adicionado com sucesso!');
      setNewSlide({ titulo: '', texto: '', file: null });
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar banner');
    } finally {
      setUploading(false);
    }
  };

  const removeBanner = async (itemKey: string) => {
    if (!confirm('Tem certeza que deseja remover este banner?')) return;
    try {
      await client.patch(carouselData._id).unset([`slides[_key=="${itemKey}"]`]).commit();
      fetchData();
    } catch (err) { console.error(err); alert('Erro ao remover'); }
  };

  const handleAddDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoc.file) return alert('Selecione um PDF');

    setUploading(true);
    try {
      const fileAsset = await client.assets.upload('file', newDoc.file);
      await client.create({
        _type: 'documentosImpressao',
        titulo: newDoc.titulo,
        arquivo: { _type: 'file', asset: { _type: 'reference', _ref: fileAsset._id } }
      });
      alert('Documento publicado!');
      setNewDoc({ titulo: '', file: null });
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Erro ao publicar documento');
    } finally {
      setUploading(false);
    }
  };

  const removeDoc = async (id: string) => {
    if (!confirm('Excluir documento permanentemente?')) return;
    try {
      await client.delete(id);
      fetchData();
    } catch (err) { alert('Erro ao excluir'); }
  };

  const handleLogout = () => {
    localStorage.removeItem('intranet_user');
    navigate('/login');
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        
        {/* --- CABEÇALHO RESPONSIVO --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Gestão do Site</h1>
            <p className="text-sm sm:text-base text-gray-600">Gerencie banners e arquivos públicos</p>
          </div>
          
          <div className="flex flex-col sm:flex-row w-full md:w-auto items-center gap-3">
            {currentUser?.role === 'root' && (
              <button 
                onClick={() => navigate('/admin-os')}
                className="w-full sm:w-auto flex justify-center items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-all font-medium border border-blue-200"
              >
                <Wrench size={18} />
                Painel O.S.
              </button>
            )}

            <button 
              onClick={handleLogout} 
              className="w-full sm:w-auto flex justify-center items-center gap-2 text-red-600 hover:text-red-700 bg-red-50 md:bg-transparent px-4 py-2 md:py-0 rounded-lg md:rounded-none font-medium transition-all"
            >
              <LogOut size={18} /> Sair
            </button>
          </div>
        </div>

        {/* --- ABAS DE NAVEGAÇÃO --- */}
        <div className="flex gap-4 mb-8 border-b border-gray-200 overflow-x-auto pb-1">
          <button 
            onClick={() => setActiveTab('banners')}
            className={`pb-4 px-2 font-medium flex items-center gap-2 whitespace-nowrap ${activeTab === 'banners' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Image size={20} /> Carrossel (Home)
          </button>
          <button 
            onClick={() => setActiveTab('docs')}
            className={`pb-4 px-2 font-medium flex items-center gap-2 whitespace-nowrap ${activeTab === 'docs' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <FileText size={20} /> Documentos
          </button>
        </div>

        {loading ? <p className="text-center py-10 text-gray-500">Carregando dados...</p> : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* --- COLUNA ESQUERDA: FORMULÁRIO (Fica no topo no Mobile) --- */}
            <div className="md:col-span-1 bg-white p-6 rounded-lg shadow-sm border border-gray-200 h-fit">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Plus size={20} className="text-blue-600"/> 
                {activeTab === 'banners' ? 'Novo Slide' : 'Novo Documento'}
              </h2>
              
              {activeTab === 'banners' ? (
                <form onSubmit={handleAddBanner} className="space-y-4">
                  <input 
                    type="text" placeholder="Título do Slide" required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newSlide.titulo} onChange={e => setNewSlide({...newSlide, titulo: e.target.value})}
                  />
                  <textarea 
                    placeholder="Texto curto" required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newSlide.texto} onChange={e => setNewSlide({...newSlide, texto: e.target.value})}
                  />
                  <div className="border-2 border-dashed border-gray-300 p-4 rounded-lg text-center cursor-pointer hover:bg-gray-50 min-w-0">
                    <input 
                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
                        type="file" 
                        accept="image/*" 
                        onChange={e => setNewSlide({...newSlide, file: e.target.files?.[0] || null})} 
                    />
                    <p className="text-xs text-gray-400 mt-2">Opcional: Deixe vazio para fundo azul.</p>
                  </div>
                  <button disabled={uploading} type="submit" className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 font-medium flex justify-center shadow-sm">
                    {uploading ? <Loader2 className="animate-spin"/> : 'Adicionar ao Site'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleAddDoc} className="space-y-4">
                  <input 
                    type="text" placeholder="Nome do Documento (ex: Edital 01)" required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newDoc.titulo} onChange={e => setNewDoc({...newDoc, titulo: e.target.value})}
                  />
                  <div className="border-2 border-dashed border-gray-300 p-4 rounded-lg text-center cursor-pointer hover:bg-gray-50 min-w-0">
                    <input className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" type="file" accept=".pdf,.doc,.docx" required onChange={e => setNewDoc({...newDoc, file: e.target.files?.[0] || null})} />
                    <p className="text-xs text-gray-400 mt-2">PDF Recomendado</p>
                  </div>
                  <button disabled={uploading} type="submit" className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 font-medium flex justify-center shadow-sm">
                    {uploading ? <Loader2 className="animate-spin"/> : 'Publicar Documento'}
                  </button>
                </form>
              )}
            </div>

            {/* --- COLUNA DIREITA: LISTA --- */}
            <div className="md:col-span-2 space-y-4">
              <h2 className="font-bold text-gray-700 text-lg">Itens Ativos</h2>
              
              {activeTab === 'banners' ? (
                <div className="grid gap-4">
                  {carouselData?.slides?.map((slide: any) => (
                    <div key={slide.key} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                      
                      {/* LÓGICA DE PREVIEW */}
                      {slide.url ? (
                         <img src={slide.url} className="w-full sm:w-24 h-32 sm:h-16 object-cover rounded-md border border-gray-100" alt="Slide" />
                      ) : (
                         <div className="w-full sm:w-24 h-16 rounded-md bg-gradient-to-r from-blue-600 to-blue-800 flex items-center justify-center border border-gray-100 flex-shrink-0">
                           <Type className="text-white opacity-50 w-6 h-6" />
                         </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-800 truncate">{slide.titulo}</h4>
                        <p className="text-sm text-gray-500 line-clamp-2">{slide.texto}</p>
                      </div>
                      
                      <button 
                        onClick={() => removeBanner(slide.key)} 
                        className="self-end sm:self-center text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                        title="Remover Banner"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  ))}
                  {!carouselData?.slides && <p className="text-gray-500 italic">Nenhum banner encontrado.</p>}
                </div>
              ) : (
                <div className="grid gap-2">
                  {docs.map((doc) => (
                    <div key={doc._id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white p-4 rounded-lg border border-gray-200 shadow-sm gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="bg-red-100 p-2 rounded-lg text-red-600 flex-shrink-0"><FileText size={20}/></div>
                        <span className="font-medium text-gray-800 truncate">{doc.titulo}</span>
                      </div>
                      <div className="flex w-full sm:w-auto gap-3 items-center justify-between sm:justify-end mt-2 sm:mt-0">
                        <a href={doc.url} target="_blank" className="text-blue-600 text-sm hover:underline font-medium">Ver arquivo</a>
                        <button onClick={() => removeDoc(doc._id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </Layout>
  );
}