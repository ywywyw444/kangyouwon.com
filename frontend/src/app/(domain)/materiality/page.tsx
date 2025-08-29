'use client';

import React, { useState, ChangeEvent, useEffect } from 'react';
import NavigationTabs from '@/component/NavigationTabs';
import { MediaCard, MediaItem } from '@/component/MediaCard';
import IndexBar from '@/component/IndexBar';
import { useMediaStore } from '@/store/mediaStore';
import { IssuepoolData } from "../../lib/types";
import axios from 'axios';
import * as XLSX from 'xlsx';
import { useExcelDataStore } from '@/store/excelDataStore';
import FinalIssuepool from '@/component/materiality/box/final_issuepool';
import MediaSearch from '@/component/materiality/box/media_search';
import SearchResult from '@/component/materiality/box/search_result';
import FirstAssessment from '@/component/materiality/box/first_assessment';
import SurveyUpload from '@/component/materiality/box/survey_upload';
import SurveyManagement from '@/component/materiality/box/survey_management';
import SurveyResult from '@/component/materiality/box/survey_result';
import { handleViewReport } from '@/component/materiality/handle_view_report';
import { loadAssessmentResult } from '@/component/materiality/load_assessment_result';
import { fetchAllCategories } from '@/component/materiality/fetch_all_categories';

import { addNewCategory } from '@/component/materiality/add_new_category';
import { getESGClassification } from '@/component/materiality/get_esg_classification';



