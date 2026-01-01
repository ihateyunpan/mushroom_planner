// src/App.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { HUMIDIFIER_INFO, LIGHT_INFO, MUSHROOM_CHILDREN, MUSHROOM_DB, WOOD_INFO } from './database';
import { calculateOptimalRoute, type MissingItem } from './logic';
import {
    Humidifiers,
    type HumidifierType,
    Lights,
    type LightType,
    type MushroomDef,
    type Order,
    SpecialConditions,
    type SpecialConditionType,
    TimeRanges,
    type UserSaveData,
    Woods,
    type WoodType
} from './types';
import './App.css';

// ==========================================
//               UI 辅助组件 & 常量
// ==========================================

const getMushroomImg = (id: string) => `/mushrooms/${id}.png`;
const getChildImg = (id: string, special: SpecialConditionType | undefined) => {
    let specialCode;

    switch (special) {
        case SpecialConditions.LESS: {
            specialCode = '1';
            break;
        }
        case SpecialConditions.MUCH: {
            specialCode = '2';
            break;
        }
        case SpecialConditions.BUG: {
            specialCode = '3';
            break;
        }
        default: {
            specialCode = '';
        }
    }
    return `/mushroom_children/${id}${specialCode}.png`;
};

const getSourceInfo = (type: MissingItem['type'], value: string) => {
    if (type === 'wood') return WOOD_INFO[value as WoodType]?.source || '未知来源';
    if (type === 'light') return LIGHT_INFO[value as LightType]?.source || '未知来源';
    if (type === 'humidifier') return HUMIDIFIER_INFO[value as HumidifierType]?.source || '未知来源';
    return '';
};

const getToolIcon = (type: MissingItem['type']) => {
    if (type === 'wood') return '🪵';
    if (type === 'light') return '💡';
    if (type === 'humidifier') return '💧';
    return '❓';
}

const TOOL_INFO: Record<string, { name: string; img: string }> = {
    [SpecialConditions.LESS]: {name: '菇菇滋补汤', img: '/tools/tool1.png'},
    [SpecialConditions.MUCH]: {name: '菇菇消食片', img: '/tools/tool2.png'},
    [SpecialConditions.BUG]: {name: '虫虫驱散水', img: '/tools/tool3.png'},
};

const MiniImg: React.FC<{ src: string; label?: string; size?: number; color?: string; circle?: boolean }> = ({
                                                                                                                 src,
                                                                                                                 label,
                                                                                                                 size = 32,
                                                                                                                 color = '#f5f5f5',
                                                                                                                 circle = false
                                                                                                             }) => (
    <div title={label} style={{
        width: size, height: size, background: color,
        borderRadius: circle ? '50%' : 4,
        overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '1px solid #ddd', flexShrink: 0, position: 'relative'
    }}>
        <img
            src={src}
            alt={label}
            style={{width: '100%', height: '100%', objectFit: 'contain'}}
            onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerText = label?.[0] || '?';
            }}
        />
    </div>
);

const CollapsibleSection: React.FC<{
    title: React.ReactNode;
    children: React.ReactNode;
    defaultOpen?: boolean;
    headerColor?: string;
    headerBg?: string;
    action?: React.ReactNode;
}> = ({title, children, defaultOpen = false, headerColor = '#333', headerBg = '#f8f9fa', action}) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div style={{
            background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            marginBottom: 15, border: '1px solid #eee', position: 'relative'
        }}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    padding: '10px 15px', background: headerBg, display: 'flex',
                    justifyContent: 'space-between', alignItems: 'center', gap: 10,
                    borderRadius: isOpen ? '8px 8px 0 0' : '8px',
                    cursor: 'pointer'
                }}>
                <div style={{
                    flex: 1, display: 'flex', alignItems: 'center', gap: 8,
                    fontWeight: 'bold', color: headerColor
                }}>
                    <span style={{
                        fontSize: 12,
                        transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: '0.2s'
                    }}>▶</span>
                    {title}
                </div>
                <div onClick={e => e.stopPropagation()}>
                    {action}
                </div>
            </div>
            {isOpen && <div style={{padding: 15}}>{children}</div>}
        </div>
    );
};

