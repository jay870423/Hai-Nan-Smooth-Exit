import React, { useState, useEffect } from 'react';

// Define the structure for category limits
interface CategoryLimit {
  id: string;
  label: string;
  icon: React.ReactNode;
  limit: number;
  unit: string;
  current: number;
  ruleDetail: string;
  colorTheme: 'pink' | 'blue' | 'purple' | 'orange';
}

export const QuotaView: React.FC = () => {
  const [usedQuota, setUsedQuota] = useState(0);
  const [categoryDetails, setCategoryDetails] = useState<Record<string, number>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [animateProgress, setAnimateProgress] = useState(false);

  const TOTAL_QUOTA = 100000;
  
  // Read from localStorage on mount
  useEffect(() => {
    // 1. Total Money
    const savedQuota = localStorage.getItem('hainan_used_quota');
    if (savedQuota) {
      setUsedQuota(parseInt(savedQuota, 10));
    }
    
    // 2. Category Details
    const savedDetails = localStorage.getItem('hainan_quota_details');
    if (savedDetails) {
        setCategoryDetails(JSON.parse(savedDetails));
    }

    // Trigger animation after mount
    setTimeout(() => setAnimateProgress(true), 100);
  }, []);

  const REMAINING = Math.max(0, TOTAL_QUOTA - usedQuota);
  const PERCENTAGE = Math.min(100, (usedQuota / TOTAL_QUOTA) * 100);

  const handleReset = () => {
    if (confirm('确定要重置当前行程的额度账单吗？')) {
      localStorage.setItem('hainan_used_quota', '0');
      localStorage.setItem('hainan_quota_details', '{}');
      setUsedQuota(0);
      setCategoryDetails({});
    }
  };

  // Base Data structure (values will be injected from state)
  const baseCategories: Omit<CategoryLimit, 'current'>[] = [
    {
      id: 'cosmetics',
      label: '化妆品',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      ),
      limit: 30,
      unit: '件',
      ruleDetail: '每人每次离岛限购30件。套装产品按包装内实际件数计算（如：1盒面膜10片算10件）。',
      colorTheme: 'pink'
    },
    {
      id: 'phone',
      label: '手机',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
      limit: 4,
      unit: '部',
      ruleDetail: '每人每次离岛限购4部。需拆封并激活，防止倒卖。',
      colorTheme: 'blue'
    },
    {
      id: 'alcohol',
      label: '酒类',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      limit: 1500,
      unit: 'ml',
      ruleDetail: '每人每次离岛限购1500ml。通常为2瓶750ml红酒或3瓶500ml茅台。',
      colorTheme: 'purple'
    },
    {
      id: 'other',
      label: '其他物品',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
      limit: 999, // Dummy limit for calculation, since it's unlimited
      unit: '件',
      ruleDetail: '服饰、箱包、手表、食品等其他品类。无件数限制，但占用年度10万元免税额度。',
      colorTheme: 'orange'
    }
  ];

  const getThemeColors = (theme: string, percentage: number) => {
    // If usage is high (>90%), force red warning (Exception: 'other' is fine unless money runs out)
    if (percentage >= 100 && theme !== 'orange') return { bg: 'bg-red-50', text: 'text-red-600', bar: 'bg-red-500', iconBg: 'bg-red-100' };
    
    switch(theme) {
      case 'pink': return { bg: 'bg-pink-50', text: 'text-pink-600', bar: 'bg-pink-400', iconBg: 'bg-pink-100' };
      case 'blue': return { bg: 'bg-blue-50', text: 'text-blue-600', bar: 'bg-blue-400', iconBg: 'bg-blue-100' };
      case 'purple': return { bg: 'bg-purple-50', text: 'text-purple-600', bar: 'bg-purple-400', iconBg: 'bg-purple-100' };
      case 'orange': return { bg: 'bg-orange-50', text: 'text-orange-600', bar: 'bg-orange-400', iconBg: 'bg-orange-100' };
      default: return { bg: 'bg-gray-50', text: 'text-gray-600', bar: 'bg-gray-400', iconBg: 'bg-gray-100' };
    }
  };

  // Filter categories to only show those that have a count > 0
  const activeCategories = baseCategories
    .map(cat => ({
        ...cat,
        current: categoryDetails[cat.id] || 0
    }))
    .filter(cat => cat.current > 0);

  return (
    <div className="p-4 pb-24">
      <div className="mb-6 flex justify-between items-start">
        <div>
           <h1 className="text-2xl font-bold text-gray-800">额度保卫战</h1>
           <p className="text-sm text-gray-500">每人每年10万，怎么花最值？</p>
        </div>
        <button 
          onClick={handleReset}
          className="text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors active:scale-95"
        >
          重置账单
        </button>
      </div>

      {/* Main Total Card */}
      <div className="bg-gradient-to-br from-teal-500 to-teal-700 rounded-3xl p-6 text-white shadow-xl shadow-teal-900/20 mb-8 relative overflow-hidden group">
        {/* Decorative Background Circles */}
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 bg-white/10 rounded-full blur-3xl transition-transform duration-700 group-hover:scale-110"></div>
        <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-24 h-24 bg-teal-400/20 rounded-full blur-2xl"></div>
        
        <div className="flex justify-between items-start mb-8 relative z-10">
          <div>
            <p className="text-teal-100 text-sm font-medium tracking-wide">剩余可用额度</p>
            <h2 className="text-4xl font-bold mt-1 tracking-tight">¥{REMAINING.toLocaleString()}</h2>
          </div>
          <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-medium border border-white/10">
            年度 {new Date().getFullYear()}
          </div>
        </div>

        <div className="relative h-3 bg-black/20 rounded-full overflow-hidden mb-3">
          <div 
            className={`absolute top-0 left-0 h-full rounded-full transition-all duration-[1500ms] ease-out ${PERCENTAGE > 90 ? 'bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.5)]' : 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]'}`} 
            style={{ width: animateProgress ? `${PERCENTAGE}%` : '0%' }}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-teal-100 font-medium">
          <span>已用 ¥{usedQuota.toLocaleString()}</span>
          <span>总额 ¥{TOTAL_QUOTA.toLocaleString()}</span>
        </div>
      </div>

      {/* Categories Grid Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-800 text-base">消费品类明细</h3>
        {activeCategories.length > 0 && <span className="text-xs text-gray-400">点击查看规则</span>}
      </div>

      {/* Interactive Categories Grid */}
      {activeCategories.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 mb-6">
            {activeCategories.map((cat) => {
              const isOther = cat.id === 'other';
              const percent = isOther ? Math.min(100, (cat.current / 50) * 100) : Math.min(100, (cat.current / cat.limit) * 100); // For 'other', just show some progress for visual effect
              const theme = getThemeColors(cat.colorTheme, percent);
              const isExpanded = expandedId === cat.id;
    
              return (
                <div 
                    key={cat.id}
                    onClick={() => setExpandedId(isExpanded ? null : cat.id)}
                    className={`bg-white rounded-2xl p-4 shadow-sm border border-gray-100 transition-all duration-300 cursor-pointer hover:shadow-md ${isExpanded ? 'ring-2 ring-teal-500/20' : ''}`}
                >
                  <div className="flex items-center">
                    {/* Icon Box */}
                    <div className={`w-12 h-12 rounded-2xl ${theme.iconBg} ${theme.text} flex items-center justify-center mr-4 shrink-0 shadow-inner`}>
                       {cat.icon}
                    </div>
    
                    {/* Info */}
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <h4 className="font-bold text-gray-800">{cat.label}</h4>
                        {isOther ? (
                             <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600`}>
                               已购 {cat.current} 件 (不限购)
                             </span>
                        ) : (
                             <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${theme.bg} ${theme.text}`}>
                                {cat.current} / {cat.limit} {cat.unit}
                             </span>
                        )}
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-[1200ms] ease-out ${theme.bar}`} 
                          style={{ width: animateProgress ? `${percent}%` : '0%' }}
                        ></div>
                      </div>
                    </div>
    
                    {/* Arrow */}
                    <div className="ml-3 text-gray-300 transition-transform duration-300" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
    
                  {/* Expanded Rule Detail */}
                  <div 
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-24 opacity-100 mt-4' : 'max-h-0 opacity-0 mt-0'}`}
                  >
                     <div className="bg-gray-50 p-3 rounded-xl text-xs text-gray-600 leading-relaxed border border-gray-100">
                        <span className="font-bold text-gray-800">海关规定：</span>
                        {cat.ruleDetail}
                     </div>
                  </div>
                </div>
              );
            })}
          </div>
      ) : (
          /* Empty State */
          <div className="mb-6 p-6 rounded-2xl bg-gray-50 border border-dashed border-gray-200 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-300 mb-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              </div>
              <p className="text-gray-500 font-medium text-sm">暂无特定品类消费记录</p>
              <p className="text-xs text-gray-400 mt-1 mb-3">请使用「海关眼」扫描商品，系统将自动分类记账。</p>
          </div>
      )}

      {/* Tips Card */}
       <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-100 rounded-full blur-xl -mr-10 -mt-10"></div>
        <div className="relative z-10">
            <h4 className="font-bold text-blue-800 text-sm mb-2 flex items-center">
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                省钱小贴士
            </h4>
            <p className="text-xs text-blue-700 leading-relaxed">
            您还有大量额度，建议优先购买<strong>高单价电子产品</strong>或<strong>精品腕表</strong>。
            <br/>
            <span className="opacity-75 mt-1 block">*注意：单价超过10万元的商品不限件数，但需要一次性缴纳进境物品进口税。</span>
            </p>
        </div>
      </div>
    </div>
  );
};