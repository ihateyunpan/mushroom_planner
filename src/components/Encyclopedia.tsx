// src/components/Encyclopedia.tsx
import React, { useMemo, useState } from 'react';
import { MUSHROOM_CHILDREN, MUSHROOM_DB } from '../database';
// 修改点1：引入 TimeRanges
import { Humidifiers, Lights, MushroomChildIds, SpecialConditions, TimeRanges, Woods } from '../types';
import { getChildImg, getMushroomImg, TOOL_INFO } from '../utils';
import { CollapsibleSection, EnvBadge, MiniImg } from './Common';

// 根据特殊情况获取样式配置
const getSpecialStyle = (special: string) => {
    switch (special) {
        case SpecialConditions.BUG:
            return {bg: '#ffebee', color: '#c62828', icon: '🐛', border: '#ffcdd2'}; // 红：虫害
        case SpecialConditions.LESS:
            return {bg: '#e3f2fd', color: '#1565c0', icon: '🥀', border: '#bbdefb'}; // 蓝：营养不良
        case SpecialConditions.MUCH:
            return {bg: '#f3e5f5', color: '#6a1b9a', icon: '💊', border: '#e1bee7'}; // 紫：营养过剩
        default:
            return {bg: '#fff3e0', color: '#ef6c00', icon: '⚠️', border: '#ffe0b2'}; // 橙：默认
    }
};

