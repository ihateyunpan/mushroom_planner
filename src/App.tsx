// src/App.tsx
import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { MUSHROOM_DB } from './database';
import { calculateOptimalRoute, type PlanTask } from './logic';
import type { GlobalStorage, MushroomDef, UserSaveData } from './types';
import { Humidifiers, Lights, Woods } from './types';
import './App.css';

// 引入拆分后的组件
import { Header } from './components/Header';
import { EquipmentPanel } from './components/EquipmentPanel';
import { InventoryPanel } from './components/InventoryPanel';
import { OrderPanel } from './components/OrderPanel';
import { PlanPanel } from './components/PlanPanel';

// --- 优化：Lazy Loading 图鉴组件 ---
// 只有切换到图鉴 Tab 时，才会加载这个组件的代码
const Encyclopedia = React.lazy(() =>
    import('./components/Encyclopedia').then(module => ({default: module.Encyclopedia}))
);

const SAFE_INITIAL_DATA: UserSaveData = {
    orders: [],
    inventory: {},
    unlockedWoods: Object.values(Woods).slice(0, 1),
    unlockedLights: Object.values(Lights).slice(0, 1),
    unlockedHumidifiers: Object.values(Humidifiers).slice(0, 1),
    collectedMushrooms: [],
};

const OLD_STORAGE_KEY = 'MUSHROOM_HELPER_DATA_V1';
const STORAGE_KEY = 'MUSHROOM_HELPER_GLOBAL_V2';
const TAB_STORAGE_KEY = 'MUSHROOM_HELPER_ACTIVE_TAB';

// --- 简单的 Loading 组件 ---
const LoadingSpinner = () => (
    <div style={{
        padding: '40px',
        textAlign: 'center',
        color: '#666',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px'
    }}>
        <div style={{fontSize: '24px'}}>🍄</div>
        <div>正在加载图鉴...</div>
    </div>
);

