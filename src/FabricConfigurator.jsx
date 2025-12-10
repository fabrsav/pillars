import React, { useState } from 'react';
import { ShoppingCart, Ruler, AlertTriangle } from 'lucide-react';

// --- CONFIGURAZIONE PRODOTTO ---
const PRODUCT_NAME = "Tessuto Rifrangente Microprismatico (Impermeabile)";
const BASE_PRICE = 25.00;
const ROLL_WIDTH_CM = 140;

const FabricConfigurator = ({ theme }) => {
  const [lengthInMeters, setLengthInMeters] = useState(2.0);

  const handleLengthChange = (e) => {
    const value = parseFloat(e.target.value);
    setLengthInMeters(value);
  };

  const totalPrice = lengthInMeters * BASE_PRICE;
  const showWarning = lengthInMeters < 2.0;

  return (
    <div className={`mt-6 rounded-2xl border ${theme.border} p-6 bg-slate-900/40 relative overflow-hidden transition-all duration-500 ease-in-out`}>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h4 className={`text-xs font-bold ${theme.text} flex items-center gap-2 tracking-widest uppercase`}>
            <Ruler size={14}/>
            Configuratore Tessuto
          </h4>
          <p className="text-lg font-bold text-white mt-2">{PRODUCT_NAME}</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-white tracking-tighter">€{BASE_PRICE.toFixed(2)}/m</div>
          <div className="text-[9px] text-slate-500 tracking-widest">Larghezza Fissa: {ROLL_WIDTH_CM}cm</div>
        </div>
      </div>

      {/* --- INPUT UTENTE --- */}
      <div className="mb-6">
        <label htmlFor="length-slider" className="block text-sm font-medium text-slate-300 mb-2">
          Lunghezza in Metri: <span className="font-bold text-white">{lengthInMeters.toFixed(1)}m</span>
        </label>
        <input
          id="length-slider"
          type="range"
          min="1.0"
          max="10.0"
          step="0.1"
          value={lengthInMeters}
          onChange={handleLengthChange}
          className={`w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer range-lg accent-${theme.accent}-500`}
        />
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>1.0m</span>
          <span>10.0m</span>
        </div>
      </div>

      {/* --- AVVISO LUNGHEZZA MINIMA --- */}
      {showWarning && (
        <div className="p-3 bg-amber-950/40 border border-amber-500/30 rounded-lg flex items-center gap-3 mb-6 animate-in fade-in duration-300">
          <AlertTriangle size={20} className="text-amber-400" />
          <p className="text-xs text-amber-300">
            Per una cover da longboard (es. 90cm), si consigliano almeno 2.0m per avere margine di lavorazione.
          </p>
        </div>
      )}

      {/* --- RIEPILOGO ORDINE --- */}
      <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 space-y-3">
        <h5 className="text-sm font-bold text-white mb-2">Riepilogo Ordine</h5>
        <div className="flex justify-between text-sm text-slate-300">
          <span>Lunghezza:</span>
          <span className="font-mono text-white">{lengthInMeters.toFixed(1)} m</span>
        </div>
        <div className="flex justify-between text-sm text-slate-300">
          <span>Larghezza:</span>
          <span className="font-mono text-white">{ROLL_WIDTH_CM} cm</span>
        </div>
        <div className="border-t border-slate-700 my-2"></div>
        <div className="flex justify-between items-center text-lg">
          <span className="font-bold text-white">Prezzo Totale:</span>
          <span className={`font-mono font-bold text-${theme.accent}-400`}>€{totalPrice.toFixed(2)}</span>
        </div>
      </div>

      {/* --- BOTTONE AGGIUNGI AL CARRELLO --- */}
      <button
        disabled={lengthInMeters <= 0}
        className={`w-full mt-6 py-3 bg-gradient-to-r ${theme.gradient} text-white text-sm font-bold uppercase rounded-xl shadow-lg flex items-center justify-center gap-3
                    transition-all duration-300 ease-out
                    hover:brightness-110 hover:shadow-xl
                    active:scale-[0.98]
                    disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale`}
      >
        <ShoppingCart size={18} />
        Aggiungi al Carrello
      </button>
    </div>
  );
};

export default FabricConfigurator;