const btnStyle = {
    padding: '6px 12px', cursor: 'pointer', border: '1px solid #ccc',
    background: '#fff', borderRadius: 4, fontSize: 13, display: 'flex', alignItems: 'center', gap: 4
};

// ==========================================
//               搜索组件
// ==========================================
const MushroomSelector: React.FC<{ onSelect: (id: string) => void }> = ({onSelect}) => {
    const [term, setTerm] = useState('');
    const results = useMemo(() => {
        if (!term) return [];
        const lower = term.toLowerCase().trim();
        return MUSHROOM_DB.filter(m =>
            m.name.includes(lower) || m.pinyin.includes(lower)
        ).slice(0, 20);
    }, [term]);

    return (
        <div style={{position: 'relative', width: '100%', zIndex: 10, marginTop: 10}}>
            <input
                placeholder="🔍 添加菌种：搜名或拼音 (如: wnz)"
                value={term}
                onChange={e => setTerm(e.target.value)}
                style={{
                    width: '100%', padding: '8px', boxSizing: 'border-box',
                    border: '1px solid #ccc', borderRadius: 4, background: '#f9f9f9'
                }}
            />
            {term && (
                <div style={{
                    maxHeight: 200, overflowY: 'auto', border: '1px solid #ddd',
                    background: '#fff', position: 'absolute', width: '100%', top: '100%',
                    zIndex: 1000, boxShadow: '0 4px 10px rgba(0,0,0,0.1)', borderRadius: 4
                }}>
                    {results.map(m => (
                        <div key={m.id}
                             onClick={() => {
                                 onSelect(m.id);
                                 setTerm('');
                             }}
                             style={{
                                 padding: '8px 10px', cursor: 'pointer', borderBottom: '1px solid #f5f5f5',
                                 display: 'flex', gap: 10, alignItems: 'center'
                             }}>
                            <MiniImg src={getMushroomImg(m.id)} label={m.name} size={28}/>
                            <div>
                                <div style={{fontSize: 13}}>{m.name}</div>
                            </div>
                        </div>
                    ))}
                    {results.length === 0 && <div style={{padding: 10, color: '#999', fontSize: 12}}>无匹配菌种</div>}
                </div>
            )}
        </div>
    )
}

// ==========================================
//               主程序
// ==========================================

const SAFE_INITIAL_DATA: UserSaveData = {
    orders: [],
    inventory: {},
    unlockedWoods: Object.values(Woods).slice(0, 1),
    unlockedLights: Object.values(Lights).slice(0, 1),
    unlockedHumidifiers: Object.values(Humidifiers).slice(0, 1),
};

const STORAGE_KEY = 'MUSHROOM_HELPER_DATA_V1';

