'use client';

import React, { useState } from 'react';
import { normalizeSurveyKey, generateSurveyKey } from '@/lib/surveyKey';

interface Category {
  category: string;
  selected_base_issue_pool?: string;
  esg_classification?: string;
  final_score?: number;
  rank: number;
}

interface ExcelRow {
  name?: string;
  position?: string;
  company?: string;
  stakeholderType?: string;
  email: string;
}

// 설문 내용의 해시값을 생성하는 함수
const generateSurveyContentHash = (categories: Category[], excelData: ExcelRow[]): string => {
  // 카테고리 데이터를 정규화하여 해시 생성
  const normalizedCategories = categories.map(cat => ({
    category: cat.category || '',
    selected_base_issue_pool: cat.selected_base_issue_pool || '',
    esg_classification: cat.esg_classification || '',
    final_score: cat.final_score || 0,
    rank: cat.rank
  })).sort((a, b) => a.rank - b.rank); // 순위로 정렬하여 일관성 보장

  // 엑셀 데이터도 정규화
  const normalizedExcelData = excelData.map(row => ({
    name: row.name,
    position: row.position,
    company: row.company,
    stakeholderType: row.stakeholderType,
    email: row.email
  })).sort((a, b) => a.email.localeCompare(b.email)); // 이메일로 정렬

  // JSON 문자열로 변환하여 해시 생성
  const contentString = JSON.stringify({
    categories: normalizedCategories,
    excelData: normalizedExcelData
  });

  // 간단한 해시 함수 (실제 프로덕션에서는 crypto-js 등 사용 권장)
  let hash = 0;
  for (let i = 0; i < contentString.length; i++) {
    const char = contentString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32bit 정수로 변환
  }
  return Math.abs(hash).toString(36);
};

interface SurveyResult {
  survey_id: string;
  content_hash?: string;
  created_at: string;
  is_active: boolean;
}

type SurveyCreateProps = {
  companyId: string;
  assessmentResult: any;
  excelData: any[];
  displayCategoryCount: number;
};

