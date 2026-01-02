// src/components/Common.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MUSHROOM_CHILDREN, MUSHROOM_DB } from '../database';
import type { MushroomDef } from '../types';
import { SpecialConditions } from '../types';
import { getChildImg, getMushroomImg, TOOL_INFO } from '../utils';

// --- 样式常量 ---
export const btnStyle = {
    padding: '6px 12px', cursor: 'pointer', border: '1px solid #ccc',
    background: '#fff', borderRadius: 4, fontSize: 13, display: 'flex', alignItems: 'center', gap: 4
};
export const labelStyle = {fontSize: 12, color: '#999', marginBottom: 4};
export const tagContainerStyle = {display: 'flex', flexWrap: 'wrap' as const, gap: 5};

// --- 辅助函数 ---
export const getSpecialStyle = (special: string) => {
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

// --- 基础组件 ---

export const MiniImg: React.FC<{
    src: string;
    label?: string;
    size?: number;
    color?: string;
    circle?: boolean;
    onClick?: () => void
}> = ({
          src,
          label,
          size = 32,
          color = '#f5f5f5',
          circle = false,
          onClick
      }) => (
    <div title={label} onClick={onClick} style={{
        width: size, height: size, background: color,
        borderRadius: circle ? '50%' : 4,
        cursor: onClick ? 'pointer' : 'default',
        overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '1px solid #ddd', flexShrink: 0, position: 'relative'
    }}>
        <img src={src} alt={label} style={{width: '100%', height: '100%', objectFit: 'contain'}}
             onError={(e) => {
                 e.currentTarget.style.display = 'none';
                 e.currentTarget.parentElement!.innerText = label?.[0] || '?';
             }}
        />
    </div>
);

export const CollapsibleSection: React.FC<{
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
            <div onClick={() => setIsOpen(!isOpen)} style={{
                padding: '10px 15px', background: headerBg, display: 'flex',
                justifyContent: 'space-between', alignItems: 'center', gap: 10,
                borderRadius: isOpen ? '8px 8px 0 0' : '8px', cursor: 'pointer'
            }}>
                <div style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontWeight: 'bold',
                    color: headerColor
                }}>
                    <span style={{
                        fontSize: 12,
                        transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: '0.2s'
                    }}>▶</span>
                    {title}
                </div>
                <div onClick={e => e.stopPropagation()}>{action}</div>
            </div>
            {isOpen && <div style={{padding: 15}}>{children}</div>}
        </div>
    );
};

export const EnvBadge: React.FC<{ label: string; value: string; icon: string }> = ({label, value, icon}) => (
    <div style={{display: 'flex', alignItems: 'center', gap: 5, fontSize: 13}}>
        <span>{icon}</span><span style={{color: '#888'}}>{label}:</span><strong
        style={{color: value === '任意' ? '#aaa' : '#333'}}>{value}</strong>
    </div>
);

export const ToggleTag: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({
                                                                                                 label,
                                                                                                 active,
                                                                                                 onClick
                                                                                             }) => (
    <div onClick={onClick} style={{
        padding: '4px 10px', borderRadius: 15, fontSize: 12, cursor: 'pointer',
        background: active ? '#4caf50' : '#f1f1f1', color: active ? '#fff' : '#666',
        border: active ? '1px solid #4caf50' : '1px solid #ddd', transition: 'all 0.2s'
    }}>
        {label}
    </div>
);

// --- 交互组件 ---

export const Popover: React.FC<{
    content: React.ReactNode;
    children: React.ReactNode;
    // 支持受控模式
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
}> = ({content, children, isOpen, onOpenChange}) => {
    // 内部状态（用于非受控模式）
    const [internalOpen, setInternalOpen] = useState(false);
    // 布局状态：包括位置和小三角偏移
    const [layout, setLayout] = useState({top: 0, left: 0, arrowOffset: 0});
    const triggerRef = useRef<HTMLDivElement>(null);

    const isControlled = isOpen !== undefined;
    const visible = isControlled ? isOpen : internalOpen;

    const updatePosition = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const scrollX = window.scrollX;
            const scrollY = window.scrollY;

            // 原始触发器中心点
            const centerX = rect.left + scrollX + rect.width / 2;

            // --- 修复溢出逻辑 ---
            // Popover 最小宽度约 260px，中心点往左延伸 130px。
            // 为了防止左侧贴边，设置最小中心点为 140px (130px + 10px 边距)。
            const minCenter = 140;

            // 计算修正后的中心点
            const clampedX = Math.max(minCenter, centerX);

            // 计算小三角的偏移量：使得它始终指向 Trigger 中心
            // 如果 clampedX > centerX，说明弹窗被强制向右移了，三角需要向左移（负值）以指回原处
            const arrowOffset = centerX - clampedX;

            setLayout({
                top: rect.top + scrollY - 8,
                left: clampedX,
                arrowOffset
            });
        }
    };

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        const nextState = !visible;

        if (nextState) {
            updatePosition();
        }

        if (isControlled) {
            onOpenChange?.(nextState);
        } else {
            setInternalOpen(nextState);
        }
    };

    // 当可见性变化时重新计算位置 (解决列表滚动或受控切换时的位置问题)
    useEffect(() => {
        if (visible) updatePosition();
    }, [visible]);

    useEffect(() => {
        const handleClickOutside = () => {
            if (visible) {
                if (isControlled) onOpenChange?.(false);
                else setInternalOpen(false);
            }
        };
        if (visible) window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, [visible, isControlled, onOpenChange]);

    return (
        <>
            <div ref={triggerRef} onClick={handleToggle} style={{cursor: 'pointer', display: 'inline-block'}}>
                {children}
            </div>
            {visible && createPortal(
                <div onClick={(e) => e.stopPropagation()} style={{
                    position: 'absolute',
                    top: layout.top,
                    left: layout.left,
                    transform: 'translate(-50%, -100%)', // 自身向上平移100%，居中
                    zIndex: 9999,
                    minWidth: 260,
                    background: '#fff',
                    borderRadius: 8,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                    border: '1px solid #ebebeb',
                    padding: 10,
                    pointerEvents: 'auto'
                }}>
                    {content}
                    {/* 小三角：位置动态调整 */}
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: `calc(50% + ${layout.arrowOffset}px)`, // 核心修正：加上偏移量
                        marginLeft: -6,
                        borderWidth: 6,
                        borderStyle: 'solid',
                        borderColor: '#fff transparent transparent transparent'
                    }}/>
                </div>,
                document.body
            )}
        </>
    );
};

