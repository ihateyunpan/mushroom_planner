// src/App.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { MUSHROOM_DB } from './database';
import { calculateOptimalRoute, type PlanTask } from './logic';
import type { GlobalStorage, MushroomDef, UserSaveData } from './types';
import { Humidifiers, Lights, Woods } from './types';
import './App.css';

// 引入拆分后的组件
import { Header } from './components/Header';
import { Encyclopedia } from './components/Encyclopedia';
import { EquipmentPanel } from './components/EquipmentPanel';
import { InventoryPanel } from './components/InventoryPanel';
import { OrderPanel } from './components/OrderPanel';
import { PlanPanel } from './components/PlanPanel';

const SAFE_INITIAL_DATA: UserSaveData = {
    orders: [],
    inventory: {},
    unlockedWoods: Object.values(Woods).slice(0, 1),
    unlockedLights: Object.values(Lights).slice(0, 1),
    unlockedHumidifiers: Object.values(Humidifiers).slice(0, 1),
};

const OLD_STORAGE_KEY = 'MUSHROOM_HELPER_DATA_V1';
const STORAGE_KEY = 'MUSHROOM_HELPER_GLOBAL_V2'; // 升级存储 Key
const TAB_STORAGE_KEY = 'MUSHROOM_HELPER_ACTIVE_TAB';

