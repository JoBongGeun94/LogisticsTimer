
import { LapTime, SessionData, GageRRResult } from '../types';

/**
 * 포맷터 인터페이스 (Interface Segregation Principle)
 */
interface ITimeFormatter {
  format(milliseconds: number): string;
}

interface IDataFormatter {
  formatMeasurementData(session: SessionData, lapTimes: LapTime[]): string[][];
  formatAnalysisData(session: SessionData, lapTimes: LapTime[], analysis: GageRRResult): string[][];
}

interface IFileExporter {
  export(data: string[][], filename: string): boolean;
}

/**
 * 시간 포맷터 (Single Responsibility Principle)
 */
class TimeFormatter implements ITimeFormatter {
  format(milliseconds: number): string {
    if (typeof milliseconds !== 'number' || isNaN(milliseconds) || milliseconds < 0) {
      return '00:00.00';
    }

    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const centiseconds = Math.floor((milliseconds % 1000) / 10);

    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  }
}

/**
 * 데이터 포맷터 (Single Responsibility Principle)
 */
class DataFormatter implements IDataFormatter {
  constructor(private timeFormatter: ITimeFormatter) {}

  private safeFormat(value: number | undefined | null, decimals: number): string {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return '0.' + '0'.repeat(decimals);
    }
    return Number(value).toFixed(decimals);
  }

  private getStatusDescription(status: string): string {
    switch (status) {
      case 'excellent': return '측정시스템이 매우 우수하여 모든 용도로 사용 가능';
      case 'acceptable': return '측정시스템이 양호하여 대부분 용도로 사용 가능';
      case 'marginal': return '측정시스템이 제한적이며 개선 후 사용 권장';
      case 'unacceptable': return '측정시스템이 불량하여 즉시 개선 필요';
      default: return '상태 미정의';
    }
  }

  private generateDetailedInterpretation(analysis: any): string[][] {
    const sections = [
      ['=== 📋 상세 해석 및 권장사항 ===', '', '', ''],
      ['', '', '', ''],
    ];

    // 종합 평가에 따른 상세 해석
    if (analysis.status === 'excellent') {
      sections.push(
        ['🎯 종합 해석: 우수한 측정시스템', '', '', ''],
        ['• 측정 오차가 매우 낮아 신뢰할 수 있는 결과 제공', '', '', ''],
        ['• 표준시간 설정 및 성과 평가에 안전하게 활용 가능', '', '', ''],
        ['• 현재 측정 절차와 교육 수준을 유지하세요', '', '', ''],
        ['', '', '', ''],
        ['🔧 권장 조치사항:', '', '', ''],
        ['1. 현행 측정 절차 유지', '정기적 교정만 실시', '우수한 상태 지속', ''],
        ['2. 모범 사례 문서화', '다른 작업장에 전파', '조직 차원 표준화', ''],
        ['3. 분기별 재평가', '지속적 품질 관리', '성능 저하 조기 발견', '']
      );
    } else if (analysis.status === 'acceptable') {
      sections.push(
        ['🎯 종합 해석: 양호한 측정시스템', '', '', ''],
        ['• 일반적인 용도로는 충분히 신뢰할 수 있는 수준', '', '', ''],
        ['• 중요한 의사결정에는 주의가 필요', '', '', ''],
        ['• 점진적 개선을 통해 우수 등급 달성 가능', '', '', ''],
        ['', '', '', ''],
        ['🔧 권장 조치사항:', '', '', ''],
        ['1. 측정자 재교육', '측정 기법 표준화', '재현성 개선', ''],
        ['2. 장비 점검 및 교정', '정밀도 향상', '반복성 개선', ''],
        ['3. 월별 모니터링', '성능 추이 관찰', '개선 효과 검증', '']
      );
    } else if (analysis.status === 'marginal') {
      sections.push(
        ['🎯 종합 해석: 제한적 측정시스템', '', '', ''],
        ['• 현재 상태로는 신뢰성에 한계가 있음', '', '', ''],
        ['• 개선 조치 없이는 정확한 평가 어려움', '', '', ''],
        ['• 즉시 개선 계획을 수립하고 실행하세요', '', '', ''],
        ['', '', '', ''],
        ['🔧 긴급 조치사항:', '', '', ''],
        ['1. 측정자 집중 교육', '측정 절차 재정립', '필수 선행 조치', ''],
        ['2. 장비 전면 점검', '교정 및 교체 검토', '하드웨어 개선', ''],
        ['3. 주간 재평가', '개선 효과 즉시 확인', '지속적 모니터링', '']
      );
    } else {
      sections.push(
        ['🎯 종합 해석: 불량한 측정시스템', '', '', ''],
        ['• 현재 측정 결과를 신뢰할 수 없는 상태', '', '', ''],
        ['• 이 데이터로는 어떤 의사결정도 권장하지 않음', '', '', ''],
        ['• 측정시스템 전면 재구축이 필요', '', '', ''],
        ['', '', '', ''],
        ['🚨 긴급 대응 필요:', '', '', ''],
        ['1. 측정 중단', '현재 시스템 사용 금지', '부정확한 데이터 방지', ''],
        ['2. 전면 재교육', '측정자 역량 재구축', '기본기 재정립', ''],
        ['3. 장비 교체 검토', '하드웨어 근본 개선', '시스템 재구축', ''],
        ['4. 일간 재평가', '개선 진도 매일 확인', '빠른 회복 추진', '']
      );
    }

    // 세부 지표별 해석
    sections.push(
      ['', '', '', ''],
      ['📊 세부 지표별 해석:', '', '', ''],
      ['', '', '', '']
    );

    // Gage R&R 해석
    if (analysis.gageRRPercent < 10) {
      sections.push(['• Gage R&R: 우수 (< 10%)', '측정 오차가 매우 낮음', '신뢰할 수 있는 측정시스템', '']);
    } else if (analysis.gageRRPercent < 30) {
      sections.push(['• Gage R&R: 양호 (10-30%)', '일반적 용도로 사용 가능', '개선 여지 있음', '']);
    } else {
      sections.push(['• Gage R&R: 개선 필요 (≥ 30%)', '측정 오차가 과도함', '즉시 개선 조치 필요', '']);
    }

    // ICC 해석
    if (analysis.icc >= 0.75) {
      sections.push(['• ICC: 신뢰할 수 있음 (≥ 0.75)', '측정자간 일치도 우수', '측정 절차가 잘 표준화됨', '']);
    } else {
      sections.push(['• ICC: 개선 필요 (< 0.75)', '측정자간 차이 존재', '교육 및 절차 표준화 필요', '']);
    }

    // CV 해석
    if (analysis.cv <= 8) {
      sections.push(['• CV: 일관성 우수 (≤ 8%)', '작업 변동성이 낮음', '표준시간 설정 적합', '']);
    } else {
      sections.push(['• CV: 변동성 큼 (> 8%)', '작업 일관성 부족', '작업 방법 표준화 필요', '']);
    }

    sections.push(['', '', '', '']);

    return sections;
  }

  private generateActionPlan(analysis: any, session: any): string[][] {
    const actionPlan = [
      ['=== 📋 실행 계획 및 후속 조치 ===', '', '', ''],
      ['', '', '', ''],
      ['📅 단계별 실행 계획:', '', '', ''],
      ['단계', '조치사항', '담당', '기한', '예상 효과'],
    ];

    if (analysis.status === 'excellent') {
      actionPlan.push(
        ['1단계', '현행 절차 문서화', '품질관리팀', '1주', '표준화 확산'],
        ['2단계', '분기별 재평가 계획 수립', '측정팀', '2주', '지속적 품질 유지'],
        ['3단계', '우수사례 타 부서 전파', '교육팀', '1개월', '조직 전체 개선']
      );
    } else if (analysis.status === 'acceptable') {
      actionPlan.push(
        ['1단계', '측정자 보수교육 실시', '교육팀', '1주', 'ICC 0.05 향상 목표'],
        ['2단계', '장비 정밀 교정', '기술팀', '2주', '반복성 20% 개선'],
        ['3단계', '월별 모니터링 체계 구축', '품질팀', '3주', '지속적 개선 추적']
      );
    } else if (analysis.status === 'marginal') {
      actionPlan.push(
        ['1단계', '긴급 교육 프로그램 실시', '교육팀', '3일', '기본 역량 재구축'],
        ['2단계', '장비 전면 점검 및 교정', '기술팀', '1주', '하드웨어 신뢰성 확보'],
        ['3단계', '주간 재평가 실시', '측정팀', '매주', '개선 효과 즉시 확인'],
        ['4단계', '절차 재정립', '품질팀', '2주', '측정 표준화 재구축']
      );
    } else {
      actionPlan.push(
        ['1단계', '즉시 측정 중단', '관리팀', '즉시', '부정확한 데이터 방지'],
        ['2단계', '전면 재교육 프로그램', '교육팀', '1주', '측정자 역량 재구축'],
        ['3단계', '장비 교체 검토', '기술팀', '2주', '근본적 하드웨어 개선'],
        ['4단계', '새로운 절차 구축', '품질팀', '3주', '측정시스템 재구축'],
        ['5단계', '일간 재평가', '측정팀', '매일', '빠른 개선 진도 확인']
      );
    }

    actionPlan.push(
      ['', '', '', '', ''],
      ['📋 장기 개선 계획 (3개월):', '', '', ''],
      ['목표', '세부사항', '측정지표', '목표값', ''],
      ['측정시스템 신뢰성 향상', 'Gage R&R 개선', 'R&R %', '< 10%', ''],
      ['측정자간 일치도 향상', '교육 및 표준화', 'ICC', '≥ 0.80', ''],
      ['작업 일관성 확보', '공정 표준화', 'CV', '≤ 6%', ''],
      ['', '', '', '', ''],
      ['📞 지원 체계:', '', '', ''],
      ['구분', '담당부서', '연락처', '역할', ''],
      ['기술 지원', '시스템관리팀', '내선 1234', '장비 및 소프트웨어 지원', ''],
      ['교육 지원', '인력개발팀', '내선 5678', '측정자 교육 프로그램', ''],
      ['품질 관리', '품질보증팀', '내선 9012', '분석 결과 검토 및 승인', ''],
      ['', '', '', '', '']
    );

    return actionPlan;
  }

  private classifyMeasurement(time: number, analysis: any): string {
    const mean = analysis.q99 / 2; // 대략적인 평균 추정
    const std = analysis.totalVariation || 1000;
    
    if (time < mean - 2 * std) return '매우 빠름';
    if (time < mean - std) return '빠름';
    if (time > mean + 2 * std) return '매우 느림';
    if (time > mean + std) return '느림';
    return '정상 범위';
  }

  formatMeasurementData(session: SessionData, lapTimes: LapTime[]): string[][] {
    const headers = ['세션명', '작업유형', '측정자', '대상자', '측정시간', '타임스탬프'];
    const rows = lapTimes.map(lap => [
      session.name || '',
      session.workType || '',
      lap.operator || '',
      lap.target || '',
      this.timeFormatter.format(lap.time || 0),
      lap.timestamp || ''
    ]);

    return [headers, ...rows];
  }

  formatAnalysisData(session: SessionData, lapTimes: LapTime[], analysis: GageRRResult): string[][] {
    // 데이터 유효성 검증 강화
    if (!analysis || typeof analysis !== 'object') {
      console.warn('분석 결과가 유효하지 않습니다');
      return [['오류', '분석 결과를 불러올 수 없습니다']];
    }

    // 세션 및 lapTimes 검증 추가
    if (!session || !lapTimes || lapTimes.length === 0) {
      console.warn('세션 또는 측정 데이터가 유효하지 않습니다');
      return [['오류', '세션 또는 측정 데이터를 불러올 수 없습니다']];
    }

    // 필수 속성 존재 여부 확인 및 안전한 기본값 설정
    const safeAnalysis = {
      status: analysis.status || 'unacceptable',
      gageRRPercent: Number(analysis.gageRRPercent) || 0,
      icc: Number(analysis.icc) || 0,
      deltaPair: Number(analysis.deltaPair) || 0,
      cv: Number(analysis.cv) || 0,
      repeatability: Number(analysis.repeatability) || 0,
      reproducibility: Number(analysis.reproducibility) || 0,
      partVariation: Number(analysis.partVariation) || 0,
      totalVariation: Number(analysis.totalVariation) || 0,
      q95: Number(analysis.q95) || 0,
      q99: Number(analysis.q99) || 0,
      q999: Number(analysis.q999) || 0,
      isReliableForStandard: Boolean(analysis.isReliableForStandard),
      // 추가 안전성 확보
      ndc: Number(analysis.ndc) || 0,
      ptRatio: Number(analysis.ptRatio) || 0,
      cpk: Number(analysis.cpk) || 0
    };

    // 상세분석 모달과 완전 동기화된 Excel 보고서 생성
    const statusText = safeAnalysis.status === 'excellent' ? '우수' :
                      safeAnalysis.status === 'acceptable' ? '양호' :
                      safeAnalysis.status === 'marginal' ? '보통' : '불량';

    // 📋 보고서 헤더 및 요약 정보
    const reportHeader = [
      ['===============================================================================', '', '', ''],
      ['             🏭 국방부 물류창 작업시간 측정 시스템 (Gage R&R) 분석 보고서             ', '', '', ''],
      ['===============================================================================', '', '', ''],
      ['', '', '', ''],
      ['📅 보고서 생성일시:', new Date().toLocaleString('ko-KR'), '', ''],
      ['📊 분석 대상:', session.name || '미정의', '', ''],
      ['🏷️ 작업 유형:', session.workType || '미정의', '', ''],
      ['👥 참여 측정자:', (session.operators || []).join(', '), '', ''],
      ['🎯 측정 대상자:', (session.targets || []).join(', '), '', ''],
      ['📈 총 측정 횟수:', lapTimes.length.toString(), '회', ''],
      ['', '', '', ''],
    ];

    // 📊 종합 평가 및 핵심 결과
    const executiveSummary = [
      ['=== 🏆 종합 평가 및 핵심 결과 ===', '', '', ''],
      ['', '', '', ''],
      ['최종 평가 등급:', statusText, '', this.getStatusDescription(safeAnalysis.status)],
      ['측정시스템 신뢰도:', safeAnalysis.gageRRPercent < 10 ? '매우 높음' : 
                          safeAnalysis.gageRRPercent < 30 ? '높음' : 
                          safeAnalysis.gageRRPercent < 50 ? '보통' : '낮음', '', ''],
      ['표준시간 설정 적합성:', safeAnalysis.isReliableForStandard ? '✅ 적합' : '❌ 부적합', '', ''],
      ['', '', '', ''],
      ['💡 핵심 요약:', '', '', ''],
      [`• Gage R&R: ${this.safeFormat(safeAnalysis.gageRRPercent, 1)}%`, 
       `(${safeAnalysis.gageRRPercent < 10 ? '우수' : safeAnalysis.gageRRPercent < 30 ? '양호' : '개선필요'})`, '', ''],
      [`• 측정자간 신뢰성(ICC): ${this.safeFormat(safeAnalysis.icc, 3)}`, 
       `(${safeAnalysis.icc >= 0.75 ? '신뢰할 수 있음' : '개선 필요'})`, '', ''],
      [`• 작업 일관성(CV): ${this.safeFormat(safeAnalysis.cv, 1)}%`, 
       `(${safeAnalysis.cv <= 8 ? '일관성 우수' : '변동성 큼'})`, '', ''],
      ['', '', '', ''],
    ];

    // 📈 상세 분석 지표 (구체적 설명 포함)
    const detailedMetrics = [
      ['=== 📈 상세 분석 지표 해석 ===', '', '', ''],
      ['', '', '', ''],
      ['📌 1. Gage R&R 분석 (측정시스템 분석)', '', '', ''],
      ['지표명', '측정값', '단위', '의미 및 해석'],
      ['Gage R&R 비율', this.safeFormat(safeAnalysis.gageRRPercent, 1), '%', 
       '전체 변동 중 측정시스템 오차 비율. <10%: 우수, 10-30%: 양호, >30%: 개선필요'],
      ['', '', '', ''],
      ['📌 2. 분산 구성요소 분석', '', '', ''],
      ['구성요소', '표준편차(ms)', '설명', '개선 방향'],
      ['반복성 (Repeatability)', this.safeFormat(safeAnalysis.repeatability, 2), 
       '같은 측정자가 같은 대상을 반복 측정할 때의 변동', '장비 정밀도, 측정 환경 개선'],
      ['재현성 (Reproducibility)', this.safeFormat(safeAnalysis.reproducibility, 2), 
       '서로 다른 측정자 간의 측정 변동', '측정자 교육, 절차 표준화'],
      ['대상자 변동 (Part Variation)', this.safeFormat(safeAnalysis.partVariation, 2), 
       '대상자(작업자)간 실제 능력 차이', '실제 작업 능력 차이 (정상적 변동)'],
      ['총 변동 (Total Variation)', this.safeFormat(safeAnalysis.totalVariation, 2), 
       '모든 변동 요소의 합계', '전체 측정시스템의 불확실성'],
      ['', '', '', ''],
      ['📌 3. 작업시간 분석 지표', '', '', ''],
      ['지표명', '값', '기준', '해석'],
      ['급내상관계수 (ICC)', this.safeFormat(safeAnalysis.icc, 3), '≥0.75 신뢰', 
       '측정자간 일치도. 높을수록 측정 신뢰성 우수'],
      ['변동계수 (CV)', this.safeFormat(safeAnalysis.cv, 1) + '%', '≤8% 우수', 
       '평균 대비 변동성. 낮을수록 작업 일관성 우수'],
      ['ΔPair (측정자간 차이)', this.safeFormat(safeAnalysis.deltaPair, 3), '낮을수록 좋음', 
       '측정자 A와 B의 평균 차이. 교육 효과 지표'],
      ['', '', '', ''],
      ['📌 4. 작업시간 예측 분위수', '', '', ''],
      ['분위수', '시간(초)', '확률', '활용 방안'],
      ['Q95 (95% 달성시간)', this.safeFormat(safeAnalysis.q95 / 1000, 2), '95%', 
       '95% 확률로 이 시간 내 작업 완료'],
      ['Q99 (99% 달성시간)', this.safeFormat(safeAnalysis.q99 / 1000, 2), '99%', 
       '표준시간 설정 기준 (보수적 접근)'],
      ['Q99.9 (99.9% 달성시간)', this.safeFormat(safeAnalysis.q999 / 1000, 2), '99.9%', 
       '최대 허용시간 (이상 상황 대비)'],
      ['', '', '', ''],
    ];

    // 📋 상세 해석 및 권장사항
    const interpretation = this.generateDetailedInterpretation(safeAnalysis);

    // 📊 통계적 근거 및 방법론
    const methodology = [
      ['=== 📊 통계적 근거 및 분석 방법론 ===', '', '', ''],
      ['', '', '', ''],
      ['📌 분석 표준 및 근거', '', '', ''],
      ['항목', '내용', '근거', ''],
      ['분석 표준', 'MSA-4 (Measurement Systems Analysis)', 'AIAG/ASQ 표준', ''],
      ['통계 방법', 'ANOVA (Analysis of Variance)', '분산분석 기반 측정시스템 평가', ''],
      ['신뢰도 지표', 'ICC(2,1) - Intraclass Correlation', 'ISO 5725 표준 참조', ''],
      ['변동성 지표', 'CV (Coefficient of Variation)', '물류작업 특성 반영', ''],
      ['', '', '', ''],
      ['📌 평가 기준 (물류작업 특화)', '', '', ''],
      ['작업유형', 'CV 기준', 'ICC 기준', '근거'],
      ['피킹 작업', '≤ 6%', '≥ 0.80', '고정밀 요구 작업'],
      ['검수 작업', '≤ 7%', '≥ 0.78', '정확성 중시 작업'],
      ['운반 작업', '≤ 10%', '≥ 0.70', '환경 변수 고려'],
      ['적재 작업', '≤ 12%', '≥ 0.65', '물리적 변동 허용'],
      ['', '', '', ''],
      ['📌 데이터 품질 검증', '', '', ''],
      ['검증 항목', '결과', '기준', '상태'],
      ['최소 측정 횟수', lapTimes.length.toString() + '회', '≥ 10회', 
       lapTimes.length >= 10 ? '✅ 충족' : '❌ 부족'],
      ['측정자 수', (session.operators || []).length.toString() + '명', '≥ 2명', 
       (session.operators || []).length >= 2 ? '✅ 충족' : '❌ 부족'],
      ['대상자 수', (session.targets || []).length.toString() + '명', '≥ 3명', 
       (session.targets || []).length >= 3 ? '✅ 충족' : '❌ 부족'],
      ['', '', '', ''],
    ];

    // 📋 실행 계획 및 후속 조치
    const actionPlan = this.generateActionPlan(safeAnalysis, session);

    // 📊 측정 기록 상세 데이터
    const measurementDetails = [
      ['=== 📊 측정 기록 상세 데이터 ===', '', '', ''],
      ['', '', '', ''],
      ['번호', '측정자', '대상자', '측정시간(초)', '타임스탬프', '비고'],
      ...lapTimes.map((lap, index) => [
        (index + 1).toString(),
        lap.operator || '',
        lap.target || '',
        ((lap.time || 0) / 1000).toFixed(3),
        lap.timestamp || '',
        this.classifyMeasurement(lap.time, safeAnalysis)
      ]),
      ['', '', '', '', '', ''],
      ['📈 측정 데이터 통계', '', '', '', '', ''],
      ['평균', this.safeFormat(lapTimes.reduce((sum, lap) => sum + lap.time, 0) / lapTimes.length / 1000, 3) + '초', '', '', '', ''],
      ['표준편차', this.safeFormat(safeAnalysis.totalVariation / 1000, 3) + '초', '', '', '', ''],
      ['최솟값', this.safeFormat(Math.min(...lapTimes.map(lap => lap.time)) / 1000, 3) + '초', '', '', '', ''],
      ['최댓값', this.safeFormat(Math.max(...lapTimes.map(lap => lap.time)) / 1000, 3) + '초', '', '', '', ''],
      ['', '', '', '', '', ''],
    ];

    // 📋 보고서 푸터
    const reportFooter = [
      ['===============================================================================', '', '', ''],
      ['                           📋 보고서 생성 정보                                ', '', '', ''],
      ['===============================================================================', '', '', ''],
      ['생성 시스템:', '국방부 물류창 작업시간 측정 시스템 v1.0', '', ''],
      ['생성 일시:', new Date().toLocaleString('ko-KR'), '', ''],
      ['분석 엔진:', 'Gage R&R MSA-4 호환', '', ''],
      ['보고서 형식:', 'CSV (Excel 호환)', '', ''],
      ['', '', '', ''],
      ['⚠️ 주의사항:', '', '', ''],
      ['1. 본 보고서는 통계적 분석 결과이며, 실무 적용 시 현장 상황을 고려하세요.', '', '', ''],
      ['2. 측정시스템이 "불량" 판정된 경우 즉시 개선 조치를 취하세요.', '', '', ''],
      ['3. 정기적인 측정시스템 재평가를 권장합니다 (분기별).', '', '', ''],
      ['4. 문의사항은 시스템 관리자에게 연락하세요.', '', '', ''],
      ['===============================================================================', '', '', ''],
    ];

    return [
      ...reportHeader,
      ...executiveSummary,
      ...detailedMetrics,
      ...interpretation,
      ...methodology,
      ...actionPlan,
      ...measurementDetails,
      ...reportFooter
    ];
  }
}