function App() {
    // --- Global State ---
    const [globalData, setGlobalData] = useState<GlobalStorage>(() => {
        try {
            const savedGlobal = localStorage.getItem(STORAGE_KEY);
            if (savedGlobal) {
                const parsed = JSON.parse(savedGlobal);
                parsed.profiles = parsed.profiles.map((p: any) => ({
                    ...p,
                    data: {...SAFE_INITIAL_DATA, ...p.data}
                }));
                return parsed;
            }

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
    const currentProfile = globalData.profiles.find(p => p.id === globalData.activeProfileId) || globalData.profiles[0];
    const data = currentProfile.data;

    const setData = (action: React.SetStateAction<UserSaveData>) => {
        setGlobalData(prev => {
            const activeId = prev.activeProfileId;
            const currentData = prev.profiles.find(p => p.id === activeId)?.data || SAFE_INITIAL_DATA;
            const newData = action instanceof Function ? action(currentData) : action;

            return {
                ...prev,
                profiles: prev.profiles.map(p => p.id === activeId ? {...p, data: newData} : p)
            };
        });
    };

    const toggleCollection = (id: string) => {
        setData(prev => {
            const list = prev.collectedMushrooms || [];
            if (list.includes(id)) {
                return {...prev, collectedMushrooms: list.filter(x => x !== id)};
            } else {
                return {...prev, collectedMushrooms: [...list, id]};
            }
        });
    };

    const handleBatchCollect = (ids: string[]) => {
        setData(prev => {
            const currentSet = new Set(prev.collectedMushrooms || []);
            let hasChange = false;
            ids.forEach(id => {
                if (!currentSet.has(id)) {
                    currentSet.add(id);
                    hasChange = true;
                }
            });
            if (!hasChange) return prev;
            return {...prev, collectedMushrooms: Array.from(currentSet)};
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
        if (globalData.profiles.length <= 1) return;
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
        setEditingOrderIds(new Set());
    };

    const handleRenameProfile = (id: string, newName: string) => {
        setGlobalData(prev => ({
            ...prev,
            profiles: prev.profiles.map(p => p.id === id ? {...p, name: newName} : p)
        }));
    };

    // --- Import/Export Handlers ---
    const handleExportCurrent = () => {
        const blob = new Blob([JSON.stringify(data)], {type: 'application/json'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `mushroom_profile_${currentProfile.name}.json`;
        a.click();
    };

    const handleImportSingle = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const json = JSON.parse(ev.target?.result as string);
                if (!json.orders || !json.inventory) {
                    throw new Error('文件格式不正确，缺少订单或库存数据');
                }
                const fileName = file.name.replace('.json', '');
                const userChoice = window.confirm(
                    `成功读取存档文件！\n\n【确定】-> 作为“新存档”导入\n【取消】-> 覆盖“当前存档”(${currentProfile.name})`
                );

                if (userChoice) {
                    const newId = Date.now().toString();
                    setGlobalData(prev => ({
                        activeProfileId: newId,
                        profiles: [...prev.profiles, {
                            id: newId,
                            name: `导入: ${fileName}`,
                            data: {...SAFE_INITIAL_DATA, ...json}
                        }]
                    }));
                    alert(`✅ 已新建存档: 导入: ${fileName}`);
                } else {
                    if (window.confirm(`⚠️ 警告：这将完全覆盖当前存档 "${currentProfile.name}" 的所有数据。\n是否继续？`)) {
                        setData({...SAFE_INITIAL_DATA, ...json});
                        alert('✅ 当前存档已更新');
                    }
                }
            } catch (err: unknown) {
                alert(`❌ 导入失败: ${(err as Error).message}`);
            }
        };
        reader.onerror = () => alert('❌ 文件读取错误');
        reader.readAsText(file);
    };

    const updateInventory = (id: string, count: number) => setData(p => ({
        ...p,
        inventory: {...p.inventory, [id]: Math.max(0, count)}
    }));

    const handleAddOne = (id: string) => {
        setData(p => ({
            ...p,
            inventory: {...p.inventory, [id]: (p.inventory[id] || 0) + 1}
        }));
    };

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

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const json = JSON.parse(ev.target?.result as string);
                if (json.profiles && Array.isArray(json.profiles)) {
                    json.profiles = json.profiles.map((p: any) => ({
                        ...p,
                        data: {...SAFE_INITIAL_DATA, ...p.data}
                    }));
                    setGlobalData(json);
                    alert(`✅ 成功恢复全量备份 (${json.profiles.length} 个存档)`);
                } else {
                    throw new Error('格式无效，请使用“恢复备份”功能导入全量备份文件，或使用上方的单存档导入功能。');
                }
            } catch (err: unknown) {
                alert(`❌ 导入失败: ${(err as Error).message}`);
            }
        };
        reader.onerror = () => alert('❌ 文件读取错误');
        reader.readAsText(file);
    };

    const handleExport = () => {
        const blob = new Blob([JSON.stringify(globalData)], {type: 'application/json'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        const date = new Date().toISOString().split('T')[0];
        a.download = `mushroom_helper_backup_${date}.json`;
        a.click();
    };

    const addOrder = () => {
        if (!newOrderName.trim()) return;
        const newId = Date.now().toString();
        setData(p => ({...p, orders: [{id: newId, name: newOrderName, items: [], active: true}, ...p.orders]}));
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
        if (confirm('确认删除此订单？(不会扣除库存)')) setData(p => ({
            ...p,
            orders: p.orders.filter(o => o.id !== oid)
        }));
    };
    const toggleOrderActive = (oid: string) => setData(p => ({
        ...p,
        orders: p.orders.map(o => o.id === oid ? {...o, active: !o.active} : o)
    }));

    const handleArchiveOrder = (oid: string) => {
        const order = data.orders.find(o => o.id === oid);
        if (!order) return;

        const deductions: string[] = [];
        let insufficient = false;
        order.items.forEach(item => {
            const current = data.inventory[item.mushroomId] || 0;
            const mushroomName = MUSHROOM_DB.find(m => m.id === item.mushroomId)?.name || item.mushroomId;
            deductions.push(`${mushroomName}: 扣除 ${item.count} (当前库存: ${current})`);
            if (current < item.count) insufficient = true;
        });

        const confirmMsg = `✅ 确认完成订单 "${order.name}" 吗？\n\n----------------------------\n${deductions.join('\n')}\n----------------------------\n` +
            (insufficient ? `\n⚠️ 警告：部分库存不足，扣除后库存将归零！\n` : `\n`) +
            `\n订单完成后将从列表中移除。`;

        if (window.confirm(confirmMsg)) {
            setData(prev => {
                const newInv = {...prev.inventory};
                order.items.forEach(item => {
                    const current = newInv[item.mushroomId] || 0;
                    newInv[item.mushroomId] = Math.max(0, current - item.count);
                });
                return {
                    ...prev,
                    inventory: newInv,
                    orders: prev.orders.filter(o => o.id !== oid)
                };
            });
        }
    };

    const relevantMushrooms = useMemo(() => {
        const ids = new Set<string>();
        data.orders.forEach(o => o.items.forEach(i => ids.add(i.mushroomId)));
        return Array.from(ids).map(id => MUSHROOM_DB.find(m => m.id === id)).filter((m): m is MushroomDef => !!m).sort((a, b) => a.id.localeCompare(b.id));
    }, [data.orders]);

    const activeDemandMap = useMemo(() => {
        const map = new Map<string, number>();
        data.orders.forEach(o => {
            if (!o.active) return;
            o.items.forEach(i => {
                map.set(i.mushroomId, (map.get(i.mushroomId) || 0) + i.count);
            });
        });
        return map;
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
                onExportCurrent={handleExportCurrent}
                onImportSingle={handleImportSingle}
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

            {/* 修改：使用 Suspense 包裹 lazy 组件 */}
            {activeTab === 'encyclopedia' ? (
                <Suspense fallback={<LoadingSpinner/>}>
                    <Encyclopedia
                        collectedIds={data.collectedMushrooms || []}
                        onToggleCollection={toggleCollection}
                        onBatchCollect={handleBatchCollect}
                        unlockedWoods={data.unlockedWoods}
                        unlockedLights={data.unlockedLights}
                        unlockedHumidifiers={data.unlockedHumidifiers}
                    />
                </Suspense>
            ) : (
                <div className="main-layout">
                    <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
                        <EquipmentPanel unlockedWoods={data.unlockedWoods} unlockedLights={data.unlockedLights}
                                        unlockedHumidifiers={data.unlockedHumidifiers} onToggle={toggleEquipment}/>
                        <InventoryPanel
                            inventory={data.inventory}
                            relevantMushrooms={relevantMushrooms}
                            activeDemandMap={activeDemandMap}
                            onUpdate={updateInventory}
                        />
                        <OrderPanel
                            orders={data.orders} newOrderName={newOrderName} onNewOrderNameChange={setNewOrderName}
                            onAddOrder={addOrder}
                            editingOrderIds={editingOrderIds} onToggleEdit={toggleOrderEdit} onDeleteOrder={deleteOrder}
                            onToggleActive={toggleOrderActive}
                            onArchiveOrder={handleArchiveOrder}
                            onAddItem={addItemToOrder} onUpdateItemCount={updateItemCount}
                            onRemoveItem={removeItemFromOrder}
                            unlockedWoods={data.unlockedWoods}
                            unlockedLights={data.unlockedLights}
                            unlockedHumidifiers={data.unlockedHumidifiers}
                            inventory={data.inventory}
                        />
                    </div>
                    <PlanPanel
                        plan={calculationResult}
                        onCompleteTask={handleCompleteTask}
                        onRefresh={() => setPlanVersion(v => v + 1)}
                        orders={data.orders}
                        inventory={data.inventory}
                        onAddOne={handleAddOne}
                    />
                </div>
            )}
        </div>
    );
}

export default App;