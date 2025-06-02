import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { formatTime } from "@/lib/timer-utils";
import { 
  History as HistoryIcon, 
  Calendar, 
  Clock, 
  Target, 
  Users, 
  TrendingUp,
  BarChart3,
  GitCompare,
  Download,
  ChevronRight
} from "lucide-react";
import { Link } from "wouter";

interface WorkSession {
  id: number;
  taskType: string;
  partNumber?: string;
  operatorName?: string;
  targetName?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  isActive: boolean;
}

interface SessionComparison {
  session: WorkSession;
  measurements: any[];
  analysis: any;
  statistics: {
    count: number;
    average: number;
    min: number;
    max: number;
  };
}

export default function History() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [selectedSessions, setSelectedSessions] = useState<number[]>([]);
  const [comparison, setComparison] = useState<SessionComparison[]>([]);
  const [trends, setTrends] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');

  // Redirect if unauthorized
  useEffect(() => {
    if (!isLoading && !user) {
      toast({
        title: "인증 필요",
        description: "로그인이 필요합니다. 로그인 페이지로 이동합니다...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [user, isLoading, toast]);

  // Fetch session history
  useEffect(() => {
    async function fetchHistory() {
      if (!user) return;
      
      try {
        const [sessionsResponse, trendsResponse] = await Promise.all([
          fetch('/api/work-sessions/history?limit=50'),
          fetch('/api/work-sessions/analytics/trends?days=30')
        ]);
        
        if (sessionsResponse.ok) {
          const sessionsData = await sessionsResponse.json();
          setSessions(sessionsData);
        }
        
        if (trendsResponse.ok) {
          const trendsData = await trendsResponse.json();
          setTrends(trendsData);
        }
      } catch (error) {
        console.error('Error fetching history:', error);
        toast({
          title: "데이터 로드 실패",
          description: "세션 히스토리를 불러올 수 없습니다.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [user, toast]);

  // Handle session comparison
  const handleCompare = async () => {
    if (selectedSessions.length < 2) {
      toast({
        title: "비교 대상 부족",
        description: "비교하려면 최소 2개의 세션을 선택하세요.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/work-sessions/compare/${selectedSessions.join(',')}`);
      if (response.ok) {
        const comparisonData = await response.json();
        setComparison(comparisonData);
      }
    } catch (error) {
      console.error('Error comparing sessions:', error);
      toast({
        title: "비교 실패",
        description: "세션 비교 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  // Filter sessions
  const filteredSessions = sessions.filter(session => {
    if (filterType === 'all') return true;
    return session.taskType === filterType;
  });

  // Get unique task types
  const taskTypes = Array.from(new Set(sessions.map(s => s.taskType)));

  const formatDuration = (start?: string, end?: string) => {
    if (!start || !end) return "진행중";
    const duration = new Date(end).getTime() - new Date(start).getTime();
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}분 ${seconds}초`;
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-200 dark:border-emerald-800"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-600 border-t-transparent absolute top-0 left-0"></div>
          </div>
          <div className="mt-6 space-y-2">
            <p className="text-lg font-medium text-gray-700 dark:text-gray-300">히스토리 로드 중</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                <HistoryIcon className="h-8 w-8 mr-3 text-blue-600" />
                작업 히스토리
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                과거 작업 세션을 조회하고 비교 분석할 수 있습니다
              </p>
            </div>
            <Link href="/">
              <Button variant="outline" className="flex items-center">
                <ChevronRight className="h-4 w-4 mr-2" />
                타이머로 돌아가기
              </Button>
            </Link>
          </div>
        </header>

        {/* Analytics Overview */}
        {trends && (
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-sm font-medium text-gray-600 dark:text-gray-400">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  30일 세션 수
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {trends.sessionCount}개
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-sm font-medium text-gray-600 dark:text-gray-400">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  평균 세션 시간
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {trends.averageSessionDuration > 0 
                    ? `${Math.round(trends.averageSessionDuration / 60000)}분` 
                    : "측정중"}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-sm font-medium text-gray-600 dark:text-gray-400">
                  <Target className="h-4 w-4 mr-2" />
                  주요 작업 유형
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {Object.keys(trends.taskTypes || {}).length > 0
                    ? Object.entries(trends.taskTypes).reduce((a: any, b: any) => 
                        trends.taskTypes[a] > trends.taskTypes[b[0]] ? a : b[0]
                      )
                    : "없음"}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Session List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>세션 목록</CardTitle>
              <div className="flex items-center gap-4">
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 유형</SelectItem>
                    {taskTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button
                  onClick={handleCompare}
                  disabled={selectedSessions.length < 2}
                  className="flex items-center"
                >
                  <Compare className="h-4 w-4 mr-2" />
                  비교 ({selectedSessions.length})
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredSessions.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <History className="h-12 w-12 mx-auto mb-2" />
                <p className="text-sm">작업 히스토리가 없습니다</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Checkbox
                      checked={selectedSessions.includes(session.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedSessions([...selectedSessions, session.id]);
                        } else {
                          setSelectedSessions(selectedSessions.filter(id => id !== session.id));
                        }
                      }}
                      className="mr-4"
                    />
                    
                    <div className="flex-1 grid grid-cols-5 gap-4">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {session.taskType}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          세션 #{session.id}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {session.operatorName || session.targetName || "기본"}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {session.partNumber || "부품 미지정"}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-sm text-gray-900 dark:text-gray-100">
                          {new Date(session.createdAt).toLocaleDateString('ko-KR')}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(session.createdAt).toLocaleTimeString('ko-KR')}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-sm text-gray-900 dark:text-gray-100">
                          {formatDuration(session.startedAt, session.completedAt)}
                        </div>
                      </div>
                      
                      <div>
                        <Badge 
                          variant={session.isActive ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {session.isActive ? "진행중" : "완료"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Comparison Results */}
        {comparison.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Compare className="h-5 w-5 mr-2" />
                세션 비교 결과
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {comparison.map((item, index) => (
                  <div key={item.session.id} className="p-4 border rounded-lg">
                    <div className="mb-3">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">
                        {item.session.taskType} (#{item.session.id})
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {item.session.operatorName || "기본"}
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>측정 횟수:</span>
                        <span className="font-medium">{item.statistics.count}회</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>평균 시간:</span>
                        <span className="font-medium">{formatTime(item.statistics.average)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>최소 시간:</span>
                        <span className="font-medium">{formatTime(item.statistics.min)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>최대 시간:</span>
                        <span className="font-medium">{formatTime(item.statistics.max)}</span>
                      </div>
                      
                      {item.analysis && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex justify-between text-sm">
                            <span>Gage R&R:</span>
                            <span className={`font-medium ${
                              item.analysis.grr < 30 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {item.analysis.grr.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}