// src/components/PlanPanel.tsx
import React, { useMemo, useState } from 'react';
import { MUSHROOM_CHILDREN, MUSHROOM_DB } from '../database';
import type { CalculationResult, MissingItem, PlanBatch, PlanTask } from '../logic';
import type { MushroomChildId, Order, SpecialConditionType } from '../types';
import { SpecialConditions, TimeRanges, VIRTUAL_ORDER_ID, Woods } from '../types';
import { getChildImg, getMushroomImg, getSourceInfo, getToolIcon, PROTAGONISTS, TOOL_INFO } from '../utils';
import { CollapsibleSection, EnvBadge, MiniImg, MushroomInfoCard, Popover } from './Common';
import { btnStyle } from "../styles";

interface PlanPanelProps {
    plan: CalculationResult;
    onCompleteTask: (task: PlanTask) => void;
    onRefresh: () => void;
    orders: Order[];
    inventory: Record<string, number>;
    onAddOne: (id: string) => void;
    collectedIds: string[];
}

export const PlanPanel: React.FC<PlanPanelProps> = ({
                                                        plan: {batches, missingSummary},
                                                        orders,
                                                        inventory,
                                                        onAddOne,
                                                        collectedIds
                                                    }) => {
    const [activePopoverId, setActivePopoverId] = useState<string | null>(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isNavOpen, setIsNavOpen] = useState(false);

    // 新增：Tab 状态，默认显示白天
    const [activeTimeTab, setActiveTimeTab] = useState<'day' | 'night'>('day');

    const scrollToId = (id: string) => {
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({behavior: 'smooth', block: 'start'});
            setIsNavOpen(false); // 跳转后自动关闭菜单
        }
    };

    const [filters, setFilters] = useState({
        wood: 'all',
        status: 'all',
        orderIds: [] as string[]
    });

    const checkOrderStockReady = (order: Order) => {
        if (order.items.length === 0) return false;
        return order.items.every(item => {
            const current = inventory[item.mushroomId] || 0;
            return current >= item.count;
        });
    };

    const filteredBatches = useMemo(() => {
        return batches.filter(batch => {
            if (filters.wood !== 'all' && batch.env.wood !== filters.wood) return false;
            if (filters.status === 'ready' && batch.missingEquipment.length > 0) return false;
            if (filters.status === 'missing' && batch.missingEquipment.length === 0) return false;
            if (filters.orderIds.length > 0) {
                const isRelated = batch.tasks.some(task => {
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

    const filteredMissingSummary = useMemo(() => {
        if (filters.wood === 'all' && filters.status === 'all' && filters.orderIds.length === 0) {
            return missingSummary;
        }
        const map = new Map<string, MissingItem>();
        filteredBatches.forEach(batch => {
            batch.missingEquipment.forEach(item => {
                const key = `${item.type}-${item.value}`;
                if (!map.has(key)) map.set(key, item);
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
            title: '☀️ 白天场',
            sub: '(包含时间任意的批次)',
            bg: '#fff8e1',
            border: '#ffecb3',
            titleColor: '#f57f17'
        };
        if (hasStrictNight) return {
            title: '🌙 夜晚场',
            sub: '(包含时间任意的批次)',
            bg: '#e8eaf6',
            border: '#c5cae9',
            titleColor: '#3949ab'
        };
        return {
            title: '🕒 自由时间',
            sub: '(所有批次时间均不限)',
            bg: '#eceff1',
            border: '#cfd8dc',
            titleColor: '#455a64'
        };
    };

    const orderGroups = useMemo(() => {
        const activeOrders = orders.filter(o => o.active);
        const groups: Record<string, Order[]> = {
            '图鉴': [],
            ...Object.fromEntries(PROTAGONISTS.map(name => [name, []])),
            '其他': []
        };

        activeOrders.forEach(o => {
            if (o.id === VIRTUAL_ORDER_ID) {
                groups['图鉴'].push(o);
                return;
            }
            const foundProtagonist = PROTAGONISTS.find(p => o.name.includes(p));
            if (foundProtagonist) {
                groups[foundProtagonist].push(o);
            } else {
                groups['其他'].push(o);
            }
        });
        return groups;
    }, [orders]);

    const renderBatch = (batch: PlanBatch, _: number, isFlexibleTime: boolean) => {
        const relatedOrderMap = new Map<string, Order>();
        batch.tasks.forEach(t => {
            orders.filter(o => o.active && o.items.some(i => i.mushroomId === t.mushroom.id))
                .forEach(o => relatedOrderMap.set(o.id, o));
        });
        const relatedOrders = Array.from(relatedOrderMap.values());

        relatedOrders.sort((a, b) => {
            if (a.id === VIRTUAL_ORDER_ID) return -1;
            if (b.id === VIRTUAL_ORDER_ID) return 1;
            const isAReady = checkOrderStockReady(a);
            const isBReady = checkOrderStockReady(b);
            if (isAReady !== isBReady) return isAReady ? -1 : 1;
            return a.name.localeCompare(b.name);
        });
        const hasVirtualOrder = relatedOrders.some(o => o.id === VIRTUAL_ORDER_ID);

        const timeWarningGroups: Record<string, { hasCore: boolean, hasPassenger: boolean }> = {};
        batch.tasks.forEach(t => {
            const key = `${t.mushroom.starter}-${t.mushroom.special || 'none'}`;
            if (!timeWarningGroups[key]) timeWarningGroups[key] = {hasCore: false, hasPassenger: false};
            if (t.isPassenger) timeWarningGroups[key].hasPassenger = true;
            else timeWarningGroups[key].hasCore = true;
        });
        const showTimeWarning = Object.values(timeWarningGroups).some(g => g.hasCore && g.hasPassenger);

        const coreTools: Record<string, number> = {};
        const passengerTools: Record<string, number> = {};
        batch.tasks.forEach(t => {
            if (t.mushroom.special && t.mushroom.save && TOOL_INFO[t.mushroom.special]) {
                if (t.isPassenger) passengerTools[t.mushroom.special] = (passengerTools[t.mushroom.special] || 0) + t.countNeeded;
                else coreTools[t.mushroom.special] = (coreTools[t.mushroom.special] || 0) + t.countNeeded;
            }
        });

        const diseaseGroups: Record<string, PlanTask[]> = {'healthy': [], 'less': [], 'much': [], 'bug': []};
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
                if (!map.has(key)) map.set(key, {
                    starter: t.mushroom.starter,
                    count: 0,
                    isPassenger: !!t.isPassenger,
                    special: t.mushroom.special
                });
                map.get(key)!.count += t.countNeeded;
            });
            return Array.from(map.values()).sort((a, b) => (a.isPassenger !== b.isPassenger ? (a.isPassenger ? 1 : -1) : 0));
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
                        {hasVirtualOrder && <span style={{
                            fontSize: 11,
                            background: '#f3e5f5',
                            color: '#8e24aa',
                            border: '1px solid #e1bee7',
                            padding: '1px 6px',
                            borderRadius: 4,
                            fontWeight: 'bold'
                        }}>📖 图鉴补全</span>}
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
                                const isVirtual = order.id === VIRTUAL_ORDER_ID;
                                const isReady = !isVirtual && checkOrderStockReady(order);
                                const popoverKey = `order-${order.id}`;

                                return (
                                    <Popover
                                        key={order.id}
                                        isOpen={activePopoverId === popoverKey}
                                        onOpenChange={(open) => setActivePopoverId(open ? popoverKey : null)}
                                        content={
                                            isVirtual ? (
                                                <div style={{minWidth: 150, padding: 4}}>
                                                    <div style={{
                                                        fontWeight: 'bold',
                                                        color: '#6a1b9a',
                                                        marginBottom: 4
                                                    }}>{order.name}</div>
                                                    <div style={{fontSize: 12, color: '#333'}}>
                                                        {(() => {
                                                            const newInBatchCount = batch.tasks.reduce((count, t) => {
                                                                if ((inventory[t.mushroom.id] || 0) <= 0 && !collectedIds.includes(t.mushroom.id)) {
                                                                    return count + 1;
                                                                }
                                                                return count;
                                                            }, 0);
                                                            return <>本批次可收集：<b style={{
                                                                color: '#d32f2f',
                                                                fontSize: 14
                                                            }}>{newInBatchCount}</b></>;
                                                        })()}
                                                    </div>
                                                </div>
                                            ) : (
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
                                                                        <span
                                                                            style={{color: '#888'}}>需{item.count}</span>
                                                                        <span style={{
                                                                            margin: '0 4px',
                                                                            color: '#eee'
                                                                        }}>|</span>
                                                                        <span style={{
                                                                            color: stock >= item.count ? '#2e7d32' : '#e65100',
                                                                            fontWeight: 'bold'
                                                                        }}>存{stock}</span>
                                                                    </div>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            )
                                        }
                                    >
                                        <span style={{
                                            cursor: 'pointer',
                                            textDecoration: 'underline',
                                            color: isVirtual ? '#8e24aa' : (isReady ? '#2e7d32' : '#1565c0'),
                                            fontWeight: isReady || isVirtual ? 'bold' : 'normal',
                                            padding: '2px 6px',
                                            borderRadius: 4,
                                            background: activePopoverId === popoverKey ? (isVirtual ? '#f3e5f5' : (isReady ? '#e8f5e9' : '#e3f2fd')) : 'transparent',
                                            transition: 'background 0.2s',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 3
                                        }}>
                                            {isReady && <span style={{fontSize: 10}}>✅</span>}
                                            {order.name}
                                        </span>
                                    </Popover>
                                );
                            })}
                        </div>
                    )}
                    <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 10,
                        marginBottom: 10,
                        background: '#fff',
                        padding: '8px 10px',
                        borderRadius: 6,
                        border: '1px solid #eee'
                    }}>
                        <EnvBadge label="木头" value={batch.env.wood} icon="🪵"/>
                        <EnvBadge label="日照" value={batch.env.light} icon="💡"/>
                        <EnvBadge label="补水" value={batch.env.humidifier} icon="💧"/>
                        <EnvBadge label="时间" value={batch.env.time} icon="🕒"/>
                        {batch.missingEquipment.length > 0 && <div style={{
                            color: 'red',
                            fontWeight: 'bold',
                            fontSize: 12,
                            display: 'flex',
                            alignItems: 'center'
                        }}>🚫 缺: {batch.missingEquipment.map(m => m.value).join(', ')}</div>}
                    </div>

                    {(Object.keys(coreTools).length > 0 || Object.keys(passengerTools).length > 0) && (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6,
                            marginBottom: 15,
                            paddingLeft: 4
                        }}>
                            {Object.keys(coreTools).length > 0 && (
                                <div style={{display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap'}}>
                                    <span style={{fontSize: 13, fontWeight: 'bold', color: '#555'}}>🚑 核心需:</span>
                                    {Object.entries(coreTools).map(([cond, count]) => (
                                        <div key={cond} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 4,
                                            background: '#fff3e0',
                                            border: '1px solid #ffe0b2',
                                            padding: '2px 8px',
                                            borderRadius: 12,
                                            fontSize: 12
                                        }}>
                                            <MiniImg src={TOOL_INFO[cond].img} size={18} circle/>
                                            <span style={{color: '#ef6c00'}}>{TOOL_INFO[cond].name}</span>
                                            <strong style={{color: '#d32f2f', marginLeft: 2}}>x{count}</strong>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {Object.keys(passengerTools).length > 0 && (
                                <div style={{display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap'}}>
                                    <span style={{fontSize: 13, fontWeight: 'bold', color: '#888'}}>🚌 蹭车需:</span>
                                    {Object.entries(passengerTools).map(([cond, count]) => (
                                        <div key={cond} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 4,
                                            background: '#f5f5f5',
                                            border: '1px solid #e0e0e0',
                                            padding: '2px 8px',
                                            borderRadius: 12,
                                            fontSize: 12,
                                            opacity: 0.8
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
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        marginBottom: 15,
                        fontSize: 13,
                        background: '#fafafa',
                        padding: 12,
                        borderRadius: 8,
                        border: '1px solid #f0f0f0'
                    }}>
                        {showTimeWarning && <div style={{
                            color: '#e65100',
                            background: '#fff3e0',
                            border: '1px solid #ffe0b2',
                            padding: '6px 10px',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 'bold',
                            marginBottom: 8
                        }}>⚠️ 核心目标幼菌生长时间更长，请务必注意区分，避免收获错误品种！</div>}

                        {['healthy', 'less', 'much', 'bug'].map(key => {
                            const tasks = diseaseGroups[key];
                            if (tasks.length === 0) return null;
                            const color = key === 'healthy' ? '#2e7d32' : key === 'less' ? '#1565c0' : key === 'much' ? '#6a1b9a' : '#c62828';
                            const label = key === 'healthy' ? '💚 健康' : key === 'less' ? '🥀 需不良' : key === 'much' ? '💊 需过剩' : '🐛 需生虫';
                            return (
                                <div key={key}
                                     style={{display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap'}}>
                                    <span style={{fontWeight: 'bold', color, width: 60}}>{label}:</span>
                                    {aggregateTasks(tasks).map((t, i) => (
                                        <div key={i} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 4,
                                            border: t.isPassenger ? '1px dashed #ccc' : `1px solid #e0e0e0`,
                                            background: '#fff',
                                            padding: '2px 6px',
                                            borderRadius: 4,
                                            opacity: t.isPassenger ? 0.7 : 1
                                        }}>
                                            <MiniImg src={getChildImg(t.starter, t.special as SpecialConditionType)}
                                                     size={24} circle/>
                                            <span>{MUSHROOM_CHILDREN[t.starter as MushroomChildId]}</span>
                                            <span style={{fontWeight: 'bold', color, marginLeft: 2}}>x{t.count}</span>
                                        </div>
                                    ))}
                                </div>
                            )
                        })}
                    </div>

                    <div className="plan-grid">
                        {batch.tasks.sort((a, b) => (a.isPassenger === b.isPassenger ? 0 : a.isPassenger ? 1 : -1)).map((task, tIdx) => {
                            const isPassenger = !!task.isPassenger;
                            const currentStock = inventory[task.mushroom.id] || 0;
                            const isUncollected = !collectedIds.includes(task.mushroom.id);
                            return (
                                <div key={tIdx} style={{
                                    border: isPassenger ? '1px dashed #ccc' : '1px solid #eee',
                                    borderRadius: 8,
                                    padding: 10,
                                    background: isPassenger ? '#f9f9f9' : '#fff',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    opacity: isPassenger ? 0.8 : 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 10
                                }}>
                                    <div style={{display: 'flex', alignItems: 'center', gap: 10, flex: 1}}>
                                        <Popover content={<MushroomInfoCard m={task.mushroom}/>}
                                                 isOpen={activePopoverId === task.mushroom.id}
                                                 onOpenChange={(isOpen) => setActivePopoverId(isOpen ? task.mushroom.id : null)}>
                                            <MiniImg src={getMushroomImg(task.mushroom.id)} label={task.mushroom.name}
                                                     size={40}/>
                                        </Popover>
                                        <div>
                                            <div style={{
                                                fontWeight: 'bold',
                                                fontSize: 14,
                                                color: isPassenger ? '#555' : '#000',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 6
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
                                                {isUncollected && <span style={{
                                                    fontSize: 10,
                                                    color: '#e65100',
                                                    background: '#fff3e0',
                                                    border: '1px solid #ffcc80',
                                                    borderRadius: 4,
                                                    padding: '0 4px'
                                                }}>新</span>}
                                            </div>
                                            <div style={{fontSize: 12, color: '#666', marginTop: 2}}>
                                                需: <span
                                                style={{color: '#d32f2f', fontWeight: 'bold'}}>{task.countNeeded}</span>
                                                <span style={{margin: '0 6px', color: '#ddd'}}>|</span> 存: <span
                                                style={{color: '#2e7d32', fontWeight: 'bold'}}>{currentStock}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => onAddOne(task.mushroom.id)} style={{
                                        ...btnStyle,
                                        background: '#e8f5e9',
                                        border: '1px solid #a5d6a7',
                                        color: '#2e7d32',
                                        fontWeight: 'bold',
                                        padding: '6px 10px',
                                        height: 'fit-content'
                                    }} title="+1"> +1
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
                <div style={{display: 'flex', alignItems: 'center', gap: 15}}>
                    <h2 style={{margin: 0, color: '#333'}}>🌱 培育计划</h2>
                    <span style={{
                        fontSize: 12,
                        color: '#c62828',
                        background: '#ffebee',
                        padding: '4px 8px',
                        borderRadius: 4,
                        border: '1px solid #ef9a9a'
                    }}>⚠️ 种完核心菌种请立刻撤下设备！</span>
                </div>
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
                        {batches.length === 0 ? <>
                            <div style={{fontSize: 40, marginBottom: 10}}>🎉</div>
                            需求满足</> : <>🔍 没有符合筛选条件的批次</>}
                    </div>
                ) : (
                    <div style={{display: 'flex', flexDirection: 'column', gap: 30}}>
                        {showSplitLayout ? (
                            <div style={{display: 'flex', flexDirection: 'column', gap: 15}}>
                                {/* 新增：Tab 切换按钮 */}
                                <div style={{display: 'flex', gap: 10}}>
                                    <button
                                        onClick={() => setActiveTimeTab('day')}
                                        style={{
                                            flex: 1,
                                            padding: '10px',
                                            borderRadius: 8,
                                            border: activeTimeTab === 'day' ? '2px solid #ffecb3' : '1px solid #eee',
                                            background: activeTimeTab === 'day' ? '#fff8e1' : '#f9f9f9',
                                            color: activeTimeTab === 'day' ? '#f57f17' : '#999',
                                            fontWeight: 'bold',
                                            fontSize: 14,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        ☀️ 白天场 ({dayBatches.length})
                                    </button>
                                    <button
                                        onClick={() => setActiveTimeTab('night')}
                                        style={{
                                            flex: 1,
                                            padding: '10px',
                                            borderRadius: 8,
                                            border: activeTimeTab === 'night' ? '2px solid #c5cae9' : '1px solid #eee',
                                            background: activeTimeTab === 'night' ? '#e8eaf6' : '#f9f9f9',
                                            color: activeTimeTab === 'night' ? '#3949ab' : '#999',
                                            fontWeight: 'bold',
                                            fontSize: 14,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        🌙 夜晚场 ({nightBatches.length})
                                    </button>
                                </div>

                                {/* 新增：Tab 内容显示 */}
                                {activeTimeTab === 'day' ? (
                                    <div style={{
                                        background: '#fff8e1',
                                        padding: 15,
                                        borderRadius: 8,
                                        border: '1px solid #ffecb3',
                                        minHeight: 200
                                    }}>
                                        {dayBatches.map((batch, i) => renderBatch(batch, i, batch.env.time === '任意'))}
                                        {dayBatches.length === 0 && <div style={{
                                            textAlign: 'center',
                                            color: '#999',
                                            padding: 20
                                        }}>本时段暂无专属任务</div>}
                                    </div>
                                ) : (
                                    <div style={{
                                        background: '#e8eaf6',
                                        padding: 15,
                                        borderRadius: 8,
                                        border: '1px solid #c5cae9',
                                        minHeight: 200
                                    }}>
                                        {nightBatches.map((batch, i) => renderBatch(batch, i, batch.env.time === '任意'))}
                                        {nightBatches.length === 0 && <div style={{
                                            textAlign: 'center',
                                            color: '#999',
                                            padding: 20
                                        }}>本时段暂无专属任务</div>}
                                    </div>
                                )}
                            </div>
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
                                        <h3 style={{marginTop: 0, color: config.titleColor}}>{config.title}</h3>
                                        {filteredBatches.map((batch, i) => renderBatch(batch, i, batch.env.time === '任意'))}
                                    </div>
                                );
                            })()
                        )}
                    </div>
                )}
            </div>

            {/* Filter UI */}
            {isFilterOpen && <div onClick={() => setIsFilterOpen(false)}
                                  style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000}}/>}
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
                minWidth: 260,
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                opacity: isFilterOpen ? 1 : 0,
                transform: isFilterOpen ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(10px)',
                pointerEvents: isFilterOpen ? 'auto' : 'none',
                transformOrigin: 'bottom right',
                transition: 'all 0.2s'
            }}>
                <div
                    style={{fontWeight: 'bold', color: '#333', borderBottom: '1px solid #f0f0f0', paddingBottom: 10}}>🔍
                    筛选培育计划
                </div>

                <div>
                    <div style={{fontSize: 13, color: '#666', marginBottom: 6, fontWeight: '500'}}>🧾 关联订单 (多选)
                    </div>
                    <div style={{
                        maxHeight: 250,
                        overflowY: 'auto',
                        border: '1px solid #eee',
                        borderRadius: 6,
                        padding: 4,
                        background: '#f9f9f9'
                    }}>
                        {['图鉴', ...PROTAGONISTS, '其他'].map(groupName => {
                            const groupOrders = orderGroups[groupName];
                            if (groupOrders.length === 0) return null;

                            const isGroupAllSelected = groupOrders.every(o => filters.orderIds.includes(o.id));
                            const isGroupPartialSelected = !isGroupAllSelected && groupOrders.some(o => filters.orderIds.includes(o.id));

                            const toggleGroup = () => {
                                const groupIds = groupOrders.map(o => o.id);
                                if (isGroupAllSelected) {
                                    setFilters(prev => ({
                                        ...prev,
                                        orderIds: prev.orderIds.filter(id => !groupIds.includes(id))
                                    }));
                                } else {
                                    setFilters(prev => ({
                                        ...prev,
                                        orderIds: Array.from(new Set([...prev.orderIds, ...groupIds]))
                                    }));
                                }
                            };

                            return (
                                <div key={groupName} style={{marginBottom: 4}}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        background: '#eee',
                                        padding: '2px 4px',
                                        borderRadius: 4,
                                        marginBottom: 2
                                    }}>
                                        <input
                                            type="checkbox"
                                            checked={isGroupAllSelected}
                                            ref={el => {
                                                if (el) el.indeterminate = isGroupPartialSelected;
                                            }}
                                            onChange={toggleGroup}
                                            style={{marginRight: 6}}
                                        />
                                        <span style={{fontSize: 12, fontWeight: 'bold', flex: 1}}>{groupName}</span>
                                    </div>
                                    {groupName !== '图鉴' && (
                                        <div style={{paddingLeft: 10, display: 'flex', flexDirection: 'column'}}>
                                            {groupOrders.map(order => (
                                                <label key={order.id} style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                    padding: '2px 4px',
                                                    fontSize: 12,
                                                    cursor: 'pointer'
                                                }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={filters.orderIds.includes(order.id)}
                                                        onChange={e => {
                                                            const checked = e.target.checked;
                                                            setFilters(prev => ({
                                                                ...prev,
                                                                orderIds: checked ? [...prev.orderIds, order.id] : prev.orderIds.filter(id => id !== order.id)
                                                            }));
                                                        }}
                                                    />
                                                    <span style={{
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        flex: 1
                                                    }}>{order.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {Object.values(orderGroups).every(arr => arr.length === 0) &&
                            <div style={{padding: 8, color: '#999', fontSize: 12}}>暂无订单</div>}
                    </div>
                    <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: 4, gap: 8}}>
                        <span onClick={() => setFilters(prev => ({
                            ...prev,
                            orderIds: orders.filter(o => o.active).map(o => o.id)
                        }))} style={{
                            fontSize: 11,
                            color: '#1976d2',
                            cursor: 'pointer',
                            textDecoration: 'underline'
                        }}>全选</span>
                        <span onClick={() => setFilters(prev => ({...prev, orderIds: []}))} style={{
                            fontSize: 11,
                            color: '#999',
                            cursor: 'pointer',
                            textDecoration: 'underline'
                        }}>清空</span>
                    </div>
                </div>

                <div>
                    <div style={{fontSize: 13, color: '#666', marginBottom: 6, fontWeight: '500'}}>🪵 木头类型</div>
                    <select value={filters.wood} onChange={e => setFilters({...filters, wood: e.target.value})}
                            style={{width: '100%', padding: '6px', borderRadius: 4, border: '1px solid #ddd'}}>
                        <option value="all">全部</option>
                        {Object.values(Woods).map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                </div>
                <div>
                    <div style={{fontSize: 13, color: '#666', marginBottom: 6, fontWeight: '500'}}>🚦 道具状态</div>
                    <select value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})}
                            style={{width: '100%', padding: '6px', borderRadius: 4, border: '1px solid #ddd'}}>
                        <option value="all">全部</option>
                        <option value="ready">✅ 道具齐全</option>
                        <option value="missing">🚫 缺道具</option>
                    </select>
                </div>
            </div>

            <>
                {/* 导航菜单 */}
                <div style={{
                    position: 'fixed',
                    bottom: 170,
                    right: 38,
                    display: 'flex', flexDirection: 'column', gap: 10,
                    zIndex: 1002,
                    transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    opacity: isNavOpen ? 1 : 0,
                    pointerEvents: isNavOpen ? 'auto' : 'none',
                    transform: isNavOpen ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.9)',
                    transformOrigin: 'bottom center'
                }}>
                    <button onClick={() => scrollToId('panel-equipment')} style={{
                        padding: '8px 12px',
                        background: '#fff',
                        border: '1px solid #ccc',
                        borderRadius: 20,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        fontSize: 13,
                        color: '#333',
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                    }}>
                        <span>💡</span> 设备
                    </button>
                    <button onClick={() => scrollToId('panel-inventory')} style={{
                        padding: '8px 12px',
                        background: '#fff',
                        border: '1px solid #ccc',
                        borderRadius: 20,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        fontSize: 13,
                        color: '#333',
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                    }}>
                        <span>🎒</span> 库存
                    </button>
                    <button onClick={() => scrollToId('panel-orders')} style={{
                        padding: '8px 12px',
                        background: '#fff',
                        border: '1px solid #ccc',
                        borderRadius: 20,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        fontSize: 13,
                        color: '#333',
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                    }}>
                        <span>📋</span> 订单
                    </button>
                    {/* 新增：跳转到培育计划 */}
                    <button onClick={() => scrollToId('panel-plan')} style={{
                        padding: '8px 12px',
                        background: '#fff',
                        border: '1px solid #ccc',
                        borderRadius: 20,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        fontSize: 13,
                        color: '#333',
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                    }}>
                        <span>🌱</span> 计划
                    </button>
                </div>

                {/* 导航球按钮 */}
                <div
                    onClick={() => setIsNavOpen(!isNavOpen)}
                    style={{
                        position: 'fixed',
                        bottom: 100, // 在筛选球上方 (30 + 56 + 14 = 100)
                        right: 30,
                        width: 56, height: 56,
                        borderRadius: '50%',
                        background: '#fff',
                        color: '#1976d2',
                        border: '1px solid #ddd',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 6px 16px rgba(0,0,0,0.1), 0 12px 24px rgba(0,0,0,0.05)',
                        zIndex: 1002,
                        transition: 'transform 0.3s',
                        transform: isNavOpen ? 'rotate(90deg)' : 'rotate(0)'
                    }}
                    title="快速跳转"
                >
                    {isNavOpen ? (
                        <span style={{fontSize: 24, fontWeight: 'bold'}}>✕</span>
                    ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                             strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="8" y1="6" x2="21" y2="6"></line>
                            <line x1="8" y1="12" x2="21" y2="12"></line>
                            <line x1="8" y1="18" x2="21" y2="18"></line>
                            <line x1="3" y1="6" x2="3.01" y2="6"></line>
                            <line x1="3" y1="12" x2="3.01" y2="12"></line>
                            <line x1="3" y1="18" x2="3.01" y2="18"></line>
                        </svg>
                    )}
                </div>
            </>

            {/* 筛选悬浮按钮 (Icon 修改回漏斗) */}
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
                    zIndex: 1002,
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