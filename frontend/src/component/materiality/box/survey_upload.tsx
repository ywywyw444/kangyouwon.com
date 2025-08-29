import React from 'react';
import * as XLSX from 'xlsx';
import { handleExcelUpload } from '../handle_excel_upload';

interface SurveyUploadProps {
  excelData: any[];
  isExcelValid: boolean | null;
  excelFilename: string | null;
  excelBase64: string | null;
  isDataHidden: boolean;
  setIsExcelValid: (valid: boolean | null) => void;
  setExcelFilename: (filename: string | null) => void;
  setExcelBase64: (base64: string | null) => void;
  setExcelData: (data: any[]) => void;
  setIsDataHidden: (hidden: boolean) => void;
  updateRow: (index: number, updatedData: any) => void;
  deleteRow: (index: number) => void;
}

const SurveyUpload: React.FC<SurveyUploadProps> = ({
  excelData,
  isExcelValid,
  excelFilename,
  excelBase64,
  isDataHidden,
  setIsExcelValid,
  setExcelFilename,
  setExcelBase64,
  setExcelData,
  setIsDataHidden,
  updateRow,
  deleteRow
}) => {
  return (
    <div id="survey-upload" className="bg-white rounded-xl shadow-lg p-6 mb-12">
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">
              📊 설문 대상 업로드
            </h2>
            <p className="text-gray-600">
              업로드된 Excel 파일의 설문 대상 기업 목록을 확인하세요
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <a
              href="/중대성평가 설문 대상자 템플릿.xlsx"
              download="중대성평가 설문 대상자 템플릿.xlsx"
              className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Excel 템플릿 다운로드
            </a>
          </div>
        </div>

        <div 
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors duration-200"
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const file = e.dataTransfer.files[0];
            if (file) {
              handleExcelUpload(file, setIsExcelValid, setExcelFilename, setExcelBase64, setExcelData);
            }
          }}
        >
          <div className="text-4xl text-gray-400 mb-4">📁</div>
          <p className="text-gray-600 mb-4">
            Excel 파일을 여기에 드래그하거나 클릭하여 선택하세요
          </p>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleExcelUpload(file, setIsExcelValid, setExcelFilename, setExcelBase64, setExcelData);
              }
            }}
            className="hidden"
            id="excel-upload"
          />
          <label
            htmlFor="excel-upload"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg cursor-pointer transition-colors duration-200"
          >
            파일 업로드
          </label>
        </div>
        
        <div className="mt-4 space-y-2">
          <div className="text-sm text-gray-500">
            지원 형식: .xlsx, .xls (최대 10MB)
          </div>
          {isExcelValid !== null && (
            <div className={`text-sm ${isExcelValid ? 'text-green-600' : 'text-red-600'} font-medium`}>
              {isExcelValid ? (
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  템플릿 검증 완료
                </div>
              ) : (
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  템플릿 형식이 올바르지 않습니다
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* 발송 대상 명단 확인 */}
      <div className="mt-8 p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-purple-800">📋 발송 대상 명단</h3>
              <p className="text-purple-600 text-sm">업로드된 Excel 파일의 설문 대상 기업 목록을 확인하세요</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                try {
                  // 먼저 localStorage에서 직접 데이터 확인
                  const savedData = localStorage.getItem('excelUploadData');
                  console.log('localStorage 데이터:', savedData);
                  
                  if (savedData) {
                    const parsedData = JSON.parse(savedData);
                    console.log('파싱된 데이터:', parsedData);
                    
                    // Zustand store에 직접 설정
                    setExcelData(parsedData.excelData || []);
                    setIsExcelValid(parsedData.isValid || false);
                    setExcelFilename(parsedData.fileName || null);
                    setExcelBase64(parsedData.base64Data || null);
                    
                    // 화면 표시 상태 복원
                    setIsDataHidden(false);
                    
                    console.log('명단 불러오기 후 상태:', {
                      excelData: parsedData.excelData?.length || 0,
                      excelFilename: parsedData.fileName,
                      isExcelValid: parsedData.isValid,
                      base64Data: parsedData.base64Data ? 'exists' : 'null'
                    });
                    
                    if (parsedData.excelData && parsedData.excelData.length > 0) {
                      alert('✅ 저장된 명단을 불러왔습니다.');
                    } else {
                      alert('⚠️ 저장된 명단이 없습니다.');
                    }
                  } else {
                    alert('⚠️ 저장된 명단이 없습니다.');
                  }
                } catch (error) {
                  console.error('저장된 데이터 불러오기 실패:', error);
                  alert('❌ 저장된 데이터를 불러오는데 실패했습니다.');
                }
              }}
              className="inline-flex items-center px-4 py-2 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 transition-colors duration-200"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              명단 불러오기
            </button>
            <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm font-medium rounded-full">
              총 {excelData.length}개 기업
            </span>
          </div>
        </div>
        
        {/* 업로드된 파일 정보 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 border border-purple-200">
            <div className="flex items-center mb-2">
              <svg className="w-5 h-5 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="font-medium text-gray-800">업로드된 파일</span>
            </div>
            <p className="text-sm text-gray-600">
              {/* 설문 대상 업로드 박스를 통해 업로드된 파일만 표시 */}
              {excelFilename && excelFilename !== 'media_search_한온시스템_20250828_110609.xlsx' ? excelFilename : '파일이 업로드되지 않았습니다'}
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-purple-200">
            <div className="flex items-center mb-2">
              <svg className="w-5 h-5 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium text-gray-800">업로드 시간</span>
            </div>
            <p className="text-sm text-gray-600">
              {excelFilename ? new Date().toLocaleString('ko-KR') : '-'}
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-purple-200">
            <div className="flex items-center mb-2">
              <svg className="w-5 h-5 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="font-medium text-gray-800">데이터 상태</span>
            </div>
            <p className="text-sm text-gray-600">
              {excelFilename ? '✅ 처리 완료' : '❌ 미업로드'}
            </p>
          </div>
        </div>
        
        {/* 대상 기업 목록 테이블 */}
        <div className="bg-white rounded-lg border border-purple-200 overflow-hidden">
          <div className="px-6 py-4 bg-purple-50 border-b border-purple-200">
            <h4 className="font-medium text-purple-800">🏢 설문 대상자 목록</h4>
          </div>
          
          {excelFilename && !isDataHidden ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      순번
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      기업명
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      이름
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      이해관계자 구분
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      이메일
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {excelData.map((row, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                      <td 
                        className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 cursor-pointer hover:bg-gray-100"
                        data-row={index}
                        data-field="company"
                        data-value={row.company}
                        onClick={(e) => {
                          const input = document.createElement('input');
                          input.value = row.company;
                          input.className = 'w-full px-2 py-1 border rounded';
                          const cell = e.currentTarget;
                          cell.innerHTML = '';
                          cell.appendChild(input);
                          input.focus();
                          
                          input.onblur = () => {
                            updateRow(index, {
                              ...row,
                              company: input.value
                            });
                            cell.innerHTML = input.value;
                          };
                          
                          input.onkeydown = (e) => {
                            if (e.key === 'Enter') {
                              input.blur();
                            }
                          };
                        }}
                      >{row.company}</td>
                      <td 
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer hover:bg-gray-100"
                        data-row={index}
                        data-field="name"
                        data-value={row.name}
                        onClick={(e) => {
                          const input = document.createElement('input');
                          input.value = row.name;
                          input.className = 'w-full px-2 py-1 border rounded';
                          const cell = e.currentTarget;
                          cell.innerHTML = '';
                          cell.appendChild(input);
                          input.focus();
                          
                          input.onblur = () => {
                            updateRow(index, {
                              ...row,
                              name: input.value
                            });
                            cell.innerHTML = input.value;
                          };
                          
                          input.onkeydown = (e) => {
                            if (e.key === 'Enter') {
                              input.blur();
                            }
                          };
                        }}
                      >{row.name}</td>
                      <td 
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer hover:bg-gray-100"
                        data-row={index}
                        data-field="stakeholderType"
                        data-value={row.stakeholderType}
                        onClick={(e) => {
                          const input = document.createElement('input');
                          input.value = row.stakeholderType;
                          input.className = 'w-full px-2 py-1 border rounded';
                          const cell = e.currentTarget;
                          cell.innerHTML = '';
                          cell.appendChild(input);
                          input.focus();
                          
                          input.onblur = () => {
                            updateRow(index, {
                              ...row,
                              stakeholderType: input.value
                            });
                            cell.innerHTML = input.value;
                          };
                          
                          input.onkeydown = (e) => {
                            if (e.key === 'Enter') {
                              input.blur();
                            }
                          };
                        }}
                      >{row.stakeholderType}</td>
                      <td 
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer hover:bg-gray-100"
                        data-row={index}
                        data-field="email"
                        data-value={row.email}
                        onClick={(e) => {
                          const input = document.createElement('input');
                          input.value = row.email;
                          input.className = 'w-full px-2 py-1 border rounded';
                          const cell = e.currentTarget;
                          cell.innerHTML = '';
                          cell.appendChild(input);
                          input.focus();
                          
                          input.onblur = () => {
                            updateRow(index, {
                              ...row,
                              email: input.value
                            });
                            cell.innerHTML = input.value;
                          };
                          
                          input.onkeydown = (e) => {
                            if (e.key === 'Enter') {
                              input.blur();
                            }
                          };
                        }}
                      >{row.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button 
                          onClick={() => {
                            // 해당 행의 모든 셀을 input으로 변경
                            const cells = document.querySelectorAll(`[data-row="${index}"]`);
                            cells.forEach((cell) => {
                              const input = document.createElement('input');
                              const cellData = cell.getAttribute('data-value');
                              input.value = cellData || '';
                              input.className = 'w-full px-2 py-1 border rounded';
                              cell.innerHTML = '';
                              cell.appendChild(input);
                              input.focus();

                              input.onblur = () => {
                                const field = cell.getAttribute('data-field');
                                if (field) {
                                  updateRow(index, {
                                    ...row,
                                    [field]: input.value
                                  });
                                }
                                cell.innerHTML = input.value;
                              };

                              input.onkeydown = (e) => {
                                if (e.key === 'Enter') {
                                  input.blur();
                                }
                              };
                            });
                          }}
                          className="text-purple-600 hover:text-purple-900 mr-2"
                        >
                          수정
                        </button>
                        <button 
                          onClick={() => {
                            if (confirm('정말 삭제하시겠습니까?')) {
                              deleteRow(index);
                            }
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <div className="text-4xl text-gray-300 mb-4">📊</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">업로드된 파일이 없습니다</h3>
              <p className="text-gray-500 mb-4">위의 '설문 대상 업로드' 섹션에서 Excel 파일을 업로드해주세요.</p>
              <button
                onClick={() => {
                  // 파일 업로드 섹션으로 스크롤
                  document.getElementById('excel-upload')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-purple-700 bg-purple-100 hover:bg-purple-200 transition-colors duration-200"
              >
                파일 업로드하러 가기
              </button>
            </div>
          )}
        </div>
        
        {/* 명단 관리 액션 버튼 */}
        {excelFilename && (
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => {
                // 새로운 워크북 생성
                const wb = XLSX.utils.book_new();
                
                // 헤더 행 생성 (1행은 빈 행, 2행은 템플릿 헤더)
                const headers = [
                  [], // 1행은 빈 행
                  ['이름', '직책', '소속 기업', '이해관계자 구분', '이메일'] // 2행은 헤더
                ];
                
                // 데이터 행 생성 (3행부터 시작)
                const data = excelData.map(row => [
                  row.name,
                  row.position,
                  row.company,
                  row.stakeholderType,
                  row.email
                ]);
                
                // 헤더와 데이터 결합
                const wsData = [...headers, ...data];
                
                // 워크시트 생성
                const ws = XLSX.utils.aoa_to_sheet(wsData);
                
                // 워크북에 워크시트 추가
                XLSX.utils.book_append_sheet(wb, ws, "설문대상자명단");
                
                // 파일 다운로드
                XLSX.writeFile(wb, "중대성평가 설문 대상자 명단.xlsx");
              }}
              className="inline-flex items-center px-4 py-2 border border-purple-300 text-sm font-medium rounded-md text-purple-700 bg-white hover:bg-purple-50 transition-colors duration-200"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              명단 내보내기
            </button>
            
            <button
              onClick={() => {
                const newRow = {
                  name: '',
                  position: '',
                  company: '',
                  stakeholderType: '',
                  email: ''
                };
                const updatedData = [...excelData, newRow];
                setExcelData(updatedData);
                
                // 화면 표시 상태 복원
                setIsDataHidden(false);
                
                // localStorage도 명시적으로 업데이트
                const dataToSave = {
                  excelData: updatedData,
                  isValid: isExcelValid,
                  fileName: excelFilename,
                  base64Data: excelBase64
                };
                localStorage.setItem('excelUploadData', JSON.stringify(dataToSave));
                console.log('➕ 새 행 추가 후 localStorage 업데이트:', dataToSave);
              }}
              className="inline-flex items-center px-4 py-2 border border-green-300 text-sm font-medium rounded-md text-green-700 bg-white hover:bg-green-50 transition-colors duration-200"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              추가
            </button>
            
            <button
              onClick={() => {
                if (confirm('현재 화면의 명단을 초기화하시겠습니까?\n(저장된 데이터는 "명단 불러오기"를 통해 다시 불러올 수 있습니다)')) {
                  // 화면에서만 데이터 숨기기 (Zustand store는 유지)
                  setIsDataHidden(true);
                  
                  // 파일 input 필드 초기화
                  const fileInput = document.getElementById('excel-upload') as HTMLInputElement;
                  if (fileInput) {
                    fileInput.value = '';
                  }
                  
                  console.log('🗑️ 명단 초기화: 화면에서만 숨김, 메모리 데이터 유지');
                  
                  alert('✅ 현재 화면의 명단이 초기화되었습니다.\n필요한 경우 "명단 불러오기"를 통해 이전 데이터를 불러올 수 있습니다.');
                }
              }}
              className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 transition-colors duration-200"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              명단 초기화
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SurveyUpload;
