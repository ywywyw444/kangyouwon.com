// 저장된 중대성 평가 결과 불러오기 함수
export const loadAssessmentResult = (setAssessmentResult: any, setCompanyId: any, setCompanySearchTerm: any, setSearchPeriod: any) => {
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