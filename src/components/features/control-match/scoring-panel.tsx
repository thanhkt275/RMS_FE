import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, CheckCircle, Plus, Minus } from "lucide-react";
import { AllianceScoreBreakdown } from "@/hooks/scoring/types";

interface AllianceSectionProps {
  allianceLabel: string;
  accentColor: "red" | "blue";
  flagsSecured: number;
  successfulFlagHits: number;
  opponentFieldAmmo: number;
  breakdown: AllianceScoreBreakdown;
  totalScore: number;
  disabled: boolean;
  onFlagsSecuredChange: (value: number) => void;
  onSuccessfulFlagHitsChange: (value: number) => void;
  onOpponentFieldAmmoChange: (value: number) => void;
}

interface ScoringPanelProps {
  selectedMatchId: string;
  redFlagsSecured: number;
  redSuccessfulFlagHits: number;
  redOpponentFieldAmmo: number;
  blueFlagsSecured: number;
  blueSuccessfulFlagHits: number;
  blueOpponentFieldAmmo: number;
  redBreakdown: AllianceScoreBreakdown;
  blueBreakdown: AllianceScoreBreakdown;
  redTotalScore: number;
  blueTotalScore: number;
  setRedFlagsSecured: (value: number) => void;
  setRedSuccessfulFlagHits: (value: number) => void;
  setRedOpponentFieldAmmo: (value: number) => void;
  setBlueFlagsSecured: (value: number) => void;
  setBlueSuccessfulFlagHits: (value: number) => void;
  setBlueOpponentFieldAmmo: (value: number) => void;
  onUpdateScores: () => void;
  onSubmitScores: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

const AllianceSection: React.FC<AllianceSectionProps> = ({
  allianceLabel,
  accentColor,
  flagsSecured,
  successfulFlagHits,
  opponentFieldAmmo,
  breakdown,
  totalScore,
  disabled,
  onFlagsSecuredChange,
  onSuccessfulFlagHitsChange,
  onOpponentFieldAmmoChange,
}) => {
  const accent = accentColor === "red" ? "red" : "blue";
  const bgClass = accentColor === "red" ? "bg-red-50 border-red-200" : "bg-blue-50 border-blue-200";
  const headingClass = accentColor === "red" ? "text-red-800" : "text-blue-800";
  const labelAccent = accentColor === "red" ? "text-red-700" : "text-blue-700";
  const chipAccent = accentColor === "red" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700";

  const handleInput = (handler: (value: number) => void) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = Number(event.target.value ?? 0);
    if (!Number.isFinite(numericValue)) {
      handler(0);
      return;
    }
    handler(Math.max(0, Math.floor(numericValue)));
  };

  const createStepHandler = (
    currentValue: number,
    handler: (value: number) => void,
    delta: number,
  ) => () => {
    if (disabled) return;
    const nextValue = Math.max(0, currentValue + delta);
    handler(nextValue);
  };

  return (
    <div className={`space-y-6 p-6 rounded-xl border-2 ${bgClass}`}>
      <div className="flex items-center justify-between">
        <h3 className={`text-xl font-bold ${headingClass}`}>{allianceLabel}</h3>
        <div className={`px-3 py-1 text-sm font-semibold rounded-full ${chipAccent}`}>
          Tổng điểm: {totalScore}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Số cờ được bảo vệ (20 điểm mỗi cờ)
          </label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={createStepHandler(flagsSecured, onFlagsSecuredChange, -1)}
              disabled={disabled || flagsSecured === 0}
              className="border-gray-300"
            >
              <Minus className="w-4 h-4" />
            </Button>
            <Input
              type="number"
              min={0}
              value={flagsSecured}
              onChange={handleInput(onFlagsSecuredChange)}
              disabled={disabled}
              className="w-full bg-white border-gray-300 text-center"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={createStepHandler(flagsSecured, onFlagsSecuredChange, 1)}
              disabled={disabled}
              className="border-gray-300"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Lượt bắn thành công tại căn cứ đối phương (10 điểm mỗi lượt)
          </label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={createStepHandler(successfulFlagHits, onSuccessfulFlagHitsChange, -1)}
              disabled={disabled || successfulFlagHits === 0}
              className="border-gray-300"
            >
              <Minus className="w-4 h-4" />
            </Button>
            <Input
              type="number"
              min={0}
              value={successfulFlagHits}
              onChange={handleInput(onSuccessfulFlagHitsChange)}
              disabled={disabled}
              className="w-full bg-white border-gray-300 text-center"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={createStepHandler(successfulFlagHits, onSuccessfulFlagHitsChange, 1)}
              disabled={disabled}
              className="border-gray-300"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Đạn trên sân đối phương cuối trận (5 điểm mỗi viên)
          </label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={createStepHandler(opponentFieldAmmo, onOpponentFieldAmmoChange, -1)}
              disabled={disabled || opponentFieldAmmo === 0}
              className="border-gray-300"
            >
              <Minus className="w-4 h-4" />
            </Button>
            <Input
              type="number"
              min={0}
              value={opponentFieldAmmo}
              onChange={handleInput(onOpponentFieldAmmoChange)}
              disabled={disabled}
              className="w-full bg-white border-gray-300 text-center"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={createStepHandler(opponentFieldAmmo, onOpponentFieldAmmoChange, 1)}
              disabled={disabled}
              className="border-gray-300"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-2 text-sm text-gray-600">
        <div className="flex justify-between">
          <span className="font-semibold">Điểm giữ cờ</span>
          <span className={labelAccent}>{breakdown.flagsPoints}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold">Điểm bắn phá căn cứ</span>
          <span className={labelAccent}>{breakdown.flagHitsPoints}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold">Điểm kiểm soát sân</span>
          <span className={labelAccent}>{breakdown.fieldControlPoints}</span>
        </div>
        <div className="flex justify-between border-t pt-2 mt-2 text-base font-bold text-gray-800">
          <span>Tổng</span>
          <span>{totalScore}</span>
        </div>
      </div>
    </div>
  );
};

