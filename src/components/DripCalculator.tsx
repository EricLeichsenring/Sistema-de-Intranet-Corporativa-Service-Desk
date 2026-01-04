import { useState } from 'react';
import { Droplets, Calculator, X, ArrowRightLeft, Zap } from 'lucide-react';

interface DripCalculatorProps {
  onClose: () => void;
}

export function DripCalculator({ onClose }: DripCalculatorProps) {
  // --- ESTADOS PARA O MODO DE CÁLCULO (Volume / Tempo) ---
  const [tab, setTab] = useState<'padrao' | 'conversao'>('padrao');
  
  // Estados do Cálculo Padrão
  const [volume, setVolume] = useState('');
  const [time, setTime] = useState('');
  const [type, setType] = useState<'macrogotas' | 'microgotas'>('macrogotas');
  const [resultPadrao, setResultPadrao] = useState<number | null>(null);

  // Estados da Conversão Rápida
  const [rateValue, setRateValue] = useState('');
  const [conversionDir, setConversionDir] = useState<'ml_to_gts' | 'gts_to_ml'>('ml_to_gts');
  const [resultConv, setResultConv] = useState<number | null>(null);

  // --- LÓGICA 1: CÁLCULO PADRÃO (Volume / Tempo) ---
  const calculatePadrao = () => {
    const v = parseFloat(volume);
    const t = parseFloat(time);
    if (!v || !t) return;

    let res = 0;
    if (type === 'macrogotas') {
      res = v / (t * 3); // Fórmula clássica
    } else {
      res = v / t; // Microgotas
    }
    setResultPadrao(Math.round(res));
  };

  // --- LÓGICA 2: CONVERSÃO RÁPIDA (Bomba <-> Gravidade) ---
  const calculateConversao = () => {
    const val = parseFloat(rateValue);
    if (!val) return;

    let res = 0;
    // A CONSTANTE MÁGICA É 3
    if (conversionDir === 'ml_to_gts') {
      // Tenho ml/h (Bomba) e quero Gotas (Gravidade)
      // Fórmula: ml/h dividido por 3
      res = val / 3;
    } else {
      // Tenho Gotas e quero saber quanto seria na Bomba (ml/h)
      // Fórmula: Gotas vezes 3
      res = val * 3;
    }
    setResultConv(Math.round(res));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden relative">
        
        {/* Cabeçalho */}
        <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-2 font-bold">
            <Droplets size={20} /> Calc. Gotejamento
          </div>
          <button onClick={onClose} className="hover:bg-blue-700 p-1 rounded transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* ABAS SUPERIORES */}
        <div className="flex border-b border-gray-200">
          <button 
            onClick={() => setTab('padrao')}
            className={`flex-1 py-3 text-sm font-bold transition-colors ${tab === 'padrao' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            Volume x Tempo
          </button>
          <button 
            onClick={() => setTab('conversao')}
            className={`flex-1 py-3 text-sm font-bold transition-colors ${tab === 'conversao' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            Bomba ↔ Equipo
          </button>
        </div>

        {/* CORPO MUDANÇA CONFORME A ABA */}
        <div className="p-6">
          
          {/* === ABA 1: CÁLCULO PADRÃO === */}
          {tab === 'padrao' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex bg-gray-100 p-1 rounded-lg">
                <button onClick={() => { setType('macrogotas'); setResultPadrao(null); }} className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${type === 'macrogotas' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Macrogotas</button>
                <button onClick={() => { setType('microgotas'); setResultPadrao(null); }} className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${type === 'microgotas' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Microgotas</button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Volume Total (ml)</label>
                  <input type="number" value={volume} onChange={(e) => setVolume(e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: 500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tempo (Horas)</label>
                  <input type="number" value={time} onChange={(e) => setTime(e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: 8" />
                </div>
              </div>

              <button onClick={calculatePadrao} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all">
                <Calculator size={18} /> Calcular Gotejamento
              </button>

              {resultPadrao !== null && (
                <div className="mt-2 bg-blue-50 border-2 border-blue-100 rounded-lg p-4 text-center">
                  <p className="text-gray-600 text-sm mb-1">Resultado:</p>
                  <p className="text-4xl font-bold text-blue-700">{resultPadrao}</p>
                  <p className="text-blue-600 text-xs font-bold uppercase">{type === 'macrogotas' ? 'Gotas / min' : 'Microgotas / min'}</p>
                </div>
              )}
            </div>
          )}

          {/* === ABA 2: CONVERSÃO RÁPIDA (BOMBA <-> GRAVIDADE) === */}
          {tab === 'conversao' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 text-sm text-orange-800">
                <p className="flex gap-2 items-start">
                  <Zap size={16} className="mt-0.5 flex-shrink-0" />
                  Útil quando falta bomba de infusão e você precisa converter a vazão (ml/h) para gotejamento manual.
                </p>
              </div>

              {/* Botão de Inverter */}
              <div className="flex items-center justify-between bg-gray-100 p-1 rounded-lg">
                 <button 
                  onClick={() => { setConversionDir('ml_to_gts'); setResultConv(null); }}
                  className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${conversionDir === 'ml_to_gts' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}
                 >
                   ml/h <span className="mx-1">→</span> Gotas
                 </button>
                 <button onClick={() => {
                    setConversionDir(prev => prev === 'ml_to_gts' ? 'gts_to_ml' : 'ml_to_gts');
                    setResultConv(null);
                 }} className="p-2 text-gray-500 hover:text-blue-600">
                   <ArrowRightLeft size={16} />
                 </button>
                 <button 
                  onClick={() => { setConversionDir('gts_to_ml'); setResultConv(null); }}
                  className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${conversionDir === 'gts_to_ml' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}
                 >
                   Gotas <span className="mx-1">→</span> ml/h
                 </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  {conversionDir === 'ml_to_gts' ? 'Vazão da Bomba (ml/h)' : 'Gotejamento Atual (gts/min)'}
                </label>
                <input 
                  type="number" 
                  value={rateValue} 
                  onChange={(e) => setRateValue(e.target.value)} 
                  className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-bold text-center text-gray-700" 
                  placeholder="0" 
                />
              </div>

              <button onClick={calculateConversao} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all">
                <Calculator size={18} /> Converter
              </button>

              {resultConv !== null && (
                <div className="bg-blue-50 border-2 border-blue-100 rounded-lg p-4 text-center">
                  <p className="text-gray-600 text-sm mb-1">
                    {conversionDir === 'ml_to_gts' ? 'Ajuste o equipo para:' : 'Equivale na bomba a:'}
                  </p>
                  <p className="text-5xl font-bold text-blue-700">{resultConv}</p>
                  <p className="text-blue-600 text-sm font-bold uppercase mt-1">
                    {conversionDir === 'ml_to_gts' ? 'Gotas / minuto' : 'ml / hora'}
                  </p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}