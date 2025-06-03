import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';

interface WorkSession {
  id: number;
  taskType: string;
  partNumber?: string;
  operatorName?: string;
  targetName?: string;
  operators?: Array<{ id: string; name: string }>;
  parts?: Array<{ id: string; name: string }>;
  trialsPerOperator?: number;
  isActive?: boolean;
}

/**
 * Single Responsibility Principle (SRP)
 * 세션 상태 관리만을 담당하는 커스텀 훅
 */
export function useSessionState(userId?: string) {
  const [isSessionReady, setIsSessionReady] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // 활성 세션 조회
  const { 
    data: activeSession, 
    isLoading: isSessionLoading,
    refetch: refetchSession
  } = useQuery<WorkSession>({
    queryKey: ['/api/work-sessions/active'],
    enabled: !!userId,
    retry: false,
    refetchOnWindowFocus: false,
  });

  // 세션 준비 상태 업데이트 (Dependency Inversion Principle)
  useEffect(() => {
    setIsSessionReady(!!activeSession && !isSessionLoading);
  }, [activeSession, isSessionLoading]);

  // 세션 생성 뮤테이션 (Open/Closed Principle)
  const createSessionMutation = useMutation({
    mutationFn: async (sessionData: {
      taskType: string;
      partNumber?: string;
      operatorName?: string;
      targetName?: string;
      operators?: Array<{ id: string; name: string }>;
      parts?: Array<{ id: string; name: string }>;
      trialsPerOperator?: number;
    }) => {
      console.log('Creating session with data:', sessionData);
      const response = await apiRequest('POST', '/api/work-sessions', sessionData);
      return response.json();
    },
    onMutate: () => {
      // 낙관적 업데이트로 즉시 UI 상태 변경
      setIsSessionReady(false);
    },
    onSuccess: async (newSession) => {
      console.log('Session created successfully:', newSession);
      
      // 강제로 캐시 무효화 및 즉시 재조회
      await queryClient.cancelQueries({ queryKey: ['/api/work-sessions/active'] });
      queryClient.setQueryData(['/api/work-sessions/active'], newSession);
      
      // 세션 준비 상태 즉시 업데이트
      setIsSessionReady(true);
      
      // 백그라운드에서 최신 데이터 동기화
      setTimeout(() => {
        refetchSession();
      }, 100);

      toast({
        title: "작업 세션 시작",
        description: "측정을 시작할 수 있습니다.",
      });
    },
    onError: (error) => {
      setIsSessionReady(false);
      
      if (isUnauthorizedError(error)) {
        toast({
          title: "인증 오류",
          description: "다시 로그인해주세요.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      toast({
        title: "오류",
        description: "작업 세션을 시작할 수 없습니다.",
        variant: "destructive",
      });
    },
  });

  // 세션 업데이트 뮤테이션
  const updateSessionMutation = useMutation({
    mutationFn: async (updateData: {
      operatorName?: string;
      targetName?: string;
    }) => {
      if (!activeSession?.id) throw new Error('No active session');
      const response = await apiRequest('PUT', `/api/work-sessions/${activeSession.id}`, updateData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/work-sessions/active'] });
    },
  });

  return {
    // 상태
    activeSession,
    isSessionReady,
    isSessionLoading,
    isCreatingSession: createSessionMutation.isPending,
    isUpdatingSession: updateSessionMutation.isPending,
    
    // 액션
    createSession: createSessionMutation.mutate,
    updateSession: updateSessionMutation.mutate,
    refetchSession,
    
    // 헬퍼
    hasActiveSession: !!activeSession,
    canStartMeasurement: isSessionReady && !!activeSession,
  };
}