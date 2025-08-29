import React from 'react';

interface SurveyManagementProps {
  excelData: any[];
}

const SurveyManagement: React.FC<SurveyManagementProps> = ({ excelData }) => {
  return (
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
                <p>• 대상 기업: {excelData.length}개</p>
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
                <p>• 대상 기업: {excelData.length}개</p>
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
  );
};

export default SurveyManagement;
