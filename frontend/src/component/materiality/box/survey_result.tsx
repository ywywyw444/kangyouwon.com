import React from 'react';

interface SurveyResultProps {
  excelData: any[];
  surveyResult: any;
}

const SurveyResult: React.FC<SurveyResultProps> = ({ excelData, surveyResult }) => {
  // 설문 결과 통계 계산
  const calculateSurveyStats = () => {
    if (!surveyResult?.responses) return null;

    const allResponses = surveyResult.responses;
    const stats = {
      total: allResponses.length,
      environmental: allResponses.filter((item: any) => item.section === 'Environmental').length,
      social: allResponses.filter((item: any) => item.section === 'Social').length,
      governance: allResponses.filter((item: any) => item.section === 'Governance').length,
      averageOutsideScore: 0,
      averageInsideScore: 0,
      scoreDistribution: {
        outside: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<number, number>,
        inside: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<number, number>
      },
      topCategories: [] as any[]
    };

    // 점수 분포 및 평균 계산
    let totalOutsideScore = 0;
    let totalInsideScore = 0;
    let validOutsideScores = 0;
    let validInsideScores = 0;

    allResponses.forEach((item: any) => {
      if (item.outsideScore !== null) {
        stats.scoreDistribution.outside[item.outsideScore]++;
        totalOutsideScore += item.outsideScore;
        validOutsideScores++;
      }
      if (item.insideScore !== null) {
        stats.scoreDistribution.inside[item.insideScore]++;
        totalInsideScore += item.insideScore;
        validInsideScores++;
      }
    });

    stats.averageOutsideScore = validOutsideScores > 0 ? Math.round((totalOutsideScore / validOutsideScores) * 10) / 10 : 0;
    stats.averageInsideScore = validInsideScores > 0 ? Math.round((totalInsideScore / validInsideScores) * 10) / 10 : 0;

    // 상위 카테고리 (점수 합계 기준)
    const categoryScores = allResponses.map((item: any) => ({
      category: item.category,
      title: item.title,
      outsideScore: item.outsideScore || 0,
      insideScore: item.insideScore || 0,
      totalScore: (item.outsideScore || 0) + (item.insideScore || 0)
    }));

    stats.topCategories = categoryScores
      .sort((a: any, b: any) => b.totalScore - a.totalScore)
      .slice(0, 5);

    return stats;
  };

  const stats = calculateSurveyStats();

  // JSON 데이터 다운로드
  const downloadSurveyResult = () => {
    try {
      if (surveyResult) {
        const dataStr = JSON.stringify(surveyResult, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `survey_result_${surveyResult.company_id || 'company'}_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        alert('✅ 설문 결과가 JSON 파일로 다운로드되었습니다.');
      }
    } catch (error) {
      console.error('❌ JSON 다운로드 실패:', error);
      alert('❌ JSON 다운로드에 실패했습니다.');
    }
  };

  // JSON 데이터 클립보드 복사
  const copySurveyResult = async () => {
    try {
      if (surveyResult) {
        const dataStr = JSON.stringify(surveyResult, null, 2);
        await navigator.clipboard.writeText(dataStr);
        alert('✅ 설문 결과가 클립보드에 복사되었습니다.');
      }
    } catch (error) {
      console.error('❌ 클립보드 복사 실패:', error);
      alert('❌ 클립보드 복사에 실패했습니다.');
    }
  };

  if (!surveyResult) {
    return (
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
    );
  }

  return (
    <div id="survey-results" className="bg-white rounded-xl shadow-lg p-6 mb-12">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">
        📊 설문 결과 확인
      </h2>
      
      {stats && (
        <div className="space-y-6">
          {/* 기본 정보 */}
          <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-800 mb-4">📋 설문 기본 정보</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{surveyResult.company_id || 'N/A'}</div>
                <div className="text-sm text-blue-600">회사명</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{surveyResult.respondent_type || 'N/A'}</div>
                <div className="text-sm text-blue-600">응답자 유형</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{surveyResult.total_items || 0}</div>
                <div className="text-sm text-blue-600">총 설문 항목</div>
              </div>
            </div>
            <div className="mt-4 text-center text-sm text-blue-600">
              제출 시간: {new Date(surveyResult.timestamp).toLocaleString()}
            </div>
          </div>

          {/* ESG 분류별 통계 */}
          <div className="bg-green-50 rounded-lg p-6 border border-green-200">
            <h3 className="text-lg font-semibold text-green-800 mb-4">🌱 ESG 분류별 통계</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.environmental}</div>
                <div className="text-sm text-green-600">Environmental (환경)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.social}</div>
                <div className="text-sm text-green-600">Social (사회)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.governance}</div>
                <div className="text-sm text-green-600">Governance (지배구조)</div>
              </div>
            </div>
          </div>

          {/* 평균 점수 */}
          <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
            <h3 className="text-lg font-semibold text-purple-800 mb-4">📊 평균 점수</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">{stats.averageOutsideScore}</div>
                <div className="text-sm text-purple-600">기업 재무 중요도 (Outside-in)</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">{stats.averageInsideScore}</div>
                <div className="text-sm text-purple-600">환경/사회 중요도 (Inside-out)</div>
              </div>
            </div>
          </div>

          {/* 점수 분포 */}
          <div className="bg-orange-50 rounded-lg p-6 border border-orange-200">
            <h3 className="text-lg font-semibold text-orange-800 mb-4">📈 점수 분포</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Outside Score Distribution */}
              <div>
                <h4 className="text-md font-semibold text-orange-700 mb-3">기업 재무 중요도 (Outside-in)</h4>
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((score) => (
                    <div key={score} className="flex items-center">
                      <span className="w-8 text-sm text-orange-600">{score}점</span>
                      <div className="flex-1 mx-3 bg-orange-200 rounded-full h-2">
                        <div 
                          className="bg-orange-500 h-2 rounded-full" 
                          style={{ width: `${stats.scoreDistribution.outside[score] > 0 ? (stats.scoreDistribution.outside[score] / stats.total) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <span className="w-8 text-sm text-orange-600">{stats.scoreDistribution.outside[score]}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Inside Score Distribution */}
              <div>
                <h4 className="text-md font-semibold text-orange-700 mb-3">환경/사회 중요도 (Inside-out)</h4>
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((score) => (
                    <div key={score} className="flex items-center">
                      <span className="w-8 text-sm text-orange-600">{score}점</span>
                      <div className="flex-1 mx-3 bg-orange-200 rounded-full h-2">
                        <div 
                          className="bg-orange-500 h-2 rounded-full" 
                          style={{ width: `${stats.scoreDistribution.inside[score] > 0 ? (stats.scoreDistribution.inside[score] / stats.total) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <span className="w-8 text-sm text-orange-600">{stats.scoreDistribution.inside[score]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 상위 카테고리 */}
          <div className="bg-indigo-50 rounded-lg p-6 border border-indigo-200">
            <h3 className="text-lg font-semibold text-indigo-800 mb-4">🏆 상위 카테고리 (점수 합계 기준)</h3>
            <div className="space-y-3">
              {stats.topCategories.map((category, index) => (
                <div key={index} className="flex items-center justify-between bg-white p-3 rounded-lg border border-indigo-200">
                  <div className="flex items-center">
                    <span className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-bold mr-3">
                      {index + 1}
                    </span>
                    <div>
                      <div className="font-medium text-gray-900">{category.title}</div>
                      <div className="text-sm text-gray-600">{category.category}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-indigo-600">{category.totalScore}점</div>
                    <div className="text-sm text-gray-500">
                      Outside: {category.outsideScore} | Inside: {category.insideScore}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 액션 버튼들 */}
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">💾 데이터 내보내기</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={downloadSurveyResult}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
              >
                📥 JSON 파일 다운로드
              </button>
              <button
                onClick={copySurveyResult}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors duration-200"
              >
                📋 클립보드에 복사
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SurveyResult;
