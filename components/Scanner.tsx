import React, { useState, useRef, useEffect } from 'react';
import { analyzeLuggageImage } from '../services/geminiService';
import { ScanResult, AIModelProvider } from '../types';

export const Scanner: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  // Default to Qwen (Domestic model) for stability in China
  const [selectedProvider, setSelectedProvider] = useState<AIModelProvider>('qwen');
  
  // Track if current result has been added to quota
  const [isAddedToQuota, setIsAddedToQuota] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const hasSeen = localStorage.getItem('hasSeenScannerOnboarding');
    if (!hasSeen) {
      setShowOnboarding(true);
    }
  }, []);

  const dismissOnboarding = () => {
    setShowOnboarding(false);
    localStorage.setItem('hasSeenScannerOnboarding', 'true');
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Remove data URL prefix for API
        const base64Data = base64String.split(',')[1];
        setImage(base64String);
        analyze(base64Data);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyze = async (base64Data: string) => {
    setIsAnalyzing(true);
    setResult(null);
    setIsAddedToQuota(false); // Reset add status for new scan
    try {
      // Pass the selected provider to the service
      const scanResult = await analyzeLuggageImage(base64Data, selectedProvider);
      setResult(scanResult);
    } catch (error) {
      console.error(error);
      alert("AI 暂时罢工了，请稍后再试或切换其他模型。");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Helper to categorize string items into specific quota categories
  // Expanded keywords to catch more AI output variations
  const categorizeItem = (itemName: string): string => {
    const lower = itemName.toLowerCase();
    
    // 1. Phone (Strict limit: 4)
    if (/手机|phone|iphone|android|mobile|huawei|xiaomi|honor|oppo|vivo|samsung|galaxy|mate|p[0-9]+|apple/i.test(lower)) return 'phone';
    
    // 2. Alcohol (Strict limit: 1500ml)
    if (/酒|wine|liquor|beer|alcohol|whiskey|whisky|vodka|gin|rum|brandy|cognac|champagne|hennessy|martell|remy|moutai|kweichow|茅台|五粮液|国窖|xo|vsop/i.test(lower)) return 'alcohol';
    
    // 3. Cosmetics (Strict limit: 30 items)
    // Expanded significantly to catch brands and types
    if (/霜|乳|液|精华|口红|粉底|眼影|腮红|眉笔|睫毛|散粉|遮瑕|香水|mask|cream|lotion|serum|lipstick|makeup|skincare|cosmetic|perfume|fragrance|toilette|parfum|eye|face|gel|toner|cleanser|balm|oil|shadow|powder|blush|brow|liner|mascara|palette|sk-ii|lamer|estee|lancome|dior|chanel|ysl|armani|givency|clarins|sisley|kiel/i.test(lower)) return 'cosmetics';
    
    return 'other';
  };

  const addToQuota = () => {
    if (!result || isAddedToQuota) return;

    try {
      // 1. Update Total Money Value
      const currentUsed = parseInt(localStorage.getItem('hainan_used_quota') || '0', 10);
      const newUsed = currentUsed + result.estimatedValue;
      localStorage.setItem('hainan_used_quota', newUsed.toString());
      
      // 2. Update Category Details (Count/Volume)
      // Structure: { cosmetics: 5, phone: 1, alcohol: 1000 }
      const currentDetails = JSON.parse(localStorage.getItem('hainan_quota_details') || '{}');
      let addedCounts: Record<string, number> = {};
      
      result.detectedItems.forEach(item => {
        const category = categorizeItem(item);
        if (category === 'other') return;

        const currentVal = currentDetails[category] || 0;
        
        // Special logic: Alcohol is measured in ML. 
        // Assumption: 1 detected "item" of alcohol is approx 500ml standard bottle if not specified.
        if (category === 'alcohol') {
            currentDetails[category] = currentVal + 500;
            addedCounts[category] = (addedCounts[category] || 0) + 1; // Count bottles for toast
        } else {
            // Others are just counts
            currentDetails[category] = currentVal + 1;
            addedCounts[category] = (addedCounts[category] || 0) + 1;
        }
      });
      
      localStorage.setItem('hainan_quota_details', JSON.stringify(currentDetails));

      setIsAddedToQuota(true);

      // Show Feedback
      const categoriesDetected = Object.keys(addedCounts);
      if (categoriesDetected.length > 0) {
        const detailStr = categoriesDetected.map(k => {
            const label = k === 'cosmetics' ? '化妆品' : k === 'phone' ? '手机' : '酒类';
            return `${label}+${addedCounts[k]}`;
        }).join(', ');
        setNotification(`已记账 ¥${result.estimatedValue}，包含: ${detailStr}`);
      } else {
        setNotification(`已记账 ¥${result.estimatedValue} (未检测到限购品类)`);
      }

      // Auto hide notification
      setTimeout(() => setNotification(null), 3000);

    } catch (e) {
      console.error("Failed to save quota", e);
      setNotification("保存失败，请重试");
    }
  };

  const triggerCamera = () => {
    fileInputRef.current?.click();
  };

  // Helper to get friendly display name
  const getProviderDisplayName = (p: AIModelProvider) => {
    switch(p) {
        case 'qwen': return '阿里云';
        case 'gemini': return 'Google';
        case 'doubao': return '火山引擎';
        case 'deepseek': return '深度求索';
        default: return 'AI';
    }
  };

  return (
    <div className="flex flex-col h-full p-4 pb-24 relative">
       {/* Toast Notification */}
       {notification && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-6 py-3 rounded-full text-sm shadow-xl z-[70] animate-fade-in-down whitespace-nowrap">
          {notification}
        </div>
      )}

      {/* Onboarding Overlay */}
      {showOnboarding && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm rounded-2xl animate-fade-in" style={{ margin: -16 }}>
          <div className="bg-white rounded-2xl p-6 max-w-sm text-center shadow-2xl relative animate-scale-in">
             <div className="w-12 h-12 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             </div>
             <h3 className="text-xl font-bold text-gray-800 mb-2">欢迎使用海关眼 👁️</h3>
             <p className="text-gray-600 mb-6 text-sm leading-relaxed text-left">
               1. <strong>拍一张</strong>行李箱开箱后的俯拍照片。<br/>
               2. AI 将自动识别<strong>化妆品、烟酒、电子产品</strong>。<br/>
               3. 帮您评估是否超过<strong>海南离岛免税额度</strong>或存在“代购”嫌疑。
             </p>
             <button 
               onClick={dismissOnboarding}
               className="w-full bg-teal-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-teal-700 active:scale-95 transition-all"
             >
               知道了，试试看
             </button>
             
             {/* Decor elements */}
             <div className="absolute -top-6 -right-2 text-4xl animate-bounce">📸</div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-start mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">海关眼 AI</h1>
          <p className="text-sm text-gray-500">拍一下开箱的行李，看看会不会被“税”。</p>
        </div>
        
        {/* AI Model Selector */}
        <div className="flex flex-col items-end">
            <select 
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value as AIModelProvider)}
                disabled={isAnalyzing || !!image}
                className="text-xs bg-white border border-gray-200 text-gray-700 py-1 px-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
            >
                <option value="qwen">🐱 通义千问 (国内推荐)</option>
                <option value="gemini">✨ Gemini 2.5 (需加速)</option>
                <option value="doubao">🥟 豆包 Doubao</option>
                <option value="deepseek">🐳 DeepSeek</option>
            </select>
            <span className="text-[10px] text-gray-400 mt-1">
                {selectedProvider === 'qwen' ? '阿里云支持' : selectedProvider === 'gemini' ? 'Google' : '其他模型'}
            </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300 relative overflow-hidden min-h-[300px]">
        {image ? (
          <img src={image} alt="Luggage" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-gray-400">点击拍照识别</p>
          </div>
        )}

        {isAnalyzing && (
           <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-md z-10 transition-all duration-300">
             {/* Scanning Line Animation CSS */}
             <style>{`
                @keyframes scan-beam {
                    0% { top: 0%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
             `}</style>
             
             {/* The Beam */}
             <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-teal-400 to-transparent shadow-[0_0_20px_rgba(45,212,191,0.8)] z-0" 
                  style={{ animation: 'scan-beam 2s linear infinite' }}></div>

             {/* The Status Card */}
             <div className="relative z-10 bg-gray-900/80 p-5 rounded-2xl flex flex-col items-center border border-gray-700 shadow-2xl backdrop-blur-sm">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-500 border-t-transparent mb-3"></div>
                <p className="text-white font-bold text-lg tracking-wide">
                   {getProviderDisplayName(selectedProvider)}正在计算...
                </p>
                <p className="text-teal-400 text-xs mt-1 animate-pulse">正在扫描物品与价格...</p>
             </div>
           </div>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Actions */}
      {!image && (
        <button
          onClick={triggerCamera}
          className="mt-6 w-full bg-teal-600 text-white py-4 rounded-xl font-bold shadow-lg active:scale-95 transition-transform"
        >
          打开海关眼
        </button>
      )}
      
      {image && !isAnalyzing && !result && (
         <button
         onClick={triggerCamera}
         className="mt-6 w-full bg-gray-600 text-white py-3 rounded-xl font-bold shadow-lg"
       >
         重拍
       </button>
      )}

      {/* Result Card */}
      {result && (
        <div className="mt-6 bg-white rounded-2xl shadow-xl border border-gray-100 p-6 animate-fade-in-up pb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg text-gray-800">检测结果</h3>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              result.riskLevel === 'HIGH' ? 'bg-red-100 text-red-600' :
              result.riskLevel === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
              'bg-green-100 text-green-600'
            }`}>
              {result.riskLevel === 'HIGH' ? '高风险' : result.riskLevel === 'MEDIUM' ? '中风险' : '安全通过'}
            </span>
          </div>

          <div className="bg-gray-50 p-4 rounded-xl mb-4 border-l-4 border-teal-500">
            <p className="text-gray-700 text-sm italic">
              "{result.funnyMessage}"
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">识别物品:</span>
              <span className="text-gray-800 font-medium text-right truncate w-48">{result.detectedItems.join(', ')}</span>
            </div>
            <div className="flex justify-between text-sm items-center">
              <span className="text-gray-500">预估价值:</span>
              <span className="text-xl text-teal-600 font-bold">¥{result.estimatedValue.toLocaleString()}</span>
            </div>
             {result.isDaigouSuspect && (
               <div className="mt-1 bg-red-50 text-red-600 text-xs p-2 rounded-lg text-center font-bold">
                 ⚠️ 警告：您的行为像个代购，建议找个队友分担一下。
               </div>
             )}
          </div>
          
          <div className="mt-6 grid grid-cols-2 gap-3">
             <button
               onClick={() => {
                   setImage(null);
                   setResult(null);
                   setIsAddedToQuota(false);
               }}
               className="bg-gray-100 text-gray-600 py-3 rounded-xl font-medium text-sm hover:bg-gray-200"
             >
               再测一箱
             </button>
             
             <button
               onClick={addToQuota}
               disabled={isAddedToQuota || result.estimatedValue === 0}
               className={`py-3 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-1
                 ${isAddedToQuota 
                   ? 'bg-green-100 text-green-700 cursor-default' 
                   : 'bg-teal-600 text-white hover:bg-teal-700 active:scale-95'
                 }`}
             >
               {isAddedToQuota ? (
                 <>
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                   已记账
                 </>
               ) : (
                 <>
                   <span>💰</span> 加入额度
                 </>
               )}
             </button>
          </div>
        </div>
      )}
    </div>
  );
};