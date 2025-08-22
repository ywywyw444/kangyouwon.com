from konlpy.tag import Okt
from nltk.tokenize import word_tokenize
import nltk
import re
import pandas as pd
from nltk import FreqDist
from wordcloud import WordCloud
import matplotlib.pyplot as plt
from icecream import ic
import numpy as np

class KoreanNewsPreprocessor:
    """
    한국어 뉴스 데이터 전처리를 위한 클래스
    title, description, 검색어(company+issue)를 활용해 judge를 구하는 ML 모델을 위한 전처리
    """
    
    def __init__(self):
        self.okt = Okt()
        self.stopwords = set()
        self.load_korean_stopwords()
        
    def load_korean_stopwords(self):
        """한국어 기본 불용어 로드"""
        # 한국어 기본 불용어 목록
        basic_stopwords = [
            '이', '그', '저', '것', '수', '등', '때', '곳', '말', '일',
            '때문', '그것', '이것', '저것', '그러나', '하지만', '또한',
            '또는', '그리고', '그런데', '그래서', '따라서', '그러므로',
            '아', '어', '오', '우', '으', '이', '가', '을', '를', '의',
            '에', '에서', '로', '으로', '와', '과', '도', '만', '은', '는',
            '이', '가', '을', '를', '의', '에', '에서', '로', '으로',
            '와', '과', '도', '만', '은', '는', '이', '가', '을', '를',
            '의', '에', '에서', '로', '으로', '와', '과', '도', '만',
            '은', '는', '이', '가', '을', '를', '의', '에', '에서',
            '로', '으로', '와', '과', '도', '만', '은', '는'
        ]
        
        # 뉴스 관련 불용어 추가
        news_stopwords = [
            '뉴스', '기사', '보도', '발표', '공개', '발표', '전망',
            '예상', '추정', '분석', '조사', '연구', '개발', '투자',
            '매출', '실적', '성장', '발전', '향상', '개선', '확대',
            '증가', '감소', '상승', '하락', '변화', '전환', '확산'
        ]
        
        # 숫자, 특수문자 관련
        symbol_stopwords = [
            '년', '월', '일', '시', '분', '초', '원', '억', '만',
            '천', '백', '십', '개', '명', '회', '차', '번', '회',
            '퍼센트', '프로', '%', '원', '달러', '엔', '위안'
        ]
        
        # 사람이름 관련 불용어 (성씨 + 일반적인 이름 패턴)
        name_stopwords = [
            '김', '이', '박', '최', '정', '강', '조', '윤', '장', '임',
            '한', '오', '서', '신', '권', '황', '안', '송', '류', '전',
            '고', '문', '양', '손', '배', '조', '백', '허', '유', '남',
            '심', '노', '정', '하', '곽', '성', '차', '주', '우', '구',
            '신', '임', '나', '전', '민', '유', '진', '지', '엄', '채',
            '원', '천', '방', '공', '강', '현', '함', '변', '염', '양',
            '변', '여', '추', '노', '도', '소', '신', '석', '선', '설',
            '마', '길', '주', '예', '경', '명', '기', '동', '영', '수',
            '자', '준', '민', '지', '현', '우', '서', '재', '정', '진',
            '민', '준', '현', '우', '서', '재', '정', '진', '민', '준',
            # 성씨 + '씨' 패턴 추가
            '김씨', '이씨', '박씨', '최씨', '정씨', '강씨', '조씨', '윤씨', '장씨', '임씨',
            '한씨', '오씨', '서씨', '신씨', '권씨', '황씨', '안씨', '송씨', '류씨', '전씨',
            '고씨', '문씨', '양씨', '손씨', '배씨', '백씨', '허씨', '유씨', '남씨',
            '심씨', '노씨', '하씨', '곽씨', '성씨', '차씨', '주씨', '구씨',
            '나씨', '민씨', '지씨', '엄씨', '채씨', '원씨', '천씨', '방씨', '공씨',
            '함씨', '변씨', '염씨', '여씨', '추씨', '도씨', '소씨', '석씨', '선씨', '설씨',
            '길씨', '예씨', '경씨', '명씨', '기씨', '동씨', '영씨', '수씨',
            '자씨', '현씨', '재씨', '진씨'
        ]
        
        self.stopwords.update(basic_stopwords)
        self.stopwords.update(news_stopwords)
        self.stopwords.update(symbol_stopwords)
        self.stopwords.update(name_stopwords)
        
    def read_excel_data(self, file_path):
        """엑셀 파일에서 뉴스 데이터 읽기"""
        try:
            df = pd.read_excel(file_path)
            ic(f"데이터 로드 완료: {len(df)}행, {len(df.columns)}열")
            ic(f"컬럼명: {list(df.columns)}")
            return df
        except Exception as e:
            ic(f"엑셀 파일 읽기 오류: {e}")
            return None
    
    def clean_text(self, text):
        """텍스트 정제 (한글만 추출, 공백 정리)"""
        if pd.isna(text) or text == '':
            return ''
        
        # 텍스트를 문자열로 변환
        text = str(text)
        
        # 줄바꿈을 공백으로 변경
        text = text.replace('\n', ' ').replace('\r', ' ')
        
        # 한글, 숫자, 공백만 추출
        text = re.sub(r'[^ㄱ-힣0-9\s]', '', text)
        
        # 연속된 공백을 하나로 정리
        text = re.sub(r'\s+', ' ', text)
        
        return text.strip()
    
    def extract_nouns(self, text):
        """한국어 텍스트에서 명사 추출"""
        if not text:
            return []
        
        try:
            # 형태소 분석으로 명사 추출
            pos_result = self.okt.pos(text, stem=True)
            nouns = [word for word, pos in pos_result if pos == 'Noun']
            
            # 길이가 1인 토큰 제거 (베이스라인으로 충분)
            nouns = [noun for noun in nouns if len(noun) > 1]
            
            return nouns
        except Exception as e:
            ic(f"명사 추출 오류: {e}")
            return []
    
    def remove_stopwords(self, tokens):
        """불용어 제거"""
        filtered_tokens = [token for token in tokens if token not in self.stopwords]
        return filtered_tokens
    
    def remove_company_names(self, tokens, company_names):
        """기업명 제거 (company 컬럼과 겹치는 것)"""
        if not company_names:
            return tokens
        
        # company_names를 set으로 변환하여 검색 속도 향상
        company_set = set()
        for company in company_names:
            if pd.notna(company) and company:
                company_str = str(company).strip()
                if company_str:
                    # 기업명을 토큰으로 분할하여 각각 제거
                    company_tokens = company_str.split()
                    company_set.update(company_tokens)
                    
                    # 띄어쓰기가 있는 기업명도 추가 (예: "HL 만도" -> "HL", "만도")
                    if len(company_tokens) > 1:
                        # 전체 기업명도 추가
                        company_set.add(company_str)
        
        # 기업명 토큰 제거 (부분 일치도 제거)
        filtered_tokens = []
        for token in tokens:
            should_remove = False
            for company in company_set:
                if token in company or company in token:
                    should_remove = True
                    break
            if not should_remove:
                filtered_tokens.append(token)
        
        return filtered_tokens
    
    def categorize_tokens(self, tokens):
        """토큰을 카테고리별로 분류"""
        categories = {
            'technology': [],      # 기술 관련
            'business': [],        # 비즈니스/경제 관련
            'environment': [],     # 환경/ESG 관련
            'social': [],          # 사회/인권 관련
            'governance': [],      # 거버넌스/윤리 관련
            'industry': [],        # 산업/제조업 관련
            'finance': [],         # 금융/투자 관련
            'innovation': [],      # 혁신/연구개발 관련
            'sustainability': [],  # 지속가능성 관련
            'other': []            # 기타
        }
        
        # 카테고리별 키워드 정의
        category_keywords = {
            'technology': [
                '기술', '기술력', '혁신', '디지털', 'AI', '인공지능', '머신러닝', '빅데이터',
                '클라우드', '블록체인', 'IoT', '자율주행', '로봇', '반도체', '전자', '소프트웨어',
                '플랫폼', '알고리즘', '자동화', '스마트', '컴퓨터', '네트워크', '보안', '암호화'
            ],
            'business': [
                '매출', '실적', '성장', '시장', '경쟁', '전략', '마케팅', '브랜드', '고객',
                '서비스', '제품', '품질', '효율', '비용', '수익', '매출액', '영업이익',
                '순이익', '자산', '부채', '자본', '재무', '경영', '사업', '운영'
            ],
            'environment': [
                '환경', '친환경', '탄소', '기후', '에너지', '재생', '태양광', '풍력', '수소',
                '배출', '오염', '폐기물', '순환', '녹색', '생태', '자연', '대기', '수질',
                '토양', '생물', '다양성', '보전', '보호', '개선', '관리', '정책'
            ],
            'social': [
                '사회', '인권', '노동', '고용', '교육', '의료', '복지', '건강', '안전',
                '공정', '평등', '다양성', '포용', '지역', '커뮤니티', '협력', '파트너십',
                '기부', '봉사', '자원봉사', '사회공헌', '책임', '윤리', '도덕', '가치'
            ],
            'governance': [
                '거버넌스', '윤리', '투명', '공정', '책임', '감사', '내부통제', '리스크',
                '준법', '규정', '정책', '절차', '평가', '모니터링', '보고', '공시',
                '이사회', '주주', '이해관계자', '독립성', '객관성', '무결성'
            ],
            'industry': [
                '산업', '제조', '생산', '공장', '설비', '자동화', '로봇', '시스템',
                '공정', '품질관리', '물류', '공급망', '원자재', '부품', '조립', '검사',
                '유지보수', '개선', '최적화', '효율성', '생산성', '수율'
            ],
            'finance': [
                '금융', '투자', '자본', '주식', '채권', '펀드', '보험', '은행', '증권',
                '리스크', '수익률', '변동성', '유동성', '안정성', '성장성', '가치',
                '평가', '분석', '전망', '예측', '모델', '시나리오'
            ],
            'innovation': [
                '혁신', '연구', '개발', 'R&D', '특허', '기술개발', '신기술', '신제품',
                '창의', '아이디어', '솔루션', '프로토타입', '검증', '실험', '테스트',
                '최적화', '개선', '진화', '도약', '성과', '성취'
            ],
            'sustainability': [
                '지속가능', '지속가능성', 'ESG', '환경', '사회', '거버넌스', '통합',
                '균형', '미래', '세대', '책임', '영향', '측정', '평가', '보고',
                '목표', '전략', '실행', '모니터링', '검토', '개선'
            ]
        }
        
        for token in tokens:
            categorized = False
            for category, keywords in category_keywords.items():
                if token in keywords:
                    categories[category].append(token)
                    categorized = True
                    break
            
            if not categorized:
                categories['other'].append(token)
        
        return categories
    
    def preprocess_text(self, text, company_names=None):
        """전체 전처리 과정"""
        # 1. 텍스트 정제
        cleaned_text = self.clean_text(text)
        
        # 2. 명사 추출
        nouns = self.extract_nouns(cleaned_text)
        
        # 3. 불용어 제거
        filtered_nouns = self.remove_stopwords(nouns)
        
        # 4. 기업명 제거 (company 컬럼과 겹치는 것)
        if company_names:
            filtered_nouns = self.remove_company_names(filtered_nouns, company_names)
        
        return filtered_nouns
    
    def process_excel_data(self, file_path):
        """엑셀 데이터 전체 전처리"""
        # 데이터 로드
        df = self.read_excel_data(file_path)
        if df is None:
            return None
        
        # 전처리 결과를 저장할 컬럼 추가
        df['title_processed'] = ''
        df['description_processed'] = ''
        
        # 카테고리별 분류 결과를 저장할 컬럼들 추가 (title과 description만)
        category_columns = [
            'title_tech', 'title_business', 'title_env', 'title_social', 'title_gov',
            'title_industry', 'title_finance', 'title_innovation', 'title_sustainability', 'title_other',
            'desc_tech', 'desc_business', 'desc_env', 'desc_social', 'desc_gov',
            'desc_industry', 'desc_finance', 'desc_innovation', 'desc_sustainability', 'desc_other'
        ]
        
        for col in category_columns:
            df[col] = ''
        
        # company 컬럼에서 모든 기업명 수집
        company_names = []
        if 'company' in df.columns:
            company_names = df['company'].dropna().unique().tolist()
        
        # 각 행별로 전처리 수행
        for idx, row in df.iterrows():
            if idx % 100 == 0:
                ic(f"처리 진행률: {idx}/{len(df)}")
            
            # title 전처리 및 카테고리 분류
            if 'title' in df.columns:
                title_tokens = self.preprocess_text(row['title'], company_names)
                df.at[idx, 'title_processed'] = ' '.join(title_tokens)
                
                # 카테고리별 분류
                title_categories = self.categorize_tokens(title_tokens)
                for category, tokens in title_categories.items():
                    col_name = f'title_{category}'
                    if col_name in df.columns:
                        df.at[idx, col_name] = ' '.join(tokens)
            
            # description 전처리 및 카테고리 분류
            if 'description' in df.columns:
                desc_tokens = self.preprocess_text(row['description'], company_names)
                df.at[idx, 'description_processed'] = ' '.join(desc_tokens)
                
                # 카테고리별 분류
                desc_categories = self.categorize_tokens(desc_tokens)
                for category, tokens in desc_categories.items():
                    col_name = f'desc_{category}'
                    if col_name in df.columns:
                        df.at[idx, col_name] = ' '.join(tokens)
        
        ic("전처리 및 카테고리 분류 완료!")
        return df
    
    def analyze_frequency(self, df, column_name):
        """특정 컬럼의 단어 빈도 분석"""
        all_tokens = []
        
        for tokens_str in df[column_name]:
            if tokens_str:
                tokens = tokens_str.split()
                all_tokens.extend(tokens)
        
        # 빈도 분석
        freq_dist = FreqDist(all_tokens)
        freq_df = pd.DataFrame(freq_dist.most_common(50), columns=['단어', '빈도'])
        
        ic(f"{column_name} 상위 10개 단어:")
        ic(freq_df.head(10))
        
        return freq_df
    
    def analyze_categories(self, df):
        """카테고리별 분석 결과 출력"""
        ic("\n=== 카테고리별 분석 ===")
        
        # 카테고리별 토큰 수 집계
        category_stats = {}
        
        for col in df.columns:
            if any(cat in col for cat in ['tech', 'business', 'env', 'social', 'gov', 'industry', 'finance', 'innovation', 'sustainability', 'other']):
                if col.startswith('title_'):
                    category = col.replace('title_', '')
                    total_tokens = sum(len(str(df.at[idx, col]).split()) if df.at[idx, col] else 0 for idx in range(len(df)))
                    category_stats[f'title_{category}'] = total_tokens
                elif col.startswith('desc_'):
                    category = col.replace('desc_', '')
                    total_tokens = sum(len(str(df.at[idx, col]).split()) if df.at[idx, col] else 0 for idx in range(len(df)))
                    category_stats[f'desc_{category}'] = total_tokens
        
        # 결과 출력
        for category, count in sorted(category_stats.items(), key=lambda x: x[1], reverse=True):
            ic(f"{category}: {count}개 토큰")
        
        return category_stats
    
    def create_wordcloud(self, df, column_name, output_path=None):
        """워드클라우드 생성"""
        all_tokens = []
        
        for tokens_str in df[column_name]:
            if tokens_str:
                tokens = tokens_str.split()
                all_tokens.extend(tokens)
        
        if not all_tokens:
            ic(f"{column_name}에 처리된 토큰이 없습니다.")
            return
        
        # 텍스트 결합
        text = ' '.join(all_tokens)
        
        # 워드클라우드 생성
        try:
            wordcloud = WordCloud(
                font_path='malgun',  # Windows 기본 폰트
                background_color='white',
                width=800,
                height=600,
                max_words=100,
                relative_scaling=0.2
            ).generate(text)
            
            # 시각화
            plt.figure(figsize=(12, 8))
            plt.imshow(wordcloud, interpolation='bilinear')
            plt.axis('off')
            plt.title(f'{column_name} 워드클라우드')
            
            if output_path:
                plt.savefig(output_path, dpi=300, bbox_inches='tight')
                ic(f"워드클라우드 저장: {output_path}")
            
            plt.show()
            
        except Exception as e:
            ic(f"워드클라우드 생성 오류: {e}")
    
    def save_processed_data(self, df, output_path):
        """전처리된 데이터 저장"""
        try:
            df.to_excel(output_path, index=False)
            ic(f"전처리된 데이터 저장 완료: {output_path}")
        except Exception as e:
            ic(f"데이터 저장 오류: {e}")


