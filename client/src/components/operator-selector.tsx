import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, CheckCircle } from "lucide-react";

interface Operator {
  id: string;
  name: string;
}

interface OperatorSelectorProps {
  operators: Operator[];
  selectedOperator: string;
  onOperatorSelect: (operatorId: string) => void;
}

export function OperatorSelector({ operators, selectedOperator, onOperatorSelect }: OperatorSelectorProps) {
  return (
    <div className="space-y-2">
      {operators.map((operator) => (
        <Button
          key={operator.id}
          variant={selectedOperator === operator.id ? "default" : "outline"}
          className={`w-full justify-start h-auto p-3 ${
            selectedOperator === operator.id
              ? "bg-blue-500 hover:bg-blue-600 text-white"
              : "hover:bg-blue-50 dark:hover:bg-blue-900/20"
          }`}
          onClick={() => onOperatorSelect(operator.id)}
        >
          <div className="flex items-center space-x-3">
            {selectedOperator === operator.id ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <User className="h-5 w-5" />
            )}
            <div className="text-left">
              <div className="font-medium">{operator.name}</div>
              <div className="text-xs opacity-70">작업자 ID: {operator.id}</div>
            </div>
          </div>
        </Button>
      ))}
      
      {operators.length === 0 && (
        <div className="text-center py-4 text-slate-500 dark:text-slate-400">
          <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">등록된 작업자가 없습니다.</p>
        </div>
      )}
    </div>
  );
}