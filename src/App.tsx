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
  Plus,
  Pencil,
  Truck,
  Check,
  X,
  FileDown,
  History,
  Calendar,
  ChevronDown,
  ArrowRight,
  Briefcase,
  Maximize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Types ---

type ViewType = 'estimator' | 'history' | 'config';
type BindingType = 'none' | 'perfect' | 'saddle-stitch' | 'spiral';
type LaminationType = 'none' | 'gloss' | 'matt';
type ProjectType = 'flyer' | 'brochure' | 'packaging' | 'label' | 'rigid-box' | 'custom';

interface ProjectPreset {
  name: string;
  icon: React.ReactNode;
  data: Partial<PrintJobData>;
}

interface PaperRateDetails {
  price: number;
  per: number;
  width: number;
  height: number;
}

interface AppConfig {
  currency: string;
  paperRates: Record<string, PaperRateDetails>;
  presets: Record<string, Partial<PrintJobData>>;
  printingRatePerK: number;
  plateCharges: number;
  makeReady: number;
  doubleSideSurcharge: number;
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
  defaultPrintingCharges: number;
  defaultTaxRate: number;
  defaultMargin: number;
  defaultShipping: number;
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
    'Art Paper': { price: 150, per: 1, width: 23, height: 36 },
    'Art Card': { price: 210, per: 1, width: 23, height: 36 },
    'Woodfree': { price: 95, per: 1, width: 23, height: 36 },
    'Ivory Board': { price: 280, per: 1, width: 22, height: 28 },
    'Kraft Paper': { price: 75, per: 1, width: 23, height: 36 },
    'Grayboard 1.5mm': { price: 450, per: 1, width: 25, height: 36 },
    'Grayboard 2.0mm': { price: 580, per: 1, width: 25, height: 36 },
  },
  presets: {
    'flyer': {
      width: 8.27, height: 11.69, paperType: 'Art Paper', gsm: 130, colorsFront: 4, colorsBack: 4, sides: 2, lamination: 'none', dieCutting: false, folding: false
    },
    'brochure': {
      width: 11.69, height: 16.54, paperType: 'Art Card', gsm: 250, colorsFront: 4, colorsBack: 4, sides: 2, lamination: 'matt', folding: true, foldsCount: 2
    },
    'packaging': {
      width: 12, height: 18, depth: 3, paperType: 'Art Card', gsm: 350, colorsFront: 4, colorsBack: 0, sides: 1, dieCutting: true, lamination: 'gloss', creasing: true
    },
    'label': {
      width: 4, height: 4, paperType: 'Woodfree', gsm: 80, colorsFront: 4, colorsBack: 0, sides: 1, dieCutting: true, lamination: 'gloss'
    },
    'rigid-box': {
      width: 6, height: 8, depth: 2, paperType: 'Art Paper', gsm: 130, sides: 1, colorsFront: 4, colorsBack: 0, dieCutting: true, lamination: 'matt', spotUV: true,
      useGrayboard: true, grayboardType: 'Grayboard 1.5mm'
    },
  },
  printingRatePerK: 250,
  plateCharges: 500,
  makeReady: 1500,
  doubleSideSurcharge: 2000,
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
  defaultPrintingCharges: 0,
  defaultTaxRate: 0,
  defaultMargin: 20,
  defaultShipping: 1000,
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
  projectType: ProjectType;
  quantity: number;
  sides: number; 
  width: number;
  height: number;
  depth?: number;
  paperType: string;
  gsm: number;
  parentWidth: number;
  parentHeight: number;
  sheetsConsumed: number; // Manual override
  paperRate: number; 
  // Rigid Box specific
  useGrayboard: boolean;
  grayboardType: string;
  grayboardRate: number;
  grayboardParentWidth: number;
  grayboardParentHeight: number;
  colorsFront: number;
  colorsBack: number;
  plateCharges: number;
  makeReady: number;
  printingCharges: number;
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

