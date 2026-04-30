/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calculator, 
  FileText, 
  Layers, 
  Printer, 
  Scissors, 
  ChevronRight, 
  Info, 
  Download,
  Percent,
  Weight,
  Layout,
  Settings,
  Zap,
  Save,
  Trash2,
  ExternalLink,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---

type ViewType = 'estimator' | 'history' | 'config';

type BindingType = 'none' | 'perfect' | 'saddle-stitch' | 'spiral';
type LaminationType = 'none' | 'gloss' | 'matt';

interface AppConfig {
  currency: string;
  paperRates: Record<string, number>;
  printingRatePerK: number;
  plateCharges: number;
  makeReady: number;
  // Finishing Rates
  laminationGlossRate: number;
  laminationMattRate: number;
  spotUVSetup: number;
  spotUVRate: number;
  foilingSetup: number;
  foilingRate: number;
  dieCuttingSetup: number;
  dieCuttingRate: number;
  foldingRate: number;
  coldFoilSetup: number;
  coldFoilRate: number;
  embossSetup: number;
  embossRate: number;
  debossSetup: number;
  debossRate: number;
  perforationSetup: number;
  creasingSetup: number;
  taxRate: number;
  // Dynamic fields
  customRates: Record<string, number>;
  labels: Record<string, string>;
}

interface SavedEstimate {
  id: string;
  date: string;
  data: PrintJobData;
  results: any; // Simplified for this implementation
}

const DEFAULT_CONFIG: AppConfig = {
  currency: 'Rs',
  paperRates: {
    'Art Paper': 150,
    'Art Card': 210,
    'Woodfree': 95,
    'Ivory Board': 280,
    'Kraft Paper': 75,
  },
  printingRatePerK: 250,
  plateCharges: 500,
  makeReady: 1500,
  laminationGlossRate: 0.06,
  laminationMattRate: 0.09,
  spotUVSetup: 2500,
  spotUVRate: 0.12,
  foilingSetup: 3500,
  foilingRate: 0.25,
  dieCuttingSetup: 3000,
  dieCuttingRate: 0.75,
  foldingRate: 0.50,
  coldFoilSetup: 4000,
  coldFoilRate: 0.35,
  embossSetup: 2800,
  embossRate: 0.15,
  debossSetup: 2800,
  debossRate: 0.15,
  perforationSetup: 1500,
  creasingSetup: 1200,
  taxRate: 0,
  customRates: {},
  labels: {
    printingRatePerK: 'Base Printing Rate',
    plateCharges: 'Plate Charges',
    makeReady: 'Machine Make-Ready',
    laminationGlossRate: 'Gloss Lamination',
    laminationMattRate: 'Matt Lamination',
    spotUVSetup: 'Spot UV Setup',
    spotUVRate: 'Spot UV Square Inch',
    foilingSetup: 'Hot Foil Setup',
    foilingRate: 'Hot Foil Square Inch',
    dieCuttingSetup: 'Die-Cutting Setup',
    dieCuttingRate: 'Die-Cutting Per Unit',
    foldingRate: 'Folding Rate Per Unit',
    coldFoilSetup: 'Cold Foil Setup',
    coldFoilRate: 'Cold Foil Square Inch',
    embossSetup: 'Embossing Setup',
    embossRate: 'Embossing Square Inch',
    debossSetup: 'Debossing Setup',
    debossRate: 'Debossing Square Inch',
    perforationSetup: 'Perforation Setup',
    creasingSetup: 'Creasing Setup',
  }
};

interface PrintJobData {
  jobName: string;
  quantity: number;
  pages: number; 
  width: number;
  height: number;
  paperType: string;
  gsm: number;
  parentWidth: number;
  parentHeight: number;
  paperRate: number; 
  colorsFront: number;
  colorsBack: number;
  plateCharges: number;
  makeReady: number;
  lamination: LaminationType;
  dieCutting: boolean;
  binding: BindingType;
  spotUV: boolean;
  foiling: boolean;
  foilArea: number; 
  folding: boolean;
  foldsCount: number;
  coldFoiling: boolean;
  coldFoilArea: number;
  embossing: boolean;
  embossArea: number;
  debossing: boolean;
  debossArea: number;
  perforation: boolean;
  creasing: boolean;
  margin: number; 
  taxRate: number;
  shipping: number;
}

// --- Helpers ---

const calculateOuts = (fW: number, fH: number, pW: number, pH: number) => {
  // Simple "outs" calculation - trying both orientations
  const orientation1 = Math.floor(pW / fW) * Math.floor(pH / fH);
  const orientation2 = Math.floor(pH / fW) * Math.floor(pW / fH);
  return Math.max(orientation1, orientation2, 1);
};

// --- Components ---

