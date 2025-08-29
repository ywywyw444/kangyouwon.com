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
    saveToLocalStorage,
    loadUploadedExcelData
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
  const [newCategoryRank, setNewCategoryRank] = useState<string>('');
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

  // 페이지 로드 시 업로드된 엑셀 데이터만 자동 불러오기
  useEffect(() => {
    loadUploadedExcelData();
  }, []); // loadUploadedExcelData는 Zustand store에서 가져오므로 의존성 배열에서 제외

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
            excelData={excelData}
          />

          {/* 설문 관리 섹션 */}
          <SurveyManagement excelData={excelData} />

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
            loadUploadedExcelData={loadUploadedExcelData}
          />

          {/* 설문 결과 확인 */}
          <SurveyResult excelData={excelData} />
  
          {/* 최종 이슈풀 확인하기 */}
          <FinalIssuepool />
  
          {/* 중대성 평가 상세 정보 모달 */}
          {isDetailModalOpen && assessmentResult && (
            <div className="fixed inset-0 flex items-center justify-center z-50">
              {/* 배경 오버레이 */}
              <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setIsDetailModalOpen(false)}></div>
              
              {/* 모달 내용 */}
              <div className="relative bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[95vh] overflow-hidden">
                {/* 모달 헤더 */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white sticky top-0 z-10">
                  <h3 className="text-2xl font-bold text-gray-900">중대성 평가 상세 정보</h3>
                  <button
                    onClick={() => setIsDetailModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  >
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {/* 모달 바디 */}
                <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(95vh - 140px)' }}>
                  {/* 평가 요약 */}
                  <div className="mb-8">
                    <h4 className="text-xl font-semibold text-gray-800 mb-4">📊 평가 요약</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{assessmentResult.total_articles || assessmentResult.data?.total_articles || 0}</div>
                        <div className="text-sm text-blue-700">총 기사</div>
                      </div>
                      <div className="bg-red-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">{assessmentResult.negative_articles || assessmentResult.data?.negative_articles || 0}</div>
                        <div className="text-sm text-red-700">부정 기사</div>
                      </div>
                      <div className="bg-orange-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">
                          {(assessmentResult.negative_ratio || assessmentResult.data?.negative_ratio || 0).toFixed(1)}%
                        </div>
                        <div className="text-sm text-orange-700">부정 비율</div>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{assessmentResult.total_categories || assessmentResult.data?.total_categories || 0}</div>
                        <div className="text-sm text-green-700">분석된 카테고리</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* 전체 카테고리 상세 정보 */}
                  <div className="mb-8">
                    <h4 className="text-xl font-semibold text-gray-800 mb-4">🏆 전체 카테고리 상세 정보</h4>
                    <div className="space-y-4">
                      {(() => {
                        const categories = assessmentResult?.matched_categories || assessmentResult?.data?.matched_categories || [];
                        if (categories.length > 0) {
                          return categories.map((cat: any, index: number) => (
                            <div key={index} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                              <div className="flex items-center justify-between mb-3">
                                <h5 className="text-lg font-semibold text-gray-800">
                                  {cat.rank || (index + 1)}위: {cat.category || '카테고리명 없음'}
                                </h5>
                                <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                                  cat.esg_classification === '환경' ? 'bg-green-100 text-green-700' :
                                  cat.esg_classification === '사회' ? 'bg-orange-100 text-orange-700' :
                                  cat.esg_classification === '지배구조' ? 'bg-blue-100 text-blue-700' :
                                  cat.esg_classification === '경제' ? 'bg-purple-100 text-purple-700' :
                                  'bg-gray-100 text-gray-600'
                                }`}>
                                  {cat.esg_classification || '미분류'}
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                <div>
                                  <span className="text-gray-700 font-medium">이슈풀:</span>
                                  <span className="ml-2 font-semibold text-gray-900">{cat.total_issuepools || 0}개</span>
                                </div>
                                <div>
                                  <span className="text-gray-700 font-medium">최종점수:</span>
                                  <span className="ml-2 font-bold text-blue-700">{cat.final_score?.toFixed(3) || 0}</span>
                                </div>
                                <div>
                                  <span className="text-gray-700 font-medium">빈도점수:</span>
                                  <span className="ml-2 font-semibold text-gray-900">{cat.frequency_score?.toFixed(3) || 0}</span>
                                </div>
                                <div>
                                  <span className="text-gray-700 font-medium">관련성점수:</span>
                                  <span className="ml-2 font-semibold text-gray-900">{cat.relevance_score?.toFixed(3) || 0}</span>
                                </div>
                                <div>
                                  <span className="text-gray-700 font-medium">최신성점수:</span>
                                  <span className="ml-2 font-semibold text-gray-900">{cat.recent_score?.toFixed(3) || 0}</span>
                                </div>
                                <div>
                                  <span className="text-gray-700 font-medium">순위점수:</span>
                                  <span className="ml-2 font-semibold text-gray-900">{cat.rank_score?.toFixed(3) || 0}</span>
                                </div>
                                <div>
                                  <span className="text-gray-700 font-medium">참조점수:</span>
                                  <span className="ml-2 font-semibold text-gray-900">{cat.reference_score?.toFixed(3) || 0}</span>
                                </div>
                                <div>
                                  <span className="text-gray-700 font-medium">부정성점수:</span>
                                  <span className="ml-2 font-semibold text-gray-900">{cat.negative_score?.toFixed(3) || 0}</span>
                                </div>
                              </div>
                              
                              {/* 선택된 base issue pool 표시 */}
                              {cat.selected_base_issue_pool && (
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                  <div className="flex items-center">
                                    <span className="text-gray-700 font-medium mr-2">선택된 이슈:</span>
                                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-sm font-medium">
                                      {cat.selected_base_issue_pool}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          ));
                        }
                        return <div className="text-gray-500 text-center">카테고리 정보가 없습니다.</div>;
                      })()}
                    </div>
                  </div>
                  
                  {/* 점수 계산 공식 */}
                  <div className="mb-6">
                    <h4 className="text-xl font-semibold text-gray-800 mb-4">📈 점수 계산 공식</h4>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-700 leading-relaxed">
                        <strong>최종점수</strong> = 0.4×빈도점수 + 0.6×관련성점수 + 0.2×최신성점수 + 0.4×순위점수 + 0.6×참조점수 + 0.8×부정성점수×(1+0.5×빈도점수+0.5×관련성점수)
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* 모달 푸터 */}
                <div className="flex justify-end p-6 border-t border-gray-200 bg-white sticky bottom-0 z-10">
                  <div className="flex space-x-3">
                    <button
                      onClick={() => {
                        // 여기에 저장 기능 추가 가능
                        alert('저장 기능을 구현합니다.');
                      }}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
                    >
                      저장
                    </button>
                    <button
                      onClick={() => setIsDetailModalOpen(false)}
                      className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors duration-200"
                    >
                      닫기
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
  
          {/* Base Issue Pool 선택 모달 */}
          {isBaseIssuePoolModalOpen && selectedCategory && (
            <div className="fixed inset-0 flex items-center justify-center z-50">
              {/* 배경 오버레이 */}
              <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setIsBaseIssuePoolModalOpen(false)}></div>
              
              {/* 모달 내용 */}
              <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4">
                {/* 모달 헤더 */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white">
                  <h3 className="text-xl font-bold text-gray-900">
                    Base Issue Pool 선택 - {selectedCategory.category}
                  </h3>
                  <button
                    onClick={() => setIsBaseIssuePoolModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {/* 모달 바디 */}
                <div className="p-6">
                  <div className="mb-4">
                    <p className="text-gray-600 mb-4">
                      <strong>{selectedCategory.category}</strong> 카테고리에 매칭되는 base issue pool을 선택하세요.
                    </p>
                    
                    {baseIssuePoolOptions.length > 0 ? (
                      <div className="space-y-3">
                        {baseIssuePoolOptions.map((option, index) => (
                          <label key={index} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-3 rounded-lg">
                            <input
                              type="radio"
                              name="baseIssuePool"
                              value={option}
                              checked={selectedBaseIssuePool === option}
                              onChange={(e) => setSelectedBaseIssuePool(e.target.value)}
                              className="text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-gray-700">{option}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-gray-500 py-8">
                        <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p>이 카테고리에 매칭되는 base issue pool이 없습니다.</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* 모달 푸터 */}
                <div className="flex justify-end p-6 border-t border-gray-200 bg-white">
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setIsBaseIssuePoolModalOpen(false)}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors duration-200"
                    >
                      취소
                    </button>
                    <button
                      onClick={() => {
                        if (selectedBaseIssuePool && editingCategoryIndex >= 0) {
                          // 선택된 base issue pool로 카테고리 업데이트
                          const resultData = assessmentResult?.data || assessmentResult;
                          const updatedCategories = [...(resultData?.matched_categories || [])];
                          
                          if (updatedCategories[editingCategoryIndex]) {
                            updatedCategories[editingCategoryIndex] = {
                              ...updatedCategories[editingCategoryIndex],
                              selected_base_issue_pool: selectedBaseIssuePool
                            };
                            
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
                            
                            alert(`✅ ${selectedCategory.category} 카테고리가 "${selectedBaseIssuePool}"로 업데이트되었습니다.`);
                          }
                        }
                        setIsBaseIssuePoolModalOpen(false);
                      }}
                      disabled={!selectedBaseIssuePool}
                      className={`px-4 py-2 font-medium rounded-lg transition-colors duration-200 ${
                        selectedBaseIssuePool
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      선택 완료
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
  
          {/* 새로운 카테고리 추가 모달 */}
          {isAddCategoryModalOpen && (
            <div className="fixed inset-0 flex items-center justify-center z-50">
              {/* 배경 오버레이 */}
              <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setIsAddCategoryModalOpen(false)}></div>
              
              {/* 모달 내용 */}
              <div className="relative bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[95vh] overflow-hidden">
                {/* 모달 헤더 */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white sticky top-0 z-10">
                  <h3 className="text-2xl font-bold text-gray-900">➕ 새로운 카테고리 추가</h3>
                  <button
                    onClick={() => setIsAddCategoryModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  >
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {/* 모달 바디 */}
                <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(95vh - 140px)' }}>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 왼쪽: 카테고리 선택 */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900">1️⃣ 카테고리 선택</h3>
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
                                <span className="font-semibold text-gray-900">{category.name || category}</span>
                                {category.esg_classification && (
                                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
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
                      <h3 className="text-lg font-semibold text-gray-900">2️⃣ Base Issue Pool 선택</h3>
                      
                      {selectedNewCategory && (
                        <div className="space-y-4">
                          {/* 선택된 카테고리 정보 */}
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h4 className="font-semibold text-blue-800 mb-2">선택된 카테고리</h4>
                            <p className="text-blue-700 font-semibold">{selectedNewCategory}</p>
                            {(() => {
                              const selectedCat = allCategories.find(cat => cat.name === selectedNewCategory);
                              return selectedCat?.esg_classification ? (
                                <div className="mt-2">
                                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
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
                            <label className="block text-sm font-semibold text-gray-900 mb-2">
                              Base Issue Pool
                            </label>
                            <select
                              value={newBaseIssuePool}
                              onChange={(e) => setNewBaseIssuePool(e.target.value)}
                              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium"
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
                            <label className="block text-sm font-semibold text-gray-900 mb-2">
                              순위
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={newCategoryRank}
                              onChange={(e) => setNewCategoryRank(e.target.value)}
                              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium"
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
                
                {/* 모달 푸터 */}
                <div className="flex justify-end p-6 border-t border-gray-200 bg-white sticky bottom-0 z-10">
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setIsAddCategoryModalOpen(false)}
                      className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors duration-200"
                    >
                      취소
                    </button>
                    <button
                      onClick={() => {
                        addNewCategory(
                          selectedNewCategory,
                          newBaseIssuePool,
                          parseInt(newCategoryRank) || 1,
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
                      className={`px-6 py-3 font-medium rounded-lg transition-colors duration-200 ${
                        selectedNewCategory && newBaseIssuePool
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      ✅ 카테고리 추가하기
                    </button>
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