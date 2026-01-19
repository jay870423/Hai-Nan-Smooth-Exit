import React, { useState, useEffect } from 'react';
import { PortData, PortStatus } from '../types';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  ports: PortData[];
  onSubmit: (portId: string, status: PortStatus, waitTime: number) => Promise<void>;
  isSubmitting: boolean;
}

// Haversine formula to calculate distance (in km) between two coordinates
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2 - lat1);
  var dLon = deg2rad(lon2 - lon1);
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

export const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, ports, onSubmit, isSubmitting }) => {
  const [selectedPortId, setSelectedPortId] = useState<string>('');
  const [status, setStatus] = useState<PortStatus>('GREEN');
  const [waitTime, setWaitTime] = useState<number>(5);

  // Geolocation states
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string>('');
  const [nearestDistance, setNearestDistance] = useState<number | null>(null);

  // Init default selection when ports load
  useEffect(() => {
    if (ports.length > 0 && !selectedPortId) {
      setSelectedPortId(ports[0].id);
    }
  }, [ports]);

  // Handle Geolocation logic
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setLocationStatus('您的浏览器不支持定位');
      return;
    }

    setIsLocating(true);
    setLocationStatus('正在获取位置...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;

        let minDistance = Infinity;
        let nearestPortId = '';

        ports.forEach(port => {
            // Only calculate if port has coordinates
            if (port.lat && port.lng) {
                const dist = getDistanceFromLatLonInKm(userLat, userLng, port.lat, port.lng);
                if (dist < minDistance) {
                    minDistance = dist;
                    nearestPortId = port.id;
                }
            }
        });

        setIsLocating(false);

        if (nearestPortId && minDistance !== Infinity) {
            setSelectedPortId(nearestPortId);
            const distStr = minDistance < 1 ? `${(minDistance * 1000).toFixed(0)}m` : `${minDistance.toFixed(1)}km`;
            setNearestDistance(minDistance);
            setLocationStatus(`已定位: 距离最近关口 ${distStr}`);
        } else {
            setLocationStatus('定位成功，但附近没有已知关口');
        }
      },
      (error) => {
        setIsLocating(false);
        console.error("Geolocation error:", error.code, error.message);
        
        // Use numeric codes for constants: 
        // 1: PERMISSION_DENIED
        // 2: POSITION_UNAVAILABLE
        // 3: TIMEOUT
        switch(error.code) {
            case 1:
                setLocationStatus('请允许获取位置信息');
                break;
            case 2:
                setLocationStatus('位置信息不可用');
                break;
            case 3:
                setLocationStatus('定位超时');
                break;
            default:
                setLocationStatus(`定位失败: ${error.message}`);
        }
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  if (!isOpen) return null;

  const handleSubmit = async () => {
    await onSubmit(selectedPortId, status, waitTime);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl animate-slide-up">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-800">我是现场哨兵 👮</h3>
          <button 
            onClick={onClose} 
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 1. Select Port */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
             <label className="block text-sm font-medium text-gray-600">您当前在哪里？</label>
             <button 
                onClick={handleLocateMe}
                disabled={isLocating}
                className="text-xs flex items-center text-teal-600 font-bold bg-teal-50 px-2 py-1 rounded-lg hover:bg-teal-100 transition-colors"
             >
                {isLocating ? (
                   <span className="animate-pulse">定位中...</span>
                ) : (
                   <>
                     <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                     定位当前位置
                   </>
                )}
             </button>
          </div>
          
          <select 
            value={selectedPortId}
            onChange={(e) => {
                setSelectedPortId(e.target.value);
                setNearestDistance(null); // Clear auto-detected status if manual change
                setLocationStatus(''); 
            }}
            disabled={isSubmitting}
            className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-teal-500 focus:border-teal-500 block p-3 disabled:opacity-70 transition-shadow"
          >
            {ports.map(port => (
              <option key={port.id} value={port.id}>{port.name} ({port.location})</option>
            ))}
          </select>
          
          {locationStatus && (
             <div className={`text-xs mt-2 px-2 py-1 rounded flex items-center ${locationStatus.includes('已定位') ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-600'}`}>
                {locationStatus.includes('已定位') && <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                {locationStatus}
             </div>
          )}
        </div>

        {/* 2. Select Status */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-600 mb-2">现场拥堵情况</label>
          <div className="grid grid-cols-3 gap-3">
            <button 
              onClick={() => setStatus('GREEN')}
              disabled={isSubmitting}
              className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${
                status === 'GREEN' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-100 text-gray-500'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-green-500 mb-1"></div>
              <span className="text-xs font-bold">丝滑秒过</span>
            </button>
            <button 
              onClick={() => setStatus('YELLOW')}
              disabled={isSubmitting}
              className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${
                status === 'YELLOW' ? 'border-yellow-500 bg-yellow-50 text-yellow-700' : 'border-gray-100 text-gray-500'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-yellow-500 mb-1"></div>
              <span className="text-xs font-bold">排队中</span>
            </button>
            <button 
              onClick={() => setStatus('RED')}
              disabled={isSubmitting}
              className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${
                status === 'RED' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-100 text-gray-500'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-red-500 mb-1"></div>
              <span className="text-xs font-bold">严查拥堵</span>
            </button>
          </div>
        </div>

        {/* 3. Wait Time Slider */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            <label className="text-sm font-medium text-gray-600">预估等待时间</label>
            <span className="text-teal-600 font-bold">{waitTime} 分钟</span>
          </div>
          <input 
            type="range" 
            min="0" 
            max="120" 
            step="5"
            value={waitTime}
            onChange={(e) => setWaitTime(Number(e.target.value))}
            disabled={isSubmitting}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600 disabled:opacity-50"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>0分</span>
            <span>2小时+</span>
          </div>
        </div>

        <button 
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full bg-teal-600 text-white font-bold py-3.5 rounded-xl shadow-lg hover:bg-teal-700 active:scale-95 transition-all flex items-center justify-center disabled:bg-teal-400 disabled:scale-100 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              正在上报...
            </>
          ) : (
            '提交上报'
          )}
        </button>
        <p className="text-center text-xs text-gray-400 mt-3">感谢您的贡献，您的情报将帮助数万游客。</p>
      </div>
    </div>
  );
};