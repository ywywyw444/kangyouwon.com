'use client';

import React, { useState } from 'react';
import NavigationTabs from '@/component/NavigationTabs';
import { MediaCard, MediaItem } from '@/component/MediaCard';
import axios from 'axios';

export default function MaterialityHomePage() {
  const [selectedCompany, setSelectedCompany] = useState('');
  const [companies, setCompanies] = useState<string[]>([]);
  const [reportPeriod, setReportPeriod] = useState({
    startDate: '',
    endDate: ''
  });

  // 로그인한 사용자의 기업 정보 가져오기
  React.useEffect(() => {
    const getUserCompany = () => {
      try {
        const userData = localStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          if (user.company_id) {
            setSelectedCompany(user.company_id);
            // 실제로는 API에서 기업 목록을 가져와야 함
            // 임시로 하드코딩된 기업 목록 사용
            setCompanies([user.company_id, 'ABC 기업', 'XYZ 그룹', 'DEF 주식회사']);
          }
        }
      } catch (error) {
        console.error('사용자 정보를 가져오는데 실패했습니다:', error);
        // 기본 기업 목록 설정
        setCompanies(['ABC 기업', 'XYZ 그룹', 'DEF 주식회사', 'GHI 산업', 'JKL 전자']);
      }
    };

    getUserCompany();
  }, []);

  const mediaItems: MediaItem[] = [
    {
      id: 1,
      title: '기후변화 대응을 위한 ESG 경영 전략',
      keyword: '기후변화, ESG, 지속가능성',
      url: 'https://example.com/article1',
      publishedAt: '2024-01-15T10:00:00Z'
    },
    {
      id: 2,
      title: '인권과 노동환경 개선을 위한 기업의 역할',
      keyword: '인권, 노동환경, 사회책임',
      url: 'https://example.com/article2',
      publishedAt: '2024-01-14T14:30:00Z'
    },
    {
      id: 3,
      title: '거버넌스 강화를 통한 투명성 확보',
      keyword: '거버넌스, 투명성, 윤리경영',
      url: 'https://example.com/article3',
      publishedAt: '2024-01-13T09:15:00Z'
    },
    {
      id: 4,
      title: '공급망 관리와 경제적 영향 분석',
      keyword: '공급망, 경제영향, 리스크관리',
      url: 'https://example.com/article4',
      publishedAt: '2024-01-12T16:45:00Z'
    },
    {
      id: 5,
      title: '생물다양성 보전을 위한 기업 활동',
      keyword: '생물다양성, 환경보호, 생태계',
      url: 'https://example.com/article5',
      publishedAt: '2024-01-11T11:20:00Z'
    },
    {
      id: 6,
      title: '지역사회 발전과 기업의 사회적 책임',
      keyword: '지역사회, 사회책임, 지역발전',
      url: 'https://example.com/article6',
      publishedAt: '2024-01-10T13:10:00Z'
    },
    {
      id: 7,
      title: '혁신 기술을 활용한 지속가능한 성장',
      keyword: '혁신, 기술, 지속가능성',
      url: 'https://example.com/article7',
      publishedAt: '2024-01-09T15:30:00Z'
    },
    {
      id: 8,
      title: '자원관리와 순환경제 모델 구축',
      keyword: '자원관리, 순환경제, 효율성',
      url: 'https://example.com/article8',
      publishedAt: '2024-01-08T08:45:00Z'
    }
  ];

  const recentActivities = [
    {
      id: 1,
      type: '평가 완료',
      topic: '기후변화 대응',
      date: '2024-01-15',
      status: 'completed'
    },
    {
      id: 2,
      type: '검토 중',
      topic: '인권 정책',
      date: '2024-01-12',
      status: 'reviewing'
    },
    {
      id: 3,
      type: '대기 중',
      topic: '공급망 관리',
      date: '2024-01-10',
      status: 'pending'
    }
  ];

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
        alert('기업을 선택해주세요.');
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

      console.log('🚀 미디어 검색 데이터를 gateway로 전송:', searchData);

      // Railway 프로덕션 환경 API 호출
      const apiUrl = 'https://materiality-service-production-0876.up.railway.app';
      const response = await axios.post(
        `${apiUrl}/api/v1/materiality-service/search-media`, 
        searchData,
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      console.log('✅ Gateway 응답:', response.data);

      if (response.data.success) {
        alert(`✅ 미디어 검색 요청이 성공적으로 전송되었습니다!\n\n기업: ${selectedCompany}\n기간: ${reportPeriod.startDate} ~ ${reportPeriod.endDate}`);
        
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
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'reviewing':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return '완료';
      case 'reviewing':
        return '검토 중';
      case 'pending':
        return '대기 중';
      default:
        return '알 수 없음';
    }
  };

  return (
    <div className="min-h-screen bg-white">
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  기업 선택
                </label>
                <select
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">기업을 선택하세요</option>
                  {companies.map((company) => (
                    <option key={company} value={company}>
                      {company}
                    </option>
                  ))}
                </select>
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">종료일</label>
                    <input
                      type="date"
                      value={reportPeriod.endDate}
                      onChange={(e) => setReportPeriod(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* 미디어 검색 시작 버튼 */}
            <div className="mt-6">
              <button
                onClick={handleMediaSearch}
                className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg hover:bg-purple-700 transition-colors duration-200 font-medium text-lg flex items-center justify-center space-x-2"
              >
                <span>🔍</span>
                <span>미디어 검색 시작</span>
              </button>
            </div>
          </div>

          {/* 미디어 카드 */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">
              미디어 검색 결과
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {mediaItems.map((item) => (
                <MediaCard key={item.id} item={item} />
              ))}
            </div>
          </div>

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

          {/* 최근 활동 */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">
              최근 활동
            </h2>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <div>
                      <div className="font-medium text-gray-800">
                        {activity.topic}
                      </div>
                      <div className="text-sm text-gray-600">
                        {activity.type} • {activity.date}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                      activity.status
                    )}`}
                  >
                    {getStatusText(activity.status)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 통계 요약 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="bg-white rounded-xl shadow-lg p-6 text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">8</div>
              <div className="text-gray-600">미디어 기사</div>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6 text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">66%</div>
              <div className="text-gray-600">전체 진행률</div>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6 text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">12</div>
              <div className="text-gray-600">이번 달 활동</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
