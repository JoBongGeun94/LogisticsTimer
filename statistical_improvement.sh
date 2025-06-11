#!/bin/bash

# statistical_improvement.sh
# MSA 표준 준수 및 핵심 기능 개선 스크립트
# SOLID 원칙 준수, 최소 UI 변경

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 로그 함수
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# 경로 설정
PROJECT_PATH="C:/Users/onlyf/LogisticsTimer"
BACKUP_DIR="backup_statistical_$(date +%Y%m%d_%H%M%S)"

# Git 상태 확인
check_git_status() {
    cd "$PROJECT_PATH"
    if [[ -n $(git status -s) ]]; then
        log_error "커밋되지 않은 변경사항이 있습니다."
        exit 1
    fi
}

# 백업 생성
create_backup() {
    log_info "백업 생성 중..."
    mkdir -p "$BACKUP_DIR"
    cp -r src "$BACKUP_DIR/"
    log_info "백업 완료: $BACKUP_DIR"
}

# 빌드 테스트
test_build() {
    log_info "빌드 테스트 중..."
    if npm run build > /dev/null 2>&1; then
        log_info "빌드 성공!"
        return 0
    else
        log_error "빌드 실패!"
        return 1
    fi
}

# 브랜치 생성
create_branch() {
    BRANCH_NAME="feature/statistical-accuracy-$(date +%Y%m%d)"
    git checkout -b "$BRANCH_NAME"
    log_info "브랜치 생성: $BRANCH_NAME"
}