/**
 * CSV 파일 익스포터 (Single Responsibility Principle)
 */
class CSVFileExporter implements IFileExporter {
  export(data: string[][], filename: string): boolean {
    try {
      // 데이터 유효성 검증 및 정리
      const validData = data.filter(row => Array.isArray(row) && row.length > 0);
      
      if (validData.length === 0) {
        console.warn('내보낼 데이터가 없습니다.');
        return false;
      }

      // CSV 형식으로 변환 (개선된 안전한 이스케이프 처리)
      const csvContent = validData.map(row => 
        row.map(cell => {
          // null, undefined, NaN, Infinity 안전 처리
          let cellStr = '';
          if (cell !== null && cell !== undefined && 
              !Number.isNaN(cell) && !Number.isNaN(Number(cell)) && 
              Number.isFinite(Number(cell))) {
            cellStr = String(cell).trim();
          }
          
          // 빈 문자열이나 잘못된 값 처리
          if (cellStr === '' || cellStr === 'undefined' || cellStr === 'null') {
            return '""';
          }
          
          // 특수문자 및 한글 처리 개선
          if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('\r') || 
              cellStr.includes('"') || cellStr.includes(';') || /[가-힣]/.test(cellStr)) {
            return `"${cellStr.replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
          }
          
          return cellStr;
        }).join(',')
      ).join('\r\n');
      
      // UTF-8 BOM 추가 + 강화된 인코딩
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { 
        type: 'text/csv;charset=utf-8;' 
      });
      
      // 파일명 안전성 검증
      const safeFilename = filename.replace(/[<>:"/\\|?*]/g, '_');
      
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', safeFilename);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      
      // 클릭 이벤트 처리 개선
      setTimeout(() => {
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, 100);
      }, 100);
      
      return true;
    } catch (error) {
      console.error('CSV 내보내기 오류:', error);
      return false;
    }
  }
}

/**
 * 파일명 생성기 (Single Responsibility Principle)
 */
class FilenameGenerator {
  static generateMeasurementFilename(sessionName: string): string {
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const time = now.toTimeString().slice(0, 8).replace(/:/g, '');
    return `측정기록_${sessionName}_${date}_${time}.csv`;
  }

  static generateAnalysisFilename(sessionName: string): string {
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const time = now.toTimeString().slice(0, 8).replace(/:/g, '');
    return `상세분석보고서_${sessionName}_${date}_${time}.csv`;
  }
}

/**
 * 익스포트 팩토리 (Dependency Inversion Principle)
 */
class ExportFactory {
  static createTimeFormatter(): ITimeFormatter {
    return new TimeFormatter();
  }

  static createDataFormatter(): IDataFormatter {
    return new DataFormatter(this.createTimeFormatter());
  }

  static createFileExporter(): IFileExporter {
    return new CSVFileExporter();
  }
}

/**
 * 통합 익스포트 서비스 (Facade Pattern + Open/Closed Principle)
 */
export class ExportService {
  private static timeFormatter = ExportFactory.createTimeFormatter();
  private static dataFormatter = ExportFactory.createDataFormatter();
  private static fileExporter = ExportFactory.createFileExporter();

  static formatTime(milliseconds: number): string {
    return this.timeFormatter.format(milliseconds);
  }

  static exportMeasurementData(session: SessionData, lapTimes: LapTime[]): boolean {
    try {
      if (!session || !lapTimes || lapTimes.length === 0) {
        return false;
      }

      const data = this.dataFormatter.formatMeasurementData(session, lapTimes);
      const filename = FilenameGenerator.generateMeasurementFilename(session.name);
      
      return this.fileExporter.export(data, filename);
    } catch (error) {
      console.error('측정 데이터 내보내기 오류:', error);
      return false;
    }
  }

  static exportDetailedAnalysis(session: SessionData, lapTimes: LapTime[], analysis: GageRRResult): boolean {
    try {
      if (!session || !lapTimes || !analysis) {
        return false;
      }

      // 상세분석 모달과 동일한 분석 지표들을 포함한 데이터 생성
      const enhancedAnalysis = {
        ...analysis,
        // 상세분석 모달에서 사용하는 모든 지표들 포함
        icc: analysis.icc || 0,
        cv: analysis.cv || 0,
        q99: analysis.q99 || 0,
        isReliableForStandard: analysis.isReliableForStandard || false,
        deltaPair: analysis.deltaPair || 0
      };

      const data = this.dataFormatter.formatAnalysisData(session, lapTimes, enhancedAnalysis);
      const filename = FilenameGenerator.generateAnalysisFilename(session.name);
      
      return this.fileExporter.export(data, filename);
    } catch (error) {
      console.error('상세분석 보고서 내보내기 오류:', error);
      return false;
    }
  }
}
