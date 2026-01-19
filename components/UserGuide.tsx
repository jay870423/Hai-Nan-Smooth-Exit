import React, { useState } from 'react';

interface UserGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GuideSection {
  id: string;
  title: string;
  icon: string;
  color: string;
  content: React.ReactNode;
}

export const UserGuide: React.FC<UserGuideProps> = ({ isOpen, onClose }) => {
  const [expandedSection, setExpandedSection] = useState<string | null>('traffic');

  if (!isOpen) return null;

  const sections: GuideSection[] = [
    {
      id: 'traffic',
      title: '如何看懂“查验红绿灯”？',
      icon: '🚦',
      color: 'bg-green-100 text-green-700',
      content: (
        <div className="space-y-3 text-sm text-gray-600">
          <p>首页展示了全岛主要口岸的实时状态，颜色代表通行效率：</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><span className="text-green-600 font-bold">绿色</span>：丝滑秒过，基本无查验。</li>
            <li><span className="text-yellow-600 font-bold">黄色</span>：排队较长，存在常规抽检。</li>
            <li><span className="text-red-500 font-bold">红色</span>：严重拥堵或严查，建议预留充足时间。</li>
          </ul>
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 mt-2">
            <span className="font-bold text-gray-800">我是哨兵功能：</span>
            <p className="mt-1">如果您正在现场，点击底部的“我也是现场哨兵”按钮，上报您看到的拥堵情况，帮助后来人。</p>
          </div>
        </div>
      )
    },
    {
      id: 'scanner',
      title: '“海关眼” AI 怎么用？',
      icon: '📸',
      color: 'bg-teal-100 text-teal-700',
      content: (
        <div className="space-y-3 text-sm text-gray-600">
          <p>利用 AI 帮您判断行李箱是否“超标”：</p>
          <ol className="list-decimal pl-5 space-y-2">
            <li><strong className="text-gray-800">拍照技巧：</strong>打开行李箱，尽量<strong>垂直俯拍</strong>，确保化妆品、电子产品清晰可见。</li>
            <li><strong className="text-gray-800">模型选择：</strong>
                <ul className="list-disc pl-4 mt-1 text-xs text-gray-500">
                    <li><strong>通义千问 (推荐)：</strong>国内速度快，识别准。</li>
                    <li><strong>Gemini：</strong>识别能力最强，但需要网络环境支持。</li>
                </ul>
            </li>
            <li><strong className="text-gray-800">加入账单：</strong>识别成功后，点击“加入额度”按钮，系统会自动将金额和分类记入您的年度账单。</li>
          </ol>
        </div>
      )
    },
    {
      id: 'quota',
      title: '“额度卫士”记账规则',
      icon: '💰',
      color: 'bg-blue-100 text-blue-700',
      content: (
        <div className="space-y-3 text-sm text-gray-600">
          <p>海南离岛免税额度为 <strong>10万元/人/年</strong>，系统会自动统计：</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
             <div className="bg-pink-50 p-2 rounded text-pink-700 border border-pink-100">
                <strong>化妆品</strong><br/>限 30 件/次
             </div>
             <div className="bg-purple-50 p-2 rounded text-purple-700 border border-purple-100">
                <strong>酒类</strong><br/>限 1500ml/次
             </div>
             <div className="bg-blue-50 p-2 rounded text-blue-700 border border-blue-100">
                <strong>手机</strong><br/>限 4 部/次
             </div>
             <div className="bg-orange-50 p-2 rounded text-orange-700 border border-orange-100">
                <strong>其他</strong><br/>不限件数 (衣服/包等)
             </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">*提示：点击右上角“重置账单”可开启新的行程。</p>
        </div>
      )
    },
    {
      id: 'blacklist',
      title: '避雷“黑榜”是什么？',
      icon: '☠️',
      color: 'bg-red-100 text-red-700',
      content: (
        <div className="space-y-3 text-sm text-gray-600">
          <p>这里展示了当天被海关“扣下”或“警告”频率最高的物品。</p>
          <p>数据来源于用户众包上报。如果您看到某样东西被查了，可以点击<strong>“我也看到了”</strong>，增加数据的准确性，警示他人。</p>
          <div className="flex items-center gap-2 mt-2">
             <span className="text-xs bg-gray-800 text-white px-2 py-1 rounded">小技巧</span>
             <span className="text-xs">点击右下角黑色按钮可曝光新物品。</span>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 backdrop-blur-[2px] animate-fade-in" onClick={onClose}>
      <div 
        className="bg-white w-full max-w-md rounded-t-3xl shadow-2xl h-[80vh] flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white rounded-t-3xl sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-800">📖 丝滑离岛操作手册</h2>
            <p className="text-xs text-gray-400 mt-1">新手必读 · 3分钟快速上手</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors"
          >
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Content Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar pb-12">
           {sections.map((section) => {
             const isExpanded = expandedSection === section.id;
             return (
               <div 
                 key={section.id}
                 className={`border border-gray-100 rounded-2xl overflow-hidden transition-all duration-300 ${isExpanded ? 'bg-white shadow-md ring-1 ring-teal-500/20' : 'bg-gray-50 hover:bg-white'}`}
               >
                 <button 
                   onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                   className="w-full flex items-center p-4 text-left"
                 >
                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-sm mr-4 shrink-0 ${section.color}`}>
                     {section.icon}
                   </div>
                   <div className="flex-1 font-bold text-gray-800">
                     {section.title}
                   </div>
                   <div className={`transform transition-transform duration-300 text-gray-400 ${isExpanded ? 'rotate-180' : ''}`}>
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                   </div>
                 </button>
                 
                 <div 
                   className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
                 >
                   <div className="p-4 pt-0 border-t border-gray-100/50">
                      {section.content}
                   </div>
                 </div>
               </div>
             );
           })}

           {/* Footer Info */}
           <div className="mt-8 text-center space-y-2">
             <div className="inline-block p-4 bg-gradient-to-br from-teal-50 to-blue-50 rounded-2xl border border-teal-100">
                <p className="text-sm font-bold text-teal-800 mb-1">💡 声明</p>
                <p className="text-xs text-gray-600 leading-relaxed">
                  本工具仅为辅助参考，不代表海关官方执法标准。<br/>
                  请大家遵纪守法，合规离岛。
                </p>
             </div>
             <p className="text-[10px] text-gray-300 pt-4">v1.0.2 - Made with ❤️ for Hainan Travelers</p>
           </div>
        </div>
      </div>
    </div>
  );
};
