import { getESGClassification } from './get_esg_classification';

// 새로운 카테고리 추가 함수
export const addNewCategory = (
  selectedNewCategory: any, 
  newBaseIssuePool: any, 
  newCategoryRank: any, 
  assessmentResult: any, 
  setAssessmentResult: any, 
  setIsAddCategoryModalOpen: any, 
  setSelectedNewCategory: any, 
  setNewCategoryRank: any, 
  setNewBaseIssuePool: any, 
  setIsCustomBaseIssuePool: any, 
  setCustomBaseIssuePoolText: any,
  allCategories: any[] // 전체 카테고리 목록 추가
) => {
  if (!selectedNewCategory || !newBaseIssuePool) {
    alert('카테고리와 base issue pool을 모두 선택/입력해주세요.');
    return;
  }

  try {
    // 선택된 카테고리의 정보 찾기
    const selectedCategoryInfo = allCategories.find(cat => cat.name === selectedNewCategory);
    
    // ESG 분류 결정 (카테고리 정보에서 가져오거나 기존 함수 사용)
    let esgClassification = '미분류';
    if (selectedCategoryInfo && selectedCategoryInfo.esg_classification) {
      esgClassification = selectedCategoryInfo.esg_classification;
    } else {
      esgClassification = getESGClassification(selectedNewCategory);
    }

    // 새로운 카테고리 객체 생성
    const newCategory = {
      rank: newCategoryRank,
      category: selectedNewCategory,
      frequency_score: 0.0,
      relevance_score: 0.0,
      recent_score: 0.0,
      rank_score: 0.0,
      reference_score: 0.0,
      negative_score: 0.0,
      final_score: 0.0,
      count: 0,
      esg_classification: esgClassification,
      esg_classification_id: null,
      base_issuepools: selectedCategoryInfo?.base_issue_pools || [],
      total_issuepools: selectedCategoryInfo?.base_issue_pools?.length || 0,
      selected_base_issue_pool: newBaseIssuePool
    };

    // assessmentResult에 새로운 카테고리 추가
    const resultData = assessmentResult?.data || assessmentResult;
    const updatedCategories = [...(resultData?.matched_categories || []), newCategory];
    
    // 순위별로 정렬
    updatedCategories.sort((a, b) => a.rank - b.rank);
    
    // 상태 업데이트
    if (assessmentResult?.data) {
      setAssessmentResult({
        ...assessmentResult,
        data: {
          ...assessmentResult.data,
          matched_categories: updatedCategories
        }
      });
    } else {
      setAssessmentResult({
        ...assessmentResult,
        matched_categories: updatedCategories
      });
    }

    // 모달 닫기 및 상태 초기화
    setIsAddCategoryModalOpen(false);
    setSelectedNewCategory('');
    setNewCategoryRank(1);
    setNewBaseIssuePool('');
    setIsCustomBaseIssuePool(false);
    setCustomBaseIssuePoolText('');
    
    alert(`✅ 새로운 카테고리 "${selectedNewCategory}"가 ${newCategoryRank}위로 추가되었습니다.\nESG 분류: ${esgClassification}`);
  } catch (error) {
    console.error('❌ 새로운 카테고리 추가 실패:', error);
    alert('❌ 새로운 카테고리 추가에 실패했습니다.');
  }
};

  

  