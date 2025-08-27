'use client';

import React, { useEffect, useState } from 'react';

interface IndexItem {
  id: string;
  title: string;
  icon: string;
}

const indexItems: IndexItem[] = [
  { id: 'media-search', title: '미디어 검색', icon: '🔍' },
  { id: 'first-assessment', title: '1차 중대성 평가 결과', icon: '📑' },
  { id: 'survey-upload', title: '설문 대상 업로드', icon: '📊' },
  { id: 'survey-management', title: '설문 관리', icon: '📝' },
  { id: 'survey-results', title: '설문 결과 확인', icon: '📊' },
  { id: 'final-issuepool', title: '최종 이슈풀 확인하기', icon: '📋' },
];

export default function IndexBar() {
  const [activeSection, setActiveSection] = useState('');

  // 스크롤 위치에 따라 현재 섹션 업데이트
  useEffect(() => {
    const handleScroll = () => {
      const sections = indexItems.map(item => {
        const element = document.getElementById(item.id);
        if (element) {
          const rect = element.getBoundingClientRect();
          return {
            id: item.id,
            distance: Math.abs(rect.top),
          };
        }
        return null;
      }).filter(Boolean);

      const closest = sections.reduce((prev, curr) => {
        return prev?.distance < curr?.distance ? prev : curr;
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
    const element = document.getElementById(id);
    if (element) {
      const offset = element.offsetTop - 20; // 여유 공간
      window.scrollTo({
        top: offset,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="fixed left-4 top-1/2 transform -translate-y-1/2 z-50">
      <div className="bg-white rounded-xl shadow-lg p-2">
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
    </div>
  );
}
