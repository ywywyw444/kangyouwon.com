import React from 'react';

interface SurveyResultProps {
  excelData: any[];
}

const SurveyResult: React.FC<SurveyResultProps> = ({ excelData }) => {
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
};

export default SurveyResult;
