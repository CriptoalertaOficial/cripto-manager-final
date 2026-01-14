
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PlusCircle, RefreshCw, Trash2, TrendingUp, AlertCircle, PieChart, Sparkles, Sidebar as SidebarIcon, Menu } from 'lucide-react';
import { PortfolioItem, MarketData, PortfolioCalculations, AlertStatus } from './types';
import { fetchPrices } from './services/coingecko';
import { getPortfolioAnalysis } from './services/geminiService';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import PortfolioTable from './components/PortfolioTable';
import AIInsights from './components/AIInsights';

const App: React.FC = () => {
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>(() => {
    const saved = localStorage.getItem('cripto_portfolio');
    return saved ? JSON.parse(saved) : [];
  });
  const [marketData, setMarketData] = useState<MarketData>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Persistence
  useEffect(() => {
    localStorage.setItem('cripto_portfolio', JSON.stringify(portfolio));
  }, [portfolio]);

  const updatePrices = useCallback(async () => {
    if (portfolio.length === 0) return;
    setIsRefreshing(true);
    const ids = portfolio.map(item => item.coingeckoId);
    const data = await fetchPrices(ids);
    setMarketData(data);
    setIsRefreshing(false);
  }, [portfolio]);

  useEffect(() => {
    updatePrices();
    const interval = setInterval(updatePrices, 60000); // Auto refresh 60s
    return () => clearInterval(interval);
  }, [updatePrices]);

  const calculatedPortfolio = useMemo<PortfolioCalculations[]>(() => {
    return portfolio.map(item => {
      const currentPrice = marketData[item.coingeckoId]?.usd || 0;
      const totalInvested = item.quantity * item.averagePrice;
      const currentValue = item.quantity * currentPrice;
      const percentageResult = item.averagePrice > 0 
        ? ((currentPrice - item.averagePrice) / item.averagePrice) * 100 
        : 0;
      
      let status = AlertStatus.HOLD;
      if (currentPrice >= item.targetPrice && item.targetPrice > 0) {
        status = AlertStatus.PROFIT;
      } else if (currentPrice <= item.stopLoss && item.stopLoss > 0) {
        status = AlertStatus.STOP;
      }

      return {
        ...item,
        currentPrice,
        totalInvested,
        currentValue,
        percentageResult,
        status
      };
    });
  }, [portfolio, marketData]);

  const addItem = (item: Omit<PortfolioItem, 'id'>) => {
    const newItem = { ...item, id: crypto.randomUUID() };
    setPortfolio(prev => [...prev, newItem]);
  };

  const deleteItem = (id: string) => {
    setPortfolio(prev => prev.filter(item => item.id !== id));
  };

  const clearPortfolio = () => {
    if (window.confirm('Tem certeza que deseja limpar toda a carteira?')) {
      setPortfolio([]);
      setMarketData({});
      setAiAnalysis(null);
    }
  };

  const runAiAnalysis = async () => {
    if (calculatedPortfolio.length === 0) return;
    setIsAnalyzing(true);
    const analysis = await getPortfolioAnalysis(calculatedPortfolio);
    setAiAnalysis(analysis);
    setIsAnalyzing(false);
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar - Add Asset Form */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-80 bg-zinc-950 border-r border-zinc-800 transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0
      `}>
        <div className="p-6 h-full flex flex-col">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <TrendingUp className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">CriptoAlerta <span className="text-indigo-500">2.0</span></h1>
          </div>
          
          <Sidebar onAdd={addItem} />
          
          <div className="mt-auto pt-6 border-t border-zinc-800">
             <button 
              onClick={clearPortfolio}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 text-sm text-zinc-500 hover:text-red-400 transition-colors"
            >
              <Trash2 size={16} />
              Limpar Carteira
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-zinc-950 px-4 md:px-8 py-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="md:hidden p-2 text-zinc-400 hover:text-white"
              >
                <Menu size={24} />
              </button>
              <h2 className="text-2xl font-bold">Gestão Profissional</h2>
            </div>
            <p className="text-zinc-500 text-sm">Monitoramento matemático e estratégico de ativos on-chain.</p>
          </div>
          
          <div className="flex items-center gap-3">
             <button
              onClick={runAiAnalysis}
              disabled={isAnalyzing || portfolio.length === 0}
              className="flex items-center gap-2 bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600/20 px-4 py-2 rounded-lg border border-indigo-500/20 transition-all text-sm disabled:opacity-50"
            >
              <Sparkles size={18} className={isAnalyzing ? "animate-pulse" : ""} />
              {isAnalyzing ? "Analisando..." : "Análise IA"}
            </button>
            <button
              onClick={updatePrices}
              disabled={isRefreshing}
              className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 px-4 py-2 rounded-lg border border-zinc-800 transition-all text-sm"
            >
              <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
              Atualizar
            </button>
          </div>
        </header>

        <Dashboard portfolio={calculatedPortfolio} />

        {aiAnalysis && (
          <AIInsights analysis={aiAnalysis} onClose={() => setAiAnalysis(null)} />
        )}

        <div className="mt-8">
          <PortfolioTable 
            items={calculatedPortfolio} 
            onDelete={deleteItem} 
          />
        </div>

        <footer className="mt-12 pt-8 border-t border-zinc-900 text-center text-zinc-600 text-sm">
          <p>© 2024 CriptoAlerta Pro | Dados fornecidos por CoinGecko API</p>
        </footer>
      </main>
    </div>
  );
};

export default App;
