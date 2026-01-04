// src/components/OrderPanel.tsx
import React, { useCallback, useMemo, useState } from 'react';
import { MUSHROOM_DB } from '../database';
import { getMushroomImg, PROTAGONISTS } from '../utils';
import { CollapsibleSection, MiniImg, MushroomSelector } from './Common';
import type { FilterIntent, HumidifierType, LightType, Order, WoodType } from '../types';

interface OrderPanelProps {
    orders: Order[];
    virtualOrder: Order | null;
    onToggleVirtualOrder: (active: boolean) => void;
    newOrderName: string;
    growingCounts: Record<string, number>;
    onNewOrderNameChange: (val: string) => void;
    onAddOrder: (nameOverride?: string) => void;
    editingOrderIds: Set<string>;
    onToggleEdit: (id: string, isEditing: boolean) => void;
    onDeleteOrder: (id: string) => void;
    onToggleActive: (id: string) => void;
    onArchiveOrder: (id: string) => void;
    onAddItem: (oid: string, mid: string) => void;
    onUpdateItemCount: (oid: string, mid: string, count: number) => void;
    onRemoveItem: (oid: string, mid: string) => void;
    unlockedWoods: WoodType[];
    unlockedLights: LightType[];
    unlockedHumidifiers: HumidifierType[];
    inventory: Record<string, number>;
    // 新增：筛选联动回调
    onFilterIntentChange?: (intent: FilterIntent) => void;
}

// 静态组件：状态徽章
const StatusBadge: React.FC<{ active: boolean; equipReady: boolean; stockReady: boolean }> = ({
                                                                                                  active,
                                                                                                  equipReady,
                                                                                                  stockReady
                                                                                              }) => {
    if (!active) {
        return <span style={{
            fontSize: 11,
            background: '#f5f5f5',
            color: '#999',
            padding: '2px 6px',
            borderRadius: 4,
            border: '1px solid #ddd'
        }}>⏸️ 已暂停</span>;
    }
    if (stockReady) {
        return <span style={{
            fontSize: 11,
            background: '#e8f5e9',
            color: '#2e7d32',
            padding: '2px 6px',
            borderRadius: 4,
            border: '1px solid #a5d6a7',
            fontWeight: 'bold'
        }}>✅ 可完成</span>;
    }
    if (equipReady) {
        return <span style={{
            fontSize: 11,
            background: '#e3f2fd',
            color: '#1565c0',
            padding: '2px 6px',
            borderRadius: 4,
            border: '1px solid #90caf9',
            fontWeight: 'bold'
        }}>🚀 可开始</span>;
    }
    return <span style={{
        fontSize: 11,
        background: '#fff3e0',
        color: '#ef6c00',
        padding: '2px 6px',
        borderRadius: 4,
        border: '1px solid #ffe0b2',
        fontWeight: 'bold'
    }}>⚠️ 缺道具</span>;
};

