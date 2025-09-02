"use client";
import React, { useEffect, useState } from "react";
import { useAssessmentStore } from "@/store/assessmentStore";
import { SurveyResponse, GroupId } from "@/lib/materiality/surveyWeighting";

const FinalIssuepool: React.FC = () => {
  const {
    setMediaRanked,
    setSurveyResponses,
    setParams,
    computeAll,
    finalTop,
    groupWeights,
    surveyScores,
    mediaNorm,
    finalScores,
    alphaOutsideIn,
    gammaMedia,
    topN,
    baseWeights
  } = useAssessmentStore();

  const [isLoading, setIsLoading] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [isDataHidden, setIsDataHidden] = useState(true);

  // 컴포넌트 마운트 시 사용자 활동 여부 확인
  useEffect(() => {
    // 처음 접속 시에는 항상 빈 화면으로 시작
    const hasUserActivity = localStorage.getItem('hasUserActivity');
    if (hasUserActivity === 'true') {
      setIsDataHidden(false);
    } else {
      // 명시적으로 빈 화면으로 설정
      setIsDataHidden(true);
    }
  }, []);

  // Load media data from localStorage (사용자 활동이 있는 경우에만)
  useEffect(() => {
    const loadMediaData = () => {
      // 사용자 활동이 없는 경우 데이터를 자동으로 불러오지 않음
      const hasUserActivity = localStorage.getItem('hasUserActivity');
      if (!hasUserActivity) {
        console.log('🆕 처음 접속: 미디어 데이터를 자동으로 불러오지 않습니다.');
        return;
      }

      try {
        const savedData = localStorage.getItem('materialityAssessmentResult');
        if (savedData) {
          const parsedData = JSON.parse(savedData);
          const categories = parsedData.assessment_result?.matched_categories || [];
          
          if (categories.length > 0) {
            const mediaRanked = categories.map((cat: any) => ({
              category: cat.category,
              final_score: cat.final_score || 0
            }));
            setMediaRanked(mediaRanked);
          }
        }
      } catch (error) {
        console.error('Error loading media data:', error);
      }
    };

    loadMediaData();
  }, [setMediaRanked]);

  // Load survey responses from localStorage (사용자 활동이 있는 경우에만)
  useEffect(() => {
    const loadSurveyData = () => {
      // 사용자 활동이 없는 경우 데이터를 자동으로 불러오지 않음
      const hasUserActivity = localStorage.getItem('hasUserActivity');
      if (!hasUserActivity) {
        console.log('🆕 처음 접속: 설문 데이터를 자동으로 불러오지 않습니다.');
        return;
      }

      try {
        const savedResponses = localStorage.getItem('surveyResponses');
        if (savedResponses) {
          const responses = JSON.parse(savedResponses);
          
          // Transform to SurveyResponse format
          const surveyResponses: SurveyResponse[] = responses.map((response: any) => ({
            respondentId: response.participant?.email || `respondent_${Date.now()}_${Math.random()}`,
            group: mapPositionToGroup(response.participant?.position || '기타'),
            understanding: 3, // Default understanding level
            answers: response.responses.reduce((acc: any, resp: any) => {
              acc[resp.category] = {
                outsideIn: resp.outsideScore || 3,
                insideOut: resp.insideScore || 3
              };
              return acc;
            }, {})
          }));
          
          setSurveyResponses(surveyResponses);
        }
      } catch (error) {
        console.error('Error loading survey data:', error);
      }
    };

    loadSurveyData();
  }, [setSurveyResponses]);

  // Map position to group
  const mapPositionToGroup = (position: string): GroupId => {
    const pos = position.toLowerCase();
    if (pos.includes('임원') || pos.includes('ceo') || pos.includes('대표')) return '임원';
    if (pos.includes('부장') || pos.includes('팀장') || pos.includes('과장')) return '중간관리자';
    if (pos.includes('대리') || pos.includes('주임') || pos.includes('리더')) return '실무리더';
    if (pos.includes('사원') || pos.includes('신입') || pos.includes('주니어')) return '주니어';
    if (pos.includes('고객') || pos.includes('customer')) return '고객';
    if (pos.includes('정부') || pos.includes('공공')) return '정부/자자체/유관기관';
    if (pos.includes('지역') || pos.includes('사회')) return '지역사회';
    if (pos.includes('협력') || pos.includes('파트너')) return '협력회사';
    if (pos.includes('전문가') || pos.includes('연구')) return '전문가/전문기관';
    if (pos.includes('투자') || pos.includes('펀드')) return '투자자/투자기관';
    if (pos.includes('주주') || pos.includes('shareholder')) return '주주';
    if (pos.includes('언론') || pos.includes('미디어') || pos.includes('기자')) return '언론/미디어';
    return '기타';
  };

  const handleCompute = async () => {
    setIsLoading(true);
    try {
      computeAll();
    } catch (error) {
      console.error('Error computing assessment:', error);
      alert('계산 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleParamChange = (param: string, value: number) => {
    if (param === 'alphaOutsideIn') {
      setParams({ alphaOutsideIn: value });
    } else if (param === 'gammaMedia') {
      setParams({ gammaMedia: value });
    } else if (param === 'topN') {
      setParams({ topN: Math.max(1, Math.min(50, value)) });
    }
  };

  // 데이터가 숨겨진 상태일 때 표시
  if (isDataHidden) {
    return (
      <div id="final-issuepool" className="bg-white rounded-xl shadow-lg p-6 mb-12">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">
          📋 최종 이슈풀 확인하기
        </h2>
        
        <div className="bg-gray-50 rounded-lg p-12 text-center border-2 border-dashed border-gray-300">
          <div className="text-4xl text-gray-300 mb-4">🎯</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">최종 이슈풀 계산</h3>
          <p className="text-gray-500 mb-6">미디어 검색과 설문 결과를 종합한 최종 이슈풀을 계산할 수 있습니다.</p>
          
          <button
            onClick={() => {
              localStorage.setItem('hasUserActivity', 'true');
              setIsDataHidden(false);
            }}
            className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            최종 이슈풀 계산 시작하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="final-issuepool" className="bg-white rounded-xl shadow-lg p-6 mb-12">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">
        📋 최종 이슈풀 확인하기
      </h2>
      
      {/* Parameters Control */}
      <div className="bg-blue-50 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold text-blue-800 mb-4">⚙️ 계산 파라미터</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Outside-in 비중 (α): {alphaOutsideIn.toFixed(2)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={alphaOutsideIn}
              onChange={(e) => handleParamChange('alphaOutsideIn', parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              미디어 가중치 (γ): {gammaMedia.toFixed(2)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={gammaMedia}
              onChange={(e) => handleParamChange('gammaMedia', parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              상위 N개: {topN}
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={topN}
              onChange={(e) => handleParamChange('topN', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Compute Button */}
      <div className="text-center mb-6">
        <button
          onClick={handleCompute}
          disabled={isLoading}
          className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
            isLoading
              ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
          }`}
        >
          {isLoading ? '계산 중...' : '🎯 최종 이슈풀 계산하기'}
        </button>
      </div>

      {/* Results */}
      {finalTop && finalTop.length > 0 ? (
        <div className="space-y-6">
          {/* Final Rankings */}
          <div className="bg-green-50 rounded-lg p-6 border border-green-200">
            <h3 className="text-lg font-semibold text-green-800 mb-4">🏆 최종 추천 카테고리</h3>
            <div className="space-y-3">
              {finalTop.map((item) => (
                <div key={item.category} className="flex items-center justify-between bg-white p-4 rounded-lg border border-green-200 shadow-sm">
                  <div className="flex items-center">
                    <span className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-bold mr-4">
                      {item.rank}
                    </span>
                    <span className="font-medium text-gray-900">{item.category}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">{item.score.toFixed(3)}</div>
                    <div className="text-sm text-gray-500">종합 점수</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Debug Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="text-sm text-gray-600 hover:text-gray-800 mb-2"
            >
              {showDebug ? '🔽 디버그 정보 숨기기' : '🔼 디버그 정보 보기'}
            </button>
            
            {showDebug && (
              <div className="space-y-4">
                {groupWeights && (
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">그룹 가중치:</h4>
                    <pre className="bg-white p-3 rounded text-xs overflow-auto">
                      {JSON.stringify(groupWeights, null, 2)}
                    </pre>
                  </div>
                )}
                
                {surveyScores && (
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">설문 점수 (정규화):</h4>
                    <pre className="bg-white p-3 rounded text-xs overflow-auto">
                      {JSON.stringify(surveyScores, null, 2)}
                    </pre>
                  </div>
                )}
                
                {mediaNorm && (
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">미디어 점수 (정규화):</h4>
                    <pre className="bg-white p-3 rounded text-xs overflow-auto">
                      {JSON.stringify(mediaNorm, null, 2)}
                    </pre>
                  </div>
                )}
                
                {finalScores && (
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">최종 점수:</h4>
                    <pre className="bg-white p-3 rounded text-xs overflow-auto">
                      {JSON.stringify(finalScores, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-12 text-center border-2 border-dashed border-gray-300">
          <div className="text-4xl text-gray-300 mb-4">🎯</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">최종 이슈풀 계산</h3>
          <p className="text-gray-500 mb-4">
            미디어 검색과 설문 결과를 종합한 최종 이슈풀을 계산할 수 있습니다.
          </p>
          <p className="text-sm text-gray-400">
            위의 "최종 이슈풀 계산하기" 버튼을 클릭하여 결과를 확인하세요.
          </p>
        </div>
      )}
    </div>
  );
};

export default FinalIssuepool;
