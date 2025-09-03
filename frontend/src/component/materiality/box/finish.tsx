'use client';

import React, { useState, useEffect } from 'react';

export default function Finish() {
  const [finalCategories, setFinalCategories] = useState<any[]>([]);

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

        {/* 다음 단계 안내 */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">
            🚀 다음 단계
          </h3>
          <div className="text-left space-y-2 text-blue-700">
            <p>• 생성된 중대성 평가 결과를 검토하세요</p>
            <p>• 필요시 추가 분석이나 조정을 진행하세요</p>
            <p>• 최종 보고서를 작성하여 활용하세요</p>
            <p>• 새로운 중대성 평가를 시작할 수 있습니다</p>
          </div>
        </div>

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
