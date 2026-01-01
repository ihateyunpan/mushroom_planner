import React from 'react';
import { MUSHROOM_CHILDREN } from '../database';
import type { CalculationResult } from '../logic';
import { TimeRanges } from '../types';
import { getChildImg, getMushroomImg, getSourceInfo, getToolIcon, TOOL_INFO } from '../utils';
import { btnStyle, CollapsibleSection, EnvBadge, MiniImg } from './Common';

interface PlanPanelProps {
    plan: CalculationResult;
    onRefresh: () => void;
}

export const PlanPanel: React.FC<PlanPanelProps> = ({plan: {batches, missingSummary}, onRefresh}) => {
    const renderTaskGrid = (tasks: typeof batches[0]['tasks']) => (
        <div className="plan-grid">
            {tasks.map((task, tIdx) => (
                <div key={tIdx} style={{
                    border: '1px solid #eee',
                    borderRadius: 8,
                    padding: 12,
                    background: '#fff',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.03)'
                }}>
                    <div style={{display: 'flex', gap: 12, marginBottom: 10}}>
                        <MiniImg src={getMushroomImg(task.mushroom.id)} label={task.mushroom.name} size={48}/>
                        <div style={{flex: 1}}>
                            <div style={{fontWeight: 'bold', fontSize: 15}}>{task.mushroom.name}</div>
                            <div style={{fontSize: 12, color: '#666'}}>需培育: <span
                                style={{color: '#d32f2f', fontWeight: 'bold'}}>{task.countNeeded}</span> 个
                            </div>
                        </div>
                    </div>
                    <hr style={{border: 0, borderTop: '1px dashed #eee', margin: '8px 0'}}/>
                    <div style={{fontSize: 12, color: '#555', display: 'flex', flexDirection: 'column', gap: 6}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
                            <span>起始:</span>
                            <MiniImg src={getChildImg(task.mushroom.starter, task.mushroom.special)}
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
                                }}>{task.mushroom.special}</span>
                                <span>➜</span>
                                {task.mushroom.save ? (
                                    <div style={{display: 'flex', alignItems: 'center', gap: 4, color: '#2e7d32'}}>
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
                                                <span>(</span><MiniImg src={TOOL_INFO[task.mushroom.special].img}
                                                                       size={14}/><span>{TOOL_INFO[task.mushroom.special].name})</span>
                                            </div>
                                        )}
                                    </div>
                                ) : <strong style={{color: '#c62828'}}>不救</strong>}
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div style={{background: '#fcfcfc', borderRadius: 8, border: '1px solid #e0e0e0', minHeight: 600}}>
            <div style={{
                padding: 20,
                borderBottom: '1px solid #eee',
                background: '#fff',
                borderRadius: '8px 8px 0 0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div><h2 style={{margin: 0, color: '#333'}}>🌱 培育计划</h2></div>
                <button onClick={onRefresh} style={{...btnStyle, background: '#f5f5f5', color: '#333'}}>🔄 刷新</button>
            </div>
            <div style={{padding: 20}}>
                {missingSummary.length > 0 && (
                    <div style={{
                        background: '#ffebee',
                        border: '1px solid #ffcdd2',
                        borderRadius: 6,
                        padding: 15,
                        marginBottom: 20
                    }}>
                        <strong style={{display: 'block', marginBottom: 10, color: '#c62828'}}>⚠️
                            缺少以下关键设备：</strong>
                        <div style={{display: 'flex', flexWrap: 'wrap', gap: 10}}>
                            {missingSummary.map((item, idx) => (
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
                {batches.length === 0 ? (
                    <div style={{textAlign: 'center', padding: 40, color: '#aaa'}}>
                        <div style={{fontSize: 40, marginBottom: 10}}>🎉</div>
                        需求满足</div>
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
                                if (TOOL_INFO[condition]) batchTools[condition] = (batchTools[condition] || 0) + t.countNeeded;
                            }
                            if (t.mushroom.time === TimeRanges.DAY) timeGroups[TimeRanges.DAY].push(t);
                            else if (t.mushroom.time === TimeRanges.NIGHT) timeGroups[TimeRanges.NIGHT].push(t);
                            else timeGroups['any'].push(t);
                        });
                        return (
                            <CollapsibleSection
                                key={batch.id} defaultOpen={true}
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
                                        <EnvBadge label="木头" value={batch.env.wood} icon="🪵"/><EnvBadge label="日照"
                                                                                                          value={batch.env.light}
                                                                                                          icon="💡"/><EnvBadge
                                        label="补水" value={batch.env.humidifier} icon="💧"/>
                                        {batch.missingEquipment.length > 0 && <div style={{
                                            color: 'red',
                                            fontWeight: 'bold',
                                            marginLeft: 'auto'
                                        }}>缺: {batch.missingEquipment.map(m => m.value).join(', ')}</div>}
                                    </div>
                                    <div style={{
                                        borderTop: '1px dashed #eee',
                                        paddingTop: 8,
                                        marginTop: 4,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 15,
                                        flexWrap: 'wrap'
                                    }}>
                                        <span style={{color: '#666', fontWeight: 'bold'}}>🩹 所需救助道具:</span>
                                        {Object.keys(batchTools).length === 0 ?
                                            <span style={{color: '#aaa'}}>无</span> : (
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
                                                        <MiniImg src={TOOL_INFO[cond].img} size={18}
                                                                 circle/><span>{TOOL_INFO[cond].name} <strong
                                                        style={{color: '#d32f2f'}}>x{count}</strong></span>
                                                    </div>
                                                ))
                                            )}
                                    </div>
                                </div>
                                <div style={{display: 'flex', flexDirection: 'column', gap: 20}}>
                                    {timeGroups[TimeRanges.DAY].length > 0 && <div>
                                        <div style={{
                                            fontSize: 14,
                                            fontWeight: 'bold',
                                            marginBottom: 8,
                                            color: '#e65100',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 5
                                        }}><span>☀️ 白天生长</span><span style={{
                                            fontSize: 12,
                                            fontWeight: 'normal',
                                            color: '#888'
                                        }}>({timeGroups[TimeRanges.DAY].length})</span></div>
                                        {renderTaskGrid(timeGroups[TimeRanges.DAY])}</div>}
                                    {timeGroups[TimeRanges.NIGHT].length > 0 && <div>
                                        <div style={{
                                            fontSize: 14,
                                            fontWeight: 'bold',
                                            marginBottom: 8,
                                            color: '#311b92',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 5
                                        }}><span>🌙 黑夜生长</span><span style={{
                                            fontSize: 12,
                                            fontWeight: 'normal',
                                            color: '#888'
                                        }}>({timeGroups[TimeRanges.NIGHT].length})</span></div>
                                        {renderTaskGrid(timeGroups[TimeRanges.NIGHT])}</div>}
                                    {timeGroups['any'].length > 0 && <div>
                                        <div style={{
                                            fontSize: 14,
                                            fontWeight: 'bold',
                                            marginBottom: 8,
                                            color: '#455a64',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 5
                                        }}><span>🕒 时间不限</span><span style={{
                                            fontSize: 12,
                                            fontWeight: 'normal',
                                            color: '#888'
                                        }}>({timeGroups['any'].length})</span></div>
                                        {renderTaskGrid(timeGroups['any'])}</div>}
                                </div>
                            </CollapsibleSection>
                        );
                    })
                )}
            </div>
        </div>
    );
};