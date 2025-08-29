'use client';

import React, { useState, useEffect } from 'react';
import NavigationTabs from '@/component/NavigationTabs';

interface SurveyItem {
  id: string;
  title: string;
  description?: string;
  outsideScore: number | null;
  insideScore: number | null;
  category: string;
  esg_classification: string;
  rank: number;
}

interface SurveyData {
  company_id: string;
  categories: Array<{
    rank: number;
    category: string;
    selected_base_issue_pool: string;
    esg_classification: string;
    final_score: number;
  }>;
}

export default function SurveyPage() {
  // 응답자 정보
  const [respondentType, setRespondentType] = useState<string>('');
  
  // 현재 단계
  const [currentStep, setCurrentStep] = useState<number>(1);
  
  // 설문 데이터
  const [surveyData, setSurveyData] = useState<SurveyData | null>(null);
  
  // 동적으로 생성된 설문 항목들
  const [environmentalItems, setEnvironmentalItems] = useState<SurveyItem[]>([]);
  const [socialItems, setSocialItems] = useState<SurveyItem[]>([]);
  const [governanceItems, setGovernanceItems] = useState<SurveyItem[]>([]);
  
  // 설문 데이터 로드 및 설문 항목 생성
  useEffect(() => {
    const loadSurveyData = () => {
      try {
        const savedData = localStorage.getItem('surveyData');
        if (savedData) {
          const data: SurveyData = JSON.parse(savedData);
          setSurveyData(data);
          
          // ESG 분류별로 카테고리 분리
          const environmental: SurveyItem[] = [];
          const social: SurveyItem[] = [];
          const governance: SurveyItem[] = [];
          
          data.categories.forEach((cat, index) => {
            const surveyItem: SurveyItem = {
              id: `${cat.esg_classification.toLowerCase()}_${index + 1}`,
              title: `Q${cat.rank}. ${cat.selected_base_issue_pool || cat.category}`,
              description: `• ${cat.selected_base_issue_pool || cat.category}이(가) 회사의 재무성과(기회/위험)에 미치는 중요도는 어느 정도입니까? (Outside-in)\n• ${cat.selected_base_issue_pool || cat.category}에 대해 우리 회사 활동의 환경·사회 영향 중요도는 어느 정도입니까? (Inside-out)`,
              outsideScore: null,
              insideScore: null,
              category: cat.category,
              esg_classification: cat.esg_classification,
              rank: cat.rank
            };
            
            // ESG 분류에 따라 적절한 배열에 추가
            if (cat.esg_classification.includes('환경')) {
              environmental.push(surveyItem);
            } else if (cat.esg_classification.includes('사회')) {
              social.push(surveyItem);
            } else if (cat.esg_classification.includes('지배구조') || cat.esg_classification.includes('경제')) {
              governance.push(surveyItem);
            }
          });
          
          setEnvironmentalItems(environmental);
          setSocialItems(social);
          setGovernanceItems(governance);
          
          console.log('📋 설문 데이터 로드 완료:', {
            environmental: environmental.length,
            social: social.length,
            governance: governance.length,
            total: data.categories.length
          });
        } else {
          console.log('⚠️ 설문 데이터가 없습니다. 중대성 평가 페이지에서 설문을 생성해주세요.');
        }
      } catch (error) {
        console.error('❌ 설문 데이터 로드 실패:', error);
      }
    };
    
    loadSurveyData();
  }, []);

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
    // 설문 데이터가 없으면 진행 불가
    if (!surveyData) {
      alert('설문 데이터가 없습니다. 중대성 평가 페이지에서 설문을 생성해주세요.');
      return;
    }

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

    // 최대 단계는 ESG 섹션 수에 따라 동적으로 결정
    const maxStep = 1 + (environmentalItems.length > 0 ? 1 : 0) + (socialItems.length > 0 ? 1 : 0) + (governanceItems.length > 0 ? 1 : 0);
    
    if (currentStep < maxStep) {
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
    if (!surveyData) return 0;
    
    // 최대 단계는 ESG 섹션 수에 따라 동적으로 결정
    const maxStep = 1 + (environmentalItems.length > 0 ? 1 : 0) + (socialItems.length > 0 ? 1 : 0) + (governanceItems.length > 0 ? 1 : 0);
    
    return Math.min(Math.round((currentStep / maxStep) * 100), 100);
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

            {/* 설문 데이터가 없을 때 안내 메시지 */}
            {!surveyData && (
              <div className="text-center py-12">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">설문 데이터가 없습니다</h3>
                <p className="text-gray-600 mb-6">
                  중대성 평가 페이지에서 설문을 생성한 후 다시 시도해주세요.
                </p>
                <a
                  href="/materiality"
                  className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  중대성 평가 페이지로 이동
                </a>
              </div>
            )}

            {/* 단계 2-4: ESG 평가 */}
            {surveyData && currentStep > 1 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  ESG 경영 활동별 중요성 평가
                </h2>
                <p className="text-gray-600 mb-4">
                  다음은 ESG 경영 활동과 관련된 항목입니다. (총 {surveyData.categories.length}개 항목)
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
                {(() => {
                  if (!surveyData) return '다음';
                  
                  const maxStep = 1 + (environmentalItems.length > 0 ? 1 : 0) + (socialItems.length > 0 ? 1 : 0) + (governanceItems.length > 0 ? 1 : 0);
                  
                  return currentStep === maxStep ? '제출' : '다음';
                })()}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}