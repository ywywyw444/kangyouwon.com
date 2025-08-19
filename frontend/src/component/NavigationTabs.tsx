'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Logout from './Logout';

export default function NavigationTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const [isCustomDomain, setIsCustomDomain] = useState(false);
  
  useEffect(() => {
    // 커스텀 도메인인지 확인
    const hostname = window.location.hostname;
    const isCustom = !hostname.includes('vercel.app') && !hostname.includes('localhost');
    setIsCustomDomain(isCustom);
  }, []);
  
  // 현재 경로에 따라 활성 탭 결정
  const getActiveTab = () => {
    if (pathname.startsWith('/materiality')) return 'materiality';
    if (pathname.startsWith('/gri')) return 'gri';
    if (pathname.startsWith('/esrs')) return 'esrs';
    if (pathname.startsWith('/gri/report')) return 'report';
    return 'dashboard';
  };

  const [activeTab, setActiveTab] = useState(getActiveTab());

  const navigationTabs = [
    { id: 'dashboard', name: 'Dashboard', path: '/dashboard', color: 'bg-orange-500' },
    { id: 'materiality', name: 'Materiality', path: '/materiality', color: 'bg-blue-500' },
    { id: 'gri', name: 'GRI', path: '/gri/intake', color: 'bg-blue-500' },
    { id: 'esrs', name: 'ESRS', path: '/esrs/intake', color: 'bg-blue-500' },
    { id: 'report', name: 'Report', path: '/gri/report', color: 'bg-blue-500' }
  ];

  const handleTabClick = (tab: typeof navigationTabs[0]) => {
    setActiveTab(tab.id);
    
    if (isCustomDomain) {
      // 커스텀 도메인에서는 window.location.href 사용
      window.location.href = tab.path;
    } else {
      // Vercel 도메인에서는 Next.js router 사용
      router.push(tab.path);
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center">
          <nav className="flex space-x-1" aria-label="Tabs">
            {navigationTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab)}
                className={`px-6 py-4 text-sm font-medium rounded-t-lg transition-all duration-200 ${
                  activeTab === tab.id
                    ? `${tab.color} text-white shadow-lg`
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
          
          {/* 로그아웃 버튼 */}
          <div className="flex items-center">
            <Logout variant="button" className="ml-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
