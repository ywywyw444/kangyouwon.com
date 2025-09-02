import React, { useState, useEffect } from 'react';

interface ExcelRow {
  email: string;
  company?: string;
  name?: string;
  position?: string;
  stakeholderType?: string;
}

interface SurveyManagementProps {
  excelData: ExcelRow[];
}

const SurveyManagement: React.FC<SurveyManagementProps> = ({ excelData }) => {
  const [sendMethod, setSendMethod] = useState<string>('email');
  const [sendSchedule, setSendSchedule] = useState<string>('immediate');
  const [deadline, setDeadline] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [surveyUrl, setSurveyUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [sendStatus, setSendStatus] = useState<{
    total: number;
    sent: number;
    responded: number;
    responseRate: number;
  }>({
    total: 0,
    sent: 0,
    responded: 0,
    responseRate: 0
  });

  // excelData가 변경될 때마다 total 업데이트
  useEffect(() => {
    const validEmails = excelData.filter(row => row.email && row.email.trim() !== '' && row.email.includes('@'));
    setSendStatus(prev => ({ ...prev, total: validEmails.length }));
  }, [excelData]);

  // 선택된 설문 URL 확인 및 업데이트
  useEffect(() => {
    const checkSelectedSurvey = () => {
      // 선택된 설문 ID 확인
      const selectedSurveyId = localStorage.getItem('selectedSurveyId');
      if (selectedSurveyId) {
        const newUrl = `${window.location.origin}/survey?id=${selectedSurveyId}`;
        if (newUrl !== surveyUrl) {
          console.log('📝 선택된 설문 URL 업데이트:', newUrl);
          setSurveyUrl(newUrl);
        }
      } else {
        // 선택된 설문이 없으면 가장 최근 설문 확인
        const surveyData = localStorage.getItem('surveyData_1');
        if (surveyData) {
          try {
            const parsed = JSON.parse(surveyData);
            if (parsed.surveyId) {
              const newUrl = `${window.location.origin}/survey?id=${parsed.surveyId}`;
              if (newUrl !== surveyUrl) {
                console.log('📝 최근 설문 URL 업데이트:', newUrl);
                setSurveyUrl(newUrl);
                // 이 설문을 선택된 설문으로 설정
                localStorage.setItem('selectedSurveyId', parsed.surveyId);
              }
            }
          } catch (error) {
            console.warn('설문 데이터 파싱 실패:', error);
          }
        }
      }
    };

    // 초기 확인
    checkSelectedSurvey();

    // 1초마다 확인 (더 빠른 응답성을 위해)
    const intervalId = setInterval(checkSelectedSurvey, 1000);

    // 컴포넌트 언마운트 시 인터벌 정리
    return () => clearInterval(intervalId);
  }, [surveyUrl]); // surveyUrl을 의존성 배열에 추가하여 변경 감지

  // 응답률 계산
  useEffect(() => {
    const responseRate = sendStatus.total > 0 ? Math.round((sendStatus.responded / sendStatus.total) * 100) : 0;
    setSendStatus(prev => ({ ...prev, responseRate }));
  }, [sendStatus.responded, sendStatus.total]);

  // 이메일 발송 함수
  const handleSendEmails = async () => {
    // 1. 설문 URL 확인
    if (!surveyUrl) {
      alert('❌ 설문이 생성되지 않았습니다.\n\n먼저 "설문 생성하기" 버튼을 눌러 설문을 생성해주세요.');
      return;
    }

    // 2. 회사명 확인
    if (!companyName.trim()) {
      alert('❌ 회사명을 입력해주세요.');
      return;
    }

    // 3. 업로드된 이메일 데이터 확인
    if (excelData.length === 0) {
      alert('❌ 발송할 이메일 주소가 없습니다.\n\n"설문 대상 업로드"에서 엑셀 파일을 업로드해주세요.');
      return;
    }

    // 4. 이메일 주소 추출 및 검증
    const emailList = excelData
      .map(row => row.email)
      .filter(email => email && email.trim() !== '' && email.includes('@'));

    if (emailList.length === 0) {
      alert('❌ 유효한 이메일 주소가 없습니다.\n\n엑셀 파일에 올바른 이메일 주소를 확인해주세요.');
      return;
    }

    // 5. 발송 확인
    const confirmMessage = `📧 이메일 발송을 진행하시겠습니까?\n\n• 회사명: ${companyName}\n• 발송 대상: ${emailList.length}명\n• 설문 URL: ${surveyUrl}\n\n발송 후에는 취소할 수 없습니다.`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    setIsLoading(true);

    try {
      console.log('📧 이메일 발송 시작:', {
        companyName,
        emailCount: emailList.length,
        surveyUrl,
        emailList: emailList.slice(0, 3) // 처음 3개만 로그에 표시
      });

      // Gmail API를 통한 이메일 발송
      const response = await fetch('/api/v1/materiality-service/email/send-survey', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to_emails: emailList,
          survey_url: surveyUrl,
          company_name: companyName,
          survey_title: '중대성 평가 설문'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`이메일 발송 실패: ${response.status} ${response.statusText}\n${errorData.message || ''}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setSendStatus(prev => ({ ...prev, sent: emailList.length }));
        alert(`✅ 이메일 발송 완료!\n\n📧 ${emailList.length}명에게 설문 링크가 발송되었습니다.\n\n📋 발송된 설문 URL:\n${surveyUrl}\n\n${result.message || ''}`);
      } else {
        throw new Error(result.message || '이메일 발송에 실패했습니다.');
      }

    } catch (error) {
      console.error('이메일 발송 오류:', error);
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다';
      alert(`❌ 이메일 발송에 실패했습니다.\n\n오류: ${errorMessage}\n\n다시 시도해주세요.`);
    } finally {
      setIsLoading(false);
    }
  };

  // 설문 응답 현황 확인 함수
  const checkSurveyResponses = async () => {
    if (!surveyUrl) {
      alert('❌ 설문이 생성되지 않았습니다.');
      return;
    }

    try {
      // 설문 ID 추출
      const surveyId = surveyUrl.split('id=')[1];
      if (!surveyId) {
        throw new Error('설문 ID를 찾을 수 없습니다.');
      }

      // 설문 응답 현황 조회
      const response = await fetch(`/api/v1/materiality-service/surveys/${surveyId}/responses`);
      
      if (!response.ok) {
        throw new Error(`응답 현황 조회 실패: ${response.status}`);
      }

      const data = await response.json();
      const responseCount = data.responses ? data.responses.length : 0;
      
      setSendStatus(prev => ({ ...prev, responded: responseCount }));
      
      alert(`📊 설문 응답 현황\n\n• 총 발송: ${sendStatus.sent}명\n• 응답 완료: ${responseCount}명\n• 응답률: ${Math.round((responseCount / sendStatus.total) * 100)}%`);

    } catch (error) {
      console.error('응답 현황 조회 오류:', error);
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다';
      alert(`❌ 응답 현황 조회에 실패했습니다.\n\n오류: ${errorMessage}`);
    }
  };
  return (
    <div id="survey-send" className="bg-white rounded-xl shadow-lg p-6 mb-12">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">
        📝 설문 발송
      </h2>
      
      <div className="grid grid-cols-1 gap-8">

        
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">회사명</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="회사명을 입력하세요"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">발송 방식</label>
                  <select 
                    value={sendMethod}
                    onChange={(e) => setSendMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                  >
                    <option value="email">이메일 발송</option>
                    <option value="sms">SMS 발송</option>
                    <option value="link">링크 공유</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">발송 일정</label>
                  <select 
                    value={sendSchedule}
                    onChange={(e) => setSendSchedule(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                  >
                    <option value="immediate">즉시 발송</option>
                    <option value="scheduled">예약 발송</option>
                    <option value="staged">단계별 발송</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">응답 마감일</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                  />
                </div>

                {/* 설문 URL 표시 */}
                <div className={`rounded-lg p-3 border ${surveyUrl ? 'bg-blue-50 border-blue-200' : 'bg-yellow-50 border-yellow-200'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <label className={`block text-sm font-medium ${surveyUrl ? 'text-blue-800' : 'text-yellow-800'}`}>
                      {surveyUrl ? '✅ 설문 링크 생성됨' : '⚠️ 설문 링크 없음'}
                    </label>
                    {surveyUrl && (
                      <button
                        onClick={() => {
                          if (confirm('❗ 이 설문을 삭제하시겠습니까?\n\n삭제된 설문은 복구할 수 없습니다.')) {
                            // localStorage에서 설문 데이터 삭제
                            const selectedSurveyId = localStorage.getItem('selectedSurveyId');
                            if (selectedSurveyId) {
                              // 설문 데이터 삭제
                              localStorage.removeItem(`surveyData_${selectedSurveyId}`);
                              localStorage.removeItem('selectedSurveyId');
                              
                              // 설문 URL 초기화
                              setSurveyUrl('');
                              
                              console.log('🗑️ 설문 삭제 완료:', selectedSurveyId);
                              alert('✅ 설문이 삭제되었습니다.');
                            }
                          }
                        }}
                        className="text-xs px-2 py-1 bg-red-100 hover:bg-red-200 text-red-600 rounded transition-colors duration-200 flex items-center"
                        title="이 설문을 삭제합니다"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        삭제
                      </button>
                    )}
                  </div>
                  {surveyUrl ? (
                    <div className="text-xs text-blue-600 break-all">
                      {surveyUrl}
                    </div>
                  ) : (
                    <div className="text-xs text-yellow-600">
                      먼저 "설문 생성하기"에서 설문을 생성해주세요.
                    </div>
                  )}
                </div>

                {/* 업로드된 이메일 정보 표시 */}
                <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                  <label className="block text-sm font-medium text-purple-800 mb-1">📧 발송 대상 이메일</label>
                  {excelData.length > 0 ? (
                    <div className="text-xs text-purple-600">
                      총 {excelData.length}개 기업의 이메일 주소가 업로드되었습니다.
                      {excelData.slice(0, 3).map((row, index) => (
                        <div key={index} className="mt-1">
                          • {row.company || '회사명 없음'}: {row.email || '이메일 없음'}
                        </div>
                      ))}
                      {excelData.length > 3 && (
                        <div className="mt-1 text-purple-500">
                          ... 외 {excelData.length - 3}개 더
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-yellow-600">
                      "설문 대상 업로드"에서 엑셀 파일을 업로드해주세요.
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <h4 className="font-medium text-gray-800 mb-2">📊 발송 현황</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p>• 대상 기업: {sendStatus.total}개</p>
                <p>• 발송 완료: {sendStatus.sent}개</p>
                <p>• 응답 완료: {sendStatus.responded}개</p>
                <p>• 응답률: {sendStatus.responseRate}%</p>
              </div>
              
              {/* 응답률 시각화 */}
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>응답률</span>
                  <span>{sendStatus.responseRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${sendStatus.responseRate}%` }}
                  ></div>
                </div>
              </div>

              {/* 발송 준비 상태 표시 */}
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="text-xs text-gray-500 space-y-1">
                  <div className="flex items-center">
                    <span className={`w-2 h-2 rounded-full mr-2 ${surveyUrl ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    설문 링크: {surveyUrl ? '준비 완료' : '미생성'}
                  </div>
                  <div className="flex items-center">
                    <span className={`w-2 h-2 rounded-full mr-2 ${sendStatus.total > 0 ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    이메일 목록: {sendStatus.total > 0 ? `${sendStatus.total}개 준비 완료` : '미업로드'}
                  </div>
                  <div className="flex items-center">
                    <span className={`w-2 h-2 rounded-full mr-2 ${companyName.trim() ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    회사명: {companyName.trim() ? '입력 완료' : '미입력'}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3">
              {/* 발송 준비 상태 요약 */}
              <div className="flex-1 bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="text-xs text-gray-600 space-y-1">
                  <div className="font-medium text-gray-700 mb-2">📋 발송 준비 체크리스트:</div>
                  <div className={`flex items-center ${surveyUrl ? 'text-green-600' : 'text-red-600'}`}>
                    <span className={`w-2 h-2 rounded-full mr-2 ${surveyUrl ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    설문 링크: {surveyUrl ? '✅ 생성됨' : '❌ 미생성'}
                  </div>
                  <div className={`flex items-center ${companyName.trim() ? 'text-green-600' : 'text-red-600'}`}>
                    <span className={`w-2 h-2 rounded-full mr-2 ${companyName.trim() ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    회사명: {companyName.trim() ? '✅ 입력 완료' : '❌ 미입력'}
                  </div>
                  <div className={`flex items-center ${sendStatus.total > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <span className={`w-2 h-2 rounded-full mr-2 ${sendStatus.total > 0 ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    이메일 목록: {sendStatus.total > 0 ? `✅ ${sendStatus.total}개 준비 완료` : '❌ 미업로드'}
                  </div>
                </div>
              </div>
              
              <button
                onClick={handleSendEmails}
                disabled={isLoading || !surveyUrl || !companyName.trim() || sendStatus.total === 0}
                className={`flex-1 font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center ${
                  isLoading || !surveyUrl || !companyName.trim() || sendStatus.total === 0
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
                title={
                  isLoading ? '발송 중입니다...' :
                  !surveyUrl ? '설문을 먼저 생성해주세요' :
                  !companyName.trim() ? '회사명을 입력해주세요' :
                  sendStatus.total === 0 ? '이메일 목록을 업로드해주세요' :
                  '모든 준비가 완료되었습니다'
                }
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    발송 중...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    설문 발송하기
                  </>
                )}
                              </button>
              
              <button
                onClick={checkSurveyResponses}
                disabled={!surveyUrl}
                className={`flex-1 font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center ${
                  !surveyUrl
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                응답 현황 확인
              </button>
            </div>
            
            {/* 발송 준비 안내 메시지 */}
            {(!surveyUrl || !companyName.trim() || sendStatus.total === 0) && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div className="text-sm text-yellow-800">
                    <div className="font-medium mb-2">📋 설문 발송을 위해 다음 단계를 완료해주세요:</div>
                    <ul className="space-y-1 text-xs">
                      {!surveyUrl && (
                        <li className="flex items-center">
                          <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                          <strong>1단계:</strong> "설문 생성하기"에서 설문을 생성하여 설문 링크를 만드세요
                        </li>
                      )}
                      {!companyName.trim() && (
                        <li className="flex items-center">
                          <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                          <strong>2단계:</strong> 위의 "회사명" 필드에 회사명을 입력하세요
                        </li>
                      )}
                      {sendStatus.total === 0 && (
                        <li className="flex items-center">
                          <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                          <strong>3단계:</strong> "설문 대상 업로드"에서 엑셀 파일을 업로드하세요
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SurveyManagement;
