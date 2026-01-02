import React, { useState } from 'react';
import type { MushroomDef } from '../types';
import { getMushroomImg } from '../utils';
import { CollapsibleSection, MiniImg, MushroomInfoCard, Popover } from './Common';

interface InventoryPanelProps {
    inventory: Record<string, number>;
    relevantMushrooms: MushroomDef[];
    onUpdate: (id: string, count: number) => void;
}

export const InventoryPanel: React.FC<InventoryPanelProps> = ({inventory, relevantMushrooms, onUpdate}) => {
    // 状态管理：同一时间只允许一个 ID 处于激活状态
    const [activePopoverId, setActivePopoverId] = useState<string | null>(null);

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
                <div style={{maxHeight: 400, overflowY: 'auto'}}>
                    {relevantMushrooms.map(m => {
                        const currentCount = inventory[m.id] || 0;
                        return (
                            <div key={m.id} style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '8px 0',
                                borderBottom: '1px solid #f0f0f0'
                            }}>
                                <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                                    {/* 使用受控的 Popover */}
                                    <Popover
                                        content={<MushroomInfoCard m={m}/>}
                                        isOpen={activePopoverId === m.id}
                                        onOpenChange={(isOpen) => setActivePopoverId(isOpen ? m.id : null)}
                                    >
                                        <MiniImg src={getMushroomImg(m.id)} label={m.name} onClick={() => {
                                        }}/>
                                    </Popover>
                                    <span style={{fontSize: 14}}>{m.name}</span>
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
                                           width: 80,
                                           padding: 5,
                                           borderRadius: 4,
                                           border: '1px solid #ddd',
                                           textAlign: 'center'
                                       }}
                                />
                            </div>
                        );
                    })}
                </div>
            )}
        </CollapsibleSection>
    );
};