function App() {
    // --- Global State ---
    const [globalData, setGlobalData] = useState<GlobalStorage>(() => {
        try {
            // 1. 尝试读取新版多存档数据
            const savedGlobal = localStorage.getItem(STORAGE_KEY);
            if (savedGlobal) {
                return JSON.parse(savedGlobal);
            }

            // 2. 尝试读取旧版单存档数据并迁移
            const savedOld = localStorage.getItem(OLD_STORAGE_KEY);
            if (savedOld) {
                const oldData = JSON.parse(savedOld);
                return {
                    activeProfileId: 'default',
                    profiles: [{id: 'default', name: '默认存档', data: {...SAFE_INITIAL_DATA, ...oldData}}]
                };
            }
        } catch (e) {
            console.error("Load failed", e);
        }
        // 3. 默认初始化
        return {
            activeProfileId: 'default',
            profiles: [{id: 'default', name: '默认存档', data: SAFE_INITIAL_DATA}]
        };
    });

    const [activeTab, setActiveTab] = useState<'calculator' | 'encyclopedia'>(() => {
        try {
            const savedTab = localStorage.getItem(TAB_STORAGE_KEY);
            return (savedTab === 'encyclopedia' || savedTab === 'calculator') ? savedTab : 'calculator';
        } catch {
            return 'calculator';
        }
    });

    const [newOrderName, setNewOrderName] = useState('');
    const [planVersion, setPlanVersion] = useState(0);
    const [editingOrderIds, setEditingOrderIds] = useState<Set<string>>(new Set());

    // --- Persistence ---
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(globalData));
        } catch (e) {
            console.error(e);
        }
    }, [globalData]);

    useEffect(() => {
        try {
            localStorage.setItem(TAB_STORAGE_KEY, activeTab);
        } catch (e) {
            console.error(e);
        }
    }, [activeTab]);

    // --- Data Proxy ---
    // 获取当前激活的 Profile 数据
    const currentProfile = globalData.profiles.find(p => p.id === globalData.activeProfileId) || globalData.profiles[0];
    const data = currentProfile.data;

    // 封装 setData，使其只更新当前激活的 Profile
    const setData = (action: React.SetStateAction<UserSaveData>) => {
        setGlobalData(prev => {
            const activeId = prev.activeProfileId;
            // 计算新数据
            const currentData = prev.profiles.find(p => p.id === activeId)?.data || SAFE_INITIAL_DATA;
            const newData = action instanceof Function ? action(currentData) : action;

            return {
                ...prev,
                profiles: prev.profiles.map(p => p.id === activeId ? {...p, data: newData} : p)
            };
        });
    };

    // --- Profile Handlers ---
    const handleAddProfile = () => {
        const newId = Date.now().toString();
        const newProfile = {
            id: newId,
            name: `新存档 ${globalData.profiles.length + 1}`,
            data: SAFE_INITIAL_DATA
        };
        setGlobalData(prev => ({
            activeProfileId: newId,
            profiles: [...prev.profiles, newProfile]
        }));
    };

    const handleDeleteProfile = (id: string) => {
        if (globalData.profiles.length <= 1) return; // 至少保留一个
        setGlobalData(prev => {
            const newProfiles = prev.profiles.filter(p => p.id !== id);
            let newActiveId = prev.activeProfileId;
            if (prev.activeProfileId === id) {
                newActiveId = newProfiles[0].id;
            }
            return {
                activeProfileId: newActiveId,
                profiles: newProfiles
            };
        });
    };

    const handleSwitchProfile = (id: string) => {
        setGlobalData(prev => ({...prev, activeProfileId: id}));
        // 切换存档后重置一些 UI 状态
        setEditingOrderIds(new Set());
    };

    const handleRenameProfile = (id: string, newName: string) => {
        setGlobalData(prev => ({
            ...prev,
            profiles: prev.profiles.map(p => p.id === id ? {...p, name: newName} : p)
        }));
    };

    // --- Existing Handlers (using proxy setData) ---
    const updateInventory = (id: string, count: number) => setData(p => ({
        ...p,
        inventory: {...p.inventory, [id]: Math.max(0, count)}
    }));

    const toggleEquipment = (type: 'wood' | 'light' | 'humidifier', value: string) => {
        setData(prev => {
            const mapKey = type === 'wood' ? 'unlockedWoods' : type === 'light' ? 'unlockedLights' : 'unlockedHumidifiers';
            const list = prev[mapKey] as string[];
            if (list.includes(value)) return {...prev, [mapKey]: list.filter(x => x !== value)};
            return {...prev, [mapKey]: [...list, value]};
        });
    };

    const handleCompleteTask = (task: PlanTask) => {
        if (window.confirm(`确认收取 ${task.countNeeded} 个 ${task.mushroom.name} 吗？\n\n(确认后将更新库存，该任务将因需求满足而从计划中移除)`)) {
            setData(prev => {
                const newInventory = {...prev.inventory};
                const current = newInventory[task.mushroom.id] || 0;
                newInventory[task.mushroom.id] = current + task.countNeeded;
                return {...prev, inventory: newInventory};
            });
        }
    };

    // Import/Export Logic Updates
    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const json = JSON.parse(ev.target?.result as string);

                // 检查导入的是否是多存档格式
                if (json.profiles && Array.isArray(json.profiles)) {
                    setGlobalData(json);
                    alert(`✅ 成功导入 ${json.profiles.length} 个存档！`);
                }
                // 兼容旧版单存档格式导入
                else if (json.orders && Array.isArray(json.orders)) {
                    if (confirm("检测到旧版单存档文件。是否将其添加为一个新存档？\n(取消则不导入)")) {
                        const newId = Date.now().toString();
                        setGlobalData(prev => ({
                            activeProfileId: newId,
                            profiles: [...prev.profiles, {
                                id: newId,
                                name: '导入的旧存档',
                                data: {...SAFE_INITIAL_DATA, ...json}
                            }]
                        }));
                        alert('✅ 旧存档已添加！');
                    }
                } else {
                    throw new Error('格式无效');
                }
            } catch (err: unknown) {
                alert(`❌ 导入失败: ${(err as Error).message}`);
            }
        };
        reader.onerror = () => alert('❌ 文件读取错误');
        reader.readAsText(file);
    };

    const handleExport = () => {
        // 导出整个 globalData
        const blob = new Blob([JSON.stringify(globalData)], {type: 'application/json'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        // 文件名包含当前日期
        const date = new Date().toISOString().split('T')[0];
        a.download = `mushroom_helper_backup_${date}.json`;
        a.click();
    };

    // Order Handlers
    const addOrder = () => {
        if (!newOrderName.trim()) return;
        const newId = Date.now().toString();
        setData(p => ({...p, orders: [...p.orders, {id: newId, name: newOrderName, items: [], active: true}]}));
        setNewOrderName('');
        setEditingOrderIds(p => new Set(p).add(newId));
    };
    const addItemToOrder = (oid: string, mid: string) => setData(p => ({
        ...p,
        orders: p.orders.map(o => o.id === oid ? {
            ...o,
            items: o.items.some(i => i.mushroomId === mid) ? o.items.map(i => i.mushroomId === mid ? {
                ...i,
                count: i.count + 1
            } : i) : [...o.items, {mushroomId: mid, count: 1}]
        } : o)
    }));
    const updateItemCount = (oid: string, mid: string, count: number) => setData(p => ({
        ...p,
        orders: p.orders.map(o => o.id === oid ? {
            ...o,
            items: o.items.map(i => i.mushroomId === mid ? {...i, count: Math.max(0, count)} : i)
        } : o)
    }));
    const removeItemFromOrder = (oid: string, mid: string) => setData(p => ({
        ...p,
        orders: p.orders.map(o => o.id === oid ? {...o, items: o.items.filter(i => i.mushroomId !== mid)} : o)
    }));
    const toggleOrderEdit = (oid: string, isEditing: boolean) => setEditingOrderIds(p => {
        const n = new Set(p);
        if (isEditing) n.add(oid);
        else n.delete(oid);
        return n;
    });
    const deleteOrder = (oid: string) => {
        if (confirm('删除此订单?')) setData(p => ({...p, orders: p.orders.filter(o => o.id !== oid)}));
    };
    const toggleOrderActive = (oid: string) => setData(p => ({
        ...p,
        orders: p.orders.map(o => o.id === oid ? {...o, active: !o.active} : o)
    }));

    // --- Computed ---
    const relevantMushrooms = useMemo(() => {
        const ids = new Set<string>();
        data.orders.forEach(o => o.items.forEach(i => ids.add(i.mushroomId)));
        return Array.from(ids).map(id => MUSHROOM_DB.find(m => m.id === id)).filter((m): m is MushroomDef => !!m).sort((a, b) => a.id.localeCompare(b.id));
    }, [data.orders]);

    const calculationResult = useMemo(() => calculateOptimalRoute(data), [data, planVersion]);

    return (
        <div className="app-container">
            <Header
                onExport={handleExport}
                onImport={handleImport}
                profiles={globalData.profiles}
                activeProfileId={globalData.activeProfileId}
                onSwitchProfile={handleSwitchProfile}
                onAddProfile={handleAddProfile}
                onDeleteProfile={handleDeleteProfile}
                onRenameProfile={handleRenameProfile}
            />

            <div style={{
                display: 'flex',
                gap: 10,
                marginBottom: 20,
                padding: '5px',
                background: '#f5f5f5',
                borderRadius: 8,
                width: 'fit-content'
            }}>
                <button onClick={() => setActiveTab('calculator')} style={{
                    padding: '8px 20px',
                    borderRadius: 6,
                    border: 'none',
                    cursor: 'pointer',
                    background: activeTab === 'calculator' ? '#fff' : 'transparent',
                    fontWeight: activeTab === 'calculator' ? 'bold' : 'normal',
                    color: activeTab === 'calculator' ? '#1976d2' : '#666'
                }}>🧮 培育计算器
                </button>
                <button onClick={() => setActiveTab('encyclopedia')} style={{
                    padding: '8px 20px',
                    borderRadius: 6,
                    border: 'none',
                    cursor: 'pointer',
                    background: activeTab === 'encyclopedia' ? '#fff' : 'transparent',
                    fontWeight: activeTab === 'encyclopedia' ? 'bold' : 'normal',
                    color: activeTab === 'encyclopedia' ? '#e65100' : '#666'
                }}>📖 菌种图鉴
                </button>
            </div>

            {activeTab === 'encyclopedia' ? <Encyclopedia/> : (
                <div className="main-layout">
                    <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
                        <EquipmentPanel unlockedWoods={data.unlockedWoods} unlockedLights={data.unlockedLights}
                                        unlockedHumidifiers={data.unlockedHumidifiers} onToggle={toggleEquipment}/>
                        <InventoryPanel inventory={data.inventory} relevantMushrooms={relevantMushrooms}
                                        onUpdate={updateInventory}/>
                        <OrderPanel
                            orders={data.orders} newOrderName={newOrderName} onNewOrderNameChange={setNewOrderName}
                            onAddOrder={addOrder}
                            editingOrderIds={editingOrderIds} onToggleEdit={toggleOrderEdit} onDeleteOrder={deleteOrder}
                            onToggleActive={toggleOrderActive}
                            onAddItem={addItemToOrder} onUpdateItemCount={updateItemCount}
                            onRemoveItem={removeItemFromOrder}
                        />
                    </div>
                    <PlanPanel
                        plan={calculationResult}
                        onCompleteTask={handleCompleteTask}
                        onRefresh={() => setPlanVersion(v => v + 1)}
                    />
                </div>
            )}
        </div>
    );
}

export default App;