export const OrderPanel: React.FC<OrderPanelProps> = ({
                                                          orders,
                                                          virtualOrder,
                                                          onToggleVirtualOrder,
                                                          newOrderName,
                                                          growingCounts,
                                                          onNewOrderNameChange,
                                                          onAddOrder,
                                                          editingOrderIds,
                                                          onToggleEdit,
                                                          onDeleteOrder,
                                                          onToggleActive,
                                                          onArchiveOrder,
                                                          onAddItem,
                                                          onUpdateItemCount,
                                                          onRemoveItem,
                                                          unlockedWoods,
                                                          unlockedLights,
                                                          unlockedHumidifiers,
                                                          inventory,
                                                          onFilterIntentChange
                                                      }) => {
    // 筛选状态: null(全部) | 'READY'(可完成) | 'OTHER'(其他) | 男主名字
    const [activeProtagonistFilter, setActiveProtagonistFilter] = useState<string | null>(null);

    const handleQuickCreate = (name: string) => {
        const existingCount = orders.filter(o => o.name.includes(name)).length;
        let nextIndex = existingCount + 1;
        let candidateName = `${name}${nextIndex}`;
        while (orders.some(o => o.name === candidateName)) {
            nextIndex++;
            candidateName = `${name}${nextIndex}`;
        }
        onAddOrder(candidateName);
    };

    const isOrderReady = useCallback((order: Order) => {
        if (order.items.length === 0) return true;
        return order.items.every(item => {
            const m = MUSHROOM_DB.find(def => def.id === item.mushroomId);
            if (!m) return true;
            const woodReady = !m.wood || unlockedWoods.includes(m.wood);
            const lightReady = !m.light || unlockedLights.includes(m.light);
            const humidifierReady = !m.humidifier || unlockedHumidifiers.includes(m.humidifier);
            return woodReady && lightReady && humidifierReady;
        });
    }, [unlockedWoods, unlockedLights, unlockedHumidifiers]);

    const checkEquipmentReady = useCallback((order: Order) => isOrderReady(order), [isOrderReady]);

    const checkStockReady = useCallback((order: Order) => {
        if (order.items.length === 0) return false;
        return order.items.every(item => {
            const current = inventory[item.mushroomId] || 0;
            return current >= item.count;
        });
    }, [inventory]);

    // 过滤并排序订单
    const sortedOrders = useMemo(() => {
        let filtered = orders;

        // 1. 筛选逻辑
        if (activeProtagonistFilter === 'READY') {
            // 筛选库存充足的 (包括暂停和未暂停)
            filtered = orders.filter(o => checkStockReady(o));
        } else if (activeProtagonistFilter === 'OTHER') {
            filtered = orders.filter(o => !PROTAGONISTS.some(p => o.name.includes(p)));
        } else if (activeProtagonistFilter) {
            filtered = orders.filter(o => o.name.includes(activeProtagonistFilter));
        }

        const withIndex = filtered.map((order, index) => ({order, index}));

        return withIndex.sort((a, b) => {
            const orderA = a.order;
            const orderB = b.order;

            const isEditingA = editingOrderIds.has(orderA.id);
            const isEditingB = editingOrderIds.has(orderB.id);
            if (isEditingA !== isEditingB) return isEditingA ? -1 : 1;

            if (orderA.active !== orderB.active) return orderA.active ? -1 : 1;

            if (orderA.active) {
                const stockA = checkStockReady(orderA);
                const stockB = checkStockReady(orderB);
                if (stockA !== stockB) return stockA ? -1 : 1;

                const equipA = checkEquipmentReady(orderA);
                const equipB = checkEquipmentReady(orderB);
                if (equipA !== equipB) return equipA ? -1 : 1;
            }

            return a.index - b.index;
        }).map(item => item.order);
    }, [orders, editingOrderIds, checkStockReady, checkEquipmentReady, activeProtagonistFilter]);

    // 通用按钮样式
    const filterBtnStyle = {
        padding: '6px 14px', // 稍微加大点击区域
        borderRadius: 20,    // 更圆润
        border: '1px solid',
        fontSize: 13,
        cursor: 'pointer',
        whiteSpace: 'nowrap' as const,
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    };

    // 修改：处理筛选变化并发送联动意图
    const handleFilterChange = (newVal: string | null) => {
        setActiveProtagonistFilter(newVal);
        if (onFilterIntentChange) {
            // 根据 newVal 决定发送什么意图给 PlanPanel
            if (newVal === null) {
                // 点击“全部”或者取消当前筛选 -> 显示全部
                onFilterIntentChange({type: 'all'});
            } else if (newVal === 'OTHER') {
                // 点击“其他” -> 筛选“其他”组
                onFilterIntentChange({type: 'group', value: '其他'});
            } else if (PROTAGONISTS.includes(newVal)) {
                // 点击“男主名” -> 筛选该男主组
                onFilterIntentChange({type: 'group', value: newVal});
            }
            // 注意：如果 newVal === 'READY' (可完成)，不发送意图，保持 PlanPanel 原样
        }
    };

    return (
        <CollapsibleSection
            title={
                <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                    <span>📋 订单管理</span>
                    <span style={{
                        fontSize: 12, fontWeight: 'normal',
                        background: 'rgba(255,255,255,0.6)',
                        padding: '1px 8px', borderRadius: 10,
                        color: '#1565c0', border: '1px solid rgba(21, 101, 192, 0.2)'
                    }}>
                        {sortedOrders.length} / {orders.length} （不包含图鉴订单）
                    </span>
                </div>
            }
            defaultOpen={true}
            headerBg="#e3f2fd"
            headerColor="#1565c0"
        >
            {/* 改版后的快速筛选器：双行布局 */}
            <div style={{display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 15}}>

                {/* 第一行：功能性筛选 (全部、可完成、其他) */}
                <div style={{display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center'}}>
                    <button
                        onClick={() => handleFilterChange(null)}
                        style={{
                            ...filterBtnStyle,
                            background: activeProtagonistFilter === null ? '#1565c0' : '#fff',
                            color: activeProtagonistFilter === null ? '#fff' : '#666',
                            borderColor: activeProtagonistFilter === null ? '#1565c0' : '#ddd',
                            fontWeight: activeProtagonistFilter === null ? 'bold' : 'normal',
                            flex: 1, // 在手机上平分宽度
                            minWidth: 'fit-content'
                        }}
                    >
                        全部
                    </button>

                    <button
                        onClick={() => handleFilterChange(activeProtagonistFilter === 'READY' ? null : 'READY')}
                        style={{
                            ...filterBtnStyle,
                            background: activeProtagonistFilter === 'READY' ? '#e8f5e9' : '#fff',
                            color: activeProtagonistFilter === 'READY' ? '#2e7d32' : '#2e7d32',
                            borderColor: activeProtagonistFilter === 'READY' ? '#2e7d32' : '#a5d6a7',
                            fontWeight: 'bold',
                            boxShadow: activeProtagonistFilter === 'READY' ? '0 2px 4px rgba(46, 125, 50, 0.2)' : 'none',
                            flex: 1.5, // 稍微宽一点强调
                            minWidth: 'fit-content'
                        }}
                    >
                        ✅ 可完成
                    </button>

                    <button
                        onClick={() => handleFilterChange(activeProtagonistFilter === 'OTHER' ? null : 'OTHER')}
                        style={{
                            ...filterBtnStyle,
                            background: activeProtagonistFilter === 'OTHER' ? '#e3f2fd' : '#fff',
                            color: activeProtagonistFilter === 'OTHER' ? '#1565c0' : '#666',
                            borderColor: activeProtagonistFilter === 'OTHER' ? '#1565c0' : '#ddd',
                            fontWeight: activeProtagonistFilter === 'OTHER' ? 'bold' : 'normal',
                            flex: 1,
                            minWidth: 'fit-content'
                        }}
                    >
                        其他
                    </button>
                </div>

                {/* 第二行：男主筛选 */}
                <div style={{display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center'}}>
                    {PROTAGONISTS.map(name => (
                        <button
                            key={name}
                            onClick={() => handleFilterChange(name === activeProtagonistFilter ? null : name)}
                            style={{
                                ...filterBtnStyle,
                                padding: '5px 12px', // 男主名字较短，稍微紧凑一点
                                background: activeProtagonistFilter === name ? '#e3f2fd' : '#fff',
                                color: activeProtagonistFilter === name ? '#1565c0' : '#666',
                                borderColor: activeProtagonistFilter === name ? '#1565c0' : '#ddd',
                                fontWeight: activeProtagonistFilter === name ? 'bold' : 'normal',
                                flexGrow: 1, // 让按钮铺满行，视觉更整齐
                                maxWidth: 100 // 限制最大宽度，防止在大屏上太长
                            }}
                        >
                            {name}
                        </button>
                    ))}
                </div>
            </div>

            {/* 新增/快速创建区域 */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                marginBottom: 15,
                background: '#f5f5f5',
                padding: 10,
                borderRadius: 8
            }}>
                <div style={{display: 'flex', gap: 10}}>
                    <input
                        placeholder="新订单名称..."
                        value={newOrderName}
                        onChange={e => onNewOrderNameChange(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && onAddOrder()}
                        style={{
                            flex: 1,
                            padding: '8px 12px',
                            borderRadius: 4,
                            border: '1px solid #ccc',
                            outline: 'none'
                        }}
                    />
                    <button
                        onClick={() => onAddOrder()}
                        disabled={!newOrderName.trim()}
                        style={{
                            padding: '8px 20px', borderRadius: 4, border: 'none',
                            background: newOrderName.trim() ? '#1976d2' : '#e0e0e0',
                            color: '#fff', cursor: newOrderName.trim() ? 'pointer' : 'not-allowed',
                            fontWeight: 'bold'
                        }}
                    >
                        添加
                    </button>
                </div>
                <div style={{display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap'}}>
                    <span style={{fontSize: 12, color: '#888', whiteSpace: 'nowrap'}}>⚡ 快速创建:</span>
                    {PROTAGONISTS.map(name => (
                        <button
                            key={name}
                            onClick={() => handleQuickCreate(name)}
                            style={{
                                padding: '2px 8px', borderRadius: 4, border: '1px solid #ddd',
                                background: '#fff', fontSize: 12, cursor: 'pointer', color: '#555',
                                whiteSpace: 'nowrap'
                            }}
                            title={`自动创建 "${name}N" 并开始编辑`}
                        >
                            {name}
                        </button>
                    ))}
                </div>
            </div>

            <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
                {/* 虚拟图鉴订单 (永远显示) */}
                {virtualOrder && (
                    <div style={{
                        border: virtualOrder.active ? '1px solid #ba68c8' : '1px dashed #ccc',
                        borderRadius: 8, padding: 12,
                        background: virtualOrder.active ? '#f3e5f5' : '#fafafa',
                        opacity: virtualOrder.active ? 1 : 0.75,
                        transition: 'all 0.2s',
                    }}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                            <div style={{display: 'flex', alignItems: 'center', gap: 8, flex: 1}}>
                                <span style={{
                                    fontWeight: 'bold',
                                    fontSize: 15,
                                    color: virtualOrder.active ? '#6a1b9a' : '#999'
                                }}>
                                    {virtualOrder.name}
                                </span>
                                {virtualOrder.active ? (
                                    <span style={{
                                        fontSize: 11,
                                        background: '#f3e5f5',
                                        color: '#8e24aa',
                                        padding: '2px 6px',
                                        borderRadius: 4,
                                        border: '1px solid #e1bee7',
                                        fontWeight: 'bold'
                                    }}>自动</span>
                                ) : (
                                    <StatusBadge active={false} equipReady={true} stockReady={false}/>
                                )}
                            </div>
                            <button onClick={() => onToggleVirtualOrder(!virtualOrder.active)} style={{
                                fontSize: 16,
                                width: 34,
                                height: 34,
                                cursor: 'pointer',
                                background: '#fff',
                                border: '1px solid #ddd',
                                borderRadius: 6,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                {virtualOrder.active ? '⏸️' : '▶️'}
                            </button>
                        </div>
                        {virtualOrder.active && (
                            <div style={{marginTop: 8, fontSize: 13, color: '#6a1b9a'}}>
                                📊 收集进度：
                                {(() => {
                                    // 统计三种状态
                                    let countA = 0; // 待采摘 (无库存，但正在培育)
                                    let countB = 0; // 有库存 (有库存，未收集)
                                    let countC = 0; // 未收集 (无库存，也没在培育)

                                    virtualOrder.items.forEach(item => {
                                        const stock = inventory[item.mushroomId] || 0;
                                        const growing = growingCounts[item.mushroomId] || 0;

                                        if (stock > 0) {
                                            countB++; // 优先算作 B类
                                        } else if (growing > 0) {
                                            countA++; // 其次算作 A类
                                        } else {
                                            countC++; // 剩下的是 C类
                                        }
                                    });

                                    return (
                                        <span style={{fontWeight: 'bold'}}>
                                            未收集：{countC}，有库存且未收集：{countB}，待采摘：{countA}
                                        </span>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                )}

                {sortedOrders.length === 0 && !virtualOrder &&
                    <div style={{color: '#999', textAlign: 'center', padding: 20}}>暂无订单</div>}

                {sortedOrders.map(order => {
                    const isEditing = editingOrderIds.has(order.id);
                    const equipReady = checkEquipmentReady(order);
                    const stockReady = checkStockReady(order);

                    return (
                        <div key={order.id} style={{
                            border: order.active ? (stockReady ? '1px solid #81c784' : (equipReady ? '1px solid #90caf9' : '1px solid #ffcc80')) : '1px dashed #ccc',
                            borderRadius: 8, padding: 12,
                            background: order.active ? (stockReady ? '#f1f8e9' : '#fff') : '#fafafa',
                            opacity: order.active ? 1 : 0.75, transition: 'all 0.2s',
                            boxShadow: isEditing ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
                        }}>
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                <div style={{display: 'flex', alignItems: 'center', gap: 8, flex: 1}}>
                                    <span style={{
                                        fontWeight: 'bold',
                                        fontSize: 15,
                                        color: order.active ? '#333' : '#999'
                                    }}>
                                        {order.name}
                                    </span>
                                    <StatusBadge active={order.active} equipReady={equipReady} stockReady={stockReady}/>
                                </div>
                                <div style={{display: 'flex', gap: 6}}>
                                    <button onClick={() => onToggleActive(order.id)} style={{
                                        fontSize: 16,
                                        width: 34,
                                        height: 34,
                                        cursor: 'pointer',
                                        background: '#fff',
                                        border: '1px solid #ddd',
                                        borderRadius: 6,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        {order.active ? '⏸️' : '▶️'}
                                    </button>
                                    <button onClick={() => onArchiveOrder(order.id)} style={{
                                        fontSize: 16,
                                        width: 34,
                                        height: 34,
                                        cursor: 'pointer',
                                        background: stockReady ? '#e8f5e9' : '#f5f5f5',
                                        border: stockReady ? '1px solid #a5d6a7' : '1px solid #ddd',
                                        borderRadius: 6,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        opacity: stockReady ? 1 : 0.5
                                    }}>
                                        ✅
                                    </button>
                                    <button onClick={() => onToggleEdit(order.id, !isEditing)} style={{
                                        fontSize: 16,
                                        width: 34,
                                        height: 34,
                                        cursor: 'pointer',
                                        background: isEditing ? '#e3f2fd' : '#fff',
                                        border: isEditing ? '1px solid #90caf9' : '1px solid #ddd',
                                        borderRadius: 6,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        {isEditing ? '💾' : '✏️'}
                                    </button>
                                    <button onClick={() => onDeleteOrder(order.id)} style={{
                                        fontSize: 16,
                                        width: 34,
                                        height: 34,
                                        cursor: 'pointer',
                                        background: '#fff',
                                        border: '1px solid #ffcdd2',
                                        borderRadius: 6,
                                        color: '#c62828',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        🗑️
                                    </button>
                                </div>
                            </div>
                            {isEditing ? (
                                <div style={{marginTop: 10, borderTop: '1px dashed #eee', paddingTop: 10}}>
                                    <div style={{display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10}}>
                                        {order.items.map(item => {
                                            const m = MUSHROOM_DB.find(d => d.id === item.mushroomId);
                                            if (!m) return null;
                                            return (
                                                <div key={item.mushroomId} style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 5,
                                                    background: '#fff',
                                                    border: '1px solid #eee',
                                                    padding: '2px 6px',
                                                    borderRadius: 20,
                                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                                }}>
                                                    <MiniImg src={getMushroomImg(m.id)} size={24} circle/>
                                                    <span style={{fontSize: 13}}>{m.name}</span>
                                                    <input type="number" min={0}
                                                           value={item.count === 0 ? '' : item.count}
                                                           onChange={e => {
                                                               const val = e.target.value;
                                                               const num = val === '' ? 0 : parseInt(val);
                                                               if (!isNaN(num) && num >= 0) onUpdateItemCount(order.id, m.id, num);
                                                           }}
                                                           style={{
                                                               width: 50,
                                                               padding: 2,
                                                               textAlign: 'center',
                                                               border: 'none',
                                                               borderBottom: '1px solid #ccc',
                                                               outline: 'none'
                                                           }}
                                                    />
                                                    <span onClick={() => onRemoveItem(order.id, m.id)} style={{
                                                        cursor: 'pointer',
                                                        color: '#ccc',
                                                        marginLeft: 2,
                                                        fontSize: 14,
                                                        fontWeight: 'bold'
                                                    }} title="移除此项">×</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <MushroomSelector onSelect={(mid) => onAddItem(order.id, mid)}/>
                                </div>
                            ) : (
                                order.items.length > 0 && (
                                    <div style={{marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8}}>
                                        {order.items.map(i => {
                                            const m = MUSHROOM_DB.find(d => d.id === i.mushroomId);
                                            if (!m) return null;
                                            const currentStock = inventory[m.id] || 0;
                                            const isEnough = currentStock >= i.count;
                                            return (
                                                <div key={i.mushroomId} style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                    background: order.active ? 'rgba(255,255,255,0.6)' : '#eee',
                                                    padding: '2px 8px',
                                                    borderRadius: 16,
                                                    border: isEnough ? '1px solid rgba(0,0,0,0.05)' : '1px dashed #ffcc80',
                                                    fontSize: 12
                                                }}>
                                                    <MiniImg src={getMushroomImg(m.id)} size={20} circle/>
                                                    <span style={{color: '#555'}}>{m.name}</span>
                                                    <span style={{
                                                        fontWeight: 'bold',
                                                        color: isEnough ? '#2e7d32' : '#e65100'
                                                    }}>{currentStock}/{i.count}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )
                            )}
                        </div>
                    );
                })}
            </div>
        </CollapsibleSection>
    );
};