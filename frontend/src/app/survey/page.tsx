'use client';

import React, { useState, useEffect } from 'react';

interface SurveyData {
  company_id: string;
  categories: Array<{
    question_number: number;
    rank: number;
    category: string;
    selected_base_issue_pool: string;
    esg_classification: string;
    final_score: number;
  }>;
}

interface SurveyResponse {
  question_number: number;
  category: string;
  selected_base_issue_pool: string;
  esg_classification: string;
  outsideScore: number | null;
  insideScore: number | null;
  section: string;
  title: string;
}

const SurveyPage: React.FC = () => {
  const [surveyData, setSurveyData] = useState<SurveyData | null>(null);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [participantInfo, setParticipantInfo] = useState({
    name: '',
    company: '',
    position: '',
    email: ''
  });

  useEffect(() => {
    // Get survey ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const surveyId = urlParams.get('id');
    
    // Load survey data from localStorage
    const dataKey = surveyId ? `surveyData_${surveyId}` : 'surveyData';
    const savedSurveyData = localStorage.getItem(dataKey);
    
    if (savedSurveyData) {
      try {
        const data = JSON.parse(savedSurveyData);
        setSurveyData(data);
        
        // Initialize responses
        const initialResponses = data.categories.map((cat: any) => ({
          question_number: cat.question_number,
          category: cat.category,
          selected_base_issue_pool: cat.selected_base_issue_pool,
          esg_classification: cat.esg_classification,
          outsideScore: null,
          insideScore: null,
          section: cat.esg_classification,
          title: cat.selected_base_issue_pool
        }));
        setResponses(initialResponses);
      } catch (error) {
        console.error('Error loading survey data:', error);
        alert('설문 데이터를 불러오는데 실패했습니다.');
      }
    } else {
      alert('설문 데이터가 없습니다. 먼저 설문을 생성해주세요.');
    }
  }, []);

  const handleScoreChange = (questionNumber: number, scoreType: 'outside' | 'inside', value: number) => {
    setResponses(prev => prev.map(response => 
      response.question_number === questionNumber 
        ? { ...response, [`${scoreType}Score`]: value }
        : response
    ));
  };

  const handleSubmit = async () => {
    // Validate participant info
    if (!participantInfo.name || !participantInfo.company || !participantInfo.position || !participantInfo.email) {
      alert('참여자 정보를 모두 입력해주세요.');
      return;
    }

    // Validate responses
    const incompleteResponses = responses.filter(r => r.outsideScore === null || r.insideScore === null);
    if (incompleteResponses.length > 0) {
      alert('모든 질문에 답변해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create response data
      const responseData = {
        participant: participantInfo,
        responses: responses,
        timestamp: new Date().toISOString(),
        survey_id: surveyData?.company_id || 'unknown'
      };

      // Get existing responses
      const existingResponses = JSON.parse(localStorage.getItem('surveyResponses') || '[]');
      
      // Add new response
      const updatedResponses = [...existingResponses, responseData];
      
      // Save to localStorage
      localStorage.setItem('surveyResponses', JSON.stringify(updatedResponses));
      
      // Also save to surveyResult for immediate display
      const surveyResult = {
        responses: updatedResponses.flatMap(r => r.responses),
        total_responses: updatedResponses.length,
        last_updated: new Date().toISOString()
      };
      localStorage.setItem('surveyResult', JSON.stringify(surveyResult));

      setIsSubmitted(true);
      alert('✅ 설문 응답이 성공적으로 제출되었습니다!');
      
    } catch (error) {
      console.error('Error submitting survey:', error);
      alert('설문 제출 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!surveyData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📋</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">설문 데이터 로딩 중...</h1>
          <p className="text-gray-600">잠시만 기다려주세요.</p>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-xl shadow-lg">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-green-600 mb-2">설문 완료!</h1>
          <p className="text-gray-600 mb-4">소중한 의견을 주셔서 감사합니다.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            새로 응답하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">중대성 평가 설문</h1>
          <p className="text-gray-600">각 항목에 대해 기업 재무 중요도(Outside-in)와 환경/사회 중요도(Inside-out)를 평가해주세요.</p>
        </div>

        {/* Participant Info */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">참여자 정보</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">이름 *</label>
              <input
                type="text"
                value={participantInfo.name}
                onChange={(e) => setParticipantInfo(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="이름을 입력하세요"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">회사 *</label>
              <input
                type="text"
                value={participantInfo.company}
                onChange={(e) => setParticipantInfo(prev => ({ ...prev, company: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="회사명을 입력하세요"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">직책 *</label>
              <input
                type="text"
                value={participantInfo.position}
                onChange={(e) => setParticipantInfo(prev => ({ ...prev, position: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="직책을 입력하세요"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">이메일 *</label>
              <input
                type="email"
                value={participantInfo.email}
                onChange={(e) => setParticipantInfo(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="이메일을 입력하세요"
              />
            </div>
          </div>
        </div>

        {/* Survey Questions */}
        <div className="space-y-6">
          {responses.map((response, index) => (
            <div key={response.question_number} className="bg-white rounded-xl shadow-lg p-6">
              <div className="mb-4">
                <div className="flex items-center mb-2">
                  <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-sm font-semibold mr-3">
                    Q{response.question_number}
                  </span>
                  <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                    {response.esg_classification}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">{response.category}</h3>
                <p className="text-gray-600">{response.selected_base_issue_pool}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Outside Score */}
                <div>
                  <h4 className="text-md font-semibold text-gray-700 mb-3">기업 재무 중요도 (Outside-in)</h4>
                  <p className="text-sm text-gray-500 mb-3">해당 이슈가 기업의 재무 성과에 미치는 영향</p>
                  <div className="flex space-x-2">
                    {[1, 2, 3, 4, 5].map((score) => (
                      <button
                        key={score}
                        onClick={() => handleScoreChange(response.question_number, 'outside', score)}
                        className={`w-12 h-12 rounded-lg border-2 transition-all ${
                          response.outsideScore === score
                            ? 'bg-blue-500 border-blue-500 text-white'
                            : 'bg-white border-gray-300 text-gray-700 hover:border-blue-300'
                        }`}
                      >
                        {score}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>매우 낮음</span>
                    <span>매우 높음</span>
                  </div>
                </div>

                {/* Inside Score */}
                <div>
                  <h4 className="text-md font-semibold text-gray-700 mb-3">환경/사회 중요도 (Inside-out)</h4>
                  <p className="text-sm text-gray-500 mb-3">해당 이슈가 환경/사회에 미치는 영향</p>
                  <div className="flex space-x-2">
                    {[1, 2, 3, 4, 5].map((score) => (
                      <button
                        key={score}
                        onClick={() => handleScoreChange(response.question_number, 'inside', score)}
                        className={`w-12 h-12 rounded-lg border-2 transition-all ${
                          response.insideScore === score
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'bg-white border-gray-300 text-gray-700 hover:border-green-300'
                        }`}
                      >
                        {score}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>매우 낮음</span>
                    <span>매우 높음</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Submit Button */}
        <div className="mt-8 text-center">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`px-8 py-4 text-lg font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl ${
              isSubmitting
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isSubmitting ? '제출 중...' : '설문 제출하기'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SurveyPage;