// --- Constants ---

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
          presets: { ...DEFAULT_CONFIG.presets, ...(parsed.presets || {}) },
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

  // Local state for the config view
  const [localConfig, setLocalConfig] = useState<AppConfig>(appConfig);
  const [activeConfigTab, setActiveConfigTab] = useState<'system' | 'materials' | 'presets'>('system');

  // Sync localConfig when entering config view
  useEffect(() => {
    if (view === 'config') {
      setLocalConfig(appConfig);
    }
  }, [view, appConfig]);
  
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
    projectType: 'flyer',
    quantity: 1000,
    sides: 1,
    width: 8.5,
    height: 11,
    depth: 0,
    paperType: 'Art Paper',
    gsm: 130,
    parentWidth: 23,
    parentHeight: 36,
    sheetsConsumed: 0,
    paperRate: DEFAULT_CONFIG.paperRates['Art Paper'].price, 
    // Rigid Box specific
    useGrayboard: false,
    grayboardType: 'Grayboard 1.5mm',
    grayboardRate: DEFAULT_CONFIG.paperRates['Grayboard 1.5mm'].price,
    grayboardParentWidth: 25,
    grayboardParentHeight: 36,
    colorsFront: 4,
    colorsBack: 4,
    plateCharges: DEFAULT_CONFIG.plateCharges,
    makeReady: DEFAULT_CONFIG.makeReady,
    printingCharges: DEFAULT_CONFIG.defaultPrintingCharges,
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
    margin: DEFAULT_CONFIG.defaultMargin,
    taxRate: DEFAULT_CONFIG.defaultTaxRate,
    shipping: DEFAULT_CONFIG.defaultShipping,
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
    const selectedPaper = appConfig.paperRates[data.paperType];
    if (selectedPaper) {
      setData(prev => ({
        ...prev,
        paperRate: selectedPaper.price,
        parentWidth: selectedPaper.width,
        parentHeight: selectedPaper.height,
        plateCharges: appConfig.plateCharges,
        makeReady: appConfig.makeReady,
        printingCharges: appConfig.defaultPrintingCharges,
        taxRate: appConfig.defaultTaxRate,
        margin: appConfig.defaultMargin,
        shipping: appConfig.defaultShipping,
      }));
    }
  }, [appConfig]);

  const results = useMemo(() => {
    const { 
      width, height, parentWidth, parentHeight, quantity, sides,
      gsm, paperRate, sheetsConsumed, colorsFront, colorsBack, 
      plateCharges, makeReady, lamination, dieCutting, binding,
      spotUV, foiling, foilArea, folding, foldsCount,
      coldFoiling, coldFoilArea, embossing, embossArea,
      debossing, debossArea, perforation, creasing,
      margin, taxRate, shipping, paperType, printingCharges,
      useGrayboard, grayboardParentWidth, grayboardParentHeight, grayboardRate
    } = data;

    const selectedPaperConfig = appConfig.paperRates[paperType];
    const per = selectedPaperConfig?.per || 1;

    // Grayboard Calculation (if applicable)
    let grayboardCost = 0;
    let grayboardSheets = 0;
    if (useGrayboard) {
      const gOuts = calculateOuts(width, height, grayboardParentWidth, grayboardParentHeight);
      grayboardSheets = Math.ceil(quantity / gOuts);
      grayboardCost = (grayboardSheets / 1) * grayboardRate; // Assuming 1 per sheet price for grayboard
    }

    const calculatedOuts = calculateOuts(width, height, parentWidth, parentHeight);
    
    // For single/double sided, the physical sheet count stays the same (it shares the sheet)
    // If 'sides' refers to different content pages (e.g. a book), it multiplies paper.
    // But per user request "Single or Double", it implies sides of the same sheet.
    const baseSheets = sheetsConsumed > 0 ? sheetsConsumed : Math.ceil(quantity / calculatedOuts);
    
    const wastagePercentage = 0.05;
    const setupSheetsPerPlate = 25; 
    
    // Effective color passes for printing and wastage
    const totalColors = colorsFront + (sides === 2 ? colorsBack : 0);
    
    const wastageSheets = Math.max(setupSheetsPerPlate * totalColors, Math.ceil(baseSheets * wastagePercentage));
    const totalSheets = baseSheets + wastageSheets;

    const sheetAreaM2 = (parentWidth * 0.0254) * (parentHeight * 0.0254);
    const totalPaperWeight = (sheetAreaM2 * gsm * totalSheets) / 1000;
    
    // paperRate is price per 'per' units
    const paperCost = (totalSheets / per) * paperRate;

    const printingCost = (totalSheets / 1000) * totalColors * appConfig.printingRatePerK;
    const totalPrintingCost = printingCost + printingCharges;
    const plateCost = totalColors * plateCharges;

    let finishingCost = 0;
    if (sides === 2) {
      finishingCost += appConfig.doubleSideSurcharge;
    }

    if (lamination !== 'none') {
      const lamRate = lamination === 'gloss' ? appConfig.laminationGlossRate : appConfig.laminationMattRate; 
      // If double sided, maybe lamination is also on both sides? 
      // Traditional apps might assume one side unless specified. 
      // For now, let's keep it per sheet surface area.
      finishingCost += (width * height * quantity * sides * lamRate);
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

    const productionCost = (paperCost || 0) + (grayboardCost || 0) + (totalPrintingCost || 0) + (plateCost || 0) + (makeReady || 0) + (finishingCost || 0) + (shipping || 0) + (customRatesTotal || 0);
    const profitAmount = (productionCost * ((margin || 0) / 100));
    const subtotal = productionCost + profitAmount;
    const taxAmount = (subtotal * ((taxRate || 0) / 100));
    const totalCost = subtotal + taxAmount;
    const unitCost = quantity > 0 ? totalCost / quantity : 0;

    const safeTotalCost = isNaN(totalCost) ? 0 : totalCost;
    const safeUnitCost = isNaN(unitCost) ? 0 : unitCost;

    return {
      outs: isNaN(calculatedOuts) ? 1 : calculatedOuts,
      baseSheets: isNaN(baseSheets) ? 0 : baseSheets,
      wastageSheets: isNaN(wastageSheets) ? 0 : wastageSheets,
      totalSheets: isNaN(totalSheets) ? 0 : totalSheets,
      totalPaperWeight: isNaN(totalPaperWeight) ? 0 : totalPaperWeight,
      paperCost: isNaN(paperCost) ? 0 : paperCost,
      printingCost: isNaN(printingCost) ? 0 : printingCost,
      plateCost: isNaN(plateCost) ? 0 : plateCost,
      makeReady: isNaN(makeReady) ? 0 : makeReady,
      finishingCost: isNaN(finishingCost) ? 0 : finishingCost,
      customRatesTotal: isNaN(customRatesTotal) ? 0 : customRatesTotal,
      shipping: isNaN(shipping) ? 0 : shipping,
      productionCost: isNaN(productionCost) ? 0 : productionCost,
      profitAmount: isNaN(profitAmount) ? 0 : profitAmount,
      taxAmount: isNaN(taxAmount) ? 0 : taxAmount,
      totalCost: safeTotalCost,
      unitCost: safeUnitCost,
      grayboardCost: isNaN(grayboardCost) ? 0 : grayboardCost,
      grayboardSheets: isNaN(grayboardSheets) ? 0 : grayboardSheets,
      breakdown: [
        { label: 'Paper Stock', value: isNaN(paperCost) ? 0 : paperCost, color: 'bg-indigo-500' },
        ...(useGrayboard ? [{ label: 'Structural Board', value: isNaN(grayboardCost) ? 0 : grayboardCost, color: 'bg-slate-400' }] : []),
        { label: 'Printing & Plates', value: isNaN(totalPrintingCost + plateCost + makeReady) ? 0 : totalPrintingCost + plateCost + makeReady, color: 'bg-emerald-500' },
        { label: 'Finishing & Post-Press', value: isNaN(finishingCost + customRatesTotal) ? 0 : finishingCost + customRatesTotal, color: 'bg-amber-400' },
        { label: 'Logistics', value: isNaN(shipping) ? 0 : shipping, color: 'bg-slate-400' },
        { label: 'Commercial Margin', value: isNaN(profitAmount) ? 0 : profitAmount, color: 'bg-purple-500' },
        { label: 'Taxes/VAT', value: isNaN(taxAmount) ? 0 : taxAmount, color: 'bg-rose-400' },
      ]
    };
  }, [data, appConfig]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      setData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
      return;
    }
    
    const val = type === 'number' ? (value === '' ? 0 : parseFloat(value)) : value;
    const safeVal = (type === 'number' && isNaN(val as number)) ? 0 : val;

    if (name === 'projectType') {
      const preset = appConfig.presets[value];
      if (preset && value !== 'custom') {
        setData(prev => {
          const newData = {
            ...prev,
            projectType: value as ProjectType,
            ...preset,
          };
          
          // Special paper handling if paper type changes in preset
          if (preset.paperType) {
            const sPaper = appConfig.paperRates[preset.paperType];
            if (sPaper) {
              newData.paperRate = sPaper.price;
              newData.parentWidth = sPaper.width;
              newData.parentHeight = sPaper.height;
            }
          }

          // Handle Grayboard Preset
          if (preset.useGrayboard && preset.grayboardType) {
            const sBoard = appConfig.paperRates[preset.grayboardType];
            if (sBoard) {
              newData.grayboardRate = sBoard.price;
              newData.grayboardParentWidth = sBoard.width;
              newData.grayboardParentHeight = sBoard.height;
            }
          } else if (value !== 'rigid-box') {
            newData.useGrayboard = false;
          }
          return newData;
        });
      } else {
        setData(prev => ({ ...prev, projectType: value as ProjectType }));
      }
      return;
    }

    if (name === 'paperType') {
      const selectedPaper = appConfig.paperRates[value];
      if (selectedPaper) {
        setData(prev => ({ 
          ...prev, 
          paperType: value, 
          paperRate: selectedPaper.price,
          parentWidth: selectedPaper.width,
          parentHeight: selectedPaper.height
        }));
      } else {
        setData(prev => ({ ...prev, paperType: value }));
      }
      return;
    }

    if (name === 'grayboardType') {
      const selectedBoard = appConfig.paperRates[value];
      if (selectedBoard) {
        setData(prev => ({
          ...prev,
          grayboardType: value,
          grayboardRate: selectedBoard.price,
          grayboardParentWidth: selectedBoard.width,
          grayboardParentHeight: selectedBoard.height
        }));
      } else {
        setData(prev => ({ ...prev, grayboardType: value }));
      }
      return;
    }

    setData(prev => ({ ...prev, [name]: safeVal }));
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

  const generatePDF = (estimate: SavedEstimate) => {
    const doc = new jsPDF();
    const { data: estData, results: estResults, id, date } = estimate;
    const currency = appConfig.currency;

    // Header
    doc.setFontSize(22);
    doc.setTextColor(79, 70, 229); // Indigo-600
    doc.text('PRINT ESTIMATE', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`ID: ${id}`, 14, 30);
    doc.text(`Date: ${date}`, 14, 35);

    // Project Title
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.text(estData.jobName || 'UNTITLED PROJECT', 14, 48);

    // Summary Table
    const summaryData = [
      ['Specifications', 'Value'],
      ['Quantity', estData.quantity.toLocaleString()],
      ['Sides', estData.sides === 2 ? 'Double Sided' : 'Single Sided'],
      ['Dimensions', `${estData.width}" x ${estData.height}"`],
      ['Stock', `${estData.paperType} (${estData.gsm}gsm)`],
      ['Stock Sheet', `${estData.parentWidth}" x ${estData.parentHeight}"`],
      ['Sheets Used', `${estResults.totalSheets} (Outs: ${estResults.outs})`],
      ['Colors', `${estData.colorsFront} + ${estData.sides === 2 ? estData.colorsBack : 0}`]
    ];

    autoTable(doc, {
      startY: 55,
      head: [summaryData[0]],
      body: summaryData.slice(1),
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] }
    });

    // Cost Breakdown
    const costData = [
      ['Category', 'Amount'],
      ...estResults.breakdown.map((item: any) => [item.label, `${currency} ${Math.round(item.value).toLocaleString()}`]),
      [{ content: 'TOTAL ESTIMATE', styles: { fontStyle: 'bold' } }, { content: `${currency} ${Math.round(estResults.totalCost).toLocaleString()}`, styles: { fontStyle: 'bold' } }]
    ];

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [costData[0]],
      body: costData.slice(1),
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59] }
    });

    // Unit Cost
    doc.setFontSize(12);
    doc.setTextColor(16, 185, 129); // Emerald-500
    doc.text(`Unit Cost: ${currency} ${estResults.unitCost.toFixed(4)}`, 14, (doc as any).lastAutoTable.finalY + 15);

    // Open PDF in new tab for preview
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col md:flex-row overflow-hidden selection:bg-indigo-100">
      {/* --- Left Mini-Navigation (Desktop) --- */}
      <aside className="hidden md:flex w-16 bg-slate-900 flex-col items-center py-6 gap-8 border-r border-slate-800 flex-shrink-0">
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

      {/* --- Bottom Navigation (Mobile) --- */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 flex justify-around items-center py-3 px-6 z-50">
        <button onClick={() => setView('estimator')} className={`flex flex-col items-center gap-1 ${view === 'estimator' ? 'text-indigo-400' : 'text-slate-500'}`}>
          <Calculator size={20} />
          <span className="text-[10px] font-bold uppercase tracking-widest">Calc</span>
        </button>
        <button onClick={() => setView('history')} className={`flex flex-col items-center gap-1 ${view === 'history' ? 'text-indigo-400' : 'text-slate-500'}`}>
          <FileText size={20} />
          <span className="text-[10px] font-bold uppercase tracking-widest">History</span>
        </button>
        <button onClick={() => setView('config')} className={`flex flex-col items-center gap-1 ${view === 'config' ? 'text-indigo-400' : 'text-slate-500'}`}>
          <Settings size={20} />
          <span className="text-[10px] font-bold uppercase tracking-widest">Setup</span>
        </button>
      </nav>

      {/* --- Main Content Body --- */}
      <main className="flex-1 flex flex-col overflow-hidden pb-16 md:pb-0">
        {/* Top Header Bar */}
        <header className="h-14 md:h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 flex-shrink-0 z-30 shadow-sm relative">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <h1 className="text-sm md:text-lg font-bold text-slate-900 leading-none">
                {view === 'estimator' && 'Project Estimator'}
                {view === 'history' && 'Estimate History'}
                {view === 'config' && 'Master Settings'}
              </h1>
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter mt-1 hidden md:block">
                {view === 'estimator' && 'Professional Print Costing Engine'}
                {view === 'history' && 'Review saved calculations'}
                {view === 'config' && 'System rates & localization'}
              </span>
            </div>
          </div>
          <div className="flex gap-2 md:gap-3">
            {view === 'estimator' && (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setData({
                    jobName: '',
                    quantity: 1000,
                    sides: 1,
                    width: 8.5,
                    height: 11,
                    paperType: 'Art Paper',
                    gsm: 130,
                    parentWidth: 23,
                    parentHeight: 36,
                    sheetsConsumed: 0,
                    paperRate: appConfig.paperRates['Art Paper']?.price || 150,
                    colorsFront: 4,
                    colorsBack: 4,
                    plateCharges: appConfig.plateCharges,
                    makeReady: appConfig.makeReady,
                    printingCharges: appConfig.defaultPrintingCharges,
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
                    margin: appConfig.defaultMargin,
                    taxRate: appConfig.defaultTaxRate,
                    shipping: appConfig.defaultShipping,
                  })}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
                >
                  Clear Form
                </button>
                <div className="h-4 w-px bg-slate-200 mx-1"></div>
                <button 
                  onClick={handleSaveEstimate}
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-md shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2"
                >
                  <Save size={14} /> Save
                </button>
              </div>
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
                className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden"
              >
                {/* Forms Grid Area */}
                <section className="flex-none md:flex-1 p-3 md:p-6 grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 md:overflow-y-auto text-slate-800 scroll-smooth items-start">
                {/* Job Details Card */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-6 shadow-sm space-y-6">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                       <div className="w-1 h-5 bg-indigo-500 rounded-full"></div>
                       <h2 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">Section 1: Project Blueprint</h2>
                    </div>
                    <div className="flex gap-2">
                      {(['flyer', 'packaging', 'rigid-box'] as ProjectType[]).map(type => (
                        <button 
                          key={type}
                          onClick={() => handleChange({ target: { name: 'projectType', value: type, type: 'select' } } as any)}
                          className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-tighter transition-all ${data.projectType === type ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                        >
                          {type.replace('-', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <InputGroup label="PROJECT TYPE">
                        <div className="relative">
                          <Briefcase size={14} className="absolute left-3 top-3 text-slate-400 pointer-events-none" />
                          <select 
                            name="projectType"
                            value={data.projectType || 'flyer'}
                            onChange={handleChange}
                            className="w-full pl-9 pr-3 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold appearance-none text-indigo-600"
                          >
                            <option value="flyer">Flyer / Leaflet / Brochure</option>
                            <option value="packaging">Packaging / Box (Standard)</option>
                            <option value="label">Label / Sticker</option>
                            <option value="rigid-box">Rigid Box (Grayboard)</option>
                            <option value="custom">Manual Custom Project</option>
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
                        </div>
                      </InputGroup>
                      <InputGroup label="NAME / REF #">
                        <div className="relative group">
                          <Pencil size={12} className="absolute left-3 top-3 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                          <input 
                            type="text" 
                            name="jobName"
                            value={data.jobName || ''}
                            onChange={handleChange}
                            className="w-full pl-9 pr-3 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                            placeholder="Enter project name..."
                          />
                        </div>
                      </InputGroup>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="col-span-2 sm:col-span-1">
                        <InputGroup label="ORDER QTY">
                          <input 
                            type="number" 
                            name="quantity"
                            value={data.quantity ?? 0}
                            onChange={handleChange}
                            className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono font-bold"
                          />
                        </InputGroup>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <InputGroup label="PRINT SIDES">
                          <select 
                            name="sides"
                            value={data.sides}
                            onChange={handleChange}
                            className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                          >
                            <option value={1}>Single (4/0)</option>
                            <option value={2}>Double (4/4)</option>
                          </select>
                        </InputGroup>
                      </div>
                      <div className={`col-span-2 ${data.projectType === 'packaging' || data.projectType === 'rigid-box' ? 'sm:col-span-2' : 'sm:col-span-2'}`}>
                        <InputGroup label={data.projectType === 'packaging' || data.projectType === 'rigid-box' ? "DIMENSIONS (W x H x D)" : "FLAT SIZE (W x H)"}>
                          <div className="flex items-center bg-slate-50/50 border border-slate-200 rounded-xl px-2 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
                            <input 
                              type="number" 
                              name="width"
                              value={data.width ?? 0}
                              onChange={handleChange}
                              className="w-full py-2 bg-transparent text-sm focus:outline-none transition-all text-center font-mono"
                              placeholder="W"
                            />
                            <span className="text-slate-300 font-light px-1">×</span>
                            <input 
                              type="number" 
                              name="height"
                              value={data.height ?? 0}
                              onChange={handleChange}
                              className="w-full py-2 bg-transparent text-sm focus:outline-none transition-all text-center font-mono"
                              placeholder="H"
                            />
                            {(data.projectType === 'packaging' || data.projectType === 'rigid-box') && (
                              <>
                                <span className="text-slate-300 font-light px-1">×</span>
                                <input 
                                  type="number" 
                                  name="depth"
                                  value={data.depth ?? 0}
                                  onChange={handleChange}
                                  className="w-full py-2 bg-transparent text-sm focus:outline-none transition-all text-center font-mono text-indigo-600 font-bold"
                                  placeholder="D"
                                />
                              </>
                            )}
                          </div>
                        </InputGroup>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Paper Specs Card */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-6 shadow-sm space-y-5">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                       <div className="w-1 h-5 bg-emerald-500 rounded-full"></div>
                       <h2 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">Section 2: Material & Stock</h2>
                    </div>
                    {data.projectType === 'rigid-box' && (
                       <span className="bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-indigo-100 flex items-center gap-1.5 animate-pulse">
                         <Layers size={10} />
                         Dual Stock Config
                       </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-8">
                    {/* Liner / Wrap Paper Section */}
                    <div className="space-y-4">
                      {data.projectType === 'rigid-box' && (
                        <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-l-2 border-slate-200 pl-2">01. Liner / Cover Stock (Printed Wrap)</h4>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <InputGroup label="STOCK TYPE">
                          <div className="relative">
                            <Printer size={14} className="absolute left-3 top-3 text-slate-400 pointer-events-none" />
                            <select 
                              name="paperType"
                              value={data.paperType}
                              onChange={handleChange}
                              className="w-full pl-9 pr-3 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium appearance-none"
                            >
                              {Object.keys(appConfig.paperRates).filter(k => !k.includes('Grayboard')).map(type => (
                                <option key={type} value={type}>{type}</option>
                              ))}
                            </select>
                            <ChevronRight size={14} className="absolute right-3 top-3.5 text-slate-400 rotate-90 pointer-events-none" />
                          </div>
                        </InputGroup>
                        <InputGroup label="GRAMMAGE (GSM)">
                          <div className="relative">
                             <Weight size={14} className="absolute left-3 top-3 text-slate-400" />
                             <input 
                              type="number" 
                              name="gsm"
                              value={data.gsm}
                              onChange={handleChange}
                              className="w-full pl-9 pr-3 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                            />
                          </div>
                        </InputGroup>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <InputGroup label="PARENT SHEET (WxH)">
                          <div className="flex items-center bg-slate-50/50 border border-slate-200 rounded-xl px-2 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
                            <input 
                              type="number" 
                              name="parentWidth"
                              value={data.parentWidth}
                              onChange={handleChange}
                              className="w-full py-2 bg-transparent text-sm focus:outline-none transition-all text-center font-mono"
                            />
                            <span className="text-slate-300 font-light px-1">×</span>
                            <input 
                              type="number" 
                              name="parentHeight"
                              value={data.parentHeight}
                              onChange={handleChange}
                              className="w-full py-2 bg-transparent text-sm focus:outline-none transition-all text-center font-mono"
                            />
                          </div>
                        </InputGroup>
                        <InputGroup label="QUOTED PAPER RATE">
                          <div className="relative">
                            <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs uppercase">{appConfig.currency}</span>
                            <input 
                              type="number" 
                              name="paperRate"
                              value={data.paperRate}
                              onChange={handleChange}
                              className="w-full pl-10 pr-3 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono font-bold"
                            />
                            <span className="absolute right-3 top-2.5 text-[10px] text-slate-400 font-bold uppercase">/ {appConfig.paperRates[data.paperType]?.per || 1}</span>
                          </div>
                        </InputGroup>
                      </div>
                    </div>

                    {/* Structural Grayboard Section */}
                    {(data.projectType === 'rigid-box' || data.useGrayboard) && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-4 pt-6 border-t border-slate-100"
                      >
                        <h4 className="text-[9px] font-black text-indigo-400 uppercase tracking-widest border-l-2 border-indigo-200 pl-2">02. Structural Grayboard (Inner Core)</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <InputGroup label="BOARD THICKNESS / TYPE">
                            <div className="relative">
                              <Layers size={14} className="absolute left-3 top-3 text-slate-400 pointer-events-none" />
                              <select 
                                name="grayboardType"
                                value={data.grayboardType}
                                onChange={handleChange}
                                className="w-full pl-9 pr-3 py-2.5 bg-indigo-50/30 border border-indigo-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all font-bold appearance-none text-indigo-700"
                              >
                                {Object.keys(appConfig.paperRates).filter(k => k.includes('Grayboard')).map(type => (
                                  <option key={type} value={type}>{type}</option>
                                ))}
                              </select>
                              <ChevronRight size={14} className="absolute right-3 top-3.5 text-slate-400 rotate-90 pointer-events-none" />
                            </div>
                          </InputGroup>
                          <InputGroup label="BOARD RATE">
                            <div className="relative">
                              <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs uppercase">{appConfig.currency}</span>
                              <input 
                                type="number" 
                                name="grayboardRate"
                                value={data.grayboardRate}
                                onChange={handleChange}
                                className="w-full pl-10 pr-3 py-2.5 bg-indigo-50/30 border border-indigo-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all font-mono font-bold text-indigo-700"
                              />
                            </div>
                          </InputGroup>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           <InputGroup label="BOARD PARENT SIZE">
                             <div className="flex items-center bg-slate-50/50 border border-slate-200 rounded-xl px-2 overflow-hidden">
                               <input 
                                 type="number" 
                                 name="grayboardParentWidth"
                                 value={data.grayboardParentWidth}
                                 onChange={handleChange}
                                 className="w-full py-2 bg-transparent text-sm text-center font-mono"
                               />
                               <span className="text-slate-300 font-light px-1">×</span>
                               <input 
                                 type="number" 
                                 name="grayboardParentHeight"
                                 value={data.grayboardParentHeight}
                                 onChange={handleChange}
                                 className="w-full py-2 bg-transparent text-sm text-center font-mono"
                               />
                             </div>
                           </InputGroup>
                           <div className="flex items-center justify-center bg-indigo-50/30 rounded-xl border border-indigo-50 border-dashed p-2">
                             <p className="text-[10px] text-slate-400 font-medium italic text-center">Calculates sheets based on box net size</p>
                           </div>
                        </div>
                      </motion.div>
                    )}
                    
                    <InputGroup label="MANUAL LINER SHEET OVERRIDE (LEAVE 0 FOR AUTO)">
                      <div className="relative group">
                        <Layout size={14} className="absolute left-3 top-3 text-slate-400" />
                        <input 
                          type="number" 
                          name="sheetsConsumed"
                          value={data.sheetsConsumed || ''}
                          onChange={handleChange}
                          placeholder="System will calculate based on outs..."
                          className="w-full pl-9 pr-3 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-indigo-600 font-medium italic"
                        />
                      </div>
                    </InputGroup>
                  </div>
                </div>

                {/* Press Specs Card */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-6 shadow-sm space-y-5">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1 h-5 bg-amber-500 rounded-full"></div>
                    <h2 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">Section 3: Printing Setup</h2>
                  </div>
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <InputGroup label="COLOR PASSES (F / B)">
                        <div className="flex items-center bg-slate-50/50 border border-slate-200 rounded-xl px-2 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
                          <input 
                            type="number" 
                            name="colorsFront"
                            value={data.colorsFront}
                            onChange={handleChange}
                            className="w-full py-2 bg-transparent text-sm focus:outline-none transition-all text-center font-mono font-bold"
                          />
                          <span className="text-slate-300 font-light px-1">/</span>
                          <input 
                            type="number" 
                            name="colorsBack"
                            value={data.colorsBack}
                            disabled={data.sides === 1}
                            onChange={handleChange}
                            className={`w-full py-2 bg-transparent text-sm focus:outline-none transition-all text-center font-mono font-bold ${data.sides === 1 ? 'opacity-20 cursor-not-allowed' : ''}`}
                          />
                        </div>
                      </InputGroup>
                      <InputGroup label="PLATE CHARGES">
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs uppercase">{appConfig.currency}</span>
                          <input 
                            type="number" 
                            name="plateCharges"
                            value={data.plateCharges}
                            onChange={handleChange}
                            className="w-full pl-10 pr-3 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono font-bold"
                          />
                        </div>
                      </InputGroup>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <InputGroup label="MACHINE MAKE-READY (SETUP COST)">
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs uppercase">{appConfig.currency}</span>
                          <input 
                            type="number" 
                            name="makeReady"
                            value={data.makeReady}
                            onChange={handleChange}
                            className="w-full pl-10 pr-3 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono font-bold"
                          />
                        </div>
                      </InputGroup>
                      <InputGroup label="EXTRA PRINTING CHARGES">
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs uppercase">{appConfig.currency}</span>
                          <input 
                            type="number" 
                            name="printingCharges"
                            value={data.printingCharges}
                            onChange={handleChange}
                            className="w-full pl-10 pr-3 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono font-bold"
                          />
                        </div>
                      </InputGroup>
                    </div>
                  </div>
                </div>

                {/* Special Finishes Card */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-6 shadow-sm space-y-5">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1 h-5 bg-rose-500 rounded-full"></div>
                    <h2 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">Section 4: Premium Applied Finishes</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                    <div className="space-y-3">
                      <FinishToggle 
                        label="Spot UV Coating" 
                        name="spotUV" 
                        checked={data.spotUV} 
                        onChange={handleChange} 
                        icon={<Percent size={14} />} 
                      />
                      <FinishToggle 
                        label="Hot Foil Stamping" 
                        name="foiling" 
                        checked={data.foiling} 
                        onChange={handleChange} 
                        icon={<Zap size={14} />} 
                      />
                      <AnimatePresence>
                        {data.foiling && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                            <InputGroup label="FOIL AREA (SQ INCHES)">
                              <input type="number" name="foilArea" value={data.foilArea ?? 0} onChange={handleChange} className="w-full px-3 py-2 bg-rose-50/30 border border-rose-100 rounded-xl text-xs font-mono" />
                            </InputGroup>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <FinishToggle 
                        label="Cold Foil Applied" 
                        name="coldFoiling" 
                        checked={data.coldFoiling} 
                        onChange={handleChange} 
                        icon={<Zap size={14} className="text-blue-400" />} 
                      />
                      <AnimatePresence>
                        {data.coldFoiling && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                            <InputGroup label="COLD FOIL AREA (SQ IN)">
                              <input type="number" name="coldFoilArea" value={data.coldFoilArea ?? 0} onChange={handleChange} className="w-full px-3 py-2 bg-blue-50/30 border border-blue-100 rounded-xl text-xs font-mono" />
                            </InputGroup>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="space-y-3">
                      <FinishToggle 
                        label="Blind Embossing" 
                        name="embossing" 
                        checked={data.embossing} 
                        onChange={handleChange} 
                        icon={<Layers size={14} />} 
                      />
                      <AnimatePresence>
                        {data.embossing && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                            <InputGroup label="EMBOSS AREA (SQ IN)">
                              <input type="number" name="embossArea" value={data.embossArea ?? 0} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono" />
                            </InputGroup>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <FinishToggle 
                        label="Debossing Effect" 
                        name="debossing" 
                        checked={data.debossing} 
                        onChange={handleChange} 
                        icon={<Layers size={14} className="rotate-180" />} 
                      />
                      <AnimatePresence>
                        {data.debossing && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                            <InputGroup label="DEBOSS AREA (SQ IN)">
                              <input type="number" name="debossArea" value={data.debossArea ?? 0} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono" />
                            </InputGroup>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <FinishToggle label="Perforation" name="perforation" checked={data.perforation} onChange={handleChange} />
                      <FinishToggle label="Creasing" name="creasing" checked={data.creasing} onChange={handleChange} />
                    </div>
                  </div>
                </div>

                {/* Post-Press & Logistics Card */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-6 shadow-sm space-y-5">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1 h-5 bg-purple-500 rounded-full"></div>
                    <h2 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">Section 5: Post-Press & Logistics</h2>
                  </div>
                  <div className="grid grid-cols-1 gap-x-6 gap-y-5">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                         <FinishToggle label="Die-Cutting" name="dieCutting" checked={data.dieCutting} onChange={handleChange} />
                         <FinishToggle label="Folding" name="folding" checked={data.folding} onChange={handleChange} />
                      </div>
                      <AnimatePresence>
                        {data.folding && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                            <InputGroup label="NUMBER OF FOLDS">
                              <input type="number" name="foldsCount" value={data.foldsCount ?? 0} onChange={handleChange} className="w-full px-3 py-2 bg-purple-50/30 border border-purple-100 rounded-xl text-sm font-mono font-bold" />
                            </InputGroup>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <InputGroup label="LAMINATION SURFACE">
                        <select name="lamination" value={data.lamination} onChange={handleChange} className="w-full px-3 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-medium appearance-none">
                          <option value="none">No Lamination</option>
                          <option value="gloss">Gloss (Shiny)</option>
                          <option value="matt">Matt (Dull)</option>
                        </select>
                      </InputGroup>
                      <InputGroup label="BINDING METHOD">
                        <select name="binding" value={data.binding} onChange={handleChange} className="w-full px-3 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-medium appearance-none">
                          <option value="none">No Binding</option>
                          <option value="perfect">Perfect (Hot Glue)</option>
                          <option value="saddle-stitch">Saddle (Center Stitch)</option>
                          <option value="spiral">Spiral / Wire-O</option>
                        </select>
                      </InputGroup>
                    </div>
                  </div>
                </div>

                {/* Commercial & Logistics Card */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-6 shadow-sm space-y-6">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1 h-5 bg-pink-500 rounded-full"></div>
                    <h2 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">Section 6: Commercial & Logistics</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-5">
                      <InputGroup label="SHIPPING / DELIVERY COST">
                        <div className="relative">
                          <Truck size={14} className="absolute left-3 top-3 text-slate-400" />
                          <input 
                            type="number" 
                            name="shipping" 
                            value={data.shipping ?? 0} 
                            onChange={handleChange} 
                            className="w-full pl-9 pr-3 py-2.5 bg-indigo-50/30 border border-indigo-100 rounded-xl text-sm font-mono font-bold text-indigo-700" 
                          />
                        </div>
                      </InputGroup>

                      <InputGroup label="TAX / VAT PERCENTAGE">
                        <div className="relative">
                          <span className="absolute right-3 top-2.5 text-slate-400 font-bold text-sm">%</span>
                          <input 
                            type="number" 
                            name="taxRate"
                            value={data.taxRate ?? 0}
                            onChange={handleChange}
                            className="w-full px-3 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono font-bold"
                          />
                        </div>
                      </InputGroup>
                    </div>

                    <div className="space-y-5">
                      <div className="p-4 bg-slate-50/50 border border-slate-200 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between">
                           <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Profit Margin</span>
                           <span className="text-sm font-black text-indigo-600">{data.margin}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          value={data.margin ?? 20}
                          onChange={(e) => setData(prev => ({ ...prev, margin: parseInt(e.target.value) }))}
                          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                      </div>

                      {Object.entries(appConfig.customRates).length > 0 && (
                        <div className="space-y-3">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Global Custom Rates</span>
                          <div className="grid grid-cols-1 gap-2">
                            {Object.entries(appConfig.customRates).map(([name, rate]) => (
                              <div key={name} className="flex items-center justify-between p-2.5 bg-slate-50/50 rounded-xl border border-slate-100">
                                <span className="text-[11px] font-bold text-slate-600">{name}</span>
                                <span className="text-[11px] font-mono font-bold text-indigo-600">{appConfig.currency} {rate.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>

                {/* Sidebar Summary */}
                <aside className="w-full md:w-[360px] bg-white border-t md:border-t-0 md:border-l border-slate-200 flex flex-col flex-shrink-0 h-auto md:h-full md:sticky top-0 z-20">
                  <div className="p-5 md:p-8 flex flex-col h-full overflow-y-auto">
                    <div className="flex-shrink-0 mb-6">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded">Commercial Estimate</h3>
                        <div className="flex items-center gap-1.5 text-indigo-600">
                          <Calculator size={14} />
                          <span className="text-[10px] font-bold">LIVE CALC</span>
                        </div>
                      </div>
                      <div className="relative">
                        <div className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter tabular-nums mb-1">
                          <span className="text-lg md:text-xl font-bold text-slate-300 mr-1">{appConfig.currency}</span>{Math.floor(results.totalCost).toLocaleString()}
                          <span className="text-lg md:text-xl font-bold text-slate-300">.{(results.totalCost % 1).toFixed(2).split('.')[1]}</span>
                        </div>
                        <p className="text-sm text-emerald-600 font-bold flex items-center gap-1.5">
                          <Zap size={14} fill="currentColor" />
                          Unit Price: {appConfig.currency} {results.unitCost.toFixed(4)}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="grid grid-cols-3 gap-2 py-4 border-y border-slate-100">
                        <div className="text-center">
                          <div className="text-[9px] text-slate-400 font-black uppercase mb-1">Stock Sz</div>
                          <div className="text-xs font-bold text-slate-700 font-mono tracking-tight">{data.parentWidth}×{data.parentHeight}</div>
                        </div>
                        <div className="text-center border-x border-slate-100">
                          <div className="text-[9px] text-slate-400 font-black uppercase mb-1">Sheets</div>
                          <div className="text-xs font-bold text-slate-700 font-mono tracking-tight">{results.totalSheets}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-[9px] text-slate-400 font-black uppercase mb-1">Outs</div>
                          <div className="text-xs font-bold text-slate-700 font-mono tracking-tight">{results.outs}</div>
                        </div>
                      </div>

                      <div className="space-y-5">
                        <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Cost Allocation</h4>
                        {results.breakdown.map((item, idx) => (
                          <div key={idx} className="group cursor-default">
                            <div className="flex justify-between text-[11px] items-end mb-1.5">
                              <span className="text-slate-500 font-bold group-hover:text-indigo-600 transition-colors">{item.label}</span>
                              <span className="font-mono font-bold text-slate-800 tracking-tighter">{appConfig.currency} {Math.round(item.value).toLocaleString()}</span>
                            </div>
                            <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden border border-slate-100/50">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.max(2, (item.value / results.totalCost) * 100)}%` }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                                className={`${item.color} h-full rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]`}
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="pt-6 mt-6 border-t border-slate-100 space-y-5 flex-1">
                        <div className="p-3 bg-rose-50/50 rounded-2xl border border-rose-100/50">
                          <div className="text-[9px] font-black text-rose-400 uppercase mb-1">Tax Amount</div>
                          <div className="text-sm font-black text-rose-700 font-mono tabular-nums">
                            {appConfig.currency} {Math.round(results.taxAmount).toLocaleString()}
                          </div>
                        </div>

                        <div className="space-y-4 pt-2">
                           <div className="p-4 bg-slate-900 rounded-2xl text-white shadow-xl shadow-slate-200">
                             <div className="flex items-center justify-between mb-4">
                                <div className="p-2 bg-slate-800 rounded-lg">
                                  <Download className="text-indigo-400" size={16} />
                                </div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Export Options</span>
                             </div>
                             <button 
                                onClick={handleSaveEstimate}
                                className="w-full py-3 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] mb-3"
                              >
                                <Save size={16} />
                                <span>Finalize Estimate</span>
                              </button>
                           </div>
                        </div>
                      </div>
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
              className="flex-1 p-4 md:p-8 overflow-y-auto"
            >
              <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Project History</h2>
                    <p className="text-sm text-slate-500 font-medium italic">Track and manage your past estimations.</p>
                  </div>
                  <div className="flex items-center gap-4 bg-white p-2 px-4 rounded-2xl border border-slate-100 shadow-sm">
                     <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Active Records</span>
                     <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">{savedEstimates.length}</span>
                  </div>
                </div>

                {savedEstimates.length === 0 ? (
                  <div className="text-center py-32 bg-white rounded-3xl border border-slate-100 border-dashed">
                    <History size={48} className="mx-auto text-slate-200 mb-4" />
                    <h3 className="text-lg font-bold text-slate-800">No project history found</h3>
                    <p className="text-slate-400 text-sm max-w-xs mx-auto mt-2 mb-8">Start by creating your first estimate in the project editor.</p>
                    <button 
                      onClick={() => setView('estimator')}
                      className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all"
                    >
                      New Calculation
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {savedEstimates.map((est) => (
                      <HistoryCard 
                        key={est.id} 
                        estimate={est} 
                        onEdit={() => loadEstimate(est)}
                        onDelete={() => handleDeleteEstimate(est.id)}
                        onPDF={() => generatePDF(est)}
                        currency={appConfig.currency}
                      />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {view === 'config' && (
            <motion.div 
              key="config"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex-1 p-4 md:p-8 overflow-y-auto"
            >
              <div className="max-w-6xl mx-auto space-y-8 pb-32">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200">
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Master Cost Setup</h2>
                    <p className="text-sm text-slate-500 font-medium italic">Configure unit rates, system defaults and project presets.</p>
                  </div>
                  
                  <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-slate-100 shadow-sm self-start">
                    {(['system', 'materials', 'presets'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveConfigTab(tab)}
                        className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeConfigTab === tab ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                     <button 
                       onClick={() => setLocalConfig(appConfig)}
                       className="px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
                     >
                       Reset
                     </button>
                     <button 
                       onClick={() => {
                         setAppConfig(localConfig);
                         alert('Settings saved successfully');
                       }}
                       className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2"
                     >
                       <Save size={14} /> Save Configuration
                     </button>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {activeConfigTab === 'system' && (
                    <motion.div 
                      key="system"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-8"
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm">
                          <div className="flex items-center gap-3 mb-8">
                             <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shadow-sm">
                               <Printer size={20} />
                             </div>
                             <div>
                               <h3 className="font-bold text-slate-800 text-lg">Printing & Operational</h3>
                               <p className="text-xs text-slate-400 font-medium italic">Base rates for core production steps.</p>
                             </div>
                          </div>
                          
                          <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                               <InputGroup label="BASE PRINT RATE (PER 1K)">
                                 <ConfigInput value={localConfig.printingRatePerK} onChange={(v) => setLocalConfig(prev => ({ ...prev, printingRatePerK: v }))} currency={localConfig.currency} />
                               </InputGroup>
                               <InputGroup label="PLATE CHARGES (PER SET)">
                                 <ConfigInput value={localConfig.plateCharges} onChange={(v) => setLocalConfig(prev => ({ ...prev, plateCharges: v }))} currency={localConfig.currency} />
                               </InputGroup>
                               <InputGroup label="MACHINE MAKE-READY">
                                 <ConfigInput value={localConfig.makeReady} onChange={(v) => setLocalConfig(prev => ({ ...prev, makeReady: v }))} currency={localConfig.currency} />
                               </InputGroup>
                               <InputGroup label="DOUBLE SIDE SURCHARGE">
                                 <ConfigInput value={localConfig.doubleSideSurcharge} onChange={(v) => setLocalConfig(prev => ({ ...prev, doubleSideSurcharge: v }))} currency={localConfig.currency} />
                               </InputGroup>
                               <InputGroup label="DEFAULT PRINTING SETUP FEE">
                                 <ConfigInput value={localConfig.defaultPrintingCharges} onChange={(v) => setLocalConfig(prev => ({ ...prev, defaultPrintingCharges: v }))} currency={localConfig.currency} />
                               </InputGroup>
                            </div>
                            
                            <div className="pt-6 border-t border-slate-50 space-y-4">
                              <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none">Regional Defaults</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InputGroup label="BASE CURRENCY">
                                  <input 
                                    type="text"
                                    value={localConfig.currency}
                                    onChange={(e) => setLocalConfig(prev => ({ ...prev, currency: e.target.value }))}
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 font-bold transition-all"
                                  />
                                </InputGroup>
                                <InputGroup label="DEFAULT TAX %">
                                  <div className="relative group/input">
                                    <span className="absolute left-3 top-2.5 text-slate-300 font-black text-[10px] group-focus-within/input:text-indigo-400 transition-colors uppercase tabular-nums">%</span>
                                    <input 
                                      type="number"
                                      value={localConfig.defaultTaxRate}
                                      onChange={(e) => setLocalConfig(prev => ({ ...prev, defaultTaxRate: parseFloat(e.target.value) || 0 }))}
                                      className="w-full pl-10 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 font-mono font-bold transition-all"
                                    />
                                  </div>
                                </InputGroup>
                                <InputGroup label="DEFAULT MARGIN %">
                                  <div className="relative group/input">
                                    <span className="absolute left-3 top-2.5 text-slate-300 font-black text-[10px] group-focus-within/input:text-indigo-400 transition-colors uppercase tabular-nums">%</span>
                                    <input 
                                      type="number"
                                      value={localConfig.defaultMargin}
                                      onChange={(e) => setLocalConfig(prev => ({ ...prev, defaultMargin: parseFloat(e.target.value) || 0 }))}
                                      className="w-full pl-10 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 font-mono font-bold transition-all"
                                    />
                                  </div>
                                </InputGroup>
                                <InputGroup label="DEFAULT LOGISTICS">
                                   <ConfigInput value={localConfig.defaultShipping} onChange={(v) => setLocalConfig(prev => ({ ...prev, defaultShipping: v }))} currency={localConfig.currency} />
                                </InputGroup>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm">
                           <div className="flex items-center gap-3 mb-8">
                             <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl shadow-sm">
                               <Zap size={20} />
                             </div>
                             <div>
                               <h3 className="font-bold text-slate-800 text-lg">Finishing Units</h3>
                               <p className="text-xs text-slate-400 font-medium italic">Manage rates for specialized effects.</p>
                             </div>
                           </div>
                           
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2">
                             <RateRow label={localConfig.labels.laminationGlossRate} onLabelChange={(v) => setLocalConfig(prev => ({ ...prev, labels: { ...prev.labels, laminationGlossRate: v }}))} value={localConfig.laminationGlossRate} onChange={(v) => setLocalConfig(prev => ({ ...prev, laminationGlossRate: v }))} currency={localConfig.currency} />
                             <RateRow label={localConfig.labels.laminationMattRate} onLabelChange={(v) => setLocalConfig(prev => ({ ...prev, labels: { ...prev.labels, laminationMattRate: v }}))} value={localConfig.laminationMattRate} onChange={(v) => setLocalConfig(prev => ({ ...prev, laminationMattRate: v }))} currency={localConfig.currency} />
                             <RateRow label={localConfig.labels.spotUVSetup} onLabelChange={(v) => setLocalConfig(prev => ({ ...prev, labels: { ...prev.labels, spotUVSetup: v }}))} value={localConfig.spotUVSetup} onChange={(v) => setLocalConfig(prev => ({ ...prev, spotUVSetup: v }))} currency={localConfig.currency} />
                             <RateRow label={localConfig.labels.spotUVRate} onLabelChange={(v) => setLocalConfig(prev => ({ ...prev, labels: { ...prev.labels, spotUVRate: v }}))} value={localConfig.spotUVRate} onChange={(v) => setLocalConfig(prev => ({ ...prev, spotUVRate: v }))} currency={localConfig.currency} />
                             <RateRow label={localConfig.labels.foilingSetup} onLabelChange={(v) => setLocalConfig(prev => ({ ...prev, labels: { ...prev.labels, foilingSetup: v }}))} value={localConfig.foilingSetup} onChange={(v) => setLocalConfig(prev => ({ ...prev, foilingSetup: v }))} currency={localConfig.currency} />
                             <RateRow label={localConfig.labels.foilingRate} onLabelChange={(v) => setLocalConfig(prev => ({ ...prev, labels: { ...prev.labels, foilingRate: v }}))} value={localConfig.foilingRate} onChange={(v) => setLocalConfig(prev => ({ ...prev, foilingRate: v }))} currency={localConfig.currency} />
                             <RateRow label={localConfig.labels.dieCuttingSetup} onLabelChange={(v) => setLocalConfig(prev => ({ ...prev, labels: { ...prev.labels, dieCuttingSetup: v }}))} value={localConfig.dieCuttingSetup} onChange={(v) => setLocalConfig(prev => ({ ...prev, dieCuttingSetup: v }))} currency={localConfig.currency} />
                             <RateRow label={localConfig.labels.dieCuttingRate} onLabelChange={(v) => setLocalConfig(prev => ({ ...prev, labels: { ...prev.labels, dieCuttingRate: v }}))} value={localConfig.dieCuttingRate} onChange={(v) => setLocalConfig(prev => ({ ...prev, dieCuttingRate: v }))} currency={localConfig.currency} />
                             <RateRow label={localConfig.labels.foldingRate} onLabelChange={(v) => setLocalConfig(prev => ({ ...prev, labels: { ...prev.labels, foldingRate: v }}))} value={localConfig.foldingRate} onChange={(v) => setLocalConfig(prev => ({ ...prev, foldingRate: v }))} currency={localConfig.currency} />
                             <RateRow label={localConfig.labels.coldFoilSetup} onLabelChange={(v) => setLocalConfig(prev => ({ ...prev, labels: { ...prev.labels, coldFoilSetup: v }}))} value={localConfig.coldFoilSetup} onChange={(v) => setLocalConfig(prev => ({ ...prev, coldFoilSetup: v }))} currency={localConfig.currency} />
                             <RateRow label={localConfig.labels.coldFoilRate} onLabelChange={(v) => setLocalConfig(prev => ({ ...prev, labels: { ...prev.labels, coldFoilRate: v }}))} value={localConfig.coldFoilRate} onChange={(v) => setLocalConfig(prev => ({ ...prev, coldFoilRate: v }))} currency={localConfig.currency} />
                             <RateRow label={localConfig.labels.embossSetup} onLabelChange={(v) => setLocalConfig(prev => ({ ...prev, labels: { ...prev.labels, embossSetup: v }}))} value={localConfig.embossSetup} onChange={(v) => setLocalConfig(prev => ({ ...prev, embossSetup: v }))} currency={localConfig.currency} />
                             <RateRow label={localConfig.labels.embossRate} onLabelChange={(v) => setLocalConfig(prev => ({ ...prev, labels: { ...prev.labels, embossRate: v }}))} value={localConfig.embossRate} onChange={(v) => setLocalConfig(prev => ({ ...prev, embossRate: v }))} currency={localConfig.currency} />
                             <RateRow label={localConfig.labels.debossSetup} onLabelChange={(v) => setLocalConfig(prev => ({ ...prev, labels: { ...prev.labels, debossSetup: v }}))} value={localConfig.debossSetup} onChange={(v) => setLocalConfig(prev => ({ ...prev, debossSetup: v }))} currency={localConfig.currency} />
                             <RateRow label={localConfig.labels.debossRate} onLabelChange={(v) => setLocalConfig(prev => ({ ...prev, labels: { ...prev.labels, debossRate: v }}))} value={localConfig.debossRate} onChange={(v) => setLocalConfig(prev => ({ ...prev, debossRate: v }))} currency={localConfig.currency} />
                             <RateRow label={localConfig.labels.perforationSetup} onLabelChange={(v) => setLocalConfig(prev => ({ ...prev, labels: { ...prev.labels, perforationSetup: v }}))} value={localConfig.perforationSetup} onChange={(v) => setLocalConfig(prev => ({ ...prev, perforationSetup: v }))} currency={localConfig.currency} />
                             <RateRow label={localConfig.labels.creasingSetup} onLabelChange={(v) => setLocalConfig(prev => ({ ...prev, labels: { ...prev.labels, creasingSetup: v }}))} value={localConfig.creasingSetup} onChange={(v) => setLocalConfig(prev => ({ ...prev, creasingSetup: v }))} currency={localConfig.currency} />
                           </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeConfigTab === 'materials' && (
                    <motion.div 
                      key="materials"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                          <div className="flex items-center gap-3">
                             <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl shadow-sm">
                               <Layers size={20} />
                             </div>
                             <div>
                               <h3 className="font-bold text-slate-800 text-lg">Paper Stock Library</h3>
                               <p className="text-xs text-slate-400 font-medium italic">Manage specific stock types and parent sheet sizes.</p>
                             </div>
                          </div>
                          <button 
                            onClick={() => {
                              const name = prompt('Enter paper name:');
                              if (name) {
                                setLocalConfig(prev => ({
                                  ...prev,
                                  paperRates: { ...prev.paperRates, [name]: { price: 100, per: 1, width: 23, height: 36 } }
                                }));
                              }
                            }}
                            className="bg-indigo-50 text-indigo-600 p-2 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-100 flex items-center gap-2 px-4 transition-colors"
                          >
                            <Plus size={14} /> Add Stock
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                           {Object.entries(localConfig.paperRates).map(([name, details]) => (
                             <div key={name} className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100 group/item relative">
                               <button 
                                 onClick={() => {
                                   if (confirm(`Delete ${name} from stock library?`)) {
                                     const newRates = { ...localConfig.paperRates };
                                     delete newRates[name];
                                     setLocalConfig(prev => ({ ...prev, paperRates: newRates }));
                                   }
                                 }}
                                 className="absolute top-4 right-4 p-1.5 text-slate-300 hover:text-rose-500 opacity-0 group-hover/item:opacity-100 transition-all"
                               >
                                 <Trash2 size={14} />
                               </button>
                               <div className="flex items-center gap-2 mb-4 pr-8">
                                 <EditableLabel value={name} onChange={(v) => {
                                   if (v && v !== name) {
                                      const newRates = { ...localConfig.paperRates };
                                      newRates[v] = newRates[name];
                                      delete newRates[name];
                                      setLocalConfig(prev => ({ ...prev, paperRates: newRates }));
                                   }
                                 }} className="text-xs font-black text-slate-700 uppercase tracking-widest truncate" />
                               </div>
                               <div className="space-y-4">
                                 <InputGroup label="PRICE PER UNIT">
                                   <ConfigInput value={details.price} onChange={(v) => {
                                      setLocalConfig(prev => ({
                                        ...prev,
                                        paperRates: { ...prev.paperRates, [name]: { ...prev.paperRates[name], price: v } }
                                      }));
                                   }} currency={localConfig.currency} />
                                 </InputGroup>
                                 <div className="grid grid-cols-2 gap-3">
                                   <InputGroup label="SHEET WIDTH">
                                      <div className="relative group/input">
                                        <input 
                                          type="number"
                                          value={details.width}
                                          onChange={(e) => {
                                            const v = parseFloat(e.target.value) || 0;
                                            setLocalConfig(prev => ({
                                              ...prev,
                                              paperRates: { ...prev.paperRates, [name]: { ...prev.paperRates[name], width: v } }
                                            }));
                                          }}
                                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 font-mono font-bold"
                                        />
                                      </div>
                                   </InputGroup>
                                   <InputGroup label="SHEET HEIGHT">
                                      <div className="relative group/input">
                                        <input 
                                          type="number"
                                          value={details.height}
                                          onChange={(e) => {
                                            const v = parseFloat(e.target.value) || 0;
                                            setLocalConfig(prev => ({
                                              ...prev,
                                              paperRates: { ...prev.paperRates, [name]: { ...prev.paperRates[name], height: v } }
                                            }));
                                          }}
                                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 font-mono font-bold"
                                        />
                                      </div>
                                   </InputGroup>
                                 </div>
                               </div>
                             </div>
                           ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeConfigTab === 'presets' && (
                    <motion.div 
                      key="presets"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-8"
                    >
                      <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                          <div className="flex items-center gap-3">
                             <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl shadow-sm">
                               <Layout size={20} />
                             </div>
                             <div>
                               <h3 className="font-bold text-slate-800 text-lg">Project Templates</h3>
                               <p className="text-xs text-slate-400 font-medium italic">Define presets for common item types.</p>
                             </div>
                          </div>
                          <button 
                            onClick={() => {
                              const name = prompt('Preset Key (e.g., sticker):');
                              if (name) {
                                setLocalConfig(prev => ({
                                  ...prev,
                                  presets: { ...prev.presets, [name]: { width: 4, height: 4, gsm: 80, paperType: 'Woodfree', sides: 1 } }
                                }));
                              }
                            }}
                            className="bg-purple-50 text-purple-600 p-2 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-purple-100 flex items-center gap-2 px-4 transition-colors"
                          >
                            <Plus size={14} /> Create Preset
                          </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                           {Object.entries(localConfig.presets).map(([key, data]) => (
                             <div key={key} className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 relative group">
                               <div className="flex justify-between items-start mb-6">
                                 <EditableLabel value={key} onChange={(v) => {
                                   if (v && v !== key) {
                                      const newPresets = { ...localConfig.presets };
                                      newPresets[v] = newPresets[key];
                                      delete newPresets[key];
                                      setLocalConfig(prev => ({ ...prev, presets: newPresets }));
                                   }
                                 }} className="text-sm font-black text-slate-700 uppercase tracking-widest border-l-4 border-purple-400 pl-3 leading-none py-1" />
                                 <button 
                                   onClick={() => {
                                      if (confirm(`Delete preset ${key}?`)) {
                                        const newPresets = { ...localConfig.presets };
                                        delete newPresets[key];
                                        setLocalConfig(prev => ({ ...prev, presets: newPresets }));
                                      }
                                   }}
                                   className="text-slate-300 hover:text-rose-500 transition-colors"
                                 >
                                   <Trash2 size={16} />
                                 </button>
                               </div>

                               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <PresetField 
                                    label="WIDTH" 
                                    value={data.width || 0} 
                                    onChange={(v) => setLocalConfig(prev => ({ ...prev, presets: { ...prev.presets, [key]: { ...prev.presets[key], width: v } } }))} 
                                  />
                                  <PresetField 
                                    label="HEIGHT" 
                                    value={data.height || 0} 
                                    onChange={(v) => setLocalConfig(prev => ({ ...prev, presets: { ...prev.presets, [key]: { ...prev.presets[key], height: v } } }))} 
                                  />
                                  <PresetField 
                                    label="GSM" 
                                    value={data.gsm || 0} 
                                    onChange={(v) => setLocalConfig(prev => ({ ...prev, presets: { ...prev.presets, [key]: { ...prev.presets[key], gsm: v } } }))} 
                                  />
                                  <PresetField 
                                    label="SIDES" 
                                    value={data.sides || 1} 
                                    onChange={(v) => setLocalConfig(prev => ({ ...prev, presets: { ...prev.presets, [key]: { ...prev.presets[key], sides: v } } }))} 
                                  />
                               </div>

                               <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <InputGroup label="BINDING TYPE">
                                    <select 
                                      value={data.binding || 'none'}
                                      onChange={(e) => setLocalConfig(prev => ({ ...prev, presets: { ...prev.presets, [key]: { ...prev.presets[key], binding: e.target.value as any } } }))}
                                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold font-mono"
                                    >
                                      <option value="none">None</option>
                                      <option value="perfect">Perfect</option>
                                      <option value="saddle-stitch">Saddle</option>
                                      <option value="spiral">Spiral</option>
                                    </select>
                                 </InputGroup>
                                 <InputGroup label="PAPER TYPE">
                                    <select 
                                      value={data.paperType || 'Art Paper'}
                                      onChange={(e) => setLocalConfig(prev => ({ ...prev, presets: { ...prev.presets, [key]: { ...prev.presets[key], paperType: e.target.value } } }))}
                                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold font-mono"
                                    >
                                      {Object.keys(localConfig.paperRates).map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                 </InputGroup>
                               </div>

                               <div className="mt-6 pt-6 border-t border-slate-200/50 flex flex-wrap gap-4">
                                  <PresetToggle 
                                    label="Die Cutting" 
                                    active={!!data.dieCutting} 
                                    onToggle={() => setLocalConfig(prev => ({ ...prev, presets: { ...prev.presets, [key]: { ...prev.presets[key], dieCutting: !data.dieCutting } } }))} 
                                  />
                                  <PresetToggle 
                                    label="Folding" 
                                    active={!!data.folding} 
                                    onToggle={() => setLocalConfig(prev => ({ ...prev, presets: { ...prev.presets, [key]: { ...prev.presets[key], folding: !data.folding } } }))} 
                                  />
                                  <PresetToggle 
                                    label="Spot UV" 
                                    active={!!data.spotUV} 
                                    onToggle={() => setLocalConfig(prev => ({ ...prev, presets: { ...prev.presets, [key]: { ...prev.presets[key], spotUV: !data.spotUV } } }))} 
                                  />
                                  <PresetToggle 
                                    label="Grayboard" 
                                    active={!!data.useGrayboard} 
                                    onToggle={() => setLocalConfig(prev => ({ ...prev, presets: { ...prev.presets, [key]: { ...prev.presets[key], useGrayboard: !data.useGrayboard } } }))} 
                                  />
                               </div>
                             </div>
                           ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
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
                          setLocalConfig(prev => ({
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
                  <div className="grid gap-6">
                    {Object.entries(localConfig.customRates).map(([name, rate]) => (
                      <div key={name} className="flex items-center gap-4 group bg-slate-50/50 p-2 rounded-xl border border-transparent hover:border-slate-100 transition-all">
                        <EditableLabel 
                          value={name}
                          onChange={(newName) => {
                            if (newName && newName !== name) {
                              setLocalConfig(prev => {
                                const newRates = { ...prev.customRates };
                                delete newRates[name];
                                newRates[newName] = rate as number;
                                return { ...prev, customRates: newRates };
                              });
                            }
                          }}
                        />
                        <div className="w-36">
                          <ConfigInput 
                            value={rate as number}
                            currency={localConfig.currency}
                            onChange={(newRate) => {
                              setLocalConfig(prev => ({
                                ...prev,
                                customRates: { ...prev.customRates, [name]: newRate }
                              }));
                            }}
                          />
                        </div>
                        <button 
                          onClick={() => {
                            setLocalConfig(prev => {
                              const newRates = { ...prev.customRates };
                              delete newRates[name];
                              return { ...prev, customRates: newRates };
                            });
                          }}
                          className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    {Object.keys(localConfig.customRates).length === 0 && (
                      <div className="text-center py-4 border border-dashed border-slate-200 rounded-lg text-slate-400 text-xs italic">
                        No custom fields defined. These will be added as per-unit costs.
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Action Bar */}
                <div className="flex flex-col md:flex-row items-center justify-between bg-white border border-slate-200 p-4 rounded-xl shadow-lg sticky bottom-0 z-20 gap-4">
                  <p className="text-[10px] md:text-xs text-slate-500 max-w-sm text-center md:text-left">Changes affect future estimates. Save to apply.</p>
                  <div className="flex gap-2 md:gap-4 w-full md:w-auto">
                    <button 
                      onClick={() => setLocalConfig(appConfig)}
                      className="flex-1 md:flex-none px-4 py-2 text-slate-600 font-bold text-xs md:text-sm hover:bg-slate-50 rounded-lg transition-all border border-slate-100 md:border-0"
                    >
                      Discard
                    </button>
                    <button 
                      onClick={() => {
                         setAppConfig(localConfig);
                         setView('estimator');
                      }}
                      className="flex-1 md:flex-none px-6 md:px-8 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 text-xs md:text-sm"
                    >
                      <Save size={16} md:size={18} />
                      Save All
                    </button>
                  </div>
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
    <div className="relative group/input">
      <span className="absolute left-3 top-2.5 text-slate-300 font-black text-[10px] group-focus-within/input:text-indigo-400 transition-colors uppercase tabular-nums">{currency}</span>
      <input 
        type="number"
        value={value}
        onChange={(e) => {
          const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
          onChange(isNaN(val) ? 0 : val);
        }}
        className="w-full pl-10 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 font-mono font-bold transition-all"
      />
    </div>
  );
}

function RateRow({ label, onLabelChange, value, onChange, currency }: { label: string, onLabelChange?: (v: string) => void, value: number, onChange: (v: number) => void, currency: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 group/row">
      <div className="flex-1 min-w-0">
        {onLabelChange ? (
          <EditableLabel 
            value={label} 
            onChange={onLabelChange} 
            className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover/row:text-slate-600 transition-colors truncate block"
          />
        ) : (
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover/row:text-slate-600 transition-colors truncate block">{label}</span>
        )}
      </div>
      <div className="w-28 flex-shrink-0">
        <ConfigInput value={value} onChange={onChange} currency={currency} />
      </div>
    </div>
  );
}

function InputGroup({ label, children, className = "" }: { label: string, children: React.ReactNode, className?: string }) {
  return (
    <div className={`space-y-2 flex-1 ${className}`}>
      <label className="block text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">{label}</label>
      {children}
    </div>
  );
}

function FinishToggle({ label, name, checked, onChange, icon }: { label: string, name: string, checked: boolean, onChange: (e: any) => void, icon?: React.ReactNode }) {
  return (
    <div 
      className={`
        flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer group select-none
        ${checked 
          ? 'bg-indigo-600 border-indigo-500 shadow-md shadow-indigo-200' 
          : 'bg-slate-50 border-slate-100 hover:bg-white hover:border-slate-200 hover:shadow-sm'}
      `} 
      onClick={() => onChange({ target: { name, type: 'checkbox', checked: !checked } })}
    >
      <div className="flex items-center gap-2.5">
        {icon && (
          <span className={`
            p-1.5 rounded-lg transition-colors
            ${checked ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-500 group-hover:bg-slate-300'}
          `}>
            {icon}
          </span>
        )}
        <span className={`text-[10px] font-black uppercase tracking-widest leading-none ${checked ? 'text-white' : 'text-slate-500'}`}>{label}</span>
      </div>
      <div className={`w-8 h-4 rounded-full relative transition-colors p-[2px] ${checked ? 'bg-white/20' : 'bg-slate-300'}`}>
        <div className={`w-3 h-3 bg-white rounded-full transition-all shadow-sm ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
      </div>
    </div>
  );
}

interface HistoryCardProps {
  key?: React.Key;
  estimate: SavedEstimate;
  onEdit: () => void;
  onDelete: () => void;
  onPDF: () => void;
  currency: string;
}

function HistoryCard({ estimate, onEdit, onDelete, onPDF, currency }: HistoryCardProps) {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-white border border-slate-200 rounded-[32px] p-6 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all group flex flex-col h-full"
    >
      <div className="flex justify-between items-start mb-6">
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">{estimate.id}</span>
          <h3 className="font-black text-slate-800 text-lg group-hover:text-indigo-600 transition-colors leading-tight truncate">
            {estimate.data.jobName || 'Untitled Project'}
          </h3>
          <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tight flex items-center gap-1.5">
            <Calendar size={10} />
            {estimate.date}
          </span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={onPDF}
            className="p-2 text-slate-400 hover:text-emerald-600 bg-slate-50 hover:bg-emerald-50 rounded-xl transition-all"
            title="Download PDF"
          >
            <FileDown size={16} />
          </button>
          <button 
            onClick={onDelete}
            className="p-2 text-slate-400 hover:text-rose-500 bg-slate-50 hover:bg-rose-50 rounded-xl transition-all"
            title="Delete Project"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="space-y-4 flex-1">
         <div className="grid grid-cols-2 gap-4">
           <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col">
             <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Quantity</span>
             <span className="text-sm font-black text-slate-700 tabular-nums">{estimate.data.quantity.toLocaleString()}</span>
           </div>
           <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col">
             <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Total Quote</span>
             <span className="text-sm font-black text-indigo-600 tabular-nums">{currency} {Math.round(estimate.results.totalCost).toLocaleString()}</span>
           </div>
         </div>

         <div className="flex flex-wrap gap-2">
            <span className="px-2 py-1 bg-amber-50 text-amber-600 rounded-lg text-[9px] font-black uppercase tracking-tighter">
              {estimate.data.paperType}
            </span>
            <span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-black uppercase tracking-tighter">
              {estimate.data.sides === 2 ? 'Double Sided' : 'Single Sided'}
            </span>
             <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase tracking-tighter">
              {estimate.data.width}" x {estimate.data.height}"
            </span>
         </div>
      </div>

      <button 
        onClick={onEdit}
        className="mt-6 w-full py-3 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-indigo-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm"
      >
        <ExternalLink size={14} />
        Restore Estimate
      </button>
    </motion.div>
  );
}

function Metric({ icon, label, value, highlight = false }: { icon: React.ReactNode, label: string, value: string | number, highlight?: boolean }) {
  return (
    <div className={`p-4 rounded-2xl border transition-all ${highlight ? 'bg-indigo-600 border-indigo-500 shadow-lg shadow-indigo-100 text-white' : 'bg-slate-50 border-slate-100'}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={highlight ? 'text-indigo-200' : 'text-slate-400'}>{icon}</div>
        <span className={`text-[10px] font-black uppercase tracking-widest ${highlight ? 'text-indigo-100' : 'text-slate-400'}`}>{label}</span>
      </div>
      <div className={`text-xl font-mono font-black tabular-nums ${highlight ? 'text-white' : 'text-slate-800'}`}>{value}</div>
    </div>
  );
}

function PresetField({ label, value, onChange }: { label: string, value: number, onChange: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block">{label}</span>
      <input 
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold font-mono focus:border-purple-400 focus:outline-none transition-colors"
      />
    </div>
  );
}

function PresetToggle({ label, active, onToggle }: { label: string, active: boolean, onToggle: () => void }) {
  return (
    <button 
      onClick={onToggle}
      className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border transition-all ${active ? 'bg-purple-600 border-purple-500 text-white shadow-md shadow-purple-100' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}
    >
      {label}
    </button>
  );
}

function EditableLabel({ 
  value, 
  onChange, 
  className = "" 
}: { 
  value: string, 
  onChange: (v: string) => void, 
  className?: string 
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);

  // Sync temp value if external value changes while not editing
  useEffect(() => {
    if (!isEditing) setTempValue(value);
  }, [value, isEditing]);

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 flex-1">
        <input 
          autoFocus
          type="text"
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          className={`flex-1 bg-white border border-indigo-300 rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 ${className}`}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onChange(tempValue);
              setIsEditing(false);
            }
            if (e.key === 'Escape') {
              setTempValue(value);
              setIsEditing(false);
            }
          }}
        />
        <button 
          onClick={() => {
            onChange(tempValue);
            setIsEditing(false);
          }}
          className="p-1 text-emerald-500 hover:bg-emerald-50 rounded transition-colors"
        >
          <Check size={14} />
        </button>
        <button 
          onClick={() => {
            setTempValue(value);
            setIsEditing(false);
          }}
          className="p-1 text-slate-400 hover:bg-slate-50 rounded transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 group flex-1">
      <span className={`text-sm font-medium text-slate-600 truncate ${className}`}>{value}</span>
      <button 
        onClick={() => setIsEditing(true)}
        className="p-1 text-slate-300 opacity-0 group-hover:opacity-100 hover:text-indigo-500 hover:bg-indigo-50 rounded transition-all"
      >
        <Pencil size={12} />
      </button>
    </div>
  );
}
