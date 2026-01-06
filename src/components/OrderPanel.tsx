// src/components/OrderPanel.tsx
import React, { useCallback, useMemo, useState } from 'react';
import { MUSHROOM_DB } from '../database';
import { getMushroomImg, PROTAGONISTS } from '../utils';
import { CollapsibleSection, MiniImg, MushroomSelector } from './Common';
import type { FilterIntent, HumidifierType, LightType, Order, WoodType } from '../types';
import { VIRTUAL_ORDER_ID } from '../types';

// --- 新增：带缓冲的数字输入框 (解决打字延迟 + 统一样式) ---
const BufferedCountInput: React.FC<{
    value: number;
    onCommit: (val: number) => void;
    min?: number;
}> = ({ value, onCommit, min = 0 }) => {
    const [localVal, setLocalVal] = useState(value.toString());

    // 当外部 props 改变时（例如重置表单），同步更新内部状态
    React.useEffect(() => {
        setLocalVal(value.toString());
    }, [value]);

    const handleCommit = () => {
        const num = parseInt(localVal);
        if (!isNaN(num) && num >= min) {
            onCommit(num);
        } else {
            setLocalVal(value.toString()); // 输入无效时回滚
        }
    };

    return (
        <input
            type="number"
            min={min}
            value={localVal}
            onChange={(e) => setLocalVal(e.target.value)}
            onBlur={handleCommit}
            onKeyDown={(e) => e.key === 'Enter' && handleCommit()}
            style={{
                width: 50, // 统一宽度
                padding: 2,
                textAlign: 'center',
                border: 'none',
                borderBottom: '1px solid #ccc',
                outline: 'none',
                background: 'transparent',
                fontWeight: 'normal', // 保持统一风格
                fontSize: 'inherit'
            }}
        />
    );
};

// --- 新增：查重对比 Modal ---
const DuplicateCheckModal: React.FC<{
    existingOrder: Order;
    newOrderName: string;
    draftItems: { mushroomId: string; count: number }[];
    onConfirm: () => void;
    onCancel: () => void;
}> = ({ existingOrder, newOrderName, draftItems, onConfirm, onCancel }) => {

    const renderList = (items: { mushroomId: string; count: number }[]) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto' }}>
            {items.map(item => {
                const m = MUSHROOM_DB.find(d => d.id === item.mushroomId);
                return (
                    <div key={item.mushroomId} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: 13,
                        borderBottom: '1px dashed #eee',
                        paddingBottom: 4
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <MiniImg src={getMushroomImg(item.mushroomId)} size={24} circle/>
                            <span>{m?.name}</span>
                        </div>
                        <span style={{ fontWeight: 'bold' }}>x{item.count}</span>
                    </div>
                );
            })}
        </div>
    );

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', zIndex: 1300,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }} onClick={onCancel}>
            <div style={{
                background: '#fff', borderRadius: 12, width: '100%', maxWidth: 600,
                display: 'flex', flexDirection: 'column', padding: 20, gap: 15,
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
            }} onClick={e => e.stopPropagation()}>
                <div style={{
                    fontSize: 16,
                    fontWeight: 'bold',
                    color: '#e65100',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                }}>
                    ⚠️ 发现相似订单
                </div>
                <div style={{ fontSize: 13, color: '#666' }}>
                    检测到已存在的订单要求的<b>菌种类型</b>与当前新建订单完全一致。请确认是否继续创建？
                </div>

                <div style={{ display: 'flex', gap: 15, marginTop: 10 }}>
                    {/* 左边：已有订单 */}
                    <div style={{
                        flex: 1,
                        background: '#f5f5f5',
                        padding: 12,
                        borderRadius: 8,
                        border: '1px solid #ddd'
                    }}>
                        <div style={{
                            fontWeight: 'bold',
                            marginBottom: 8,
                            color: '#555',
                            borderBottom: '1px solid #ddd',
                            paddingBottom: 4
                        }}>
                            📄 已有: {existingOrder.name}
                        </div>
                        {renderList(existingOrder.items)}
                    </div>

                    {/* 中间箭头 */}
                    <div style={{ display: 'flex', alignItems: 'center', color: '#999', fontSize: 20 }}>👉</div>

                    {/* 右边：新建订单 */}
                    <div style={{
                        flex: 1,
                        background: '#e3f2fd',
                        padding: 12,
                        borderRadius: 8,
                        border: '1px solid #90caf9'
                    }}>
                        <div style={{
                            fontWeight: 'bold',
                            marginBottom: 8,
                            color: '#1565c0',
                            borderBottom: '1px solid #90caf9',
                            paddingBottom: 4
                        }}>
                            ✨ 新建: {newOrderName}
                        </div>
                        {renderList(draftItems)}
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                    <button onClick={onCancel} style={{
                        padding: '8px 16px', borderRadius: 6, border: '1px solid #ddd',
                        background: '#fff', cursor: 'pointer'
                    }}>取消
                    </button>
                    <button onClick={onConfirm} style={{
                        padding: '8px 16px', borderRadius: 6, border: 'none',
                        background: '#1976d2', color: '#fff', cursor: 'pointer', fontWeight: 'bold'
                    }}>仍然创建
                    </button>
                </div>
            </div>
        </div>
    );
};

