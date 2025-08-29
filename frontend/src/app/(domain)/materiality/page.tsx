'use client';

import React, { useState, ChangeEvent, useEffect } from 'react';
import NavigationTabs from '@/component/NavigationTabs';
import { MediaCard, MediaItem } from '@/component/MediaCard';
import IndexBar from '@/component/IndexBar';
import { useMediaStore } from '@/store/mediaStore';
import { SearchResult, IssuepoolData } from "../../lib/types";
import axios from 'axios';
import * as XLSX from 'xlsx';
import { useExcelDataStore } from '@/store/excelDataStore';

interface ExcelCell {
  v?: string | number | boolean | Date;
  w?: string;
  t?: string;
}

interface ExcelWorksheet {
  [cell: string]: ExcelCell;
}

interface Article {
  title: string;
  originallink?: string;
  pubDate?: string;
  company?: string;
  issue?: string;
  original_category?: string;
}

interface SearchPeriod {
  start_date: string;
  end_date: string;
}

interface SearchData {
  company_id: string;
  search_period: SearchPeriod;
  articles?: Article[];
  total_results?: number;
  excel_filename?: string;
  excel_base64?: string;
  search_context?: Record<string, unknown>;
}

interface ExcelUploadResult {
  isValid: boolean;
  filename: string;
  base64Data?: string;
  error?: string;
}

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
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
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



  // 엑셀 파일 업로드 및 검증 처리
  const handleExcelUpload = async (file: File) => {
    try {
      // 파일 크기 체크 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('파일 크기는 10MB를 초과할 수 없습니다.');
        return;
      }

      // 파일 확장자 체크
      if (!file.name.match(/\.(xlsx|xls)$/)) {
        alert('Excel 파일(.xlsx, .xls)만 업로드 가능합니다.');
        return;
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // 첫 번째 시트 가져오기
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          
          // 2행의 A부터 E열까지의 값 가져오기
          const expectedHeaders = ['이름', '직책', '소속 기업', '이해관계자 구분', '이메일'];
          const actualHeaders: string[] = [];
          
          for (let i = 0; i < 5; i++) {
            const cellAddress = XLSX.utils.encode_cell({ r: 1, c: i }); // 2행(인덱스 1)의 각 열
            const cell = firstSheet[cellAddress];
            const cellValue = cell?.v;
            actualHeaders.push(typeof cellValue === 'string' ? cellValue : '');
          }

          // 헤더 비교
          const isValid = expectedHeaders.every((header, index) => header === actualHeaders[index]);
          setIsExcelValid(isValid);
          setExcelFilename(file.name);

          // 파일을 base64로 변환하여 저장
          const base64String = btoa(String.fromCharCode(...new Uint8Array(e.target?.result as ArrayBuffer)));
          setExcelBase64(base64String);

          if (isValid) {
            // 엑셀 데이터를 JSON으로 변환 (헤더 행을 제외하고 데이터 시작)
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { 
              range: 2,  // 3행부터 데이터 시작
              header: ['이름', '직책', '소속 기업', '이해관계자 구분', '이메일']  // 열 이름 직접 지정
            });
            
            // 데이터 형식 변환 및 저장
            const formattedData = jsonData.map((row: any) => ({
              name: row['이름'] || '',
              position: row['직책'] || '',
              company: row['소속 기업'] || '',
              stakeholderType: row['이해관계자 구분'] || '',
              email: row['이메일'] || ''
            }));

            console.log('Formatted Excel Data:', formattedData);  // 데이터 확인용 로그
            console.log('📊 데이터 길이:', formattedData.length);
            console.log('📁 파일명:', file.name);
            console.log('🔑 base64 길이:', base64String.length);
            
            // Zustand store에 데이터 설정
            setExcelData(formattedData);
            setIsExcelValid(true);
            setExcelFilename(file.name);
            setExcelBase64(base64String);
            
            console.log('✅ Zustand store 설정 완료');
            
            // 명시적으로 localStorage에 저장
            const dataToSave = {
              excelData: formattedData,
              isValid: true,
              fileName: file.name,
              base64Data: base64String
            };
            
            try {
              localStorage.setItem('excelUploadData', JSON.stringify(dataToSave));
              console.log('💾 localStorage 저장 완료:', dataToSave);
              
              // 저장 확인
              const savedData = localStorage.getItem('excelUploadData');
              console.log('🔍 localStorage 저장 확인:', savedData);
              
              if (savedData) {
                const parsedData = JSON.parse(savedData);
                console.log('✅ localStorage 데이터 파싱 성공:', parsedData);
                console.log('📊 저장된 데이터 길이:', parsedData.excelData?.length);
              } else {
                console.error('❌ localStorage 저장 실패: 데이터가 없음');
              }
            } catch (error) {
              console.error('❌ localStorage 저장 중 오류:', error);
            }
            
            alert('✅ 템플릿 검증이 완료되었습니다.\n' + formattedData.length + '개의 데이터가 성공적으로 업로드되었습니다.');
          } else {
            alert('❌ 템플릿 형식이 올바르지 않습니다.\n2행의 열 제목이 템플릿과 일치하지 않습니다.\n\n예상된 열 제목:\n' + expectedHeaders.join(', '));
          }
        } catch (error) {
          console.error('Excel 파일 처리 중 오류 발생:', error);
          alert('Excel 파일 처리 중 오류가 발생했습니다.');
          setIsExcelValid(false);
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('파일 업로드 중 오류 발생:', error);
      alert('파일 업로드 중 오류가 발생했습니다.');
      setIsExcelValid(false);
    }
  };

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

  // 중대성 평가 결과 저장 함수
  const saveAssessmentResult = () => {
    if (!assessmentResult) {
      alert('저장할 중대성 평가 결과가 없습니다.');
      return;
    }

    try {
      const dataToSave = {
        assessmentResult,
        timestamp: new Date().toISOString(),
        companyId: companyId,
        searchPeriod: searchPeriod
      };
      
      localStorage.setItem('materialityAssessmentResult', JSON.stringify(dataToSave));
      console.log('💾 중대성 평가 결과 저장 완료:', dataToSave);
      alert('✅ 중대성 평가 결과가 성공적으로 저장되었습니다.');
    } catch (error) {
      console.error('❌ 중대성 평가 결과 저장 실패:', error);
      alert('❌ 중대성 평가 결과 저장에 실패했습니다.');
    }
  };

  // 저장된 중대성 평가 결과 불러오기 함수
  const loadAssessmentResult = () => {
    try {
      const savedData = localStorage.getItem('materialityAssessmentResult');
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        console.log('📂 저장된 중대성 평가 결과 불러오기:', parsedData);
        
        if (parsedData.assessmentResult) {
          setAssessmentResult(parsedData.assessmentResult);
          
          // 기업 정보와 검색 기간도 복원
          if (parsedData.companyId) {
            setCompanyId(parsedData.companyId);
            setCompanySearchTerm(parsedData.companyId);
          }
          if (parsedData.searchPeriod) {
            setSearchPeriod(parsedData.searchPeriod);
          }
          
          alert('✅ 저장된 중대성 평가 결과를 불러왔습니다.');
        } else {
          alert('⚠️ 저장된 중대성 평가 결과가 없습니다.');
        }
      } else {
        alert('⚠️ 저장된 중대성 평가 결과가 없습니다.');
      }
    } catch (error) {
      console.error('❌ 저장된 중대성 평가 결과 불러오기 실패:', error);
      alert('❌ 저장된 중대성 평가 결과를 불러오는데 실패했습니다.');
    }
  };

  // 전체 카테고리 목록 가져오기 함수
  const fetchAllCategories = async () => {
    try {
      // 실제로는 API에서 가져와야 하지만, 현재는 schema.py에 정의된 32개 카테고리를 하드코딩
      const categories = [
        '기후변화', '탄소배출', '대기오염', '생물다양성/산림보호', '폐기물/폐기물관리',
        '에너지', '재생에너지', '자원순환/자원효율/원자재관리', '온실가스', '원재료',
        '환경영향/환경오염/오염물질/유해화학물질', '친환경', '노사관계', '제품안전/제품품질',
        '고용/일자리', '공급망', '임금/인사제도', '임직원', '인권', '안전보건', '폐수관리',
        '인재관리/인재', '지역사회/사회공헌', '협력사', '조직문화/기업문화', '성장',
        '연구개발/R&D', '시장경쟁/시장점유/경제성과/재무성과', '윤리경영/준법경영/부패/뇌물수수',
        '리스크', '정보보안'
      ];
      setAllCategories(categories);
    } catch (error) {
      console.error('❌ 전체 카테고리 목록 가져오기 실패:', error);
      // 에러 발생 시 기본 카테고리 목록 사용
      const defaultCategories = [
        '기후변화', '탄소배출', '대기오염', '생물다양성/산림보호', '폐기물/폐기물관리',
        '에너지', '재생에너지', '자원순환/자원효율/원자재관리', '온실가스', '원재료',
        '환경영향/환경오염/오염물질/유해화학물질', '친환경', '노사관계', '제품안전/제품품질',
        '고용/일자리', '공급망', '임금/인사제도', '임직원', '인권', '안전보건', '폐수관리',
        '인재관리/인재', '지역사회/사회공헌', '협력사', '조직문화/기업문화', '성장',
        '연구개발/R&D', '시장경쟁/시장점유/경제성과/재무성과', '윤리경영/준법경영/부패/뇌물수수',
        '리스크', '정보보안'
      ];
      setAllCategories(defaultCategories);
    }
  };

  // 새로운 카테고리 추가 함수
  const addNewCategory = () => {
    if (!selectedNewCategory || !newBaseIssuePool) {
      alert('카테고리와 base issue pool을 모두 선택/입력해주세요.');
      return;
    }

    try {
      // 새로운 카테고리 객체 생성
      const newCategory = {
        rank: newCategoryRank,
        category: selectedNewCategory,
        frequency_score: 0.0,
        relevance_score: 0.0,
        recent_score: 0.0,
        rank_score: 0.0,
        reference_score: 0.0,
        negative_score: 0.0,
        final_score: 0.0,
        count: 0,
        esg_classification: getESGClassification(selectedNewCategory),
        esg_classification_id: null,
        base_issuepools: [],
        total_issuepools: 0,
        selected_base_issue_pool: newBaseIssuePool
      };

      // assessmentResult에 새로운 카테고리 추가
      const resultData = assessmentResult?.data || assessmentResult;
      const updatedCategories = [...(resultData?.matched_categories || []), newCategory];
      
      // 순위별로 정렬
      updatedCategories.sort((a, b) => a.rank - b.rank);
      
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

      // 모달 닫기 및 상태 초기화
      setIsAddCategoryModalOpen(false);
      setSelectedNewCategory('');
      setNewCategoryRank(1);
      setNewBaseIssuePool('');
      setIsCustomBaseIssuePool(false);
      setCustomBaseIssuePoolText('');
      
      alert(`✅ 새로운 카테고리 "${selectedNewCategory}"가 ${newCategoryRank}위로 추가되었습니다.`);
    } catch (error) {
      console.error('❌ 새로운 카테고리 추가 실패:', error);
      alert('❌ 새로운 카테고리 추가에 실패했습니다.');
    }
  };

  // 카테고리명으로 ESG 분류 결정하는 함수
  const getESGClassification = (categoryName: string): string => {
    const environmentalKeywords = ['기후변화', '탄소배출', '대기오염', '생물다양성', '산림보호', '폐기물', '에너지', '재생에너지', '자원순환', '원자재', '온실가스', '원재료', '환경영향', '환경오염', '오염물질', '유해화학물질', '친환경', '폐수'];
    const socialKeywords = ['노사관계', '제품안전', '제품품질', '고용', '일자리', '공급망', '임금', '인사제도', '임직원', '인권', '안전보건', '인재관리', '인재', '지역사회', '사회공헌', '협력사', '조직문화', '기업문화'];
    const governanceKeywords = ['성장', '연구개발', 'R&D', '윤리경영', '준법경영', '부패', '뇌물수수', '리스크', '정보보안'];
    const economicKeywords = ['시장경쟁', '시장점유', '경제성과', '재무성과'];

    if (environmentalKeywords.some(keyword => categoryName.includes(keyword))) {
      return '환경';
    } else if (socialKeywords.some(keyword => categoryName.includes(keyword))) {
      return '사회';
    } else if (governanceKeywords.some(keyword => categoryName.includes(keyword))) {
      return '지배구조';
    } else if (economicKeywords.some(keyword => categoryName.includes(keyword))) {
      return '경제';
    } else {
      return '미분류';
    }
  };

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
    const companyId = searchResult.data.company_id;
    const startDate = searchResult.data.search_period.start_date;
    const endDate = searchResult.data.search_period.end_date;

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
      if (!companyId) {
        alert('기업을 선택해주세요.');
        return;
      }
      
      if (!searchPeriod.start_date || !searchPeriod.end_date) {
        alert('보고기간을 설정해주세요.');
        return;
      }

      // 시작일이 종료일보다 늦은 경우 검증
      if (new Date(searchPeriod.start_date) > new Date(searchPeriod.end_date)) {
        alert('시작일은 종료일보다 빨라야 합니다.');
        return;
      }

      // 로딩 상태 시작
      setLoading(true);

      // JSON 데이터 구성
      const searchData = {
        company_id: companyId,
        report_period: {
          start_date: searchPeriod.start_date,
          end_date: searchPeriod.end_date
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
        
        alert(`✅ 미디어 검색이 완료되었습니다!\n\n기업: ${companyId}\n기간: ${searchPeriod.start_date} ~ ${searchPeriod.end_date}\n\n총 ${response.data.data?.total_results || 0}개의 뉴스 기사를 찾았습니다.`);
      } else {
        alert(`❌ 미디어 검색 요청 실패: ${response.data.message || '알 수 없는 오류'}`);
      }

    } catch (error: unknown) {
      console.error('❌ 미디어 검색 요청 실패:', error);
      
      // 에러 응답 처리
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
      setLoading(false);
    }
  };

  // 검색어에 따라 기업 목록 필터링
  const filteredCompanies = companies.filter(company =>
    company.toLowerCase().includes(companySearchTerm.toLowerCase())
  );

  // 기업 선택 처리
  const handleCompanySelect = (company: string) => {
    setCompanyId(company);
    setCompanySearchTerm(company);
    setIsCompanyDropdownOpen(false);
  };

  // 검색어 초기화 (검색 필드 클리어)
  const handleClearSearch = () => {
    setCompanySearchTerm('');
    setIsCompanyDropdownOpen(false);
  };

  // 기업 검색어 변경 처리
  const handleCompanySearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setCompanySearchTerm(e.target.value);
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
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-800">
                  🔍 미디어 검색
                </h2>
                <button
                  onClick={() => {
                    const savedSearch = localStorage.getItem('savedMediaSearch');
                    if (savedSearch) {
                      try {
                        const savedData = JSON.parse(savedSearch);
                        setCompanyId(savedData.company_id);
                        setCompanySearchTerm(savedData.company_id);
                        setSearchPeriod({
                          start_date: savedData.search_period.start_date,
                          end_date: savedData.search_period.end_date
                        });
                        console.log('Loading from localStorage:', {
                          ...savedData,
                          excel_base64: savedData.excel_base64 ? 'exists' : 'missing'
                        });
                        
                        const searchResultData = {
                          success: true,
                          data: {
                            company_id: savedData.company_id,
                            search_period: savedData.search_period,
                            articles: savedData.articles,
                            total_results: savedData.total_results
                          }
                        };
                        setSearchResult(searchResultData);

                        // 검색 결과에서 받은 엑셀 파일 정보를 그대로 사용
                        if (savedData.data?.excel_filename && savedData.data?.excel_base64) {
                          setExcelFilename(savedData.data.excel_filename);
                          setExcelBase64(savedData.data.excel_base64);
                          console.log('Excel data loaded from search result');
                        } else {
                          console.log('No excel data in search result');
                        }
                        alert('✅ 이전 검색 정보를 성공적으로 불러왔습니다.');
                      } catch (error) {
                        console.error('저장된 검색 결과를 불러오는데 실패했습니다:', error);
                        alert('❌ 이전 검색 정보를 불러오는데 실패했습니다.');
                      }
                    } else {
                      alert('저장된 이전 검색 정보가 없습니다.');
                    }
                  }}
                  className="inline-flex items-center px-4 py-2 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 transition-colors duration-200"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  이전 검색 정보 불러오기
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="relative company-dropdown-container">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  기업 선택
                </label>
                                 <div className="relative">
                   <input
                     type="text"
                     value={companySearchTerm}
                                           onChange={handleCompanySearchChange}
                     onFocus={() => setIsCompanyDropdownOpen(true)}
                     placeholder={isCompanyLoading ? "🔄 기업 목록을 불러오는 중..." : "기업명을 입력하거나 선택하세요"}
                     className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                       companyId ? 'text-gray-900 font-medium' : 'text-gray-500'
                     }`}
                     disabled={isCompanyLoading || isMediaSearching}
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
                {isCompanyDropdownOpen && !isCompanyLoading && companies.length > 0 && (
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
                            company === companyId ? 'bg-blue-100 text-blue-800 font-medium' : 'text-gray-700'
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
                                             value={searchPeriod.start_date}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchPeriod({ ...searchPeriod, start_date: e.target.value })}
                       disabled={isMediaSearching}
                       className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
                         searchPeriod.start_date ? 'text-gray-900 font-medium' : 'text-gray-500'
                       } ${isMediaSearching ? 'cursor-not-allowed opacity-50' : ''}`}
                     />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">종료일</label>
                                         <input
                       type="date"
                                             value={searchPeriod.end_date}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchPeriod({ ...searchPeriod, end_date: e.target.value })}
                       disabled={isMediaSearching}
                       className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
                         searchPeriod.end_date ? 'text-gray-900 font-medium' : 'text-gray-500'
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
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setIsSearchResultCollapsed(!isSearchResultCollapsed)}
                    className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                  >
                    <span>{isSearchResultCollapsed ? '펼치기' : '접기'}</span>
                    <span className="text-lg">{isSearchResultCollapsed ? '▼' : '▲'}</span>
                  </button>
                </div>
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
                        className="inline-flex items-center px-4 py-2 border border-green-300 text-sm font-medium rounded-md text-green-700 bg-white hover:bg-green-50 transition-colors duration-200"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        엑셀 다운로드
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
                          className="inline-flex items-center px-4 py-2 border border-green-300 text-sm font-medium rounded-md text-green-700 bg-white hover:bg-green-50 transition-colors duration-200"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          엑셀 다운로드
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
                    {/* 검색 결과 저장 버튼 */}
                    <div className="mt-8 mb-8">
                      <button
                        onClick={() => {
                          // 기존에 저장된 정보를 지우고 현재 검색된 정보를 저장
                          if (searchResult?.data) {
                            // 기존 저장된 정보 삭제
                            localStorage.removeItem('savedMediaSearch');
                            
                            // 현재 검색된 정보를 새로운 키로 저장
                            const dataToSave = {
                              company_id: searchResult.data.company_id,
                              search_period: {
                                start_date: searchResult.data.search_period.start_date,
                                end_date: searchResult.data.search_period.end_date
                              },
                              articles: searchResult.data.articles,
                              total_results: searchResult.data.total_results,
                              data: {
                                excel_filename: excelFilename,
                                excel_base64: excelBase64
                              },
                              timestamp: new Date().toISOString()
                            };
                            
                            // 새로운 검색 결과 저장
                            localStorage.setItem('savedMediaSearch', JSON.stringify(dataToSave));
                            
                            // Zustand store에도 검색 결과 저장
                            setCompanyId(searchResult.data.company_id);
                            setSearchPeriod({
                              start_date: searchResult.data.search_period.start_date,
                              end_date: searchResult.data.search_period.end_date
                            });
                            
                            console.log('🔄 기존 저장 정보 삭제 후 새로운 검색 결과 저장:', dataToSave);
                            alert('✅ 기존 저장 정보를 지우고 새로운 검색 결과가 저장되었습니다.');
                          } else {
                            alert('❌ 저장할 검색 결과가 없습니다.');
                          }
                        }}
                        className="w-full inline-flex items-center justify-center px-4 py-3 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 transition-colors duration-200"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                        </svg>
                        검색 결과 저장하기
                      </button>
                    </div>

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
              📑 {companyId ? `${companyId} 중대성 평가 중간 결과 보기` : '중대성 평가 중간 결과 보기'}
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

                  try {
                    setIsAssessmentStarting(true);
                    
                    // 3. 기사 데이터 구조 검증 및 안전한 매핑
                    const formattedArticles = searchResult.data.articles.map(article => {
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
                        
                        // 상위 5개 카테고리 정보를 alert로 표시
                        const topCategories = matchedCategories.slice(0, 5);
                        let alertMessage = '✅ 중간 중대성 평가 완료\n\n🏆 상위 5개 카테고리:\n';
                        
                        topCategories.forEach((cat: any, index: number) => {
                          const esgName = cat.esg_classification || '미분류';
                          const issueCount = cat.total_issuepools || 0;
                          alertMessage += `${index + 1}. ${cat.category}\n   ESG: ${esgName}\n   이슈풀: ${issueCount}개\n\n`;
                        });
                        
                        alert(alertMessage);
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
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>중간 중대성 평가 진행 중</span>
                  </>
                ) : (
                  <>
                    <span>🚀</span>
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
                        return Object.entries(esgDistribution).map(([esgName, data]: [string, { count: number; percentage: number }]) => {
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
                        onClick={loadAssessmentResult}
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
                          fetchAllCategories();
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

          {/* 설문 대상 업로드 */}
          <div id="survey-upload" className="bg-white rounded-xl shadow-lg p-6 mb-12">
              <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                  📊 설문 대상 업로드
                </h2>
                  <p className="text-gray-600">
                    업로드된 Excel 파일의 설문 대상 기업 목록을 확인하세요
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <a
                    href="/중대성평가 설문 대상자 템플릿.xlsx"
                    download="중대성평가 설문 대상자 템플릿.xlsx"
                    className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors duration-200"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Excel 템플릿 다운로드
                  </a>
                </div>
              </div>

              <div 
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors duration-200"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  
                  const file = e.dataTransfer.files[0];
                  if (file) {
                    handleExcelUpload(file);
                  }
                }}
              >
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
                      handleExcelUpload(file);
                      }
                    }}
                    className="hidden"
                    id="excel-upload"
                  />
                  <label
                    htmlFor="excel-upload"
                    className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg cursor-pointer transition-colors duration-200"
                  >
                  파일 업로드
                  </label>
                </div>
                
              <div className="mt-4 space-y-2">
                <div className="text-sm text-gray-500">
                  지원 형식: .xlsx, .xls (최대 10MB)
                </div>
                {isExcelValid !== null && (
                  <div className={`text-sm ${isExcelValid ? 'text-green-600' : 'text-red-600'} font-medium`}>
                    {isExcelValid ? (
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                        템플릿 검증 완료
                    </div>
                    ) : (
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                        템플릿 형식이 올바르지 않습니다
                  </div>
                    )}
                </div>
                )}
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
                  <button
                    onClick={() => {
                      try {
                        // 먼저 localStorage에서 직접 데이터 확인
                        const savedData = localStorage.getItem('excelUploadData');
                        console.log('localStorage 데이터:', savedData);
                        
                                                if (savedData) {
                          const parsedData = JSON.parse(savedData);
                          console.log('파싱된 데이터:', parsedData);
                          
                          // Zustand store에 직접 설정
                          setExcelData(parsedData.excelData || []);
                          setIsExcelValid(parsedData.isValid || false);
                          setExcelFilename(parsedData.fileName || null);
                          setExcelBase64(parsedData.base64Data || null);
                          
                          // 화면 표시 상태 복원
                          setIsDataHidden(false);
                          
                          console.log('명단 불러오기 후 상태:', {
                            excelData: parsedData.excelData?.length || 0,
                            excelFilename: parsedData.fileName,
                            isExcelValid: parsedData.isValid,
                            base64Data: parsedData.base64Data ? 'exists' : 'null'
                          });
                          
                          if (parsedData.excelData && parsedData.excelData.length > 0) {
                            alert('✅ 저장된 명단을 불러왔습니다.');
                          } else {
                            alert('⚠️ 저장된 명단이 없습니다.');
                          }
                        } else {
                          alert('⚠️ 저장된 명단이 없습니다.');
                        }
                      } catch (error) {
                        console.error('저장된 데이터 불러오기 실패:', error);
                        alert('❌ 저장된 데이터를 불러오는데 실패했습니다.');
                      }
                    }}
                    className="inline-flex items-center px-4 py-2 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 transition-colors duration-200"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    명단 불러오기
                  </button>
                  <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm font-medium rounded-full">
                    총 {excelData.length}개 기업
                  </span>
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
                    {/* 설문 대상 업로드 박스를 통해 업로드된 파일만 표시 */}
                    {excelFilename && excelFilename !== 'media_search_한온시스템_20250828_110609.xlsx' ? excelFilename : '파일이 업로드되지 않았습니다'}
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
                  <h4 className="font-medium text-purple-800">🏢 설문 대상자 목록</h4>
                </div>
                
                {excelFilename && !isDataHidden ? (
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
                            이름
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            이해관계자 구분
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            이메일
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            작업
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {excelData.map((row, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                            <td 
                              className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 cursor-pointer hover:bg-gray-100"
                              data-row={index}
                              data-field="company"
                              data-value={row.company}
                              onClick={(e) => {
                                const input = document.createElement('input');
                                input.value = row.company;
                                input.className = 'w-full px-2 py-1 border rounded';
                                const cell = e.currentTarget;
                                cell.innerHTML = '';
                                cell.appendChild(input);
                                input.focus();
                                
                                input.onblur = () => {
                                  updateRow(index, {
                                    ...row,
                                    company: input.value
                                  });
                                  cell.innerHTML = input.value;
                                };
                                
                                input.onkeydown = (e) => {
                                  if (e.key === 'Enter') {
                                    input.blur();
                                  }
                                };
                              }}
                            >{row.company}</td>
                            <td 
                              className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer hover:bg-gray-100"
                              data-row={index}
                              data-field="name"
                              data-value={row.name}
                              onClick={(e) => {
                                const input = document.createElement('input');
                                input.value = row.name;
                                input.className = 'w-full px-2 py-1 border rounded';
                                const cell = e.currentTarget;
                                cell.innerHTML = '';
                                cell.appendChild(input);
                                input.focus();
                                
                                input.onblur = () => {
                                  updateRow(index, {
                                    ...row,
                                    name: input.value
                                  });
                                  cell.innerHTML = input.value;
                                };
                                
                                input.onkeydown = (e) => {
                                  if (e.key === 'Enter') {
                                    input.blur();
                                  }
                                };
                              }}
                            >{row.name}</td>
                            <td 
                              className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer hover:bg-gray-100"
                              data-row={index}
                              data-field="stakeholderType"
                              data-value={row.stakeholderType}
                              onClick={(e) => {
                                const input = document.createElement('input');
                                input.value = row.stakeholderType;
                                input.className = 'w-full px-2 py-1 border rounded';
                                const cell = e.currentTarget;
                                cell.innerHTML = '';
                                cell.appendChild(input);
                                input.focus();
                                
                                input.onblur = () => {
                                  updateRow(index, {
                                    ...row,
                                    stakeholderType: input.value
                                  });
                                  cell.innerHTML = input.value;
                                };
                                
                                input.onkeydown = (e) => {
                                  if (e.key === 'Enter') {
                                    input.blur();
                                  }
                                };
                              }}
                            >{row.stakeholderType}</td>
                            <td 
                              className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer hover:bg-gray-100"
                              data-row={index}
                              data-field="email"
                              data-value={row.email}
                              onClick={(e) => {
                                const input = document.createElement('input');
                                input.value = row.email;
                                input.className = 'w-full px-2 py-1 border rounded';
                                const cell = e.currentTarget;
                                cell.innerHTML = '';
                                cell.appendChild(input);
                                input.focus();
                                
                                input.onblur = () => {
                                  updateRow(index, {
                                    ...row,
                                    email: input.value
                                  });
                                  cell.innerHTML = input.value;
                                };
                                
                                input.onkeydown = (e) => {
                                  if (e.key === 'Enter') {
                                    input.blur();
                                  }
                                };
                              }}
                            >{row.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <button 
                                onClick={() => {
                                  // 해당 행의 모든 셀을 input으로 변경
                                  const cells = document.querySelectorAll(`[data-row="${index}"]`);
                                  cells.forEach((cell) => {
                                    const input = document.createElement('input');
                                    const cellData = cell.getAttribute('data-value');
                                    input.value = cellData || '';
                                    input.className = 'w-full px-2 py-1 border rounded';
                                    cell.innerHTML = '';
                                    cell.appendChild(input);
                                    input.focus();

                                    input.onblur = () => {
                                      const field = cell.getAttribute('data-field');
                                      if (field) {
                                        updateRow(index, {
                                          ...row,
                                          [field]: input.value
                                        });
                                      }
                                      cell.innerHTML = input.value;
                                    };

                                    input.onkeydown = (e) => {
                                      if (e.key === 'Enter') {
                                        input.blur();
                                      }
                                    };
                                  });
                                }}
                                className="text-purple-600 hover:text-purple-900 mr-2"
                              >
                                수정
                              </button>
                              <button 
                                onClick={() => {
                                  if (confirm('정말 삭제하시겠습니까?')) {
                                    deleteRow(index);
                                  }
                                }}
                                className="text-red-600 hover:text-red-900"
                              >
                                삭제
                              </button>
                          </td>
                        </tr>
                        ))}
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
                      // 새로운 워크북 생성
                      const wb = XLSX.utils.book_new();
                      
                      // 헤더 행 생성 (1행은 빈 행, 2행은 템플릿 헤더)
                      const headers = [
                        [], // 1행은 빈 행
                        ['이름', '직책', '소속 기업', '이해관계자 구분', '이메일'] // 2행은 헤더
                      ];
                      
                      // 데이터 행 생성 (3행부터 시작)
                      const data = excelData.map(row => [
                        row.name,
                        row.position,
                        row.company,
                        row.stakeholderType,
                        row.email
                      ]);
                      
                      // 헤더와 데이터 결합
                      const wsData = [...headers, ...data];
                      
                      // 워크시트 생성
                      const ws = XLSX.utils.aoa_to_sheet(wsData);
                      
                      // 워크북에 워크시트 추가
                      XLSX.utils.book_append_sheet(wb, ws, "설문대상자명단");
                      
                      // 파일 다운로드
                      XLSX.writeFile(wb, "중대성평가 설문 대상자 명단.xlsx");
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
                      const newRow = {
                        name: '',
                        position: '',
                        company: '',
                        stakeholderType: '',
                        email: ''
                      };
                      const updatedData = [...excelData, newRow];
                      setExcelData(updatedData);
                      
                      // 화면 표시 상태 복원
                      setIsDataHidden(false);
                      
                      // localStorage도 명시적으로 업데이트
                      const dataToSave = {
                        excelData: updatedData,
                        isValid: isExcelValid,
                        fileName: excelFilename,
                        base64Data: excelBase64
                      };
                      localStorage.setItem('excelUploadData', JSON.stringify(dataToSave));
                      console.log('➕ 새 행 추가 후 localStorage 업데이트:', dataToSave);
                    }}
                    className="inline-flex items-center px-4 py-2 border border-green-300 text-sm font-medium rounded-md text-green-700 bg-white hover:bg-green-50 transition-colors duration-200"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    추가
                  </button>
                  
                  <button
                    onClick={() => {
                      if (confirm('현재 화면의 명단을 초기화하시겠습니까?\n(저장된 데이터는 "명단 불러오기"를 통해 다시 불러올 수 있습니다)')) {
                        // 화면에서만 데이터 숨기기 (Zustand store는 유지)
                        setIsDataHidden(true);
                        
                        // 파일 input 필드 초기화
                        const fileInput = document.getElementById('excel-upload') as HTMLInputElement;
                        if (fileInput) {
                          fileInput.value = '';
                        }
                        
                        console.log('🗑️ 명단 초기화: 화면에서만 숨김, 메모리 데이터 유지');
                        
                        alert('✅ 현재 화면의 명단이 초기화되었습니다.\n필요한 경우 "명단 불러오기"를 통해 이전 데이터를 불러올 수 있습니다.');
                      }
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
                  
                  <a
                    href="/survey"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    설문 미리보기
                  </a>
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
                                     {cat.rank}위: {cat.category}
                                   </h5>
                                   <span className="px-3 py-1 text-sm font-medium text-gray-600 bg-gray-100 rounded-full">
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
                
                {/* 새로운 항목 추가 섹션 */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <h4 className="text-md font-semibold text-gray-700 mb-3">➕ 새로운 항목 추가</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        새로운 Base Issue Pool
                      </label>
                      <input
                        type="text"
                        placeholder={`${selectedCategory.category} 관련 새로운 항목을 입력하세요`}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        onChange={(e) => setSelectedBaseIssuePool(e.target.value)}
                      />
                    </div>
                    <div className="text-xs text-gray-500">
                      💡 원하는 항목이 목록에 없다면 직접 입력할 수 있습니다.
                    </div>
                  </div>
                </div>
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
          <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white">
              <h3 className="text-xl font-bold text-gray-900">
                새로운 카테고리 추가
              </h3>
              <button
                onClick={() => setIsAddCategoryModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* 모달 바디 */}
            <div className="p-6">
              <div className="space-y-6">
                {/* 순위 입력 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    순위 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newCategoryRank}
                    onChange={(e) => setNewCategoryRank(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="1"
                  />
                  <p className="text-xs text-gray-500 mt-1">새로운 카테고리의 순위를 입력하세요.</p>
                </div>

                {/* 카테고리 선택 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    카테고리 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedNewCategory}
                    onChange={(e) => setSelectedNewCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">카테고리를 선택하세요</option>
                    {allCategories.map((category, index) => (
                      <option key={index} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">schema.py에 정의된 32개 카테고리 중에서 선택하세요.</p>
                </div>

                {/* Base Issue Pool 입력 방식 선택 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Base Issue Pool 입력 방식
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-center space-x-3">
                      <input
                        type="radio"
                        name="inputMethod"
                        checked={!isCustomBaseIssuePool}
                        onChange={() => setIsCustomBaseIssuePool(false)}
                        className="text-orange-600 focus:ring-orange-500"
                      />
                      <span className="text-gray-700">기존 항목에서 선택</span>
                    </label>
                    <label className="flex items-center space-x-3">
                      <input
                        type="radio"
                        name="inputMethod"
                        checked={isCustomBaseIssuePool}
                        onChange={() => setIsCustomBaseIssuePool(true)}
                        className="text-orange-600 focus:ring-orange-500"
                      />
                      <span className="text-gray-700">직접 입력</span>
                    </label>
                  </div>
                </div>

                {/* Base Issue Pool 입력 */}
                {!isCustomBaseIssuePool ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Base Issue Pool 선택 <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newBaseIssuePool}
                      onChange={(e) => setNewBaseIssuePool(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="">Base Issue Pool을 선택하세요</option>
                      <option value={`${selectedNewCategory} 관련 이슈 1`}>{selectedNewCategory} 관련 이슈 1</option>
                      <option value={`${selectedNewCategory} 관련 이슈 2`}>{selectedNewCategory} 관련 이슈 2</option>
                      <option value={`${selectedNewCategory} 관련 이슈 3`}>{selectedNewCategory} 관련 이슈 3</option>
                      <option value={`${selectedNewCategory} 관리`}>{selectedNewCategory} 관리</option>
                      <option value={`${selectedNewCategory} 개선`}>{selectedNewCategory} 개선</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Base Issue Pool 직접 입력 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={customBaseIssuePoolText}
                      onChange={(e) => {
                        setCustomBaseIssuePoolText(e.target.value);
                        setNewBaseIssuePool(e.target.value);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="예: 기후변화 대응 및 온실가스 감축"
                    />
                  </div>
                )}

                {/* 미리보기 */}
                {selectedNewCategory && newBaseIssuePool && (
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h4 className="font-medium text-gray-800 mb-2">추가될 카테고리 미리보기</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>순위:</strong> {newCategoryRank}위</p>
                      <p><strong>카테고리:</strong> {selectedNewCategory}</p>
                      <p><strong>ESG 분류:</strong> {getESGClassification(selectedNewCategory)}</p>
                      <p><strong>Base Issue Pool:</strong> {newBaseIssuePool}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* 모달 푸터 */}
            <div className="flex justify-end p-6 border-t border-gray-200 bg-white">
              <div className="flex space-x-3">
                <button
                  onClick={() => setIsAddCategoryModalOpen(false)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors duration-200"
                >
                  취소
                </button>
                <button
                  onClick={addNewCategory}
                  disabled={!selectedNewCategory || !newBaseIssuePool}
                  className={`px-4 py-2 font-medium rounded-lg transition-colors duration-200 ${
                    selectedNewCategory && newBaseIssuePool
                      ? 'bg-orange-600 hover:bg-orange-700 text-white'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  추가하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