export function ScoringPanel({
  selectedMatchId,
  redFlagsSecured,
  redSuccessfulFlagHits,
  redOpponentFieldAmmo,
  blueFlagsSecured,
  blueSuccessfulFlagHits,
  blueOpponentFieldAmmo,
  redBreakdown,
  blueBreakdown,
  redTotalScore,
  blueTotalScore,
  setRedFlagsSecured,
  setRedSuccessfulFlagHits,
  setRedOpponentFieldAmmo,
  setBlueFlagsSecured,
  setBlueSuccessfulFlagHits,
  setBlueOpponentFieldAmmo,
  onUpdateScores,
  onSubmitScores,
  isLoading = false,
  disabled = false,
}: ScoringPanelProps) {
  const isDisabled = disabled || !selectedMatchId || isLoading;

  return (
    <Card className="bg-white border border-gray-200 shadow-lg rounded-xl p-8 text-gray-700">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 text-center">Ghi Điểm Trận Đấu</h2>

      {!selectedMatchId ? (
        <div className="text-center text-gray-600 py-8 bg-gray-50 rounded-lg">
          <div className="text-lg font-medium">Chưa chọn trận đấu</div>
          <div className="text-sm text-gray-500 mt-2">
            Vui lòng chọn trận để bắt đầu ghi điểm
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <AllianceSection
              allianceLabel="Liên minh ĐỎ"
              accentColor="red"
              flagsSecured={redFlagsSecured}
              successfulFlagHits={redSuccessfulFlagHits}
              opponentFieldAmmo={redOpponentFieldAmmo}
              breakdown={redBreakdown}
              totalScore={redTotalScore}
              disabled={isDisabled}
              onFlagsSecuredChange={setRedFlagsSecured}
              onSuccessfulFlagHitsChange={setRedSuccessfulFlagHits}
              onOpponentFieldAmmoChange={setRedOpponentFieldAmmo}
            />

            <AllianceSection
              allianceLabel="Liên minh XANH"
              accentColor="blue"
              flagsSecured={blueFlagsSecured}
              successfulFlagHits={blueSuccessfulFlagHits}
              opponentFieldAmmo={blueOpponentFieldAmmo}
              breakdown={blueBreakdown}
              totalScore={blueTotalScore}
              disabled={isDisabled}
              onFlagsSecuredChange={setBlueFlagsSecured}
              onSuccessfulFlagHitsChange={setBlueSuccessfulFlagHits}
              onOpponentFieldAmmoChange={setBlueOpponentFieldAmmo}
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              variant="outline"
              onClick={onUpdateScores}
              disabled={isDisabled}
              className="w-full sm:w-auto"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Cập nhật thời gian thực
            </Button>
            <Button
              onClick={onSubmitScores}
              disabled={isDisabled}
              className="w-full sm:w-auto"
            >
              <Save className="w-4 h-4 mr-2" />
              Lưu điểm trận đấu
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
