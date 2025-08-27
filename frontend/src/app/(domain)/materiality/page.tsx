'use client';

import React, { useState } from 'react';
import NavigationTabs from '@/component/NavigationTabs';
import { MediaCard, MediaItem } from '@/component/MediaCard';
import IndexBar from '@/component/IndexBar';
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

  // 지난 중대성 평가 목록 상태
  const [issuepoolData, setIssuepoolData] = useState<any>(null);
  const [isIssuepoolLoading, setIsIssuepoolLoading] = useState(false);

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

  // 지난 중대성 평가 목록 조회
  const handleViewReport = async () => {
    if (!searchResult?.data) {
      alert('먼저 미디어 검색을 완료해주세요.');
      return;
    }

    // 디버깅: searchResult 구조 확인
    console.log('🔍 searchResult 전체 구조:', searchResult);
    console.log('🔍 searchResult.data 구조:', searchResult.data);

    // 데이터 구조 안전하게 확인
    const companyId = searchResult.data.company_id || searchResult.data.company_name;
    const startDate = searchResult.data.report_period?.start_date || searchResult.data.search_period?.start_date;
    const endDate = searchResult.data.report_period?.end_date || searchResult.data.search_period?.end_date;

    console.log('🔍 추출된 데이터:', { companyId, startDate, endDate });

    if (!companyId || !startDate || !endDate) {
      console.error('필수 데이터 누락:', { companyId, startDate, endDate, searchResult });
      alert('검색 결과에서 필요한 데이터를 찾을 수 없습니다. 미디어 검색을 다시 실행해주세요.');
      return;
    }

    try {
      setIsIssuepoolLoading(true);
      
      const requestData = {
        company_id: companyId,
        report_period: {
          start_date: startDate,
          end_date: endDate
        },
        search_context: searchResult.data.search_context || {},
        request_type: 'issuepool_list',  // 필수 필드 추가
        timestamp: new Date().toISOString()  // 필수 필드 추가
      };

      console.log('지난 중대성 평가 목록 요청 데이터:', requestData);

      // Gateway를 통해 materiality-service 호출
      const gatewayUrl = 'https://gateway-production-4c8b.up.railway.app';
      const response = await axios.post(
        `${gatewayUrl}/api/v1/materiality-service/issuepool/list`,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      
      if (response.data.success) {
        setIssuepoolData(response.data.data);
        console.log('지난 중대성 평가 목록 조회 성공:', response.data);
      } else {
        alert('지난 중대성 평가 목록 조회에 실패했습니다: ' + response.data.message);
      }
    } catch (error) {
      console.error('지난 중대성 평가 목록 조회 오류:', error);
      alert('지난 중대성 평가 목록 조회 중 오류가 발생했습니다.');
    } finally {
      setIsIssuepoolLoading(false);
    }
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
      {/* 인덱스 바 */}
      <IndexBar />
      
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
      <div className="bg-gradient-to-br from-gray-50 to-blue-50 p-6 pt-20">
        <div className="max-w-7xl mx-auto">
          {/* 헤더 */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              중대성 평가 자동화 플랫폼
            </h1>
            <p className="text-lg text-gray-600">
              기업의 중대성 이슈를 자동으로 추천합니다
            </p>
          </div>

          {/* 선택 옵션 */}
          <div id="media-search" className="bg-white rounded-xl shadow-lg p-6 mb-12">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">
              🔍 미디어 검색
            </h2>
            
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
            <div className="bg-white rounded-xl shadow-lg p-6 mb-12">
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
                             <div className="flex items-center justify-between mb-2">
                               <div className="text-xs text-gray-500">
                                 {article.pubDate ? new Date(article.pubDate).toLocaleDateString('ko-KR', {
                                   year: 'numeric',
                                   month: '2-digit',
                                   day: '2-digit'
                                 }).replace(/\. /g, '. ').replace(/\.$/, '.') : '날짜 없음'}
                               </div>
                               <div className="text-xs text-gray-600">
                                 <span className="font-medium">🏷️검색 키워드:</span> {article.issue || '일반'}
                               </div>
                             </div>
                             <h4 className="font-medium text-gray-800 mb-2 text-sm leading-tight" style={{ 
                               display: '-webkit-box', 
                               WebkitLineClamp: 3, 
                               WebkitBoxOrient: 'vertical', 
                               overflow: 'hidden' 
                             }}>
                               {article.title}
                             </h4>
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
                             <div className="flex items-center justify-between mb-2">
                               <div className="text-xs text-gray-500">
                                 {article.pubDate ? new Date(article.pubDate).toLocaleDateString('ko-KR', {
                                   year: 'numeric',
                                   month: '2-digit',
                                   day: '2-digit'
                                 }).replace(/\. /g, '. ').replace(/\.$/, '.') : '날짜 없음'}
                               </div>
                               <div className="text-xs text-gray-600">
                                 <span className="font-medium">🏷️검색 키워드:</span> {article.issue || '일반'}
                               </div>
                             </div>
                             <h4 className="font-medium text-gray-800 mb-2 text-sm leading-tight" style={{ 
                               display: '-webkit-box', 
                               WebkitLineClamp: 3, 
                               WebkitBoxOrient: 'vertical', 
                               overflow: 'hidden' 
                             }}>
                               {article.title}
                             </h4>
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

          {/* 지난 중대성 평가 목록 */}
          <div id="first-assessment" className="bg-white rounded-xl shadow-lg p-6 mb-12">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">
              📑 1차 중대성 평가 결과 보기
            </h2>

            {/* 액션 버튼들 */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <button
                onClick={handleViewReport}
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
                onClick={() => {
                  // 새로운 중대성 평가 시작 로직
                  alert('새로운 중대성 평가를 시작합니다.');
                }}
                className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                🚀 새로운 중대성 평가 시작
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
                                <span>{esgName} ({data.count}개)</span>
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
                                <span>{esgName} ({data.count}개)</span>
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
                <h3 className="text-lg font-semibold text-gray-800">1차 중대성 평가 결과</h3>
              </div>
              
              <div className="text-center text-gray-500 text-sm">
                여기에 내용을 추가하세요
              </div>
            </div>
          </div>

          </div>

          {/* 설문 대상 업로드 */}
          <div id="survey-upload" className="bg-white rounded-xl shadow-lg p-6 mb-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Excel 파일 업로드 */}
              <div>
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                  📊 설문 대상 업로드
                </h2>
                <p className="text-gray-600 mb-6">
                  설문 대상 기업 정보가 담긴 Excel 파일을 업로드하세요.
                </p>
                
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors duration-200">
                  <div className="text-4xl text-gray-400 mb-4">📁</div>
                  <p className="text-gray-600 mb-4">
                    Excel 파일을 여기에 드래그하거나 클릭하여 선택하세요
                  </p>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        console.log('선택된 파일:', file.name);
                        // 파일 처리 로직 추가 예정
                      }
                    }}
                    className="hidden"
                    id="excel-upload"
                  />
                  <label
                    htmlFor="excel-upload"
                    className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg cursor-pointer transition-colors duration-200"
                  >
                    파일 선택
                  </label>
                </div>
                
                <div className="mt-4 text-sm text-gray-500">
                  지원 형식: .xlsx, .xls (최대 10MB)
                </div>
              </div>
              
              {/* Excel 형식 다운로드 */}
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-4">
                  📋 Excel 형식 다운로드
                </h3>
                <p className="text-gray-600 mb-6">
                  설문 대상 업로드에 필요한 Excel 형식을 다운로드하세요.
                </p>
                
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-800">설문 대상 템플릿</h4>
                      <p className="text-sm text-gray-500">기업 정보, 설문 항목 등이 포함된 표준 형식</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      // Excel 템플릿 다운로드 로직
                      alert('Excel 템플릿 다운로드 기능을 구현합니다.');
                    }}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Excel 템플릿 다운로드
                  </button>
                  
                  <div className="mt-4 text-sm text-gray-500">
                    <p>• 기업명, 설문 항목, 평가 기준 등이 포함</p>
                    <p>• 표준 형식으로 작성하면 자동 처리됩니다</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 발송 대상 명단 확인 */}
            <div className="mt-8 p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-purple-800">📋 발송 대상 명단</h3>
                    <p className="text-purple-600 text-sm">업로드된 Excel 파일의 설문 대상 기업 목록을 확인하세요</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm font-medium rounded-full">
                    총 {0}개 기업
                  </span>
                  <button
                    onClick={() => {
                      alert('명단 새로고침 기능을 구현합니다.');
                    }}
                    className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors duration-200"
                    title="명단 새로고침"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* 업로드된 파일 정보 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-lg p-4 border border-purple-200">
                  <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="font-medium text-gray-800">업로드된 파일</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {excelFilename ? excelFilename : '파일이 업로드되지 않았습니다'}
                  </p>
                </div>
                
                <div className="bg-white rounded-lg p-4 border border-purple-200">
                  <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium text-gray-800">업로드 시간</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {excelFilename ? new Date().toLocaleString('ko-KR') : '-'}
                  </p>
                </div>
                
                <div className="bg-white rounded-lg p-4 border border-purple-200">
                  <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span className="font-medium text-gray-800">데이터 상태</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {excelFilename ? '✅ 처리 완료' : '❌ 미업로드'}
                  </p>
                </div>
              </div>
              
              {/* 대상 기업 목록 테이블 */}
              <div className="bg-white rounded-lg border border-purple-200 overflow-hidden">
                <div className="px-6 py-4 bg-purple-50 border-b border-purple-200">
                  <h4 className="font-medium text-purple-800">🏢 대상 기업 목록</h4>
                </div>
                
                {excelFilename ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            순번
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            기업명
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            담당자
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            연락처
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            상태
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            작업
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {/* 샘플 데이터 - 실제로는 Excel에서 파싱된 데이터를 사용 */}
                        <tr className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">1</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">샘플기업 A</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">김담당</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">kim@sample.com</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                              대기중
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <button className="text-purple-600 hover:text-purple-900 mr-2">수정</button>
                            <button className="text-red-600 hover:text-red-900">삭제</button>
                          </td>
                        </tr>
                        <tr className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">2</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">샘플기업 B</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">이담당</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">lee@sample.com</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                              대기중
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <button className="text-purple-600 hover:text-purple-900 mr-2">수정</button>
                            <button className="text-red-600 hover:text-red-900">삭제</button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="px-6 py-12 text-center">
                    <div className="text-4xl text-gray-300 mb-4">📊</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">업로드된 파일이 없습니다</h3>
                    <p className="text-gray-500 mb-4">위의 '설문 대상 업로드' 섹션에서 Excel 파일을 업로드해주세요.</p>
                    <button
                      onClick={() => {
                        // 파일 업로드 섹션으로 스크롤
                        document.getElementById('excel-upload')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-purple-700 bg-purple-100 hover:bg-purple-200 transition-colors duration-200"
                    >
                      파일 업로드하러 가기
                    </button>
                  </div>
                )}
              </div>
              
              {/* 명단 관리 액션 버튼 */}
              {excelFilename && (
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    onClick={() => {
                      alert('명단 내보내기 기능을 구현합니다.');
                    }}
                    className="inline-flex items-center px-4 py-2 border border-purple-300 text-sm font-medium rounded-md text-purple-700 bg-white hover:bg-purple-50 transition-colors duration-200"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    명단 내보내기
                  </button>
                  
                  <button
                    onClick={() => {
                      alert('명단 편집 기능을 구현합니다.');
                    }}
                    className="inline-flex items-center px-4 py-2 border border-purple-300 text-sm font-medium rounded-md text-purple-700 bg-white hover:bg-purple-50 transition-colors duration-200"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    명단 편집
                  </button>
                  
                  <button
                    onClick={() => {
                      alert('명단 검증 기능을 구현합니다.');
                    }}
                    className="inline-flex items-center px-4 py-2 border border-purple-300 text-sm font-medium rounded-md text-purple-700 bg-white hover:bg-purple-50 transition-colors duration-200"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    명단 검증
                  </button>
                  
                  <button
                    onClick={() => {
                      alert('명단 초기화 기능을 구현합니다.');
                    }}
                    className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 transition-colors duration-200"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    명단 초기화
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 설문 관리 섹션 */}
          <div id="survey-management" className="bg-white rounded-xl shadow-lg p-6 mb-12">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">
              📝 설문 관리
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* 설문 미리보기 */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-blue-800">설문 미리보기</h3>
                    <p className="text-blue-600 text-sm">업로드된 설문 내용을 미리 확인하세요</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <h4 className="font-medium text-gray-800 mb-2">📋 설문 기본 정보</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>• 설문 제목: 중대성 평가 설문</p>
                      <p>• 대상 기업: 0개</p>
                      <p>• 설문 항목: 0개</p>
                      <p>• 예상 소요시간: 약 10분</p>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <h4 className="font-medium text-gray-800 mb-2">❓ 설문 문항 예시</h4>
                    <div className="text-sm text-gray-600 space-y-2">
                      <div className="p-3 bg-gray-50 rounded border-l-4 border-blue-400">
                        <p className="font-medium">Q1. 환경 관련 이슈</p>
                        <p className="text-gray-500">귀사에서 가장 중요하게 생각하는 환경 이슈는 무엇입니까?</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded border-l-4 border-green-400">
                        <p className="font-medium">Q2. 사회적 책임</p>
                        <p className="text-gray-500">사회적 가치 창출을 위해 어떤 활동을 하고 계십니까?</p>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      alert('설문 미리보기 기능을 구현합니다.');
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    설문 미리보기
                  </button>
                </div>
              </div>
              
              {/* 설문 발송하기 */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-green-800">설문 발송하기</h3>
                    <p className="text-green-600 text-sm">설문을 대상 기업들에게 발송하세요</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-white rounded-lg p-4 border border-green-200">
                    <h4 className="font-medium text-gray-800 mb-2">📧 발송 설정</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">발송 방식</label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm">
                          <option>이메일 발송</option>
                          <option>SMS 발송</option>
                          <option>링크 공유</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">발송 일정</label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm">
                          <option>즉시 발송</option>
                          <option>예약 발송</option>
                          <option>단계별 발송</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">응답 마감일</label>
                        <input
                          type="date"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border border-green-200">
                    <h4 className="font-medium text-gray-800 mb-2">📊 발송 현황</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>• 대상 기업: 0개</p>
                      <p>• 발송 완료: 0개</p>
                      <p>• 응답 완료: 0개</p>
                      <p>• 응답률: 0%</p>
                    </div>
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={() => {
                        alert('설문 발송 기능을 구현합니다.');
                      }}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      설문 발송하기
                    </button>
                    
                    <button
                      onClick={() => {
                        alert('발송 일정 설정 기능을 구현합니다.');
                      }}
                      className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      일정 설정
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 설문 결과 확인 */}
          <div id="survey-results" className="bg-white rounded-xl shadow-lg p-6 mb-12">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">
              📊 설문 결과 확인
            </h2>
            
            <div className="bg-gray-50 rounded-lg p-12 text-center border-2 border-dashed border-gray-300">
              <div className="text-4xl text-gray-300 mb-4">📈</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">설문 결과 확인</h3>
              <p className="text-gray-500">설문 응답 결과를 확인하고 분석할 수 있는 공간입니다.</p>
            </div>
          </div>

          {/* 최종 이슈풀 확인하기 */}
          <div id="final-issuepool" className="bg-white rounded-xl shadow-lg p-6 mb-12">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">
              📋 최종 이슈풀 확인하기
            </h2>
            
            <div className="bg-gray-50 rounded-lg p-12 text-center border-2 border-dashed border-gray-300">
              <div className="text-4xl text-gray-300 mb-4">🎯</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">최종 이슈풀 확인</h3>
              <p className="text-gray-500">미디어 검색과 설문 결과를 종합한 최종 이슈풀을 확인할 수 있는 공간입니다.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
