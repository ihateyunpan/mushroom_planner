// src/components/InventoryPanel.tsx
import React, { useMemo, useState } from 'react';
import type { MushroomDef } from '../types';
import { getMushroomImg } from '../utils';
import { CollapsibleSection, MiniImg } from './Common';

interface InventoryPanelProps {
    inventory: Record<string, number>;
    relevantMushrooms: MushroomDef[];
    activeDemandMap: Map<string, number>;
    onUpdate: (id: string, count: number) => void;
}

export const InventoryPanel: React.FC<InventoryPanelProps> = ({
                                                                  inventory,
                                                                  relevantMushrooms,
                                                                  activeDemandMap,
                                                                  onUpdate
                                                              }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const displayedMushrooms = useMemo(() => {
        if (!searchTerm) return relevantMushrooms;
        const lower = searchTerm.toLowerCase().trim();
        return relevantMushrooms.filter(m =>
            m.name.includes(lower) || m.pinyin.includes(lower)
        );
    }, [relevantMushrooms, searchTerm]);

    return (
        <CollapsibleSection title="📦 现有库存" defaultOpen={false} headerBg="#e8f5e9" headerColor="#2e7d32">
            {relevantMushrooms.length === 0 ? (
                <div
                    style={{
                        padding: 15,
                        color: '#999',
                        fontSize: 13,
                        textAlign: 'center'
                    }}>暂无活跃订单，请先添加订单。</div>
            ) : (
                <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
                    <input
                        placeholder="🔍 搜索订单内菌种 (名字或拼音)..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{
                            padding: '8px',
                            borderRadius: 4,
                            border: '1px solid #ccc',
                            fontSize: 13,
                            width: '100%',
                            boxSizing: 'border-box'
                        }}
                    />

                    <div style={{maxHeight: 400, overflowY: 'auto'}}>
                        {displayedMushrooms.map(m => {
                            const currentCount = inventory[m.id] || 0;
                            const requiredCount = activeDemandMap.get(m.id) || 0;
                            const isDeficit = requiredCount > 0 && currentCount < requiredCount;

                            return (
                                <div key={m.id} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '8px 0',
                                    borderBottom: '1px solid #f0f0f0'
                                }}>
                                    <div style={{display: 'flex', alignItems: 'center', gap: 10, flex: 1}}>
                                        {/* 修改：移除 Popover，纯展示 */}
                                        <MiniImg src={getMushroomImg(m.id)} label={m.name} size={32}/>
                                        <div style={{display: 'flex', flexDirection: 'column'}}>
                                            <span style={{fontSize: 14}}>{m.name}</span>
                                            {requiredCount > 0 && (
                                                <span style={{
                                                    fontSize: 11,
                                                    color: isDeficit ? '#e53935' : '#aaa',
                                                    fontWeight: isDeficit ? 'bold' : 'normal'
                                                }}>
                                                    需: {requiredCount}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <input type="number" min={0} value={currentCount === 0 ? '' : currentCount}
                                           onChange={e => {
                                               const val = e.target.value;
                                               if (val === '') onUpdate(m.id, 0);
                                               else {
                                                   const num = parseInt(val);
                                                   if (!isNaN(num) && num >= 0) onUpdate(m.id, num);
                                               }
                                           }}
                                           style={{
                                               width: 70,
                                               padding: 6,
                                               borderRadius: 4,
                                               border: isDeficit ? '1px solid #ef9a9a' : '1px solid #ddd',
                                               background: isDeficit ? '#ffebee' : '#fff',
                                               textAlign: 'center',
                                               color: isDeficit ? '#c62828' : '#000'
                                           }}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </CollapsibleSection>
    );
};