// src/App.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { MUSHROOM_DB } from './database';
import type { PlanTask } from './logic';
import { calculateOptimalRoute } from './logic';
import type { MushroomDef, UserSaveData } from './types';
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

const STORAGE_KEY = 'MUSHROOM_HELPER_DATA_V1';
const TAB_STORAGE_KEY = 'MUSHROOM_HELPER_ACTIVE_TAB'; // 新增：Tab状态的存储键

function App() {
    // --- State ---
    const [data, setData] = useState<UserSaveData>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) return {...SAFE_INITIAL_DATA, ...JSON.parse(saved)};
        } catch (e) {
            console.error(e);
        }
        return SAFE_INITIAL_DATA;
    });

    // 修改：初始化时从 LocalStorage 读取 activeTab
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

    // 数据持久化 Effect
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error(e);
        }
    }, [data]);

    // 新增：Tab 状态持久化 Effect
    useEffect(() => {
        try {
            localStorage.setItem(TAB_STORAGE_KEY, activeTab);
        } catch (e) {
            console.error(e);
        }
    }, [activeTab]);

    // --- Computed ---
    const relevantMushrooms = useMemo(() => {
        const ids = new Set<string>();
        data.orders.forEach(o => o.items.forEach(i => ids.add(i.mushroomId)));
        return Array.from(ids).map(id => MUSHROOM_DB.find(m => m.id === id)).filter((m): m is MushroomDef => !!m).sort((a, b) => a.id.localeCompare(b.id));
    }, [data.orders]);

    const calculationResult = useMemo(() => calculateOptimalRoute(data), [data, planVersion]);

    // --- Handlers ---
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

    // 处理单项完成 (只更新库存，不处理整批逻辑)
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
                if (!json || !Array.isArray(json.orders)) throw new Error('格式无效');
                setData(() => ({...SAFE_INITIAL_DATA, ...json}));
                alert('✅ 存档导入成功！');
            } catch (err: unknown) {
                alert(`❌ 导入失败: ${(err as Error).message}`);
            }
        };
        reader.onerror = () => alert('❌ 文件读取错误');
        reader.readAsText(file);
    };

    const handleExport = () => {
        const blob = new Blob([JSON.stringify(data)], {type: 'application/json'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'mushroom_save.json';
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

        if (isEditing) {
            n.add(oid);
        } else {
            n.delete(oid);
        }

        return n;
    });
    const deleteOrder = (oid: string) => {
        if (confirm('删除此订单?')) setData(p => ({...p, orders: p.orders.filter(o => o.id !== oid)}));
    };
    const toggleOrderActive = (oid: string) => setData(p => ({
        ...p,
        orders: p.orders.map(o => o.id === oid ? {...o, active: !o.active} : o)
    }));

    return (
        <div className="app-container">
            <Header onExport={handleExport} onImport={handleImport}/>

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