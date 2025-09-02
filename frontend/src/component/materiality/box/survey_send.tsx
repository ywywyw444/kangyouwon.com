'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { normalizeSurveyKey } from '@/lib/surveyKey';
import { ExcelRow } from '@/store/excelDataStore';

type StoredSurvey = {
  id: string;
  contentHash?: string;
  timestamp: string; // ISO
  categoryCount: number;
  isActive: boolean;
};

type SurveyManagementProps = {
  companyId: string;     // ✅ 회사별로 주입
  excelData: ExcelRow[];
};

// ─────────────────────────────────────────────────────────────
// 회사별 LocalStorage 헬퍼
// ─────────────────────────────────────────────────────────────
const SURVEY_LIST_KEY = (companyId: string) => `surveyList_${companyId}`;
const SURVEY_SINGLE_KEY = (companyId: string) => `surveyData_${companyId}`;
const SELECTED_ID_KEY = (companyId: string) => `selectedSurveyId:${companyId}`; // 회사별
const LEGACY_SELECTED_ID_KEY = `selectedSurveyId`; // 하위 호환(전역 키)

const getSurveyList = (companyId: string): StoredSurvey[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SURVEY_LIST_KEY(companyId));
    return raw ? (JSON.parse(raw) as StoredSurvey[]) : [];
  } catch {
    return [];
  }
};

const setSelectedId = (companyId: string, surveyId: string) => {
  if (typeof window === 'undefined') return;
  // 회사별 키에 저장
  localStorage.setItem(SELECTED_ID_KEY(companyId), surveyId);
  // 하위 호환: 기존 전역 키도 함께 갱신(다른 화면이 아직 전역 키를 읽을 수 있으므로)
  localStorage.setItem(LEGACY_SELECTED_ID_KEY, surveyId);
};

const getSelectedId = (companyId: string): string | null => {
  if (typeof window === 'undefined') return null;
  // 회사별 키 우선
  const byCompany = localStorage.getItem(SELECTED_ID_KEY(companyId));
  if (byCompany) return byCompany;
  // 하위 호환: 전역 키
  const legacy = localStorage.getItem(LEGACY_SELECTED_ID_KEY);
  return legacy || null;
};