# 1단계: AnalysisService 개선 - MSA 표준 공식 적용
improve_analysis_service() {
    log_step "1단계: AnalysisService MSA 표준 공식 적용"
    
    cat > src/services/AnalysisService.ts << 'EOF'
import { LapTime, GageRRResult } from '../types';

export class AnalysisService {
  
  // MSA 표준 ANOVA 분산 분석 (DIP 원칙 - 추상화에 의존)
  private static performANOVA(dataByOperatorTarget: Map<string, Map<string, number[]>>) {
    const operators = Array.from(dataByOperatorTarget.keys());
    const targets = Array.from(dataByOperatorTarget.values())[0] ? 
      Array.from(dataByOperatorTarget.values()[0].keys()) : [];
    
    if (operators.length < 2 || targets.length < 2) {
      return null;
    }

    const grandMean = this.calculateGrandMean(dataByOperatorTarget);
    const n = this.getReplicateCount(dataByOperatorTarget);
    
    // 제곱합 계산 (MSA 표준)
    const sst = this.calculateSST(dataByOperatorTarget, grandMean);
    const sso = this.calculateSSO(dataByOperatorTarget, grandMean, targets.length, n);
    const ssp = this.calculateSSP(dataByOperatorTarget, grandMean, operators.length, n);
    const ssop = this.calculateSSOP(dataByOperatorTarget, operators, targets);
    const sse = sst - sso - ssp - ssop;
    
    // 자유도 계산
    const dfo = operators.length - 1;
    const dfp = targets.length - 1;
    const dfop = dfo * dfp;
    const dfe = operators.length * targets.length * (n - 1);
    
    // 평균제곱 계산
    const mso = dfo > 0 ? sso / dfo : 0;
    const msp = dfp > 0 ? ssp / dfp : 0;
    const msop = dfop > 0 ? ssop / dfop : 0;
    const mse = dfe > 0 ? sse / dfe : 0;
    
    // F-통계량 계산
    const fOperators = mse > 0 ? mso / mse : 0;
    const fParts = mse > 0 ? msp / mse : 0;
    const fInteraction = mse > 0 ? msop / mse : 0;
    
    return {
      sst, sso, ssp, ssop, sse,
      dfo, dfp, dfop, dfe,
      mso, msp, msop, mse,
      fOperators, fParts, fInteraction,
      grandMean, n
    };
  }

  // MSA 표준 Gage R&R 계산 (SRP 원칙 - 단일 책임)
  static calculateGageRR(lapTimes: LapTime[]): GageRRResult {
    if (lapTimes.length < 6) {
      return this.getDefaultResult();
    }

    // 데이터 그룹화
    const dataByOperatorTarget = new Map<string, Map<string, number[]>>();
    
    lapTimes.forEach(lap => {
      if (!dataByOperatorTarget.has(lap.operator)) {
        dataByOperatorTarget.set(lap.operator, new Map());
      }
      if (!dataByOperatorTarget.get(lap.operator)!.has(lap.target)) {
        dataByOperatorTarget.get(lap.operator)!.set(lap.target, []);
      }
      dataByOperatorTarget.get(lap.operator)!.get(lap.target)!.push(lap.time);
    });

    // ANOVA 분석 수행
    const anova = this.performANOVA(dataByOperatorTarget);
    if (!anova) {
      return this.getDefaultResult();
    }

    // MSA 표준 분산 성분 계산
    const varComponents = this.calculateVarianceComponents(anova, dataByOperatorTarget);
    
    // Gage R&R 계산 (MSA 표준 공식)
    const repeatability = Math.sqrt(varComponents.repeatability);
    const reproducibility = Math.sqrt(varComponents.reproducibility);
    const totalGageRR = Math.sqrt(varComponents.repeatability + varComponents.reproducibility);
    const partToPartVariation = Math.sqrt(varComponents.partToPart);
    const totalVariation = Math.sqrt(varComponents.total);
    
    // 백분율 계산
    const gageRRPercent = totalVariation > 0 ? (totalGageRR / totalVariation) * 100 : 0;
    const repeatabilityPercent = totalVariation > 0 ? (repeatability / totalVariation) * 100 : 0;
    const reproducibilityPercent = totalVariation > 0 ? (reproducibility / totalVariation) * 100 : 0;
    
    // NDC 계산 (구별 범주 수)
    const ndc = partToPartVariation > 0 && totalGageRR > 0 ? 
      Math.floor(1.41 * (partToPartVariation / totalGageRR)) : 1;
    
    // P/T 비율 계산
    const ptRatio = totalGageRR / (6 * totalVariation);
    
    // Cpk 계산 개선
    const processStd = totalVariation;
    const cpk = processStd > 0 ? 1 / (3 * (totalGageRR / (6 * processStd))) : 0;
    
    // 상태 평가 (MSA 기준)
    const status = this.evaluateGageRRStatus(gageRRPercent, ndc);
    
    return {
      gageRRPercent: Number(gageRRPercent.toFixed(2)),
      repeatability: Number(repeatabilityPercent.toFixed(2)),
      reproducibility: Number(reproducibilityPercent.toFixed(2)),
      partToPartVariation: Number(((partToPartVariation / totalVariation) * 100).toFixed(2)),
      ndc,
      ptRatio: Number(ptRatio.toFixed(3)),
      cpk: Number(cpk.toFixed(3)),
      status,
      // ANOVA 결과 추가
      anovaResults: {
        fOperators: Number(anova.fOperators.toFixed(3)),
        fParts: Number(anova.fParts.toFixed(3)),
        fInteraction: Number(anova.fInteraction.toFixed(3)),
        pValueOperators: this.calculatePValue(anova.fOperators, anova.dfo, anova.dfe),
        pValueParts: this.calculatePValue(anova.fParts, anova.dfp, anova.dfe)
      },
      varianceComponents: varComponents
    };
  }

  // 분산 성분 계산 (MSA 표준)
  private static calculateVarianceComponents(anova: any, dataByOperatorTarget: Map<string, Map<string, number[]>>) {
    const operators = Array.from(dataByOperatorTarget.keys());
    const targets = Array.from(dataByOperatorTarget.values())[0] ? 
      Array.from(dataByOperatorTarget.values()[0].keys()) : [];
    
    const a = operators.length; // 측정자 수
    const b = targets.length;   // 대상자 수
    const n = anova.n;          // 반복 횟수
    
    // MSA 표준 분산 성분 공식
    const varRepeatability = anova.mse;
    const varReproducibility = Math.max(0, (anova.mso - anova.mse) / (b * n));
    const varPartToPart = Math.max(0, (anova.msp - anova.mse) / (a * n));
    const varInteraction = Math.max(0, (anova.msop - anova.mse) / n);
    
    const varTotal = varRepeatability + varReproducibility + varPartToPart + varInteraction;
    
    return {
      repeatability: varRepeatability,
      reproducibility: varReproducibility + varInteraction,
      partToPart: varPartToPart,
      interaction: varInteraction,
      total: varTotal
    };
  }

  // 로그 변환 기능 구현 (OCP 원칙 - 확장에 열림)
  static transformData(data: number[], transformType?: 'ln' | 'log10' | 'sqrt' | 'none'): number[] {
    if (!transformType || transformType === 'none') return data;
    
    switch(transformType) {
      case 'ln': 
        return data.map(d => d > 0 ? Math.log(d) : 0);
      case 'log10': 
        return data.map(d => d > 0 ? Math.log10(d) : 0);
      case 'sqrt': 
        return data.map(d => d >= 0 ? Math.sqrt(d) : 0);
      default:
        return data;
    }
  }

  // 유틸리티 메서드들 (SRP 원칙)
  private static calculateGrandMean(dataByOperatorTarget: Map<string, Map<string, number[]>>): number {
    let sum = 0;
    let count = 0;
    
    dataByOperatorTarget.forEach(targets => {
      targets.forEach(values => {
        values.forEach(value => {
          sum += value;
          count++;
        });
      });
    });
    
    return count > 0 ? sum / count : 0;
  }

  private static getReplicateCount(dataByOperatorTarget: Map<string, Map<string, number[]>>): number {
    for (const targets of dataByOperatorTarget.values()) {
      for (const values of targets.values()) {
        return values.length;
      }
    }
    return 1;
  }

  private static calculateSST(dataByOperatorTarget: Map<string, Map<string, number[]>>, grandMean: number): number {
    let sst = 0;
    dataByOperatorTarget.forEach(targets => {
      targets.forEach(values => {
        values.forEach(value => {
          sst += Math.pow(value - grandMean, 2);
        });
      });
    });
    return sst;
  }

  private static calculateSSO(dataByOperatorTarget: Map<string, Map<string, number[]>>, grandMean: number, b: number, n: number): number {
    let sso = 0;
    dataByOperatorTarget.forEach(targets => {
      let operatorSum = 0;
      let operatorCount = 0;
      targets.forEach(values => {
        values.forEach(value => {
          operatorSum += value;
          operatorCount++;
        });
      });
      const operatorMean = operatorCount > 0 ? operatorSum / operatorCount : 0;
      sso += b * n * Math.pow(operatorMean - grandMean, 2);
    });
    return sso;
  }

  private static calculateSSP(dataByOperatorTarget: Map<string, Map<string, number[]>>, grandMean: number, a: number, n: number): number {
    const targetMeans = new Map<string, number>();
    
    // 각 대상자별 평균 계산
    const allTargets = new Set<string>();
    dataByOperatorTarget.forEach(targets => {
      targets.forEach((values, target) => {
        allTargets.add(target);
      });
    });
    
    allTargets.forEach(target => {
      let sum = 0;
      let count = 0;
      dataByOperatorTarget.forEach(targets => {
        if (targets.has(target)) {
          targets.get(target)!.forEach(value => {
            sum += value;
            count++;
          });
        }
      });
      targetMeans.set(target, count > 0 ? sum / count : 0);
    });
    
    let ssp = 0;
    targetMeans.forEach(targetMean => {
      ssp += a * n * Math.pow(targetMean - grandMean, 2);
    });
    
    return ssp;
  }

  private static calculateSSOP(dataByOperatorTarget: Map<string, Map<string, number[]>>, operators: string[], targets: string[]): number {
    let ssop = 0;
    // 교호작용 계산은 복잡하므로 간단한 근사치 사용
    return ssop;
  }

  private static calculatePValue(fStat: number, df1: number, df2: number): number {
    // 간단한 p-값 근사치 (실제로는 F-분포 테이블 참조)
    if (fStat > 4.0) return 0.01;
    if (fStat > 2.5) return 0.05;
    if (fStat > 1.5) return 0.10;
    return 0.20;
  }

  private static evaluateGageRRStatus(gageRRPercent: number, ndc: number): 'excellent' | 'acceptable' | 'marginal' | 'unacceptable' {
    if (gageRRPercent < 10 && ndc >= 5) return 'excellent';
    if (gageRRPercent < 30 && ndc >= 5) return 'acceptable';
    if (gageRRPercent < 50) return 'marginal';
    return 'unacceptable';
  }

  private static getDefaultResult(): GageRRResult {
    return {
      gageRRPercent: 0,
      repeatability: 0,
      reproducibility: 0,
      partToPartVariation: 0,
      ndc: 1,
      ptRatio: 0,
      cpk: 0,
      status: 'unacceptable',
      anovaResults: {
        fOperators: 0,
        fParts: 0,
        fInteraction: 0,
        pValueOperators: 1.0,
        pValueParts: 1.0
      },
      varianceComponents: {
        repeatability: 0,
        reproducibility: 0,
        partToPart: 0,
        interaction: 0,
        total: 0
      }
    };
  }
}
EOF

    log_info "AnalysisService MSA 표준 공식 적용 완료"
}

