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
      saveToLocalStorage({ ...get(), excelData: data });
    },

    setIsValid: (isValid) => {
      set({ isValid });
      saveToLocalStorage({ ...get(), isValid });
    },

    setFileName: (name) => {
      set({ fileName: name });
      saveToLocalStorage({ ...get(), fileName: name });
    },

    setBase64Data: (data) => {
      set({ base64Data: data });
      saveToLocalStorage({ ...get(), base64Data: data });
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
      const initialState = { excelData: [], isValid: null, fileName: null, base64Data: null };
      set(initialState);
      localStorage.removeItem('excelUploadData');
    },
  };
});
