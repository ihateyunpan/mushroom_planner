import React, { useMemo, useState } from 'react';
import { MUSHROOM_CHILDREN, MUSHROOM_DB } from '../database';
import { Humidifiers, Lights, MushroomChildIds, SpecialConditions, Woods } from '../types';
import { getChildImg, getMushroomImg, TOOL_INFO } from '../utils';
import { CollapsibleSection, EnvBadge, MiniImg } from './Common';

export const Encyclopedia: React.FC = () => {
    const [filters, setFilters] = useState({
        starter: 'all', wood: 'all', light: 'all', humidifier: 'all', time: 'all', special: 'all', save: 'all',
    });

    const filteredList = useMemo(() => {
        return MUSHROOM_DB.filter(m => {
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
            return true;
        });
    }, [filters]);

    const selectStyle = {padding: '6px', borderRadius: 4, border: '1px solid #ccc', fontSize: 13, minWidth: 100};

    return (
        <div>
            <CollapsibleSection title="🔍 图鉴筛选" defaultOpen={true} headerBg="#e3f2fd" headerColor="#1565c0">
                <div style={{display: 'flex', flexWrap: 'wrap', gap: 15}}>
                    <label>
                        <div style={{fontSize: 12, color: '#888', marginBottom: 4}}>初始菌种</div>
                        <select style={selectStyle} value={filters.starter}
                                onChange={e => setFilters({...filters, starter: e.target.value})}>
                            <option value="all">全部</option>
                            {Object.values(MushroomChildIds).map(id => <option key={id}
                                                                               value={id}>{MUSHROOM_CHILDREN[id].name}</option>)}
                        </select></label>
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
                            {Object.values(Lights).map(l => <option key={l} value={l}>{l}</option>)}</select></label>
                    <label>
                        <div style={{fontSize: 12, color: '#888', marginBottom: 4}}>补水</div>
                        <select style={selectStyle} value={filters.humidifier}
                                onChange={e => setFilters({...filters, humidifier: e.target.value})}>
                            <option value="all">全部</option>
                            {Object.values(Humidifiers).map(h => <option key={h} value={h}>{h}</option>)}
                        </select></label>
                    <label>
                        <div style={{fontSize: 12, color: '#888', marginBottom: 4}}>特殊情况</div>
                        <select style={selectStyle} value={filters.special}
                                onChange={e => setFilters({...filters, special: e.target.value})}>
                            <option value="all">全部</option>
                            {Object.values(SpecialConditions).map(s => <option key={s} value={s}>{s}</option>)}</select></label>
                    <label>
                        <div style={{fontSize: 12, color: '#888', marginBottom: 4}}>是否救助</div>
                        <select style={selectStyle} value={filters.save}
                                onChange={e => setFilters({...filters, save: e.target.value})}>
                            <option value="all">全部</option>
                            <option value="yes">救助</option>
                            <option value="no">不救</option>
                        </select></label>
                </div>
            </CollapsibleSection>

            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 15}}>
                {filteredList.map(m => (
                    <div key={m.id} style={{
                        border: '1px solid #eee',
                        borderRadius: 8,
                        padding: 15,
                        background: '#fff',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.03)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10
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
                            <div style={{display: 'flex', alignItems: 'center', gap: 6}}><span
                                style={{color: '#888'}}>起始:</span><MiniImg src={getChildImg(m.starter, m.special)}
                                                                             label={m.starter} size={20}
                                                                             circle/><span>{MUSHROOM_CHILDREN[m.starter].name}</span>
                            </div>
                            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5}}>
                                <EnvBadge label="木头" value={m.wood || '任意'} icon="🪵"/><EnvBadge label="日照"
                                                                                                    value={m.light || '任意'}
                                                                                                    icon="💡"/><EnvBadge
                                label="补水" value={m.humidifier || '任意'} icon="💧"/><EnvBadge label="时间"
                                                                                                value={m.time || '任意'}
                                                                                                icon="🕒"/>
                            </div>
                            {m.special && (
                                <div style={{
                                    marginTop: 4,
                                    background: '#fff3e0',
                                    padding: 6,
                                    borderRadius: 4,
                                    fontSize: 12
                                }}>
                                    <div style={{
                                        color: '#e65100',
                                        fontWeight: 'bold',
                                        marginBottom: 2
                                    }}>⚠️ {m.special}</div>
                                    <div style={{display: 'flex', alignItems: 'center', gap: 4}}>
                                        <span>处理:</span>{m.save ? <span style={{
                                            color: '#2e7d32',
                                            fontWeight: 'bold',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 4
                                        }}>✅ 救助 {TOOL_INFO[m.special] && <span style={{
                                            fontWeight: 'normal',
                                            color: '#555'
                                        }}>({TOOL_INFO[m.special].name})</span>}</span> :
                                        <span style={{color: '#c62828', fontWeight: 'bold'}}>❌ 不救 (变异)</span>}</div>
                                </div>
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