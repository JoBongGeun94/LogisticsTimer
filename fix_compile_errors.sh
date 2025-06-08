#!/bin/bash
set -e

# Script to fix TypeScript compile errors

# 1. Clean unused imports in App.tsx
sed -i "s/RotateCcw, //" src/App.tsx
sed -i "s/Home, //" src/App.tsx
sed -i "s/HelpCircle, //" src/App.tsx
sed -i "s/TrendingUp, //" src/App.tsx
sed -i "s/Settings, //" src/App.tsx
sed -i "s/Search, //" src/App.tsx
sed -i "s/ArrowLeft,//" src/App.tsx
sed -i "s/TrendingUp as TrendingUpIcon, //" src/App.tsx
sed -i "s/, Share2//" src/App.tsx
sed -i "/GageRRAnalysis,/d" src/App.tsx
sed -i "/ValidationResult/d" src/App.tsx

# 2. Update GageRRAnalysis component
sed -i "s/import { LapTime } from '..\/..\/types'/import { LapTime, GageRRAnalysis } from '..\/..\/types'/" src/components/Analysis/GageRRAnalysis.tsx
sed -i "s/import { AnalysisService, GageRRResult } from '..\/..\/services\/AnalysisService'/import { AnalysisService } from '..\/..\/services\/AnalysisService'/" src/components/Analysis/GageRRAnalysis.tsx
sed -i 's/GageRRResult/GageRRAnalysis/g' src/components/Analysis/GageRRAnalysis.tsx
sed -i 's/AnalysisService.calculateGageRR(measurements, transformType)/AnalysisService.calculateGageRR(measurements)/' src/components/Analysis/GageRRAnalysis.tsx
sed -i 's/(rec, index)/(rec: string, index: number)/' src/components/Analysis/GageRRAnalysis.tsx

# 3. Update SessionManager to use SessionData and targets
sed -i "s/import { Session } from '../../types'/import { SessionData } from '../../types'/" src/components/Session/SessionManager.tsx
sed -E -i "s/\bSession\b/SessionData/g" src/components/Session/SessionManager.tsx
sed -i 's/parts/targets/g' src/components/Session/SessionManager.tsx
sed -i 's/Part/Target/g' src/components/Session/SessionManager.tsx

# 4. Remove unused React default imports
sed -i 's/^import React, { memo }/import { memo }/' src/components/UI/Logo.tsx
sed -i 's/^import React, { memo, useEffect }/import { memo, useEffect }/' src/components/UI/Toast.tsx
sed -i 's/^import React, { useEffect }/import { useEffect }/' src/components/UI/Toast/Toast.tsx

# 5. Extend ToastProps with duration
sed -i '/onClose: () => void;/a\  duration?: number;' src/types/Common.ts
sed -i '/onClose: () => void;/a\  duration?: number;' src/types/index.ts

# 6. Update useSession hook
sed -i 's/{ Session, LapTime }/{ SessionData, LapTime }/' src/hooks/useSession.ts
sed -E -i "s/\bSession\b/SessionData/g" src/hooks/useSession.ts
sed -i "s/'id' | 'createdAt'/'id'/g" src/hooks/useSession.ts
sed -i '/createdAt: new Date()/d' src/hooks/useSession.ts

# 7. Update DetailedAnalysisPage
sed -i "s/import { GageRRResult } from '../../services\/AnalysisService'/import { GageRRAnalysis } from '../../types'/" src/pages/Analysis/DetailedAnalysisPage.tsx
sed -i 's/GageRRResult/GageRRAnalysis/g' src/pages/Analysis/DetailedAnalysisPage.tsx
sed -i 's/operatorId/operator/g' src/pages/Analysis/DetailedAnalysisPage.tsx
sed -i 's/partId/target/g' src/pages/Analysis/DetailedAnalysisPage.tsx
sed -i 's/(recommendation, index)/(recommendation: string, index: number)/' src/pages/Analysis/DetailedAnalysisPage.tsx

# 8. Fix validators import path
sed -i "s#from '../types'#from '../types/Session'#" src/utils/validators.ts

# 9. Stage and commit
files=(\
  src/App.tsx \
  src/components/Analysis/GageRRAnalysis.tsx \
  src/components/Session/SessionManager.tsx \
  src/components/UI/Logo.tsx \
  src/components/UI/Toast.tsx \
  src/components/UI/Toast/Toast.tsx \
  src/hooks/useSession.ts \
  src/pages/Analysis/DetailedAnalysisPage.tsx \
  src/utils/validators.ts \
  src/types/Common.ts \
  src/types/index.ts)

git add "${files[@]}"
git commit -m "fix: resolve TypeScript compile errors"
