// src/components/PlanPanel.tsx
import React, { useMemo } from 'react';
import { MUSHROOM_CHILDREN } from '../database';
import type { CalculationResult, PlanBatch } from '../logic';
import { TimeRanges } from '../types';
import { getChildImg, getMushroomImg, getSourceInfo, getToolIcon, TOOL_INFO } from '../utils';
import { btnStyle, CollapsibleSection, EnvBadge, MiniImg } from './Common';

interface PlanPanelProps {
    plan: CalculationResult;
    completedBatches: PlanBatch[]; // 新增：已完成的批次列表
    onCompleteBatch: (batch: PlanBatch) => void; // 新增：完成回调
    onRefresh: () => void;
}

export const PlanPanel: React.FC<PlanPanelProps> = ({
                                                        plan: {batches, missingSummary},
                                                        completedBatches,
                                                        onCompleteBatch,
                                                        onRefresh
                                                    }) => {

    const hasStrictDay = batches.some(b => b.env.time === TimeRanges.DAY);
    const hasStrictNight = batches.some(b => b.env.time === TimeRanges.NIGHT);
    const showSplitLayout = hasStrictDay && hasStrictNight;

    const dayBatches = showSplitLayout ? batches.filter(b => b.env.time === TimeRanges.DAY || b.env.time === '任意') : [];
    const nightBatches = showSplitLayout ? batches.filter(b => b.env.time === TimeRanges.NIGHT || b.env.time === '任意') : [];

    // 创建 ID 到 序号 的映射，用于显示 "见第X批"
    // 注意：已完成的批次不参与序号重新计算，或者应该保持它们被完成时的序号？
    // 为简单起见，这里只对当前活跃的批次进行编号，已完成的批次可以单独处理或显示"已完成"
    const batchIndexMap = useMemo(() => {
        const map = new Map<string, number>();
        batches.forEach((b, i) => map.set(b.id, i + 1));
        return map;
    }, [batches]);

    const getSinglePanelConfig = () => {
        if (hasStrictDay) return {
            title: '☀️ 白天场', sub: '(包含时间任意的批次)',
            bg: '#fff8e1', border: '#ffecb3', titleColor: '#f57f17'
        };
        if (hasStrictNight) return {
            title: '🌙 夜晚场', sub: '(包含时间任意的批次)',
            bg: '#e8eaf6', border: '#c5cae9', titleColor: '#3949ab'
        };
        return {
            title: '🕒 自由时间', sub: '(所有批次时间均不限)',
            bg: '#eceff1', border: '#cfd8dc', titleColor: '#455a64'
        };
    };

    const renderBatch = (batch: PlanBatch, idx: number, isFlexibleTime: boolean, isCompleted: boolean) => {
        // --- 分开统计核心道具和顺风车道具 ---
        const batchTools: Record<string, number> = {};
        const passengerTools: Record<string, number> = {};

        batch.tasks.forEach(t => {
            if (t.mushroom.special && t.mushroom.save) {
                const condition = t.mushroom.special;
                if (TOOL_INFO[condition]) {
                    if (t.isPassenger) {
                        passengerTools[condition] = (passengerTools[condition] || 0) + t.countNeeded;
                    } else {
                        batchTools[condition] = (batchTools[condition] || 0) + t.countNeeded;
                    }
                }
            }
        });

        // 排序：核心任务在前，顺风车在后
        const sortedTasks = [...batch.tasks].sort((a, b) => {
            if (a.isPassenger === b.isPassenger) return 0;
            return a.isPassenger ? 1 : -1;
        });

        const batchNumber = isCompleted ? '已完成' : (batchIndexMap.get(batch.id) || idx + 1);

        return (
            <CollapsibleSection
                key={batch.id} defaultOpen={!isCompleted}
                title={
                    <div style={{display: 'flex', alignItems: 'center', gap: 8, opacity: isCompleted ? 0.6 : 1}}>
                        <span style={{textDecoration: isCompleted ? 'line-through' : 'none'}}>
                            {isCompleted ? `🏁 ${batchNumber}` : `第${batchNumber}批`}: {batch.env.wood}
                        </span>
                        {isFlexibleTime && !isCompleted && <span style={{
                            fontSize: 11,
                            background: '#e0f7fa',
                            color: '#006064',
                            padding: '1px 5px',
                            borderRadius: 4
                        }}>🕒 时间任意</span>}
                        {isCompleted && <span style={{
                            fontSize: 11,
                            background: '#eee',
                            color: '#666',
                            padding: '1px 5px',
                            borderRadius: 4
                        }}>✅ 已完成</span>}
                    </div>
                }
                headerBg={isCompleted ? '#f0f0f0' : (batch.missingEquipment.length > 0 ? '#fff3e0' : (isFlexibleTime ? '#f0f4c3' : '#f1f8e9'))}
                headerColor={isCompleted ? '#999' : (batch.missingEquipment.length > 0 ? '#e65100' : '#33691e')}
                action={!isCompleted ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('确认完成此批次？\n\n完成后：\n1. 菌种将自动加入库存\n2. 计算器将重新规划剩余需求')) {
                                onCompleteBatch(batch);
                            }
                        }}
                        style={{
                            ...btnStyle,
                            background: '#4caf50',
                            color: '#fff',
                            border: 'none',
                            fontSize: 12,
                            padding: '4px 10px'
                        }}
                    >
                        ✅ 完成此批
                    </button>
                ) : null}
            >
                {/* 内容区域 (已完成的会半透明显示) */}
                <div style={{opacity: isCompleted ? 0.6 : 1, filter: isCompleted ? 'grayscale(80%)' : 'none'}}>
                    {/* 环境详情 */}
                    <div style={{
                        display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 15, fontSize: 13,
                        background: '#fafafa', padding: 10, borderRadius: 6
                    }}>
                        <div style={{display: 'flex', flexWrap: 'wrap', gap: 15}}>
                            <EnvBadge label="木头" value={batch.env.wood} icon="🪵"/>
                            <EnvBadge label="日照" value={batch.env.light} icon="💡"/>
                            <EnvBadge label="补水" value={batch.env.humidifier} icon="💧"/>
                            {!isCompleted && batch.missingEquipment.length > 0 && <div style={{
                                color: 'red',
                                fontWeight: 'bold',
                                marginLeft: 'auto'
                            }}>缺: {batch.missingEquipment.map(m => m.value).join(', ')}</div>}
                        </div>

                        {/* 核心道具展示 */}
                        <div style={{
                            borderTop: '1px dashed #eee',
                            paddingTop: 8,
                            marginTop: 4,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 15,
                            flexWrap: 'wrap'
                        }}>
                            <span style={{color: '#666', fontWeight: 'bold'}}>🩹 核心目标需:</span>
                            {Object.keys(batchTools).length === 0 ? <span style={{color: '#aaa'}}>无</span> : (
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
                                                 circle/><span>{TOOL_INFO[cond].name}
                                        <strong style={{color: '#d32f2f'}}>x{count}</strong></span>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* 顺风车道具展示 */}
                        {Object.keys(passengerTools).length > 0 && (
                            <div style={{
                                marginTop: -2,
                                display: 'flex', alignItems: 'center', gap: 15, flexWrap: 'wrap',
                                opacity: 0.8
                            }}>
                                <span style={{color: '#999', fontSize: 12}}>🚌 顺风车需:</span>
                                {Object.entries(passengerTools).map(([cond, count]) => (
                                    <div key={cond} style={{
                                        display: 'flex', alignItems: 'center', gap: 4,
                                        background: '#f9f9f9',
                                        padding: '1px 6px', borderRadius: 4,
                                        border: '1px solid #e0e0e0',
                                        fontSize: 12
                                    }}>
                                        <MiniImg src={TOOL_INFO[cond].img} size={14} circle/>
                                        <span style={{color: '#888'}}>{TOOL_INFO[cond].name} <span
                                            style={{fontSize: 11}}>x{count}</span></span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 任务列表 */}
                    <div className="plan-grid">
                        {sortedTasks.map((task, tIdx) => {
                            const isPassenger = !!task.isPassenger;
                            const originalIdx = task.originalBatchId ? batchIndexMap.get(task.originalBatchId) : null;

                            return (
                                <div key={tIdx} style={{
                                    border: isPassenger ? '1px dashed #ccc' : '1px solid #eee',
                                    borderRadius: 8, padding: 12,
                                    background: isPassenger ? '#f9f9f9' : '#fff',
                                    boxShadow: isPassenger ? 'none' : '0 2px 5px rgba(0,0,0,0.03)',
                                    position: 'relative', overflow: 'hidden', opacity: isPassenger ? 0.9 : 1
                                }}>
                                    <div style={{
                                        position: 'absolute', top: 5, right: 5, fontSize: 11,
                                        padding: '2px 6px', borderRadius: 4,
                                        background: isPassenger ? '#eeeeee' : '#fce4ec',
                                        color: isPassenger ? '#666' : '#c2185b',
                                        border: isPassenger ? '1px solid #ddd' : '1px solid #f8bbd0'
                                    }}>
                                        {isPassenger ? `🚌 顺风车 ${originalIdx ? `(见第${originalIdx}批)` : ''}` : '🎯 核心目标'}
                                    </div>

                                    <div style={{display: 'flex', gap: 12, marginBottom: 10, marginTop: 5}}>
                                        <MiniImg src={getMushroomImg(task.mushroom.id)} label={task.mushroom.name}
                                                 size={48}
                                                 color={isPassenger ? '#eee' : '#f5f5f5'}/>
                                        <div style={{flex: 1}}>
                                            <div style={{
                                                fontWeight: 'bold',
                                                fontSize: 15,
                                                color: isPassenger ? '#555' : '#000'
                                            }}>{task.mushroom.name}</div>
                                            <div style={{fontSize: 12, color: '#666'}}>
                                                {isPassenger ? '可蹭: ' : '需培育: '}
                                                <span style={{
                                                    color: isPassenger ? '#666' : '#d32f2f',
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
                                            <MiniImg src={getChildImg(task.mushroom.starter, task.mushroom.special)}
                                                     label={task.mushroom.starter} size={25} circle/>
                                            <span>{MUSHROOM_CHILDREN[task.mushroom.starter]}</span>
                                        </div>
                                        {task.mushroom.special && (
                                            <div style={{
                                                marginTop: 5,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 5
                                            }}>
                                                <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
                                                    <span style={{color: '#888'}}>环境:</span>
                                                    <span style={{
                                                        background: '#fff3e0',
                                                        color: '#ef6c00',
                                                        padding: '1px 5px',
                                                        borderRadius: 3,
                                                        border: '1px solid #ffe0b2'
                                                    }}>
                                                        {task.mushroom.special}
                                                    </span>
                                                </div>
                                                <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
                                                    <span style={{color: '#888'}}>策略:</span>
                                                    {task.mushroom.save ? (
                                                        <div style={{display: 'flex', alignItems: 'center', gap: 5}}>
                                                            <span
                                                                style={{
                                                                    color: '#2e7d32',
                                                                    fontWeight: 'bold'
                                                                }}>✅ 救助</span>
                                                            {TOOL_INFO[task.mushroom.special] && (
                                                                <div style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 3,
                                                                    background: '#f1f8e9',
                                                                    padding: '1px 6px',
                                                                    borderRadius: 10,
                                                                    border: '1px solid #c8e6c9',
                                                                    fontSize: 11
                                                                }}>
                                                                    <MiniImg src={TOOL_INFO[task.mushroom.special].img}
                                                                             size={14} circle/>
                                                                    <span
                                                                        style={{color: '#33691e'}}>{TOOL_INFO[task.mushroom.special].name}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (<span style={{
                                                        color: '#c62828',
                                                        fontWeight: 'bold'
                                                    }}>❌ 不救 (变异)</span>)}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </CollapsibleSection>
        );
    };

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

                {batches.length === 0 && completedBatches.length === 0 ? (
                    <div style={{textAlign: 'center', padding: 40, color: '#aaa'}}>
                        <div style={{fontSize: 40, marginBottom: 10}}>🎉</div>
                        需求满足</div>
                ) : (
                    <div style={{display: 'flex', flexDirection: 'column', gap: 30}}>
                        {/* 活跃的批次 */}
                        {showSplitLayout ? (
                            <>
                                {dayBatches.length > 0 && (
                                    <div style={{
                                        background: '#fff8e1',
                                        padding: 15,
                                        borderRadius: 8,
                                        border: '1px solid #ffecb3'
                                    }}>
                                        <h3 style={{
                                            marginTop: 0,
                                            color: '#f57f17',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8
                                        }}>☀️ 白天场 <span style={{
                                            fontSize: 13,
                                            fontWeight: 'normal',
                                            color: '#888'
                                        }}>(含时间任意的批次)</span></h3>
                                        {dayBatches.map((batch, i) => renderBatch(batch, i, batch.env.time === '任意', false))}
                                    </div>
                                )}

                                {nightBatches.length > 0 && (
                                    <div style={{
                                        background: '#e8eaf6',
                                        padding: 15,
                                        borderRadius: 8,
                                        border: '1px solid #c5cae9'
                                    }}>
                                        <h3 style={{
                                            marginTop: 0,
                                            color: '#3949ab',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8
                                        }}>🌙 夜晚场 <span style={{
                                            fontSize: 13,
                                            fontWeight: 'normal',
                                            color: '#888'
                                        }}>(含时间任意的批次)</span></h3>
                                        {nightBatches.map((batch, i) => renderBatch(batch, i, batch.env.time === '任意', false))}
                                    </div>
                                )}
                            </>
                        ) : (
                            batches.length > 0 && (() => {
                                const config = getSinglePanelConfig();
                                return (
                                    <div style={{
                                        background: config.bg,
                                        padding: 15,
                                        borderRadius: 8,
                                        border: `1px solid ${config.border}`
                                    }}>
                                        <h3 style={{
                                            marginTop: 0,
                                            color: config.titleColor,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8
                                        }}>{config.title} <span style={{
                                            fontSize: 13,
                                            fontWeight: 'normal',
                                            color: '#888'
                                        }}>{config.sub}</span></h3>
                                        {batches.map((batch, i) => renderBatch(batch, i, batch.env.time === '任意', false))}
                                    </div>
                                );
                            })()
                        )}

                        {/* 已完成的批次 (移到最后) */}
                        {completedBatches.length > 0 && (
                            <div style={{
                                background: '#f5f5f5',
                                padding: 15,
                                borderRadius: 8,
                                border: '1px solid #ddd',
                                marginTop: 10
                            }}>
                                <h3 style={{
                                    marginTop: 0,
                                    color: '#666',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8
                                }}>🏁 已完成的批次</h3>
                                {completedBatches.map((batch, i) => renderBatch(batch, i, false, true))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};