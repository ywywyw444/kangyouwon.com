'use client';

import React, { useState } from 'react';
import NavigationTabs from '@/component/NavigationTabs';

interface SurveyItem {
  id: string;
  title: string;
  description?: string;
  outsideScore: number | null;
  insideScore: number | null;
}

export default function SurveyPage() {
  // 응답자 정보
  const [respondentType, setRespondentType] = useState<string>('');
  
  // 현재 단계
  const [currentStep, setCurrentStep] = useState<number>(1);
  
  // Environmental 섹션 상태
  const [environmentalItems, setEnvironmentalItems] = useState<SurveyItem[]>([
    {
      id: 'env1',
      title: 'Q1-1. 기후변화',
      description: '• 기후변화이(가) 회사의 재무성과(기회/위험)에 미치는 중요도는 어느 정도입니까? (Outside-in)\n• 기후변화에 대해 우리 회사 활동의 환경·사회 영향 중요도는 어느 정도입니까? (Inside-out)',
      outsideScore: null,
      insideScore: null
    },
    {
      id: 'env2',
      title: 'Q1-2. 탄소배출',
      description: '• 탄소배출이(가) 회사의 재무성과(기회/위험)에 미치는 중요도는 어느 정도입니까? (Outside-in)\n• 탄소배출에 대해 우리 회사 활동의 환경·사회 영향 중요도는 어느 정도입니까? (Inside-out)',
      outsideScore: null,
      insideScore: null
    },
    {
      id: 'env3',
      title: 'Q1-3. 대기오염',
      description: '• 대기오염이(가) 회사의 재무성과(기회/위험)에 미치는 중요도는 어느 정도입니까? (Outside-in)\n• 대기오염에 대해 우리 회사 활동의 환경·사회 영향 중요도는 어느 정도입니까? (Inside-out)',
      outsideScore: null,
      insideScore: null
    },
    {
      id: 'env4',
      title: 'Q1-4. 생물다양성/산림보호',
      description: '• 생물다양성/산림보호이(가) 회사의 재무성과(기회/위험)에 미치는 중요도는 어느 정도입니까? (Outside-in)\n• 생물다양성/산림보호에 대해 우리 회사 활동의 환경·사회 영향 중요도는 어느 정도입니까? (Inside-out)',
      outsideScore: null,
      insideScore: null
    },
    {
      id: 'env5',
      title: 'Q1-5. 폐기물/폐기물관리',
      description: '• 폐기물/폐기물관리이(가) 회사의 재무성과(기회/위험)에 미치는 중요도는 어느 정도입니까? (Outside-in)\n• 폐기물/폐기물관리와 관련하여 우리 회사 활동의 환경·사회 영향 중요도는 어느 정도입니까? (Inside-out)',
      outsideScore: null,
      insideScore: null
    },
    {
      id: 'env6',
      title: 'Q1-6. 에너지',
      description: '• 에너지가 회사의 재무성과(기회/위험)에 미치는 중요도는 어느 정도입니까? (Outside-in)\n• 에너지와 관련하여 우리 회사 활동의 환경·사회 영향 중요도는 어느 정도입니까? (Inside-out)',
      outsideScore: null,
      insideScore: null
    },
    {
      id: 'env7',
      title: 'Q1-7. 재생에너지',
      description: '• 재생에너지가 회사의 재무성과(기회/위험)에 미치는 중요도는 어느 정도입니까? (Outside-in)\n• 재생에너지에 대해 우리 회사 활동의 환경·사회 영향 중요도는 어느 정도입니까? (Inside-out)',
      outsideScore: null,
      insideScore: null
    },
    {
      id: 'env8',
      title: 'Q1-8. 자원순환/자원효율/원자재관리',
      description: '• 자원순환/자원효율/원자재관리이(가) 회사의 재무성과(기회/위험)에 미치는 중요도는 어느 정도입니까? (Outside-in)\n• 자원순환/자원효율/원자재관리에 대해 우리 회사 활동의 환경·사회 영향 중요도는 어느 정도입니까? (Inside-out)',
      outsideScore: null,
      insideScore: null
    },
    {
      id: 'env9',
      title: 'Q1-9. 온실가스',
      description: '• 온실가스가 회사의 재무성과(기회/위험)에 미치는 중요도는 어느 정도입니까? (Outside-in)\n• 온실가스와 관련하여 우리 회사 활동의 환경·사회 영향 중요도는 어느 정도입니까? (Inside-out)',
      outsideScore: null,
      insideScore: null
    },
    {
      id: 'env10',
      title: 'Q1-10. 원재료',
      description: '• 원재료가 회사의 재무성과(기회/위험)에 미치는 중요도는 어느 정도입니까? (Outside-in)\n• 원재료와 관련하여 우리 회사 활동의 환경·사회 영향 중요도는 어느 정도입니까? (Inside-out)',
      outsideScore: null,
      insideScore: null
    },
    {
      id: 'env11',
      title: 'Q1-11. 환경영향/환경오염/오염물질/유해화학물질',
      description: '• 환경영향/환경오염/오염물질/유해화학물질이(가) 회사의 재무성과(기회/위험)에 미치는 중요도는 어느 정도입니까? (Outside-in)\n• 환경영향/환경오염/오염물질/유해화학물질에 대해 우리 회사 활동의 환경·사회 영향 중요도는 어느 정도입니까? (Inside-out)',
      outsideScore: null,
      insideScore: null
    },
    {
      id: 'env12',
      title: 'Q1-12. 친환경',
      description: '• 친환경이(가) 회사의 재무성과(기회/위험)에 미치는 중요도는 어느 정도입니까? (Outside-in)\n• 친환경과 관련하여 우리 회사 활동의 환경·사회 영향 중요도는 어느 정도입니까? (Inside-out)',
      outsideScore: null,
      insideScore: null
    }
  ]);

  // Social 섹션 상태
  const [socialItems, setSocialItems] = useState<SurveyItem[]>([
    {
      id: 'soc1',
      title: 'Q2-1. 노사관계',
      description: '• 노사관계이(가) 회사의 재무성과(기회/위험)에 미치는 중요도는 어느 정도입니까? (Outside-in)\n• 노사관계와 관련하여 우리 회사 활동의 환경·사회 영향 중요도는 어느 정도입니까? (Inside-out)',
      outsideScore: null,
      insideScore: null
    },
    {
      id: 'soc2',
      title: 'Q2-2. 제품안전/제품품질',
      description: '• 제품안전/제품품질이(가) 회사의 재무성과(기회/위험)에 미치는 중요도는 어느 정도입니까? (Outside-in)\n• 제품안전/제품품질에 대해 우리 회사 활동의 환경·사회 영향 중요도는 어느 정도입니까? (Inside-out)',
      outsideScore: null,
      insideScore: null
    },
    {
      id: 'soc3',
      title: 'Q2-3. 고용/일자리',
      description: '• 고용/일자리이(가) 회사의 재무성과(기회/위험)에 미치는 중요도는 어느 정도입니까? (Outside-in)\n• 고용/일자리에 대해 우리 회사 활동의 환경·사회 영향 중요도는 어느 정도입니까? (Inside-out)',
      outsideScore: null,
      insideScore: null
    },
    {
      id: 'soc4',
      title: 'Q2-4. 공급망',
      description: '• 공급망이(가) 회사의 재무성과(기회/위험)에 미치는 중요도는 어느 정도입니까? (Outside-in)\n• 공급망과 관련하여 우리 회사 활동의 환경·사회 영향 중요도는 어느 정도입니까? (Inside-out)',
      outsideScore: null,
      insideScore: null
    },
    {
      id: 'soc5',
      title: 'Q2-5. 임금/인사제도',
      description: '• 임금/인사제도이(가) 회사의 재무성과(기회/위험)에 미치는 중요도는 어느 정도입니까? (Outside-in)\n• 임금/인사제도에 대해 우리 회사 활동의 환경·사회 영향 중요도는 어느 정도입니까? (Inside-out)',
      outsideScore: null,
      insideScore: null
    },
    {
      id: 'soc6',
      title: 'Q2-6. 임직원',
      description: '• 임직원이 회사의 재무성과(기회/위험)에 미치는 중요도는 어느 정도입니까? (Outside-in)\n• 임직원과 관련하여 우리 회사 활동의 환경·사회 영향 중요도는 어느 정도입니까? (Inside-out)',
      outsideScore: null,
      insideScore: null
    },
    {
      id: 'soc7',
      title: 'Q2-7. 인권',
      description: '• 인권이(가) 회사의 재무성과(기회/위험)에 미치는 중요도는 어느 정도입니까? (Outside-in)\n• 인권과 관련하여 우리 회사 활동의 환경·사회 영향 중요도는 어느 정도입니까? (Inside-out)',
      outsideScore: null,
      insideScore: null
    },
    {
      id: 'soc8',
      title: 'Q2-8. 안전보건',
      description: '• 안전보건이(가) 회사의 재무성과(기회/위험)에 미치는 중요도는 어느 정도입니까? (Outside-in)\n• 안전보건에 대해 우리 회사 활동의 환경·사회 영향 중요도는 어느 정도입니까? (Inside-out)',
      outsideScore: null,
      insideScore: null
    },
    {
      id: 'soc9',
      title: 'Q2-9. 폐수관리',
      description: '• 폐수관리이(가) 회사의 재무성과(기회/위험)에 미치는 중요도는 어느 정도입니까? (Outside-in)\n• 폐수관리에 대해 우리 회사 활동의 환경·사회 영향 중요도는 어느 정도입니까? (Inside-out)',
      outsideScore: null,
      insideScore: null
    },
    {
      id: 'soc10',
      title: 'Q2-10. 인재관리/인재',
      description: '• 인재관리/인재이(가) 회사의 재무성과(기회/위험)에 미치는 중요도는 어느 정도입니까? (Outside-in)\n• 인재관리/인재에 대해 우리 회사 활동의 환경·사회 영향 중요도는 어느 정도입니까? (Inside-out)',
      outsideScore: null,
      insideScore: null
    },
    {
      id: 'soc11',
      title: 'Q2-11. 지역사회/사회공헌',
      description: '• 지역사회/사회공헌이(가) 회사의 재무성과(기회/위험)에 미치는 중요도는 어느 정도입니까? (Outside-in)\n• 지역사회/사회공헌에 대해 우리 회사 활동의 환경·사회 영향 중요도는 어느 정도입니까? (Inside-out)',
      outsideScore: null,
      insideScore: null
    },
    {
      id: 'soc12',
      title: 'Q2-12. 협력사',
      description: '• 협력사이(가) 회사의 재무성과(기회/위험)에 미치는 중요도는 어느 정도입니까? (Outside-in)\n• 협력사와 관련하여 우리 회사 활동의 환경·사회 영향 중요도는 어느 정도입니까? (Inside-out)',
      outsideScore: null,
      insideScore: null
    },
    {
      id: 'soc13',
      title: 'Q2-13. 조직문화/기업문화',
      description: '• 조직문화/기업문화이(가) 회사의 재무성과(기회/위험)에 미치는 중요도는 어느 정도입니까? (Outside-in)\n• 조직문화/기업문화에 대해 우리 회사 활동의 환경·사회 영향 중요도는 어느 정도입니까? (Inside-out)',
      outsideScore: null,
      insideScore: null
    }
  ]);

  // Governance & Economic 섹션 상태
  const [governanceItems, setGovernanceItems] = useState<SurveyItem[]>([
    {
      id: 'gov1',
      title: 'Q3-1. 성장',
      description: '• 성장이(가) 회사의 재무성과(기회/위험)에 미치는 중요도는 어느 정도입니까? (Outside-in)\n• 성장과 관련하여 우리 회사 활동의 환경·사회 영향 중요도는 어느 정도입니까? (Inside-out)',
      outsideScore: null,
      insideScore: null
    },
    {
      id: 'gov2',
      title: 'Q3-2. 연구개발/R&D',
      description: '• 연구개발/R&D이(가) 회사의 재무성과(기회/위험)에 미치는 중요도는 어느 정도입니까? (Outside-in)\n• 연구개발/R&D에 대해 우리 회사 활동의 환경·사회 영향 중요도는 어느 정도입니까? (Inside-out)',
      outsideScore: null,
      insideScore: null
    },
    {
      id: 'gov3',
      title: 'Q3-3. 시장경쟁/시장점유/경제성과/재무성과',
      description: '• 시장경쟁/시장점유/경제성과/재무성과이(가) 회사의 재무성과(기회/위험)에 미치는 중요도는 어느 정도입니까? (Outside-in)\n• 시장경쟁/시장점유/경제성과/재무성과에 대해 우리 회사 활동의 환경·사회 영향 중요도는 어느 정도입니까? (Inside-out)',
      outsideScore: null,
      insideScore: null
    },
    {
      id: 'gov4',
      title: 'Q3-4. 윤리경영/준법경영/부패/뇌물수수',
      description: '• 윤리경영/준법경영/부패/뇌물수수이(가) 회사의 재무성과(기회/위험)에 미치는 중요도는 어느 정도입니까? (Outside-in)\n• 윤리경영/준법경영/부패/뇌물수수에 대해 우리 회사 활동의 환경·사회 영향 중요도는 어느 정도입니까? (Inside-out)',
      outsideScore: null,
      insideScore: null
    },
    {
      id: 'gov5',
      title: 'Q3-5. 리스크',
      description: '• 리스크이(가) 회사의 재무성과(기회/위험)에 미치는 중요도는 어느 정도입니까? (Outside-in)\n• 리스크와 관련하여 우리 회사 활동의 환경·사회 영향 중요도는 어느 정도입니까? (Inside-out)',
      outsideScore: null,
      insideScore: null
    },
    {
      id: 'gov6',
      title: 'Q3-6. 정보보안',
      description: '• 정보보안이(가) 회사의 재무성과(기회/위험)에 미치는 중요도는 어느 정도입니까? (Outside-in)\n• 정보보안에 대해 우리 회사 활동의 환경·사회 영향 중요도는 어느 정도입니까? (Inside-out)',
      outsideScore: null,
      insideScore: null
    }
  ]);

  const handleScoreChange = (itemId: string, scoreType: 'outside' | 'inside', value: number) => {
    // Environmental 항목 체크
    if (itemId.startsWith('env')) {
      setEnvironmentalItems(items =>
        items.map(item =>
          item.id === itemId
            ? {
                ...item,
                [scoreType === 'outside' ? 'outsideScore' : 'insideScore']: value
              }
            : item
        )
      );
    }
    // Social 항목 체크
    else if (itemId.startsWith('soc')) {
      setSocialItems(items =>
        items.map(item =>
          item.id === itemId
            ? {
                ...item,
                [scoreType === 'outside' ? 'outsideScore' : 'insideScore']: value
              }
            : item
        )
      );
    }
    // Governance & Economic 항목 체크
    else if (itemId.startsWith('gov')) {
      setGovernanceItems(items =>
        items.map(item =>
          item.id === itemId
            ? {
                ...item,
                [scoreType === 'outside' ? 'outsideScore' : 'insideScore']: value
              }
            : item
        )
      );
    }
  };

  // 다음 단계로 이동
  const handleNext = () => {
    // 현재 단계에 따른 유효성 검사
    if (currentStep === 1) {
      if (!respondentType) {
        alert('응답자 정보를 선택해주세요.');
        return;
      }
    } else if (currentStep === 2) {
      const isAllAnswered = environmentalItems.every(
        item => item.outsideScore !== null && item.insideScore !== null
      );
      if (!isAllAnswered) {
        alert('모든 Environmental 항목에 대해 응답해주세요.');
        return;
      }
    } else if (currentStep === 3) {
      const isAllAnswered = socialItems.every(
        item => item.outsideScore !== null && item.insideScore !== null
      );
      if (!isAllAnswered) {
        alert('모든 Social 항목에 대해 응답해주세요.');
        return;
      }
    }

    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  // 이전 단계로 이동
  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      window.location.href = '/materiality';
    }
  };

  // 진행률 계산
  const getProgress = () => {
    return Math.min(Math.round((currentStep / 4) * 100), 100);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationTabs />
      
      <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* 뒤로가기 버튼 */}
        <div className="mb-8">
          <a
            href="/materiality"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            중대성 평가 페이지로 돌아가기
          </a>
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* 헤더 */}
          <div className="px-8 py-6 bg-blue-700">
            <h1 className="text-2xl font-bold text-white">
              ESG 경영 활동별 중요성 평가 설문조사
            </h1>
          </div>

          {/* 설문 내용 */}
          <div className="p-8">
            {/* 단계 1: 응답자 정보 */}
            {currentStep === 1 && (
              <>
                  {/* 응답자 정보 선택 */}
                  <div className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                      귀하의 소속을 선택해 주시기 바랍니다.
                      <span className="text-red-500 ml-1">*</span>
                    </h2>
                    <div className="space-y-3">
                      {[
                        '임직원',
                        '고객',
                        '정부/자자체/유관기관',
                        '지역사회',
                        '협력회사',
                        '전문가/전문기관(대학, 연구소)',
                        '투자자/투자기관',
                        '주주',
                        '언론/미디어',
                        '기타'
                      ].map((type) => (
                        <label key={type} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-3 rounded-lg">
                          <input
                            type="radio"
                            name="respondentType"
                            value={type}
                            checked={respondentType === type}
                            onChange={(e) => setRespondentType(e.target.value)}
                            className="text-blue-600 focus:ring-blue-500"
                            required
                          />
                          <span className="text-gray-700">{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 안내 문구 */}
                  <div className="mb-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
                    <h3 className="text-lg font-semibold text-blue-800 mb-3">📋 설문 안내</h3>
                    <p className="text-blue-700 text-sm leading-relaxed mb-3">
                      본 설문은 각 항목마다 아래 두 가지를 평가합니다.
                    </p>
                    <ul className="text-blue-700 text-sm space-y-2">
                      <li>• <strong>기업 재무 중요도(Outside-in):</strong> 외부 환경·규제·시장 변화가 회사의 재무성과/기회/위험에 미치는 중요도</li>
                      <li>• <strong>환경/사회 중요도(Inside-out):</strong> 회사 활동이 환경·사회에 미칠 수 있는 긍정/부정 영향의 중요도</li>
                    </ul>
                    <div className="mt-4 p-3 bg-white rounded border border-blue-300">
                      <p className="text-blue-800 font-medium text-sm">
                        공통 척도: 1 전혀 중요하지 않음 / 2 낮음 / 3 보통 / 4 높음 / 5 매우 높음 / (선택) N/A 잘 모르겠음
                      </p>
                    </div>
                  </div>
              </>
            )}

            {/* 단계 2-4: ESG 평가 */}
            {currentStep > 1 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  ESG 경영 활동별 중요성 평가
                </h2>
                <p className="text-gray-600 mb-4">
                  다음은 ESG 경영 활동과 관련된 항목입니다.
                </p>
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <p className="text-sm text-gray-600 mb-2">
                    ※ 기업 재무 중요도(Outside-in): 외부 환경·규제·시장 변화가 회사의 재무성과/기회/위험에 미치는 중요도
                  </p>
                  <p className="text-sm text-gray-600">
                    ※ 환경/사회 중요도(Inside-out): 회사 활동이 환경·사회에 미칠 수 있는 긍정/부정 영향의 중요도
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    공통 척도: 1 전혀 중요하지 않음 / 2 낮음 / 3 보통 / 4 높음 / 5 매우 높음 / (선택) N/A 잘 모르겠음
                  </p>
                </div>

                {/* Environmental 섹션 */}
                {currentStep === 2 && (
                  <div className="mb-12">
                    <h3 className="text-lg font-semibold text-blue-800 mb-6">
                      1) Environmental (환경)
                    </h3>
                    
                    {environmentalItems.map((item) => (
                      <div key={item.id} className="mb-8 bg-gray-50 p-6 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">{item.title}</h4>
                        {item.description && (
                          <p className="text-sm text-gray-600 mb-4 whitespace-pre-line">
                            {item.description}
                          </p>
                        )}
                        
                        {/* 기업 재무 중요도 */}
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            기업 재무 중요도 (Outside-in)
                          </p>
                          <div className="flex items-center justify-between max-w-2xl">
                            {[1, 2, 3, 4, 5].map((score) => (
                              <label key={`${item.id}-outside-${score}`} className="flex flex-col items-center">
                                <input
                                  type="radio"
                                  name={`${item.id}-outside`}
                                  value={score}
                                  checked={item.outsideScore === score}
                                  onChange={() => handleScoreChange(item.id, 'outside', score)}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="mt-1 text-sm text-gray-600">
                                  {score === 1 ? '전혀 중요하지 않음' :
                                   score === 2 ? '낮음' :
                                   score === 3 ? '보통' :
                                   score === 4 ? '높음' :
                                   '매우 높음'}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* 환경/사회 중요도 */}
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            환경/사회 중요도 (Inside-out)
                          </p>
                          <div className="flex items-center justify-between max-w-2xl">
                            {[1, 2, 3, 4, 5].map((score) => (
                              <label key={`${item.id}-inside-${score}`} className="flex flex-col items-center">
                                <input
                                  type="radio"
                                  name={`${item.id}-inside`}
                                  value={score}
                                  checked={item.insideScore === score}
                                  onChange={() => handleScoreChange(item.id, 'inside', score)}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="mt-1 text-sm text-gray-600">
                                  {score === 1 ? '전혀 중요하지 않음' :
                                   score === 2 ? '낮음' :
                                   score === 3 ? '보통' :
                                   score === 4 ? '높음' :
                                   '매우 높음'}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Social 섹션 */}
                {currentStep === 3 && (
                  <div className="mb-12">
                    <h3 className="text-lg font-semibold text-green-800 mb-6">
                      2) Social (사회)
                    </h3>
                    
                    {socialItems.map((item) => (
                      <div key={item.id} className="mb-8 bg-gray-50 p-6 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">{item.title}</h4>
                        {item.description && (
                          <p className="text-sm text-gray-600 mb-4 whitespace-pre-line">
                            {item.description}
                          </p>
                        )}
                        
                        {/* 기업 재무 중요도 */}
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            기업 재무 중요도 (Outside-in)
                          </p>
                          <div className="flex items-center justify-between max-w-2xl">
                            {[1, 2, 3, 4, 5].map((score) => (
                              <label key={`${item.id}-outside-${score}`} className="flex flex-col items-center">
                                <input
                                  type="radio"
                                  name={`${item.id}-outside`}
                                  value={score}
                                  checked={item.outsideScore === score}
                                  onChange={() => handleScoreChange(item.id, 'outside', score)}
                                  className="h-4 w-4 text-green-600 focus:ring-green-500"
                                />
                                <span className="mt-1 text-sm text-gray-600">
                                  {score === 1 ? '전혀 중요하지 않음' :
                                   score === 2 ? '낮음' :
                                   score === 3 ? '보통' :
                                   score === 4 ? '높음' :
                                   '매우 높음'}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* 환경/사회 중요도 */}
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            환경/사회 중요도 (Inside-out)
                          </p>
                          <div className="flex items-center justify-between max-w-2xl">
                            {[1, 2, 3, 4, 5].map((score) => (
                              <label key={`${item.id}-inside-${score}`} className="flex flex-col items-center">
                                <input
                                  type="radio"
                                  name={`${item.id}-inside`}
                                  value={score}
                                  checked={item.insideScore === score}
                                  onChange={() => handleScoreChange(item.id, 'inside', score)}
                                  className="h-4 w-4 text-green-600 focus:ring-green-500"
                                />
                                <span className="mt-1 text-sm text-gray-600">
                                  {score === 1 ? '전혀 중요하지 않음' :
                                   score === 2 ? '낮음' :
                                   score === 3 ? '보통' :
                                   score === 4 ? '높음' :
                                   '매우 높음'}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Governance & Economic 섹션 */}
                {currentStep === 4 && (
                  <div className="mb-12">
                    <h3 className="text-lg font-semibold text-purple-800 mb-6">
                      3) Governance & Economic (지배구조/경제)
                    </h3>
                    
                    {governanceItems.map((item) => (
                      <div key={item.id} className="mb-8 bg-gray-50 p-6 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">{item.title}</h4>
                        {item.description && (
                          <p className="text-sm text-gray-600 mb-4 whitespace-pre-line">
                            {item.description}
                          </p>
                        )}
                        
                        {/* 기업 재무 중요도 */}
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            기업 재무 중요도 (Outside-in)
                          </p>
                          <div className="flex items-center justify-between max-w-2xl">
                            {[1, 2, 3, 4, 5].map((score) => (
                              <label key={`${item.id}-outside-${score}`} className="flex flex-col items-center">
                                <input
                                  type="radio"
                                  name={`${item.id}-outside`}
                                  value={score}
                                  checked={item.outsideScore === score}
                                  onChange={() => handleScoreChange(item.id, 'outside', score)}
                                  className="h-4 w-4 text-purple-600 focus:ring-purple-500"
                                />
                                <span className="mt-1 text-sm text-gray-600">
                                  {score === 1 ? '전혀 중요하지 않음' :
                                   score === 2 ? '낮음' :
                                   score === 3 ? '보통' :
                                   score === 4 ? '높음' :
                                   '매우 높음'}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* 환경/사회 중요도 */}
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            환경/사회 중요도 (Inside-out)
                          </p>
                          <div className="flex items-center justify-between max-w-2xl">
                            {[1, 2, 3, 4, 5].map((score) => (
                              <label key={`${item.id}-inside-${score}`} className="flex flex-col items-center">
                                <input
                                  type="radio"
                                  name={`${item.id}-inside`}
                                  value={score}
                                  checked={item.insideScore === score}
                                  onChange={() => handleScoreChange(item.id, 'inside', score)}
                                  className="h-4 w-4 text-purple-600 focus:ring-purple-500"
                                />
                                <span className="mt-1 text-sm text-gray-600">
                                  {score === 1 ? '전혀 중요하지 않음' :
                                   score === 2 ? '낮음' :
                                   score === 3 ? '보통' :
                                   score === 4 ? '높음' :
                                   '매우 높음'}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 진행 상태 표시 */}
            <div className="mt-8">
              <div className="h-2 bg-gray-200 rounded-full">
                <div 
                  className="h-2 bg-blue-600 rounded-full transition-all duration-300" 
                  style={{ width: `${getProgress()}%` }}
                ></div>
              </div>
              <div className="text-right mt-2">
                <span className="text-sm text-gray-600">{getProgress()}% 완료</span>
              </div>
            </div>

            {/* 이전/다음 버튼 */}
            <div className="mt-8 flex justify-between">
              <button
                onClick={handlePrev}
                className="px-6 py-2 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                이전
              </button>
              <button
                onClick={handleNext}
                className="px-6 py-2 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                {currentStep === 4 ? '제출' : '다음'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}