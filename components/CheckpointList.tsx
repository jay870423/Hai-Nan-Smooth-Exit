import React, { useState, useEffect } from 'react';
import { PortData, PortStatus } from '../types';
import { ReportModal } from './ReportModal';
import { UserGuide } from './UserGuide';
import { supabase, isSupabaseConfigured } from '../services/supabase';

// Initial state is empty to prevent flashing mock data when connected
const INITIAL_PORTS: PortData[] = [];

// Fallback data only used if connection fails explicitly
// Added lat/lng for Geolocation features
const MOCK_PORTS: PortData[] = [
  { id: '1', name: '海口美兰机场', location: 'T2 国内出发', status: 'RED', waitTimeMinutes: 45, strictnessScore: 9, lastUpdated: '1分钟前', reportCount: 128, trafficStatus: 'YELLOW', trafficDescription: '行车缓慢', lat: 19.9388, lng: 110.4589 },
  { id: '2', name: '三亚凤凰机场', location: '安检口 B', status: 'YELLOW', waitTimeMinutes: 20, strictnessScore: 6, lastUpdated: '5分钟前', reportCount: 84, trafficStatus: 'GREEN', trafficDescription: '道路畅通', lat: 18.3039, lng: 109.4124 },
  { id: '3', name: '新海港（轮渡）', location: '小车安检通道', status: 'GREEN', waitTimeMinutes: 5, strictnessScore: 3, lastUpdated: '刚刚', reportCount: 342, trafficStatus: 'GREEN', trafficDescription: '道路畅通', lat: 20.0536, lng: 110.1554 },
];

