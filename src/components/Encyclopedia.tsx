// src/components/Encyclopedia.tsx
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { MUSHROOM_CHILDREN, MUSHROOM_DB } from '../database';
import type { ActionRecord, HumidifierType, ImportRecord, LightType, MushroomDef, WoodType } from '../types';
import { Humidifiers, Lights, MushroomChildIds, SpecialConditions, TimeRanges, Woods } from '../types';
import { getChildImg, getEquipmentSortKey, getMushroomImg, TOOL_INFO } from '../utils';
import { CollapsibleSection, EnvBadge, MiniImg } from './Common';

// --- 辅助函数 ---

const getStrictnessScore = (m: { wood?: string, light?: string, humidifier?: string, time?: string }) => {
    let score = 0;
    if (m.wood) score += 10;
    if (m.light) score += 5;
    if (m.humidifier) score += 5;
    if (m.time) score += 3;
    return score;
};

const getSpecialStyle = (special: string) => {
    switch (special) {
        case SpecialConditions.BUG:
            return { bg: '#ffebee', color: '#c62828', icon: '🐛', border: '#ffcdd2' };
        case SpecialConditions.LESS:
            return { bg: '#e3f2fd', color: '#1565c0', icon: '🥀', border: '#bbdefb' };
        case SpecialConditions.MUCH:
            return { bg: '#f3e5f5', color: '#6a1b9a', icon: '💊', border: '#e1bee7' };
        default:
            return { bg: '#fff3e0', color: '#ef6c00', icon: '⚠️', border: '#ffe0b2' };
    }
};

