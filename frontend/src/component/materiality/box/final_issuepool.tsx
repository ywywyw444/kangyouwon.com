import React from 'react';

const FinalIssuepool: React.FC = () => {
  return (
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
  );
};

export default FinalIssuepool;