export const CheckpointList: React.FC = () => {
  const [ports, setPorts] = useState<PortData[]>(INITIAL_PORTS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Fetch Data
  const fetchData = async (isBackground = false) => {
    // If Supabase not configured, use mock
    if (!isSupabaseConfigured()) {
        console.warn("Supabase not configured. Using Mock Data.");
        setPorts(MOCK_PORTS);
        setLoading(false);
        return; 
    }

    try {
      if (!isBackground) setLoading(true);
      
      // A. Fetch Port Status from Supabase (Database View)
      const { data: dbData, error } = await supabase
        .from('checkpoint_status_view')
        .select('*');

      if (error) throw error;

      if (!dbData || dbData.length === 0) {
          // If DB is empty (rare), maybe show empty state or mock
          if (!isBackground) setLoading(false);
          return;
      }

      // B. Process each port: Convert to PortData AND Fetch Traffic
      const promises = dbData.map(async (item: any) => {
          let trafficStatus: PortStatus = 'GREEN';
          let trafficDesc = ''; // Default empty instead of 'Detecting...'

          // Call our Next.js/Vercel API route for Baidu Traffic
          if (item.lat && item.lng) {
              trafficDesc = '检测中...';
              try {
                  // Add simple timeout to prevent hanging
                  const controller = new AbortController();
                  const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

                  const trafficRes = await fetch(`/api/baidu-traffic?lat=${item.lat}&lng=${item.lng}`, {
                      signal: controller.signal
                  });
                  clearTimeout(timeoutId);

                  if (trafficRes.ok) {
                      const trafficJson = await trafficRes.json();
                      trafficStatus = trafficJson.trafficStatus as PortStatus;
                      trafficDesc = trafficJson.description;
                  } else {
                      // Handle 404 (Local dev) or 500 errors gracefully
                      console.warn(`Traffic API Error ${trafficRes.status} for ${item.name}`);
                      trafficDesc = '暂无路况';
                  }
              } catch (e) {
                  console.warn(`Traffic fetch failed for ${item.name}`, e);
                  trafficDesc = "数据暂缺";
              }
          }

          // Determine Overall Status & Strictness Logic
          const userReportStatus = (item.most_reported_status as PortStatus) || 'GREEN';
          const waitTime = item.avg_wait_time || 0;
          
          // Dynamic Strictness Calculation
          // Base: 5
          // +3 if Red, +1 if Yellow
          // +1 if Wait > 30, +2 if Wait > 60
          // -1 if Green
          let strictness = 5;
          if (userReportStatus === 'RED') strictness += 3;
          if (userReportStatus === 'YELLOW') strictness += 1;
          if (userReportStatus === 'GREEN') strictness -= 1;
          if (waitTime > 30) strictness += 1;
          if (waitTime > 60) strictness += 1;
          
          // Clamp between 1 and 10
          strictness = Math.max(1, Math.min(10, strictness));

          let finalStatus = userReportStatus;
          if (trafficStatus === 'RED') finalStatus = 'RED'; // Traffic jam overrides

          return {
            id: item.id,
            name: item.name,
            location: item.location,
            status: finalStatus,
            waitTimeMinutes: waitTime,
            strictnessScore: strictness,
            lastUpdated: item.last_report_time ? formatTimeAgo(item.last_report_time) : '暂无数据',
            reportCount: item.report_count || 0,
            lat: item.lat,
            lng: item.lng,
            trafficStatus: trafficStatus,
            trafficDescription: trafficDesc
          } as PortData;
      });

      const mergedPorts = await Promise.all(promises);
      
      // Sort by status severity (RED first)
      mergedPorts.sort((a, b) => {
          const score = (s: string) => s === 'RED' ? 3 : s === 'YELLOW' ? 2 : 1;
          return score(b.status) - score(a.status);
      });

      setPorts(mergedPorts);

    } catch (err) {
      console.error("Failed to fetch data:", err);
      if (!isBackground) {
          setNotification("获取实时数据失败，显示离线数据");
          setPorts(MOCK_PORTS);
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Poll every 15 seconds to keep data fresh and sync after submissions
    const interval = setInterval(() => fetchData(true), 15000); 
    return () => clearInterval(interval);
  }, []);

  const handleReportSubmit = async (portId: string, status: PortStatus, waitTime: number) => {
    if (!isSupabaseConfigured()) {
      setNotification("演示模式：上报成功");
      setIsModalOpen(false);
      return;
    }

    setIsSubmitting(true);
    setNotification("正在同步数据...");

    try {
      const { error } = await supabase.from('reports').insert({
        checkpoint_id: portId,
        status: status,
        wait_time_minutes: waitTime,
      });

      if (error) throw error;

      setNotification("上报成功！感谢您的情报。");
      
      // Refresh immediately to show the new count and averages
      await fetchData(true);
      
      setIsModalOpen(false);

    } catch (error) {
      console.error("Report failed:", error);
      setNotification("上报失败，请稍后重试");
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleShare = async (port: PortData) => {
    const statusText = getStatusText(port.status);
    const trafficText = port.trafficDescription || '未知';
    const text = `【海南丝滑离岛】${port.name} 实时情报：\n当前状态：${statusText}！\n严查指数：${port.strictnessScore}/10，预计等待 ${port.waitTimeMinutes} 分钟。\n周边路况：${trafficText}。\n\n快来看看：${window.location.origin}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: '海南丝滑离岛情报',
          text: text,
          url: window.location.href
        });
      } catch (err) {
        // User cancelled, ignore
        console.debug('Share cancelled');
      }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        setNotification('情报已复制，快发给朋友吧！');
        setTimeout(() => setNotification(null), 3000);
      } catch (err) {
        setNotification('复制失败，请截图分享');
        setTimeout(() => setNotification(null), 3000);
      }
    }
  };

  const formatTimeAgo = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    return '1小时前';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RED': return 'bg-red-500 shadow-red-200';
      case 'YELLOW': return 'bg-yellow-500 shadow-yellow-200';
      case 'GREEN': return 'bg-green-500 shadow-green-200';
      default: return 'bg-gray-400';
    }
  };

  const getTrafficColor = (status?: string) => {
      switch(status) {
          case 'RED': return 'text-red-600 bg-red-50';
          case 'YELLOW': return 'text-yellow-600 bg-yellow-50';
          case 'GREEN': return 'text-green-600 bg-green-50';
          default: return 'text-gray-400 bg-gray-50';
      }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'RED': return '拥堵/严查';
      case 'YELLOW': return '一般';
      case 'GREEN': return '丝滑畅通';
      default: return '未知';
    }
  };

  return (
    <div className="p-4 space-y-6 pb-24 relative">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-full text-sm shadow-xl z-[70] animate-fade-in-down transition-all">
          {notification}
        </div>
      )}

      {/* Header Area */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">查验红绿灯</h1>
          <div className="flex items-center space-x-2">
             <span className="relative flex h-2 w-2">
               <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${loading ? 'bg-blue-400' : 'bg-teal-400'}`}></span>
               <span className={`relative inline-flex rounded-full h-2 w-2 ${loading ? 'bg-blue-500' : 'bg-teal-500'}`}></span>
             </span>
             <p className="text-sm text-gray-500">
               {isSupabaseConfigured() ? (loading ? '数据同步中...' : '实时众包 + 百度路况') : '未连接数据库'}
             </p>
          </div>
        </div>
        
        {/* Help Button (Entry for User Guide) */}
        <button 
           onClick={() => setIsGuideOpen(true)}
           className="flex items-center space-x-1 bg-white border border-gray-200 px-3 py-1.5 rounded-full shadow-sm active:scale-95 transition-all mb-1"
        >
           <span className="text-lg">📖</span>
           <span className="text-xs font-bold text-gray-600">操作手册</span>
        </button>
      </div>

      <div className="grid gap-4">
        {loading && ports.length === 0 ? (
          // Skeleton Loader
          [1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 h-32 animate-pulse">
               <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
               <div className="h-3 bg-gray-100 rounded w-1/2"></div>
            </div>
          ))
        ) : (
          ports.map((port) => (
            <div key={port.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 relative overflow-hidden transition-all duration-300 group">
               {/* Status Bar */}
              <div className={`absolute top-0 left-0 bottom-0 w-2 ${getStatusColor(port.status)}`}></div>
              
              <div className="pl-4 flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex justify-between items-start pr-2">
                     <h3 className="text-lg font-bold text-gray-800">{port.name}</h3>
                     <span className="text-xs text-gray-400 whitespace-nowrap">{port.lastUpdated}更新</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{port.location}</p>
                  
                  {/* Status Badges & Actions */}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                     {/* Overall Status */}
                     <div className={`text-xs font-bold text-white px-2 py-1 rounded-md ${getStatusColor(port.status).split(' ')[0]}`}>
                       {getStatusText(port.status)}
                     </div>
                     
                     {/* Wait Time */}
                     <span className="text-sm text-gray-600 font-medium bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                       预计 {port.waitTimeMinutes} 分钟
                     </span>
  
                     {/* Real-time Traffic Badge */}
                     {port.trafficDescription && (
                        <span className={`text-xs font-medium px-2 py-1 rounded-md border border-transparent ${getTrafficColor(port.trafficStatus)}`}>
                          🚦 {port.trafficDescription}
                        </span>
                     )}
                     
                     {/* Share Button */}
                     <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShare(port);
                        }}
                        className="ml-auto sm:ml-0 flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded-md text-xs font-bold active:bg-blue-100 hover:bg-blue-100 transition-colors border border-blue-100"
                        title="分享实时情报"
                     >
                       <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                       分享
                     </button>
                  </div>
                </div>
                
                <div className="flex flex-col items-end border-l border-gray-100 pl-4 ml-2 min-w-[70px]">
                   <div className="text-[10px] text-gray-400 mb-1 text-center">严查指数</div>
                   <div className={`text-2xl font-black ${
                       port.strictnessScore >= 8 ? 'text-red-500' : 
                       port.strictnessScore >= 5 ? 'text-yellow-600' : 'text-green-500'
                   }`}>
                     {port.strictnessScore}<span className="text-xs text-gray-400 font-normal">/10</span>
                   </div>
                   <div className="text-[10px] text-teal-600 mt-2 bg-teal-50 px-1.5 py-0.5 rounded-full flex items-center justify-center w-full">
                      {port.reportCount}人上报
                   </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-6 bg-gradient-to-r from-teal-50 to-blue-50 rounded-xl p-5 border border-teal-100 text-center shadow-inner">
        <p className="text-teal-800 font-medium text-sm mb-3">现场排队太长？或者丝滑秒过？</p>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full bg-teal-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-teal-700 active:scale-95 transition-all flex items-center justify-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
          <span>我也是现场哨兵 (上报)</span>
        </button>
      </div>

      <ReportModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        ports={ports}
        onSubmit={handleReportSubmit}
        isSubmitting={isSubmitting}
      />
      
      <UserGuide 
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
};