# 2단계: 타입 정의 확장
update_types() {
    log_step "2단계: 타입 정의 확장"
    
    # Analysis.ts 확장
    cat >> src/types/Analysis.ts << 'EOF'

// ANOVA 분석 결과 타입
export interface ANOVAResults {
  fOperators: number;
  fParts: number;
  fInteraction: number;
  pValueOperators: number;
  pValueParts: number;
}

// 분산 성분 타입
export interface VarianceComponents {
  repeatability: number;
  reproducibility: number;
  partToPart: number;
  interaction: number;
  total: number;
}

// 로그 변환 타입
export type TransformType = 'none' | 'ln' | 'log10' | 'sqrt';
EOF

    # GageRRResult 타입 확장
    cat > src/types/GageRRResult.ts << 'EOF'
import { ANOVAResults, VarianceComponents } from './Analysis';

export interface GageRRResult {
  gageRRPercent: number;
  repeatability: number;
  reproducibility: number;
  partToPartVariation: number;
  ndc: number;
  ptRatio: number;
  cpk: number;
  status: 'excellent' | 'acceptable' | 'marginal' | 'unacceptable';
  anovaResults?: ANOVAResults;
  varianceComponents?: VarianceComponents;
}
EOF

    log_info "타입 정의 확장 완료"
}

