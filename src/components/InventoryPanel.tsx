// src/components/InventoryPanel.tsx
import React, { useMemo, useState } from 'react';
import type { MushroomDef } from '../types';
import { getMushroomImg } from '../utils';
import { CollapsibleSection, MiniImg, MushroomInfoCard, Popover } from './Common';

interface InventoryPanelProps {
    inventory: Record<string, number>;
    relevantMushrooms: MushroomDef[];
    activeDemandMap: Map<string, number>;
    encyclopediaDemandMap?: Map<string, number>; // 新增：图鉴需求
    onUpdate: (id: string, count: number) => void;
    growingCounts: Record<string, number>;
}

export const InventoryPanel: React.FC<InventoryPanelProps> = ({
                                                                  inventory,
                                                                  relevantMushrooms,
                                                                  activeDemandMap,
                                                                  encyclopediaDemandMap,
                                                                  onUpdate,
                                                                  growingCounts
                                                              }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activePopoverId, setActivePopoverId] = useState<string | null>(null);

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
                    }}>暂无活跃订单或库存，请先添加订单。</div>
            ) : (
                <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
                    <input
                        placeholder="🔍 搜索 (名字或拼音首字母)..."
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
                            // 普通订单需求
                            const orderNeeded = activeDemandMap.get(m.id) || 0;
                            const isOrderDeficit = orderNeeded > 0 && currentCount < orderNeeded;

                            // 图鉴需求 (功能点 4)
                            const encNeeded = encyclopediaDemandMap?.get(m.id) || 0;
                            const isEncSatisfied = currentCount >= encNeeded; // 只要有1个就算满足图鉴

                            const growing = growingCounts[m.id] || 0; // 获取培育中数量

                            return (
                                <div key={m.id} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '8px 0',
                                    borderBottom: '1px solid #f0f0f0'
                                }}>
                                    <div style={{display: 'flex', alignItems: 'center', gap: 10, flex: 1}}>
                                        <Popover
                                            isOpen={activePopoverId === m.id}
                                            onOpenChange={(isOpen) => setActivePopoverId(isOpen ? m.id : null)}
                                            content={<MushroomInfoCard m={m}/>}
                                        >
                                            <MiniImg
                                                src={getMushroomImg(m.id)}
                                                label={m.name}
                                                size={32}
                                                style={{cursor: 'pointer'}}
                                            />
                                        </Popover>

                                        <div style={{display: 'flex', flexDirection: 'column'}}>
                                            <span style={{fontSize: 14}}>{m.name}</span>
                                            <div style={{display: 'flex', gap: 8, fontSize: 11}}>
                                                {orderNeeded > 0 && (
                                                    <span style={{
                                                        color: isOrderDeficit ? '#e53935' : '#aaa',
                                                        fontWeight: isOrderDeficit ? 'bold' : 'normal'
                                                    }}>
                                                        订单需: {orderNeeded}
                                                    </span>
                                                )}
                                                {!isEncSatisfied && (
                                                    <span style={{
                                                        color: isEncSatisfied ? '#999' : '#2e7d32', // 完成变灰，未完成变绿
                                                        fontWeight: isEncSatisfied ? 'normal' : 'bold'
                                                    }}>
                                                        {isEncSatisfied ? '图鉴: OK' : `图鉴需: ${encNeeded}`}
                                                    </span>
                                                )}
                                                {growing > 0 && (
                                                    <span style={{color: '#e65100', marginLeft: 4, fontSize: 11}}>
                        (⏳{growing})
                    </span>
                                                )}
                                            </div>
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
                                               border: isOrderDeficit ? '1px solid #ef9a9a' : '1px solid #ddd',
                                               background: isOrderDeficit ? '#ffebee' : '#fff',
                                               textAlign: 'center',
                                               color: isOrderDeficit ? '#c62828' : '#000'
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