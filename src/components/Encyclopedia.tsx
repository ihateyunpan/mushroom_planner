// src/components/Encyclopedia.tsx
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { MUSHROOM_CHILDREN, MUSHROOM_DB } from '../database';
import type { HumidifierType, LightType, MushroomDef, WoodType } from '../types';
import { Humidifiers, Lights, MushroomChildIds, SpecialConditions, TimeRanges, Woods } from '../types';
import { getChildImg, getMushroomImg, RECENT_ID_COUNT, TOOL_INFO } from '../utils';
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
            return {bg: '#ffebee', color: '#c62828', icon: '🐛', border: '#ffcdd2'};
        case SpecialConditions.LESS:
            return {bg: '#e3f2fd', color: '#1565c0', icon: '🥀', border: '#bbdefb'};
        case SpecialConditions.MUCH:
            return {bg: '#f3e5f5', color: '#6a1b9a', icon: '💊', border: '#e1bee7'};
        default:
            return {bg: '#fff3e0', color: '#ef6c00', icon: '⚠️', border: '#ffe0b2'};
    }
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
}> = ({m, isCollected, hasStock, isGrowing, onToggle}) => {

    // 样式重构：未收集用彩色底，已收集用白底，全都不灰度
    const cardStyles = (() => {
        // 1. ✅ 已收集：回归平淡，白底绿边，代表“已完成/归档”
        if (isCollected) {
            return {
                border: '1px solid #81c784',  // 绿色实线
                background: '#ffffff',        // 纯白背景
                opacity: 1,
                filter: 'none',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)' // 轻微阴影
            };
        }

        // 2. 🎒 有库存 (未收集)：红色高亮，提示“快去交”
        if (hasStock) {
            return {
                border: '2px solid #ef5350',  // 红色粗实线
                background: '#ffebee',        // 红色背景
                opacity: 1,
                filter: 'none',
                boxShadow: '0 4px 12px rgba(239, 83, 80, 0.25)' // 较强阴影
            };
        }

        // 3. ⏳ 收集中 (未收集)：橙色高亮，提示“正在种”
        if (isGrowing) {
            return {
                border: '2px dashed #ff9800', // 橙色粗虚线 (颜色加深一点以便看清)
                background: '#fff3e0',        // 橙色背景
                opacity: 1,
                filter: 'none',
                boxShadow: '0 4px 12px rgba(255, 152, 0, 0.25)'
            };
        }

        // 4. ⬜ 普通未收集：灰色底，但图片保持彩色
        return {
            border: '1px dashed #bdbdbd',     // 灰色虚线
            background: '#f5f5f5',            // 浅灰背景 (区别于已收集的白色)
            opacity: 1,                       // 保持不透明
            filter: 'none',                   // 关键：移除灰度，显示彩色 Avatar
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
                    // 如果未收集，让勾选框稍微明显一点
                    opacity: isCollected ? 1 : 0.6
                }}
                title={isCollected ? "点击取消收集" : "点击标记为已收集"}
            >
                {isCollected ? '✅' : '⬜'}
            </div>

            <div style={{display: 'flex', gap: 12}}>
                <MiniImg src={getMushroomImg(m.id)} label={m.name} size={50}/>
                <div>
                    <div style={{
                        fontWeight: 'bold', fontSize: 15,
                        // 已收集用黑色，未收集用深色强调
                        color: isCollected ? '#333' : '#000'
                    }}>{m.name}</div>
                    <div style={{fontSize: 12, color: '#999', marginTop: 4}}>ID: {m.id}</div>

                    {!isCollected && (
                        <div style={{marginTop: 4, display: 'flex', alignItems: 'center', gap: 6}}>
                            <span style={{fontSize: 11, color: '#616161', fontWeight: 'bold'}}>未收集</span>
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
                // 分割线颜色随状态变化
                borderTop: isCollected ? '1px dashed #eee' : '1px dashed #e0e0e0',
                margin: 0
            }}/>

            <div style={{fontSize: 12, display: 'flex', flexDirection: 'column', gap: 5}}>
                {/* ... existing environment info render ... */}
                <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
                    <span style={{color: '#888'}}>起始:</span>
                    <MiniImg src={getChildImg(m.starter, m.special)} label={m.starter} size={20} circle/>
                    <span>{MUSHROOM_CHILDREN[m.starter]}</span>
                </div>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4}}>
                    <EnvBadge label="木头" value={m.wood || '任意'} icon="🪵"/>
                    <EnvBadge label="日照" value={m.light || '任意'} icon="💡"/>
                    <EnvBadge label="补水" value={m.humidifier || '任意'} icon="💧"/>
                    <EnvBadge label="时间" value={m.time || '任意'} icon="🕒"/>
                </div>
                {m.special && (
                    (() => {
                        const style = getSpecialStyle(m.special);
                        // 特殊情况模块保持原色，不随卡片灰度（现在卡片本身也没灰度了）
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
                                <div style={{display: 'flex', alignItems: 'center', gap: 4}}>
                                    <span style={{color: '#666'}}>策略:</span>
                                    {m.save ? (
                                        <div style={{display: 'flex', alignItems: 'center', gap: 4}}>
                                            <span style={{color: '#2e7d32', fontWeight: 'bold'}}>✅ 救助</span>
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
                                                    <span
                                                        style={{color: '#333'}}>{TOOL_INFO[m.special].name}</span>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <span style={{color: '#c62828', fontWeight: 'bold'}}>❌ 不救 (变异)</span>
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

interface EncyclopediaProps {
    collectedIds: string[];
    onToggleCollection: (id: string) => void;
    onBatchCollect: (ids: string[]) => void;
    unlockedWoods: WoodType[];
    unlockedLights: LightType[];
    unlockedHumidifiers: HumidifierType[];
    inventory: Record<string, number>; // 新增
    recentIds: string[]; // 新增，替代内部 state
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
                                                              recentIds,
                                                              growingCounts
                                                          }) => {
    // Refs for scrolling
    const topRef = useRef<HTMLDivElement>(null);
    const collectedStartRef = useRef<HTMLDivElement>(null);

    // 移除内部 recentIds state，改用 props

    const handleToggle = (id: string) => {
        onToggleCollection(id);
    };

    const handleBatch = (ids: string[]) => {
        onBatchCollect(ids);
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
            // ... (其他筛选逻辑不变) ...
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

    // --- 排序逻辑优化 ---
    const sortedDisplayList = useMemo(() => {
        return [...filteredList].sort((a, b) => {
            const isACollected = collectedIds.includes(a.id);
            const isBCollected = collectedIds.includes(b.id);

            // 1. 已收集的沉底 (放在列表最末尾)
            if (isACollected !== isBCollected) return isACollected ? 1 : -1;

            // 2. 如果都未收集，按照 B(有库存) -> A(收集中) -> C(无) 排序
            if (!isACollected) {
                // 判断状态
                const stockA = (inventory[a.id] || 0) > 0;
                const stockB = (inventory[b.id] || 0) > 0;
                const growingA = (growingCounts[a.id] || 0) > 0;
                const growingB = (growingCounts[b.id] || 0) > 0;

                // 定义优先级分数 (分数越高越靠前)
                // 3分: B类 (有库存)
                // 2分: A类 (无库存但收集中)
                // 1分: C类 (啥都没)
                const getScore = (hasStock: boolean, isGrowing: boolean) => {
                    if (hasStock) return 3;
                    if (isGrowing) return 2;
                    return 1;
                };

                const scoreA = getScore(stockA, growingA);
                const scoreB = getScore(stockB, growingB);

                // 优先级不同，高分在前
                if (scoreA !== scoreB) return scoreB - scoreA;

                // 3. 同优先级下，按“严格度”降序 (难养的在前)
                const strictA = getStrictnessScore(a);
                const strictB = getStrictnessScore(b);
                if (strictA !== strictB) return strictB - strictA;
            }

            // 4. 最后按数据库默认顺序
            return MUSHROOM_DB.indexOf(a) - MUSHROOM_DB.indexOf(b);
        });
    }, [filteredList, collectedIds, inventory, growingCounts]); // 别忘了把 growingCounts 加入依赖数组

    // ... (missingEnvironments logic unchanged) ...
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

    const recentMushrooms = useMemo(() => {
        return recentIds.map(id => MUSHROOM_DB.find(m => m.id === id)).filter((m): m is MushroomDef => !!m);
    }, [recentIds]);

    const hasCollectedInView = sortedDisplayList.some(m => collectedIds.includes(m.id));
    const selectStyle = {padding: '6px', borderRadius: 4, border: '1px solid #ccc', fontSize: 13, minWidth: 100};

    const totalCollected = collectedIds.length;
    const totalMushrooms = MUSHROOM_DB.length;
    const progressPercent = Math.round((totalCollected / totalMushrooms) * 100);

    const currentListTotal = filteredList.length;
    const currentListCollected = filteredList.filter(m => collectedIds.includes(m.id)).length;
    const currentListUncollected = currentListTotal - currentListCollected;

    const scrollToTop = () => topRef.current?.scrollIntoView({behavior: 'smooth'});
    const scrollToCollected = () => collectedStartRef.current?.scrollIntoView({behavior: 'smooth', block: 'start'});

    return (
        <div ref={topRef} style={{paddingBottom: 80, position: 'relative'}}>
            {/* 顶部：筛选器 (部分代码省略，保持原样) */}
            <CollapsibleSection
                title="🔍 图鉴筛选"
                defaultOpen={true}
                headerBg="#e3f2fd"
                headerColor="#1565c0"
                action={
                    <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
                        {/* ... stats ... */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            background: '#fff', padding: '2px 8px', borderRadius: 10,
                            border: '1px solid #bbdefb', fontSize: 12
                        }}>
                            <span style={{color: '#1565c0'}}>当前: {currentListTotal}</span>
                            <span style={{color: '#ccc'}}>|</span>
                            <span style={{color: '#2e7d32'}} title="已收集">✅ {currentListCollected}</span>
                            <span style={{color: '#e65100'}} title="未收集">❌ {currentListUncollected}</span>
                        </div>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            background: '#e8f5e9', padding: '2px 8px', borderRadius: 10,
                            border: '1px solid #c8e6c9'
                        }}>
                            <span style={{fontSize: 13}}>🏆</span>
                            <span style={{
                                fontSize: 12,
                                fontWeight: 'bold',
                                color: '#2e7d32'
                            }}>进度：{totalCollected}/{totalMushrooms} ({progressPercent}%)</span>
                        </div>
                    </div>
                }
            >
                <div style={{display: 'flex', flexDirection: 'column', gap: 15}}>
                    {/* 将原来的 <div style={{width: '100%'}}>...</div> 替换为以下代码 */}
                    <div style={{display: 'flex', gap: 10, alignItems: 'center', width: '100%'}}>
                        <input
                            placeholder="🔍 搜索菌种：输入名字或拼音首字母 (如: wnz)"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{
                                flex: 1, // 让输入框占据剩余空间
                                padding: '10px',
                                boxSizing: 'border-box',
                                border: '1px solid #ccc',
                                borderRadius: 4,
                                fontSize: 14,
                                background: '#f9f9f9',
                                outline: 'none',
                                // 给输入框加个 focus 样式会让体验更好
                                transition: 'border-color 0.2s'
                            }}
                        />
                        <button
                            onClick={() => {
                                setFilters(INITIAL_FILTERS); // 确保你在文件头部定义了 INITIAL_FILTERS
                                setSearchTerm('');
                            }}
                            title="重置所有筛选条件和搜索"
                            style={{
                                padding: '0 15px', // 左右留白
                                height: 38,        // 高度与 input 大致对齐 (input padding 10 + font 14 + border 2 ≈ 38-40)
                                background: '#fff',
                                border: '1px solid #ccc',
                                borderRadius: 4,
                                cursor: 'pointer',
                                color: '#666',
                                fontSize: 13,
                                whiteSpace: 'nowrap', // 防止文字换行
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
                            onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                        >
                            <span>🔄</span> 重置
                        </button>
                    </div>
                    {/* ... Select inputs kept same ... */}
                    <div style={{display: 'flex', flexWrap: 'wrap', gap: 15}}>
                        <label>
                            <div style={{fontSize: 12, color: '#888', marginBottom: 4}}>收集状态</div>
                            <select style={{...selectStyle, borderColor: '#4caf50', background: '#f1f8e9'}}
                                    value={filters.collection}
                                    onChange={e => setFilters({...filters, collection: e.target.value})}>
                                <option value="all">全部</option>
                                <option value="collectable">🌱 可收集 (道具齐全)</option>
                                <option value="collected">✅ 已收集</option>
                                <option value="uncollected">❌ 未收集</option>
                            </select>
                        </label>
                        {/* ... other filters ... */}
                        <label>
                            <div style={{fontSize: 12, color: '#888', marginBottom: 4}}>初始菌种</div>
                            <select style={selectStyle} value={filters.starter}
                                    onChange={e => setFilters({...filters, starter: e.target.value})}>
                                <option value="all">全部</option>
                                {Object.values(MushroomChildIds).map(id => <option key={id}
                                                                                   value={id}>{MUSHROOM_CHILDREN[id]}</option>)}
                            </select>
                        </label>
                        <label>
                            <div style={{fontSize: 12, color: '#888', marginBottom: 4}}>木头</div>
                            <select style={selectStyle} value={filters.wood}
                                    onChange={e => setFilters({...filters, wood: e.target.value})}>
                                <option value="all">全部</option>
                                {Object.values(Woods).map(w => <option key={w} value={w}>{w}</option>)}</select></label>
                        <label>
                            <div style={{fontSize: 12, color: '#888', marginBottom: 4}}>日照</div>
                            <select style={selectStyle} value={filters.light}
                                    onChange={e => setFilters({...filters, light: e.target.value})}>
                                <option value="all">全部</option>
                                {Object.values(Lights).map(l => <option key={l} value={l}>{l}</option>)}
                            </select></label>
                        <label>
                            <div style={{fontSize: 12, color: '#888', marginBottom: 4}}>补水</div>
                            <select style={selectStyle} value={filters.humidifier}
                                    onChange={e => setFilters({...filters, humidifier: e.target.value})}>
                                <option value="all">全部</option>
                                {Object.values(Humidifiers).map(h => <option key={h} value={h}>{h}</option>)}
                            </select></label>
                        <label>
                            <div style={{fontSize: 12, color: '#888', marginBottom: 4}}>时间</div>
                            <select style={selectStyle} value={filters.time}
                                    onChange={e => setFilters({...filters, time: e.target.value})}>
                                <option value="all">全部</option>
                                {Object.values(TimeRanges).map(t => <option key={t} value={t}>{t}</option>)}
                            </select></label>
                        <label>
                            <div style={{fontSize: 12, color: '#888', marginBottom: 4}}>特殊情况</div>
                            <select style={selectStyle} value={filters.special}
                                    onChange={e => setFilters({...filters, special: e.target.value})}>
                                <option value="all">全部</option>
                                {Object.values(SpecialConditions).map(s => <option key={s} value={s}>{s}</option>)}
                            </select></label>
                        <label>
                            <div style={{fontSize: 12, color: '#888', marginBottom: 4}}>是否救助</div>
                            <select style={selectStyle} value={filters.save}
                                    onChange={e => setFilters({...filters, save: e.target.value})}>
                                <option value="all">全部</option>
                                <option value="yes">救助</option>
                                <option value="no">不救</option>
                            </select></label>
                    </div>
                </div>
            </CollapsibleSection>

            {/* 最近操作列表 (使用 props 中的 recentIds) */}
            {recentMushrooms.length > 0 && (
                <CollapsibleSection
                    title={
                        <span>🕒 最近{RECENT_ID_COUNT}次操作</span>
                    }
                    defaultOpen={false}
                    headerBg="#e1f5fe"
                    headerColor="#0277bd"
                >
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: 15
                    }}>
                        {recentMushrooms.map(m => (
                            <MushroomCardItem
                                key={`recent-${m.id}`}
                                m={m}
                                isCollected={collectedIds.includes(m.id)}
                                hasStock={(inventory[m.id] || 0) > 0}
                                isGrowing={(growingCounts[m.id] || 0) > 0}
                                onToggle={handleToggle}
                                unlockedWoods={unlockedWoods}
                                unlockedLights={unlockedLights}
                                unlockedHumidifiers={unlockedHumidifiers}
                            />
                        ))}
                    </div>
                </CollapsibleSection>
            )}

            {/* 中间：环境需求汇总 (保持不变) */}
            {missingEnvironments.length > 0 && (
                <CollapsibleSection
                    title={<span>🧪 待收集环境配方 <span style={{
                        fontSize: 12,
                        fontWeight: 'normal',
                        color: '#e65100'
                    }}>({missingEnvironments.length} 组)</span></span>}
                    defaultOpen={false} headerBg="#fff3e0" headerColor="#e65100"
                >
                    {/* ... content kept same ... */}
                    <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
                        <div style={{fontSize: 12, color: '#888', marginBottom: 4}}>以下是当前筛选范围内，未收集菌种所需的环境组合。<br/>排序优先级：<b>道具齐全</b> &gt;
                            <b>严格度高</b></div>
                        <div style={{display: 'flex', flexWrap: 'wrap', gap: 10}}>
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
                                    {env.isReady && <span style={{fontSize: 14}}>✅</span>}
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
                                    <div style={{height: 30, width: 1, background: '#eee'}}></div>
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
                                        <span style={{fontSize: 10, color: '#999'}}>种未收</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </CollapsibleSection>
            )}

            {/* 新增：批量收集按钮 (保持不变) */}
            {uncollectedIdsInView.length > 0 && (
                <div style={{marginTop: 15, marginBottom: 5, display: 'flex', justifyContent: 'flex-end'}}>
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

            {/* 底部：图鉴列表 */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 15,
                marginTop: 15
            }}>
                {sortedDisplayList.map((m, idx) => {
                    const isCollected = collectedIds.includes(m.id);
                    const prevIsCollected = idx > 0 ? collectedIds.includes(sortedDisplayList[idx - 1].id) : false;
                    const showSeparator = isCollected && (idx === 0 || !prevIsCollected);

                    return (
                        <React.Fragment key={m.id}>
                            {showSeparator && (
                                <div ref={collectedStartRef} style={{
                                    gridColumn: '1 / -1',
                                    marginTop: 20,
                                    marginBottom: 10,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    color: '#81c784',
                                    fontSize: 14,
                                    fontWeight: 'bold'
                                }}>
                                    <span>⬇️ 已收集部分</span>
                                    <div style={{flex: 1, height: 2, background: '#e8f5e9'}}></div>
                                </div>
                            )}
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

            {/* 悬浮球 (保持不变) */}
            <div style={{
                position: 'fixed',
                bottom: 30,
                right: 20,
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                gap: 12
            }}>
                <button onClick={scrollToTop} title="回到未收集/顶部" style={{
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
                {hasCollectedInView && (
                    <button onClick={scrollToCollected} title="跳到已收集部分" style={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        background: '#e8f5e9',
                        border: '2px solid #81c784',
                        color: '#2e7d32',
                        fontSize: 20,
                        boxShadow: '0 4px 10px rgba(76, 175, 80, 0.2)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>⬇️</button>
                )}
            </div>
        </div>
    );
};