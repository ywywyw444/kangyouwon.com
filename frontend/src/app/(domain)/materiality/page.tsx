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
import { fetchAllIssuepoolData } from '@/component/materiality/fetch_all_issue_pool_data';
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
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [selectedNewCategory, setSelectedNewCategory] = useState<string>('');
  const [newCategoryRank, setNewCategoryRank] = useState<number>(1);
  const [newBaseIssuePool, setNewBaseIssuePool] = useState<string>('');
  const [isCustomBaseIssuePool, setIsCustomBaseIssuePool] = useState(false);
  const [customBaseIssuePoolText, setCustomBaseIssuePoolText] = useState<string>('');

  // issuepool DB 전체 데이터 상태
  const [issuepoolAllData, setIssuepoolAllData] = useState<any>(null);
  const [isIssuepoolAllLoading, setIsIssuepoolAllLoading] = useState(false);

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
  
          {/* Issuepool DB 전체 데이터 관리 */}
          <div id="issuepool-management" className="bg-white rounded-xl shadow-lg p-6 mb-12">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">🗄️ Issuepool DB 전체 데이터 관리</h2>
  
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* 왼쪽 카드 */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                {/* ... (내용 동일) ... */}
                <button
                  onClick={() => fetchAllIssuepoolData(setIsIssuepoolAllLoading, setIssuepoolAllData)}
                  disabled={isIssuepoolAllLoading}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center ${
                    isIssuepoolAllLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 text-white'
                  }`}
                >
                  {isIssuepoolAllLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                      <span>데이터 로드 중...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Issuepool DB 전체 데이터 로드</span>
                    </>
                  )}
                </button>
              </div>
  
              {/* 오른쪽 카드 */}
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-6 border border-indigo-200">
                {/* ... (내용 동일) ... */}
                {issuepoolAllData ? (
                  <div className="bg-white rounded-lg p-4 border border-indigo-200">{/* ... */}</div>
                ) : (
                  <div className="bg-white rounded-lg p-8 border border-indigo-200 text-center">{/* ... */}</div>
                )}
              </div>
            </div>
          </div>
  
          {/* 중대성 평가 상세 정보 모달 */}
          {isDetailModalOpen && assessmentResult && (
            <div className="fixed inset-0 flex items-center justify-center z-50">
              <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setIsDetailModalOpen(false)} />
              <div className="relative bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[95vh] overflow-hidden">
                {/* ... (모달 내용 동일) ... */}
              </div>
            </div>
          )}
  
          {/* Base Issue Pool 선택 모달 */}
          {isBaseIssuePoolModalOpen && selectedCategory && (
            <div className="fixed inset-0 flex items-center justify-center z-50">
              <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setIsBaseIssuePoolModalOpen(false)} />
              <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4">
                {/* ... (모달 내용 동일) ... */}
              </div>
            </div>
          )}
  
          {/* 새로운 카테고리 추가 모달 */}
          {isAddCategoryModalOpen && (
            <div className="fixed inset-0 flex items-center justify-center z-50">
              <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setIsAddCategoryModalOpen(false)} />
              <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4">
                {/* ... (모달 내용 동일) ... */}
              </div>
            </div>
          )}
  
        </div> {/* /CONTAINER */}
      </div>   {/* /BG */}
    </div>      
  );
}