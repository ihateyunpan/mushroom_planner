// src/components/OrderPanel.tsx
import React, { useMemo } from 'react';
import { MUSHROOM_DB } from '../database';
import { getMushroomImg } from '../utils';
import { CollapsibleSection, MiniImg, MushroomSelector } from './Common';
import type { HumidifierType, LightType, Order, WoodType } from '../types';

interface OrderPanelProps {
    orders: Order[];
    newOrderName: string;
    onNewOrderNameChange: (val: string) => void;
    onAddOrder: () => void;
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
}

export const OrderPanel: React.FC<OrderPanelProps> = ({
                                                          orders,
                                                          newOrderName,
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
                                                          inventory
                                                      }) => {

    const isOrderReady = (order: Order) => {
        if (order.items.length === 0) return true;
        return order.items.every(item => {
            const m = MUSHROOM_DB.find(def => def.id === item.mushroomId);
            if (!m) return true;
            const woodReady = !m.wood || unlockedWoods.includes(m.wood);
            const lightReady = !m.light || unlockedLights.includes(m.light);
            const humidifierReady = !m.humidifier || unlockedHumidifiers.includes(m.humidifier);
            return woodReady && lightReady && humidifierReady;
        });
    };

    const checkEquipmentReady = (order: Order) => isOrderReady(order);

    const checkStockReady = (order: Order) => {
        if (order.items.length === 0) return false;
        return order.items.every(item => {
            const current = inventory[item.mushroomId] || 0;
            return current >= item.count;
        });
    };

    const sortedOrders = useMemo(() => {
        const withIndex = orders.map((order, index) => ({order, index}));

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
    }, [orders, editingOrderIds, unlockedWoods, unlockedLights, unlockedHumidifiers, inventory]);

    const StatusBadge: React.FC<{ active: boolean; equipReady: boolean; stockReady: boolean }> = ({
                                                                                                      active,
                                                                                                      equipReady,
                                                                                                      stockReady
                                                                                                  }) => {
        if (!active) {
            return (
                <span style={{
                    fontSize: 11, background: '#f5f5f5', color: '#999',
                    padding: '2px 6px', borderRadius: 4, border: '1px solid #ddd',
                    display: 'flex', alignItems: 'center', gap: 4
                }}>
                    ⏸️ 已暂停
                </span>
            );
        }
        if (stockReady) {
            return (
                <span style={{
                    fontSize: 11, background: '#e8f5e9', color: '#2e7d32',
                    padding: '2px 6px', borderRadius: 4, border: '1px solid #a5d6a7',
                    fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 4
                }}>
                    ✅ 可完成
                </span>
            );
        }
        if (equipReady) {
            return (
                <span style={{
                    fontSize: 11, background: '#e3f2fd', color: '#1565c0',
                    padding: '2px 6px', borderRadius: 4, border: '1px solid #90caf9',
                    fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 4
                }}>
                    🚀 可开始
                </span>
            );
        }
        return (
            <span style={{
                fontSize: 11, background: '#fff3e0', color: '#ef6c00',
                padding: '2px 6px', borderRadius: 4, border: '1px solid #ffe0b2',
                fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 4
            }}>
                ⚠️ 缺道具
            </span>
        );
    };

    return (
        <CollapsibleSection
            title={
                <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                    <span>📋 订单管理</span>
                    {/* 新增：显示订单总数 */}
                    <span style={{
                        fontSize: 12, fontWeight: 'normal',
                        background: 'rgba(255,255,255,0.6)',
                        padding: '1px 8px', borderRadius: 10,
                        color: '#1565c0', border: '1px solid rgba(21, 101, 192, 0.2)'
                    }}>
                        {orders.length}
                    </span>
                </div>
            }
            defaultOpen={true}
            headerBg="#e3f2fd"
            headerColor="#1565c0"
        >
            <div style={{display: 'flex', gap: 10, marginBottom: 15}}>
                <input
                    placeholder="新订单名称 (如: 主线任务3)"
                    value={newOrderName}
                    onChange={e => onNewOrderNameChange(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && onAddOrder()}
                    style={{
                        flex: 1, padding: '8px 12px', borderRadius: 4,
                        border: '1px solid #ccc', outline: 'none'
                    }}
                />
                <button
                    onClick={onAddOrder}
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

            <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
                {sortedOrders.length === 0 &&
                    <div style={{color: '#999', textAlign: 'center', padding: 20}}>暂无订单</div>}

                {sortedOrders.map(order => {
                    const isEditing = editingOrderIds.has(order.id);
                    const equipReady = checkEquipmentReady(order);
                    const stockReady = checkStockReady(order);

                    return (
                        <div key={order.id} style={{
                            border: order.active
                                ? (stockReady ? '1px solid #81c784' : (equipReady ? '1px solid #90caf9' : '1px solid #ffcc80'))
                                : '1px dashed #ccc',
                            borderRadius: 8,
                            padding: 12,
                            background: order.active
                                ? (stockReady ? '#f1f8e9' : '#fff')
                                : '#fafafa',
                            opacity: order.active ? 1 : 0.75,
                            transition: 'all 0.2s',
                            boxShadow: isEditing ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
                        }}>
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                <div style={{display: 'flex', alignItems: 'center', gap: 8, flex: 1}}>
                                    <span style={{
                                        fontWeight: 'bold',
                                        fontSize: 15,
                                        color: order.active ? '#333' : '#999',
                                    }}>
                                        {order.name}
                                    </span>
                                    <StatusBadge active={order.active} equipReady={equipReady} stockReady={stockReady}/>
                                </div>

                                <div style={{display: 'flex', gap: 6}}>
                                    <button
                                        onClick={() => onToggleActive(order.id)}
                                        title={order.active ? "暂停订单" : "恢复订单"}
                                        style={{
                                            fontSize: 16, width: 34, height: 34, cursor: 'pointer',
                                            background: '#fff', border: '1px solid #ddd', borderRadius: 6,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}
                                    >
                                        {order.active ? '⏸️' : '▶️'}
                                    </button>

                                    <button
                                        onClick={() => onArchiveOrder(order.id)}
                                        title="完成归档 (扣除库存)"
                                        style={{
                                            fontSize: 16, width: 34, height: 34, cursor: 'pointer',
                                            background: stockReady ? '#e8f5e9' : '#f5f5f5',
                                            border: stockReady ? '1px solid #a5d6a7' : '1px solid #ddd',
                                            borderRadius: 6,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            opacity: stockReady ? 1 : 0.5
                                        }}
                                    >
                                        ✅
                                    </button>

                                    <button
                                        onClick={() => onToggleEdit(order.id, !isEditing)}
                                        title="编辑订单"
                                        style={{
                                            fontSize: 16, width: 34, height: 34, cursor: 'pointer',
                                            background: isEditing ? '#e3f2fd' : '#fff',
                                            border: isEditing ? '1px solid #90caf9' : '1px solid #ddd',
                                            borderRadius: 6,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}
                                    >
                                        {isEditing ? '💾' : '✏️'}
                                    </button>

                                    <button
                                        onClick={() => onDeleteOrder(order.id)}
                                        title="删除订单"
                                        style={{
                                            fontSize: 16, width: 34, height: 34, cursor: 'pointer',
                                            background: '#fff', border: '1px solid #ffcdd2', borderRadius: 6,
                                            color: '#c62828',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}
                                    >
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
                                                    display: 'flex', alignItems: 'center', gap: 5,
                                                    background: '#fff', border: '1px solid #eee',
                                                    padding: '2px 6px', borderRadius: 20,
                                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                                }}>
                                                    <MiniImg src={getMushroomImg(m.id)} size={24} circle/>
                                                    <span style={{fontSize: 13}}>{m.name}</span>
                                                    <input
                                                        type="number" min={1} value={item.count}
                                                        onChange={e => onUpdateItemCount(order.id, m.id, parseInt(e.target.value) || 0)}
                                                        style={{
                                                            width: 35,
                                                            padding: 2,
                                                            textAlign: 'center',
                                                            border: 'none',
                                                            borderBottom: '1px solid #ccc',
                                                            outline: 'none'
                                                        }}
                                                    />
                                                    <span
                                                        onClick={() => onRemoveItem(order.id, m.id)}
                                                        style={{
                                                            cursor: 'pointer',
                                                            color: '#ccc',
                                                            marginLeft: 2,
                                                            fontSize: 14,
                                                            fontWeight: 'bold'
                                                        }}
                                                        title="移除此项"
                                                    >×</span>
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
                                                    display: 'flex', alignItems: 'center', gap: 6,
                                                    background: order.active ? 'rgba(255,255,255,0.6)' : '#eee',
                                                    padding: '2px 8px', borderRadius: 16,
                                                    border: isEnough ? '1px solid rgba(0,0,0,0.05)' : '1px dashed #ffcc80',
                                                    fontSize: 12
                                                }}>
                                                    <MiniImg src={getMushroomImg(m.id)} size={20} circle/>
                                                    <span style={{color: '#555'}}>{m.name}</span>
                                                    <span style={{
                                                        fontWeight: 'bold',
                                                        color: isEnough ? '#2e7d32' : '#e65100'
                                                    }}>
                                                        {currentStock}/{i.count}
                                                    </span>
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