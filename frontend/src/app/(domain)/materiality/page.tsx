'use client';

import React, { useState } from 'react';
import NavigationTabs from '@/component/NavigationTabs';

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

  const materialityTopics = [
    {
      id: 'environmental',
      name: '환경',
      icon: '🌱',
      description: '기후변화, 자원관리, 생물다양성',
      progress: 75,
      color: 'from-green-500 to-emerald-600'
    },
    {
      id: 'social',
      name: '사회',
      icon: '👥',
      description: '인권, 노동환경, 지역사회',
      progress: 60,
      color: 'from-blue-500 to-cyan-600'
    },
    {
      id: 'governance',
      name: '거버넌스',
      icon: '🏛️',
      description: '윤리경영, 투명성, 리스크관리',
      progress: 85,
      color: 'from-purple-500 to-indigo-600'
    },
    {
      id: 'economic',
      name: '경제',
      icon: '💰',
      description: '경제적 영향, 공급망, 혁신',
      progress: 45,
      color: 'from-yellow-500 to-orange-600'
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

  const handleTopicClick = (topicId: string) => {
    console.log(`${topicId} 토픽 클릭됨`);
    // 여기에 각 토픽별 상세 페이지로 이동하는 로직 추가
  };

  const handleNewAssessment = () => {
    console.log('새로운 중대성 평가 시작');
    // 여기에 새로운 평가 시작 로직 추가
  };

  const handleViewReport = () => {
    console.log('보고서 보기');
    // 여기에 보고서 보기 로직 추가
  };

  const handleMediaSearch = () => {
    console.log('미디어 검색 시작', { selectedCompany, reportPeriod });
    // 여기에 미디어 검색 로직 추가
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

          {/* 중대성 토픽 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {materialityTopics.map((topic) => (
              <div
                key={topic.id}
                onClick={() => handleTopicClick(topic.id)}
                className="bg-white rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="text-center">
                  <div className="text-4xl mb-3">{topic.icon}</div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    {topic.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {topic.description}
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`bg-gradient-to-r ${topic.color} h-2 rounded-full transition-all duration-300`}
                      style={{ width: `${topic.progress}%` }}
                    ></div>
                  </div>
                  <div className="mt-2 text-sm font-medium text-gray-700">
                    {topic.progress}% 완료
                  </div>
                </div>
              </div>
            ))}
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
              <div className="text-3xl font-bold text-blue-600 mb-2">4</div>
              <div className="text-gray-600">평가 토픽</div>
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
