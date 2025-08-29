import { create } from 'zustand';

interface ExcelRow {
  name: string;
  position: string;
  company: string;
  stakeholderType: string;
  email: string;
}

interface ExcelDataStore {
  excelData: ExcelRow[];
  isValid: boolean | null;
  fileName: string | null;
  base64Data: string | null;
  // 설문 대상 업로드 데이터만을 위한 별도 상태
  surveyUploadData: ExcelRow[];
  surveyUploadFileName: string | null;
  surveyUploadBase64: string | null;
  surveyUploadIsValid: boolean | null;
  setExcelData: (data: ExcelRow[]) => void;
  setIsValid: (isValid: boolean) => void;
  setFileName: (name: string | null) => void;
  setBase64Data: (data: string | null) => void;
  // 설문 대상 업로드 데이터 설정 메서드
  setSurveyUploadData: (data: ExcelRow[]) => void;
  setSurveyUploadFileName: (name: string | null) => void;
  setSurveyUploadBase64: (data: string | null) => void;
  setSurveyUploadIsValid: (isValid: boolean) => void;
  updateRow: (index: number, updatedData: ExcelRow) => void;
  deleteRow: (index: number) => void;
  reset: () => void;
  loadFromStorage: () => void;
  saveToLocalStorage: () => void;
  // 업로드된 엑셀 데이터만 저장하는 메서드 추가
  saveUploadedExcelData: () => void;
  // 저장된 업로드 데이터만 불러오는 메서드 추가
  loadUploadedExcelData: () => void;
  // 설문 대상 업로드 데이터 저장/로드 메서드
  saveSurveyUploadData: () => void;
  loadSurveyUploadData: () => void;
}

