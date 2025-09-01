import React from 'react';
import axios from 'axios';
import { handleViewReport } from '../handle_view_report';
import { loadAssessmentResult } from '../load_assessment_result';
import { fetchAllCategories } from '../fetch_all_categories';
import { addNewCategory } from '../add_new_category';

interface FirstAssessmentProps {
  companyId: string;
  searchResult: any;
  issuepoolData: any;
  assessmentResult: any;
  isIssuepoolLoading: boolean;
  isAssessmentStarting: boolean;
  isBaseIssuePoolModalOpen: boolean;
  isAddCategoryModalOpen: boolean;
  selectedCategory: any;
  editingCategoryIndex: number;
  baseIssuePoolOptions: string[];
  selectedBaseIssuePool: string;
  allCategories: any[];
  selectedNewCategory: string;
  newCategoryRank: string;
  newBaseIssuePool: string;
  isCustomBaseIssuePool: boolean;
  customBaseIssuePoolText: string;
  setAssessmentResult: (result: any) => void;
  setIsAssessmentStarting: (starting: boolean) => void;
  setIsIssuepoolLoading: (loading: boolean) => void;
  setIssuepoolData: (data: any) => void;
  setIsBaseIssuePoolModalOpen: (open: boolean) => void;
  setIsAddCategoryModalOpen: (open: boolean) => void;
  setSelectedCategory: (category: any) => void;
  setEditingCategoryIndex: (index: number) => void;
  setBaseIssuePoolOptions: (options: string[]) => void;
  setSelectedBaseIssuePool: (option: string) => void;
  setAllCategories: (categories: any[]) => void;
  setSelectedNewCategory: (category: string) => void;
  setNewCategoryRank: (rank: string) => void;
  setNewBaseIssuePool: (pool: string) => void;
  setIsCustomBaseIssuePool: (custom: boolean) => void;
  setCustomBaseIssuePoolText: (text: string) => void;
  setIsDetailModalOpen: (open: boolean) => void;
  excelData: any[];
}

