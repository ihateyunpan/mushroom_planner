// src/components/PlanPanel.tsx
import React, { useMemo, useState } from 'react';
import { MUSHROOM_CHILDREN, MUSHROOM_DB } from '../database';
import type { CalculationResult, MissingItem, PlanBatch, PlanTask } from '../logic';
import type { MushroomChildId, Order, SpecialConditionType } from '../types';
import { SpecialConditions, TimeRanges, Woods } from '../types';
import { getChildImg, getMushroomImg, getSourceInfo, getToolIcon, TOOL_INFO } from '../utils';
import { btnStyle, CollapsibleSection, EnvBadge, MiniImg, MushroomInfoCard, Popover } from './Common';

interface PlanPanelProps {
    plan: CalculationResult;
    onCompleteTask: (task: PlanTask) => void;
    onRefresh: () => void;
    orders: Order[];
    inventory: Record<string, number>;
    onAddOne: (id: string) => void;
}

export const PlanPanel: React.FC<PlanPanelProps> = ({
                                                        plan: {batches, missingSummary},
                                                        onRefresh,
                                                        orders,
                                                        inventory,
                                                        onAddOne
                                                    }) => {
    // 状态管理
    const [activePopoverId, setActivePopoverId] = useState<string | null>(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // 筛选状态
    const [filters, setFilters] = useState({
        wood: 'all',   // 'all' | WoodType
        status: 'all', // 'all' | 'ready' | 'missing'
        orderIds: [] as string[] // 改为数组，支持多选。空数组代表"全部/无筛选"
    });

    // 辅助：检查订单库存是否就绪
    const checkOrderStockReady = (order: Order) => {
        if (order.items.length === 0) return false;
        return order.items.every(item => {
            const current = inventory[item.mushroomId] || 0;
            return current >= item.count;
        });
    };

    // --- 1. 执行筛选逻辑 ---
    const filteredBatches = useMemo(() => {
        return batches.filter(batch => {
            // 木头筛选
            if (filters.wood !== 'all' && batch.env.wood !== filters.wood) {
                return false;
            }
            // 状态筛选
            if (filters.status === 'ready' && batch.missingEquipment.length > 0) {
                return false;
            }
            if (filters.status === 'missing' && batch.missingEquipment.length === 0) {
                return false;
            }
            // 订单筛选 (多选逻辑)
            if (filters.orderIds.length > 0) {
                // 只要批次里的任何一个任务，属于任何一个被选中的订单，就保留该批次
                const isRelated = batch.tasks.some(task => {
                    // 检查这个 task 对应的菌种，是否在 选中的订单需求里
                    return filters.orderIds.some(selectedOid => {
                        const order = orders.find(o => o.id === selectedOid);
                        return order && order.items.some(i => i.mushroomId === task.mushroom.id);
                    });
                });

                if (!isRelated) return false;
            }

            return true;
        });
    }, [batches, filters, orders]);

    // --- 2. 基于筛选结果重新计算缺失道具 ---
    const filteredMissingSummary = useMemo(() => {
        if (filters.wood === 'all' && filters.status === 'all' && filters.orderIds.length === 0) {
            return missingSummary;
        }
        const map = new Map<string, MissingItem>();
        filteredBatches.forEach(batch => {
            batch.missingEquipment.forEach(item => {
                const key = `${item.type}-${item.value}`;
                if (!map.has(key)) {
                    map.set(key, item);
                }
            });
        });
        return Array.from(map.values());
    }, [filteredBatches, missingSummary, filters]);


    const hasStrictDay = filteredBatches.some(b => b.env.time === TimeRanges.DAY);
    const hasStrictNight = filteredBatches.some(b => b.env.time === TimeRanges.NIGHT);
    const showSplitLayout = hasStrictDay && hasStrictNight;

    const dayBatches = showSplitLayout ? filteredBatches.filter(b => b.env.time === TimeRanges.DAY || b.env.time === '任意') : [];
    const nightBatches = showSplitLayout ? filteredBatches.filter(b => b.env.time === TimeRanges.NIGHT || b.env.time === '任意') : [];

    const batchIndexMap = useMemo(() => {
        const map = new Map<string, number>();
        batches.forEach((b, i) => map.set(b.id, i + 1));
        return map;
    }, [batches]);

    const getSinglePanelConfig = () => {
        if (hasStrictDay) return {
            title: '☀️ 白天场', sub: '(包含时间任意的批次)',
            bg: '#fff8e1', border: '#ffecb3', titleColor: '#f57f17'
        };
        if (hasStrictNight) return {
            title: '🌙 夜晚场', sub: '(包含时间任意的批次)',
            bg: '#e8eaf6', border: '#c5cae9', titleColor: '#3949ab'
        };
        return {
            title: '🕒 自由时间', sub: '(所有批次时间均不限)',
            bg: '#eceff1', border: '#cfd8dc', titleColor: '#455a64'
        };
    };

    const renderBatch = (batch: PlanBatch, _: number, isFlexibleTime: boolean) => {
        const relatedOrderMap = new Map<string, Order>();
        batch.tasks.forEach(t => {
            orders.filter(o => o.active && o.items.some(i => i.mushroomId === t.mushroom.id))
                .forEach(o => relatedOrderMap.set(o.id, o));
        });
        const relatedOrders = Array.from(relatedOrderMap.values());

        // --- 分别统计核心和蹭车道具 ---
        const coreTools: Record<string, number> = {};
        const passengerTools: Record<string, number> = {};

        batch.tasks.forEach(t => {
            if (t.mushroom.special && t.mushroom.save) {
                const condition = t.mushroom.special;
                if (TOOL_INFO[condition]) {
                    if (t.isPassenger) {
                        passengerTools[condition] = (passengerTools[condition] || 0) + t.countNeeded;
                    } else {
                        coreTools[condition] = (coreTools[condition] || 0) + t.countNeeded;
                    }
                }
            }
        });

        const diseaseGroups: Record<string, PlanTask[]> = {
            'healthy': [],
            'less': [],
            'much': [],
            'bug': []
        };

        batch.tasks.forEach(task => {
            const sp = task.mushroom.special;
            if (!sp) diseaseGroups['healthy'].push(task);
            else if (sp === SpecialConditions.LESS) diseaseGroups['less'].push(task);
            else if (sp === SpecialConditions.MUCH) diseaseGroups['much'].push(task);
            else if (sp === SpecialConditions.BUG) diseaseGroups['bug'].push(task);
        });

        const aggregateTasks = (tasks: PlanTask[]) => {
            const map = new Map<string, { starter: string, count: number, isPassenger: boolean, special?: string }>();

            tasks.forEach(t => {
                const key = `${t.mushroom.starter}_${!!t.isPassenger}`;
                if (!map.has(key)) {
                    map.set(key, {
                        starter: t.mushroom.starter,
                        count: 0,
                        isPassenger: !!t.isPassenger,
                        special: t.mushroom.special
                    });
                }
                map.get(key)!.count += t.countNeeded;
            });

            return Array.from(map.values()).sort((a, b) => {
                if (a.isPassenger !== b.isPassenger) return a.isPassenger ? 1 : -1;
                return 0;
            });
        };

        const envParts: string[] = [batch.env.wood];
        if (batch.env.light !== '任意') envParts.push(batch.env.light);
        if (batch.env.humidifier !== '任意') envParts.push(batch.env.humidifier);
        const batchTitleStr = envParts.join(' + ');

        return (
            <CollapsibleSection
                key={batch.id}
                defaultOpen={false}
                title={
                    <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                        <span>第{batchIndexMap.get(batch.id)}批: {batchTitleStr}</span>
                        {isFlexibleTime && <span style={{
                            fontSize: 11,
                            background: '#e0f7fa',
                            color: '#006064',
                            padding: '1px 5px',
                            borderRadius: 4
                        }}>🕒 时间任意</span>}
                        {batch.missingEquipment.length > 0 && <span style={{
                            fontSize: 11,
                            color: 'red',
                            border: '1px solid red',
                            padding: '0 4px',
                            borderRadius: 4
                        }}>缺道具</span>}
                    </div>
                }
                headerBg={batch.missingEquipment.length > 0 ? '#fff3e0' : (isFlexibleTime ? '#f0f4c3' : '#f1f8e9')}
                headerColor={batch.missingEquipment.length > 0 ? '#e65100' : '#33691e'}
            >
                <div>
                    {relatedOrders.length > 0 && (
                        <div style={{
                            fontSize: 12,
                            color: '#999',
                            marginBottom: 8,
                            paddingLeft: 2,
                            display: 'flex',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: 6
                        }}>
                            <span>关联订单:</span>
                            {relatedOrders.map(order => {
                                const isReady = checkOrderStockReady(order);
                                const popoverKey = `order-${order.id}`;
                                return (
                                    <Popover
                                        key={order.id}
                                        isOpen={activePopoverId === popoverKey}
                                        onOpenChange={(open) => setActivePopoverId(open ? popoverKey : null)}
                                        content={
                                            <div style={{minWidth: 200, padding: 4}}>
                                                <div style={{
                                                    fontWeight: 'bold',
                                                    borderBottom: '1px dashed #eee',
                                                    paddingBottom: 6,
                                                    marginBottom: 6,
                                                    color: '#333',
                                                    fontSize: 13,
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center'
                                                }}>
                                                    <span>🧾 {order.name}</span>
                                                    {isReady && <span style={{
                                                        fontSize: 10,
                                                        background: '#e8f5e9',
                                                        color: '#2e7d32',
                                                        padding: '1px 4px',
                                                        borderRadius: 4
                                                    }}>可完成</span>}
                                                </div>
                                                <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
                                                    {order.items.map(item => {
                                                        const m = MUSHROOM_DB.find(d => d.id === item.mushroomId);
                                                        if (!m) return null;
                                                        const stock = inventory[item.mushroomId] || 0;
                                                        const isEnough = stock >= item.count;
                                                        return (
                                                            <div key={item.mushroomId} style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'space-between',
                                                                fontSize: 12
                                                            }}>
                                                                <div style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 6
                                                                }}>
                                                                    <MiniImg src={getMushroomImg(m.id)} size={24}
                                                                             circle/>
                                                                    <span style={{color: '#555'}}>{m.name}</span>
                                                                </div>
                                                                <div style={{fontSize: 11}}>
                                                                    <span style={{color: '#888'}}>需{item.count}</span>
                                                                    <span style={{
                                                                        margin: '0 4px',
                                                                        color: '#eee'
                                                                    }}>|</span>
                                                                    <span style={{
                                                                        color: isEnough ? '#2e7d32' : '#e65100',
                                                                        fontWeight: 'bold'
                                                                    }}>
                                                                        存{stock}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        }
                                    >
                                        <span
                                            style={{
                                                cursor: 'pointer',
                                                textDecoration: 'underline',
                                                color: isReady ? '#2e7d32' : '#1565c0',
                                                fontWeight: isReady ? 'bold' : 'normal',
                                                padding: '2px 6px',
                                                borderRadius: 4,
                                                background: activePopoverId === popoverKey
                                                    ? (isReady ? '#e8f5e9' : '#e3f2fd')
                                                    : 'transparent',
                                                transition: 'background 0.2s',
                                                display: 'flex', alignItems: 'center', gap: 3
                                            }}
                                            title="点击查看订单详情"
                                        >
                                            {isReady && <span style={{fontSize: 10}}>✅</span>}
                                            {order.name}
                                        </span>
                                    </Popover>
                                );
                            })}
                        </div>
                    )}

                    <div style={{
                        display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 10,
                        background: '#fff', padding: '8px 10px', borderRadius: 6, border: '1px solid #eee'
                    }}>
                        <EnvBadge label="木头" value={batch.env.wood} icon="🪵"/>
                        <EnvBadge label="日照" value={batch.env.light} icon="💡"/>
                        <EnvBadge label="补水" value={batch.env.humidifier} icon="💧"/>
                        <EnvBadge label="时间" value={batch.env.time} icon="🕒"/>

                        {batch.missingEquipment.length > 0 && (
                            <div style={{
                                color: 'red',
                                fontWeight: 'bold',
                                fontSize: 12,
                                display: 'flex',
                                alignItems: 'center'
                            }}>
                                🚫 缺: {batch.missingEquipment.map(m => m.value).join(', ')}
                            </div>
                        )}
                    </div>

                    {/* NEW: 道具需求汇总 (分开展示) */}
                    {(Object.keys(coreTools).length > 0 || Object.keys(passengerTools).length > 0) && (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6,
                            marginBottom: 15,
                            paddingLeft: 4
                        }}>

                            {/* 核心目标道具 */}
                            {Object.keys(coreTools).length > 0 && (
                                <div style={{display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap'}}>
                                    <span style={{fontSize: 13, fontWeight: 'bold', color: '#555'}}>🚑 核心需:</span>
                                    {Object.entries(coreTools).map(([cond, count]) => (
                                        <div key={cond} style={{
                                            display: 'flex', alignItems: 'center', gap: 4,
                                            background: '#fff3e0', border: '1px solid #ffe0b2',
                                            padding: '2px 8px', borderRadius: 12, fontSize: 12
                                        }}>
                                            <MiniImg src={TOOL_INFO[cond].img} size={18} circle/>
                                            <span style={{color: '#ef6c00'}}>{TOOL_INFO[cond].name}</span>
                                            <strong style={{color: '#d32f2f', marginLeft: 2}}>x{count}</strong>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* 蹭车目标道具 */}
                            {Object.keys(passengerTools).length > 0 && (
                                <div style={{display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap'}}>
                                    <span style={{fontSize: 13, fontWeight: 'bold', color: '#888'}}>🚌 蹭车需:</span>
                                    {Object.entries(passengerTools).map(([cond, count]) => (
                                        <div key={cond} style={{
                                            display: 'flex', alignItems: 'center', gap: 4,
                                            background: '#f5f5f5', border: '1px solid #e0e0e0',
                                            padding: '2px 8px', borderRadius: 12, fontSize: 12, opacity: 0.8
                                        }}>
                                            <MiniImg src={TOOL_INFO[cond].img} size={18} circle/>
                                            <span style={{color: '#666'}}>{TOOL_INFO[cond].name}</span>
                                            <strong style={{color: '#555', marginLeft: 2}}>x{count}</strong>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <div style={{
                        display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 15, fontSize: 13,
                        background: '#fafafa', padding: 12, borderRadius: 8, border: '1px solid #f0f0f0'
                    }}>
                        {diseaseGroups['healthy'].length > 0 && (
                            <div style={{display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap'}}>
                                <span style={{fontWeight: 'bold', color: '#2e7d32', width: 60}}>💚 健康:</span>
                                {aggregateTasks(diseaseGroups['healthy']).map((t, i) => (
                                    <div key={i} style={{
                                        display: 'flex', alignItems: 'center', gap: 4,
                                        border: t.isPassenger ? '1px dashed #ccc' : '1px solid #e0e0e0',
                                        background: '#fff', padding: '2px 6px', borderRadius: 4,
                                        opacity: t.isPassenger ? 0.7 : 1
                                    }}>
                                        <MiniImg src={getChildImg(t.starter, undefined)} size={24} circle/>
                                        <span>{MUSHROOM_CHILDREN[t.starter as MushroomChildId]}</span>
                                        <span
                                            style={{fontWeight: 'bold', color: '#555', marginLeft: 2}}>x{t.count}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {diseaseGroups['less'].length > 0 && (
                            <div style={{display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap'}}>
                                <span style={{fontWeight: 'bold', color: '#1565c0', width: 60}}>🥀 需不良:</span>
                                {TOOL_INFO[SpecialConditions.LESS] && (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 2,
                                        background: '#e3f2fd',
                                        padding: '1px 4px',
                                        borderRadius: 4,
                                        fontSize: 11,
                                        color: '#1565c0'
                                    }}>
                                        <MiniImg src={TOOL_INFO[SpecialConditions.LESS].img} size={16} circle/>
                                        <span>{TOOL_INFO[SpecialConditions.LESS].name}</span>
                                    </div>
                                )}
                                {aggregateTasks(diseaseGroups['less']).map((t, i) => (
                                    <div key={i} style={{
                                        display: 'flex', alignItems: 'center', gap: 4,
                                        border: t.isPassenger ? '1px dashed #90caf9' : '1px solid #bbdefb',
                                        background: '#fff', padding: '2px 6px', borderRadius: 4,
                                        opacity: t.isPassenger ? 0.7 : 1
                                    }}>
                                        <MiniImg
                                            src={getChildImg(t.starter, t.special as (SpecialConditionType | undefined))}
                                            size={24} circle/>
                                        <span>{MUSHROOM_CHILDREN[t.starter as MushroomChildId]}</span>
                                        <span style={{
                                            fontWeight: 'bold',
                                            color: '#1565c0',
                                            marginLeft: 2
                                        }}>x{t.count}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {diseaseGroups['much'].length > 0 && (
                            <div style={{display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap'}}>
                                <span style={{fontWeight: 'bold', color: '#6a1b9a', width: 60}}>💊 需过剩:</span>
                                {TOOL_INFO[SpecialConditions.MUCH] && (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 2,
                                        background: '#f3e5f5',
                                        padding: '1px 4px',
                                        borderRadius: 4,
                                        fontSize: 11,
                                        color: '#6a1b9a'
                                    }}>
                                        <MiniImg src={TOOL_INFO[SpecialConditions.MUCH].img} size={16} circle/>
                                        <span>{TOOL_INFO[SpecialConditions.MUCH].name}</span>
                                    </div>
                                )}
                                {aggregateTasks(diseaseGroups['much']).map((t, i) => (
                                    <div key={i} style={{
                                        display: 'flex', alignItems: 'center', gap: 4,
                                        border: t.isPassenger ? '1px dashed #ce93d8' : '1px solid #e1bee7',
                                        background: '#fff', padding: '2px 6px', borderRadius: 4,
                                        opacity: t.isPassenger ? 0.7 : 1
                                    }}>
                                        <MiniImg
                                            src={getChildImg(t.starter, t.special as (SpecialConditionType | undefined))}
                                            size={24} circle/>
                                        <span>{MUSHROOM_CHILDREN[t.starter as MushroomChildId]}</span>
                                        <span style={{
                                            fontWeight: 'bold',
                                            color: '#6a1b9a',
                                            marginLeft: 2
                                        }}>x{t.count}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {diseaseGroups['bug'].length > 0 && (
                            <div style={{display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap'}}>
                                <span style={{fontWeight: 'bold', color: '#c62828', width: 60}}>🐛 需生虫:</span>
                                {aggregateTasks(diseaseGroups['bug']).map((t, i) => (
                                    <div key={i} style={{
                                        display: 'flex', alignItems: 'center', gap: 4,
                                        border: t.isPassenger ? '1px dashed #ef9a9a' : '1px solid #ffcdd2',
                                        background: '#fff', padding: '2px 6px', borderRadius: 4
                                    }}>
                                        <MiniImg
                                            src={getChildImg(t.starter, t.special as (SpecialConditionType | undefined))}
                                            size={24} circle/>
                                        <span>{MUSHROOM_CHILDREN[t.starter as MushroomChildId]}</span>
                                        <span style={{
                                            fontWeight: 'bold',
                                            color: '#c62828',
                                            marginLeft: 2
                                        }}>x{t.count}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="plan-grid">
                        {batch.tasks.sort((a, b) => (a.isPassenger === b.isPassenger ? 0 : a.isPassenger ? 1 : -1)).map((task, tIdx) => {
                            const isPassenger = !!task.isPassenger;
                            const currentStock = inventory[task.mushroom.id] || 0;

                            return (
                                <div key={tIdx} style={{
                                    border: isPassenger ? '1px dashed #ccc' : '1px solid #eee',
                                    borderRadius: 8, padding: 10,
                                    background: isPassenger ? '#f9f9f9' : '#fff',
                                    position: 'relative', overflow: 'hidden', opacity: isPassenger ? 0.8 : 1,
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10
                                }}>
                                    <div style={{display: 'flex', alignItems: 'center', gap: 10, flex: 1}}>
                                        <Popover
                                            content={<MushroomInfoCard m={task.mushroom}/>}
                                            isOpen={activePopoverId === task.mushroom.id}
                                            onOpenChange={(isOpen) => setActivePopoverId(isOpen ? task.mushroom.id : null)}
                                        >
                                            <MiniImg src={getMushroomImg(task.mushroom.id)} label={task.mushroom.name}
                                                     size={40} onClick={() => {
                                            }}/>
                                        </Popover>

                                        <div>
                                            <div style={{
                                                fontWeight: 'bold', fontSize: 14,
                                                color: isPassenger ? '#555' : '#000',
                                                display: 'flex', alignItems: 'center', gap: 6
                                            }}>
                                                {task.mushroom.name}
                                                {isPassenger && <span style={{
                                                    fontSize: 10,
                                                    padding: '1px 4px',
                                                    borderRadius: 3,
                                                    background: '#eee',
                                                    color: '#666',
                                                    border: '1px solid #ddd'
                                                }}>蹭</span>}
                                            </div>
                                            <div style={{fontSize: 12, color: '#666', marginTop: 2}}>
                                                需: <span
                                                style={{color: '#d32f2f', fontWeight: 'bold'}}>{task.countNeeded}</span>
                                                <span style={{margin: '0 6px', color: '#ddd'}}>|</span>
                                                存: <span
                                                style={{color: '#2e7d32', fontWeight: 'bold'}}>{currentStock}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => onAddOne(task.mushroom.id)}
                                        style={{
                                            ...btnStyle,
                                            background: '#e8f5e9', border: '1px solid #a5d6a7',
                                            color: '#2e7d32', fontWeight: 'bold', padding: '6px 10px',
                                            height: 'fit-content'
                                        }}
                                    >
                                        +1
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </CollapsibleSection>
        );
    };

    return (
        <div style={{
            background: '#fcfcfc',
            borderRadius: 8,
            border: '1px solid #e0e0e0',
            minHeight: 600,
            position: 'relative',
            paddingBottom: 60
        }}>
            <div style={{
                padding: 20,
                borderBottom: '1px solid #eee',
                background: '#fff',
                borderRadius: '8px 8px 0 0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div><h2 style={{margin: 0, color: '#333'}}>🌱 培育计划</h2></div>
                <button onClick={onRefresh} style={{...btnStyle, background: '#f5f5f5', color: '#333'}}>🔄 刷新</button>
            </div>
            <div style={{padding: 20}}>
                {filteredMissingSummary.length > 0 && (
                    <div style={{
                        background: '#ffebee',
                        border: '1px solid #ffcdd2',
                        borderRadius: 6,
                        padding: 15,
                        marginBottom: 20
                    }}>
                        <strong style={{display: 'block', marginBottom: 10, color: '#c62828'}}>⚠️
                            缺少以下关键设备（仅统计当前筛选）：</strong>
                        <div style={{display: 'flex', flexWrap: 'wrap', gap: 10}}>
                            {filteredMissingSummary.map((item, idx) => (
                                <div key={`${item.type}-${item.value}-${idx}`} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    background: '#fff',
                                    padding: '4px 10px',
                                    borderRadius: 20,
                                    border: '1px solid #ef9a9a',
                                    color: '#c62828',
                                    fontSize: 13,
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                }}>
                                    <span>{getToolIcon(item.type)}</span><span
                                    style={{fontWeight: 'bold'}}>{item.value}</span><span
                                    style={{fontSize: 12, opacity: 0.8}}>({getSourceInfo(item.type, item.value)})</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {filteredBatches.length === 0 ? (
                    <div style={{textAlign: 'center', padding: 40, color: '#aaa'}}>
                        {batches.length === 0 ?
                            <>
                                <div style={{fontSize: 40, marginBottom: 10}}>🎉</div>
                                需求满足</> :
                            <>🔍 没有符合筛选条件的批次</>
                        }
                    </div>
                ) : (
                    <div style={{display: 'flex', flexDirection: 'column', gap: 30}}>
                        {showSplitLayout ? (
                            <>
                                {dayBatches.length > 0 && (
                                    <div style={{
                                        background: '#fff8e1',
                                        padding: 15,
                                        borderRadius: 8,
                                        border: '1px solid #ffecb3'
                                    }}>
                                        <h3 style={{
                                            marginTop: 0,
                                            color: '#f57f17',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8
                                        }}>☀️ 白天场 <span style={{
                                            fontSize: 13,
                                            fontWeight: 'normal',
                                            color: '#888'
                                        }}>(含时间任意的批次)</span></h3>
                                        {dayBatches.map((batch, i) => renderBatch(batch, i, batch.env.time === '任意'))}
                                    </div>
                                )}

                                {nightBatches.length > 0 && (
                                    <div style={{
                                        background: '#e8eaf6',
                                        padding: 15,
                                        borderRadius: 8,
                                        border: '1px solid #c5cae9'
                                    }}>
                                        <h3 style={{
                                            marginTop: 0,
                                            color: '#3949ab',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8
                                        }}>🌙 夜晚场 <span style={{
                                            fontSize: 13,
                                            fontWeight: 'normal',
                                            color: '#888'
                                        }}>(含时间任意的批次)</span></h3>
                                        {nightBatches.map((batch, i) => renderBatch(batch, i, batch.env.time === '任意'))}
                                    </div>
                                )}
                            </>
                        ) : (
                            filteredBatches.length > 0 && (() => {
                                const config = getSinglePanelConfig();
                                return (
                                    <div style={{
                                        background: config.bg,
                                        padding: 15,
                                        borderRadius: 8,
                                        border: `1px solid ${config.border}`
                                    }}>
                                        <h3 style={{
                                            marginTop: 0,
                                            color: config.titleColor,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8
                                        }}>{config.title} <span style={{
                                            fontSize: 13,
                                            fontWeight: 'normal',
                                            color: '#888'
                                        }}>{config.sub}</span></h3>
                                        {filteredBatches.map((batch, i) => renderBatch(batch, i, batch.env.time === '任意'))}
                                    </div>
                                );
                            })()
                        )}
                    </div>
                )}
            </div>

            {/* 遮罩层 */}
            {isFilterOpen && (
                <div
                    onClick={() => setIsFilterOpen(false)}
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        zIndex: 1000 // 低于菜单和按钮
                    }}
                />
            )}

            {/* 筛选菜单 (Fixed) */}
            <div style={{
                position: 'fixed',
                bottom: 100,
                right: 30,
                zIndex: 1001,
                background: '#fff',
                borderRadius: 12,
                boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                border: '1px solid #eee',
                padding: 16,
                minWidth: 240,
                display: 'flex', flexDirection: 'column', gap: 16,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                opacity: isFilterOpen ? 1 : 0,
                transform: isFilterOpen ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(10px)',
                pointerEvents: isFilterOpen ? 'auto' : 'none',
                transformOrigin: 'bottom right'
            }}>
                <div style={{
                    fontWeight: 'bold',
                    color: '#333',
                    borderBottom: '1px solid #f0f0f0',
                    paddingBottom: 10,
                    fontSize: 15
                }}>🔍 筛选培育计划
                </div>

                {/* 订单筛选 (改版：复选列表) */}
                <div>
                    <div style={{fontSize: 13, color: '#666', marginBottom: 6, fontWeight: '500'}}>🧾 关联订单 (多选)
                    </div>
                    <div style={{
                        maxHeight: 150, overflowY: 'auto',
                        border: '1px solid #eee', borderRadius: 6,
                        padding: 4, background: '#f9f9f9'
                    }}>
                        {orders.filter(o => o.active).length === 0 ? (
                            <div style={{padding: 8, color: '#999', fontSize: 12}}>暂无进行中订单</div>
                        ) : (
                            orders.filter(o => o.active).map(order => (
                                <label
                                    key={order.id}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 8,
                                        padding: '6px 8px', cursor: 'pointer',
                                        fontSize: 13, userSelect: 'none',
                                        borderRadius: 4,
                                        background: filters.orderIds.includes(order.id) ? '#e3f2fd' : 'transparent'
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={filters.orderIds.includes(order.id)}
                                        onChange={(e) => {
                                            const checked = e.target.checked;
                                            setFilters(prev => ({
                                                ...prev,
                                                orderIds: checked
                                                    ? [...prev.orderIds, order.id]
                                                    : prev.orderIds.filter(id => id !== order.id)
                                            }));
                                        }}
                                        style={{cursor: 'pointer'}}
                                    />
                                    <span style={{
                                        flex: 1,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {order.name}
                                    </span>
                                </label>
                            ))
                        )}
                    </div>
                    {/* 全选/清空辅助按钮 */}
                    <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: 4, gap: 8}}>
                        <span
                            onClick={() => setFilters(prev => ({
                                ...prev,
                                orderIds: orders.filter(o => o.active).map(o => o.id)
                            }))}
                            style={{fontSize: 11, color: '#1976d2', cursor: 'pointer', textDecoration: 'underline'}}
                        >全选</span>
                        <span
                            onClick={() => setFilters(prev => ({...prev, orderIds: []}))}
                            style={{fontSize: 11, color: '#999', cursor: 'pointer', textDecoration: 'underline'}}
                        >清空</span>
                    </div>
                </div>

                <div>
                    <div style={{fontSize: 13, color: '#666', marginBottom: 6, fontWeight: '500'}}>🪵 木头类型</div>
                    <select
                        value={filters.wood}
                        onChange={e => setFilters({...filters, wood: e.target.value})}
                        style={{
                            width: '100%', padding: '8px 10px', borderRadius: 6,
                            border: '1px solid #ddd', fontSize: 14, outline: 'none',
                            background: '#f9f9f9'
                        }}
                    >
                        <option value="all">全部木头</option>
                        {Object.values(Woods).map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                </div>

                <div>
                    <div style={{fontSize: 13, color: '#666', marginBottom: 6, fontWeight: '500'}}>🚦 道具状态</div>
                    <select
                        value={filters.status}
                        onChange={e => setFilters({...filters, status: e.target.value})}
                        style={{
                            width: '100%', padding: '8px 10px', borderRadius: 6,
                            border: '1px solid #ddd', fontSize: 14, outline: 'none',
                            background: '#f9f9f9'
                        }}
                    >
                        <option value="all">全部</option>
                        <option value="ready">✅ 道具齐全 (可开始)</option>
                        <option value="missing">🚫 缺道具</option>
                    </select>
                </div>

                <div style={{fontSize: 12, color: '#999', textAlign: 'right', marginTop: 4}}>
                    符合条件: <b>{filteredBatches.length}</b> 批
                </div>
            </div>

            {/* 悬浮按钮 (Fixed FAB) */}
            <div
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                style={{
                    position: 'fixed',
                    bottom: 30, right: 30,
                    width: 56, height: 56,
                    borderRadius: '50%',
                    background: isFilterOpen ? '#f44336' : '#1976d2',
                    color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 6px 16px rgba(0,0,0,0.15), 0 12px 24px rgba(0,0,0,0.1)',
                    zIndex: 1002, // 确保在菜单之上
                    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    transform: isFilterOpen ? 'rotate(90deg)' : 'rotate(0deg)'
                }}
                title="筛选培育计划"
            >
                {isFilterOpen ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                         strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                         strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                    </svg>
                )}
            </div>
        </div>
    );
};