const saveToLocalStorage = (state: Partial<ExcelDataStore>) => {
  try {
    localStorage.setItem('excelUploadData', JSON.stringify({
      excelData: state.excelData,
      isValid: state.isValid,
      fileName: state.fileName,
      base64Data: state.base64Data,
    }));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
};

const loadFromLocalStorage = (): Partial<ExcelDataStore> => {
  try {
    const saved = localStorage.getItem('excelUploadData');
    return saved ? JSON.parse(saved) : {};
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return {};
  }
};

// 업로드된 엑셀 데이터만 저장하는 함수
const saveUploadedExcelData = (state: Partial<ExcelDataStore>) => {
  try {
    localStorage.setItem('uploadedExcelData', JSON.stringify({
      excelData: state.excelData,
      isValid: state.isValid,
      fileName: state.fileName,
      base64Data: state.base64Data,
    }));
    console.log('💾 업로드된 엑셀 데이터 저장 완료');
  } catch (error) {
    console.error('Failed to save uploaded excel data:', error);
  }
};

// 저장된 업로드 데이터만 불러오는 함수
const loadUploadedExcelData = (): Partial<ExcelDataStore> => {
  try {
    const saved = localStorage.getItem('uploadedExcelData');
    return saved ? JSON.parse(saved) : {};
  } catch (error) {
    console.error('Failed to load uploaded excel data:', error);
    return {};
  }
};

// 설문 대상 업로드 데이터 저장 함수
const saveSurveyUploadData = (state: Partial<ExcelDataStore>) => {
  try {
    localStorage.setItem('surveyUploadData', JSON.stringify({
      surveyUploadData: state.surveyUploadData,
      surveyUploadFileName: state.surveyUploadFileName,
      surveyUploadBase64: state.surveyUploadBase64,
      surveyUploadIsValid: state.surveyUploadIsValid,
    }));
    console.log('💾 설문 대상 업로드 데이터 저장 완료');
  } catch (error) {
    console.error('Failed to save survey upload data:', error);
  }
};

// 설문 대상 업로드 데이터 로드 함수
const loadSurveyUploadData = (): Partial<ExcelDataStore> => {
  try {
    const saved = localStorage.getItem('surveyUploadData');
    return saved ? JSON.parse(saved) : {};
  } catch (error) {
    console.error('Failed to load survey upload data:', error);
    return {};
  }
};

export const useExcelDataStore = create<ExcelDataStore>((set, get) => {
  // 초기 상태를 로컬스토리지에서 불러옴
  const savedState = loadFromLocalStorage();

  return {
    excelData: savedState.excelData || [],
    isValid: savedState.isValid || null,
    fileName: savedState.fileName || null,
    base64Data: savedState.base64Data || null,
    // 설문 대상 업로드 데이터 초기 상태
    surveyUploadData: [],
    surveyUploadFileName: null,
    surveyUploadBase64: null,
    surveyUploadIsValid: null,

    setExcelData: (data) => {
      set({ excelData: data });
      // 업로드된 엑셀 데이터만 별도로 저장
      saveUploadedExcelData({ ...get(), excelData: data });
    },

    setIsValid: (isValid) => {
      set({ isValid });
      // 업로드된 엑셀 데이터만 별도로 저장
      saveUploadedExcelData({ ...get(), isValid });
    },

    setFileName: (name) => {
      set({ fileName: name });
      // 업로드된 엑셀 데이터만 별도로 저장
      saveUploadedExcelData({ ...get(), fileName: name });
    },

    setBase64Data: (data) => {
      set({ base64Data: data });
      // 업로드된 엑셀 데이터만 별도로 저장
      saveUploadedExcelData({ ...get(), base64Data: data });
    },

    // 설문 대상 업로드 데이터 설정 메서드들
    setSurveyUploadData: (data) => {
      set({ surveyUploadData: data });
      saveSurveyUploadData({ ...get(), surveyUploadData: data });
    },

    setSurveyUploadFileName: (name) => {
      set({ surveyUploadFileName: name });
      saveSurveyUploadData({ ...get(), surveyUploadFileName: name });
    },

    setSurveyUploadBase64: (data) => {
      set({ surveyUploadBase64: data });
      saveSurveyUploadData({ ...get(), surveyUploadBase64: data });
    },

    setSurveyUploadIsValid: (isValid) => {
      set({ surveyUploadIsValid: isValid });
      saveSurveyUploadData({ ...get(), surveyUploadIsValid: isValid });
    },

    updateRow: (index: number, updatedData: ExcelRow) => {
      const currentData = [...get().excelData];
      currentData[index] = updatedData;
      set({ excelData: currentData });
      saveToLocalStorage({ ...get(), excelData: currentData });
    },

    deleteRow: (index: number) => {
      const currentData = [...get().excelData];
      currentData.splice(index, 1);
      set({ excelData: currentData });
      saveToLocalStorage({ ...get(), excelData: currentData });
    },

    reset: () => {
      const initialState = { excelData: [], isValid: false, fileName: null, base64Data: null };
      set(initialState);
      // localStorage는 지우지 않음 (명단 불러오기를 위해)
    },

    loadFromStorage: () => {
      const savedState = loadFromLocalStorage();
      set({
        excelData: savedState.excelData || [],
        isValid: savedState.isValid || false,
        fileName: savedState.fileName || null,
        base64Data: savedState.base64Data || null,
      });
    },

    saveToLocalStorage: () => {
      const currentState = get();
      saveToLocalStorage(currentState);
    },

    saveUploadedExcelData: () => {
      const currentState = get();
      saveUploadedExcelData(currentState);
    },

    loadUploadedExcelData: () => {
      const savedState = loadUploadedExcelData();
      set({
        excelData: savedState.excelData || [],
        isValid: savedState.isValid || false,
        fileName: savedState.fileName || null,
        base64Data: savedState.base64Data || null,
      });
    },

    saveSurveyUploadData: () => {
      const currentState = get();
      saveSurveyUploadData(currentState);
    },

    loadSurveyUploadData: () => {
      const savedState = loadSurveyUploadData();
      set({
        surveyUploadData: savedState.surveyUploadData || [],
        surveyUploadFileName: savedState.surveyUploadFileName || null,
        surveyUploadBase64: savedState.surveyUploadBase64 || null,
        surveyUploadIsValid: savedState.surveyUploadIsValid || null,
      });
    },
  };
});
