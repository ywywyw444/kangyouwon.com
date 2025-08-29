import * as XLSX from 'xlsx';

// 엑셀 파일 업로드 및 검증 처리
export const handleExcelUpload = async (file: File, setIsExcelValid: any, setExcelFilename: any, setExcelBase64: any, setExcelData: any) => {
    try {
      // 파일 크기 체크 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('파일 크기는 10MB를 초과할 수 없습니다.');
        return;
      }

      // 파일 확장자 체크
      if (!file.name.match(/\.(xlsx|xls)$/)) {
        alert('Excel 파일(.xlsx, .xls)만 업로드 가능합니다.');
        return;
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // 첫 번째 시트 가져오기
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          
          // 2행의 A부터 E열까지의 값 가져오기
          const expectedHeaders = ['이름', '직책', '소속 기업', '이해관계자 구분', '이메일'];
          const actualHeaders: string[] = [];
          
          for (let i = 0; i < 5; i++) {
            const cellAddress = XLSX.utils.encode_cell({ r: 1, c: i }); // 2행(인덱스 1)의 각 열
            const cell = firstSheet[cellAddress];
            const cellValue = cell?.v;
            actualHeaders.push(typeof cellValue === 'string' ? cellValue : '');
          }

          // 헤더 비교
          const isValid = expectedHeaders.every((header, index) => header === actualHeaders[index]);
          setIsExcelValid(isValid);
          setExcelFilename(file.name);

          // 파일을 base64로 변환하여 저장
          const base64String = btoa(String.fromCharCode(...new Uint8Array(e.target?.result as ArrayBuffer)));
          setExcelBase64(base64String);

          if (isValid) {
            // 엑셀 데이터를 JSON으로 변환 (헤더 행을 제외하고 데이터 시작)
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { 
              range: 2,  // 3행부터 데이터 시작
              header: ['이름', '직책', '소속 기업', '이해관계자 구분', '이메일']  // 열 이름 직접 지정
            });
            
            // 데이터 형식 변환 및 저장
            const formattedData = jsonData.map((row: any) => ({
              name: row['이름'] || '',
              position: row['직책'] || '',
              company: row['소속 기업'] || '',
              stakeholderType: row['이해관계자 구분'] || '',
              email: row['이메일'] || ''
            }));

            console.log('Formatted Excel Data:', formattedData);  // 데이터 확인용 로그
            console.log('📊 데이터 길이:', formattedData.length);
            console.log('📁 파일명:', file.name);
            console.log('🔑 base64 길이:', base64String.length);
            
            // Zustand store에 데이터 설정
            setExcelData(formattedData);
            setIsExcelValid(true);
            setExcelFilename(file.name);
            setExcelBase64(base64String);
            
            console.log('✅ Zustand store 설정 완료');
            
            // 명시적으로 localStorage에 저장
            const dataToSave = {
              excelData: formattedData,
              isValid: true,
              fileName: file.name,
              base64Data: base64String
            };
            
            try {
              localStorage.setItem('excelUploadData', JSON.stringify(dataToSave));
              console.log('💾 localStorage 저장 완료:', dataToSave);
              
              // 저장 확인
              const savedData = localStorage.getItem('excelUploadData');
              console.log('🔍 localStorage 저장 확인:', savedData);
              
              if (savedData) {
                const parsedData = JSON.parse(savedData);
                console.log('✅ localStorage 데이터 파싱 성공:', parsedData);
                console.log('📊 저장된 데이터 길이:', parsedData.excelData?.length);
              } else {
                console.error('❌ localStorage 저장 실패: 데이터가 없음');
              }
            } catch (error) {
              console.error('❌ localStorage 저장 중 오류:', error);
            }
            
            alert('✅ 템플릿 검증이 완료되었습니다.\n' + formattedData.length + '개의 데이터가 성공적으로 업로드되었습니다.');
          } else {
            alert('❌ 템플릿 형식이 올바르지 않습니다.\n2행의 열 제목이 템플릿과 일치하지 않습니다.\n\n예상된 열 제목:\n' + expectedHeaders.join(', '));
          }
        } catch (error) {
          console.error('Excel 파일 처리 중 오류 발생:', error);
          alert('Excel 파일 처리 중 오류가 발생했습니다.');
          setIsExcelValid(false);
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('파일 업로드 중 오류 발생:', error);
      alert('파일 업로드 중 오류가 발생했습니다.');
      setIsExcelValid(false);
    }
  };