// --- 新增：粘贴导入 Modal ---
const PasteImportModal: React.FC<{
    onClose: () => void;
    onConfirm: (text: string) => void;
}> = ({ onClose, onConfirm }) => {
    const [text, setText] = useState('');

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', zIndex: 1200,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }} onClick={onClose}>
            <div style={{
                background: '#fff', borderRadius: 12, width: '100%', maxWidth: 500,
                display: 'flex', flexDirection: 'column',
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)', padding: 20, gap: 15
            }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: 16, color: '#333' }}>📋 粘贴图鉴数据</h3>
                    <button onClick={onClose} style={{
                        border: 'none',
                        background: 'transparent',
                        fontSize: 24,
                        cursor: 'pointer',
                        color: '#999'
                    }}>×
                    </button>
                </div>
                <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="请在此处粘贴图鉴识别结果..."
                    style={{
                        width: '100%', height: 150, padding: 12,
                        borderRadius: 6, border: '1px solid #ddd',
                        fontFamily: 'inherit', fontSize: 13, resize: 'none',
                        background: '#f9f9f9', outline: 'none'
                    }}
                    autoFocus
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                    <button onClick={onClose} style={{
                        padding: '8px 16px', borderRadius: 6, border: '1px solid #ddd',
                        background: '#fff', cursor: 'pointer', fontSize: 13, color: '#666'
                    }}>取消
                    </button>
                    <button onClick={() => {
                        onConfirm(text);
                        onClose();
                    }} style={{
                        padding: '8px 16px', borderRadius: 6, border: 'none',
                        background: '#ba68c8', color: '#fff', cursor: 'pointer', fontWeight: 'bold', fontSize: 13
                    }}>确认导入
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- 图鉴速对 Modal ---
const QuickCheckModal: React.FC<{
    onClose: () => void;
    onToggle: (id: string) => void;
    collectedIds: string[];
}> = ({ onClose, onToggle, collectedIds }) => {
    // 获取按 ingameIndex 排序的列表
    const sortedList = useMemo(() => {
        return [...MUSHROOM_DB].sort((a, b) => {
            return (a.ingameIndex ?? 9999) - (b.ingameIndex ?? 9999)
        });
    }, []);

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)', zIndex: 1100,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 10
        }} onClick={onClose}>
            <div style={{
                background: '#fff', borderRadius: 12, width: '100%', maxWidth: 600, maxHeight: '95vh',
                display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.3)'
            }} onClick={e => e.stopPropagation()}>
                <div style={{
                    padding: 15, borderBottom: '1px solid #eee', background: '#f5f5f5',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div style={{ fontWeight: 'bold', fontSize: 16 }}>🚀 图鉴速对 (按游戏内顺序)</div>
                    <button onClick={onClose}
                            style={{ border: 'none', background: 'transparent', fontSize: 24, cursor: 'pointer' }}>×
                    </button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: 10, background: '#f0f2f5' }}>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8
                    }}>
                        {sortedList.map((m, index) => {
                            const isCollected = collectedIds.includes(m.id);
                            return (
                                <div key={m.id} onClick={() => onToggle(m.id)} style={{
                                    background: isCollected ? '#fff' : '#f9f9f9',
                                    border: isCollected ? '1px solid #81c784' : '1px dashed #bdbdbd',
                                    borderRadius: 8,
                                    padding: '8px 12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    opacity: isCollected ? 1 : 0.8,
                                    transition: 'all 0.1s'
                                }}>
                                    <div style={{ marginRight: 12, flexShrink: 0 }}>
                                        <MiniImg src={getMushroomImg(m.id)} size={40}/>
                                    </div>

                                    <div style={{ flex: 1 }}>
                                        <div style={{
                                            fontSize: 15,
                                            color: isCollected ? '#333' : '#666',
                                            fontWeight: isCollected ? 'bold' : 'normal'
                                        }}>
                                            {m.name}
                                        </div>
                                        <div style={{ fontSize: 11, color: '#999' }}>
                                            NO. {index + 1}
                                        </div>
                                    </div>

                                    <div style={{
                                        width: 24, height: 24, borderRadius: 6,
                                        border: isCollected ? 'none' : '2px solid #ccc',
                                        background: isCollected ? '#4caf50' : '#fff',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: '#fff', fontSize: 14, fontWeight: 'bold',
                                        marginRight: 12,
                                        flexShrink: 0
                                    }}>
                                        {isCollected ? '✓' : ''}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

const MushroomCardItem: React.FC<{
    m: MushroomDef;
    isCollected: boolean;
    hasStock: boolean;
    isGrowing: boolean;
    onToggle: (id: string) => void;
    unlockedWoods: WoodType[];
    unlockedLights: LightType[];
    unlockedHumidifiers: HumidifierType[];
}> = ({ m, isCollected, hasStock, isGrowing, onToggle }) => {

    const cardStyles = (() => {
        // 1. ✅ 已收集
        if (isCollected) {
            return {
                border: '1px solid #81c784',
                background: '#ffffff',
                opacity: 1,
                filter: 'none',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            };
        }
        // 2. 🎒 有库存
        if (hasStock) {
            return {
                border: '2px solid #ef5350',
                background: '#ffebee',
                opacity: 1,
                filter: 'none',
                boxShadow: '0 4px 12px rgba(239, 83, 80, 0.25)'
            };
        }
        // 3. ⏳ 收集中
        if (isGrowing) {
            return {
                border: '2px dashed #ff9800',
                background: '#fff3e0',
                opacity: 1,
                filter: 'none',
                boxShadow: '0 4px 12px rgba(255, 152, 0, 0.25)'
            };
        }
        // 4. ⬜ 普通未收集
        return {
            border: '1px dashed #bdbdbd',
            background: '#f5f5f5',
            opacity: 1,
            filter: 'none',
            boxShadow: 'none'
        };
    })();

    return (
        <div
            style={{
                ...cardStyles,
                borderRadius: 8,
                padding: 15,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                cursor: 'default',
                position: 'relative',
                transition: 'all 0.2s',
            }}
        >
            <div
                onClick={(e) => {
                    e.stopPropagation();
                    onToggle(m.id);
                }}
                style={{
                    position: 'absolute', top: 0, right: 0,
                    fontSize: 20, zIndex: 1,
                    cursor: 'pointer',
                    padding: '10px 15px',
                    opacity: isCollected ? 1 : 0.6
                }}
                title={isCollected ? "点击取消收集" : "点击标记为已收集"}
            >
                {isCollected ? '✅' : '⬜'}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
                <MiniImg src={getMushroomImg(m.id)} label={m.name} size={50}/>
                <div>
                    <div style={{
                        fontWeight: 'bold', fontSize: 15,
                        color: isCollected ? '#333' : '#000'
                    }}>{m.name}</div>
                    <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>ID: {m.id}</div>

                    {!isCollected && (
                        <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 11, color: '#616161', fontWeight: 'bold' }}>未收集</span>
                            {hasStock && (
                                <span style={{
                                    fontSize: 10,
                                    background: '#d32f2f',
                                    color: '#fff',
                                    padding: '2px 5px',
                                    borderRadius: 4,
                                    fontWeight: 'bold'
                                }}>有库存</span>
                            )}
                            {!hasStock && isGrowing && (
                                <span style={{
                                    fontSize: 10,
                                    background: '#ff9800',
                                    color: '#fff',
                                    padding: '2px 5px',
                                    borderRadius: 4,
                                    fontWeight: 'bold'
                                }}>⏳ 收集中</span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <hr style={{
                border: 0,
                borderTop: isCollected ? '1px dashed #eee' : '1px dashed #e0e0e0',
                margin: 0
            }}/>

            <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: '#888' }}>起始:</span>
                    <MiniImg src={getChildImg(m.starter, m.special)} label={m.starter} size={20} circle/>
                    <span>{MUSHROOM_CHILDREN[m.starter]}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                    <EnvBadge label="木头" value={m.wood || '任意'} icon="🪵"/>
                    <EnvBadge label="日照" value={m.light || '任意'} icon="💡"/>
                    <EnvBadge label="补水" value={m.humidifier || '任意'} icon="💧"/>
                    <EnvBadge label="时间" value={m.time || '任意'} icon="🕒"/>
                </div>
                {m.special && (
                    (() => {
                        const style = getSpecialStyle(m.special);
                        return (
                            <div style={{
                                marginTop: 4, background: style.bg, padding: '6px 8px', borderRadius: 6,
                                border: `1px solid ${style.border}`, display: 'flex', flexDirection: 'column', gap: 4
                            }}>
                                <div style={{
                                    color: style.color,
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4
                                }}>
                                    <span>{style.icon}</span>{m.special}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <span style={{ color: '#666' }}>策略:</span>
                                    {m.save ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <span style={{ color: '#2e7d32', fontWeight: 'bold' }}>✅ 救助</span>
                                            {TOOL_INFO?.[m.special] && (
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 2,
                                                    background: '#fff',
                                                    padding: '1px 5px',
                                                    borderRadius: 4,
                                                    border: '1px solid rgba(0,0,0,0.1)'
                                                }}>
                                                    <MiniImg src={TOOL_INFO[m.special].img} size={14} circle/>
                                                    <span style={{ color: '#333' }}>{TOOL_INFO[m.special].name}</span>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <span style={{ color: '#c62828', fontWeight: 'bold' }}>❌ 不救 (变异)</span>
                                    )}
                                </div>
                            </div>
                        );
                    })()
                )}
            </div>
        </div>
    );
};

const INITIAL_FILTERS = {
    starter: 'all', wood: 'all', light: 'all', humidifier: 'all', time: 'all',
    special: 'all', save: 'all', collection: 'all',
};

// --- 修改：导入详情 Modal 组件 (增加排序) ---
const ImportDetailModal: React.FC<{
    record: ImportRecord | null;
    onClose: () => void;
}> = ({ record, onClose }) => {
    if (!record) return null;

    const renderMushroomList = (ids: string[], emptyText: string) => {
        if (ids.length === 0) return <div style={{ color: '#999', fontSize: 12, padding: 10 }}>{emptyText}</div>;

        // 核心修改：将 ID 转换为对象并按 ingameIndex 排序
        const sortedItems = ids
            .map(id => MUSHROOM_DB.find(db => db.id === id))
            .filter((m): m is MushroomDef => !!m)
            .sort((a, b) => (a.ingameIndex || 9999) - (b.ingameIndex || 9999));

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto' }}>
                {sortedItems.map(m => (
                    <div key={m.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        background: '#fff',
                        padding: 4,
                        borderRadius: 4,
                        border: '1px solid #eee'
                    }}>
                        <MiniImg src={getMushroomImg(m.id)} size={24}/>
                        <span style={{ fontSize: 12 }}>{m.name}</span>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }} onClick={onClose}>
            <div style={{
                background: '#fff', borderRadius: 12, width: '90%', maxWidth: 800, maxHeight: '90vh',
                display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
            }} onClick={e => e.stopPropagation()}>
                <div style={{
                    padding: 15,
                    borderBottom: '1px solid #eee',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#f9f9f9'
                }}>
                    <div style={{ fontWeight: 'bold' }}>📂 导入详情 ({new Date(record.timestamp).toLocaleString()})</div>
                    <button onClick={onClose}
                            style={{ border: 'none', background: 'transparent', fontSize: 20, cursor: 'pointer' }}>×
                    </button>
                </div>

                <div className="modal-content" style={{ flex: 1, overflowY: 'auto', padding: 15 }}>
                    <style>{`
                        .detail-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; }
                        @media (max-width: 600px) { .detail-grid { grid-template-columns: 1fr; } }
                    `}</style>
                    <div className="detail-grid">
                        {/* 1. 新收集 */}
                        <div style={{ background: '#f1f8e9', padding: 10, borderRadius: 8 }}>
                            <div style={{ fontWeight: 'bold', color: '#2e7d32', marginBottom: 8, fontSize: 13 }}>
                                ➕ 新收集 ({record.addedIds.length})
                            </div>
                            {renderMushroomList(record.addedIds, "本次无新增")}
                        </div>

                        {/* 2. 未收集 (取消) */}
                        <div style={{ background: '#fff3e0', padding: 10, borderRadius: 8 }}>
                            <div style={{ fontWeight: 'bold', color: '#e65100', marginBottom: 8, fontSize: 13 }}>
                                ➖ 变更为未收集 ({record.removedIds.length})
                            </div>
                            {renderMushroomList(record.removedIds, "本次无移除")}
                        </div>

                        {/* 3. 未识别 */}
                        <div style={{ background: '#ffebee', padding: 10, borderRadius: 8 }}>
                            <div style={{ fontWeight: 'bold', color: '#c62828', marginBottom: 8, fontSize: 13 }}>
                                ❓ 未识别 ({record.unrecognized.length})
                            </div>
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 4,
                                maxHeight: 300,
                                overflowY: 'auto'
                            }}>
                                {record.unrecognized.length === 0 ?
                                    <span style={{ color: '#999', fontSize: 12 }}>全部识别成功</span> :
                                    record.unrecognized.map((line, i) => (
                                        <div key={i} style={{
                                            fontSize: 11,
                                            color: '#666',
                                            background: '#fff',
                                            padding: '4px 8px',
                                            borderRadius: 4,
                                            border: '1px solid #ef9a9a'
                                        }}>
                                            {line.slice(0, 10)}{line.length > 10 ? '...' : ''}
                                        </div>
                                    ))
                                }
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface EncyclopediaProps {
    collectedIds: string[];
    onToggleCollection: (id: string) => void;
    onBatchCollect: (ids: string[]) => void;
    unlockedWoods: WoodType[];
    unlockedLights: LightType[];
    unlockedHumidifiers: HumidifierType[];
    inventory: Record<string, number>;

    // 历史记录 Props
    actionHistory: ActionRecord[];
    onUndoAction: (record: ActionRecord) => void;

    // 导入记录 Props
    importHistory: ImportRecord[];
    onImportText: (text: string) => void;
    onUndoImport: (record: ImportRecord) => void;
    onDeleteImportRecord: (id: string) => void;

    growingCounts: Record<string, number>;
}

export const Encyclopedia: React.FC<EncyclopediaProps> = ({
                                                              collectedIds,
                                                              onToggleCollection,
                                                              onBatchCollect,
                                                              unlockedWoods,
                                                              unlockedLights,
                                                              unlockedHumidifiers,
                                                              inventory,
                                                              actionHistory,
                                                              onUndoAction,
                                                              importHistory,
                                                              onImportText,
                                                              onUndoImport,
                                                              onDeleteImportRecord,
                                                              growingCounts
                                                          }) => {
    // Refs
    const topRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [modalRecord, setModalRecord] = useState<ImportRecord | null>(null);
    const [showQuickCheck, setShowQuickCheck] = useState(false);
    const [showPasteModal, setShowPasteModal] = useState(false);

    const handleToggle = (id: string) => {
        onToggleCollection(id);
    };

    const handleBatch = (ids: string[]) => {
        onBatchCollect(ids);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target?.result as string;
            onImportText(text);
        };
        reader.readAsText(file);
        // 清空 value 允许重复选择同一文件
        e.target.value = '';
    };

    const [filters, setFilters] = useState(INITIAL_FILTERS);
    const [searchTerm, setSearchTerm] = useState('');

    const checkToolsReady = useCallback((m: { wood?: string, light?: string, humidifier?: string }) => {
        const woodReady = !m.wood || unlockedWoods.includes(m.wood as WoodType);
        const lightReady = !m.light || unlockedLights.includes(m.light as LightType);
        const humidifierReady = !m.humidifier || unlockedHumidifiers.includes(m.humidifier as HumidifierType);
        return woodReady && lightReady && humidifierReady;
    }, [unlockedWoods, unlockedLights, unlockedHumidifiers]);

    // --- 筛选逻辑 ---
    const filteredList = useMemo(() => {
        return MUSHROOM_DB.filter(m => {
            if (searchTerm) {
                const lower = searchTerm.toLowerCase().trim();
                if (!m.name.includes(lower) && !m.pinyin.includes(lower)) return false;
            }
            if (filters.starter !== 'all' && m.starter !== filters.starter) return false;
            if (filters.wood !== 'all' && m.wood !== filters.wood) return false;
            if (filters.light !== 'all' && m.light !== filters.light) return false;
            if (filters.humidifier !== 'all' && m.humidifier !== filters.humidifier) return false;
            if (filters.time !== 'all' && m.time !== filters.time) return false;
            if (filters.special !== 'all' && m.special !== filters.special) return false;
            if (filters.save !== 'all') {
                const needsSave = filters.save === 'yes';
                if (m.save !== needsSave) return false;
                if (filters.save === 'no' && m.save === true) return false;
                if (filters.save === 'yes' && !m.save) return false;
            }
            const isCollected = collectedIds.includes(m.id);
            if (filters.collection === 'collected' && !isCollected) return false;
            if (filters.collection === 'uncollected' && isCollected) return false;
            if (filters.collection === 'collectable') {
                if (isCollected) return false;
                if (!checkToolsReady(m)) return false;
            }
            return true;
        });
    }, [filters, searchTerm, collectedIds, checkToolsReady]);

    // --- 排序逻辑 ---
    const sortedDisplayList = useMemo(() => {
        return [...filteredList].sort((a, b) => {
            // 0. 新增优先级：【未收集】且【(有库存 或 培育中)】 -> 排在最前
            // 这样方便用户快速找到可以“点亮”或“正在做”的菌种
            const isUncollectedA = !collectedIds.includes(a.id);
            const isUncollectedB = !collectedIds.includes(b.id);

            const hasActionA = (inventory[a.id] || 0) > 0 || (growingCounts[a.id] || 0) > 0;
            const hasActionB = (inventory[b.id] || 0) > 0 || (growingCounts[b.id] || 0) > 0;

            const priorityA = isUncollectedA && hasActionA;
            const priorityB = isUncollectedB && hasActionB;

            if (priorityA !== priorityB) {
                return priorityA ? -1 : 1; // 有优先级的排前面
            }

            // 1. 严格度优先 (高 -> 低)
            const strictA = getStrictnessScore(a);
            const strictB = getStrictnessScore(b);
            if (strictA !== strictB) return strictB - strictA;

            // 2. 按设备排序 (木头 -> 日照 -> 补水) (品级+Index 低 -> 高)
            const wA = getEquipmentSortKey('wood', a.wood || '任意');
            const wB = getEquipmentSortKey('wood', b.wood || '任意');
            if (wA !== wB) return wA - wB;

            const lA = getEquipmentSortKey('light', a.light || '任意');
            const lB = getEquipmentSortKey('light', b.light || '任意');
            if (lA !== lB) return lA - lB;

            const hA = getEquipmentSortKey('humidifier', a.humidifier || '任意');
            const hB = getEquipmentSortKey('humidifier', b.humidifier || '任意');
            if (hA !== hB) return hA - hB;

            // 3. 最后按默认顺序
            return MUSHROOM_DB.indexOf(a) - MUSHROOM_DB.indexOf(b);
        });
    }, [filteredList, collectedIds, inventory, growingCounts]);

    const missingEnvironments = useMemo(() => {
        const uncollectedItems = filteredList.filter(m => !collectedIds.includes(m.id));
        const envMap = new Map<string, {
            score: number,
            count: number,
            isReady: boolean,
            wood?: string,
            light?: string,
            humidifier?: string,
            time?: string
        }>();
        uncollectedItems.forEach(m => {
            const key = `${m.wood || 'any'}|${m.light || 'any'}|${m.humidifier || 'any'}|${m.time || 'any'}`;
            if (!envMap.has(key)) {
                envMap.set(key, {
                    wood: m.wood, light: m.light, humidifier: m.humidifier, time: m.time,
                    score: getStrictnessScore(m), count: 0, isReady: checkToolsReady(m)
                });
            }
            envMap.get(key)!.count += 1;
        });
        return Array.from(envMap.values()).sort((a, b) => {
            if (a.isReady !== b.isReady) return a.isReady ? -1 : 1;
            return b.score - a.score;
        });
    }, [filteredList, collectedIds, checkToolsReady]);

    const uncollectedIdsInView = useMemo(() => sortedDisplayList.filter(m => !collectedIds.includes(m.id)).map(m => m.id), [sortedDisplayList, collectedIds]);

    const handleBatchClick = () => {
        if (uncollectedIdsInView.length === 0) return;
        if (confirm(`确定要将当前筛选列表中的 ${uncollectedIdsInView.length} 个未收集菌种全部标记为“已收集”吗？`)) {
            handleBatch(uncollectedIdsInView);
        }
    };

    const selectStyle = { padding: '6px', borderRadius: 4, border: '1px solid #ccc', fontSize: 13, minWidth: 100 };

    const totalCollected = collectedIds.length;
    const totalMushrooms = MUSHROOM_DB.length;
    const progressPercent = Math.round((totalCollected / totalMushrooms) * 100);

    const currentListTotal = filteredList.length;
    const currentListCollected = filteredList.filter(m => collectedIds.includes(m.id)).length;
    const currentListUncollected = currentListTotal - currentListCollected;

    const scrollToTop = () => topRef.current?.scrollIntoView({ behavior: 'smooth' });

    return (
        <div ref={topRef} style={{ paddingBottom: 80, position: 'relative' }}>
            {/* 导入详情 Modal */}
            <ImportDetailModal record={modalRecord} onClose={() => setModalRecord(null)}/>

            {/* 新增：粘贴输入 Modal */}
            {showPasteModal && (
                <PasteImportModal
                    onClose={() => setShowPasteModal(false)}
                    onConfirm={(text) => {
                        if (text && text.trim()) {
                            onImportText(text);
                        }
                    }}
                />
            )}

            {/* 图鉴速对 Modal */}
            {showQuickCheck && (
                <QuickCheckModal
                    onClose={() => setShowQuickCheck(false)}
                    onToggle={handleToggle}
                    collectedIds={collectedIds}
                />
            )}

            {/* 隐藏的文件输入框 */}
            <input
                type="file"
                accept=".txt"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileChange}
            />

            {/* 顶部：筛选器 */}
            <CollapsibleSection
                title="🔍 图鉴筛选"
                defaultOpen={true}
                headerBg="#e3f2fd"
                headerColor="#1565c0"
                action={
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            background: '#fff', padding: '2px 8px', borderRadius: 10,
                            border: '1px solid #bbdefb', fontSize: 12
                        }}>
                            <span style={{ color: '#1565c0' }}>当前: {currentListTotal}</span>
                            <span style={{ color: '#ccc' }}>|</span>
                            <span style={{ color: '#2e7d32' }} title="已收集">✅ {currentListCollected}</span>
                            <span style={{ color: '#e65100' }} title="未收集">❌ {currentListUncollected}</span>
                        </div>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            background: '#e8f5e9', padding: '2px 8px', borderRadius: 10,
                            border: '1px solid #c8e6c9'
                        }}>
                            <span style={{ fontSize: 13 }}>🏆</span>
                            <span style={{
                                fontSize: 12, fontWeight: 'bold', color: '#2e7d32'
                            }}>{totalCollected}/{totalMushrooms} ({progressPercent}%)</span>
                        </div>
                    </div>
                }
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', width: '100%', flexWrap: 'wrap' }}>
                        <input
                            placeholder="🔍 搜索菌种：输入名字或拼音首字母"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{
                                flex: 1,
                                minWidth: 200,
                                padding: '10px',
                                borderRadius: 4,
                                border: '1px solid #ccc',
                                background: '#f9f9f9'
                            }}
                        />
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            <button
                                onClick={() => {
                                    setFilters(INITIAL_FILTERS);
                                    setSearchTerm('');
                                }}
                                style={{
                                    padding: '0 15px', height: 38, background: '#fff', border: '1px solid #ccc',
                                    borderRadius: 4, cursor: 'pointer', color: '#666', fontSize: 13,
                                    display: 'flex', alignItems: 'center', gap: 6
                                }}
                            >
                                <span>🔄</span> 重置
                            </button>

                            {/* 新设计的导入按钮组 */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                border: '1px solid #ba68c8',
                                borderRadius: 4,
                                overflow: 'hidden',
                                background: '#f3e5f5'
                            }}>
                                <div style={{
                                    padding: '0 8px', fontSize: 12, fontWeight: 'bold', color: '#7b1fa2',
                                    background: '#e1bee7', height: 38, display: 'flex', alignItems: 'center'
                                }}>
                                    导入图鉴
                                </div>
                                <button
                                    onClick={() => setShowPasteModal(true)}
                                    title="从剪贴板粘贴文本导入"
                                    style={{
                                        border: 'none',
                                        borderLeft: '1px solid #ce93d8',
                                        background: 'transparent',
                                        height: 38,
                                        width: 38,
                                        cursor: 'pointer',
                                        fontSize: 16,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    📋
                                </button>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    title="上传 .txt 文件导入"
                                    style={{
                                        border: 'none',
                                        borderLeft: '1px solid #ce93d8',
                                        background: 'transparent',
                                        height: 38,
                                        width: 38,
                                        cursor: 'pointer',
                                        fontSize: 16,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    📂
                                </button>
                            </div>

                            {/* 图鉴速对按钮 */}
                            <button
                                onClick={() => setShowQuickCheck(true)}
                                style={{
                                    padding: '0 15px', height: 38,
                                    background: '#2196f3', border: '1px solid #1976d2',
                                    borderRadius: 4, cursor: 'pointer', color: '#fff', fontSize: 13,
                                    display: 'flex', alignItems: 'center', gap: 6, fontWeight: 'bold',
                                    boxShadow: '0 2px 4px rgba(33, 150, 243, 0.3)'
                                }}
                            >
                                🚀 图鉴速对
                            </button>
                        </div>
                    </div>
                    {/* Select Inputs */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 15 }}>
                        <label>
                            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>收集状态</div>
                            <select style={{ ...selectStyle, borderColor: '#4caf50', background: '#f1f8e9' }}
                                    value={filters.collection}
                                    onChange={e => setFilters({ ...filters, collection: e.target.value })}>
                                <option value="all">全部</option>
                                <option value="collectable">🌱 可收集 (道具齐全)</option>
                                <option value="collected">✅ 已收集</option>
                                <option value="uncollected">❌ 未收集</option>
                            </select>
                        </label>
                        <label>
                            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>初始菌种</div>
                            <select style={selectStyle} value={filters.starter}
                                    onChange={e => setFilters({ ...filters, starter: e.target.value })}>
                                <option value="all">全部</option>
                                {Object.values(MushroomChildIds).map(id => <option key={id}
                                                                                   value={id}>{MUSHROOM_CHILDREN[id]}</option>)}
                            </select>
                        </label>
                        <label>
                            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>木头</div>
                            <select style={selectStyle} value={filters.wood}
                                    onChange={e => setFilters({ ...filters, wood: e.target.value })}>
                                <option value="all">全部</option>
                                {Object.values(Woods).map(w => <option key={w} value={w}>{w}</option>)}</select></label>
                        <label>
                            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>日照</div>
                            <select style={selectStyle} value={filters.light}
                                    onChange={e => setFilters({ ...filters, light: e.target.value })}>
                                <option value="all">全部</option>
                                {Object.values(Lights).map(l => <option key={l} value={l}>{l}</option>)}
                            </select></label>
                        <label>
                            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>补水</div>
                            <select style={selectStyle} value={filters.humidifier}
                                    onChange={e => setFilters({ ...filters, humidifier: e.target.value })}>
                                <option value="all">全部</option>
                                {Object.values(Humidifiers).map(h => <option key={h} value={h}>{h}</option>)}
                            </select></label>
                        <label>
                            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>时间</div>
                            <select style={selectStyle} value={filters.time}
                                    onChange={e => setFilters({ ...filters, time: e.target.value })}>
                                <option value="all">全部</option>
                                {Object.values(TimeRanges).map(t => <option key={t} value={t}>{t}</option>)}
                            </select></label>
                        <label>
                            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>特殊情况</div>
                            <select style={selectStyle} value={filters.special}
                                    onChange={e => setFilters({ ...filters, special: e.target.value })}>
                                <option value="all">全部</option>
                                {Object.values(SpecialConditions).map(s => <option key={s} value={s}>{s}</option>)}
                            </select></label>
                        <label>
                            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>是否救助</div>
                            <select style={selectStyle} value={filters.save}
                                    onChange={e => setFilters({ ...filters, save: e.target.value })}>
                                <option value="all">全部</option>
                                <option value="yes">救助</option>
                                <option value="no">不救</option>
                            </select></label>
                    </div>
                </div>
            </CollapsibleSection>

            {/* 历史记录分栏布局 */}
            <style>{`
                .history-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 15px;
                    margin-top: 15px;
                }
                @media (max-width: 600px) {
                    .history-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
            <div className="history-grid">
                {/* 左栏：最近 10 次单次操作 */}
                <CollapsibleSection
                    title={<span>📝 最近操作 ({actionHistory.length})</span>}
                    defaultOpen={false}
                    headerBg="#fff3e0"
                    headerColor="#e65100"
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {actionHistory.length === 0 &&
                            <div style={{ color: '#999', fontSize: 12, padding: 10 }}>暂无操作记录</div>}
                        {actionHistory.map((rec, i) => {
                            const m = MUSHROOM_DB.find(d => d.id === rec.mushroomId);
                            if (!m) return null;
                            return (
                                <div key={i} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '6px 10px', background: '#fff', border: '1px solid #eee', borderRadius: 6
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <MiniImg src={getMushroomImg(m.id)} size={24}/>
                                        <span style={{ fontSize: 13 }}>{m.name}</span>
                                        <span style={{
                                            fontSize: 11, padding: '1px 4px', borderRadius: 4,
                                            background: rec.type === 'collect' ? '#e8f5e9' : '#ffebee',
                                            color: rec.type === 'collect' ? '#2e7d32' : '#c62828'
                                        }}>
                                            {rec.type === 'collect' ? '收集' : '取消'}
                                        </span>
                                    </div>
                                    <button onClick={() => onUndoAction(rec)} style={{
                                        border: '1px solid #ddd', background: '#f5f5f5', borderRadius: 4,
                                        padding: '2px 6px', cursor: 'pointer', fontSize: 11
                                    }}>撤销
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </CollapsibleSection>

                {/* 右栏：导入记录 */}
                <CollapsibleSection
                    title={<span>📂 导入记录 ({importHistory.length})</span>}
                    defaultOpen={false}
                    headerBg="#e1bee7"
                    headerColor="#4a148c"
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {importHistory.length === 0 &&
                            <div style={{ color: '#999', fontSize: 12, padding: 10 }}>暂无导入记录</div>}
                        {importHistory.map((rec) => (
                            <div key={rec.id} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '6px 10px', background: '#fff', border: '1px solid #eee', borderRadius: 6
                            }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <span style={{
                                        fontSize: 12,
                                        color: '#333'
                                    }}>{new Date(rec.timestamp).toLocaleString()}</span>
                                    <button
                                        onClick={() => setModalRecord(rec)}
                                        style={{
                                            border: 'none',
                                            background: 'transparent',
                                            color: '#1976d2',
                                            cursor: 'pointer',
                                            padding: 0,
                                            textAlign: 'left',
                                            fontSize: 11,
                                            textDecoration: 'underline'
                                        }}
                                    >
                                        查看详情 (+{rec.addedIds.length} / -{rec.removedIds.length})
                                    </button>
                                </div>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    <button onClick={() => onUndoImport(rec)} title="撤销本次导入 (回滚状态)" style={{
                                        border: '1px solid #ffcc80',
                                        background: '#fff3e0',
                                        color: '#e65100',
                                        borderRadius: 4,
                                        padding: '4px 8px',
                                        cursor: 'pointer',
                                        fontSize: 11
                                    }}>撤销
                                    </button>
                                    <button onClick={() => onDeleteImportRecord(rec.id)} title="删除记录 (不回滚)"
                                            style={{
                                                border: '1px solid #ef9a9a',
                                                background: '#ffebee',
                                                color: '#c62828',
                                                borderRadius: 4,
                                                padding: '4px 8px',
                                                cursor: 'pointer',
                                                fontSize: 11
                                            }}>删除
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </CollapsibleSection>
            </div>

            {/* 环境需求汇总 */}
            {missingEnvironments.length > 0 && (
                <CollapsibleSection
                    title={<span>🧪 待收集环境配方 <span style={{
                        fontSize: 12, fontWeight: 'normal', color: '#e65100'
                    }}>({missingEnvironments.length} 组)</span></span>}
                    defaultOpen={false} headerBg="#fff3e0" headerColor="#e65100"
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>以下是当前筛选范围内，未收集菌种所需的环境组合。<br/>排序优先级：<b>道具齐全</b> &gt;
                            <b>严格度高</b></div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                            {missingEnvironments.map((env, idx) => (
                                <div key={idx} style={{
                                    border: env.isReady ? '2px solid #81c784' : '1px solid #ffcc80',
                                    background: env.isReady ? '#f1f8e9' : '#fff',
                                    padding: '6px 10px',
                                    borderRadius: 6,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    fontSize: 12,
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                }}>
                                    {env.isReady && <span style={{ fontSize: 14 }}>✅</span>}
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: 4,
                                        minWidth: 180
                                    }}>
                                        <EnvBadge label="木头" value={env.wood || '任意'} icon="🪵"/>
                                        <EnvBadge label="日照" value={env.light || '任意'} icon="💡"/>
                                        <EnvBadge label="补水" value={env.humidifier || '任意'} icon="💧"/>
                                        <EnvBadge label="时间" value={env.time || '任意'} icon="🕒"/>
                                    </div>
                                    <div style={{ height: 30, width: 1, background: '#eee' }}></div>
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <span style={{
                                            fontSize: 16,
                                            fontWeight: 'bold',
                                            color: '#e65100'
                                        }}>{env.count}</span>
                                        <span style={{ fontSize: 10, color: '#999' }}>种未收</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </CollapsibleSection>
            )}

            {/* 批量收集按钮 */}
            {uncollectedIdsInView.length > 0 && (
                <div style={{ marginTop: 15, marginBottom: 5, display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={handleBatchClick} style={{
                        padding: '8px 16px',
                        background: '#e8f5e9',
                        color: '#2e7d32',
                        border: '1px solid #a5d6a7',
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: 13,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}>
                        <span>✨</span>一键收集当前页 {uncollectedIdsInView.length} 个新发现
                    </button>
                </div>
            )}

            {/* 图鉴列表 */}
            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 15, marginTop: 15
            }}>
                {sortedDisplayList.map((m) => {
                    const isCollected = collectedIds.includes(m.id);
                    // --- 移除分隔线逻辑 ---
                    return (
                        <React.Fragment key={m.id}>
                            <MushroomCardItem
                                m={m}
                                isCollected={isCollected}
                                hasStock={(inventory[m.id] || 0) > 0}
                                isGrowing={(growingCounts[m.id] || 0) > 0}
                                onToggle={handleToggle}
                                unlockedWoods={unlockedWoods}
                                unlockedLights={unlockedLights}
                                unlockedHumidifiers={unlockedHumidifiers}
                            />
                        </React.Fragment>
                    );
                })}
                {filteredList.length === 0 && <div style={{
                    color: '#999',
                    padding: 20,
                    textAlign: 'center',
                    gridColumn: '1/-1'
                }}>没有符合条件的菌种</div>}
            </div>

            {/* 悬浮球 (只保留回到顶部) */}
            <div style={{
                position: 'fixed', bottom: 30, right: 20, zIndex: 100
            }}>
                <button onClick={scrollToTop} title="回到顶部" style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: '#fff3e0',
                    border: '2px solid #ffcc80',
                    color: '#e65100',
                    fontSize: 20,
                    boxShadow: '0 4px 10px rgba(230, 81, 0, 0.2)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>⬆️
                </button>
            </div>
        </div>
    );
};