export const Encyclopedia: React.FC = () => {
    const [filters, setFilters] = useState({
        starter: 'all', wood: 'all', light: 'all', humidifier: 'all', time: 'all', special: 'all', save: 'all',
    });
    // 新增：搜索关键词状态
    const [searchTerm, setSearchTerm] = useState('');

    const filteredList = useMemo(() => {
        return MUSHROOM_DB.filter(m => {
            // 搜索过滤逻辑
            if (searchTerm) {
                const lower = searchTerm.toLowerCase().trim();
                // 同时匹配名称和拼音首字母
                if (!m.name.includes(lower) && !m.pinyin.includes(lower)) return false;
            }

            if (filters.starter !== 'all' && m.starter !== filters.starter) return false;
            if (filters.wood !== 'all' && m.wood !== filters.wood) return false;
            if (filters.light !== 'all' && m.light !== filters.light) return false;
            if (filters.humidifier !== 'all' && m.humidifier !== filters.humidifier) return false;
            // 时间过滤逻辑 (之前已有逻辑，现在有了UI就能生效了)
            if (filters.time !== 'all' && m.time !== filters.time) return false;
            if (filters.special !== 'all' && m.special !== filters.special) return false;
            if (filters.save !== 'all') {
                const needsSave = filters.save === 'yes';
                if (m.save !== needsSave) return false;
                if (filters.save === 'no' && m.save === true) return false;
                if (filters.save === 'yes' && !m.save) return false;
            }
            return true;
        });
    }, [filters, searchTerm]); // 添加 searchTerm 依赖

    const selectStyle = {padding: '6px', borderRadius: 4, border: '1px solid #ccc', fontSize: 13, minWidth: 100};

    return (
        <div>
            <CollapsibleSection
                title="🔍 图鉴筛选"
                defaultOpen={true}
                headerBg="#e3f2fd"
                headerColor="#1565c0"
                action={
                    <div style={{
                        fontSize: 13,
                        fontWeight: 'normal',
                        color: '#1565c0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                    }}>
                        <span>📚 当前筛选:</span>
                        <span style={{
                            background: '#fff',
                            padding: '2px 8px',
                            borderRadius: 10,
                            fontSize: 12,
                            fontWeight: 'bold',
                            border: '1px solid #bbdefb'
                        }}>
                            {/* 显示：当前筛选数量 / 总数量 */}
                            {filteredList.length} / {MUSHROOM_DB.length}
                        </span>
                        <span>📚 收录进度:</span>
                        <span style={{
                            background: '#fff',
                            padding: '2px 8px',
                            borderRadius: 10,
                            fontSize: 12,
                            fontWeight: 'bold',
                            border: '1px solid #bbdefb'
                        }}>
                            {/* 显示：当前筛选数量 / 总数量 */}
                            {MUSHROOM_DB.length} / 285
                        </span>
                    </div>
                }
            >
                <div style={{display: 'flex', flexDirection: 'column', gap: 15}}>
                    {/* 新增：搜索输入框 */}
                    <div style={{width: '100%'}}>
                        <input
                            placeholder="🔍 搜索菌种：输入名字或拼音首字母 (如: wnz)"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px',
                                boxSizing: 'border-box',
                                border: '1px solid #ccc',
                                borderRadius: 4,
                                fontSize: 14,
                                background: '#f9f9f9'
                            }}
                        />
                    </div>

                    <div style={{display: 'flex', flexWrap: 'wrap', gap: 15}}>
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
                                {Object.values(Woods).map(w => <option key={w} value={w}>{w}</option>)}
                            </select>
                        </label>
                        <label>
                            <div style={{fontSize: 12, color: '#888', marginBottom: 4}}>日照</div>
                            <select style={selectStyle} value={filters.light}
                                    onChange={e => setFilters({...filters, light: e.target.value})}>
                                <option value="all">全部</option>
                                {Object.values(Lights).map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                        </label>
                        <label>
                            <div style={{fontSize: 12, color: '#888', marginBottom: 4}}>补水</div>
                            <select style={selectStyle} value={filters.humidifier}
                                    onChange={e => setFilters({...filters, humidifier: e.target.value})}>
                                <option value="all">全部</option>
                                {Object.values(Humidifiers).map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                        </label>
                        {/* 修改点2：增加时间筛选 UI */}
                        <label>
                            <div style={{fontSize: 12, color: '#888', marginBottom: 4}}>时间</div>
                            <select style={selectStyle} value={filters.time}
                                    onChange={e => setFilters({...filters, time: e.target.value})}>
                                <option value="all">全部</option>
                                {Object.values(TimeRanges).map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </label>
                        <label>
                            <div style={{fontSize: 12, color: '#888', marginBottom: 4}}>特殊情况</div>
                            <select style={selectStyle} value={filters.special}
                                    onChange={e => setFilters({...filters, special: e.target.value})}>
                                <option value="all">全部</option>
                                {Object.values(SpecialConditions).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </label>
                        <label>
                            <div style={{fontSize: 12, color: '#888', marginBottom: 4}}>是否救助</div>
                            <select style={selectStyle} value={filters.save}
                                    onChange={e => setFilters({...filters, save: e.target.value})}>
                                <option value="all">全部</option>
                                <option value="yes">救助</option>
                                <option value="no">不救</option>
                            </select>
                        </label>
                    </div>
                </div>
            </CollapsibleSection>

            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 15}}>
                {filteredList.map(m => (
                    <div key={m.id} style={{
                        border: '1px solid #eee', borderRadius: 8, padding: 15,
                        background: '#fff', boxShadow: '0 2px 5px rgba(0,0,0,0.03)',
                        display: 'flex', flexDirection: 'column', gap: 10
                    }}>
                        <div style={{display: 'flex', gap: 12}}>
                            <MiniImg src={getMushroomImg(m.id)} label={m.name} size={50}/>
                            <div>
                                <div style={{fontWeight: 'bold', fontSize: 15}}>{m.name}</div>
                                <div style={{fontSize: 12, color: '#999', marginTop: 4}}>ID: {m.id}</div>
                            </div>
                        </div>
                        <hr style={{border: 0, borderTop: '1px dashed #eee', margin: 0}}/>
                        <div style={{fontSize: 13, display: 'flex', flexDirection: 'column', gap: 6}}>
                            <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
                                <span style={{color: '#888'}}>起始:</span>
                                <MiniImg src={getChildImg(m.starter, m.special)} label={m.starter} size={20} circle/>
                                <span>{MUSHROOM_CHILDREN[m.starter]}</span>
                            </div>
                            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5}}>
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
                                            marginTop: 6,
                                            background: style.bg,
                                            padding: '8px 10px',
                                            borderRadius: 6,
                                            border: `1px solid ${style.border}`,
                                            fontSize: 12
                                        }}>
                                            <div style={{
                                                color: style.color,
                                                fontWeight: 'bold',
                                                marginBottom: 6,
                                                display: 'flex', alignItems: 'center', gap: 6
                                            }}>
                                                <span style={{fontSize: 16}}>{style.icon}</span>
                                                {m.special}
                                            </div>

                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 6,
                                                flexWrap: 'wrap'
                                            }}>
                                                <span style={{color: '#666'}}>策略:</span>
                                                {m.save ? (
                                                    <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
                                                        <span style={{
                                                            color: '#2e7d32',
                                                            fontWeight: 'bold',
                                                            background: 'rgba(255,255,255,0.6)',
                                                            padding: '1px 5px',
                                                            borderRadius: 4
                                                        }}>
                                                            ✅ 救助
                                                        </span>
                                                        {TOOL_INFO[m.special] && (
                                                            <div style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 4,
                                                                background: '#fff',
                                                                padding: '2px 8px',
                                                                borderRadius: 12,
                                                                border: '1px solid rgba(0,0,0,0.1)',
                                                                fontSize: 12,
                                                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                                            }}>
                                                                <MiniImg src={TOOL_INFO[m.special].img} size={18}
                                                                         circle/>
                                                                <span
                                                                    style={{color: '#333'}}>{TOOL_INFO[m.special].name}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span style={{
                                                        color: '#c62828',
                                                        fontWeight: 'bold',
                                                        background: 'rgba(255,255,255,0.6)',
                                                        padding: '1px 5px',
                                                        borderRadius: 4
                                                    }}>
                                                        ❌ 不救 (变异)
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()
                            )}
                        </div>
                    </div>
                ))}
                {filteredList.length === 0 && <div style={{
                    color: '#999',
                    padding: 20,
                    textAlign: 'center',
                    gridColumn: '1/-1'
                }}>没有符合条件的菌种</div>}
            </div>
        </div>
    );
};