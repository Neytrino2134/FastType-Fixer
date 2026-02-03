
import React from 'react';
import { Gamepad2 } from 'lucide-react';
import ModuleWrapper from '../ModuleWrapper';
import TronSettings from '../modules/TronSettings';
import { NumberedLabel } from '../SettingsSection';
import { EffectsConfig } from '../../../types';

interface GameSectionProps {
  expandedState: Record<string, boolean>;
  toggleExpand: (id: string, isAdditive: boolean, forceOpen?: boolean) => void;
  safeAction: (fn: () => void) => void;
  effectsConfig: EffectsConfig;
  updateEffect: (k: keyof EffectsConfig, v: any) => void;
}

const GameSection: React.FC<GameSectionProps> = ({
  expandedState, toggleExpand, safeAction, effectsConfig, updateEffect
}) => {
  return (
    <div className="space-y-3">
        <ModuleWrapper id="tron" label={<NumberedLabel num="01" k="tron_game" />} icon={Gamepad2} isEnabled={effectsConfig.tron.enabled} isExpanded={expandedState['tron']} onToggleExpand={(e) => toggleExpand('tron', e.shiftKey)} onToggleEnable={() => safeAction(() => { if (!effectsConfig.tron.enabled) toggleExpand('tron', false, true); updateEffect('tron', { ...effectsConfig.tron, enabled: !effectsConfig.tron.enabled }); })}>
            <TronSettings config={effectsConfig.tron} update={(v) => updateEffect('tron', v)} />
        </ModuleWrapper>
    </div>
  );
};

export default GameSection;
