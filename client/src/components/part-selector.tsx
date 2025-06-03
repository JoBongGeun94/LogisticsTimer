import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, CheckCircle } from "lucide-react";

interface Part {
  id: string;
  name: string;
  specification?: string;
}

interface PartSelectorProps {
  parts: Part[];
  selectedPart: string;
  onPartSelect: (partId: string) => void;
}

export function PartSelector({ parts, selectedPart, onPartSelect }: PartSelectorProps) {
  return (
    <div className="space-y-2">
      {parts.map((part) => (
        <Button
          key={part.id}
          variant={selectedPart === part.id ? "default" : "outline"}
          className={`w-full justify-start h-auto p-3 ${
            selectedPart === part.id
              ? "bg-green-500 hover:bg-green-600 text-white"
              : "hover:bg-green-50 dark:hover:bg-green-900/20"
          }`}
          onClick={() => onPartSelect(part.id)}
        >
          <div className="flex items-center space-x-3">
            {selectedPart === part.id ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <Package className="h-5 w-5" />
            )}
            <div className="text-left">
              <div className="font-medium">{part.name}</div>
              <div className="text-xs opacity-70">부품 ID: {part.id}</div>
              {part.specification && (
                <div className="text-xs opacity-70">규격: {part.specification}</div>
              )}
            </div>
          </div>
        </Button>
      ))}
      
      {parts.length === 0 && (
        <div className="text-center py-4 text-slate-500 dark:text-slate-400">
          <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">등록된 부품이 없습니다.</p>
        </div>
      )}
    </div>
  );
}