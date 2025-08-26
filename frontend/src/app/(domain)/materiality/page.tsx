'use client';

import React, { useState } from 'react';
import NavigationTabs from '@/component/NavigationTabs';
import { MediaCard, MediaItem } from '@/component/MediaCard';
import axios from 'axios';

export default function MaterialityHomePage() {
  const [selectedCompany, setSelectedCompany] = useState('');
  const [companies, setCompanies] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [reportPeriod, setReportPeriod] = useState({
    startDate: '',
    endDate: ''
  });
  const [searchResult, setSearchResult] = useState<any>(null); // 검색 결과 저장
  const [excelFilename, setExcelFilename] = useState<string | null>(null); // 엑셀 파일명
  const [excelBase64, setExcelBase64] = useState<string | null>(null); // 엑셀 Base64 데이터
  const [companySearchTerm, setCompanySearchTerm] = useState(''); // 기업 검색어
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false); // 기업 드롭다운 열림 상태
  const [isSearchResultCollapsed, setIsSearchResultCollapsed] = useState(false); // 미디어 검색 결과 접기/펼치기 상태
  const [isFullResultCollapsed, setIsFullResultCollapsed] = useState(true); // 전체 검색 결과 접기/펼치기 상태 (기본값: 접힘)
  const [isMediaSearching, setIsMediaSearching] = useState(false); // 미디어 검색 중 상태

  // 로그인한 사용자의 기업 정보 가져오기 및 기업 목록 API 호출
  React.useEffect(() => {
    const getUserCompany = () => {
      try {
        const userData = localStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
                     if (user.company_id) {
             // 사용자의 기업명을 기본값으로 설정
             setSelectedCompany(user.company_id);
             setCompanySearchTerm(user.company_id);
             console.log('✅ 로그인된 사용자의 기업명 설정:', user.company_id);
           }
        }
      } catch (error) {
        console.error('사용자 정보를 가져오는데 실패했습니다:', error);
      }
    };

    const fetchCompanies = async () => {
      try {
        setLoading(true);
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
        setLoading(false);
      }
    };

    getUserCompany();
    fetchCompanies();
  }, []);

  // 드롭다운 외부 클릭 시 닫기
  React.useEffect(() => {
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

  const handleNewAssessment = () => {
    console.log('새로운 중대성 평가 시작');
    // 여기에 새로운 평가 시작 로직 추가
  };

  const handleViewReport = () => {
    console.log('보고서 보기');
    // 여기에 보고서 보기 로직 추가
  };

  // 미디어 검색 데이터를 gateway로 전송하는 함수
  const handleMediaSearch = async () => {
    try {
      // 입력값 검증
      if (!selectedCompany) {
        alert('기업을 선택해주세요.\n\n현재 로그인된 기업이 자동으로 선택되어야 합니다.');
        return;
      }
      
      if (!reportPeriod.startDate || !reportPeriod.endDate) {
        alert('보고기간을 설정해주세요.');
        return;
      }

      // 시작일이 종료일보다 늦은 경우 검증
      if (new Date(reportPeriod.startDate) > new Date(reportPeriod.endDate)) {
        alert('시작일은 종료일보다 빨라야 합니다.');
        return;
      }

      // 로딩 상태 시작
      setIsMediaSearching(true);

      // JSON 데이터 구성
      const searchData = {
        company_id: selectedCompany,
        report_period: {
          start_date: reportPeriod.startDate,
          end_date: reportPeriod.endDate
        },
        search_type: 'materiality_assessment',
        timestamp: new Date().toISOString()
      };

      console.log('🚀 미디어 검색 데이터를 Gateway로 전송:', searchData);

      // Gateway를 통해 materiality-service 호출
      const gatewayUrl = 'https://gateway-production-4c8b.up.railway.app';
      const response = await axios.post(
        `${gatewayUrl}/api/v1/materiality-service/search-media`, 
        searchData,
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      console.log('✅ Gateway 응답:', response.data);

      if (response.data.success) {
                // 검색 결과 저장
        setSearchResult(response.data);
        
        // 엑셀 파일 정보 추출
        if (response.data.excel_filename && response.data.excel_base64) {
            setExcelFilename(response.data.excel_filename);
            setExcelBase64(response.data.excel_base64);
        }
        
        alert(`✅ 미디어 검색 요청이 성공적으로 전송되었습니다!\n\n기업: ${selectedCompany}\n기간: ${reportPeriod.startDate} ~ ${reportPeriod.endDate}\n\n총 ${response.data.data?.total_results || 0}개의 뉴스 기사를 찾았습니다.`);
        
        // 성공 후 추가 처리 로직 (예: 검색 결과 표시, 로딩 상태 관리 등)
        // 여기에 실제 검색 결과를 받아와서 mediaItems를 업데이트하는 로직 추가 가능
        
      } else {
        alert(`❌ 미디어 검색 요청 실패: ${response.data.message || '알 수 없는 오류'}`);
      }

    } catch (error: unknown) {
      console.error('❌ 미디어 검색 요청 실패:', error);
      
      // 에러 응답 처리 - 타입 가드 사용
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string; detail?: string } } };
        if (axiosError.response?.data) {
          const errorData = axiosError.response.data;
          alert(`❌ 미디어 검색 요청 실패: ${errorData.message || errorData.detail || '알 수 없는 오류'}`);
        } else {
          alert('❌ 미디어 검색 요청에 실패했습니다. Gateway 서버 연결을 확인해주세요.');
        }
      } else {
        alert('❌ 미디어 검색 요청에 실패했습니다. Gateway 서버 연결을 확인해주세요.');
      }
    } finally {
      // 로딩 상태 종료
      setIsMediaSearching(false);
    }
  };

  // 검색어에 따라 기업 목록 필터링
  const filteredCompanies = companies.filter(company =>
    company.toLowerCase().includes(companySearchTerm.toLowerCase())
  );

  // 기업 선택 처리
  const handleCompanySelect = (company: string) => {
    setSelectedCompany(company);
    setCompanySearchTerm(company);
    setIsCompanyDropdownOpen(false);
  };

  // 검색어 초기화 (검색 필드 클리어)
  const handleClearSearch = () => {
    setCompanySearchTerm('');
    setIsCompanyDropdownOpen(false);
  };

  // 기업 검색어 변경 처리
  const handleCompanySearchChange = (value: string) => {
    setCompanySearchTerm(value);
    setIsCompanyDropdownOpen(true);
  };

  const downloadExcelFromBase64 = (base64Data: string, filename: string) => {
    try {
      // Base64를 Blob으로 변환
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      
      // Blob 생성 및 다운로드
      const blob = new Blob([byteArray], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      console.log('✅ 엑셀 파일 다운로드 완료:', filename);
    } catch (error) {
      console.error('❌ 엑셀 파일 다운로드 실패:', error);
      alert('엑셀 파일 다운로드에 실패했습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* 미디어 검색 중 로딩 팝업 */}
      {isMediaSearching && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          {/* 배경은 완전 투명하게 */}
          <div className="absolute inset-0 bg-transparent"></div>
          {/* 로딩 팝업만 표시 */}
          <div className="relative bg-white rounded-xl shadow-2xl p-8 text-center border border-gray-200">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">미디어 검색 중...</h3>
            <p className="text-gray-600">네이버 뉴스 API를 통해 기사를 수집하고 있습니다.</p>
            <p className="text-gray-500 text-sm mt-2">잠시만 기다려주세요.</p>
          </div>
        </div>
      )}
      
      {/* 상단 내비게이션 바 */}
      <NavigationTabs />
      
      {/* 메인 콘텐츠 */}
      <div className="bg-gradient-to-br from-gray-50 to-blue-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* 헤더 */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              중대성 평가 홈
            </h1>
            <p className="text-lg text-gray-600">
              기업의 지속가능성 중대성 평가를 관리하고 모니터링하세요
            </p>
          </div>

          {/* 선택 옵션 */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="relative company-dropdown-container">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  기업 선택
                </label>
                                 <div className="relative">
                   <input
                     type="text"
                     value={companySearchTerm}
                     onChange={(e) => handleCompanySearchChange(e.target.value)}
                     onFocus={() => setIsCompanyDropdownOpen(true)}
                     placeholder={loading ? "🔄 기업 목록을 불러오는 중..." : "기업명을 입력하거나 선택하세요"}
                     className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                       selectedCompany ? 'text-gray-900 font-medium' : 'text-gray-500'
                     }`}
                     disabled={loading || isMediaSearching}
                   />
                   <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                     {companySearchTerm && (
                       <button
                         type="button"
                         onClick={handleClearSearch}
                         className="text-gray-400 hover:text-gray-600 p-1"
                         title="검색어 지우기"
                       >
                         ✕
                       </button>
                     )}
                     <button
                       type="button"
                       onClick={() => setIsCompanyDropdownOpen(!isCompanyDropdownOpen)}
                       disabled={isMediaSearching}
                       className={`text-gray-400 hover:text-gray-600 ${
                         isMediaSearching ? 'cursor-not-allowed opacity-50' : ''
                       }`}
                     >
                       {isCompanyDropdownOpen ? '▲' : '▼'}
                     </button>
                   </div>
                 </div>
                
                {/* 드롭다운 목록 */}
                {isCompanyDropdownOpen && !loading && companies.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredCompanies.length === 0 ? (
                      <div className="px-4 py-2 text-gray-500 text-sm">
                        검색 결과가 없습니다
                      </div>
                    ) : (
                      filteredCompanies.map((company) => (
                        <button
                          key={company}
                          type="button"
                          onClick={() => handleCompanySelect(company)}
                          className={`w-full text-left px-4 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none ${
                            company === selectedCompany ? 'bg-blue-100 text-blue-800 font-medium' : 'text-gray-700'
                          }`}
                        >
                          {company}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  보고기간
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">시작일</label>
                                         <input
                       type="date"
                       value={reportPeriod.startDate}
                       onChange={(e) => setReportPeriod(prev => ({ ...prev, startDate: e.target.value }))}
                       disabled={isMediaSearching}
                       className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
                         reportPeriod.startDate ? 'text-gray-900 font-medium' : 'text-gray-500'
                       } ${isMediaSearching ? 'cursor-not-allowed opacity-50' : ''}`}
                     />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">종료일</label>
                                         <input
                       type="date"
                       value={reportPeriod.endDate}
                       onChange={(e) => setReportPeriod(prev => ({ ...prev, endDate: e.target.value }))}
                       disabled={isMediaSearching}
                       className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
                         reportPeriod.endDate ? 'text-gray-900 font-medium' : 'text-gray-500'
                       } ${isMediaSearching ? 'cursor-not-allowed opacity-50' : ''}`}
                     />
                  </div>
                </div>
              </div>
            </div>
            
            {/* 미디어 검색 시작 버튼 */}
            <div className="mt-6">
              <button
                onClick={handleMediaSearch}
                disabled={isMediaSearching}
                className={`w-full py-3 px-6 rounded-lg transition-colors duration-200 font-medium text-lg flex items-center justify-center space-x-2 ${
                  isMediaSearching 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                }`}
              >
                {isMediaSearching ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>미디어 검색 중...</span>
                  </>
                ) : (
                  <>
                    <span>🔍</span>
                    <span>미디어 검색 시작</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 미디어 검색 결과 */}
          {searchResult && (
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-gray-800">
                  🔍 미디어 검색 결과
                </h2>
                <button
                  onClick={() => setIsSearchResultCollapsed(!isSearchResultCollapsed)}
                  className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                >
                  <span>{isSearchResultCollapsed ? '펼치기' : '접기'}</span>
                  <span className="text-lg">{isSearchResultCollapsed ? '▼' : '▲'}</span>
                </button>
              </div>
              
              {/* 접힌 상태일 때 간단한 요약만 표시 */}
              {isSearchResultCollapsed ? (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="text-gray-700">
                      <strong>기업:</strong> {searchResult.data?.company_id} | 
                      <strong>기간:</strong> {searchResult.data?.search_period?.start_date} ~ {searchResult.data?.search_period?.end_date} | 
                      <strong>결과:</strong> {searchResult.data?.total_results || 0}개 기사
                    </div>
                    {excelFilename && excelBase64 && (
                      <button
                        onClick={() => downloadExcelFromBase64(excelBase64, excelFilename)}
                        className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors duration-200"
                      >
                        📥 엑셀 다운로드
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-blue-800 mb-2">검색 정보</h3>
                      <p className="text-blue-700">
                        <strong>기업:</strong> {searchResult.data?.company_id}<br/>
                        <strong>검색 기간:</strong> {searchResult.data?.search_period?.start_date} ~ {searchResult.data?.search_period?.end_date}<br/>
                        <strong>총 결과:</strong> {searchResult.data?.total_results || 0}개 기사
                      </p>
                    </div>
                    
                    {excelFilename && excelBase64 && (
                      <div className="bg-green-50 p-4 rounded-lg">
                        <h3 className="font-semibold text-green-800 mb-2">📊 엑셀 파일</h3>
                        <p className="text-green-700 mb-3">
                          검색 결과가 엑셀 파일로 생성되었습니다.
                        </p>
                        <button
                          onClick={() => downloadExcelFromBase64(excelBase64, excelFilename)}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors duration-200"
                        >
                          📥 엑셀 다운로드
                        </button>
                      </div>
                    )}
                  </div>
                  
                                     {/* 검색된 기사 미리보기 */}
                   {searchResult.data?.articles && searchResult.data.articles.length > 0 && (
                     <div>
                       <h3 className="font-semibold text-gray-800 mb-4">📰 검색된 기사 미리보기 (최대 8개)</h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                         {searchResult.data.articles.slice(0, 8).map((article: any, index: number) => (
                          <div 
                            key={index} 
                            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow duration-200 cursor-pointer"
                            onClick={() => {
                              if (article.originallink) {
                                window.open(article.originallink, '_blank', 'noopener,noreferrer');
                              }
                            }}
                          >
                            <div className="text-xs text-gray-500 mb-2">
                              {article.pubDate ? new Date(article.pubDate).toLocaleDateString('ko-KR', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit'
                              }).replace(/\. /g, '. ').replace(/\.$/, '.') : '날짜 없음'}
                            </div>
                            <h4 className="font-medium text-gray-800 mb-2 text-sm leading-tight" style={{ 
                              display: '-webkit-box', 
                              WebkitLineClamp: 3, 
                              WebkitBoxOrient: 'vertical', 
                              overflow: 'hidden' 
                            }}>
                              {article.title}
                            </h4>
                            <div className="text-xs text-gray-600 mb-3">
                              <span className="font-medium">🏷️검색 키워드:</span> {article.issue || '일반'}
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span className="flex items-center">
                                <span className="mr-1">🏢</span>
                                {article.company || '기업명 없음'}
                              </span>
                              {article.original_category && (
                                <span className="flex items-center">
                                  <span className="mr-1">📂</span>
                                  {article.original_category}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                                       {/* 전체 검색 결과 표시 */}
                    {searchResult.data?.articles && searchResult.data.articles.length > 8 && (
                      <div className="mt-8">
                                                 <div className="flex items-center justify-between mb-4">
                           <h3 className="font-semibold text-gray-800">📰 전체 검색 결과 ({searchResult.data.articles.length}개)</h3>
                           <button
                             onClick={() => setIsFullResultCollapsed(!isFullResultCollapsed)}
                             className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                           >
                             <span>{isFullResultCollapsed ? '펼치기' : '접기'}</span>
                             <span className="text-lg">{isFullResultCollapsed ? '▼' : '▲'}</span>
                           </button>
                         </div>
                         {!isFullResultCollapsed && (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
                           {searchResult.data.articles.map((article: any, index: number) => (
                          <div 
                            key={index} 
                            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow duration-200 cursor-pointer"
                            onClick={() => {
                              if (article.originallink) {
                                window.open(article.originallink, '_blank', 'noopener,noreferrer');
                              }
                            }}
                          >
                            <div className="text-xs text-gray-500 mb-2">
                              {article.pubDate ? new Date(article.pubDate).toLocaleDateString('ko-KR', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit'
                              }).replace(/\. /g, '. ').replace(/\.$/, '.') : '날짜 없음'}
                            </div>
                            <h4 className="font-medium text-gray-800 mb-2 text-sm leading-tight" style={{ 
                              display: '-webkit-box', 
                              WebkitLineClamp: 3, 
                              WebkitBoxOrient: 'vertical', 
                              overflow: 'hidden' 
                            }}>
                              {article.title}
                            </h4>
                            <div className="text-xs text-gray-600 mb-3">
                              <span className="font-medium">검색 키워드:</span> {article.issue || '일반'}
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span className="flex items-center">
                                <span className="mr-1">🏢</span>
                                {article.company || '기업명 없음'}
                              </span>
                              {article.original_category && (
                                <span className="flex items-center">
                                  <span className="mr-1">📂</span>
                                  {article.original_category}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                          </div>
                        )}
                      </div>
                    )}
                </>
              )}
            </div>
          )}

          {/* 액션 버튼 */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <button
              onClick={handleNewAssessment}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium text-lg"
            >
              🚀 새로운 중대성 평가 시작
            </button>
            <button
              onClick={handleViewReport}
              className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors duration-200 font-medium text-lg"
            >
              📊 보고서 보기
            </button>
          </div>

          {/* 3개 빈 박스 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-dashed border-gray-200 hover:border-gray-300 transition-colors duration-200">
              <div className="text-center">
                <div className="text-4xl text-gray-300 mb-3">📋</div>
                <h3 className="text-lg font-medium text-gray-600 mb-2">새로운 섹션</h3>
                <p className="text-sm text-gray-500">여기에 내용을 추가하세요</p>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-dashed border-gray-200 hover:border-gray-300 transition-colors duration-200">
              <div className="text-center">
                <div className="text-4xl text-gray-300 mb-3">📊</div>
                <h3 className="text-lg font-medium text-gray-600 mb-2">새로운 섹션</h3>
                <p className="text-sm text-gray-500">여기에 내용을 추가하세요</p>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-dashed border-gray-200 hover:border-gray-300 transition-colors duration-200">
              <div className="text-center">
                <div className="text-4xl text-gray-300 mb-3">🔍</div>
                <h3 className="text-lg font-medium text-gray-600 mb-2">새로운 섹션</h3>
                <p className="text-sm text-gray-500">여기에 내용을 추가하세요</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
