// src/components/EquipmentPanel.tsx
import React from 'react';
import { HUMIDIFIER_INFO, LIGHT_INFO, WOOD_INFO } from '../database';
import type { HumidifierType, LightType, WoodType } from '../types';
import { Humidifiers, Lights, Woods } from '../types';
import { CollapsibleSection, ToggleTag } from './Common';
import { labelStyle, tagContainerStyle } from '../styles';
import { getEquipmentSortKey } from '../utils';

interface EquipmentPanelProps {
    unlockedWoods: WoodType[];
    unlockedLights: LightType[];
    unlockedHumidifiers: HumidifierType[];
    onToggle: (type: 'wood' | 'light' | 'humidifier', value: string) => void;
}

// 辅助排序函数
const sortItems = (type: 'wood' | 'light' | 'humidifier', items: string[]) => {
    return [...items].sort((a, b) => getEquipmentSortKey(type, a) - getEquipmentSortKey(type, b));
};

export const EquipmentPanel: React.FC<EquipmentPanelProps> = ({
                                                                  unlockedWoods,
                                                                  unlockedLights,
                                                                  unlockedHumidifiers,
                                                                  onToggle
                                                              }) => (
    <CollapsibleSection title="🛠️ 环境设备" defaultOpen={false} headerBg="#fff3e0" headerColor="#e65100">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
                <div style={labelStyle}>🪵 木头类型</div>
                <div style={tagContainerStyle}>
                    {sortItems('wood', Object.values(Woods)).map(w => {
                        const unlocked = unlockedWoods.includes(w as WoodType);
                        const label = unlocked ? w : `${w} (${WOOD_INFO[w as WoodType]?.source || '未知来源'})`;
                        return <ToggleTag key={w} label={label} active={unlocked} onClick={() => onToggle('wood', w)}/>;
                    })}
                </div>
            </div>
            <div>
                <div style={labelStyle}>💡 日照灯</div>
                <div style={tagContainerStyle}>
                    {sortItems('light', Object.values(Lights)).map(l => {
                        const unlocked = unlockedLights.includes(l as LightType);
                        const label = unlocked ? l : `${l} (${LIGHT_INFO[l as LightType]?.source || '未知来源'})`;
                        return <ToggleTag key={l} label={label} active={unlocked}
                                          onClick={() => onToggle('light', l)}/>;
                    })}
                </div>
            </div>
            <div>
                <div style={labelStyle}>💧 补水器</div>
                <div style={tagContainerStyle}>
                    {sortItems('humidifier', Object.values(Humidifiers)).map(h => {
                        const unlocked = unlockedHumidifiers.includes(h as HumidifierType);
                        const label = unlocked ? h : `${h} (${HUMIDIFIER_INFO[h as HumidifierType]?.source || '未知来源'})`;
                        return <ToggleTag key={h} label={label} active={unlocked}
                                          onClick={() => onToggle('humidifier', h)}/>;
                    })}
                </div>
            </div>
        </div>
    </CollapsibleSection>
);
