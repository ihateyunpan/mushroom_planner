import React from 'react';
import type { Profile } from '../types';
import { btnStyle } from './Common';

interface HeaderProps {
    onExport: () => void;
    onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
    profiles: Profile[];
    activeProfileId: string;
    onSwitchProfile: (id: string) => void;
    onAddProfile: () => void;
    onDeleteProfile: (id: string) => void;
    onRenameProfile: (id: string, newName: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
                                                  onExport,
                                                  onImport,
                                                  profiles,
                                                  activeProfileId,
                                                  onSwitchProfile,
                                                  onAddProfile,
                                                  onDeleteProfile,
                                                  onRenameProfile
                                              }) => (
    <div className="app-header">
        <div className="header-title-group">
            <div className="header-emoji" style={{fontSize: 40}}><img src={"/logo.webp"} width="70px" alt="logo"/>
            </div>
            <div>
                <h1 style={{margin: 0, fontSize: '1.5rem'}}>养菌助手</h1>
                <div style={{fontSize: 12, color: '#888'}}>贴心规划您的养菌计划</div>
            </div>
        </div>

        {/* 修改：将 flexDirection 改为 row (默认)，增加 wrap 以适应小屏幕 */}
        <div style={{display: 'flex', flexWrap: 'wrap', gap: 15, alignItems: 'center', justifyContent: 'flex-end'}}>
            {/* 存档管理区域 */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: '#f9f9f9',
                padding: '5px 10px',
                borderRadius: 6,
                border: '1px solid #eee'
            }}>
                <span style={{fontSize: 12, color: '#666'}}>📂 存档:</span>
                <select
                    value={activeProfileId}
                    onChange={(e) => onSwitchProfile(e.target.value)}
                    style={{
                        padding: '4px',
                        borderRadius: 4,
                        border: '1px solid #ccc',
                        fontSize: 13,
                        maxWidth: 150
                    }}
                >
                    {profiles.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>

                <button
                    onClick={() => {
                        const current = profiles.find(p => p.id === activeProfileId);
                        if (current) {
                            const newName = prompt("重命名存档:", current.name);
                            if (newName && newName.trim()) onRenameProfile(current.id, newName.trim());
                        }
                    }}
                    title="重命名当前存档"
                    style={{...btnStyle, padding: '4px 8px'}}
                >✏️
                </button>

                <button
                    onClick={onAddProfile}
                    title="新建存档"
                    style={{...btnStyle, padding: '4px 8px', color: '#2e7d32', borderColor: '#a5d6a7'}}
                >➕
                </button>

                {profiles.length > 1 && (
                    <button
                        onClick={() => {
                            if (confirm("确定要删除当前存档吗？此操作无法恢复。")) onDeleteProfile(activeProfileId);
                        }}
                        title="删除当前存档"
                        style={{...btnStyle, padding: '4px 8px', color: '#c62828', borderColor: '#ef9a9a'}}
                    >🗑️</button>
                )}
            </div>

            {/* 导入/导出按钮 */}
            <div className="header-actions">
                <button onClick={onExport} style={btnStyle}>📤 备份全存档</button>
                <label style={btnStyle}>
                    📥 恢复备份
                    <input type="file" onChange={onImport} accept=".json,application/json"
                           onClick={(e) => (e.currentTarget.value = '')} style={{display: 'none'}}/>
                </label>
            </div>
        </div>
    </div>
);