interface OrderPanelProps {
    orders: Order[];
    virtualOrder: Order | null;
    onToggleVirtualOrder: (active: boolean) => void;
    newOrderName: string;
    growingCounts: Record<string, number>;
    onNewOrderNameChange: (val: string) => void;
    onAddOrder: (nameOverride?: string, initialItems?: { mushroomId: string; count: number }[]) => void;
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
    onFilterIntentChange?: (intent: FilterIntent) => void;
}

// 静态组件：状态徽章
const StatusBadge: React.FC<{ active: boolean; equipReady: boolean; stockReady: boolean }> = ({
                                                                                                  active,
                                                                                                  equipReady,
                                                                                                  stockReady
                                                                                              }) => {
    // 样式优化：使用 flex 布局确保文字居中，统一字体
    const baseStyle = {
        fontSize: 11,
        padding: '2px 6px',
        borderRadius: 4,
        fontWeight: 'bold',
        whiteSpace: 'nowrap' as const,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '20px'
    };

    if (!active) {
        return <span
            style={{ ...baseStyle, background: '#f5f5f5', color: '#999', border: '1px solid #ddd' }}>⏸️ 已暂停</span>;
    }
    if (stockReady) {
        return <span style={{ ...baseStyle, background: '#e8f5e9', color: '#2e7d32', border: '1px solid #a5d6a7' }}>✅ 可完成</span>;
    }
    if (equipReady) {
        return <span style={{ ...baseStyle, background: '#e3f2fd', color: '#1565c0', border: '1px solid #90caf9' }}>🚀 可开始</span>;
    }
    return <span
        style={{ ...baseStyle, background: '#fff3e0', color: '#ef6c00', border: '1px solid #ffe0b2' }}>⚠️ 缺道具</span>;
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
    const [activeProtagonistFilter, setActiveProtagonistFilter] = useState<string | null>(null);
    const [draftItems, setDraftItems] = useState<{ mushroomId: string; count: number }[]>([]);
    const [isDrafting, setIsDrafting] = useState(false);
    const [duplicateCheckData, setDuplicateCheckData] = useState<{ existing: Order } | null>(null);

    const handleQuickNameStart = (name: string) => {
        const existingCount = orders.filter(o => o.name.includes(name)).length;
        let nextIndex = existingCount + 1;
        let candidateName = `${name}${nextIndex}`;
        while (orders.some(o => o.name === candidateName)) {
            nextIndex++;
            candidateName = `${name}${nextIndex}`;
        }
        onNewOrderNameChange(candidateName);
        setIsDrafting(true);
    };

    const handleManualStart = () => {
        if (!newOrderName.trim()) {
            alert("请先输入订单名称");
            return;
        }
        setIsDrafting(true);
    };

    const handleCancelDraft = () => {
        setIsDrafting(false);
        onNewOrderNameChange('');
        setDraftItems([]);
    };

    const addDraftItem = (mid: string) => {
        setDraftItems(prev => {
            if (prev.some(i => i.mushroomId === mid)) return prev;
            return [...prev, { mushroomId: mid, count: 1 }];
        });
    };

    const updateDraftItemCount = (mid: string, count: number) => {
        setDraftItems(prev => prev.map(i => i.mushroomId === mid ? { ...i, count } : i));
    };

    const removeDraftItem = (mid: string) => {
        setDraftItems(prev => prev.filter(i => i.mushroomId !== mid));
    };

    const findDuplicateOrder = (draft: typeof draftItems) => {
        if (draft.length === 0) return null;

        // 生成草稿的指纹：只包含排序后的 ID
        const draftIds = [...draft].map(i => i.mushroomId).sort().join('|');

        return orders.find(order => {
            if (order.id === VIRTUAL_ORDER_ID) return false;
            // 只要 ID 集合一样就算重复 (忽略数量)
            const orderIds = [...order.items].map(i => i.mushroomId).sort().join('|');
            return draftIds === orderIds;
        });
    };

    // 抽离出实际创建逻辑
    const executeCreate = () => {
        onAddOrder(newOrderName, draftItems);
        handleCancelDraft();
        setDuplicateCheckData(null);
    };
    const handleCreateOrder = () => {
        if (!newOrderName.trim()) {
            alert('请输入订单名称');
            return;
        }
        if (draftItems.length === 0) {
            alert('请至少添加一种菌种及其数量');
            return;
        }

        const duplicate = findDuplicateOrder(draftItems);
        if (duplicate) {
            // 弹出自定义 Modal
            setDuplicateCheckData({ existing: duplicate });
            return;
        }

        // 无重复直接创建
        executeCreate();
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

    const sortedOrders = useMemo(() => {
        let filtered = orders.filter(o => o.id !== VIRTUAL_ORDER_ID);

        if (activeProtagonistFilter === 'READY') {
            filtered = filtered.filter(o => checkStockReady(o));
        } else if (activeProtagonistFilter === 'OTHER') {
            filtered = filtered.filter(o => !PROTAGONISTS.some(p => o.name.includes(p)));
        } else if (activeProtagonistFilter) {
            filtered = filtered.filter(o => o.name.includes(activeProtagonistFilter));
        }

        const withIndex = filtered.map((order, index) => ({ order, index }));

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

    const handleFilterChange = (newVal: string | null) => {
        setActiveProtagonistFilter(newVal);
        if (onFilterIntentChange) {
            if (newVal === null) onFilterIntentChange({ type: 'all' });
            else if (newVal === 'OTHER') onFilterIntentChange({ type: 'group', value: '其他' });
            else if (PROTAGONISTS.includes(newVal)) onFilterIntentChange({ type: 'group', value: newVal });
        }
    };

    const filterBtnStyle = {
        padding: '6px 12px',
        borderRadius: 20,
        border: '1px solid',
        fontSize: 13,
        cursor: 'pointer',
        whiteSpace: 'nowrap' as const,
        transition: 'all 0.2s',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexGrow: 1,
        maxWidth: 120
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* 1. 插入查重 Modal */}
            {duplicateCheckData && (
                <DuplicateCheckModal
                    existingOrder={duplicateCheckData.existing}
                    newOrderName={newOrderName}
                    draftItems={draftItems}
                    onConfirm={executeCreate}
                    onCancel={() => setDuplicateCheckData(null)}
                />
            )}

            <style>{`
                .virtual-order-header {
                    display: flex; justify-content: space-between; align-items: center;
                }
                .order-controls {
                    display: flex; gap: 6px;
                }
                @media (max-width: 600px) {
                    .virtual-order-header {
                        flex-direction: column; align-items: flex-start; gap: 8px;
                    }
                    .virtual-order-header button {
                        align-self: flex-end; margin-top: -30px;
                    }
                    .order-controls {
                        margin-top: 8px; justify-content: flex-end; width: 100%;
                    }
                }
                .new-order-btn {
                    padding: 6px 12px; border-radius: 6px; border: none; cursor: pointer; font-weight: bold; white-space: nowrap; font-size: 13px;
                }
                .btn-cancel { background: #fff; color: #666; border: 1px solid #ddd; }
                .btn-confirm { background: #4caf50; color: white; box-shadow: 0 2px 4px rgba(76, 175, 80, 0.3); }
                .btn-confirm:disabled { background: #e0e0e0; color: #999; box-shadow: none; cursor: not-allowed; }
            `}</style>

            <CollapsibleSection
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>📋 订单管理</span>
                        <span style={{
                            fontSize: 12,
                            fontWeight: 'normal',
                            background: 'rgba(255,255,255,0.6)',
                            padding: '1px 8px',
                            borderRadius: 10,
                            color: '#1565c0',
                            border: '1px solid rgba(21, 101, 192, 0.2)'
                        }}>
                            {sortedOrders.length} / {orders.length} （不包含图鉴订单）
                        </span>
                    </div>
                }
                defaultOpen={true} headerBg="#e3f2fd" headerColor="#1565c0"
            >
                {virtualOrder && (
                    <div style={{
                        marginBottom: 15, padding: '8px 12px',
                        background: virtualOrder.active ? '#f3e5f5' : '#fafafa',
                        borderRadius: 8,
                        border: virtualOrder.active ? '1px solid #ba68c8' : '1px dashed #ccc',
                        fontSize: '0.9rem',
                        display: 'flex', flexDirection: 'column', gap: 8
                    }}>
                        <div className="virtual-order-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 'bold', color: virtualOrder.active ? '#6a1b9a' : '#999' }}>
                                📖 {virtualOrder.name}
                            </span>
                                {virtualOrder.active ? (
                                    <span style={{
                                        fontSize: 10,
                                        background: '#fff',
                                        color: '#8e24aa',
                                        padding: '1px 6px',
                                        borderRadius: 4,
                                        border: '1px solid #e1bee7',
                                        fontWeight: 'bold'
                                    }}>自动更新</span>
                                ) : (
                                    <span style={{ fontSize: 10, color: '#999' }}>(已暂停)</span>
                                )}
                            </div>
                            <button onClick={() => onToggleVirtualOrder(!virtualOrder.active)} style={{
                                fontSize: 13,
                                padding: '4px 10px',
                                cursor: 'pointer',
                                background: '#fff',
                                border: '1px solid #ddd',
                                borderRadius: 15,
                                color: '#555'
                            }}>
                                {virtualOrder.active ? '⏸️ 暂停' : '▶️ 启用'}
                            </button>
                        </div>
                        {virtualOrder.active && (
                            <div style={{ fontSize: 12, color: '#6a1b9a', lineHeight: 1.4 }}>
                                {(() => {
                                    let countA = 0;
                                    let countB = 0;
                                    let countC = 0;
                                    virtualOrder.items.forEach(item => {
                                        const stock = inventory[item.mushroomId] || 0;
                                        const growing = growingCounts[item.mushroomId] || 0;
                                        if (stock > 0) countB++;
                                        else if (growing > 0) countA++;
                                        else countC++;
                                    });
                                    return <span>进度: 待采摘 <b style={{ color: '#e65100' }}>{countA}</b>，有库存 <b
                                        style={{ color: '#2e7d32' }}>{countB}</b>，未收集 <b
                                        style={{ color: '#c62828' }}>{countC}</b></span>;
                                })()}
                            </div>
                        )}
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 15 }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <button onClick={() => handleFilterChange(null)} style={{
                            ...filterBtnStyle,
                            background: activeProtagonistFilter === null ? '#1565c0' : '#fff',
                            color: activeProtagonistFilter === null ? '#fff' : '#666',
                            borderColor: activeProtagonistFilter === null ? '#1565c0' : '#ddd',
                            fontWeight: activeProtagonistFilter === null ? 'bold' : 'normal',
                        }}>全部
                        </button>
                        <button onClick={() => handleFilterChange(activeProtagonistFilter === 'READY' ? null : 'READY')}
                                style={{
                                    ...filterBtnStyle,
                                    background: activeProtagonistFilter === 'READY' ? '#e8f5e9' : '#fff',
                                    color: activeProtagonistFilter === 'READY' ? '#2e7d32' : '#2e7d32',
                                    borderColor: activeProtagonistFilter === 'READY' ? '#2e7d32' : '#a5d6a7',
                                    fontWeight: 'bold',
                                }}>✅ 可完成
                        </button>
                        <button onClick={() => handleFilterChange(activeProtagonistFilter === 'OTHER' ? null : 'OTHER')}
                                style={{
                                    ...filterBtnStyle,
                                    background: activeProtagonistFilter === 'OTHER' ? '#e3f2fd' : '#fff',
                                    color: activeProtagonistFilter === 'OTHER' ? '#1565c0' : '#666',
                                    borderColor: activeProtagonistFilter === 'OTHER' ? '#1565c0' : '#ddd',
                                    fontWeight: activeProtagonistFilter === 'OTHER' ? 'bold' : 'normal',
                                }}>其他
                        </button>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        {PROTAGONISTS.map(name => (
                            <button key={name}
                                    onClick={() => handleFilterChange(name === activeProtagonistFilter ? null : name)}
                                    style={{
                                        ...filterBtnStyle,
                                        padding: '5px 10px',
                                        background: activeProtagonistFilter === name ? '#e3f2fd' : '#fff',
                                        color: activeProtagonistFilter === name ? '#1565c0' : '#666',
                                        borderColor: activeProtagonistFilter === name ? '#1565c0' : '#ddd',
                                        fontWeight: activeProtagonistFilter === name ? 'bold' : 'normal',
                                    }}>{name}</button>
                        ))}
                    </div>
                </div>

                <div style={{
                    display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20,
                    background: '#fff', padding: 15, borderRadius: 12,
                    border: '1px solid #e0e0e0', boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ fontWeight: 'bold', color: '#333', fontSize: 14 }}>✨ 新建订单</div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input
                                placeholder="订单名称 (例如: 刘辩15)"
                                value={newOrderName}
                                onChange={e => onNewOrderNameChange(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && !isDrafting) handleManualStart();
                                }}
                                style={{
                                    flex: 1, padding: '8px 12px', borderRadius: 6,
                                    border: '1px solid #ccc', outline: 'none', fontSize: 13
                                }}
                            />
                            {!isDrafting && (
                                <button onClick={handleManualStart} style={{
                                    padding: '0 16px', borderRadius: 6, border: 'none',
                                    background: '#1976d2', color: '#fff', cursor: 'pointer',
                                    fontWeight: 'bold', fontSize: 20, lineHeight: 1
                                }} title="开始选择菌种">+</button>
                            )}
                        </div>
                        {!isDrafting && (
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 12, color: '#888' }}>📝 模板:</span>
                                {PROTAGONISTS.map(name => (
                                    <button key={name} onClick={() => handleQuickNameStart(name)} style={{
                                        padding: '4px 10px', borderRadius: 15, border: '1px solid #e0e0e0',
                                        background: '#f9f9f9', fontSize: 12, cursor: 'pointer', color: '#555'
                                    }}>{name}</button>
                                ))}
                            </div>
                        )}
                    </div>

                    {isDrafting && (
                        <div style={{
                            background: '#f9f9f9', padding: 12, borderRadius: 8, border: '1px dashed #ccc',
                            animation: 'fadeIn 0.2s ease-out'
                        }}>
                            <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>🍄 选择菌种:</div>
                            {draftItems.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 15 }}>
                                    {draftItems.map(item => {
                                        const m = MUSHROOM_DB.find(d => d.id === item.mushroomId);
                                        if (!m) return null;
                                        return (
                                            <div key={item.mushroomId} style={{
                                                display: 'flex', alignItems: 'center', gap: 5,
                                                background: '#fff', border: '1px solid #eee', // 复用下方样式
                                                padding: '2px 6px', borderRadius: 20,
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                            }}>
                                                <MiniImg src={getMushroomImg(m.id)} size={24} circle/>
                                                <span style={{ fontSize: 13 }}>{m.name}</span>
                                                {/* 替换为 BufferedCountInput */}
                                                <BufferedCountInput
                                                    value={item.count}
                                                    min={1}
                                                    onCommit={(val) => updateDraftItemCount(m.id, val)}
                                                />
                                                <span onClick={() => removeDraftItem(m.id)} style={{
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
                            )}
                            <MushroomSelector onSelect={addDraftItem}/>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: 10,
                                marginTop: 15,
                                paddingTop: 12,
                                borderTop: '1px solid #eee'
                            }}>
                                <button onClick={handleCancelDraft} className="new-order-btn btn-cancel">取消</button>
                                <button onClick={handleCreateOrder} disabled={draftItems.length === 0}
                                        className="new-order-btn btn-confirm">确认添加
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {sortedOrders.length === 0 &&
                        <div style={{ color: '#999', textAlign: 'center', padding: 20 }}>暂无订单</div>}
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
                                <div className="virtual-order-header">
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        flex: 1,
                                        overflow: 'hidden'
                                    }}>
                                        <span style={{
                                            fontWeight: 'bold',
                                            fontSize: 15,
                                            color: order.active ? '#333' : '#999',
                                            whiteSpace: 'nowrap',
                                            textOverflow: 'ellipsis',
                                            overflow: 'hidden'
                                        }}>
                                            {order.name}
                                        </span>
                                        <StatusBadge active={order.active} equipReady={equipReady}
                                                     stockReady={stockReady}/>
                                    </div>
                                    <div className="order-controls">
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
                                    <div style={{ marginTop: 10, borderTop: '1px dashed #eee', paddingTop: 10 }}>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
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
                                                        <span style={{ fontSize: 13 }}>{m.name}</span>
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
                                        <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
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
                                                        <span style={{ color: '#555' }}>{m.name}</span>
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
        </div>
    );
};
