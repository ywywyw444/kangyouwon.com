'use client';

import React, { useState, useEffect } from 'react';

export default function Finish() {
  const [finalCategories, setFinalCategories] = useState<any[]>([]);
  const [sentSurveyInfo, setSentSurveyInfo] = useState<any>(null);
  const [surveyResponses, setSurveyResponses] = useState<any[]>([]);

  // 발송된 설문 정보와 응답 데이터 로드
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 발송된 설문 정보 로드
    try {
      const savedSurveyInfo = localStorage.getItem('sentSurveyInfo');
      if (savedSurveyInfo) {
        const parsedInfo = JSON.parse(savedSurveyInfo);
        setSentSurveyInfo(parsedInfo);
        console.log('📧 발송된 설문 정보 로드:', parsedInfo);
      }
    } catch (error) {
      console.error('❌ 발송된 설문 정보 로드 실패:', error);
    }

    // 설문 응답 데이터 로드
    try {
      const savedResponses = localStorage.getItem('backendSurveyResponses');
      if (savedResponses) {
        const parsedResponses = JSON.parse(savedResponses);
        setSurveyResponses(parsedResponses);
        console.log('📊 설문 응답 데이터 로드:', parsedResponses);
      }
    } catch (error) {
      console.error('❌ 설문 응답 데이터 로드 실패:', error);
    }
  }, []);

  // 최종 추천 카테고리 데이터 로드
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const savedResult = localStorage.getItem('materialityAssessmentResult');
      if (savedResult) {
        const parsedResult = JSON.parse(savedResult);
        const categories = parsedResult.assessment_result?.data?.matched_categories || 
                          parsedResult.assessment_result?.matched_categories || 
                          parsedResult.matched_categories || [];
        
        // 최종 추천 카테고리만 필터링 (점수 기준으로 정렬)
        const sortedCategories = categories
          .filter((cat: any) => cat.final_score && cat.final_score > 0)
          .sort((a: any, b: any) => (b.final_score || 0) - (a.final_score || 0))
          .slice(0, 10); // 상위 10개만 표시
        
        setFinalCategories(sortedCategories);
        console.log('✅ 최종 추천 카테고리 로드 완료:', sortedCategories);
      }
    } catch (error) {
      console.error('❌ 최종 추천 카테고리 로드 실패:', error);
    }
  }, []);
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
      <div className="text-center">
        {/* 완료 아이콘 */}
        <div className="mb-6">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-6xl">🎉</span>
          </div>
        </div>

        {/* 완료 메시지 */}
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          중대성 평가가 완료되었습니다!
        </h2>
        
        <p className="text-lg text-gray-600 mb-8">
          모든 단계가 성공적으로 완료되었습니다.
        </p>

        {/* 완료 요약 */}
        <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-6 mb-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            📊 완료된 작업 요약
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-blue-600 mb-1">1</div>
              <div className="text-sm text-gray-600">미디어 검색</div>
            </div>
            
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-green-600 mb-1">2</div>
              <div className="text-sm text-gray-600">1차 중대성 평가</div>
            </div>
            
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-purple-600 mb-1">3</div>
              <div className="text-sm text-gray-600">설문 생성</div>
            </div>
            
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-orange-600 mb-1">4</div>
              <div className="text-sm text-gray-600">설문 발송</div>
            </div>
            
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-indigo-600 mb-1">5</div>
              <div className="text-sm text-gray-600">설문 결과</div>
            </div>
            
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-pink-600 mb-1">6</div>
              <div className="text-sm text-gray-600">최종 이슈풀</div>
            </div>
            
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-red-600 mb-1">7</div>
              <div className="text-sm text-gray-600">결과 분석</div>
            </div>
            
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-green-600 mb-1">8</div>
              <div className="text-sm text-gray-600">완료</div>
            </div>
          </div>
        </div>

        {/* 발송된 설문 정보 */}
        {sentSurveyInfo && (
          <div className="bg-blue-50 rounded-xl p-6 mb-8 border border-blue-200">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              📋 발송된 설문 정보
            </h3>
            
            <div className="space-y-4">
              {/* 설문 ID 및 링크 */}
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium text-gray-600">설문 ID:</span>
                    <div className="mt-1">
                      <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono text-blue-600">
                        {sentSurveyInfo.surveyId}
                      </code>
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">설문 링크:</span>
                    <div className="mt-1">
                      <a
                        href={sentSurveyInfo.surveyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 break-all font-mono bg-blue-50 px-2 py-1 rounded inline-block"
                      >
                        {sentSurveyInfo.surveyUrl}
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* 발송 현황 */}
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">📊 발송 현황</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {sentSurveyInfo.sentEmails?.length || 0}
                    </div>
                    <div className="text-sm text-blue-600">발송된 이메일</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {surveyResponses?.length || 0}
                    </div>
                    <div className="text-sm text-blue-600">응답 완료</div>
                  </div>
                </div>
              </div>

              {/* 응답률 */}
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">📈 응답률</h4>
                <div className="relative pt-1">
                  {(() => {
                    const totalSent = sentSurveyInfo.sentEmails?.length || 0;
                    const totalResponses = surveyResponses?.length || 0;
                    const responseRate = totalSent > 0 ? Math.round((totalResponses / totalSent) * 100) : 0;
                    
                    return (
                      <>
                        <div className="flex mb-2 items-center justify-between">
                          <div>
                            <span className="text-xs font-semibold inline-block text-blue-600">
                              응답률: {responseRate}%
                            </span>
                          </div>
                        </div>
                        <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-100">
                          <div
                            style={{ width: `${responseRate}%` }}
                            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-500"
                          />
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* 설문 결과 바로가기 버튼 */}
              <div className="flex justify-center">
                <button
                  onClick={() => {
                    // 현재 페이지에서 설문 결과 섹션으로 이동
                    const sectionChangeEvent = new CustomEvent('sectionChange', { 
                      detail: { sectionId: 'survey-results' } 
                    });
                    window.dispatchEvent(sectionChangeEvent);
                  }}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl flex items-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  설문 결과 자세히 보기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 최종 추천 카테고리 순위 */}
        {finalCategories.length > 0 && (
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 mb-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              🏆 최종 추천 카테고리 순위
            </h3>
            
            <div className="space-y-3">
              {finalCategories.map((category, index) => (
                <div key={index} className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {category.category || '카테고리명 없음'}
                        </h4>
                        {category.esg_classification && (
                          <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full mt-1 ${
                            category.esg_classification === '환경' ? 'bg-green-100 text-green-700' :
                            category.esg_classification === '사회' ? 'bg-orange-100 text-orange-700' :
                            category.esg_classification === '지배구조' ? 'bg-blue-100 text-blue-700' :
                            category.esg_classification === '경제' ? 'bg-purple-100 text-purple-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {category.esg_classification}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {category.selected_base_issue_pool && (
                      <div className="text-right">
                        <div className="text-sm text-gray-600 mb-1">선택된 이슈</div>
                        <div className="text-sm font-medium text-gray-900 bg-gray-50 px-3 py-1 rounded-full">
                          {category.selected_base_issue_pool}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}


        {/* 액션 버튼들 */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => {
              // 새로운 평가 시작 - 모든 상태 초기화
              if (typeof window !== 'undefined') {
                // localStorage 초기화
                localStorage.removeItem('materialityProgressState');
                localStorage.removeItem('materialityAssessmentResult');
                localStorage.removeItem('surveyResult');
                localStorage.removeItem('excelUploadData');
                localStorage.removeItem('surveyUploadData');
                
                // 페이지 새로고침으로 초기 상태로 돌아가기
                window.location.reload();
              }
            }}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
          >
            🔄 새로운 평가 시작
          </button>
          
          <button
            onClick={() => {
              // 현재 페이지에서 첫 번째 단계로 이동
              const sectionChangeEvent = new CustomEvent('sectionChange', { 
                detail: { sectionId: 'media-search' } 
              });
              window.dispatchEvent(sectionChangeEvent);
            }}
            className="px-8 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
          >
            📋 결과 다시 보기
          </button>
        </div>

        {/* 완료 축하 메시지 */}
        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 font-medium">
            🎊 축하합니다! 중대성 평가 자동화 플랫폼을 통해 성공적으로 평가를 완료하셨습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
