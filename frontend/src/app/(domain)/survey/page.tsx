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
  // 현재 설문 단계
  const [currentStep, setCurrentStep] = useState<number>(1);
  
  // 응답자 유형 상태
  const [respondentType, setRespondentType] = useState<string>('');
  
  // 설문 접근 경로 상태
  const [accessPath, setAccessPath] = useState<string>('');

  // Environmental 섹션 상태
  const [environmentalItems, setEnvironmentalItems] = useState<SurveyItem[]>([
    {
      id: 'env1',
      title: '1) 기후변화 대응 및 온실가스 감축',
      description: '- 환승용량 달성을 위한 개비넥스 및 전략 수립, 리스크 관리\n- 청정전력 효율 향상 및 국내외 CDM 사업* 등의 온실가스 감축 활동\n* CDM (Clean Development Mechanism) 사업: 선진국이 개도국에서의 온실가스감축분을 자국의 감축목표 달성에 활용할 수 있도록 하는 제도',
      outsideScore: null,
      insideScore: null
    },
    {
      id: 'env2',
      title: '2) 신재생에너지 사업 확대',
      description: '- 태양광, 바이오, 연료전지 등 신재생에너지원을 이용한 전력 생산 확대 및 신규 사업 개발\n- 청정수소 생산플랜트 개발 등 미래에너지 관련 사업(그린사업) 확대',
      outsideScore: null,
      insideScore: null
    },
    {
      id: 'env3',
      title: '3) 용수 및 폐기물 관리',
      description: '- 용수 사용량 절감, 미이용 수자원 발굴, 재이용 시설 등 수자원 관리\n- 폐기물 발생량 절감 및 환경 영향 최소화, 재사용 재활용을 통한 자원순환 실행 등의 폐기물 관리',
      outsideScore: null,
      insideScore: null
    },
    {
      id: 'env4',
      title: '4) 생물다양성 보전',
      description: '- 생물다양성 가치가 높은 보호지역 또는 인근에서 소유·임대·운영하는 사업장, 사업운영, 제품 및 서비스가 생물다양성에 미치는 영향 분석\n- 서식지 보호 또는 복구 활동',
      outsideScore: null,
      insideScore: null
    }
  ]);

  // Social 섹션 상태
  const [socialItems, setSocialItems] = useState<SurveyItem[]>([
    {
      id: 'soc1',
      title: '1) 산업안전보건 관리체계 고도화',
      description: '- 안전보건 경영시스템 인증 취득 및 관리\n- 안전보건 관리체계 구축 및 이행 수준 향상\n- 협력사 안전관리 강화 및 안전문화 확산',
      outsideScore: null,
      insideScore: null
    },
    {
      id: 'soc2',
      title: '2) 임직원 역량 강화',
      description: '- 임직원 교육훈련 체계 구축 및 운영\n- 직무역량 향상을 위한 교육 프로그램 운영\n- 성과평가 및 보상체계 운영',
      outsideScore: null,
      insideScore: null
    },
    {
      id: 'soc3',
      title: '3) 일과 삶의 균형',
      description: '- 유연근무제 확대 및 휴가사용 활성화\n- 육아휴직 등 가족친화 제도 운영\n- 직장 내 괴롭힘 방지 등 건전한 조직문화 조성',
      outsideScore: null,
      insideScore: null
    },
    {
      id: 'soc4',
      title: '4) 지역사회 상생협력',
      description: '- 지역주민 소통채널 운영 및 의견수렴\n- 지역사회 문제해결을 위한 사회공헌활동 추진\n- 발전소 주변지역 지원사업 시행',
      outsideScore: null,
      insideScore: null
    }
  ]);

  // Governance 섹션 상태
  const [governanceItems, setGovernanceItems] = useState<SurveyItem[]>([
    {
      id: 'gov1',
      title: '1) 이사회 독립성 및 전문성',
      description: '- 이사회 구성의 독립성 및 다양성 확보\n- 사외이사 전문성 강화\n- 이사회 운영의 투명성 제고',
      outsideScore: null,
      insideScore: null
    },
    {
      id: 'gov2',
      title: '2) 윤리경영 및 반부패',
      description: '- 윤리경영 체계 구축 및 모니터링\n- 임직원 윤리교육 강화\n- 내부신고제도 운영 및 신고자 보호',
      outsideScore: null,
      insideScore: null
    },
    {
      id: 'gov3',
      title: '3) 리스크 관리',
      description: '- 전사적 리스크 관리체계 구축\n- 재무/비재무 리스크 식별 및 대응\n- 리스크 모니터링 및 보고체계 운영',
      outsideScore: null,
      insideScore: null
    },
    {
      id: 'gov4',
      title: '4) 정보보안',
      description: '- 정보보안 관리체계 구축 및 인증\n- 개인정보보호 강화\n- 사이버보안 위협 대응체계 운영',
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
    // Governance 항목 체크
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
      if (!accessPath) {
        alert('설문 접근 경로를 선택해주세요.');
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
              한국중부발전 2023 지속가능경영보고서 중대성평가 이해관계자 설문조사
            </h1>
          </div>

          {/* 설문 내용 */}
          <div className="p-8">
            {/* 단계 1: 응답자 정보 */}
            {currentStep === 1 && (
              <>
                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    귀하의 소속을 선택해 주시기 바랍니다.
                    <span className="text-red-500 ml-1">*</span>
                  </h2>
                  <div className="space-y-3">
                    {[
                      '임직원',
                      '고객',
                      '정부, 지자체, 유관기관',
                      '지역사회',
                      '협력회사',
                      '전문가관(대학, 연구소)',
                      '미디어',
                      '기타'
                    ].map((type) => (
                      <label key={type} className="flex items-center">
                        <input
                          type="radio"
                          name="respondentType"
                          value={type}
                          checked={respondentType === type}
                          onChange={(e) => setRespondentType(e.target.value)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-3 text-gray-700">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    설문에 참여하게 된 경로를 선택해 주시기 바랍니다.
                    <span className="text-red-500 ml-1">*</span>
                  </h2>
                  <div className="space-y-3">
                    {[
                      '한국중부발전 홈페이지',
                      '한국중부발전 네이버 블로그',
                      '한국중부발전 인스타그램',
                      '문자 (URL)'
                    ].map((path) => (
                      <label key={path} className="flex items-center">
                        <input
                          type="radio"
                          name="accessPath"
                          value={path}
                          checked={accessPath === path}
                          onChange={(e) => setAccessPath(e.target.value)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-3 text-gray-700">{path}</span>
                      </label>
                    ))}
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
                  다음은 한국중부발전 지속가능경영과 관련된 항목입니다.
                </p>
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <p className="text-sm text-gray-600 mb-2">
                    ※ 기업 제무 중요도(Outside-in): 글로벌 및 국내 규제, 트렌드 등 외부에서 촉발된 ESG 관련 이슈가 한국중부발전에 미칠 수 있는 재무적 위험 또는 기회와 관련된 중요도
                  </p>
                  <p className="text-sm text-gray-600">
                    ※ 환경/사회 중요도(Inside-out): 한국중부발전의 활동이 환경, 사회(인권, 사회 전반의 경제 등)에 미칠 수 있는 긍정적/부정적 영향과 관련된 중요도
                  </p>
                </div>

                {/* Environmental 섹션 */}
                {currentStep === 2 && (
                  <div className="mb-12">
                    <h3 className="text-lg font-semibold text-blue-800 mb-6">
                      1. Environmental (환경)
                    </h3>
                    
                    {environmentalItems.map((item) => (
                      <div key={item.id} className="mb-8 bg-gray-50 p-6 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">{item.title}</h4>
                        {item.description && (
                          <p className="text-sm text-gray-600 mb-4 whitespace-pre-line">
                            {item.description}
                          </p>
                        )}
                        
                        {/* 기업 제무 중요도 */}
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            기업 제무 중요도
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
                                  {score === 1 ? '매우 낮다' :
                                   score === 2 ? '낮다' :
                                   score === 3 ? '보통이다' :
                                   score === 4 ? '높다' :
                                   '매우 높다'}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* 환경/사회 중요도 */}
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            환경/사회 중요도
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
                                  {score === 1 ? '매우 낮다' :
                                   score === 2 ? '낮다' :
                                   score === 3 ? '보통이다' :
                                   score === 4 ? '높다' :
                                   '매우 높다'}
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
                      2. Social (사회)
                    </h3>
                    
                    {socialItems.map((item) => (
                      <div key={item.id} className="mb-8 bg-gray-50 p-6 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">{item.title}</h4>
                        {item.description && (
                          <p className="text-sm text-gray-600 mb-4 whitespace-pre-line">
                            {item.description}
                          </p>
                        )}
                        
                        {/* 기업 제무 중요도 */}
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            기업 제무 중요도
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
                                  {score === 1 ? '매우 낮다' :
                                   score === 2 ? '낮다' :
                                   score === 3 ? '보통이다' :
                                   score === 4 ? '높다' :
                                   '매우 높다'}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* 환경/사회 중요도 */}
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            환경/사회 중요도
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
                                  {score === 1 ? '매우 낮다' :
                                   score === 2 ? '낮다' :
                                   score === 3 ? '보통이다' :
                                   score === 4 ? '높다' :
                                   '매우 높다'}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Governance 섹션 */}
                {currentStep === 4 && (
                  <div className="mb-12">
                    <h3 className="text-lg font-semibold text-purple-800 mb-6">
                      3. Governance (지배구조)
                    </h3>
                    
                    {governanceItems.map((item) => (
                      <div key={item.id} className="mb-8 bg-gray-50 p-6 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">{item.title}</h4>
                        {item.description && (
                          <p className="text-sm text-gray-600 mb-4 whitespace-pre-line">
                            {item.description}
                          </p>
                        )}
                        
                        {/* 기업 제무 중요도 */}
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            기업 제무 중요도
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
                                  {score === 1 ? '매우 낮다' :
                                   score === 2 ? '낮다' :
                                   score === 3 ? '보통이다' :
                                   score === 4 ? '높다' :
                                   '매우 높다'}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* 환경/사회 중요도 */}
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            환경/사회 중요도
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
                                  {score === 1 ? '매우 낮다' :
                                   score === 2 ? '낮다' :
                                   score === 3 ? '보통이다' :
                                   score === 4 ? '높다' :
                                   '매우 높다'}
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