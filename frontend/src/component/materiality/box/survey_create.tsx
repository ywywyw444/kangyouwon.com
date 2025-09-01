'use client';

import React from 'react';

type SurveyCreateProps = {
  companyId: string;
  assessmentResult: any;
  excelData: any[];
};

const SurveyCreate: React.FC<SurveyCreateProps> = ({ companyId, assessmentResult, excelData }) => {
  const handleCreate = () => {
    const resultData = assessmentResult?.data || assessmentResult;
    const categories = resultData?.matched_categories || [];

    if (categories.length > 0) {
      const surveyData = {
        company_id: companyId,
        timestamp: new Date().toISOString(),
        total_categories: categories.length,
        categories: categories.map((cat: any, index: number) => ({
          question_number: index + 1, // Q1, Q2, Q3... 순서대로
          rank: cat.rank,
          category: cat.category || '카테고리명 없음',
          selected_base_issue_pool: cat.selected_base_issue_pool || '',
          esg_classification: cat.esg_classification || '미분류',
          final_score: cat.final_score || 0,
          frequency_score: cat.frequency_score || 0,
          relevance_score: cat.relevance_score || 0,
          recent_score: cat.recent_score || 0,
          rank_score: cat.rank_score || 0,
          reference_score: cat.reference_score || 0,
          negative_score: cat.negative_score || 0
        })),
        excel_data: excelData.length > 0 ? {
          total_companies: excelData.length,
          companies: excelData.map((row: any) => ({
            name: row.name || '',
            position: row.position || '',
            company: row.company || '',
            stakeholder_type: row.stakeholderType || '',
            email: row.email || ''
          }))
        } : null
      };

      // 콘솔 출력 및 복사/다운로드 처리
      try {
        // eslint-disable-next-line no-console
        console.log('📋 설문 진행용 JSON 데이터:', surveyData);
        navigator.clipboard.writeText(JSON.stringify(surveyData, null, 2))
          .then(() => {
            alert(`✅ 설문 진행용 데이터를 바탕으로 설문이 생성되었습니다\n\n📊 총 ${categories.length}개 카테고리\n🏢 총 ${excelData.length}개 기업\n\nJSON 데이터는 콘솔에서도 확인할 수 있습니다.`);
          })
          .catch(() => {
            const blob = new Blob([JSON.stringify(surveyData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `설문진행데이터_${companyId || 'unknown'}_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            alert(`✅ 설문 진행용 데이터가 다운로드되었습니다!\n\n📊 총 ${categories.length}개 카테고리\n🏢 총 ${excelData.length}개 기업\n\n파일명: 설문진행데이터_${companyId || 'unknown'}_${new Date().toISOString().split('T')[0]}.json`);
          });
      } catch (_) {
        const blob = new Blob([JSON.stringify(surveyData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `설문진행데이터_${companyId || 'unknown'}_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } else {
      alert('❌ 설문을 진행할 수 있는 카테고리 데이터가 없습니다.\n\n먼저 중대성 평가를 완료해주세요.');
    }
  };

  const handlePreview = () => {
    const resultData = assessmentResult?.data || assessmentResult;
    const categories = resultData?.matched_categories || [];

    if (categories.length > 0) {
      const surveyData = {
        company_id: companyId,
        categories: categories.map((cat: any, index: number) => ({
          question_number: index + 1, // Q1, Q2, Q3... 순서대로
          rank: cat.rank,
          category: cat.category || '카테고리명 없음',
          selected_base_issue_pool: cat.selected_base_issue_pool || '',
          esg_classification: cat.esg_classification || '미분류',
          final_score: cat.final_score || 0
        }))
      };

      localStorage.setItem('surveyData', JSON.stringify(surveyData));
      window.location.href = '/survey';
    } else {
      alert('❌ 설문을 생성할 수 있는 카테고리 데이터가 없습니다.\n먼저 중대성 평가를 완료해주세요.');
    }
  };

  return (
    <div id="survey-create" className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <div className="text-center">
        <button
          onClick={handleCreate}
          disabled={!assessmentResult}
          className={`inline-flex items-center px-8 py-4 border-2 text-lg font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl ${
            assessmentResult
              ? 'border-blue-500 text-blue-700 bg-white hover:bg-blue-50 hover:border-blue-600'
              : 'border-gray-300 text-gray-400 bg-gray-100 cursor-not-allowed'
          }`}
        >
          <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          설문 생성하기
        </button>
        <p className="text-sm text-gray-600 mt-3">
          중간 중대성 평가 결과를 바탕으로 설문을 생성합니다
        </p>
        <div className="mt-4">
          <button
            onClick={handlePreview}
            disabled={!assessmentResult}
            className={`inline-flex items-center px-6 py-3 border-2 text-base font-semibold rounded-lg transition-all duration-200 ${
              assessmentResult
                ? 'border-green-500 text-green-700 bg-white hover:bg-green-50 hover:border-green-600'
                : 'border-gray-300 text-gray-400 bg-gray-100 cursor-not-allowed'
            }`}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            설문 미리보기
          </button>
        </div>
      </div>
    </div>
  );
};

export default SurveyCreate;


