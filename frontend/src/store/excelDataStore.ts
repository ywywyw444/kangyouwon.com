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
  setExcelData: (data: ExcelRow[]) => void;
  setIsValid: (isValid: boolean) => void;
  setFileName: (name: string | null) => void;
  setBase64Data: (data: string | null) => void;
  updateRow: (index: number, updatedData: ExcelRow) => void;
  deleteRow: (index: number) => void;
  reset: () => void;
  loadFromStorage: () => void;
  saveToLocalStorage: () => void;
  // 업로드된 엑셀 데이터만 저장하는 메서드 추가
  saveUploadedExcelData: () => void;
  // 저장된 업로드 데이터만 불러오는 메서드 추가
  loadUploadedExcelData: () => void;
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

export const useExcelDataStore = create<ExcelDataStore>((set, get) => {
  // 초기 상태를 로컬스토리지에서 불러옴
  const savedState = loadFromLocalStorage();

  return {
    excelData: savedState.excelData || [],
    isValid: savedState.isValid || null,
    fileName: savedState.fileName || null,
    base64Data: savedState.base64Data || null,

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
  };
});
