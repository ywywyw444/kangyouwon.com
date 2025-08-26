'use client';

import React from 'react';
import NavigationTabs from '@/component/NavigationTabs';

export default function DashboardPage() {
  const handleButtonClick = (action: string) => {
    console.log(`${action} 버튼 클릭됨`);
    // 여기에 각 버튼별 동작 로직 추가
  };

  return (
    <div className="min-h-screen bg-white">
      {/* 상단 내비게이션 바 */}
      <NavigationTabs />

      {/* 메인 콘텐츠 영역 - 주황색 테두리 */}
      <div className="max-w-7xl mx-auto p-6 pt-20">
        <div className="border-4 border-orange-400 rounded-xl p-8 bg-orange-50">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Dashboard Page
            </h1>
            <p className="text-gray-600">
              기업 지속가능성 관리 대시보드
            </p>
          </div>

          {/* 수직 버튼들 */}
          <div className="w-full max-w-md mx-auto space-y-4">
            {/* 기업명 버튼 */}
            <button
              onClick={() => handleButtonClick('기업명')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg border border-black transition-colors duration-200 shadow-md"
            >
              기업명
            </button>

            {/* 재무정보(표) 버튼 */}
            <button
              onClick={() => handleButtonClick('재무정보')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 px-6 rounded-lg border border-black transition-colors duration-200 shadow-md"
            >
              재무정보(표)
            </button>

            {/* 중대성평가 결과 버튼 */}
            <button
              onClick={() => handleButtonClick('중대성평가')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 px-6 rounded-lg border border-black transition-colors duration-200 shadow-md"
            >
              중대성평가 결과
            </button>

            {/* GRI 보고서 작성 결과 버튼 */}
            <button
              onClick={() => handleButtonClick('GRI보고서')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 px-6 rounded-lg border border-black transition-colors duration-200 shadow-md"
            >
              GRI 보고서 작성 결과
            </button>

            {/* TCFD보고서 작성 결과 버튼 */}
            <button
              onClick={() => handleButtonClick('TCFD보고서')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 px-6 rounded-lg border border-black transition-colors duration-200 shadow-md"
            >
              TCFD보고서 작성 결과
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
