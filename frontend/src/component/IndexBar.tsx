'use client';

import React, { useEffect, useState } from 'react';

interface IndexItem {
  id: string;
  title: string;
  icon: string;
}

const indexItems: IndexItem[] = [
  { id: 'media-search', title: '미디어 검색', icon: '🔍' },
  { id: 'middle-issuepool', title: '1차 중대성 평가 결과', icon: '📑' },
  { id: 'survey-create', title: '설문 생성', icon: '✅' },
  { id: 'survey-upload', title: '설문 대상 업로드', icon: '📊' },
  { id: 'survey-send', title: '설문 발송', icon: '📝' },
  { id: 'survey-results', title: '설문 결과 확인', icon: '📊' },
  { id: 'final-issuepool', title: '최종 이슈풀 확인하기', icon: '📋' },
];

export default function IndexBar() {
  const [activeSection, setActiveSection] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [visibleSection, setVisibleSection] = useState('media-search'); // 기본적으로 미디어 검색 섹션 표시

  // 스크롤 위치에 따라 현재 섹션 업데이트
  useEffect(() => {
    const handleScroll = () => {
      interface Section {
        id: string;
        distance: number;
      }

      const sections = indexItems.map(item => {
        const element = document.getElementById(item.id);
        if (element) {
          const rect = element.getBoundingClientRect();
          return {
            id: item.id,
            distance: Math.abs(rect.top),
          } as Section;
        }
        return null;
      }).filter((section): section is Section => section !== null);

      const closest = sections.reduce((prev, curr) => {
        return prev.distance < curr.distance ? prev : curr;
      });

      if (closest) {
        setActiveSection(closest.id);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // 초기 로드 시 실행

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // 섹션으로 스크롤
  const scrollToSection = (id: string) => {
    // 섹션 표시 상태 변경
    setVisibleSection(id);
    
    // 다른 컴포넌트에서도 섹션 변경을 감지할 수 있도록 커스텀 이벤트 발생
    const sectionChangeEvent = new CustomEvent('sectionChange', { detail: { sectionId: id } });
    window.dispatchEvent(sectionChangeEvent);
    
    // 기존 스크롤 기능 유지
    const element = document.getElementById(id);
    if (element) {
      const navbarHeight = 64; // 네비게이션 바 높이
      const additionalOffset = 80; // 추가 여유 공간
      const offset = element.offsetTop - navbarHeight - additionalOffset; // 네비게이션 바 높이와 여유 공간 고려
      window.scrollTo({
        top: offset,
        behavior: 'smooth',
      });
    }
  };

  // 토글 기능
  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  return (
    <>
      {/* 기존 사이드바 (숨김 처리) */}
      <div className="hidden">
        <div className="fixed left-8 top-1/2 transform -translate-y-1/2 z-50">
          {isMinimized ? (
            // 최소화된 상태 - 작은 토글 버튼만 표시
            <button
              onClick={toggleMinimize}
              className="bg-white rounded-xl shadow-lg p-3 border border-gray-200 hover:bg-gray-50 transition-colors duration-200"
              title="인덱스 바 열기"
            >
              <span className="text-lg">📋</span>
            </button>
          ) : (
            // 확장된 상태 - 전체 인덱스 바 표시
            <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-200 min-w-[200px]">
              {/* 헤더와 토글 버튼 */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-700">빠른 이동</h3>
                <button
                  onClick={toggleMinimize}
                  className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  title="인덱스 바 최소화"
                >
                  <span className="text-lg">−</span>
                </button>
              </div>
              
              {/* 인덱스 아이템들 */}
              <div className="space-y-2">
                {indexItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className={`flex items-center w-full px-4 py-2 text-left rounded-lg transition-colors duration-200 ${
                      activeSection === item.id
                        ? 'bg-purple-100 text-purple-800'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <span className="mr-2">{item.icon}</span>
                    <span className="text-sm whitespace-nowrap">{item.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 새로운 가로 탭 네비게이션 */}
      <div className="bg-blue-50 border-b border-gray-200 shadow-sm sticky top-20 z-30">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center space-x-1 overflow-x-auto scrollbar-hide px-6 py-3">
            {indexItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 whitespace-nowrap ${
                  visibleSection === item.id
                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <span className="mr-2">{item.icon}</span>
                <span>{item.title}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}