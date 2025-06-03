import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target } from "lucide-react";

interface GageRRFormProps {
  onSubmit?: () => void;
}

export function GageRRForm({ onSubmit }: GageRRFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Target className="h-5 w-5 mr-2" />
          Gage R&R 설정
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Gage R&R 분석을 위한 추가 설정 옵션
        </p>
        <Button onClick={onSubmit} disabled>
          고급 설정 (준비 중)
        </Button>
      </CardContent>
    </Card>
  );
}