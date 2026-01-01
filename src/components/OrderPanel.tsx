import React from 'react';
import { MUSHROOM_DB } from '../database';
import type { Order } from '../types';
import { getMushroomImg } from '../utils';
import { btnStyle, CollapsibleSection, MiniImg, MushroomSelector } from './Common';

interface OrderPanelProps {
    orders: Order[];
    newOrderName: string;
    onNewOrderNameChange: (name: string) => void;
    onAddOrder: () => void;
    editingOrderIds: Set<string>;
    onToggleEdit: (orderId: string, isEditing: boolean) => void;
    onDeleteOrder: (orderId: string) => void;
    onToggleActive: (orderId: string) => void;
    onAddItem: (orderId: string, mushroomId: string) => void;
    onUpdateItemCount: (orderId: string, mushroomId: string, count: number) => void;
    onRemoveItem: (orderId: string, mushroomId: string) => void;
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
                                                          onAddItem,
                                                          onUpdateItemCount,
                                                          onRemoveItem
                                                      }) => {
    return (
        <CollapsibleSection title="📜 客户订单" defaultOpen={true} headerBg="#e3f2fd" headerColor="#1565c0">
            <div style={{display: 'flex', gap: 8, marginBottom: 15}}>
                <input
                    value={newOrderName} onChange={e => onNewOrderNameChange(e.target.value)}
                    placeholder="输入新订单客户名..."
                    style={{flex: 1, padding: 8, borderRadius: 4, border: '1px solid #ccc'}}
                />
                <button onClick={onAddOrder}
                        style={{...btnStyle, background: '#2196f3', color: '#fff', border: 'none'}}>+ 新建
                </button>
            </div>

            <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
                {orders.map(order => {
                    const isEditing = editingOrderIds.has(order.id);
                    return (
                        <CollapsibleSection
                            key={order.id}
                            title={<span style={{
                                textDecoration: order.active ? 'none' : 'line-through',
                                color: order.active ? '#333' : '#999'
                            }}>{order.name} {isEditing ? '(编辑中)' : ''}</span>}
                            defaultOpen={isEditing || order.items.length === 0}
                            headerBg={order.active ? (isEditing ? '#fff8e1' : '#fff') : '#f5f5f5'}
                            action={
                                <div style={{display: 'flex', gap: 5}}>
                                    <button style={{
                                        ...btnStyle,
                                        background: isEditing ? '#4caf50' : '#fff',
                                        color: isEditing ? '#fff' : '#333'
                                    }} onClick={(e) => {
                                        e.stopPropagation();
                                        onToggleEdit(order.id, !isEditing);
                                    }}>{isEditing ? '💾 完成' : '✏️ 编辑'}</button>
                                    {isEditing &&
                                        <button style={{fontSize: 10, cursor: 'pointer', color: 'red', opacity: 0.7}}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDeleteOrder(order.id);
                                                }}>🗑</button>}
                                    {!isEditing && <button style={{fontSize: 10, cursor: 'pointer', opacity: 0.7}}
                                                           onClick={(e) => {
                                                               e.stopPropagation();
                                                               onToggleActive(order.id);
                                                           }}>{order.active ? '🚫 停' : '✅ 启'}</button>}
                                </div>
                            }
                        >
                            <div style={{marginBottom: 10}}>
                                {order.items.length === 0 && <div style={{
                                    color: '#ccc',
                                    fontSize: 12,
                                    marginBottom: 10
                                }}>{isEditing ? '请在下方添加菌种...' : '暂无条目 (点击编辑添加)'}</div>}
                                {order.items.map(item => {
                                    const m = MUSHROOM_DB.find(x => x.id === item.mushroomId);
                                    if (!m) return null;
                                    return (
                                        <div key={item.mushroomId} style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            margin: '5px 0',
                                            fontSize: 13
                                        }}>
                                            <div style={{display: 'flex', alignItems: 'center', gap: 6}}><MiniImg
                                                src={getMushroomImg(m.id)} label={m.name}
                                                size={24}/><span>{m.name}</span></div>
                                            <div style={{display: 'flex', alignItems: 'center', gap: 4}}>
                                                {isEditing ? (
                                                    <>
                                                        <span style={{fontSize: 12, color: '#888'}}>x</span>
                                                        <input type="number" min={0}
                                                               value={item.count === 0 ? '' : item.count}
                                                               onChange={(e) => {
                                                                   const val = e.target.value;
                                                                   if (val === '') onUpdateItemCount(order.id, item.mushroomId, 0);
                                                                   else {
                                                                       const num = parseInt(val);
                                                                       if (!isNaN(num) && num > 0) onUpdateItemCount(order.id, item.mushroomId, num);
                                                                   }
                                                               }}
                                                               onBlur={() => {
                                                                   if (item.count === 0) onUpdateItemCount(order.id, item.mushroomId, 1);
                                                               }}
                                                               style={{
                                                                   width: 45,
                                                                   padding: 4,
                                                                   textAlign: 'center',
                                                                   borderRadius: 4,
                                                                   border: '1px solid #ccc',
                                                                   fontSize: 13
                                                               }}
                                                        />
                                                        <span onClick={() => onRemoveItem(order.id, item.mushroomId)}
                                                              style={{
                                                                  cursor: 'pointer',
                                                                  color: '#ff5252',
                                                                  fontSize: 16,
                                                                  marginLeft: 4,
                                                                  padding: '0 4px'
                                                              }}>×</span>
                                                    </>
                                                ) : <span style={{
                                                    fontWeight: 'bold',
                                                    padding: '0 8px'
                                                }}>x {item.count}</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {isEditing && <MushroomSelector onSelect={mid => onAddItem(order.id, mid)}/>}
                        </CollapsibleSection>
                    );
                })}
            </div>
        </CollapsibleSection>
    );
};