const SurveyManagement: React.FC<SurveyManagementProps> = ({ companyId, excelData }) => {
  const [sendMethod, setSendMethod] = useState('email');
  const [sendSchedule, setSendSchedule] = useState('immediate');
  const [deadline, setDeadline] = useState('');

  const [surveyUrl, setSurveyUrl] = useState('');
  const [selectedSurveyId, setSelectedSurveyId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sendStatus, setSendStatus] = useState({ total: 0, sent: 0, responded: 0, responseRate: 0 });

  // 유효 이메일 계산
  const validEmails = useMemo(
    () =>
      (excelData || [])
        .map((r) => r.email?.trim())
        .filter((e): e is string => !!e && e.includes('@')),
    [excelData]
  );

  // total 업데이트
  useEffect(() => {
    setSendStatus((p) => ({ ...p, total: validEmails.length }));
  }, [validEmails]);

  // 초기 복원: 회사별 selectedSurveyId → 없으면 리스트/단건 → 마지막으로 전역키 fallback
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const applySelected = (sid: string) => {
      const url = `${window.location.origin}/survey?id=${sid}`;
      setSelectedSurveyId(sid);
      setSurveyUrl(url);
      setSelectedId(companyId, sid); // 회사별+전역키 동기화
    };

    // 1) 회사별 선택 키
    const selected = getSelectedId(companyId);
    if (selected) {
      applySelected(selected);
      return;
    }

    // 2) 리스트 기반(최신/활성 우선)
    const list = getSurveyList(companyId);
    if (list.length > 0) {
      applySelected(list.find((s) => s.isActive)?.id || list[0].id);
      return;
    }

    // 3) 단건(하위 호환)
    const singleRaw = localStorage.getItem(SURVEY_SINGLE_KEY(companyId));
    if (singleRaw) {
      try {
        const data = JSON.parse(singleRaw);
        if (data?.surveyId) {
          applySelected(data.surveyId);
          return;
        }
      } catch {}
    }

    // 4) 전역 선택 키(최후 fallback)
    const legacy = localStorage.getItem(LEGACY_SELECTED_ID_KEY);
    if (legacy) applySelected(legacy);
  }, [companyId]);

  // 외부 탭/화면에서 선택 변경될 수 있으니 주기적 동기화
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const tick = () => {
      const sid = getSelectedId(companyId);
      if (!sid) return;
      const url = `${window.location.origin}/survey?id=${sid}`;
      if (sid !== selectedSurveyId) setSelectedSurveyId(sid);
      if (url !== surveyUrl) setSurveyUrl(url);
    };
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [companyId, selectedSurveyId, surveyUrl]);

  // 응답률 계산
  useEffect(() => {
    const responseRate =
      sendStatus.total > 0 ? Math.round((sendStatus.responded / sendStatus.total) * 100) : 0;
    setSendStatus((p) => ({ ...p, responseRate }));
  }, [sendStatus.responded, sendStatus.total]);

  // 메일 본문 템플릿(개인화된 형태)
  const emailBodyPreview = useMemo(() => {
    const deadlineText = deadline
      ? new Date(deadline).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
      : '미정';
    return [
      '{이름}님께,',
      '',
      '안녕하세요. ESG 중대성 평가 설문에 참여 부탁드립니다.',
      '',
      `• 설문 링크: ${surveyUrl || '(미선택)'}`,
      `• 응답 마감: ${deadlineText}`,
      '',
      '※ 같은 이메일 주소로는 1회만 응답 가능합니다.',
      '바쁘시겠지만 소중한 의견 부탁드립니다. 감사합니다.',
    ].join('\n');
  }, [deadline, surveyUrl]);

  const isSendReady = !!surveyUrl && validEmails.length > 0;

  // 이메일 발송
  const handleSendEmails = async () => {
    if (!isSendReady) {
      alert('❌ 발송 조건이 충족되지 않았습니다.\n\n설문 링크/대상 이메일을 확인하세요.');
      return;
    }
    setIsLoading(true);
    try {
      // 개인화된 메일 본문 생성
      const personalizedEmails = validEmails.map(email => {
        const recipient = excelData.find(row => row.email === email);
        const recipientName = recipient?.name || '담당자';
        const personalizedBody = emailBodyPreview.replace('{이름}', recipientName);
        
        return {
          email: email,
          name: recipientName,
          body: personalizedBody
        };
      });

      const payload = {
        to_emails: validEmails,
        survey_url: surveyUrl,      // ✅ 선택된 버전 링크
        survey_title: '중대성 평가 설문',
        deadline: deadline || null,
        personalized_emails: personalizedEmails,  // 개인화된 이메일 데이터
        company_id: companyId,      // (선택) 서버 로깅/템플릿 분기용
      };

      const resp = await fetch('/api/v1/materiality-service/email/send-survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(`이메일 발송 실패: ${resp.status} ${resp.statusText}\n${err.message || ''}`);
      }

      const result = await resp.json();
      if (!result.success) throw new Error(result.message || '이메일 발송에 실패했습니다.');

      setSendStatus((p) => ({ ...p, sent: validEmails.length }));
      alert(
        `✅ 이메일 발송 완료!\n\n📧 ${validEmails.length}명에게 설문 링크가 발송되었습니다.\n\n📋 설문 URL:\n${surveyUrl}\n\n${result.message || ''}`
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다';
      alert(`❌ 이메일 발송에 실패했습니다.\n\n오류: ${msg}`);
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // 응답 현황 확인
  const checkSurveyResponses = async () => {
    if (!surveyUrl) {
      alert('❌ 설문 링크가 선택되지 않았습니다.');
      return;
    }
    try {
      const rawSurveyId = surveyUrl.split('id=')[1];
      if (!rawSurveyId) throw new Error('설문 ID를 찾을 수 없습니다.');
      const surveyId = normalizeSurveyKey(rawSurveyId);

      const response = await fetch(
        `/api/v1/materiality-service/surveys/${encodeURIComponent(surveyId)}/responses`
      );
      if (!response.ok) throw new Error(`응답 현황 조회 실패: ${response.status}`);

      const data = await response.json();
      const responseCount = Array.isArray(data.responses) ? data.responses.length : 0;
      setSendStatus((p) => ({ ...p, responded: responseCount }));

      alert(
        `📊 설문 응답 현황\n\n• 총 발송: ${sendStatus.sent}명\n• 응답 완료: ${responseCount}명\n• 응답률: ${
          sendStatus.total > 0 ? Math.round((responseCount / sendStatus.total) * 100) : 0
        }%`
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다';
      alert(`❌ 응답 현황 조회 실패\n\n오류: ${msg}`);
      console.error(e);
    }
  };

  // 설문 버전 선택 UI(회사별 리스트 ≤ 3개, 없으면 단건 키 fallback)
  const renderSurveyVersionPicker = () => {
    if (typeof window === 'undefined') {
      return <div className="text-sm text-blue-600 text-center py-4">먼저 "설문 생성하기"에서 설문을 생성해주세요.</div>;
    }

    let list = getSurveyList(companyId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 3);

    if (list.length === 0) {
      const raw = localStorage.getItem(SURVEY_SINGLE_KEY(companyId));
      if (raw) {
        try {
          const d = JSON.parse(raw);
          if (d?.surveyId) {
            list = [
              {
                id: d.surveyId,
                contentHash: d.contentHash,
                timestamp: d.timestamp,
                categoryCount: d.categoryCount || 0,
                isActive: true,
              },
            ];
          }
        } catch {}
      }
    }

    if (list.length === 0) {
      return <div className="text-sm text-blue-600 text-center py-4">먼저 "설문 생성하기"에서 설문을 생성해주세요.</div>;
    }

    return (
      <div className="space-y-2">
        {list.map((survey) => {
          const url = `${window.location.origin}/survey?id=${survey.id}`;
          const isSelected = surveyUrl === url;
          return (
            <div
              key={survey.id}
              onClick={() => {
                setSelectedSurveyId(survey.id);
                setSurveyUrl(url);
                setSelectedId(companyId, survey.id); // ✅ 회사별 선택 반영(+전역키 동기화)
              }}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                isSelected ? 'bg-blue-100 border-blue-300' : 'bg-white border-gray-200 hover:bg-blue-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <input type="radio" checked={isSelected} onChange={() => {}} className="text-blue-600" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{survey.categoryCount}개 문항</div>
                    <div className="text-xs text-gray-500">
                      {new Date(survey.timestamp).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                    v{survey.contentHash?.substring(0, 4) || '0000'}
                  </span>
                  {survey.isActive && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">활성</span>
                  )}
                </div>
              </div>
              <div className="mt-2 font-mono text-[11px] text-gray-600 break-all">{url}</div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div id="survey-send" className="bg-white rounded-xl shadow-lg p-6 mb-12">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">📝 설문 발송</h2>

      <div className="grid grid-cols-1 gap-8">
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
            {/* 설정 카드 */}
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <h4 className="font-semibold text-gray-900 mb-2">📧 발송 설정</h4>
              <div className="space-y-3">


                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">발송 방식</label>
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
                  <label className="block text-sm font-semibold text-gray-800 mb-1">발송 일정</label>
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
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">응답 마감일</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                  />
                </div>

                {/* 설문 버전 선택 */}
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    설문 버전 선택
                  </h4>
                  {renderSurveyVersionPicker()}
                </div>

                {/* 선택된 설문 URL */}
                {surveyUrl && (
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="text-xs text-gray-600">
                      <div className="font-medium mb-1">선택된 설문 URL:</div>
                      <div className="font-mono bg-white p-2 rounded border border-gray-300 break-all">{surveyUrl}</div>
                    </div>
                  </div>
                )}

                {/* 업로드된 이메일 정보 */}
                <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                  <label className="block text-sm font-semibold text-purple-900 mb-1">📧 발송 대상 이메일</label>
                  {validEmails.length > 0 ? (
                    <div className="text-xs text-purple-600">
                      총 {validEmails.length}개의 유효한 이메일이 준비되었습니다.
                      {excelData.slice(0, 3).map((row, i) => (
                        <div key={i} className="mt-1">• {row.company || '회사명 없음'}: {row.email || '이메일 없음'}</div>
                      ))}
                      {validEmails.length > 3 && (
                        <div className="mt-1 text-purple-500">... 외 {validEmails.length - 3}개 더</div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-yellow-600">엑셀에서 유효 이메일을 업로드/확인하세요.</div>
                  )}
                </div>

                {/* 메일 본문 미리보기 */}
                <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                  <label className="block text-sm font-semibold text-amber-900 mb-1">✉️ 메일 본문 미리보기</label>
                  <textarea readOnly value={emailBodyPreview} className="w-full h-40 text-xs font-mono bg-white border border-amber-200 rounded p-2" />
                </div>
              </div>
            </div>

            {/* 현황 카드 */}
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <h4 className="font-medium text-gray-800 mb-2">📊 발송 현황</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p>• 대상 이메일: {sendStatus.total}개</p>
                <p>• 발송 완료: {sendStatus.sent}개</p>
                <p>• 응답 완료: {sendStatus.responded}개</p>
                <p>• 응답률: {sendStatus.responseRate}%</p>
              </div>

              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>응답률</span>
                  <span>{sendStatus.responseRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full transition-all duration-300" style={{ width: `${sendStatus.responseRate}%` }} />
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="text-xs text-gray-500 space-y-1">
                  <div className="flex items-center">
                    <span className={`w-2 h-2 rounded-full mr-2 ${surveyUrl ? 'bg-green-500' : 'bg-red-500'}`} />
                    설문 링크: {surveyUrl ? '준비 완료' : '미선택'}
                  </div>
                  <div className="flex items-center">
                    <span className={`w-2 h-2 rounded-full mr-2 ${sendStatus.total > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
                    이메일 목록: {sendStatus.total > 0 ? `${sendStatus.total}개 준비 완료` : '미업로드'}
                  </div>

                </div>
              </div>
            </div>

            {/* 액션 버튼 */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleSendEmails}
                disabled={isLoading || !isSendReady}
                className={`flex-1 font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center ${
                  isLoading || !isSendReady ? 'bg-gray-400 text-gray-200 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
                title={
                  isLoading
                    ? '발송 중입니다...'
                    : isSendReady
                    ? '선택된 버전 링크로 개인화된 이메일을 발송합니다'
                    : '설문 링크/이메일 목록을 준비하세요'
                }
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
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
                  !surveyUrl ? 'bg-gray-400 text-gray-200 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                응답 현황 확인
              </button>
            </div>

            {/* 준비 체크 표시 */}
            {!isSendReady && (
              <div className="mt-1 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">
                📋 발송 준비 체크: {surveyUrl ? '링크✅ ' : '링크❌ '} /{' '}
                {validEmails.length > 0 ? `이메일✅(${validEmails.length})` : '이메일❌'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SurveyManagement;
