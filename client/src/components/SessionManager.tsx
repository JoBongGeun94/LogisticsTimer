import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";

interface SessionManagerProps {
  activeSession: any;
  isSessionReady: boolean;
  isCreatingSession: boolean;
  canStartMeasurement: boolean;
  children: React.ReactNode;
}

/**
 * Interface Segregation Principle (ISP)
 * 세션 상태 표시만을 담당하는 컴포넌트
 */
export function SessionManager({ 
  activeSession, 
  isSessionReady, 
  isCreatingSession,
  canStartMeasurement,
  children 
}: SessionManagerProps) {
  const getSessionStatus = () => {
    if (isCreatingSession) {
      return {
        icon: <Clock className="h-4 w-4" />,
        text: "세션 생성 중...",
        variant: "secondary" as const,
        color: "text-blue-600"
      };
    }
    
    if (canStartMeasurement) {
      return {
        icon: <CheckCircle2 className="h-4 w-4" />,
        text: "측정 준비 완료",
        variant: "default" as const,
        color: "text-green-600"
      };
    }
    
    return {
      icon: <AlertCircle className="h-4 w-4" />,
      text: "세션 없음",
      variant: "outline" as const,
      color: "text-gray-600"
    };
  };

  const status = getSessionStatus();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">세션 상태</CardTitle>
          <Badge variant={status.variant} className="flex items-center gap-1">
            {status.icon}
            {status.text}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {children}
        
        {/* 세션 정보 표시 */}
        {activeSession && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200">활성 세션</h3>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.reload()}
                className="text-xs"
              >
                작업변경
              </Button>
            </div>
            <div className="text-sm space-y-2 text-blue-900 dark:text-blue-100">
              <div className="font-medium">
                {activeSession.taskType === 'material_inspection' ? '물자검수팀' : 
                 activeSession.taskType === 'gage-rr' ? 'Gage R&R 분석' :
                 activeSession.taskType}
              </div>
              {activeSession.partNumber && (
                <div className="text-xs">공정세부번호: {activeSession.partNumber}</div>
              )}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {activeSession.operatorName && (
                  <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border">
                    <div>
                      <span className="text-blue-600 dark:text-blue-400">측정자:</span> {activeSession.operatorName}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => {
                        const event = new CustomEvent('openOperatorDialog');
                        window.dispatchEvent(event);
                      }}
                    >
                      변경
                    </Button>
                  </div>
                )}
                {activeSession.targetName && (
                  <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border">
                    <div>
                      <span className="text-blue-600 dark:text-blue-400">대상:</span> {activeSession.targetName}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => {
                        const event = new CustomEvent('openTargetDialog');
                        window.dispatchEvent(event);
                      }}
                    >
                      변경
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* 상태별 안내 메시지 */}
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          {isCreatingSession && (
            <p>새로운 작업 세션을 생성하고 있습니다...</p>
          )}
          {canStartMeasurement && (
            <p className="text-green-600 dark:text-green-400">
              타이머를 시작하여 측정을 진행하세요.
            </p>
          )}
          {!activeSession && !isCreatingSession && (
            <p>먼저 작업 정보를 입력하고 세션을 시작하세요.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}