const SurveyCreate: React.FC<SurveyCreateProps> = ({ companyId, assessmentResult, excelData, displayCategoryCount }) => {
  const [generatedSurveyId, setGeneratedSurveyId] = useState<string | null>(null);
  const [isDataHidden, setIsDataHidden] = useState(true);
  const [surveyResult, setSurveyResult] = useState<SurveyResult | null>(null);

  // 컴포넌트 마운트 시 사용자 활동 여부 확인
  React.useEffect(() => {
    // 브라우저 환경인지 확인
    if (typeof window !== 'undefined') {
      // 처음 접속 시에는 항상 빈 화면으로 시작
      const hasUserActivity = localStorage.getItem('hasUserActivity');
      if (hasUserActivity === 'true') {
        setIsDataHidden(false);
      } else {
        // 명시적으로 빈 화면으로 설정
        setIsDataHidden(true);
      }
    }
  }, []);

  // 컴포넌트 마운트 시 기존 설문 정보 확인 (사용자 활동이 있는 경우에만)
  React.useEffect(() => {
    const checkExistingSurvey = async () => {
      // 브라우저 환경이 아니면 실행하지 않음
      if (typeof window === 'undefined') return;

      // 처음 접속 시에는 데이터를 화면에 표시하지 않음
      const hasUserActivity = localStorage.getItem('hasUserActivity');
      if (!hasUserActivity) {
        setIsDataHidden(true);
        console.log('🆕 처음 접속: 화면에 데이터를 표시하지 않습니다.');
        return;
      }

      // 현재 회사에 대한 기존 설문이 있는지 확인
      const existingSurveyKey = `surveyData_${companyId}`;
      const existingSurvey = localStorage.getItem(existingSurveyKey);
      
      if (existingSurvey) {
        try {
          const surveyData = JSON.parse(existingSurvey);
          // 기존 설문 ID가 있다면 설정
          if (surveyData.surveyId) {
            setGeneratedSurveyId(surveyData.surveyId);
            console.log('📋 기존 설문 ID 복원:', surveyData.surveyId);

            // 백엔드에서 설문 정보 가져오기
            try {
              const response = await fetch(`/api/v1/materiality-service/surveys/${surveyData.surveyId}`);
              if (response.ok) {
                const surveyInfo = await response.json();
                setSurveyResult({
                  survey_id: surveyData.surveyId,
                  content_hash: surveyInfo.content_hash,
                  created_at: surveyInfo.created_at || surveyData.timestamp,
                  is_active: surveyInfo.is_active !== false
                });
                console.log('📊 설문 정보 로드 완료:', surveyInfo);
              }
            } catch (error) {
              console.error('설문 정보 로드 실패:', error);
            }
          }
        } catch (error) {
          console.error('기존 설문 데이터 파싱 실패:', error);
        }
      }
    };
    
    checkExistingSurvey();
  }, [companyId]);

  // 설문 ID가 변경될 때마다 localStorage에 저장
  React.useEffect(() => {
    // 브라우저 환경이 아니면 실행하지 않음
    if (typeof window === 'undefined') return;

    if (generatedSurveyId) {
      const surveyKey = `surveyData_${companyId}`;
      const surveyData = {
        surveyId: generatedSurveyId,
        companyId: companyId,
        timestamp: new Date().toISOString(),
        assessmentResult: assessmentResult
      };
      
      try {
        localStorage.setItem(surveyKey, JSON.stringify(surveyData));
        console.log('💾 설문 ID localStorage 저장 완료:', generatedSurveyId);
      } catch (error) {
        console.error('설문 ID 저장 실패:', error);
      }
    }
  }, [generatedSurveyId, companyId]); // assessmentResult 의존성 제거

  const handleCreate = async () => {
    // 설문이 이미 생성된 경우 확인
    if (generatedSurveyId) {
      if (confirm('이미 설문이 생성되어 있습니다.\n\n새로운 설문을 생성하시겠습니까?\n\n기존 설문은 유지되지만, 새로운 설문 ID가 생성됩니다.')) {
        // 기존 설문 ID를 초기화하고 새로 생성
        setGeneratedSurveyId(null);
        // localStorage에서도 기존 설문 데이터 제거
        const surveyKey = `surveyData_${companyId}`;
        localStorage.removeItem(surveyKey);
        console.log('🗑️ 기존 설문 데이터 제거 완료');
        
        // 잠시 대기 후 새 설문 생성 진행 (무한 루프 방지)
        setTimeout(() => {
          // assessmentResult가 있는지 확인하고 새 설문 생성
          if (assessmentResult) {
            createNewSurvey();
          } else {
            alert('❌ 새로운 설문을 생성할 수 없습니다.\n\n먼저 중대성 평가를 완료해주세요.');
          }
        }, 100);
        return;
      } else {
        return;
      }
    }

    // 새 설문 생성 로직을 별도 함수로 분리
    createNewSurvey();
  };

  // 실제 설문 생성 로직을 별도 함수로 분리
  const createNewSurvey = async () => {
    const resultData = assessmentResult?.data || assessmentResult;
    const categories = resultData?.matched_categories || [];

    if (categories.length > 0) {
      try {
        // 선택된 개수만큼만 사용 (0이면 전체)
        const selectedCategories: Category[] = (displayCategoryCount > 0 
          ? categories.slice(0, displayCategoryCount)
          : categories).map((cat: any) => ({
            category: cat.category || '',
            selected_base_issue_pool: cat.selected_base_issue_pool || '',
            esg_classification: cat.esg_classification || '',
            final_score: cat.final_score || 0,
            rank: cat.rank || 0
          }));

        // 설문 내용의 해시값 생성 (카테고리와 base issue pool만 고려)
        const contentHash = generateSurveyContentHash(
          selectedCategories, // 이미 Category[] 타입으로 변환됨
          [] // excelData는 해시 계산에서 제외
        );
        
        // 기존에 동일한 내용의 설문이 있는지 확인
        const existingSurveyKey = `survey_${companyId}_${contentHash}`;
        const existingSurvey = localStorage.getItem(existingSurveyKey);

        // 현재 활성 설문이 있다면 해시값 비교
        const currentSurveyData = localStorage.getItem(`surveyData_${companyId}`);
        if (currentSurveyData) {
          const currentData = JSON.parse(currentSurveyData);
          if (currentData.contentHash === contentHash) {
            // 내용이 동일하면 기존 설문 재사용
            console.log('📋 동일한 내용의 설문이 이미 존재합니다. 기존 설문을 재사용합니다.');
            setGeneratedSurveyId(currentData.surveyId);
            setSurveyResult({
              survey_id: currentData.surveyId,
              content_hash: contentHash,
              created_at: currentData.timestamp,
              is_active: true
            });
            // 이 설문을 기본 선택 설문으로 설정
            localStorage.setItem('selectedSurveyId', currentData.surveyId);
            return;
          }
        }
        
        if (existingSurvey) {
          const existingData = JSON.parse(existingSurvey);
          const existingSurveyId = existingData.surveyId;
          
          // 기존 설문이 여전히 유효한지 확인
          try {
            const response = await fetch(`/api/v1/materiality-service/surveys/${existingSurveyId}`);
            if (response.ok) {
              // 기존 설문이 유효하면 재사용
              setGeneratedSurveyId(existingSurveyId);
              const surveyLink = `${window.location.origin}/survey?id=${existingSurveyId}`;
              
              alert(`✅ 동일한 내용의 설문이 이미 존재합니다!\n\n📊 총 ${selectedCategories.length}개 카테고리\n🔗 기존 설문 링크가 클립보드에 복사되었습니다.\n\n링크: ${surveyLink}`);
              
              // 클립보드에 복사
              navigator.clipboard.writeText(surveyLink).catch(() => {
                console.log('클립보드 복사 실패');
              });
              
              return; // 기존 설문 재사용하고 종료
            }
          } catch (error) {
            console.log('기존 설문 확인 실패, 새로 생성합니다:', error);
            // 기존 설문이 유효하지 않으면 새로 생성
          }
        }

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
        const corpId = '1'; // 실제 corporation 테이블의 id 사용
        const surveyRequest = {
          corporation_id: corpId,
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
          } : null,
          content_hash: contentHash // 설문 내용 해시값 추가
        };

        // Gateway를 통해 materiality-service로 전송
        const response = await fetch('/api/v1/materiality-service/surveys', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(surveyRequest)
        });

        if (!response.ok) {
          throw new Error(`설문 생성 실패: ${response.status} ${response.statusText}`);
        }

        const surveyResponse = await response.json();
        const rawSurveyId = surveyResponse.survey_id;
        const surveyId = normalizeSurveyKey(rawSurveyId);
        
        console.log('✅ 설문 데이터 백엔드 저장 완료:', {
          surveyId: surveyId,
          categories: surveyResponse.total_categories,
          companyId: surveyResponse.company_id,
          contentHash: surveyResponse.content_hash
        });
        
        // Store the generated survey ID and result
        setGeneratedSurveyId(surveyId);
        setSurveyResult({
          survey_id: surveyId,
          content_hash: surveyResponse.content_hash,
          created_at: new Date().toISOString(),
          is_active: true
        });
        
        // 설문 내용 해시값과 함께 저장
        const surveyData = {
          surveyId: surveyId,
          contentHash: contentHash,
          timestamp: new Date().toISOString(),
          categoryCount: selectedCategories.length
        };
        
        // 기존 설문 데이터 저장 (companyId 기반)
        localStorage.setItem(`surveyData_${companyId}`, JSON.stringify(surveyData));
        
        // 설문 내용 해시 기반으로도 저장 (중복 생성 방지용)
        localStorage.setItem(existingSurveyKey, JSON.stringify(surveyData));
        
        // Generate survey link
        const surveyLink = `${window.location.origin}/survey?id=${surveyId}`;
        
        // Copy link to clipboard
        navigator.clipboard.writeText(surveyLink).then(() => {
          alert(`✅ 설문이 생성되었습니다!\n\n📊 총 ${selectedCategories.length}개 카테고리\n🔗 설문 링크가 클립보드에 복사되었습니다.\n\n링크: ${surveyLink}\n\n💡 설문 관리 페이지에서 이메일 발송을 진행하세요.`);
        }).catch(() => {
          // Fallback: show link in alert
          alert(`✅ 설문이 생성되었습니다!\n\n📊 총 ${selectedCategories.length}개 카테고리\n🔗 설문 링크:\n${surveyLink}\n\n위 링크를 복사하여 공유하세요.\n\n💡 설문 관리 페이지에서 이메일 발송을 진행하세요.`);
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



  // 데이터가 숨겨진 상태일 때 표시
  if (isDataHidden) {
    return (
      <div id="survey-create" className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="bg-gray-50 rounded-lg p-12 text-center border-2 border-dashed border-gray-300">
          <div className="text-4xl text-gray-300 mb-4">📝</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">설문 생성</h3>
          <p className="text-gray-500 mb-6">중대성 평가를 완료하면 여기서 설문을 생성할 수 있습니다.</p>
          
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
            설문 생성 시작하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="survey-create" className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* 왼쪽: 버튼들 */}
        <div className="flex-1 text-center">
          <button
            onClick={handleCreate}
            disabled={!assessmentResult && !generatedSurveyId}
            className={`inline-flex items-center px-8 py-4 border-2 text-lg font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl ${
              assessmentResult || generatedSurveyId
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
            {generatedSurveyId 
              ? '이미 설문이 생성되어 있습니다. 새로운 설문을 생성하려면 버튼을 클릭하세요.'
              : '중간 중대성 평가 결과를 바탕으로 설문을 생성합니다'
            }
          </p>
          <p className="text-xs text-blue-600 mt-2">
            💡 설문 생성 후 "설문 관리" 페이지에서 이메일 발송을 진행하세요
          </p>
          <div className="mt-4">
            <button
              onClick={handlePreview}
              disabled={!generatedSurveyId}
              className={`inline-flex items-center px-6 py-3 border-2 text-base font-semibold rounded-lg transition-all duration-200 ${
                generatedSurveyId
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

                      {/* 오른쪽: URL 표시 및 복사 기능 */}
        {generatedSurveyId && (
          <div className="flex-1 bg-gray-50 rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              설문 URL
            </h3>
            
            <div className="space-y-4">
              {/* 현재 활성 설문 URL */}
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex flex-col">
                    <span className="font-medium text-blue-900">현재 활성 설문</span>
                    <span className="text-sm text-blue-700">
                      {displayCategoryCount || (assessmentResult?.data?.matched_categories || assessmentResult?.matched_categories || []).length || 0}개 문항
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                      v{surveyResult?.content_hash?.substring(0, 4) || '0000'}
                    </span>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">활성</span>
                  </div>
                </div>
                <div className="font-mono text-sm text-blue-700 break-all bg-blue-50 p-2 rounded border border-blue-200">
                  {`${window.location.origin}/survey?id=${generatedSurveyId}`}
                </div>
                <div className="mt-2 text-xs text-blue-600">
                  생성일시: {new Date(surveyResult?.created_at || Date.now()).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
                <button
                  onClick={() => {
                    const surveyLink = `${window.location.origin}/survey?id=${generatedSurveyId}`;
                    navigator.clipboard.writeText(surveyLink).then(() => {
                      alert('✅ 설문 URL이 클립보드에 복사되었습니다!');
                    }).catch(() => {
                      alert('❌ URL 복사에 실패했습니다. 위 링크를 직접 복사해주세요.');
                    });
                  }}
                  className="mt-3 w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  URL 복사하기
                </button>
              </div>

              {/* 이전 설문 목록 */}
              <div className="bg-gray-100 rounded-lg p-4 border border-gray-300">
                <h4 className="font-medium text-gray-800 mb-3">이전 설문 목록</h4>
                <div className="space-y-3">
                  {/* 이전 설문들을 localStorage에서 가져와서 표시 */}
                  {(() => {
                    const previousSurveys = [];
                    for (let i = 0; i < localStorage.length; i++) {
                      const key = localStorage.key(i);
                      if (key?.startsWith('surveyData_') && key !== `surveyData_${companyId}`) {
                        try {
                          const data = JSON.parse(localStorage.getItem(key) || '');
                          if (data.surveyId && data.surveyId !== generatedSurveyId) {
                            previousSurveys.push({
                              id: data.surveyId,
                              contentHash: data.contentHash,
                              timestamp: data.timestamp,
                              categoryCount: data.categoryCount || 0 // 카테고리 개수 추가
                            });
                          }
                        } catch (e) {
                          console.warn('이전 설문 데이터 파싱 실패:', e);
                        }
                      }
                    }

                    // 최신순으로 정렬하고 최대 3개만 표시
                    const sortedSurveys = previousSurveys
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .slice(0, 3);

                    return sortedSurveys.length > 0 ? (
                      sortedSurveys.map((survey, index) => (
                        <div key={survey.id} className="bg-white rounded-lg p-3 border border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-gray-700">
                                {survey.categoryCount}개 문항
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(survey.timestamp).toLocaleDateString('ko-KR', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                              v{survey.contentHash?.substring(0, 4) || '0000'}
                            </span>
                          </div>
                          <div className="font-mono text-xs text-gray-600 break-all bg-gray-50 p-2 rounded">
                            {`${window.location.origin}/survey?id=${survey.id}`}
                          </div>
                          <div className="mt-2 flex justify-end space-x-2">
                            <button
                              onClick={() => {
                                const surveyLink = `${window.location.origin}/survey?id=${survey.id}`;
                                navigator.clipboard.writeText(surveyLink).then(() => {
                                  alert('✅ 이전 설문 URL이 복사되었습니다!');
                                });
                              }}
                              className="text-xs text-blue-600 hover:text-blue-800"
                            >
                              URL 복사
                            </button>
                            <button
                                                                            onClick={async () => {
                                if (confirm('이 이전 설문을 삭제하시겠습니까?\n연결된 응답 데이터도 함께 삭제됩니다.')) {
                                  try {
                                    const response = await fetch(
                                      `/api/v1/materiality-service/surveys/${survey.id}`,
                                      { method: 'DELETE' }
                                    );
                                    if (response.ok) {
                                      // 모든 관련 localStorage 항목 삭제
                                      for (let i = 0; i < localStorage.length; i++) {
                                        const key = localStorage.key(i);
                                        if (key && (
                                          key === `surveyData_${companyId}` ||
                                          key.startsWith(`survey_${companyId}_`) ||
                                          key.includes(survey.id)
                                        )) {
                                          const data = JSON.parse(localStorage.getItem(key) || '{}');
                                          if (data.surveyId === survey.id) {
                                            localStorage.removeItem(key);
                                            console.log('🗑️ 삭제된 localStorage 키:', key);
                                          }
                                        }
                                      }

                                      // 선택된 설문 ID가 삭제된 설문인 경우 제거
                                      const selectedSurveyId = localStorage.getItem('selectedSurveyId');
                                      if (selectedSurveyId === survey.id) {
                                        localStorage.removeItem('selectedSurveyId');
                                      }

                                      alert('✅ 이전 설문이 삭제되었습니다.');
                                      window.location.reload();
                                    }
                                  } catch (error) {
                                    console.error('설문 삭제 실패:', error);
                                    alert('❌ 설문 삭제 중 오류가 발생했습니다.');
                                  }
                                }
                              }}
                              className="text-xs text-red-600 hover:text-red-800"
                            >
                              삭제
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-500 text-center py-3">
                        이전 설문이 없습니다
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* 설문 참여 안내 */}
              <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                <div className="text-sm text-yellow-800">
                  <p className="font-semibold mb-2">📋 설문 참여 안내</p>
                  <ul className="text-xs space-y-1">
                    <li>• 같은 이메일 주소로는 한 번만 응답 가능합니다</li>
                    <li>• 다른 사람이 참여하려면 다른 이메일 주소를 사용해야 합니다</li>
                    <li>• 설문 링크를 공유하여 여러 응답을 받을 수 있습니다</li>
                    <li>• 동일한 내용의 설문은 자동으로 응답이 통합됩니다</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SurveyCreate;