def main():
    """메인 실행 함수"""
    # 전처리기 인스턴스 생성
    preprocessor = KoreanNewsPreprocessor()
    
    # 엑셀 파일 경로
    input_file = '머신러닝 원본 데이터.xlsx'
    output_file = '머신러닝_전처리_완료.xlsx'
    
    # 데이터 전처리 실행
    ic("=== 한국어 뉴스 데이터 전처리 시작 ===")
    
    # 1. 엑셀 데이터 전처리
    processed_df = preprocessor.process_excel_data(input_file)
    
    if processed_df is not None:
        # 2. 빈도 분석
        ic("\n=== 빈도 분석 ===")
        title_freq = preprocessor.analyze_frequency(processed_df, 'title_processed')
        desc_freq = preprocessor.analyze_frequency(processed_df, 'description_processed')
        
        # 3. 카테고리별 분석
        category_stats = preprocessor.analyze_categories(processed_df)
        
        # 4. 워드클라우드 생성
        ic("\n=== 워드클라우드 생성 ===")
        preprocessor.create_wordcloud(processed_df, 'title_processed', 'title_wordcloud.png')
        preprocessor.create_wordcloud(processed_df, 'description_processed', 'description_wordcloud.png')
        
        # 5. 전처리된 데이터 저장
        preprocessor.save_processed_data(processed_df, output_file)
        
        ic("\n=== 전처리 완료! ===")
        ic(f"입력 파일: {input_file}")
        ic(f"출력 파일: {output_file}")
        ic(f"처리된 행 수: {len(processed_df)}")
    else:
        ic("데이터 처리에 실패했습니다.")


if __name__ == '__main__':
    main()