function App() {
    const [data, setData] = useState<UserSaveData>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                return {...SAFE_INITIAL_DATA, ...parsed};
            }
        } catch (e) {
            console.error('读取存档失败', e);
        }
        return SAFE_INITIAL_DATA;
    });

    const [newOrderName, setNewOrderName] = useState('');
    const [planVersion, setPlanVersion] = useState(0);
    const [editingOrderIds, setEditingOrderIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error('保存存档失败', e);
        }
    }, [data]);

    // --- 1. 计算逻辑 ---
    const relevantMushrooms = useMemo(() => {
        const ids = new Set<string>();
        data.orders.forEach(o => {
            o.items.forEach(item => ids.add(item.mushroomId));
        });
        return Array.from(ids)
            .map(id => MUSHROOM_DB.find(m => m.id === id))
            .filter((m): m is MushroomDef => !!m)
            .sort((a, b) => a.id.localeCompare(b.id));
    }, [data.orders]);

    const {batches, missingSummary} = useMemo(() => {
        return calculateOptimalRoute(data);
    }, [data, planVersion]);

    // --- 2. 操作 Handlers ---
    const updateInventory = (id: string, count: number) => {
        setData(prev => ({
            ...prev,
            inventory: {...prev.inventory, [id]: Math.max(0, count)}
        }));
    };

    const toggleEquipment = (type: 'wood' | 'light' | 'humidifier', value: string) => {
        setData(prev => {
            const mapKey = type === 'wood' ? 'unlockedWoods' : type === 'light' ? 'unlockedLights' : 'unlockedHumidifiers';
            const list = prev[mapKey] as string[];
            if (list.includes(value)) return {...prev, [mapKey]: list.filter(x => x !== value)};
            return {...prev, [mapKey]: [...list, value]};
        });
    };

    const toggleOrderEdit = (orderId: string, isEditing: boolean) => {
        setEditingOrderIds(prev => {
            const next = new Set(prev);
            if (isEditing) next.add(orderId);
            else next.delete(orderId);
            return next;
        });
    };

    const addOrder = () => {
        if (!newOrderName.trim()) return;
        const newId = Date.now().toString();
        const newOrder: Order = {id: newId, name: newOrderName, items: [], active: true};
        setData(prev => ({...prev, orders: [...prev.orders, newOrder]}));
        setNewOrderName('');
        toggleOrderEdit(newId, true);
    };

    const addItemToOrder = (orderId: string, mushroomId: string) => {
        setData(prev => ({
            ...prev,
            orders: prev.orders.map(o => {
                if (o.id !== orderId) return o;
                const existing = o.items.find(i => i.mushroomId === mushroomId);
                if (existing) return {
                    ...o,
                    items: o.items.map(i => i.mushroomId === mushroomId ? {...i, count: i.count + 1} : i)
                };
                return {...o, items: [...o.items, {mushroomId, count: 1}]};
            })
        }));
    };

    const updateItemCount = (orderId: string, mushroomId: string, count: number) => {
        const safeCount = Math.max(0, count);
        setData(prev => ({
            ...prev,
            orders: prev.orders.map(o => {
                if (o.id !== orderId) return o;
                return {
                    ...o,
                    items: o.items.map(i => i.mushroomId === mushroomId ? {...i, count: safeCount} : i)
                };
            })
        }));
    };

    const removeItemFromOrder = (orderId: string, mushroomId: string) => {
        setData(prev => ({
            ...prev,
            orders: prev.orders.map(o => {
                if (o.id !== orderId) return o;
                return {...o, items: o.items.filter(i => i.mushroomId !== mushroomId)};
            })
        }));
    };

    const handleExport = () => {
        const blob = new Blob([JSON.stringify(data)], {type: 'application/json'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'mushroom_save.json';
        a.click();
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = (ev) => {
            try {
                const result = ev.target?.result;
                if (typeof result !== 'string') {
                    throw new Error('文件内容无法读取');
                }

                const json = JSON.parse(result);

                // 简单的结构校验：是否包含必要的字段
                if (!json || typeof json !== 'object') {
                    throw new Error('文件不是有效的 JSON 对象');
                }

                if (!Array.isArray(json.orders)) {
                    throw new Error('文件格式错误：缺少 orders 数据');
                }

                // 兼容性合并：保留新版默认数据，覆盖旧版数据
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                setData(_ => ({
                    ...SAFE_INITIAL_DATA,
                    ...json
                }));
                alert('✅ 存档导入成功！');
            } catch (err: unknown) {
                const errorMsg = err instanceof Error ? err.message : String(err);
                alert(`❌ 导入失败：${errorMsg}`);
                console.error('导入错误:', err);
            }
        };

        reader.onerror = () => {
            alert(`❌ 文件读取错误: ${reader.error?.message || '未知错误'}`);
        };

        reader.readAsText(file);
    };

    return (
        <div className="app-container">
            <div className="app-header">
                <div className="header-title-group">
                    <div className="header-emoji" style={{fontSize: 40}}><img src={"/logo.svg"} width="70px"/></div>
                    <div>
                        <h1 style={{margin: 0, fontSize: '1.5rem'}}>养菌助手</h1>
                        <div style={{fontSize: 12, color: '#888'}}>贴心规划您的养菌计划</div>
                    </div>
                </div>
                <div className="header-actions">
                    <button onClick={handleExport} style={btnStyle}>📤 导出</button>
                    <label style={btnStyle}>
                        📥 导入
                        <input
                            type="file"
                            onChange={handleImport}
                            // 增加 application/json 以兼容 Android
                            accept=".json,application/json"
                            // 点击时清空 value，允许重复选择同一个文件
                            onClick={(e) => (e.currentTarget.value = '')}
                            style={{display: 'none'}}
                        />
                    </label>
                </div>
            </div>

            <div className="main-layout">
                <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>

                    <CollapsibleSection title="🛠️ 环境设备" defaultOpen={false} headerBg="#fff3e0"
                                        headerColor="#e65100">
                        <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
                            {/* 木头 */}
                            <div>
                                <div style={labelStyle}>🪵 木头类型</div>
                                <div style={tagContainerStyle}>
                                    {Object.values(Woods).map(w => {
                                        const unlocked = data.unlockedWoods.includes(w);
                                        const label = unlocked ? w : `${w} (${WOOD_INFO[w]?.source || '未知来源'})`;
                                        return (
                                            <ToggleTag key={w} label={label} active={unlocked}
                                                       onClick={() => toggleEquipment('wood', w)}/>
                                        );
                                    })}
                                </div>
                            </div>
                            {/* 日照灯 */}
                            <div>
                                <div style={labelStyle}>💡 日照灯</div>
                                <div style={tagContainerStyle}>
                                    {Object.values(Lights).map(l => {
                                        const unlocked = data.unlockedLights.includes(l);
                                        const label = unlocked ? l : `${l} (${LIGHT_INFO[l]?.source || '未知来源'})`;
                                        return (
                                            <ToggleTag key={l} label={label} active={unlocked}
                                                       onClick={() => toggleEquipment('light', l)}/>
                                        );
                                    })}
                                </div>
                            </div>
                            {/* 补水器 */}
                            <div>
                                <div style={labelStyle}>💧 补水器</div>
                                <div style={tagContainerStyle}>
                                    {Object.values(Humidifiers).map(h => {
                                        const unlocked = data.unlockedHumidifiers.includes(h);
                                        const label = unlocked ? h : `${h} (${HUMIDIFIER_INFO[h]?.source || '未知来源'})`;
                                        return (
                                            <ToggleTag key={h} label={label} active={unlocked}
                                                       onClick={() => toggleEquipment('humidifier', h)}/>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </CollapsibleSection>

                    <CollapsibleSection title="📦 现有库存" defaultOpen={false} headerBg="#e8f5e9" headerColor="#2e7d32">
                        {relevantMushrooms.length === 0 ? (
                            <div style={{padding: 15, color: '#999', fontSize: 13, textAlign: 'center'}}>
                                暂无活跃订单，请先添加订单。
                            </div>
                        ) : (
                            <div style={{maxHeight: 400, overflowY: 'auto'}}>
                                {relevantMushrooms.map(m => {
                                    const currentCount = data.inventory[m.id] || 0;
                                    return (
                                        <div key={m.id} style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '8px 0', borderBottom: '1px solid #f0f0f0'
                                        }}>
                                            <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                                                <MiniImg src={getMushroomImg(m.id)} label={m.name}/>
                                                <span style={{fontSize: 14}}>{m.name}</span>
                                            </div>
                                            <input
                                                type="number"
                                                min={0}
                                                value={currentCount === 0 ? '' : currentCount}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    if (val === '') {
                                                        updateInventory(m.id, 0);
                                                    } else {
                                                        const num = parseInt(val);
                                                        if (!isNaN(num) && num >= 0) {
                                                            updateInventory(m.id, num);
                                                        }
                                                    }
                                                }}
                                                style={{
                                                    width: 80, // 库存输入框宽度
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

                    <CollapsibleSection title="📜 客户订单" defaultOpen={true} headerBg="#e3f2fd" headerColor="#1565c0">
                        <div style={{display: 'flex', gap: 8, marginBottom: 15}}>
                            <input
                                value={newOrderName} onChange={e => setNewOrderName(e.target.value)}
                                placeholder="输入新订单客户名..."
                                style={{flex: 1, padding: 8, borderRadius: 4, border: '1px solid #ccc'}}
                            />
                            <button onClick={addOrder}
                                    style={{...btnStyle, background: '#2196f3', color: '#fff', border: 'none'}}>
                                + 新建
                            </button>
                        </div>

                        <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
                            {data.orders.map(order => {
                                const isEditing = editingOrderIds.has(order.id);
                                return (
                                    <CollapsibleSection
                                        key={order.id}
                                        title={
                                            <span style={{
                                                textDecoration: order.active ? 'none' : 'line-through',
                                                color: order.active ? '#333' : '#999'
                                            }}>
                                                {order.name} {isEditing ? '(编辑中)' : ''}
                                            </span>
                                        }
                                        defaultOpen={isEditing || order.items.length === 0}
                                        headerBg={order.active ? (isEditing ? '#fff8e1' : '#fff') : '#f5f5f5'}
                                        action={
                                            <div style={{display: 'flex', gap: 5}}>
                                                <button
                                                    style={{
                                                        ...btnStyle,
                                                        background: isEditing ? '#4caf50' : '#fff',
                                                        color: isEditing ? '#fff' : '#333'
                                                    }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleOrderEdit(order.id, !isEditing);
                                                    }}
                                                >
                                                    {isEditing ? '💾 完成' : '✏️ 编辑'}
                                                </button>

                                                {isEditing && (
                                                    <button style={{
                                                        fontSize: 10,
                                                        cursor: 'pointer',
                                                        color: 'red',
                                                        opacity: 0.7
                                                    }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (confirm('删除此订单?')) setData(p => ({
                                                                    ...p,
                                                                    orders: p.orders.filter(o => o.id !== order.id)
                                                                }));
                                                            }}>
                                                        🗑
                                                    </button>
                                                )}

                                                {!isEditing && (
                                                    <button style={{fontSize: 10, cursor: 'pointer', opacity: 0.7}}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setData(p => ({
                                                                    ...p,
                                                                    orders: p.orders.map(o => o.id === order.id ? {
                                                                        ...o,
                                                                        active: !o.active
                                                                    } : o)
                                                                }));
                                                            }}>
                                                        {order.active ? '🚫 停' : '✅ 启'}
                                                    </button>
                                                )}
                                            </div>
                                        }
                                    >
                                        <div style={{marginBottom: 10}}>
                                            {order.items.length === 0 &&
                                                <div style={{color: '#ccc', fontSize: 12, marginBottom: 10}}>
                                                    {isEditing ? '请在下方添加菌种...' : '暂无条目 (点击编辑添加)'}
                                                </div>}

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
                                                        <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
                                                            <MiniImg src={getMushroomImg(m.id)} label={m.name}
                                                                     size={24}/>
                                                            <span>{m.name}</span>
                                                        </div>
                                                        <div style={{display: 'flex', alignItems: 'center', gap: 4}}>
                                                            {isEditing ? (
                                                                <>
                                                                    <span style={{fontSize: 12, color: '#888'}}>x</span>
                                                                    <input
                                                                        type="number"
                                                                        min={0}
                                                                        value={item.count === 0 ? '' : item.count}
                                                                        onChange={(e) => {
                                                                            const val = e.target.value;
                                                                            if (val === '') {
                                                                                updateItemCount(order.id, item.mushroomId, 0);
                                                                            } else {
                                                                                const num = parseInt(val);
                                                                                if (!isNaN(num) && num > 0) {
                                                                                    updateItemCount(order.id, item.mushroomId, num);
                                                                                }
                                                                            }
                                                                        }}
                                                                        onBlur={() => {
                                                                            if (item.count === 0) {
                                                                                updateItemCount(order.id, item.mushroomId, 1);
                                                                            }
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
                                                                    <span
                                                                        onClick={() => removeItemFromOrder(order.id, item.mushroomId)}
                                                                        style={{
                                                                            cursor: 'pointer',
                                                                            color: '#ff5252',
                                                                            fontSize: 16,
                                                                            marginLeft: 4,
                                                                            padding: '0 4px'
                                                                        }}>×</span>
                                                                </>
                                                            ) : (
                                                                <span style={{
                                                                    fontWeight: 'bold',
                                                                    padding: '0 8px'
                                                                }}>x {item.count}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                        {isEditing &&
                                            <MushroomSelector onSelect={mid => addItemToOrder(order.id, mid)}/>}
                                    </CollapsibleSection>
                                );
                            })}
                        </div>
                    </CollapsibleSection>
                </div>

                <div style={{background: '#fcfcfc', borderRadius: 8, border: '1px solid #e0e0e0', minHeight: 600}}>
                    <div style={{
                        padding: 20, borderBottom: '1px solid #eee', background: '#fff', borderRadius: '8px 8px 0 0',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                        <div>
                            <h2 style={{margin: 0, color: '#333'}}>🌱 培育计划</h2>
                        </div>
                        <button
                            onClick={() => setPlanVersion(v => v + 1)}
                            style={{...btnStyle, background: '#f5f5f5', color: '#333'}}
                        >
                            🔄 刷新
                        </button>
                    </div>

                    <div style={{padding: 20}}>
                        {missingSummary.length > 0 && (
                            <div style={{
                                background: '#ffebee',
                                border: '1px solid #ffcdd2',
                                borderRadius: 6,
                                padding: 15,
                                marginBottom: 20,
                            }}>
                                <strong style={{display: 'block', marginBottom: 10, color: '#c62828'}}>⚠️
                                    缺少以下关键设备：</strong>
                                <div style={{display: 'flex', flexWrap: 'wrap', gap: 10}}>
                                    {missingSummary.map((item, idx) => (
                                        <div key={`${item.type}-${item.value}-${idx}`} style={{
                                            display: 'flex', alignItems: 'center', gap: 6,
                                            background: '#fff', padding: '4px 10px', borderRadius: 20,
                                            border: '1px solid #ef9a9a', color: '#c62828', fontSize: 13,
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                        }}>
                                            <span>{getToolIcon(item.type)}</span>
                                            <span style={{fontWeight: 'bold'}}>{item.value}</span>
                                            <span style={{
                                                fontSize: 12,
                                                opacity: 0.8
                                            }}>({getSourceInfo(item.type, item.value)})</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {batches.length === 0 ? (
                            <div style={{textAlign: 'center', padding: 40, color: '#aaa'}}>
                                <div style={{fontSize: 40, marginBottom: 10}}>🎉</div>
                                需求满足
                            </div>
                        ) : (
                            batches.map((batch, idx) => {
                                const batchTools: Record<string, number> = {};
                                const timeGroups = {
                                    [TimeRanges.DAY]: [] as typeof batch.tasks,
                                    [TimeRanges.NIGHT]: [] as typeof batch.tasks,
                                    'any': [] as typeof batch.tasks
                                };

                                batch.tasks.forEach(t => {
                                    if (t.mushroom.special && t.mushroom.save) {
                                        const condition = t.mushroom.special;
                                        if (TOOL_INFO[condition]) {
                                            batchTools[condition] = (batchTools[condition] || 0) + t.countNeeded;
                                        }
                                    }
                                    if (t.mushroom.time === TimeRanges.DAY) {
                                        timeGroups[TimeRanges.DAY].push(t);
                                    } else if (t.mushroom.time === TimeRanges.NIGHT) {
                                        timeGroups[TimeRanges.NIGHT].push(t);
                                    } else {
                                        timeGroups['any'].push(t);
                                    }
                                });

                                const renderTaskGrid = (tasks: typeof batch.tasks) => (
                                    <div className="plan-grid">
                                        {tasks.map((task, tIdx) => (
                                            <div key={tIdx} style={{
                                                border: '1px solid #eee', borderRadius: 8, padding: 12,
                                                background: '#fff', boxShadow: '0 2px 5px rgba(0,0,0,0.03)'
                                            }}>
                                                <div style={{display: 'flex', gap: 12, marginBottom: 10}}>
                                                    <MiniImg src={getMushroomImg(task.mushroom.id)}
                                                             label={task.mushroom.name} size={48}/>
                                                    <div style={{flex: 1}}>
                                                        <div style={{
                                                            fontWeight: 'bold',
                                                            fontSize: 15
                                                        }}>{task.mushroom.name}</div>
                                                        <div style={{fontSize: 12, color: '#666'}}>需培育: <span
                                                            style={{
                                                                color: '#d32f2f',
                                                                fontWeight: 'bold'
                                                            }}>{task.countNeeded}</span> 个
                                                        </div>
                                                    </div>
                                                </div>

                                                <hr style={{border: 0, borderTop: '1px dashed #eee', margin: '8px 0'}}/>

                                                <div style={{
                                                    fontSize: 12,
                                                    color: '#555',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: 6
                                                }}>
                                                    <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
                                                        <span>起始:</span>
                                                        <MiniImg
                                                            src={getChildImg(task.mushroom.starter, task.mushroom.special)}
                                                            label={task.mushroom.starter} size={40} circle/>
                                                        <span>{MUSHROOM_CHILDREN[task.mushroom.starter].name}</span>
                                                    </div>

                                                    {task.mushroom.special && (
                                                        <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
                                                            <span>特殊:</span>
                                                            <span style={{
                                                                background: '#fff3e0',
                                                                color: '#ef6c00',
                                                                padding: '1px 5px',
                                                                borderRadius: 3,
                                                                border: '1px solid #ffe0b2'
                                                            }}>
                                                                {task.mushroom.special}
                                                            </span>
                                                            <span>➜</span>
                                                            {task.mushroom.save ? (
                                                                <div style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 4,
                                                                    color: '#2e7d32'
                                                                }}>
                                                                    <strong>救助</strong>
                                                                    {TOOL_INFO[task.mushroom.special] && (
                                                                        <div style={{
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            gap: 2,
                                                                            fontSize: 11,
                                                                            background: '#e8f5e9',
                                                                            padding: '1px 4px',
                                                                            borderRadius: 4
                                                                        }}>
                                                                            <span>(</span>
                                                                            <MiniImg
                                                                                src={TOOL_INFO[task.mushroom.special].img}
                                                                                size={14}/>
                                                                            <span>{TOOL_INFO[task.mushroom.special].name})</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <strong style={{color: '#c62828'}}>不救</strong>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );

                                return (
                                    <CollapsibleSection
                                        key={batch.id}
                                        defaultOpen={true}
                                        title={`第${idx + 1}批: ${batch.env.wood} - ${batch.env.light} - ${batch.env.humidifier}`}
                                        headerBg={batch.missingEquipment.length > 0 ? '#fff3e0' : '#f1f8e9'}
                                        headerColor={batch.missingEquipment.length > 0 ? '#e65100' : '#33691e'}
                                    >
                                        <div style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 10,
                                            marginBottom: 15,
                                            fontSize: 13,
                                            background: '#fafafa',
                                            padding: 10,
                                            borderRadius: 6
                                        }}>
                                            <div style={{display: 'flex', flexWrap: 'wrap', gap: 15}}>
                                                <EnvBadge label="木头" value={batch.env.wood} icon="🪵"/>
                                                <EnvBadge label="日照" value={batch.env.light} icon="💡"/>
                                                <EnvBadge label="补水" value={batch.env.humidifier} icon="💧"/>
                                                {batch.missingEquipment.length > 0 && (
                                                    <div style={{color: 'red', fontWeight: 'bold', marginLeft: 'auto'}}>
                                                        缺: {batch.missingEquipment.map(m => m.value).join(', ')}
                                                    </div>
                                                )}
                                            </div>

                                            <div style={{
                                                borderTop: '1px dashed #eee', paddingTop: 8, marginTop: 4,
                                                display: 'flex', alignItems: 'center', gap: 15, flexWrap: 'wrap'
                                            }}>
                                                <span style={{color: '#666', fontWeight: 'bold'}}>🩹 所需救助道具:</span>
                                                {Object.keys(batchTools).length === 0 ? (
                                                    <span style={{color: '#aaa'}}>无</span>
                                                ) : (
                                                    Object.entries(batchTools).map(([cond, count]) => (
                                                        <div key={cond} style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 6,
                                                            background: '#fff',
                                                            padding: '2px 8px',
                                                            borderRadius: 4,
                                                            border: '1px solid #eee'
                                                        }}>
                                                            <MiniImg src={TOOL_INFO[cond].img} size={18} circle/>
                                                            <span>{TOOL_INFO[cond].name} <strong
                                                                style={{color: '#d32f2f'}}>x{count}</strong></span>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>

                                        <div style={{display: 'flex', flexDirection: 'column', gap: 20}}>
                                            {timeGroups[TimeRanges.DAY].length > 0 && (
                                                <div>
                                                    <div style={{
                                                        fontSize: 14,
                                                        fontWeight: 'bold',
                                                        marginBottom: 8,
                                                        color: '#e65100',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 5
                                                    }}>
                                                        <span>☀️ 白天生长</span>
                                                        <span style={{
                                                            fontSize: 12,
                                                            fontWeight: 'normal',
                                                            color: '#888'
                                                        }}>({timeGroups[TimeRanges.DAY].length})</span>
                                                    </div>
                                                    {renderTaskGrid(timeGroups[TimeRanges.DAY])}
                                                </div>
                                            )}
                                            {timeGroups[TimeRanges.NIGHT].length > 0 && (
                                                <div>
                                                    <div style={{
                                                        fontSize: 14,
                                                        fontWeight: 'bold',
                                                        marginBottom: 8,
                                                        color: '#311b92',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 5
                                                    }}>
                                                        <span>🌙 黑夜生长</span>
                                                        <span style={{
                                                            fontSize: 12,
                                                            fontWeight: 'normal',
                                                            color: '#888'
                                                        }}>({timeGroups[TimeRanges.NIGHT].length})</span>
                                                    </div>
                                                    {renderTaskGrid(timeGroups[TimeRanges.NIGHT])}
                                                </div>
                                            )}
                                            {timeGroups['any'].length > 0 && (
                                                <div>
                                                    <div style={{
                                                        fontSize: 14,
                                                        fontWeight: 'bold',
                                                        marginBottom: 8,
                                                        color: '#455a64',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 5
                                                    }}>
                                                        <span>🕒 时间不限</span>
                                                        <span style={{
                                                            fontSize: 12,
                                                            fontWeight: 'normal',
                                                            color: '#888'
                                                        }}>({timeGroups['any'].length})</span>
                                                    </div>
                                                    {renderTaskGrid(timeGroups['any'])}
                                                </div>
                                            )}
                                        </div>
                                    </CollapsibleSection>
                                );
                            })
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}

const labelStyle = {fontSize: 12, color: '#999', marginBottom: 4};
const tagContainerStyle = {display: 'flex', flexWrap: 'wrap' as const, gap: 5};

const ToggleTag: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({label, active, onClick}) => (
    <div onClick={onClick} style={{
        padding: '4px 10px', borderRadius: 15, fontSize: 12, cursor: 'pointer',
        background: active ? '#4caf50' : '#f1f1f1',
        color: active ? '#fff' : '#666',
        border: active ? '1px solid #4caf50' : '1px solid #ddd',
        transition: 'all 0.2s'
    }}>
        {label}
    </div>
);

const EnvBadge: React.FC<{ label: string; value: string; icon: string }> = ({label, value, icon}) => (
    <div style={{display: 'flex', alignItems: 'center', gap: 5}}>
        <span>{icon}</span>
        <span style={{color: '#888'}}>{label}:</span>
        <strong style={{color: value === '任意' ? '#aaa' : '#333'}}>{value}</strong>
    </div>
);

export default App;