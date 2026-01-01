// src/components/Common.tsx
import React, { useMemo, useState } from 'react';
import { MUSHROOM_DB } from '../database';
import { getMushroomImg } from '../utils';

// --- 样式常量 ---
export const btnStyle = {
    padding: '6px 12px', cursor: 'pointer', border: '1px solid #ccc',
    background: '#fff', borderRadius: 4, fontSize: 13, display: 'flex', alignItems: 'center', gap: 4
};
export const labelStyle = {fontSize: 12, color: '#999', marginBottom: 4};
export const tagContainerStyle = {display: 'flex', flexWrap: 'wrap' as const, gap: 5};

// --- 基础组件 ---

export const MiniImg: React.FC<{ src: string; label?: string; size?: number; color?: string; circle?: boolean }> = ({
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
    <div style={{display: 'flex', alignItems: 'center', gap: 5}}>
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

export const MushroomSelector: React.FC<{ onSelect: (id: string) => void }> = ({onSelect}) => {
    const [term, setTerm] = useState('');
    const results = useMemo(() => {
        if (!term) return [];
        const lower = term.toLowerCase().trim();
        return MUSHROOM_DB.filter(m => m.name.includes(lower) || m.pinyin.includes(lower)).slice(0, 20);
    }, [term]);

    return (
        <div style={{position: 'relative', width: '100%', zIndex: 10, marginTop: 10}}>
            <input placeholder="🔍 添加菌种：搜名或拼音 (如: wnz)" value={term} onChange={e => setTerm(e.target.value)}
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