
import React from 'react';
import { Timer, Zap, Layers, Aperture, Lightbulb } from 'lucide-react';
import ModuleWrapper from '../ModuleWrapper';
import { FpsSettings, SignalSettings, ChromaticSettings, VignetteSettings, LightFlickerSettings } from '../modules/EffectModules';
import { NumberedLabel } from '../SettingsSection';
import { EffectsConfig } from '../../../types';

interface PostProcessingSectionProps {
  expandedState: Record<string, boolean>;
  toggleExpand: (id: string, isAdditive: boolean, forceOpen?: boolean) => void;
  safeAction: (fn: () => void) => void;
  effectsConfig: EffectsConfig;
  updateEffect: (k: keyof EffectsConfig, v: any) => void;
}

const PostProcessingSection: React.FC<PostProcessingSectionProps> = ({
  expandedState, toggleExpand, safeAction, effectsConfig, updateEffect
}) => {
  return (
    <div className="space-y-3">
        <ModuleWrapper id="fps" label={<NumberedLabel num="01" k="fps_limit" />} icon={Timer} isEnabled={true} isAlwaysOn={true} isExpanded={expandedState['fps']} onToggleExpand={(e) => toggleExpand('fps', e.shiftKey)} onToggleEnable={() => {}}>
            <FpsSettings config={effectsConfig} update={updateEffect} />
        </ModuleWrapper>

        <ModuleWrapper id="signal" label={<NumberedLabel num="02" k="signal_processor" />} icon={Zap} isEnabled={effectsConfig.signalEnabled} isExpanded={expandedState['signal']} onToggleExpand={(e) => toggleExpand('signal', e.shiftKey)} onToggleEnable={() => safeAction(() => { if (!effectsConfig.signalEnabled) toggleExpand('signal', false, true); updateEffect('signalEnabled', !effectsConfig.signalEnabled); })}>
            <SignalSettings config={effectsConfig} update={updateEffect} />
        </ModuleWrapper>
        
        <ModuleWrapper id="chromatic" label={<NumberedLabel num="03" k="chromatic_aberration" />} icon={Layers} isEnabled={effectsConfig.chromaticEnabled} isExpanded={expandedState['chromatic']} onToggleExpand={(e) => toggleExpand('chromatic', e.shiftKey)} onToggleEnable={() => safeAction(() => { if (!effectsConfig.chromaticEnabled) toggleExpand('chromatic', false, true); updateEffect('chromaticEnabled', !effectsConfig.chromaticEnabled); })}>
            <ChromaticSettings config={effectsConfig} update={updateEffect} />
        </ModuleWrapper>

        <ModuleWrapper id="vignette" label={<NumberedLabel num="04" k="vignette_effect" />} icon={Aperture} isEnabled={effectsConfig.vignette.enabled} isExpanded={expandedState['vignette']} onToggleExpand={(e) => toggleExpand('vignette', e.shiftKey)} onToggleEnable={() => safeAction(() => { if (!effectsConfig.vignette.enabled) toggleExpand('vignette', false, true); updateEffect('vignette', { ...effectsConfig.vignette, enabled: !effectsConfig.vignette.enabled }); })}>
            <VignetteSettings config={effectsConfig.vignette} update={(v) => updateEffect('vignette', v)} />
        </ModuleWrapper>

        <ModuleWrapper id="flicker" label={<NumberedLabel num="05" k="light_flicker" />} icon={Lightbulb} isEnabled={effectsConfig.lightFlicker.enabled} isExpanded={expandedState['flicker']} onToggleExpand={(e) => toggleExpand('flicker', e.shiftKey)} onToggleEnable={() => safeAction(() => { if (!effectsConfig.lightFlicker.enabled) toggleExpand('flicker', false, true); updateEffect('lightFlicker', { ...effectsConfig.lightFlicker, enabled: !effectsConfig.lightFlicker.enabled }); })}>
            <LightFlickerSettings config={effectsConfig.lightFlicker} update={(v) => updateEffect('lightFlicker', v)} />
        </ModuleWrapper>
    </div>
  );
};

export default PostProcessingSection;