export const MushroomInfoCard: React.FC<{ m: MushroomDef }> = ({m}) => {
    return (
        <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
            <div style={{display: 'flex', gap: 10, borderBottom: '1px dashed #eee', paddingBottom: 8}}>
                <MiniImg src={getMushroomImg(m.id)} label={m.name} size={40}/>
                <div>
                    <div style={{fontWeight: 'bold', fontSize: 14}}>{m.name}</div>
                    <div style={{fontSize: 11, color: '#999'}}>ID: {m.id}</div>
                </div>
            </div>
            <div style={{fontSize: 12, display: 'flex', flexDirection: 'column', gap: 5}}>
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
                        return (
                            <div style={{
                                marginTop: 4,
                                background: style.bg,
                                padding: '6px 8px',
                                borderRadius: 6,
                                border: `1px solid ${style.border}`,
                                display: 'flex', flexDirection: 'column', gap: 4
                            }}>
                                <div style={{
                                    color: style.color, fontWeight: 'bold',
                                    display: 'flex', alignItems: 'center', gap: 4
                                }}>
                                    <span>{style.icon}</span>{m.special}
                                </div>
                                {m.save ? (
                                    <div style={{display: 'flex', alignItems: 'center', gap: 4}}>
                                        <span style={{color: '#2e7d32', fontWeight: 'bold'}}>✅ 救助</span>
                                        {TOOL_INFO[m.special] && (
                                            <div style={{
                                                display: 'flex', alignItems: 'center', gap: 2,
                                                background: '#fff', padding: '1px 5px', borderRadius: 4,
                                                border: '1px solid rgba(0,0,0,0.1)'
                                            }}>
                                                <MiniImg src={TOOL_INFO[m.special].img} size={14} circle/>
                                                <span style={{color: '#333'}}>{TOOL_INFO[m.special].name}</span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <span style={{color: '#c62828', fontWeight: 'bold'}}>❌ 不救 (变异)</span>
                                )}
                            </div>
                        );
                    })()
                )}
            </div>
        </div>
    );
};

export const MushroomSelector: React.FC<{ onSelect: (id: string) => void }> = ({onSelect}) => {
    const [term, setTerm] = useState('');
    const results = useMemo(() => {
        if (!term) return [];
        const lower = term.toLowerCase().trim();
        return MUSHROOM_DB.filter(m => m.name.includes(lower) || m.pinyin.includes(lower)).slice(0, 20);
    }, [term]);

    return (
        <div style={{position: 'relative', width: '100%', zIndex: 10, marginTop: 10}}>
            <input placeholder="🔍 添加菌种：搜名或拼音首字母 (如: wnz)" value={term}
                   onChange={e => setTerm(e.target.value)}
                   style={{
                       width: '100%',
                       padding: '8px',
                       boxSizing: 'border-box',
                       border: '1px solid #ccc',
                       borderRadius: 4,
                       background: '#f9f9f9'
                   }}
            />
            {term && (
                <div style={{
                    maxHeight: 200,
                    overflowY: 'auto',
                    border: '1px solid #ddd',
                    background: '#fff',
                    position: 'absolute',
                    width: '100%',
                    top: '100%',
                    zIndex: 1000,
                    boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                    borderRadius: 4
                }}>
                    {results.map(m => (
                        <div key={m.id} onClick={() => {
                            onSelect(m.id);
                            setTerm('');
                        }} style={{
                            padding: '8px 10px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #f5f5f5',
                            display: 'flex',
                            gap: 10,
                            alignItems: 'center'
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