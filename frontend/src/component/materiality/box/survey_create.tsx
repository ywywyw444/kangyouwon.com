'use client';

import React, { useState } from 'react';

type SurveyCreateProps = {
  companyId: string;
  assessmentResult: any;
  excelData: any[];
  displayCategoryCount: number;
};

const SurveyCreate: React.FC<SurveyCreateProps> = ({ companyId, assessmentResult, excelData, displayCategoryCount }) => {
  const [generatedSurveyId, setGeneratedSurveyId] = useState<string | null>(null);

  // 컴포넌트 마운트 시 기존 설문 ID 확인
  React.useEffect(() => {
    const checkExistingSurvey = () => {
      // 현재 회사에 대한 기존 설문이 있는지 확인
      const existingSurveyKey = `surveyData_${companyId}`;
      const existingSurvey = localStorage.getItem(existingSurveyKey);
      
      if (existingSurvey) {
        try {
          const surveyData = JSON.parse(existingSurvey);
          // 기존 설문 ID가 있다면 설정
          if (surveyData.surveyId) {
            setGeneratedSurveyId(surveyData.surveyId);
          }
        } catch (error) {
          console.error('기존 설문 데이터 파싱 실패:', error);
        }
      }
      
      // 또는 localStorage에서 해당 회사의 설문 데이터를 찾기
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`surveyData_${companyId}_`)) {
          const surveyId = key.replace(`surveyData_`, '');
          setGeneratedSurveyId(surveyId);
          break;
        }
      }
    };
    
    checkExistingSurvey();
  }, [companyId]);

  const handleCreate = async () => {
    const resultData = assessmentResult?.data || assessmentResult;
    const categories = resultData?.matched_categories || [];

    if (categories.length > 0) {
      try {
        // 선택된 개수만큼만 사용 (0이면 전체)
        const selectedCategories = displayCategoryCount > 0 
          ? categories.slice(0, displayCategoryCount)
          : categories;

        // UI에 표시되는 순서대로 질문 번호 부여 (순위와 관계없이)
        const categoriesWithQuestionNumbers = selectedCategories.map((cat: any, index: number) => ({
          question_number: index + 1, // UI 표시 순서대로 Q1, Q2, Q3...
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
        }));

        // 백엔드로 설문 데이터 전송
        const surveyRequest = {
          company_id: companyId,
          categories: categoriesWithQuestionNumbers,
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

        // Gateway를 통해 materiality-service로 전송
        const response = await fetch('/api/gateway/materiality-service/surveys', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(surveyRequest)
        });

        if (!response.ok) {
          throw new Error(`설문 생성 실패: ${response.status} ${response.statusText}`);
        }

        const surveyData = await response.json();
        const surveyId = surveyData.survey_id;
        
        console.log('✅ 설문 데이터 백엔드 저장 완료:', {
          surveyId: surveyId,
          categories: surveyData.total_categories,
          companyId: surveyData.company_id
        });
        
        // Store the generated survey ID
        setGeneratedSurveyId(surveyId);
        
        // Generate survey link
        const surveyLink = `${window.location.origin}/survey?id=${surveyId}`;
        
        // Copy link to clipboard
        navigator.clipboard.writeText(surveyLink).then(() => {
          alert(`✅ 설문이 생성되었습니다!\n\n📊 총 ${selectedCategories.length}개 카테고리\n🔗 설문 링크가 클립보드에 복사되었습니다.\n\n링크: ${surveyLink}`);
        }).catch(() => {
          // Fallback: show link in alert
          alert(`✅ 설문이 생성되었습니다!\n\n📊 총 ${selectedCategories.length}개 카테고리\n🔗 설문 링크:\n${surveyLink}\n\n위 링크를 복사하여 공유하세요.`);
        });
        
      } catch (error) {
        console.error('❌ 설문 생성 실패:', error);
        const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다';
        alert(`❌ 설문 생성에 실패했습니다.\n\n오류: ${errorMessage}\n\n다시 시도해주세요.`);
        return;
      }
    } else {
      alert('❌ 설문을 진행할 수 있는 카테고리 데이터가 없습니다.\n\n먼저 중대성 평가를 완료해주세요.');
    }
  };

  const handlePreview = () => {
    if (generatedSurveyId) {
      // Navigate to the generated survey link
      window.location.href = `/survey?id=${generatedSurveyId}`;
    } else {
      alert('❌ 먼저 "설문 생성하기" 버튼을 눌러 설문을 생성해주세요.');
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
            disabled={!assessmentResult || !generatedSurveyId}
            className={`inline-flex items-center px-6 py-3 border-2 text-base font-semibold rounded-lg transition-all duration-200 ${
              assessmentResult && generatedSurveyId
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