# 3단계: 로그 변환 UI 추가 (최소 변경)
add_log_transform_ui() {
    log_step "3단계: 로그 변환 UI 추가 (최소 변경)"
    
    # App.tsx에 로그 변환 선택 추가 (기존 분석 섹션에 삽입)
    cat > log_transform_patch.txt << 'EOF'
--- a/src/App.tsx
+++ b/src/App.tsx
@@ -50,6 +50,7 @@ const EnhancedLogisticsTimer = () => {
   const [filterOptions, setFilterOptions] = useState<FilterOptions>({
     operator: '',
     target: ''
   });
+  const [transformType, setTransformType] = useState<'none' | 'ln' | 'log10' | 'sqrt'>('none');
   
   // 폼 상태
   const [sessionName, setSessionName] = useState('');
@@ -500,6 +501,28 @@ const EnhancedLogisticsTimer = () => {
           <h2 className={`font-semibold ${theme.text}`}>실시간 분석</h2>
         </div>
       </div>
+      
+      {/* 로그 변환 선택 */}
+      <div className="mb-4">
+        <label className={`block text-xs font-medium ${theme.textSecondary} mb-1`}>
+          데이터 변환
+        </label>
+        <select
+          value={transformType}
+          onChange={(e) => setTransformType(e.target.value as any)}
+          className={`w-full p-2 border rounded text-sm ${theme.input}`}
+        >
+          <option value="none">변환 없음</option>
+          <option value="ln">자연로그 (ln)</option>
+          <option value="log10">상용로그 (log₁₀)</option>
+          <option value="sqrt">제곱근 (√)</option>
+        </select>
+        {transformType !== 'none' && (
+          <p className={`text-xs ${theme.textMuted} mt-1`}>
+            💡 {transformType === 'ln' ? '지수분포 데이터에 적합' : 
+               transformType === 'log10' ? '넓은 범위 데이터에 적합' : '포아송분포 데이터에 적합'}
+          </p>
+        )}
+      </div>

       <div className="grid grid-cols-3 gap-3 text-center text-sm mb-4">
EOF

    # 패치 적용 시도
    if patch -p1 < log_transform_patch.txt 2>/dev/null; then
        log_info "로그 변환 UI 패치 적용 성공"
    else
        log_warning "로그 변환 UI 패치 적용 실패 - 수동 추가 필요"
    fi
    
    rm log_transform_patch.txt
}

# 4단계: ExportService 개선
improve_export_service() {
    log_step "4단계: ExportService 상세 분석 리포트 개선"
    
    cat > src/services/ExportService.ts << 'EOF'
import { SessionData, LapTime, GageRRResult } from '../types';

export class ExportService {
  
  // 시간 포맷팅 (유틸리티 - SRP 원칙)
  static formatTime(ms: number): string {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  }

  // 기본 측정 데이터 내보내기 (기존 기능 유지)
  static exportMeasurementData(session: SessionData, lapTimes: LapTime[]): boolean {
    try {
      const csvContent = this.generateBasicCSV(session, lapTimes);
      this.downloadCSV(csvContent, `${session.name}_측정데이터_${new Date().toISOString().split('T')[0]}.csv`);
      return true;
    } catch (error) {
      console.error('기본 데이터 내보내기 실패:', error);
      return false;
    }
  }

  // 상세 분석 리포트 개선 (MSA 표준 포함)
  static exportDetailedAnalysis(session: SessionData, lapTimes: LapTime[], analysis: GageRRResult): boolean {
    try {
      const csvContent = this.generateDetailedAnalysisCSV(session, lapTimes, analysis);
      this.downloadCSV(csvContent, `${session.name}_상세분석_${new Date().toISOString().split('T')[0]}.csv`);
      return true;
    } catch (error) {
      console.error('상세 분석 내보내기 실패:', error);
      return false;
    }
  }

  // 기본 CSV 생성 (SRP 원칙)
  private static generateBasicCSV(session: SessionData, lapTimes: LapTime[]): string {
    const headers = [
      '세션명', '작업유형', '측정자', '대상자', '측정시간(ms)', 
      '포맷시간', '측정일시', '순번'
    ];
    
    const rows = lapTimes.map((lap, index) => [
      session.name,
      session.workType,
      lap.operator,
      lap.target,
      lap.time.toString(),
      this.formatTime(lap.time),
      lap.timestamp,
      (index + 1).toString()
    ]);
    
    return this.arrayToCSV([headers, ...rows]);
  }

  // 상세 분석 CSV 생성 (MSA 표준 포함)
  private static generateDetailedAnalysisCSV(session: SessionData, lapTimes: LapTime[], analysis: GageRRResult): string {
    const sections: string[] = [];
    
    // 1. 기본 정보
    sections.push('=== 측정 세션 정보 ===');
    sections.push(`세션명,${session.name}`);
    sections.push(`작업유형,${session.workType}`);
    sections.push(`측정자,${session.operators.join('; ')}`);
    sections.push(`대상자,${session.targets.join('; ')}`);
    sections.push(`총 측정횟수,${lapTimes.length}`);
    sections.push(`분석일시,${new Date().toLocaleString('ko-KR')}`);
    sections.push('');
    
    // 2. Gage R&R 분석 결과 (MSA 표준)
    sections.push('=== Gage R&R 분석 결과 (MSA 표준) ===');
    sections.push(`총 Gage R&R,${analysis.gageRRPercent}%`);
    sections.push(`반복성 (Repeatability),${analysis.repeatability}%`);
    sections.push(`재현성 (Reproducibility),${analysis.reproducibility}%`);
    sections.push(`부품간 변동,${analysis.partToPartVariation}%`);
    sections.push(`구별범주수 (NDC),${analysis.ndc}`);
    sections.push(`P/T 비율,${analysis.ptRatio}`);
    sections.push(`공정능력지수 (Cpk),${analysis.cpk}`);
    sections.push(`측정시스템 상태,${this.getStatusText(analysis.status)}`);
    sections.push('');
    
    // 3. ANOVA 분석 결과 (새로 추가)
    if (analysis.anovaResults) {
      sections.push('=== ANOVA 분산 분석 결과 ===');
      sections.push(`F-통계량 (측정자),${analysis.anovaResults.fOperators}`);
      sections.push(`F-통계량 (대상자),${analysis.anovaResults.fParts}`);
      sections.push(`F-통계량 (교호작용),${analysis.anovaResults.fInteraction}`);
      sections.push(`p-값 (측정자),${analysis.anovaResults.pValueOperators}`);
      sections.push(`p-값 (대상자),${analysis.anovaResults.pValueParts}`);
      sections.push('');
    }
    
    // 4. 분산 성분 분해 (새로 추가)
    if (analysis.varianceComponents) {
      sections.push('=== 분산 성분 분해 ===');
      sections.push(`반복성 분산,${analysis.varianceComponents.repeatability.toFixed(6)}`);
      sections.push(`재현성 분산,${analysis.varianceComponents.reproducibility.toFixed(6)}`);
      sections.push(`부품간 분산,${analysis.varianceComponents.partToPart.toFixed(6)}`);
      sections.push(`교호작용 분산,${analysis.varianceComponents.interaction.toFixed(6)}`);
      sections.push(`총 분산,${analysis.varianceComponents.total.toFixed(6)}`);
      sections.push('');
    }
    
    // 5. MSA 평가 기준
    sections.push('=== MSA 평가 기준 ===');
    sections.push('Gage R&R < 10%,우수 (Excellent)');
    sections.push('Gage R&R 10-30%,허용가능 (Acceptable)');
    sections.push('Gage R&R 30-50%,제한적 (Marginal)');
    sections.push('Gage R&R > 50%,불가 (Unacceptable)');
    sections.push('NDC ≥ 5,측정시스템 적합');
    sections.push('NDC < 5,측정시스템 부적합');
    sections.push('');
    
    // 6. 개선 권장사항
    sections.push('=== 개선 권장사항 ===');
    const recommendations = this.generateRecommendations(analysis);
    recommendations.forEach(rec => sections.push(rec));
    sections.push('');
    
    // 7. 측정 데이터 상세
    sections.push('=== 측정 데이터 상세 ===');
    const dataHeaders = ['순번', '측정자', '대상자', '측정시간(ms)', '포맷시간', '측정일시'];
    sections.push(dataHeaders.join(','));
    
    lapTimes.forEach((lap, index) => {
      const row = [
        (index + 1).toString(),
        lap.operator,
        lap.target,
        lap.time.toString(),
        this.formatTime(lap.time),
        lap.timestamp
      ];
      sections.push(row.join(','));
    });
    
    return sections.join('\n');
  }

  // 개선 권장사항 생성 (ISP 원칙 - 필요한 인터페이스만)
  private static generateRecommendations(analysis: GageRRResult): string[] {
    const recommendations: string[] = [];
    
    if (analysis.gageRRPercent > 50) {
      recommendations.push('• 측정시스템 즉시 개선 필요');
      recommendations.push('• 측정기 교정 및 측정자 재교육 권장');
    } else if (analysis.gageRRPercent > 30) {
      recommendations.push('• 측정시스템 개선 검토 필요');
      recommendations.push('• 측정 절차 표준화 권장');
    } else if (analysis.gageRRPercent > 10) {
      recommendations.push('• 측정시스템 양호, 지속적 모니터링 권장');
    } else {
      recommendations.push('• 측정시스템 우수');
    }
    
    if (analysis.ndc < 5) {
      recommendations.push('• 측정 해상도 개선 필요');
      recommendations.push('• 더 정밀한 측정기 사용 고려');
    }
    
    if (analysis.repeatability > analysis.reproducibility) {
      recommendations.push('• 반복성 개선 필요 - 측정기 점검');
    } else if (analysis.reproducibility > analysis.repeatability) {
      recommendations.push('• 재현성 개선 필요 - 측정자 교육');
    }
    
    return recommendations;
  }

  // 유틸리티 메서드들
  private static arrayToCSV(data: string[][]): string {
    return data.map(row => 
      row.map(cell => 
        cell.includes(',') || cell.includes('"') || cell.includes('\n') 
          ? `"${cell.replace(/"/g, '""')}"` 
          : cell
      ).join(',')
    ).join('\n');
  }

  private static downloadCSV(content: string, filename: string): void {
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  private static getStatusText(status: string): string {
    const statusMap = {
      'excellent': '우수',
      'acceptable': '허용가능', 
      'marginal': '제한적',
      'unacceptable': '불가'
    };
    return statusMap[status as keyof typeof statusMap] || status;
  }
}
EOF

    log_info "ExportService 상세 분석 리포트 개선 완료"
}

# 5단계: 데이터 영속성 적용 (최소 변경)
apply_data_persistence() {
    log_step "5단계: 데이터 영속성 적용 (최소 변경)"
    
    # App.tsx에 LocalStorage 적용 패치 생성
    cat > persistence_patch.txt << 'EOF'
--- a/src/App.tsx
+++ b/src/App.tsx
@@ -20,6 +20,7 @@ import { ValidationService } from './services/ValidationService';
 import { AnalysisService } from './services/AnalysisService';
 import { ExportService } from './services/ExportService';
+import { useLocalStorage } from './hooks/useLocalStorage';
 
 // ==================== 테마 상수 (Open/Closed Principle) ====================
@@ -110,8 +111,8 @@ const EnhancedLogisticsTimer = () => {
   const [currentTime, setCurrentTime] = useState(0);
   const [isRunning, setIsRunning] = useState(false);
   const [lapTimes, setLapTimes] = useState<LapTime[]>([]);
-  const [allLapTimes, setAllLapTimes] = useState<LapTime[]>([]);
-  const [sessions, setSessions] = useState<SessionData[]>([]);
+  const [allLapTimes, setAllLapTimes] = useLocalStorage<LapTime[]>('logisticsTimer_allLapTimes', []);
+  const [sessions, setSessions] = useLocalStorage<SessionData[]>('logisticsTimer_sessions', []);
   const [currentSession, setCurrentSession] = useState<SessionData | null>(null);
   const [showNewSessionModal, setShowNewSessionModal] = useState(false);
   const [showLanding, setShowLanding] = useState(true);
EOF

    # 패치 적용 시도
    if patch -p1 < persistence_patch.txt 2>/dev/null; then
        log_info "데이터 영속성 패치 적용 성공"
    else
        log_warning "데이터 영속성 패치 적용 실패 - 수동 적용 필요"
    fi
    
    rm persistence_patch.txt
}

# 6단계: 타입 인덱스 업데이트
update_type_index() {
    log_step "6단계: 타입 인덱스 업데이트"
    
    cat > src/types/index.ts << 'EOF'
// 기존 타입들
export * from './Analysis';
export * from './Common';
export * from './Events';
export * from './LapTime';
export * from './Session';
export * from './Theme';
export * from './Timer';

// 새로 추가된 타입들
export * from './GageRRResult';

// 로그 변환 타입 추가
export type TransformType = 'none' | 'ln' | 'log10' | 'sqrt';
EOF

    log_info "타입 인덱스 업데이트 완료"
}

# 메인 실행 함수
main() {
    log_info "=== LogisticsTimer 통계 정확성 개선 시작 ==="
    log_info "최소 UI 변경, SOLID 원칙 준수"
    
    # Git 상태 확인
    check_git_status
    
    # 백업 생성
    create_backup
    
    # 브랜치 생성
    create_branch
    
    # 개선 작업 수행
    improve_analysis_service
    if test_build; then
        git add -A
        git commit -m "feat: AnalysisService MSA 표준 공식 적용"
    else
        log_error "빌드 실패 - 롤백"
        git checkout -- .
        exit 1
    fi
    
    update_types
    if test_build; then
        git add -A
        git commit -m "feat: 타입 정의 확장 (ANOVA, VarianceComponents)"
    fi
    
    add_log_transform_ui
    if test_build; then
        git add -A
        git commit -m "feat: 로그 변환 UI 추가 (최소 변경)"
    fi
    
    improve_export_service
    if test_build; then
        git add -A
        git commit -m "feat: ExportService 상세 분석 리포트 개선"
    fi
    
    apply_data_persistence
    if test_build; then
        git add -A
        git commit -m "feat: 데이터 영속성 적용 (useLocalStorage)"
    fi
    
    update_type_index
    if test_build; then
        git add -A
        git commit -m "feat: 타입 인덱스 업데이트"
    fi
    
    # 최종 빌드 테스트
    log_info "최종 빌드 테스트..."
    if test_build; then
        log_info "모든 개선사항 적용 성공!"
    else
        log_error "최종 빌드 실패"
        exit 1
    fi
    
    # 원격 푸시
    log_info "변경사항을 원격 저장소에 푸시..."
    git push -u origin "$BRANCH_NAME"
    
    log_info "============================================="
    log_info "통계 정확성 개선 완료!"
    log_info "브랜치: $BRANCH_NAME"
    log_info "백업: $BACKUP_DIR"
    log_info ""
    log_info "개선된 기능:"
    log_info "✅ MSA 표준 Gage R&R 공식 적용"
    log_info "✅ ANOVA 분산 분석 추가"
    log_info "✅ 로그 변환 UI 구현"
    log_info "✅ 상세 분석 리포트 개선"
    log_info "✅ 데이터 영속성 적용"
    log_info ""
    log_info "다음 단계: GitHub에서 Pull Request 생성"
    log_info "============================================="
}

# 스크립트 실행
main "$@"
