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
  reset: () => void;
}

export const useExcelDataStore = create<ExcelDataStore>((set) => ({
  excelData: [],
  isValid: null,
  fileName: null,
  base64Data: null,
  setExcelData: (data) => set({ excelData: data }),
  setIsValid: (isValid) => set({ isValid }),
  setFileName: (name) => set({ fileName: name }),
  setBase64Data: (data) => set({ base64Data: data }),
  reset: () => set({ excelData: [], isValid: null, fileName: null, base64Data: null }),
}));
