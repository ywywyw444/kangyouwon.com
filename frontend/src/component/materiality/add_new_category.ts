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
    // 기존 카테고리 목록 가져오기
    const resultData = assessmentResult?.data || assessmentResult;
    const existingCategories = resultData?.matched_categories || [];
    
    // 중복 카테고리 확인
    const isDuplicate = existingCategories.some((cat: any) => cat.category === selectedNewCategory);
    if (isDuplicate) {
      const confirmAdd = confirm(`⚠️ "${selectedNewCategory}" 카테고리가 이미 존재합니다.\n\n중복으로 추가하시겠습니까?`);
      if (!confirmAdd) {
        return;
      }
    }

    // 선택된 카테고리의 정보 찾기
    const selectedCategoryInfo = allCategories.find(cat => cat.name === selectedNewCategory);
    
    // ESG 분류 결정 (카테고리 정보에서 가져오거나 기존 함수 사용)
    let esgClassification = '미분류';
    if (selectedCategoryInfo && selectedCategoryInfo.esg_classification) {
      esgClassification = selectedCategoryInfo.esg_classification;
    } else {
      esgClassification = getESGClassification(selectedNewCategory);
    }

    // 순위 중복 처리: 기존 순위가 있으면 아래로 밀어내기
    const targetRank = parseInt(newCategoryRank) || 1;
    const updatedCategories = [...existingCategories];
    
    // 기존 순위가 있는 경우, 순위 조정 확인
    if (targetRank <= updatedCategories.length) {
      const affectedCategories = updatedCategories.slice(targetRank - 1);
      const confirmRankAdjustment = confirm(
        `📋 순위 조정이 필요합니다.\n\n` +
        `"${selectedNewCategory}" 카테고리를 ${targetRank}위에 추가하면:\n\n` +
        `• ${targetRank}위: ${updatedCategories[targetRank - 1]?.category || 'N/A'} → ${targetRank + 1}위\n` +
        `• ${targetRank + 1}위: ${updatedCategories[targetRank]?.category || 'N/A'} → ${targetRank + 2}위\n` +
        `• ... (아래 순위들이 모두 1씩 밀려납니다)\n\n` +
        `계속 진행하시겠습니까?`
      );
      
      if (!confirmRankAdjustment) {
        return;
      }
      
      // 해당 순위부터 끝까지 순위를 1씩 증가
      for (let i = targetRank - 1; i < updatedCategories.length; i++) {
        updatedCategories[i].rank = updatedCategories[i].rank + 1;
      }
    }

    // 새로운 카테고리 객체 생성
    const newCategory = {
      rank: targetRank,
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

    // 새로운 카테고리를 지정된 순위에 삽입
    updatedCategories.splice(targetRank - 1, 0, newCategory);
    
    // 순위별로 정렬 (안전장치)
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
    setNewCategoryRank('');
    setNewBaseIssuePool('');
    setIsCustomBaseIssuePool(false);
    setCustomBaseIssuePoolText('');
    
    // 성공 메시지에 순위 조정 정보 포함
    let successMessage = `✅ 새로운 카테고리 "${selectedNewCategory}"가 ${targetRank}위로 추가되었습니다.\nESG 분류: ${esgClassification}`;
    
    if (targetRank <= existingCategories.length) {
      successMessage += `\n\n📋 기존 ${targetRank}위부터 아래 순위들이 1씩 밀려났습니다.`;
    }
    
    alert(successMessage);
  } catch (error) {
    console.error('❌ 새로운 카테고리 추가 실패:', error);
    alert('❌ 새로운 카테고리 추가에 실패했습니다.');
  }
};

  

  