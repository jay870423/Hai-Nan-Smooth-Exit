import React, { useEffect, useState } from 'react';
import { BlacklistItem } from '../types';
import { supabase, isSupabaseConfigured } from '../services/supabase';

const MOCK_BLACKLIST: BlacklistItem[] = [
  { id: '1', rank: 1, name: '某大牌小棕瓶眼霜', category: '化妆品', reason: '超出件数限制', confiscatedCountToday: 142 },
  { id: '2', rank: 2, name: '戴森吹风机 (多台)', category: '电子', reason: '疑似代购倒卖', confiscatedCountToday: 89 },
  { id: '3', rank: 3, name: '茅台 (整箱)', category: '酒类', reason: '超出1500ml限制', confiscatedCountToday: 56 },
  { id: '4', rank: 4, name: 'iPhone 15 Pro Max', category: '手机', reason: '未申报且超自用', confiscatedCountToday: 33 },
  { id: '5', rank: 5, name: '大疆无人机', category: '电子', reason: '电池超规/超额', confiscatedCountToday: 21 },
];

export const BlacklistView: React.FC = () => {
  const [items, setItems] = useState<BlacklistItem[]>(MOCK_BLACKLIST);
  const [loading, setLoading] = useState(false);
  const [votingId, setVotingId] = useState<string | null>(null);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('化妆品');
  const [newItemReason, setNewItemReason] = useState('超出件数限制');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchBlacklist = async () => {
    if (!isSupabaseConfigured()) {
        // Sort mock data just in case
        setItems(prev => [...prev].sort((a, b) => b.confiscatedCountToday - a.confiscatedCountToday)
          .map((item, index) => ({...item, rank: index + 1})));
        return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('blacklist_items')
        .select('*')
        .order('confiscated_count_today', { ascending: false }); // Real dynamic sorting

      if (error) throw error;

      if (data && data.length > 0) {
        const mapped: BlacklistItem[] = data.map((item: any, index: number) => ({
          id: item.id,
          rank: index + 1, // Recalculate rank based on sort order
          name: item.name,
          category: item.category,
          reason: item.reason,
          confiscatedCountToday: item.confiscated_count_today
        }));
        setItems(mapped);
      }
    } catch (err) {
      console.error("Failed to fetch blacklist:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlacklist();
    // Poll for updates every 10s
    const interval = setInterval(fetchBlacklist, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleWitness = async (item: BlacklistItem) => {
    if (votingId) return; // Prevent double clicks
    setVotingId(item.id);

    // 1. Optimistic UI Update
    const newCount = item.confiscatedCountToday + 1;
    const updatedItems = items.map(i => 
        i.id === item.id ? { ...i, confiscatedCountToday: newCount } : i
    ).sort((a, b) => b.confiscatedCountToday - a.confiscatedCountToday)
     .map((i, idx) => ({ ...i, rank: idx + 1 }));

    setItems(updatedItems);

    if (!isSupabaseConfigured()) {
        setTimeout(() => {
            alert("模拟模式：上报成功！感谢您的情报。");
            setVotingId(null);
        }, 500);
        return;
    }

    // 2. Real DB Update via RPC
    try {
        const { error } = await supabase.rpc('increment_blacklist_count', { 
            row_id: item.id 
        });
            
        if (error) throw error;
    } catch (e) {
        console.error("Vote failed", e);
        alert("上报失败，请检查网络");
        fetchBlacklist();
    } finally {
        setTimeout(() => setVotingId(null), 2000);
    }
  };

  const handleSubmitNewItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    setIsSubmitting(true);

    if (!isSupabaseConfigured()) {
        setTimeout(() => {
            alert("模拟模式：新条目已提交，审核通过后将上榜。");
            setIsSubmitting(false);
            setShowAddModal(false);
            setNewItemName('');
        }, 800);
        return;
    }

    try {
        const { error } = await supabase.from('blacklist_items').insert({
            name: newItemName.trim(), 
            category: newItemCategory,
            reason: newItemReason,
            confiscated_count_today: 1
        });
        
        if (error) throw error;
        
        // alert("提交成功！");
        await fetchBlacklist();
        setShowAddModal(false);
        setNewItemName('');
        // Reset defaults
        setNewItemCategory('化妆品');
        setNewItemReason('超出件数限制');

    } catch (e) {
        console.error("Insert failed", e);
        alert("提交失败，请稍后再试。");
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 pb-24 bg-gray-50 min-h-full">
      <div className="mb-6">
        <div className="flex justify-between items-end mb-2">
            <h1 className="text-2xl font-bold text-gray-800">☠️ 今日离岛黑榜</h1>
            {loading && <span className="text-xs text-teal-600 animate-pulse">实时更新中...</span>}
        </div>
        <p className="text-sm text-gray-500">
            基于实时数据，<span className="font-bold text-red-500">{items.reduce((acc, cur) => acc + cur.confiscatedCountToday, 0)}</span> 件物品今日已被“扣下”。
        </p>
      </div>

      <div className="space-y-4">
        {items.map((item) => (
          <div 
            key={item.id} 
            className={`relative bg-white rounded-xl shadow-sm border transition-all duration-300 overflow-hidden
                ${item.rank === 1 ? 'border-red-200 shadow-red-100 scale-[1.02] mb-6' : 'border-gray-100 hover:shadow-md'}
            `}
          >
            {/* Top 1 Special Banner */}
            {item.rank === 1 && (
                <div className="bg-red-500 text-white text-xs font-bold text-center py-1">
                    👑 今日“榜一大哥” - 严查对象
                </div>
            )}

            <div className="p-4 flex items-center">
                {/* Rank Badge */}
                <div className={`
                w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl mr-4 shrink-0 shadow-inner transform rotate-3
                ${item.rank === 1 ? 'bg-gradient-to-br from-red-100 to-red-200 text-red-600 ring-2 ring-red-100' : 
                    item.rank === 2 ? 'bg-orange-100 text-orange-600' : 
                    item.rank === 3 ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-400'}
                `}>
                {item.rank}
                </div>
                
                <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                        <h3 className={`font-bold truncate ${item.rank === 1 ? 'text-lg text-gray-900' : 'text-gray-800'}`}>
                            {item.name}
                        </h3>
                        {item.rank <= 3 && <span className="animate-pulse text-xs">🔥</span>}
                    </div>
                    <div className="flex items-center space-x-2 text-xs">
                        <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">{item.category}</span>
                        <span className="text-red-500 bg-red-50 px-1.5 py-0.5 rounded truncate max-w-[120px]">
                            {item.reason}
                        </span>
                    </div>
                </div>

                <div className="ml-2 flex flex-col items-end space-y-2">
                    <div className="text-center">
                        <div className="font-black text-gray-800 text-xl leading-none">{item.confiscatedCountToday}</div>
                        <div className="text-[10px] text-gray-400">今日被扣</div>
                    </div>
                    
                    <button 
                        onClick={() => handleWitness(item)}
                        disabled={votingId !== null}
                        className={`text-xs px-2 py-1.5 rounded-lg font-bold flex items-center space-x-1 transition-all
                            ${item.rank === 1 
                                ? 'bg-red-600 text-white hover:bg-red-700 active:scale-95 shadow-red-200 shadow-lg' 
                                : 'bg-teal-50 text-teal-700 hover:bg-teal-100 active:scale-95 border border-teal-100'}
                            ${votingId === item.id ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                    >
                        <span>👀</span>
                        <span>{votingId === item.id ? '已上报' : '我也看到了'}</span>
                    </button>
                </div>
            </div>
            
            {/* Progress Bar visual for relative frequency */}
            <div className="h-1 w-full bg-gray-50">
                 <div 
                    className={`h-full ${item.rank === 1 ? 'bg-red-500' : item.rank <= 3 ? 'bg-orange-400' : 'bg-teal-400'} opacity-30`} 
                    style={{ width: `${Math.min(100, (item.confiscatedCountToday / (items[0]?.confiscatedCountToday || 1)) * 100)}%` }}
                 ></div>
            </div>
          </div>
        ))}
      </div>

      {/* Floating Action Button for New Reports */}
      <button 
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-24 right-4 bg-gray-900 text-white p-4 rounded-full shadow-2xl hover:bg-gray-800 active:scale-90 transition-all z-40 flex items-center justify-center group"
      >
        <svg className="w-6 h-6 group-hover:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
      </button>

      {/* Add New Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl animate-scale-in overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">曝光新“刺客” 🥷</h3>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              
              <form onSubmit={handleSubmitNewItem}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">物品名称</label>
                    <input 
                      type="text" 
                      required
                      placeholder="如：LAMER 面霜"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
                    <div className="grid grid-cols-3 gap-2">
                        {['化妆品', '电子', '酒类', '手机', '箱包', '其他'].map(cat => (
                            <button
                                type="button"
                                key={cat}
                                onClick={() => setNewItemCategory(cat)}
                                className={`text-xs py-2 rounded-lg border transition-all ${
                                    newItemCategory === cat 
                                    ? 'bg-teal-50 border-teal-500 text-teal-700 font-bold' 
                                    : 'bg-white border-gray-200 text-gray-600'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">被扣/警告原因</label>
                    <select
                        value={newItemReason}
                        onChange={(e) => setNewItemReason(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm"
                    >
                        <option value="超出件数限制">超出件数限制 (如: >30件)</option>
                        <option value="超出10万额度">超出10万年度额度</option>
                        <option value="疑似代购倒卖">疑似代购/倒卖 (量大)</option>
                        <option value="未拆封/未激活">未拆封/未激活 (手机等)</option>
                        <option value="禁止携带">完全禁止携带</option>
                        <option value="其他原因">其他原因</option>
                    </select>
                  </div>
                </div>

                <div className="mt-6">
                    <button 
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-gray-800 active:scale-95 transition-all disabled:opacity-70 disabled:scale-100"
                    >
                        {isSubmitting ? '正在提交...' : '确认曝光 ( +1 )'}
                    </button>
                </div>
              </form>
            </div>
            <div className="bg-gray-50 px-6 py-3 text-xs text-gray-500 text-center border-t border-gray-100">
                恶意提交虚假信息将被封号
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 p-4 bg-white border border-gray-200 rounded-xl text-center shadow-sm">
        <p className="text-gray-400 text-xs mb-2">
          数据来源于旅客实时众包上报
        </p>
        <div className="text-xs text-gray-500 bg-gray-100 inline-block px-3 py-1 rounded-full">
            合规离岛，拒绝“人肉代购”
        </div>
      </div>
    </div>
  );
};