export default function App() {
  const [view, setView] = useState<ViewType>('estimator');
  const [appConfig, setAppConfig] = useState<AppConfig>(() => {
    const saved = localStorage.getItem('print_app_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed || typeof parsed !== 'object') return DEFAULT_CONFIG;
        // Deep merge to ensure all properties like customRates and labels exist
        return {
          ...DEFAULT_CONFIG,
          ...parsed,
          paperRates: { ...DEFAULT_CONFIG.paperRates, ...(parsed.paperRates || {}) },
          customRates: { ...DEFAULT_CONFIG.customRates, ...(parsed.customRates || {}) },
          labels: { ...DEFAULT_CONFIG.labels, ...(parsed.labels || {}) },
          currency: parsed.currency || DEFAULT_CONFIG.currency
        };
      } catch (e) {
        console.error("Failed to parse app config", e);
        return DEFAULT_CONFIG;
      }
    }
    return DEFAULT_CONFIG;
  });
  
  const [savedEstimates, setSavedEstimates] = useState<SavedEstimate[]>(() => {
    const saved = localStorage.getItem('print_saved_estimates');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.error("Failed to parse saved estimates", e);
        return [];
      }
    }
    return [];
  });

  const [data, setData] = useState<PrintJobData>({
    jobName: 'New Estimate',
    quantity: 1000,
    pages: 1,
    width: 8.5,
    height: 11,
    paperType: 'Art Paper',
    gsm: 130,
    parentWidth: 23,
    parentHeight: 36,
    paperRate: 150, 
    colorsFront: 4,
    colorsBack: 4,
    plateCharges: 500,
    makeReady: 1500,
    lamination: 'none',
    dieCutting: false,
    binding: 'none',
    spotUV: false,
    foiling: false,
    foilArea: 0,
    folding: false,
    foldsCount: 0,
    coldFoiling: false,
    coldFoilArea: 0,
    embossing: false,
    embossArea: 0,
    debossing: false,
    debossArea: 0,
    perforation: false,
    creasing: false,
    margin: 20,
    taxRate: 0,
    shipping: 1000,
  });

  // Persist Data
  useEffect(() => {
    localStorage.setItem('print_app_config', JSON.stringify(appConfig));
  }, [appConfig]);

  useEffect(() => {
    localStorage.setItem('print_saved_estimates', JSON.stringify(savedEstimates));
  }, [savedEstimates]);

  // Sync Data with Config when view changes or config changes
  useEffect(() => {
    setData(prev => ({
      ...prev,
      paperRate: appConfig.paperRates[prev.paperType] || prev.paperRate,
      plateCharges: appConfig.plateCharges,
      makeReady: appConfig.makeReady,
      taxRate: appConfig.taxRate,
    }));
  }, [appConfig]);

  const results = useMemo(() => {
    const { 
      width, height, parentWidth, parentHeight, quantity, pages,
      gsm, paperRate, colorsFront, colorsBack, 
      plateCharges, makeReady, lamination, dieCutting, binding,
      spotUV, foiling, foilArea, folding, foldsCount,
      coldFoiling, coldFoilArea, embossing, embossArea,
      debossing, debossArea, perforation, creasing,
      margin, taxRate, shipping
    } = data;

    const outs = calculateOuts(width, height, parentWidth, parentHeight);
    const totalImpressionsNeeded = (quantity * pages) / outs;
    const baseSheets = Math.ceil(totalImpressionsNeeded);
    
    const wastagePercentage = 0.05;
    const setupSheetsPerPlate = 25; 
    const wastageSheets = Math.max(setupSheetsPerPlate * (colorsFront + colorsBack), Math.ceil(baseSheets * wastagePercentage));
    const totalSheets = baseSheets + wastageSheets;

    const sheetAreaM2 = (parentWidth * 0.0254) * (parentHeight * 0.0254);
    const totalPaperWeight = (sheetAreaM2 * gsm * totalSheets) / 1000;
    const paperCost = totalPaperWeight * paperRate;

    const printingCost = (totalSheets / 1000) * (colorsFront + colorsBack) * appConfig.printingRatePerK;
    const plateCost = (colorsFront + colorsBack) * plateCharges;

    let finishingCost = 0;
    if (lamination !== 'none') {
      const lamRate = lamination === 'gloss' ? appConfig.laminationGlossRate : appConfig.laminationMattRate; 
      finishingCost += (width * height * quantity * pages * lamRate);
    }
    
    if (spotUV) finishingCost += (width * height * quantity * appConfig.spotUVRate) + appConfig.spotUVSetup;
    if (foiling) finishingCost += (foilArea * quantity * appConfig.foilingRate) + appConfig.foilingSetup;
    if (dieCutting) finishingCost += appConfig.dieCuttingSetup + (quantity * appConfig.dieCuttingRate);
    
    // New Offset Finishes
    if (folding) finishingCost += (quantity * foldsCount * appConfig.foldingRate);
    if (coldFoiling) finishingCost += (coldFoilArea * quantity * appConfig.coldFoilRate) + appConfig.coldFoilSetup;
    if (embossing) finishingCost += (embossArea * quantity * appConfig.embossRate) + appConfig.embossSetup;
    if (debossing) finishingCost += (debossArea * quantity * appConfig.debossRate) + appConfig.debossSetup;
    if (perforation) finishingCost += appConfig.perforationSetup;
    if (creasing) finishingCost += appConfig.creasingSetup;
    
    if (binding === 'perfect') finishingCost += (quantity * 15);
    if (binding === 'saddle-stitch') finishingCost += (quantity * 4);
    if (binding === 'spiral') finishingCost += (quantity * 25);

    // Dynamic Custom Rates
    let customRatesTotal = 0;
    Object.keys(appConfig.customRates).forEach(key => {
      const rate = appConfig.customRates[key];
      customRatesTotal += (quantity * (rate as number));
    });

    const productionCost = paperCost + printingCost + plateCost + makeReady + finishingCost + shipping + customRatesTotal;
    const profitAmount = (productionCost * (margin / 100));
    const subtotal = productionCost + profitAmount;
    const taxAmount = (subtotal * (taxRate / 100));
    const totalCost = subtotal + taxAmount;
    const unitCost = totalCost / quantity;

    return {
      outs,
      baseSheets,
      wastageSheets,
      totalSheets,
      totalPaperWeight,
      paperCost,
      printingCost,
      plateCost,
      makeReady,
      finishingCost,
      customRatesTotal,
      shipping,
      productionCost,
      profitAmount,
      taxAmount,
      totalCost,
      unitCost,
      breakdown: [
        { label: 'Paper Stock', value: paperCost, color: 'bg-indigo-500' },
        { label: 'Printing & Plates', value: printingCost + plateCost + makeReady, color: 'bg-emerald-500' },
        { label: 'Special Finishes', value: finishingCost + customRatesTotal, color: 'bg-amber-400' },
        { label: 'Logistics', value: shipping, color: 'bg-slate-400' },
        { label: 'Commercial Margin', value: profitAmount, color: 'bg-purple-500' },
        { label: 'Taxes/VAT', value: taxAmount, color: 'bg-rose-400' },
      ]
    };
  }, [data, appConfig]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      setData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
      return;
    }
    
    const val = type === 'number' ? parseFloat(value) || 0 : value;

    if (name === 'paperType') {
      setData(prev => ({ ...prev, paperType: value, paperRate: appConfig.paperRates[value] || prev.paperRate }));
      return;
    }

    setData(prev => ({ ...prev, [name]: val }));
  };

  const handleSaveEstimate = () => {
    const newSaved: SavedEstimate = {
      id: `EST-${Date.now()}`,
      date: new Date().toLocaleDateString(),
      data: { ...data },
      results: { ...results }
    };
    setSavedEstimates(prev => [newSaved, ...prev]);
    setView('history');
  };

  const handleDeleteEstimate = (id: string) => {
    setSavedEstimates(prev => prev.filter(e => e.id !== id));
  };

  const loadEstimate = (estimate: SavedEstimate) => {
    setData(estimate.data);
    setView('estimator');
  };

  return (
    <div className="h-screen bg-slate-50 flex overflow-hidden selection:bg-indigo-100">
      {/* --- Left Mini-Navigation --- */}
      <aside className="w-16 bg-slate-900 flex flex-col items-center py-6 gap-8 border-r border-slate-800 flex-shrink-0">
        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">
          PE
        </div>
        <nav className="flex flex-col gap-6">
          <MiniSidebarItem 
            icon={<Calculator className="w-6 h-6" />} 
            active={view === 'estimator'} 
            onClick={() => setView('estimator')}
          />
          <MiniSidebarItem 
            icon={<FileText className="w-6 h-6" />} 
            active={view === 'history'} 
            onClick={() => setView('history')}
          />
          <MiniSidebarItem 
            icon={<Settings className="w-6 h-6" />} 
            active={view === 'config'} 
            onClick={() => setView('config')}
          />
        </nav>
        <div className="mt-auto">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-[10px] text-slate-400 font-bold">SM</div>
        </div>
      </aside>

      {/* --- Main Content Body --- */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 flex-shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-slate-800">
              {view === 'estimator' && 'Cost Estimator'}
              {view === 'history' && 'Estimation History'}
              {view === 'config' && 'System Configuration'}
            </h1>
            {view === 'estimator' && (
              <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs font-mono rounded border border-slate-200">
                Live Draft
              </span>
            )}
          </div>
          <div className="flex gap-3">
            {view === 'estimator' && (
              <button 
                onClick={() => setData({
                  jobName: '',
                  quantity: 1000,
                  pages: 1,
                  width: 8.5,
                  height: 11,
                  paperType: 'Art Paper',
                  gsm: 130,
                  parentWidth: 23,
                  parentHeight: 36,
                  paperRate: appConfig.paperRates['Art Paper'],
                  colorsFront: 4,
                  colorsBack: 4,
                  plateCharges: appConfig.plateCharges,
                  makeReady: appConfig.makeReady,
                  lamination: 'none',
                  dieCutting: false,
                  binding: 'none',
                  spotUV: false,
                  foiling: false,
                  foilArea: 0,
                  folding: false,
                  foldsCount: 0,
                  coldFoiling: false,
                  coldFoilArea: 0,
                  embossing: false,
                  embossArea: 0,
                  debossing: false,
                  debossArea: 0,
                  perforation: false,
                  creasing: false,
                  margin: 20,
                  shipping: 1000,
                })}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-md transition-colors"
              >
                Clear Data
              </button>
            )}
            {view !== 'config' && (
              <button className="px-4 py-2 text-sm font-medium bg-slate-100 text-slate-600 rounded-md hover:bg-slate-200 transition-all flex items-center gap-2">
                <Download size={16} />
                Export CSV
              </button>
            )}
          </div>
        </header>

        <AnimatePresence mode="wait">
          {view === 'estimator' && (
            <motion.div 
              key="estimator"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 flex overflow-hidden"
            >
              {/* Forms Grid Area */}
              <section className="flex-1 p-6 grid grid-cols-1 xl:grid-cols-2 gap-6 overflow-y-auto pb-24 text-slate-800">
                {/* Job Details Card */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-5 bg-indigo-500 rounded-full"></div>
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Job & Quantity</h2>
                  </div>
                  <div className="space-y-4">
                    <InputGroup label="PROJECT NAME">
                      <input 
                        type="text" 
                        name="jobName"
                        value={data.jobName}
                        onChange={handleChange}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                        placeholder="Untitled Project"
                      />
                    </InputGroup>
                    <div className="grid grid-cols-3 gap-4">
                      <InputGroup label="QUANTITY">
                        <input 
                          type="number" 
                          name="quantity"
                          value={data.quantity}
                          onChange={handleChange}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                        />
                      </InputGroup>
                      <InputGroup label="PAGES">
                        <input 
                          type="number" 
                          name="pages"
                          value={data.pages}
                          onChange={handleChange}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                        />
                      </InputGroup>
                      <InputGroup label="SIZE (W x H)">
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            name="width"
                            value={data.width}
                            onChange={handleChange}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                          />
                          <span className="text-slate-300">×</span>
                          <input 
                            type="number" 
                            name="height"
                            value={data.height}
                            onChange={handleChange}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                          />
                        </div>
                      </InputGroup>
                    </div>
                  </div>
                </div>

                {/* Paper Specs Card */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-5 bg-emerald-500 rounded-full"></div>
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Paper Inventory</h2>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <InputGroup label="STOCK TYPE">
                        <select 
                          name="paperType"
                          value={data.paperType}
                          onChange={handleChange}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                        >
                          {Object.keys(appConfig.paperRates).map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </InputGroup>
                      <InputGroup label="GSM">
                        <input 
                          type="number" 
                          name="gsm"
                          value={data.gsm}
                          onChange={handleChange}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                        />
                      </InputGroup>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <InputGroup label="PARENT SIZE (WxH)">
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            name="parentWidth"
                            value={data.parentWidth}
                            onChange={handleChange}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                          />
                          <span className="text-slate-300">×</span>
                          <input 
                            type="number" 
                            name="parentHeight"
                            value={data.parentHeight}
                            onChange={handleChange}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                          />
                        </div>
                      </InputGroup>
                      <InputGroup label="PAPER RATE (KG)">
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-slate-400 text-sm">{appConfig.currency}</span>
                          <input 
                            type="number" 
                            name="paperRate"
                            value={data.paperRate}
                            onChange={handleChange}
                            className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                          />
                        </div>
                      </InputGroup>
                    </div>
                  </div>
                </div>

                {/* Press Specs Card */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-5 bg-amber-500 rounded-full"></div>
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Press & Machine</h2>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <InputGroup label="COLORS (FRONT / BACK)">
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            name="colorsFront"
                            value={data.colorsFront}
                            onChange={handleChange}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <span className="text-slate-300">/</span>
                          <input 
                            type="number" 
                            name="colorsBack"
                            value={data.colorsBack}
                            onChange={handleChange}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </InputGroup>
                      <InputGroup label="PLATE CHARGES">
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-slate-400 text-sm">{appConfig.currency}</span>
                          <input 
                            type="number" 
                            name="plateCharges"
                            value={data.plateCharges}
                            onChange={handleChange}
                            className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </InputGroup>
                    </div>
                    <InputGroup label="MAKE-READY COST">
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-slate-400 text-sm">{appConfig.currency}</span>
                        <input 
                          type="number" 
                          name="makeReady"
                          value={data.makeReady}
                          onChange={handleChange}
                          className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </InputGroup>
                  </div>
                </div>

                {/* Special Finishes Card */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-5 bg-rose-500 rounded-full"></div>
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Special Finishes</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <FinishToggle 
                        label="Spot UV" 
                        name="spotUV" 
                        checked={data.spotUV} 
                        onChange={handleChange} 
                        icon={<Percent size={14} />} 
                      />
                      <FinishToggle 
                        label="Hot Foiling" 
                        name="foiling" 
                        checked={data.foiling} 
                        onChange={handleChange} 
                        icon={<Zap size={14} />} 
                      />
                      {data.foiling && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                          <InputGroup label="FOIL AREA (SQ INCHES)">
                            <input type="number" name="foilArea" value={data.foilArea} onChange={handleChange} className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs" />
                          </InputGroup>
                        </motion.div>
                      )}
                      <FinishToggle 
                        label="Cold Foiling" 
                        name="coldFoiling" 
                        checked={data.coldFoiling} 
                        onChange={handleChange} 
                        icon={<Zap size={14} className="text-blue-400" />} 
                      />
                      {data.coldFoiling && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                          <InputGroup label="COLD FOIL AREA (SQ INCHES)">
                            <input type="number" name="coldFoilArea" value={data.coldFoilArea} onChange={handleChange} className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs" />
                          </InputGroup>
                        </motion.div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <FinishToggle 
                        label="Embossing" 
                        name="embossing" 
                        checked={data.embossing} 
                        onChange={handleChange} 
                        icon={<Layers size={14} />} 
                      />
                      {data.embossing && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                          <InputGroup label="EMBOSS AREA (SQ INCHES)">
                            <input type="number" name="embossArea" value={data.embossArea} onChange={handleChange} className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs" />
                          </InputGroup>
                        </motion.div>
                      )}
                      <FinishToggle 
                        label="Debossing" 
                        name="debossing" 
                        checked={data.debossing} 
                        onChange={handleChange} 
                        icon={<Layers size={14} className="rotate-180" />} 
                      />
                      {data.debossing && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                          <InputGroup label="DEBOSS AREA (SQ INCHES)">
                            <input type="number" name="debossArea" value={data.debossArea} onChange={handleChange} className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs" />
                          </InputGroup>
                        </motion.div>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <FinishToggle label="Perforation" name="perforation" checked={data.perforation} onChange={handleChange} />
                        <FinishToggle label="Creasing" name="creasing" checked={data.creasing} onChange={handleChange} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Post-Press & Logistics Card */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-5 bg-purple-500 rounded-full"></div>
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Finishing & Logistics</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                         <FinishToggle label="Die-Cutting" name="dieCutting" checked={data.dieCutting} onChange={handleChange} />
                         <FinishToggle label="Folding" name="folding" checked={data.folding} onChange={handleChange} />
                      </div>
                      {data.folding && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                          <InputGroup label="NUMBER OF FOLDS">
                            <input type="number" name="foldsCount" value={data.foldsCount} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded text-sm" />
                          </InputGroup>
                        </motion.div>
                      )}
                      <InputGroup label="LAMINATION">
                        <select name="lamination" value={data.lamination} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded text-sm">
                          <option value="none">No Lamination</option>
                          <option value="gloss">Gloss Lamination</option>
                          <option value="matt">Matt Lamination</option>
                        </select>
                      </InputGroup>
                      <InputGroup label="BINDING">
                        <select name="binding" value={data.binding} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded text-sm">
                          <option value="none">No Binding</option>
                          <option value="perfect">Perfect Binding</option>
                          <option value="saddle-stitch">Saddle Stitch</option>
                          <option value="spiral">Spiral Binding</option>
                        </select>
                      </InputGroup>
                    </div>
                    <div className="space-y-3">
                      <InputGroup label="SHIPPING COST">
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-slate-400 text-sm">{appConfig.currency}</span>
                          <input 
                            type="number" 
                            name="shipping" 
                            value={data.shipping} 
                            onChange={handleChange} 
                            className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-100 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" 
                          />
                        </div>
                      </InputGroup>
                      <InputGroup label="PROFIT MARGIN">
                        <div className="relative">
                          <span className="absolute right-3 top-2 text-slate-400 text-sm">%</span>
                          <input 
                            type="number" 
                            name="margin" 
                            value={data.margin} 
                            onChange={handleChange} 
                            className="w-full pr-8 pl-3 py-2 bg-slate-50 border border-slate-100 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" 
                          />
                        </div>
                      </InputGroup>
                    </div>
                  </div>
                </div>
              </section>

              {/* Sidebar Summary */}
              <aside className="w-80 bg-white border-l border-slate-200 flex flex-col flex-shrink-0 overflow-hidden">
                <div className="p-6 border-b border-slate-100 overflow-y-auto max-h-screen">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest text-slate-400">Pricing Summary</h3>
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  </div>
                  <div className="text-4xl font-light text-slate-800">
                    <span className="text-2xl mr-1">{appConfig.currency}</span>{Math.floor(results.totalCost).toLocaleString()}<span className="text-xl font-medium text-slate-400">.{(results.totalCost % 1).toFixed(2).split('.')[1]}</span>
                  </div>
                  <p className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                    <Zap size={12} />
                    Unit Cost: {appConfig.currency} {results.unitCost.toFixed(4)}
                  </p>

                  <div className="mt-8 space-y-6">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Outs</div>
                        <div className="text-lg font-bold text-slate-700 font-mono">{results.outs}</div>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Total Shts</div>
                        <div className="text-lg font-bold text-slate-700 font-mono">{results.totalSheets}</div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {results.breakdown.map((item, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-[11px] items-center">
                            <span className="text-slate-600 font-medium">{item.label}</span>
                            <span className="font-mono text-slate-400">{appConfig.currency} {Math.round(item.value).toLocaleString()}</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${(item.value / results.totalCost) * 100}%` }}
                              className={`${item.color} h-full rounded-full`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4 border-t border-slate-100 space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <span>Profit Margin</span>
                          <span className="text-indigo-600">{data.margin}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          value={data.margin}
                          onChange={(e) => setData(prev => ({ ...prev, margin: parseInt(e.target.value) }))}
                          className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <span>Tax / VAT</span>
                          <span className="text-rose-500">{data.taxRate}%</span>
                        </div>
                        <div className="relative">
                          <span className="absolute right-3 top-1.5 text-slate-300 text-xs">%</span>
                          <input 
                            type="number" 
                            value={data.taxRate}
                            onChange={(e) => setData(prev => ({ ...prev, taxRate: parseFloat(e.target.value) || 0 }))}
                            className="w-full pl-3 pr-8 py-1.5 bg-slate-50 border border-slate-100 rounded text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-300"
                          />
                        </div>
                      </div>

                      <div className="flex justify-between text-xs font-bold text-indigo-600 pt-2">
                        <span>Net Profit:</span>
                        <span>{appConfig.currency} {Math.round(results.profitAmount).toLocaleString()}</span>
                      </div>
                      {results.taxAmount > 0 && (
                        <div className="flex justify-between text-[10px] font-bold text-rose-500">
                          <span>Applied Tax:</span>
                          <span>{appConfig.currency} {Math.round(results.taxAmount).toLocaleString()}</span>
                        </div>
                      )}
                    </div>

                    <button 
                      onClick={handleSaveEstimate}
                      className="w-full py-3 bg-indigo-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 group mt-4 cursor-pointer"
                    >
                      <Save size={16} />
                      Save Estimate
                    </button>
                  </div>
                </div>
              </aside>
            </motion.div>
          )}

          {view === 'history' && (
            <motion.div 
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 p-8 overflow-y-auto"
            >
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-slate-800">Recent Calculations</h2>
                  <span className="text-sm text-slate-400">{savedEstimates.length} Saved Records</span>
                </div>

                <div className="grid gap-4">
                  {savedEstimates.map((est) => (
                    <div key={est.id} className="group bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between hover:border-indigo-400 transition-all shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                          <FileText size={24} />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors uppercase">{est.data.jobName || 'Untitled Project'}</h4>
                          <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                            <span className="font-mono">{est.id}</span>
                            <span>•</span>
                            <span>{est.date}</span>
                            <span>•</span>
                            <span>Qty: {est.data.quantity.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-8">
                        <div className="text-right">
                          <div className="text-xl font-bold text-slate-900">{appConfig.currency} {Math.round(est.results.totalCost).toLocaleString()}</div>
                          <div className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider">Final Estimate</div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => loadEstimate(est)}
                            className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-colors cursor-pointer"
                            title="Load Estimate"
                          >
                            <ExternalLink size={18} />
                          </button>
                          <button 
                            onClick={() => handleDeleteEstimate(est.id)}
                            className="p-2 hover:bg-rose-50 text-rose-500 rounded-lg transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {savedEstimates.length === 0 && (
                    <div className="text-center py-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl">
                      <FileText className="mx-auto text-slate-300 mb-4" size={48} />
                      <h3 className="text-slate-500 font-medium">No estimates saved yet</h3>
                      <button 
                        onClick={() => setView('estimator')}
                        className="mt-4 text-indigo-600 font-bold flex items-center gap-2 mx-auto hover:underline cursor-pointer"
                      >
                        <Plus size={16} /> Create your first estimate
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {view === 'config' && (
            <motion.div 
              key="config"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex-1 p-8 overflow-y-auto"
            >
              <div className="max-w-2xl mx-auto space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">Master Cost Settings</h2>
                  <p className="text-slate-500 text-sm">Define base prices used for all new calculations. All modifications are persisted to local storage.</p>
                </div>

                {/* Regional Settings */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-6">
                    <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                      <Settings size={18} />
                    </span>
                    <h3 className="font-bold text-slate-700">Localization</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputGroup label="BASE CURRENCY SYMBOL">
                      <input 
                        type="text"
                        value={appConfig.currency}
                        onChange={(e) => setAppConfig(prev => ({ ...prev, currency: e.target.value }))}
                        placeholder="e.g. Rs, $, €"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:border-indigo-500 text-slate-700 font-bold"
                      />
                    </InputGroup>
                    <InputGroup label="DEFAULT VAT/TAX RATE %">
                      <input 
                        type="number"
                        value={appConfig.taxRate}
                        onChange={(e) => setAppConfig(prev => ({ ...prev, taxRate: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:border-indigo-500 text-slate-700 font-bold"
                      />
                    </InputGroup>
                  </div>
                </div>

                {/* Paper Rates */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <Layers size={18} className="text-indigo-500" />
                      <h3 className="font-bold text-slate-700">Paper Rates per KG</h3>
                    </div>
                    <button 
                      onClick={() => {
                        const name = prompt('New Paper Type Name:');
                        if (name) {
                          setAppConfig(prev => ({
                            ...prev,
                            paperRates: { ...prev.paperRates, [name]: 0 }
                          }));
                        }
                      }}
                      className="text-indigo-600 font-bold text-xs flex items-center gap-1 hover:bg-indigo-50 px-2 py-1 rounded transition-all cursor-pointer"
                    >
                      <Plus size={14} /> Add New Stock
                    </button>
                  </div>
                  <div className="grid gap-4">
                    {Object.entries(appConfig.paperRates).map(([type, rate]) => (
                      <div key={type} className="flex items-center gap-4 group">
                        <input 
                          type="text"
                          value={type}
                          onChange={(e) => {
                            const newName = e.target.value;
                            if (newName && newName !== type) {
                              const newRates = { ...appConfig.paperRates };
                              delete newRates[type];
                              newRates[newName] = rate;
                              setAppConfig(prev => ({ ...prev, paperRates: newRates }));
                            }
                          }}
                          className="flex-1 text-sm font-medium text-slate-600 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-indigo-400 focus:outline-none transition-all"
                        />
                        <div className="relative w-32">
                          <span className="absolute left-3 top-2 text-slate-400 text-sm">{appConfig.currency}</span>
                          <input 
                            type="number"
                            value={rate}
                            onChange={(e) => {
                              const newRate = parseFloat(e.target.value) || 0;
                              setAppConfig(prev => ({
                                ...prev,
                                paperRates: { ...prev.paperRates, [type]: newRate }
                              }));
                            }}
                            className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:border-indigo-500 text-slate-700 font-mono"
                          />
                        </div>
                        <button 
                          onClick={() => {
                            const newRates = { ...appConfig.paperRates };
                            delete newRates[type];
                            setAppConfig(prev => ({ ...prev, paperRates: newRates }));
                          }}
                          className="opacity-0 group-hover:opacity-100 p-2 text-rose-400 hover:text-rose-600 transition-all cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Production & Finishing Rates */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-6">
                    <Printer size={18} className="text-amber-500" />
                    <h3 className="font-bold text-slate-700">Production & Finishing Rates</h3>
                  </div>
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <InputGroup label="BASE PRINTING RATE (PER 1K)">
                        <RateRow 
                          label={appConfig.labels.printingRatePerK} 
                          onLabelChange={(v) => setAppConfig(prev => ({ ...prev, labels: { ...prev.labels, printingRatePerK: v }}))}
                          value={appConfig.printingRatePerK} 
                          onChange={(v) => setAppConfig(prev => ({ ...prev, printingRatePerK: v }))} 
                          currency={appConfig.currency}
                        />
                      </InputGroup>
                      <InputGroup label="PLATE CHARGES (PER SET)">
                        <RateRow 
                          label={appConfig.labels.plateCharges} 
                          onLabelChange={(v) => setAppConfig(prev => ({ ...prev, labels: { ...prev.labels, plateCharges: v }}))}
                          value={appConfig.plateCharges} 
                          onChange={(v) => setAppConfig(prev => ({ ...prev, plateCharges: v }))} 
                          currency={appConfig.currency}
                        />
                      </InputGroup>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-4">Post-Press Rates</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                        <RateRow label={appConfig.labels.laminationGlossRate} onLabelChange={(v) => setAppConfig(prev => ({ ...prev, labels: { ...prev.labels, laminationGlossRate: v }}))} value={appConfig.laminationGlossRate} onChange={(v) => setAppConfig(prev => ({ ...prev, laminationGlossRate: v }))} currency={appConfig.currency} />
                        <RateRow label={appConfig.labels.laminationMattRate} onLabelChange={(v) => setAppConfig(prev => ({ ...prev, labels: { ...prev.labels, laminationMattRate: v }}))} value={appConfig.laminationMattRate} onChange={(v) => setAppConfig(prev => ({ ...prev, laminationMattRate: v }))} currency={appConfig.currency} />
                        <RateRow label={appConfig.labels.spotUVSetup} onLabelChange={(v) => setAppConfig(prev => ({ ...prev, labels: { ...prev.labels, spotUVSetup: v }}))} value={appConfig.spotUVSetup} onChange={(v) => setAppConfig(prev => ({ ...prev, spotUVSetup: v }))} currency={appConfig.currency} />
                        <RateRow label={appConfig.labels.spotUVRate} onLabelChange={(v) => setAppConfig(prev => ({ ...prev, labels: { ...prev.labels, spotUVRate: v }}))} value={appConfig.spotUVRate} onChange={(v) => setAppConfig(prev => ({ ...prev, spotUVRate: v }))} currency={appConfig.currency} />
                        <RateRow label={appConfig.labels.foilingSetup} onLabelChange={(v) => setAppConfig(prev => ({ ...prev, labels: { ...prev.labels, foilingSetup: v }}))} value={appConfig.foilingSetup} onChange={(v) => setAppConfig(prev => ({ ...prev, foilingSetup: v }))} currency={appConfig.currency} />
                        <RateRow label={appConfig.labels.foilingRate} onLabelChange={(v) => setAppConfig(prev => ({ ...prev, labels: { ...prev.labels, foilingRate: v }}))} value={appConfig.foilingRate} onChange={(v) => setAppConfig(prev => ({ ...prev, foilingRate: v }))} currency={appConfig.currency} />
                        <RateRow label={appConfig.labels.dieCuttingSetup} onLabelChange={(v) => setAppConfig(prev => ({ ...prev, labels: { ...prev.labels, dieCuttingSetup: v }}))} value={appConfig.dieCuttingSetup} onChange={(v) => setAppConfig(prev => ({ ...prev, dieCuttingSetup: v }))} currency={appConfig.currency} />
                        <RateRow label={appConfig.labels.dieCuttingRate} onLabelChange={(v) => setAppConfig(prev => ({ ...prev, labels: { ...prev.labels, dieCuttingRate: v }}))} value={appConfig.dieCuttingRate} onChange={(v) => setAppConfig(prev => ({ ...prev, dieCuttingRate: v }))} currency={appConfig.currency} />
                        <RateRow label={appConfig.labels.foldingRate} onLabelChange={(v) => setAppConfig(prev => ({ ...prev, labels: { ...prev.labels, foldingRate: v }}))} value={appConfig.foldingRate} onChange={(v) => setAppConfig(prev => ({ ...prev, foldingRate: v }))} currency={appConfig.currency} />
                        <RateRow label={appConfig.labels.coldFoilSetup} onLabelChange={(v) => setAppConfig(prev => ({ ...prev, labels: { ...prev.labels, coldFoilSetup: v }}))} value={appConfig.coldFoilSetup} onChange={(v) => setAppConfig(prev => ({ ...prev, coldFoilSetup: v }))} currency={appConfig.currency} />
                        <RateRow label={appConfig.labels.coldFoilRate} onLabelChange={(v) => setAppConfig(prev => ({ ...prev, labels: { ...prev.labels, coldFoilRate: v }}))} value={appConfig.coldFoilRate} onChange={(v) => setAppConfig(prev => ({ ...prev, coldFoilRate: v }))} currency={appConfig.currency} />
                        <RateRow label={appConfig.labels.embossSetup} onLabelChange={(v) => setAppConfig(prev => ({ ...prev, labels: { ...prev.labels, embossSetup: v }}))} value={appConfig.embossSetup} onChange={(v) => setAppConfig(prev => ({ ...prev, embossSetup: v }))} currency={appConfig.currency} />
                        <RateRow label={appConfig.labels.embossRate} onLabelChange={(v) => setAppConfig(prev => ({ ...prev, labels: { ...prev.labels, embossRate: v }}))} value={appConfig.embossRate} onChange={(v) => setAppConfig(prev => ({ ...prev, embossRate: v }))} currency={appConfig.currency} />
                        <RateRow label={appConfig.labels.debossSetup} onLabelChange={(v) => setAppConfig(prev => ({ ...prev, labels: { ...prev.labels, debossSetup: v }}))} value={appConfig.debossSetup} onChange={(v) => setAppConfig(prev => ({ ...prev, debossSetup: v }))} currency={appConfig.currency} />
                        <RateRow label={appConfig.labels.debossRate} onLabelChange={(v) => setAppConfig(prev => ({ ...prev, labels: { ...prev.labels, debossRate: v }}))} value={appConfig.debossRate} onChange={(v) => setAppConfig(prev => ({ ...prev, debossRate: v }))} currency={appConfig.currency} />
                        <RateRow label={appConfig.labels.perforationSetup} onLabelChange={(v) => setAppConfig(prev => ({ ...prev, labels: { ...prev.labels, perforationSetup: v }}))} value={appConfig.perforationSetup} onChange={(v) => setAppConfig(prev => ({ ...prev, perforationSetup: v }))} currency={appConfig.currency} />
                        <RateRow label={appConfig.labels.creasingSetup} onLabelChange={(v) => setAppConfig(prev => ({ ...prev, labels: { ...prev.labels, creasingSetup: v }}))} value={appConfig.creasingSetup} onChange={(v) => setAppConfig(prev => ({ ...prev, creasingSetup: v }))} currency={appConfig.currency} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Custom Additional Rates */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                    <Plus size={18} className="text-emerald-500" />
                      <h3 className="font-bold text-slate-700">Custom Additional Global Rates</h3>
                    </div>
                    <button 
                      onClick={() => {
                        const name = prompt('New Custom Field Name:');
                        if (name) {
                          setAppConfig(prev => ({
                            ...prev,
                            customRates: { ...prev.customRates, [name]: 0 }
                          }));
                        }
                      }}
                      className="text-emerald-600 font-bold text-xs flex items-center gap-1 hover:bg-emerald-50 px-2 py-1 rounded transition-all cursor-pointer"
                    >
                      <Plus size={14} /> Add Custom Field
                    </button>
                  </div>
                  <div className="grid gap-4">
                    {Object.entries(appConfig.customRates).map(([name, rate]) => (
                      <div key={name} className="flex items-center gap-4 group">
                        <input 
                          type="text"
                          value={name}
                          onChange={(e) => {
                            const newName = e.target.value;
                            if (newName && newName !== name) {
                              const newRates = { ...appConfig.customRates };
                              delete newRates[name];
                              newRates[newName] = rate;
                              setAppConfig(prev => ({ ...prev, customRates: newRates }));
                            }
                          }}
                          className="flex-1 text-sm font-medium text-slate-600 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-emerald-400 focus:outline-none transition-all"
                        />
                        <div className="relative w-32">
                          <span className="absolute left-3 top-2 text-slate-400 text-sm">{appConfig.currency}</span>
                          <input 
                            type="number"
                            value={rate}
                            onChange={(e) => {
                              const newRate = parseFloat(e.target.value) || 0;
                              setAppConfig(prev => ({
                                ...prev,
                                customRates: { ...prev.customRates, [name]: newRate }
                              }));
                            }}
                            className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:border-emerald-500 text-slate-700 font-mono"
                          />
                        </div>
                        <button 
                          onClick={() => {
                            const newRates = { ...appConfig.customRates };
                            delete newRates[name];
                            setAppConfig(prev => ({ ...prev, customRates: newRates }));
                          }}
                          className="opacity-0 group-hover:opacity-100 p-2 text-rose-400 hover:text-rose-600 transition-all cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    {Object.keys(appConfig.customRates).length === 0 && (
                      <div className="text-center py-4 border border-dashed border-slate-200 rounded-lg text-slate-400 text-xs italic">
                        No custom fields defined. These will be added as per-unit costs.
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button 
                    onClick={() => {
                       setView('estimator');
                    }}
                    className="px-6 py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-black transition-all cursor-pointer"
                  >
                    Return to Estimator
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}


// --- Sub-components ---

function MiniSidebarItem({ icon, active = false, onClick }: { icon: React.ReactNode, active?: boolean, onClick?: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={`
      p-2.5 rounded-xl cursor-pointer transition-all duration-200 flex items-center justify-center
      ${active ? 'text-indigo-400 bg-slate-800 shadow-inner' : 'text-slate-500 hover:text-white hover:bg-slate-800'}
    `}>
      {icon}
    </div>
  );
}

function ConfigInput({ value, onChange, currency }: { value: number, onChange: (v: number) => void, currency: string }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-2 text-slate-400 text-sm">{currency}</span>
      <input 
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm text-slate-700 focus:outline-none focus:border-indigo-500"
      />
    </div>
  );
}

function RateRow({ label, onLabelChange, value, onChange, currency }: { label: string, onLabelChange?: (v: string) => void, value: number, onChange: (v: number) => void, currency: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      {onLabelChange ? (
        <input 
          type="text"
          value={label}
          onChange={(e) => onLabelChange(e.target.value)}
          className="flex-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-transparent border-b border-transparent hover:border-slate-100 focus:outline-none focus:border-indigo-200 transition-all"
        />
      ) : (
        <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">{label}</span>
      )}
      <div className="w-24">
        <ConfigInput value={value} onChange={onChange} currency={currency} />
      </div>
    </div>
  );
}

function InputGroup({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <div className="space-y-1.5 flex-1">
      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</label>
      {children}
    </div>
  );
}

function FinishToggle({ label, name, checked, onChange, icon }: { label: string, name: string, checked: boolean, onChange: (e: any) => void, icon?: React.ReactNode }) {
  return (
    <div 
      className={`
        flex items-center justify-between p-2 rounded border transition-all cursor-pointer group
        ${checked ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-100 hover:bg-slate-100/50'}
      `} 
      onClick={() => onChange({ target: { name, type: 'checkbox', checked: !checked } })}
    >
      <div className="flex items-center gap-2">
        {icon && <span className={`${checked ? 'text-indigo-500' : 'text-slate-400 group-hover:text-slate-500'} transition-colors`}>{icon}</span>}
        <span className={`text-[10px] font-bold uppercase tracking-wider ${checked ? 'text-indigo-700' : 'text-slate-500'}`}>{label}</span>
      </div>
      <div className={`w-7 h-3.5 rounded-full relative transition-colors ${checked ? 'bg-indigo-500' : 'bg-slate-300'}`}>
        <div className={`absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full transition-all ${checked ? 'left-4' : 'left-0.5'}`} />
      </div>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | number }) {
  return (
    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
      <div className="flex items-center gap-1.5 text-slate-400 mb-1">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-sm font-mono font-bold text-slate-800">{value}</div>
    </div>
  );
}
