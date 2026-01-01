import React from 'react';
import { btnStyle } from './Common';

interface HeaderProps {
    onExport: () => void;
    onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const Header: React.FC<HeaderProps> = ({onExport, onImport}) => (
    <div className="app-header">
        <div className="header-title-group">
            <div className="header-emoji" style={{fontSize: 40}}><img src={"/logo.webp"} width="70px" alt="logo"/></div>
            <div>
                <h1 style={{margin: 0, fontSize: '1.5rem'}}>养菌助手</h1>
                <div style={{fontSize: 12, color: '#888'}}>贴心规划您的养菌计划</div>
            </div>
        </div>
        <div className="header-actions">
            <button onClick={onExport} style={btnStyle}>📤 导出</button>
            <label style={btnStyle}>
                📥 导入
                <input type="file" onChange={onImport} accept=".json,application/json"
                       onClick={(e) => (e.currentTarget.value = '')} style={{display: 'none'}}/>
            </label>
        </div>
    </div>
);