const FirstAssessment: React.FC<FirstAssessmentProps> = ({
  companyId,
  searchResult,
  issuepoolData,
  assessmentResult,
  isIssuepoolLoading,
  isAssessmentStarting,
  isBaseIssuePoolModalOpen,
  isAddCategoryModalOpen,
  selectedCategory,
  editingCategoryIndex,
  baseIssuePoolOptions,
  selectedBaseIssuePool,
  allCategories,
  selectedNewCategory,
  newCategoryRank,
  newBaseIssuePool,
  isCustomBaseIssuePool,
  customBaseIssuePoolText,
  setAssessmentResult,
  setIsAssessmentStarting,
  setIsIssuepoolLoading,
  setIssuepoolData,
  setIsBaseIssuePoolModalOpen,
  setIsAddCategoryModalOpen,
  setSelectedCategory,
  setEditingCategoryIndex,
  setBaseIssuePoolOptions,
  setSelectedBaseIssuePool,
  setAllCategories,
  setSelectedNewCategory,
  setNewCategoryRank,
  setNewBaseIssuePool,
  setIsCustomBaseIssuePool,
  setCustomBaseIssuePoolText,
  setIsDetailModalOpen,
  excelData
}) => {
  const saveAssessmentResult = () => {
    if (assessmentResult) {
      try {
        // 데이터 구조 통일: assessmentResult.data가 우선, 없으면 assessmentResult 직접 사용
        const resultData = assessmentResult?.data || assessmentResult;
        const categories = resultData?.matched_categories || [];
        
        // 필수 정보 + base_issuepools 목록까지 포함하여 저장
        const optimizedCategories = categories.map((cat: any) => ({
          rank: cat.rank || 0,
          category: cat.category || '',
          esg_classification: cat.esg_classification || '',
          selected_base_issue_pool: cat.selected_base_issue_pool || '',
          final_score: cat.final_score || 0,
          total_issuepools: cat.total_issuepools || 0,
          base_issuepools: Array.isArray(cat.base_issuepools)
            ? cat.base_issuepools.map((item: any) => ({
                base_issue_pool: item?.base_issue_pool || item?.issue || '',
                esg_classification_name: item?.esg_classification_name || '',
                ranking: item?.ranking || 0
              }))
            : []
        }));
        
        const dataToSave = {
          assessment_result: {
            company_id: companyId,
            search_period: resultData?.search_period || '',
            matched_categories: optimizedCategories
          },
          company_id: companyId,
          timestamp: new Date().toISOString(),
          total_categories: categories.length,
          categories_with_base_issue_pool: categories.filter((cat: any) => cat.selected_base_issue_pool).length
        };
        
        // localStorage 용량 확인 및 정리
        try {
          localStorage.setItem('materialityAssessmentResult', JSON.stringify(dataToSave));
          console.log('💾 중대성 평가 결과 저장 완료:', dataToSave);
          console.log('📋 저장된 카테고리 수:', categories.length);
          console.log('📋 Base Issue Pool이 설정된 카테고리 수:', categories.filter((cat: any) => cat.selected_base_issue_pool).length);
          alert(`✅ 중대성 평가 결과가 성공적으로 저장되었습니다!\n\n📊 총 ${categories.length}개 카테고리\n📋 Base Issue Pool 설정: ${categories.filter((cat: any) => cat.selected_base_issue_pool).length}개`);
        } catch (storageError: any) {
          if (storageError.name === 'QuotaExceededError') {
            // localStorage 용량 부족 시 기존 데이터 정리
            console.log('⚠️ localStorage 용량 부족, 기존 데이터 정리 중...');
            localStorage.clear();
            
            // 다시 저장 시도
            localStorage.setItem('materialityAssessmentResult', JSON.stringify(dataToSave));
            console.log('💾 중대성 평가 결과 저장 완료 (용량 정리 후):', dataToSave);
            alert(`✅ 중대성 평가 결과가 성공적으로 저장되었습니다!\n\n📊 총 ${categories.length}개 카테고리\n📋 Base Issue Pool 설정: ${categories.filter((cat: any) => cat.selected_base_issue_pool).length}개`);
          } else {
            throw storageError;
          }
        }
      } catch (error) {
        console.error('❌ 중대성 평가 결과 저장 실패:', error);
        alert('❌ 중대성 평가 결과 저장에 실패했습니다.');
      }
    } else {
      alert('❌ 저장할 중대성 평가 결과가 없습니다.');
    }
  };

  return (
    <div id="middle-issuepool" className="bg-white rounded-xl shadow-lg p-6 mb-12">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">
        📑 {companyId ? `${companyId} 중대성 평가 중간 결과 보기` : '중대성 평가 중간 결과 보기'}
      </h2>

      {/* 액션 버튼들 */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <button
          onClick={() => handleViewReport(searchResult, setIsIssuepoolLoading, setIssuepoolData)}
          disabled={!searchResult?.data || isIssuepoolLoading}
          className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
            !searchResult?.data || isIssuepoolLoading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
          }`}
        >
          {isIssuepoolLoading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              조회 중...
            </span>
          ) : (
            '📊 지난 중대성 평가 목록 보기'
          )}
        </button>
        
        <button
          onClick={async () => {
            // 1. 데이터 검증 강화
            if (!searchResult?.data) {
              alert('먼저 미디어 검색을 완료해주세요.');
              return;
            }

            // 2. articles 데이터 존재 여부 확인
            if (!searchResult.data.articles || searchResult.data.articles.length === 0) {
              alert('검색된 기사가 없습니다. 미디어 검색을 먼저 완료해주세요.');
              return;
            }


            // 로딩 상태 시작
            setIsAssessmentStarting(true);

            try {
              // 3. 기사 데이터 구조 검증 및 안전한 매핑
              const formattedArticles = searchResult.data.articles.map((article: any) => {
                // article 객체의 각 필드가 undefined일 수 있으므로 안전하게 처리
                return {
                  company: article?.company || searchResult.data.company_id || '',
                  issue: article?.issue || '',
                  original_category: article?.original_category || '',
                  query_kind: article?.query_kind || '',
                  keyword: article?.keyword || '',
                  title: article?.title || '',
                  description: article?.description || '',
                  pubDate: article?.pubDate || '',
                  originallink: article?.originallink || ''
                };
              });

              const requestData = {
                company_id: searchResult.data.company_id,
                report_period: searchResult.data.search_period,
                request_type: 'middleissue_assessment',
                timestamp: new Date().toISOString(),
                articles: formattedArticles,
                total_results: searchResult.data.total_results || 0
              };

              console.log('🚀 중대성 평가 요청 데이터:', requestData);

              // Gateway를 통해 materiality-service 호출
              const gatewayUrl = 'https://gateway-production-4c8b.up.railway.app';
              const response = await axios.post(
                `${gatewayUrl}/api/v1/materiality-service/middleissue/assessment`,
                requestData,
                {
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  timeout: 120000  // 2분 타임아웃 설정
                }
              );

              if (response.data.success) {
                // 4. 응답 데이터 구조 통일 - response.data.data가 우선, 없으면 response.data 사용
                const responseData = response.data.data || response.data;
                console.log('🔍 전체 응답 데이터:', response.data);
                console.log('🔍 사용할 응답 데이터:', responseData);
                
                // 매칭된 카테고리 정보 확인
                const matchedCategories = responseData.matched_categories || [];
                console.log('🔍 matched_categories:', matchedCategories);
                
                if (matchedCategories && matchedCategories.length > 0) {
                  console.log('✅ 중대성 평가 완료 - 매칭된 카테고리:', matchedCategories);
                  
                  // 5. 통일된 데이터 구조로 상태 저장
                  setAssessmentResult(responseData);
                  console.log('🔍 assessmentResult 상태 설정:', responseData);
                  
                  // 간단한 완료 메시지만 표시
                  alert('✅ 중간 중대성 평가 완료');
                } else {
                  console.log('⚠️ matched_categories가 비어있음');
                  // 6. 빈 결과도 상태에 저장하여 UI에서 처리할 수 있도록 함
                  setAssessmentResult(responseData);
                  alert('✅ 중간 중대성 평가 완료\n\n매칭된 카테고리가 없습니다.');
                }
              } else {
                console.log('❌ 응답 실패:', response.data);
                alert('❌ 중대성 평가 시작에 실패했습니다: ' + (response.data.message || '알 수 없는 오류'));
              }
            } catch (error: any) {
              console.error('❌ 중대성 평가 시작 중 오류:', error);
              
              // Railway 로그 레이트 리밋 관련 에러 처리
              if (error.response?.status === 500) {
                let errorMessage = '❌ 서버 내부 오류가 발생했습니다.\n\n';
                
                if (error.response?.data?.message?.includes('rate limit')) {
                  errorMessage += '🚨 Railway 로그 레이트 리밋에 도달했습니다.\n';
                  errorMessage += '잠시 후 다시 시도해주세요.';
                } else {
                  errorMessage += '🔧 서버에서 처리 중 오류가 발생했습니다.\n';
                  errorMessage += '잠시 후 다시 시도하거나 관리자에게 문의해주세요.';
                }
                
                alert(errorMessage);
              } else if (error.code === 'ECONNABORTED') {
                alert('⏰ 요청 시간이 초과되었습니다.\n\n서버가 과부하 상태일 수 있습니다.\n잠시 후 다시 시도해주세요.');
              } else if (error.response?.status >= 500) {
                alert('🚨 서버 오류가 발생했습니다.\n\nRailway 환경에서 일시적인 문제가 있을 수 있습니다.\n잠시 후 다시 시도해주세요.');
              } else {
                alert('❌ 중대성 평가 시작 중 오류가 발생했습니다.\n\n' + (error.message || '알 수 없는 오류'));
              }
            } finally {
              // 로딩 상태 종료 (성공/실패 상관없이)
              setIsAssessmentStarting(false);
            }
          }}
          disabled={isAssessmentStarting}
          className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl ${
            isAssessmentStarting 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {isAssessmentStarting ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              <span>중간 중대성 평가 진행 중...</span>
            </>
          ) : (
            <>
              <span className="mr-2">🚀</span>
              <span>새로운 중대성 평가 시작</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 첫 번째 섹션: year-2년 */}
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
          <div className="text-center mb-4">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800">
              {issuepoolData ? `${issuepoolData.year_minus_2?.year}년` : 'year-2년'}
            </h3>
          </div>
        
        {issuepoolData?.year_minus_2 ? (
          <div className="space-y-2">
            {issuepoolData.year_minus_2.issuepools.map((item: any, index: number) => (
              <div key={item.id} className="flex items-center text-sm">
                <span className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xs font-medium mr-3">
                  {item.ranking}
                </span>
                <span className="text-gray-700 flex-1 truncate">{item.base_issue_pool}</span>
                {/* ESG Classification 라벨 추가 */}
                <span className="ml-2 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full">
                  {item.esg_classification_name ?? "미분류"}
                </span>
              </div>
            ))}
            <div className="text-center text-xs text-gray-500 mt-3">
              총 {issuepoolData.year_minus_2.total_count}개 항목
            </div>

            {/* ESG 분류 막대그래프 추가 */}
            {issuepoolData.year_minus_2.issuepools.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <h4 className="text-md font-semibold text-gray-700 mb-3">ESG 분류 비율</h4>
                {(() => {
                  // 백엔드에서 계산된 ESG 분포 데이터 사용
                  const esgDistribution = issuepoolData.year_minus_2.esg_distribution;
                  
                  if (!esgDistribution) {
                    return <div className="text-sm text-gray-500">ESG 분포 데이터가 없습니다.</div>;
                  }
                  
                  // ESG 분류별로 막대그래프 렌더링
                  return Object.entries(esgDistribution).map(([esgName, data]: [string, any]) => {
                    // ESG 분류에 따른 색상 결정
                    let barColor = 'bg-gray-500'; // 기본 색상
                    if (esgName.includes('환경')) {
                      barColor = 'bg-green-500';
                    } else if (esgName.includes('사회')) {
                      barColor = 'bg-orange-500';
                    } else if (esgName.includes('지배구조') || esgName.includes('경제')) {
                      barColor = 'bg-blue-500';
                    }
                    
                    return (
                      <div key={esgName} className="mb-2">
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>{esgName} ({(data as any).count}개)</span>
                          <span>{(data as any).percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div
                            className={`${barColor} h-2.5 rounded-full`}
                            style={{ width: `${(data as any).percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-gray-500 text-sm">
            여기에 내용을 추가하세요
          </div>
        )}
      </div>

      {/* 두 번째 섹션: year-1년 */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
        <div className="text-center mb-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800">
            {issuepoolData ? `${issuepoolData.year_minus_1?.year}년` : 'year-1년'}
          </h3>
        </div>
        
        {issuepoolData?.year_minus_1 ? (
          <div className="space-y-2">
            {issuepoolData.year_minus_1.issuepools.map((item: any, index: number) => (
              <div key={item.id} className="flex items-center text-sm">
                <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3">
                  {item.ranking}
                </span>
                <span className="text-gray-700 flex-1 truncate">{item.base_issue_pool}</span>
                {/* ESG Classification 라벨 추가 */}
                <span className="ml-2 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full">
                  {item.esg_classification_name ?? "미분류"}
                </span>
              </div>
            ))}
            <div className="text-center text-xs text-gray-500 mt-3">
              총 {issuepoolData.year_minus_1.total_count}개 항목
            </div>

            {/* ESG 분류 막대그래프 추가 */}
            {issuepoolData.year_minus_1.issuepools.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <h4 className="text-md font-semibold text-gray-700 mb-3">ESG 분류 비율</h4>
                {(() => {
                  // 백엔드에서 계산된 ESG 분포 데이터 사용
                  const esgDistribution = issuepoolData.year_minus_1.esg_distribution;
                  
                  if (!esgDistribution) {
                    return <div className="text-sm text-gray-500">ESG 분포 데이터가 없습니다.</div>;
                  }
                  
                  // ESG 분류별로 막대그래프 렌더링
                  return Object.entries(esgDistribution).map(([esgName, data]: [string, unknown]) => {
                    // 타입 안전성을 위한 타입 가드
                    const typedData = data as { count: number; percentage: number };
                    
                    // ESG 분류에 따른 색상 결정
                    let barColor = 'bg-gray-500'; // 기본 색상
                    if (esgName.includes('환경')) {
                      barColor = 'bg-green-500';
                    } else if (esgName.includes('사회')) {
                      barColor = 'bg-orange-500';
                    } else if (esgName.includes('지배구조') || esgName.includes('경제')) {
                      barColor = 'bg-blue-500';
                    }
                    
                    return (
                      <div key={esgName} className="mb-2">
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>{esgName} ({typedData.count}개)</span>
                          <span>{typedData.percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div
                            className={`${barColor} h-2.5 rounded-full`}
                            style={{ width: `${typedData.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-gray-500 text-sm">
            여기에 내용을 추가하세요
          </div>
        )}
      </div>

      {/* 세 번째 섹션: 1차 중대성 평가 결과 */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
        <div className="text-center mb-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800">중대성 평가 중간 결과</h3>
          <p className="text-sm text-gray-500 mt-1">카테고리별로 세부 이슈를 선택하세요</p>
        </div>
        
        {assessmentResult ? (
          <div className="space-y-4">

            
            {/* 전체 카테고리 목록 */}
            {(() => {
              // 데이터 구조 통일: assessmentResult.data가 우선, 없으면 assessmentResult 직접 사용
              const resultData = assessmentResult?.data || assessmentResult;
              const categories = resultData?.matched_categories || [];
              
              if (categories.length > 0) {
                return (
                  <div className="space-y-2">
                    {categories.map((cat: any, index: number) => (
                      <div key={index} className="flex items-center text-sm group">
                        <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-medium mr-3">
                          {cat.rank || index + 1}
                        </span>
                        <div className="flex-1">
                          <span 
                            className="text-gray-700 cursor-pointer hover:text-blue-600 hover:underline font-medium"
                            onClick={() => {
                              // 카테고리 클릭 시 base issue pool 선택 모달 열기
                              setSelectedCategory(cat);
                              setEditingCategoryIndex(index);
                              
                              // 실제 데이터에서 base issue pool 옵션 가져오기
                              const baseIssuePools = cat.base_issuepools || [];
                              if (baseIssuePools.length > 0) {
                                // base_issue_pool 필드가 있는 경우 해당 값들을 사용
                                const options = baseIssuePools.map((item: any) => 
                                  item.base_issue_pool || item.issue || '항목명 없음'
                                );
                                setBaseIssuePoolOptions(options);
                              } else {
                                // base_issuepools가 없는 경우 기본 옵션 제공
                                setBaseIssuePoolOptions([
                                  `${cat.category} 관련 이슈 1`,
                                  `${cat.category} 관련 이슈 2`,
                                  `${cat.category} 관련 이슈 3`
                                ]);
                              }
                              setSelectedBaseIssuePool('');
                              setIsBaseIssuePoolModalOpen(true);
                            }}
                            title="클릭하여 base issue pool 선택"
                          >
                            {cat.category || '카테고리명 없음'}
                          </span>
                          {/* 선택된 base issue pool 표시 */}
                          {cat.selected_base_issue_pool && (
                            <div className="text-xs text-blue-600 mt-1">
                              📋 선택된 항목: {cat.selected_base_issue_pool}
                            </div>
                          )}
                        </div>
                        {/* ESG Classification 라벨 추가 */}
                        <span className="ml-2 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full">
                          {cat.esg_classification || "미분류"}
                        </span>
                        {/* 삭제 버튼 */}
                        <button
                          onClick={() => {
                            if (confirm(`정말로 "${cat.category}" 카테고리를 삭제하시겠습니까?`)) {
                              // 해당 카테고리 삭제
                              const resultData = assessmentResult?.data || assessmentResult;
                              const updatedCategories = [...(resultData?.matched_categories || [])];
                              updatedCategories.splice(index, 1);
                              
                              // 순위 재정렬
                              updatedCategories.forEach((category, idx) => {
                                category.rank = idx + 1;
                              });
                              
                              // 상태 업데이트
                              if (assessmentResult?.data) {
                                setAssessmentResult({
                                  ...assessmentResult,
                                  data: {
                                    ...assessmentResult.data,
                                    matched_categories: updatedCategories
                                  }
                                });
                              } else {
                                setAssessmentResult({
                                  ...assessmentResult,
                                  matched_categories: updatedCategories
                                });
                              }
                              
                              alert(`✅ "${cat.category}" 카테고리가 삭제되었습니다.`);
                            }
                          }}
                          className="ml-3 p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all duration-200"
                          title="이 카테고리 삭제"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    <div className="text-center text-xs text-gray-500 mt-3">
                      총 {categories.length}개 항목
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* ESG 분류 막대그래프 */}
            {(() => {
              // 데이터 구조 통일: assessmentResult.data가 우선, 없으면 assessmentResult 직접 사용
              const resultData = assessmentResult?.data || assessmentResult;
              const categories = resultData?.matched_categories || [];
              
              if (categories.length > 0) {
                return (
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <h4 className="text-md font-semibold text-gray-700 mb-3">ESG 분류 비율</h4>
                    {(() => {
                      // ESG 분류별로 카운트 계산 (지배구조와 경제를 합침)
                      const esgCounts: { [key: string]: number } = {};
                      categories.forEach((cat: any) => {
                        let esgName = cat.esg_classification || '미분류';
                        
                        // 지배구조와 경제를 지배구조/경제로 통합
                        if (esgName.includes('지배구조') || esgName.includes('경제')) {
                          esgName = '지배구조/경제';
                        }
                        
                        esgCounts[esgName] = (esgCounts[esgName] || 0) + 1;
                      });

                      // 비율 계산
                      const total = categories.length;
                      const esgDistribution = Object.entries(esgCounts).map(([esgName, count]) => ({
                        name: esgName,
                        count,
                        percentage: Math.round((count / total) * 100)
                      }));

                      // ESG 분류별로 막대그래프 렌더링
                      return esgDistribution.map((data) => {
                        // ESG 분류에 따른 색상 결정
                        let barColor = 'bg-gray-500'; // 기본 색상
                        if (data.name.includes('환경')) {
                          barColor = 'bg-green-500';
                        } else if (data.name.includes('사회')) {
                          barColor = 'bg-orange-500';
                        } else if (data.name.includes('지배구조/경제')) {
                          barColor = 'bg-blue-500';
                        }
                        
                        return (
                          <div key={data.name} className="mb-2">
                            <div className="flex justify-between text-xs text-gray-600 mb-1">
                              <span>{data.name} ({data.count}개)</span>
                              <span>{data.percentage}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                              <div
                                className={`${barColor} h-2.5 rounded-full`}
                                style={{ width: `${data.percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                );
              }
              return null;
            })()}

            {/* 더보기 버튼 */}
            <div className="mt-4 text-center">
              <div className="flex items-center justify-center space-x-3">
                {/* 저장 버튼 */}
                <button
                  onClick={saveAssessmentResult}
                  disabled={!assessmentResult}
                  className={`inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md transition-colors duration-200 ${
                    assessmentResult
                      ? 'border-blue-300 text-blue-700 bg-white hover:bg-blue-50'
                      : 'border-gray-300 text-gray-400 bg-gray-100 cursor-not-allowed'
                  }`}
                  title={assessmentResult ? '중대성 평가 결과를 저장합니다' : '저장할 결과가 없습니다'}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  저장
                </button>
                
                {/* 불러오기 버튼 */}
                <button
                  onClick={() => loadAssessmentResult(setAssessmentResult, () => {}, () => {}, () => {})}
                  className="inline-flex items-center px-4 py-2 border border-purple-300 text-sm font-medium rounded-md text-purple-700 bg-white hover:bg-purple-50 transition-colors duration-200"
                  title="저장된 중대성 평가 결과를 불러옵니다"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  불러오기
                </button>
                
                {/* 추가하기 버튼 */}
                <button
                  onClick={() => {
                    fetchAllCategories(setAllCategories);
                    setIsAddCategoryModalOpen(true);
                  }}
                  className="inline-flex items-center px-4 py-2 border border-orange-300 text-sm font-medium rounded-md text-orange-700 bg-white hover:bg-orange-50 transition-colors duration-200"
                  title="새로운 카테고리를 추가합니다"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  추가하기
                </button>
              </div>
              
              {/* 중간 평가 과정 확인하기 버튼 */}
              <div className="mt-3">
                <button
                  onClick={() => {
                    // 데이터 구조 통일: assessmentResult.data가 우선, 없으면 assessmentResult 직접 사용
                    const resultData = assessmentResult?.data || assessmentResult;
                    const categories = resultData?.matched_categories || [];
                    
                    if (categories.length > 0) {
                      setIsDetailModalOpen(true);
                    }
                  }}
                  disabled={(() => {
                    // 데이터 구조 통일: assessmentResult.data가 우선, 없으면 assessmentResult 직접 사용
                    const resultData = assessmentResult?.data || assessmentResult;
                    const categories = resultData?.matched_categories || [];
                    return categories.length === 0;
                  })()}
                  className={`inline-flex items-center px-6 py-3 border border-green-300 text-sm font-medium rounded-md transition-colors duration-200 ${
                    (() => {
                      // 데이터 구조 통일: assessmentResult.data가 우선, 없으면 assessmentResult 직접 사용
                      const resultData = assessmentResult?.data || assessmentResult;
                      const categories = resultData?.matched_categories || [];
                      return categories.length > 0;
                    })()
                      ? 'text-green-700 bg-white hover:bg-green-50'
                      : 'text-gray-400 bg-gray-100 cursor-not-allowed'
                  }`}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  중간 평가 과정 확인하기
                </button>
              </div>


            </div>
          </div>
        ) : (
        <div className="text-center text-gray-500 text-sm">
            새로운 중대성 평가를 시작하면 여기에 결과가 표시됩니다.
        </div>
        )}
      </div>
    </div>
  </div>
  );
};

export default FirstAssessment;