export default function MaterialityHomePage() {
  // Zustand store 사용
  const {
    loading: isMediaSearching,
    error,
    companyId,
    searchPeriod,
    articles,
    totalResults,
    setCompanyId,
    setSearchPeriod,
    setLoading,
    searchMedia,
    reset: resetMediaSearch
  } = useMediaStore();

  // 기업 관련 상태
  const [companies, setCompanies] = useState<string[]>([]);
  const [isCompanyLoading, setIsCompanyLoading] = useState(false);
  const [companySearchTerm, setCompanySearchTerm] = useState('');
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);

  // 검색 결과 관련 상태
  const [searchResult, setSearchResult] = useState<any>(null);
  const [isSearchResultCollapsed, setIsSearchResultCollapsed] = useState(false);
  const [isFullResultCollapsed, setIsFullResultCollapsed] = useState(true);

  // 엑셀 파일 관련 상태 (Zustand store 사용)
  const { 
    excelData,
    isValid: isExcelValid,
    fileName: excelFilename,
    base64Data: excelBase64,
    setExcelData,
    setIsValid: setIsExcelValid,
    setFileName: setExcelFilename,
    setBase64Data: setExcelBase64,
    updateRow,
    deleteRow,
    reset,
    loadFromStorage,
    saveToLocalStorage
  } = useExcelDataStore();

  // 화면 표시 제어를 위한 별도 상태
  const [isDataHidden, setIsDataHidden] = useState(false);
  
  // 모달 상태
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  // base issue pool 선택 모달 상태
  const [isBaseIssuePoolModalOpen, setIsBaseIssuePoolModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [baseIssuePoolOptions, setBaseIssuePoolOptions] = useState<string[]>([]);
  const [selectedBaseIssuePool, setSelectedBaseIssuePool] = useState<string>('');
  const [editingCategoryIndex, setEditingCategoryIndex] = useState<number>(-1);
  
  // 새로운 카테고리 추가 모달 상태
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [selectedNewCategory, setSelectedNewCategory] = useState<string>('');
  const [newCategoryRank, setNewCategoryRank] = useState<number>(1);
  const [newBaseIssuePool, setNewBaseIssuePool] = useState<string>('');
  const [isCustomBaseIssuePool, setIsCustomBaseIssuePool] = useState(false);
  const [customBaseIssuePoolText, setCustomBaseIssuePoolText] = useState<string>('');
  
  // 중대성 평가 관련 상태
  const [issuepoolData, setIssuepoolData] = useState<IssuepoolData | null>(null);
  const [isIssuepoolLoading, setIsIssuepoolLoading] = useState(false);
  const [isAssessmentStarting, setIsAssessmentStarting] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState<any>({
    matched_categories: [],
    total_articles: 0,
    negative_articles: 0,
    negative_ratio: 0,
    total_categories: 0
  });

  // 엑셀 데이터 상태 변경 시 자동으로 localStorage에 저장
  useEffect(() => {
    if (excelData.length > 0 || isExcelValid !== null || excelFilename !== null || excelBase64 !== null) {
      const dataToSave = {
        excelData,
        isValid: isExcelValid,
        fileName: excelFilename,
        base64Data: excelBase64
      };
      localStorage.setItem('excelUploadData', JSON.stringify(dataToSave));
      console.log('💾 엑셀 데이터 자동 저장:', dataToSave);
    }
  }, [excelData, isExcelValid, excelFilename, excelBase64]);

  // 로그인한 사용자의 기업 정보 가져오기
  useEffect(() => {
    const getUserCompany = () => {
      try {
        const userData = localStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          if (user.company_id && !companyId) {
            setCompanyId(user.company_id);
            setCompanySearchTerm(user.company_id);
            console.log('✅ 로그인된 사용자의 기업명 설정:', user.company_id);
          }
        }
      } catch (error) {
        console.error('사용자 정보를 가져오는데 실패했습니다:', error);
      }
    };

    getUserCompany();
  }, [companyId]);

  // 페이지 로드 시 localStorage에서 엑셀 데이터 자동 불러오기
  useEffect(() => {
    const loadExcelDataFromStorage = () => {
      try {
        const savedData = localStorage.getItem('excelUploadData');
        if (savedData) {
          const parsedData = JSON.parse(savedData);
          console.log('📂 localStorage에서 엑셀 데이터 불러오기:', parsedData);
          
          if (parsedData.excelData && parsedData.excelData.length > 0) {
            setExcelData(parsedData.excelData);
            setIsExcelValid(parsedData.isValid);
            setExcelFilename(parsedData.fileName);
            setExcelBase64(parsedData.base64Data);
            console.log('✅ 엑셀 데이터 자동 로드 완료');
          }
        }
      } catch (error) {
        console.error('localStorage에서 엑셀 데이터 불러오기 실패:', error);
      }
    };

    loadExcelDataFromStorage();
  }, []);

  // 기업 목록 가져오기
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setIsCompanyLoading(true);
        console.log('🔍 기업 목록을 Gateway를 통해 가져오는 중...');
        
        // Gateway를 통해 materiality-service 호출 (GET 방식)
        const gatewayUrl = 'https://gateway-production-4c8b.up.railway.app';
        const response = await axios.get(
          `${gatewayUrl}/api/v1/search/companies`,
          {
            headers: {
              'Content-Type': 'application/json',
            }
          }
        );

        console.log('✅ Gateway를 통한 기업 목록 API 응답:', response.data);

        if (response.data.success && response.data.companies) {
          const companyNames = response.data.companies.map((company: any) => company.companyname);
          setCompanies(companyNames);
          console.log(`✅ ${companyNames.length}개 기업 목록을 성공적으로 가져왔습니다.`);
          
          // 로그인된 사용자의 기업이 목록에 있는지 확인하고, 없다면 추가
          const userData = localStorage.getItem('user');
          if (userData) {
            const user = JSON.parse(userData);
            if (user.company_id && !companyNames.includes(user.company_id)) {
              setCompanies(prev => [user.company_id, ...prev]);
              console.log('✅ 사용자 기업을 목록 맨 앞에 추가:', user.company_id);
            }
          }
        } else {
          console.warn('⚠️ 기업 목록을 가져올 수 없습니다:', response.data);
        }
      } catch (error: any) {
        console.error('❌ Gateway를 통한 기업 목록 API 호출 실패 :', error);
        if (error.response) {
          console.error('응답 상태:', error.response.status);
          console.error('응답 데이터:', error.response.data);
        }
      } finally {
        setIsCompanyLoading(false);
      }
    };

    fetchCompanies();
  }, []);

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.company-dropdown-container')) {
        setIsCompanyDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 검색어에 따라 기업 목록 필터링
  const filteredCompanies = companies.filter(company =>
    company.toLowerCase().includes(companySearchTerm.toLowerCase())
  );

  // 기업 검색어 변경 처리
  const handleCompanySearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setCompanySearchTerm(e.target.value);
    setIsCompanyDropdownOpen(true);
  };

  return (
    <div className="min-h-screen bg-white"> {/* ROOT */}
      <IndexBar />
  
      {isMediaSearching && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-transparent" />
          <div className="relative bg-white rounded-xl shadow-2xl p-8 text-center border border-gray-200">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">미디어 검색 중...</h3>
            <p className="text-gray-600">네이버 뉴스 API를 통해 기사를 수집하고 있습니다.</p>
            <p className="text-gray-500 text-sm mt-2">잠시만 기다려주세요.</p>
          </div>
        </div>
      )}
  
      <NavigationTabs />
  
      <div className="bg-gradient-to-br from-gray-50 to-blue-50 p-6 pt-20"> {/* BG */}
        <div className="max-w-7xl mx-auto"> {/* CONTAINER */}
  
          {/* 헤더 */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">중대성 평가 자동화 플랫폼</h1>
            <p className="text-lg text-gray-600">기업의 중대성 이슈를 자동으로 추천합니다</p>
          </div>
  
          {/* 선택 옵션 */}
          <MediaSearch
            companyId={companyId || ''}
            companySearchTerm={companySearchTerm}
            searchPeriod={searchPeriod}
            isCompanyLoading={isCompanyLoading}
            isMediaSearching={isMediaSearching}
            companies={companies}
            filteredCompanies={filteredCompanies}
            isCompanyDropdownOpen={isCompanyDropdownOpen}
            setCompanyId={setCompanyId}
            setCompanySearchTerm={setCompanySearchTerm}
            setSearchPeriod={setSearchPeriod}
            setIsCompanyDropdownOpen={setIsCompanyDropdownOpen}
            setSearchResult={setSearchResult}
            setExcelFilename={setExcelFilename}
            setExcelBase64={setExcelBase64}
            setLoading={setLoading}
          />
  
          {/* 미디어 검색 결과 */}
          {searchResult && (
            <SearchResult
              searchResult={searchResult}
              isSearchResultCollapsed={isSearchResultCollapsed}
              isFullResultCollapsed={isFullResultCollapsed}
              excelFilename={excelFilename}
              excelBase64={excelBase64}
              setIsSearchResultCollapsed={setIsSearchResultCollapsed}
              setIsFullResultCollapsed={setIsFullResultCollapsed}
              setCompanyId={setCompanyId}
              setSearchPeriod={setSearchPeriod}
            />
          )}
  
          {/* 지난 중대성 평가 목록 */}
          <FirstAssessment
            companyId={companyId || ''}
            searchResult={searchResult}
            issuepoolData={issuepoolData}
            assessmentResult={assessmentResult}
            isIssuepoolLoading={isIssuepoolLoading}
            isAssessmentStarting={isAssessmentStarting}
            isBaseIssuePoolModalOpen={isBaseIssuePoolModalOpen}
            isAddCategoryModalOpen={isAddCategoryModalOpen}
            selectedCategory={selectedCategory}
            editingCategoryIndex={editingCategoryIndex}
            baseIssuePoolOptions={baseIssuePoolOptions}
            selectedBaseIssuePool={selectedBaseIssuePool}
            allCategories={allCategories}
            selectedNewCategory={selectedNewCategory}
            newCategoryRank={newCategoryRank}
            newBaseIssuePool={newBaseIssuePool}
            isCustomBaseIssuePool={isCustomBaseIssuePool}
            customBaseIssuePoolText={customBaseIssuePoolText}
            setAssessmentResult={setAssessmentResult}
            setIsIssuepoolLoading={setIsIssuepoolLoading}
            setIssuepoolData={setIssuepoolData}
            setIsBaseIssuePoolModalOpen={setIsBaseIssuePoolModalOpen}
            setIsAddCategoryModalOpen={setIsAddCategoryModalOpen}
            setSelectedCategory={setSelectedCategory}
            setEditingCategoryIndex={setEditingCategoryIndex}
            setBaseIssuePoolOptions={setBaseIssuePoolOptions}
            setSelectedBaseIssuePool={setSelectedBaseIssuePool}
            setAllCategories={setAllCategories}
            setSelectedNewCategory={setSelectedNewCategory}
            setNewCategoryRank={setNewCategoryRank}
            setNewBaseIssuePool={setNewBaseIssuePool}
            setIsCustomBaseIssuePool={setIsCustomBaseIssuePool}
            setCustomBaseIssuePoolText={setCustomBaseIssuePoolText}
            setIsDetailModalOpen={setIsDetailModalOpen}
          />
  
          {/* 설문 대상 업로드 */}
          <SurveyUpload
            excelData={excelData}
            isExcelValid={isExcelValid}
            excelFilename={excelFilename}
            excelBase64={excelBase64}
            isDataHidden={isDataHidden}
            setIsExcelValid={(valid: boolean | null) => setIsExcelValid(valid || false)}
            setExcelFilename={setExcelFilename}
            setExcelBase64={setExcelBase64}
            setExcelData={setExcelData}
            setIsDataHidden={setIsDataHidden}
            updateRow={updateRow}
            deleteRow={deleteRow}
          />
  
          {/* 설문 관리 섹션 */}
          <SurveyManagement excelData={excelData} />
  
          {/* 설문 결과 확인 */}
          <SurveyResult excelData={excelData} />
  
          {/* 최종 이슈풀 확인하기 */}
          <FinalIssuepool />
  
          {/* 중대성 평가 상세 정보 모달 */}
          {isDetailModalOpen && assessmentResult && (
            <div className="fixed inset-0 flex items-center justify-center z-50">
              <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setIsDetailModalOpen(false)} />
              <div className="relative bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[95vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-semibold text-gray-800">🔍 중대성 평가 상세 정보</h2>
                    <button
                      onClick={() => setIsDetailModalOpen(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* 데이터 구조 통일: assessmentResult.data가 우선, 없으면 assessmentResult 직접 사용 */}
                  {(() => {
                    const resultData = assessmentResult?.data || assessmentResult;
                    const categories = resultData?.matched_categories || [];
                    
                    if (categories.length > 0) {
                      return (
                        <div className="space-y-6">
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h3 className="text-lg font-semibold text-blue-800 mb-2">📊 평가 요약</h3>
                            <p className="text-blue-700">총 {categories.length}개 카테고리가 평가되었습니다.</p>
                          </div>

                          {/* 카테고리별 상세 정보 */}
                          <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-800">📋 카테고리별 상세 정보</h3>
                            {categories.map((cat: any, index: number) => (
                              <div key={index} className="border border-gray-200 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="text-lg font-medium text-gray-800">
                                    {index + 1}. {cat.category || '카테고리명 없음'}
                                  </h4>
                                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                                    cat.esg_classification === '환경' ? 'bg-green-100 text-green-700' :
                                    cat.esg_classification === '사회' ? 'bg-orange-100 text-orange-700' :
                                    cat.esg_classification === '지배구조' ? 'bg-blue-100 text-blue-700' :
                                    cat.esg_classification === '경제' ? 'bg-purple-100 text-purple-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {cat.esg_classification || '미분류'}
                                  </span>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <h5 className="font-medium text-gray-700 mb-2">📈 점수 정보</h5>
                                    <div className="space-y-2 text-sm">
                                      <div className="flex justify-between">
                                        <span>빈도 점수:</span>
                                        <span className="font-medium">{cat.frequency_score || 0.0}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>관련성 점수:</span>
                                        <span className="font-medium">{cat.relevance_score || 0.0}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>최근성 점수:</span>
                                        <span className="font-medium">{cat.recent_score || 0.0}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>순위 점수:</span>
                                        <span className="font-medium">{cat.rank_score || 0.0}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>참조 점수:</span>
                                        <span className="font-medium">{cat.reference_score || 0.0}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>부정성 점수:</span>
                                        <span className="font-medium">{cat.negative_score || 0.0}</span>
                                      </div>
                                      <div className="border-t pt-2">
                                        <div className="flex justify-between font-semibold">
                                          <span>최종 점수:</span>
                                          <span className="text-blue-600">{cat.final_score || 0.0}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <h5 className="font-medium text-gray-700 mb-2">📋 선택된 항목</h5>
                                    {cat.selected_base_issue_pool ? (
                                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                        <span className="text-green-700 font-medium">
                                          {cat.selected_base_issue_pool}
                                        </span>
                                      </div>
                                    ) : (
                                      <div className="text-gray-500 text-sm">
                                        선택된 base issue pool이 없습니다.
                                      </div>
                                    )}
                                    
                                    <div className="mt-3">
                                      <h6 className="font-medium text-gray-700 mb-2">📊 통계</h6>
                                      <div className="space-y-1 text-sm">
                                        <div className="flex justify-between">
                                          <span>총 이슈풀:</span>
                                          <span>{cat.total_issuepools || 0}개</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>순위:</span>
                                          <span>{cat.rank || index + 1}위</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <div className="text-center py-8">
                          <div className="text-gray-500 text-lg">
                            평가된 카테고리가 없습니다.
                          </div>
                        </div>
                      );
                    }
                  })()}
                </div>
              </div>
            </div>
          )}
  
          {/* Base Issue Pool 선택 모달 */}
          {isBaseIssuePoolModalOpen && selectedCategory && (
            <div className="fixed inset-0 flex items-center justify-center z-50">
              <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setIsBaseIssuePoolModalOpen(false)} />
              <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-semibold text-gray-800">📋 Base Issue Pool 선택</h2>
                    <button
                      onClick={() => setIsBaseIssuePoolModalOpen(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* 선택된 카테고리 정보 */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <h3 className="font-medium text-blue-800 mb-2">선택된 카테고리</h3>
                    <p className="text-blue-700 text-lg font-semibold">{selectedCategory.category}</p>
                    {selectedCategory.esg_classification && (
                      <div className="mt-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          selectedCategory.esg_classification === '환경' ? 'bg-green-100 text-green-700' :
                          selectedCategory.esg_classification === '사회' ? 'bg-orange-100 text-orange-700' :
                          selectedCategory.esg_classification === '지배구조' ? 'bg-blue-100 text-blue-700' :
                          selectedCategory.esg_classification === '경제' ? 'bg-purple-100 text-purple-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          ESG 분류: {selectedCategory.esg_classification}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Base Issue Pool 선택 */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-700">Base Issue Pool 선택</h3>
                    
                    {baseIssuePoolOptions.length > 0 ? (
                      <div className="space-y-2">
                        {baseIssuePoolOptions.map((option: string, index: number) => (
                          <button
                            key={index}
                            onClick={() => {
                              setSelectedBaseIssuePool(option);
                              // 선택된 base issue pool을 카테고리에 저장
                              const resultData = assessmentResult?.data || assessmentResult;
                              const updatedCategories = [...(resultData?.matched_categories || [])];
                              if (updatedCategories[editingCategoryIndex]) {
                                updatedCategories[editingCategoryIndex].selected_base_issue_pool = option;
                                
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
                              }
                              
                              // 모달 닫기
                              setIsBaseIssuePoolModalOpen(false);
                              alert(`✅ "${option}"이(가) 선택되었습니다.`);
                            }}
                            className={`w-full text-left p-4 rounded-lg border transition-all duration-200 ${
                              selectedBaseIssuePool === option
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{option}</span>
                              {selectedBaseIssuePool === option && (
                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-gray-500 py-8">
                        선택할 수 있는 base issue pool이 없습니다.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
  
          {/* 새로운 카테고리 추가 모달 */}
          {isAddCategoryModalOpen && (
            <div className="fixed inset-0 flex items-center justify-center z-50">
              <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setIsAddCategoryModalOpen(false)} />
              <div className="relative bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[95vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-semibold text-gray-800">➕ 새로운 카테고리 추가</h2>
                    <button
                      onClick={() => setIsAddCategoryModalOpen(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 왼쪽: 카테고리 선택 */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-700">1️⃣ 카테고리 선택</h3>
                      <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-4">
                        <div className="grid grid-cols-1 gap-2">
                          {allCategories.map((category: any, index: number) => (
                            <button
                              key={index}
                              onClick={() => {
                                setSelectedNewCategory(category.name || category);
                                setNewBaseIssuePool('');
                                // 카테고리 선택 시 해당 카테고리의 base issue pool 옵션 설정
                                if (category.base_issue_pools) {
                                  setBaseIssuePoolOptions(category.base_issue_pools);
                                } else {
                                  // 기존 구조와의 호환성을 위한 기본 옵션
                                  setBaseIssuePoolOptions([
                                    `${category.name || category} 관련 이슈 1`,
                                    `${category.name || category} 관련 이슈 2`,
                                    `${category.name || category} 관련 이슈 3`
                                  ]);
                                }
                              }}
                              className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                                selectedNewCategory === (category.name || category)
                                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{category.name || category}</span>
                                {category.esg_classification && (
                                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                    category.esg_classification === '환경' ? 'bg-green-100 text-green-700' :
                                    category.esg_classification === '사회' ? 'bg-orange-100 text-orange-700' :
                                    category.esg_classification === '지배구조' ? 'bg-blue-100 text-blue-700' :
                                    category.esg_classification === '경제' ? 'bg-purple-100 text-purple-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {category.esg_classification}
                                  </span>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 오른쪽: Base Issue Pool 선택 및 순위 설정 */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-700">2️⃣ Base Issue Pool 선택</h3>
                      
                      {selectedNewCategory && (
                        <div className="space-y-4">
                          {/* 선택된 카테고리 정보 */}
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h4 className="font-medium text-blue-800 mb-2">선택된 카테고리</h4>
                            <p className="text-blue-700">{selectedNewCategory}</p>
                            {(() => {
                              const selectedCat = allCategories.find(cat => cat.name === selectedNewCategory);
                              return selectedCat?.esg_classification ? (
                                <div className="mt-2">
                                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                    selectedCat.esg_classification === '환경' ? 'bg-green-100 text-green-700' :
                                    selectedCat.esg_classification === '사회' ? 'bg-orange-100 text-orange-700' :
                                    selectedCat.esg_classification === '지배구조' ? 'bg-blue-100 text-blue-700' :
                                    selectedCat.esg_classification === '경제' ? 'bg-purple-100 text-purple-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    ESG 분류: {selectedCat.esg_classification}
                                  </span>
                                </div>
                              ) : null;
                            })()}
                          </div>

                          {/* Base Issue Pool 선택 */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Base Issue Pool
                            </label>
                            <select
                              value={newBaseIssuePool}
                              onChange={(e) => setNewBaseIssuePool(e.target.value)}
                              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="">Base Issue Pool을 선택하세요</option>
                              {baseIssuePoolOptions.map((option: string, index: number) => (
                                <option key={index} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* 순위 설정 */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              순위
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={newCategoryRank}
                              onChange={(e) => setNewCategoryRank(parseInt(e.target.value) || 1)}
                              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>

                          {/* 추가 버튼 */}
                          <button
                            onClick={() => {
                              addNewCategory(
                                selectedNewCategory,
                                newBaseIssuePool,
                                newCategoryRank,
                                assessmentResult,
                                setAssessmentResult,
                                setIsAddCategoryModalOpen,
                                setSelectedNewCategory,
                                setNewCategoryRank,
                                setNewBaseIssuePool,
                                setIsCustomBaseIssuePool,
                                setCustomBaseIssuePoolText,
                                allCategories
                              );
                            }}
                            disabled={!selectedNewCategory || !newBaseIssuePool}
                            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors duration-200 ${
                              selectedNewCategory && newBaseIssuePool
                                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                          >
                            ✅ 카테고리 추가하기
                          </button>
                        </div>
                      )}

                      {!selectedNewCategory && (
                        <div className="text-center text-gray-500 py-8">
                          왼쪽에서 카테고리를 선택해주세요
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
  
        </div> {/* /CONTAINER */}
      </div>   {/* /BG */}
    </div>      
  );
}