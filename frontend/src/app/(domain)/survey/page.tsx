'use client';

import React from 'react';
import NavigationTabs from '@/component/NavigationTabs';

export default function SurveyPage() {
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
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-3 text-gray-700">{type}</span>
                  </label>
                ))}
              </div>
            </div>

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
            </div>

            {/* 진행 상태 표시 */}
            <div className="mt-8">
              <div className="h-2 bg-gray-200 rounded-full">
                <div className="h-2 bg-blue-600 rounded-full" style={{ width: '33%' }}></div>
              </div>
              <div className="text-right mt-2">
                <span className="text-sm text-gray-600">33% 완료</span>
              </div>
            </div>

            {/* 이전/다음 버튼 */}
            <div className="mt-8 flex justify-between">
              <a
                href="/materiality"
                className="px-6 py-2 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                이전
              </a>
              <button
                type="button"
                className="px-6 py-2 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                다음
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}