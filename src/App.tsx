// src/App.tsx
import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { CORRECTED_NAMES, MUSHROOM_DB } from './database';
import { calculateOptimalRoute, type PlanTask } from './logic';
import type {
    ActionRecord,
    FilterIntent,
    GlobalStorage,
    HumidifierType,
    ImportRecord,
    LightType,
    MushroomDef,
    Order,
    UserSaveData,
    WoodType
} from './types';
import { Humidifiers, Lights, VIRTUAL_ORDER_ID, Woods } from './types';
import './App.css';

// 引入拆分后的组件
import { Header } from './components/Header';
import { EquipmentPanel } from './components/EquipmentPanel';
import { InventoryPanel } from './components/InventoryPanel';
import { OrderPanel } from './components/OrderPanel';
import { PlanPanel } from './components/PlanPanel';
import { RECENT_ID_COUNT } from "./utils.ts";

// --- 优化：Lazy Loading 图鉴组件 ---
const Encyclopedia = React.lazy(() =>
    import('./components/Encyclopedia').then(module => ({ default: module.Encyclopedia }))
);

// 1. 修改 SAFE_INITIAL_DATA，明确添加历史记录字段
const SAFE_INITIAL_DATA: UserSaveData = {
    orders: [],
    inventory: {},
    unlockedWoods: Object.values(Woods).slice(0, 1),
    unlockedLights: Object.values(Lights).slice(0, 1),
    unlockedHumidifiers: Object.values(Humidifiers).slice(0, 1),
    collectedMushrooms: [],
    growing: {},
    actionHistory: [], // V5 新增：操作历史
    importHistory: []  // V5 新增：导入历史
};

const OLD_STORAGE_KEY = 'MUSHROOM_HELPER_DATA_V1';
const V2_STORAGE_KEY = 'MUSHROOM_HELPER_GLOBAL_V2';
const V3_STORAGE_KEY = 'MUSHROOM_HELPER_GLOBAL_V3';
const V4_STORAGE_KEY = 'MUSHROOM_HELPER_GLOBAL_V4'; // 保留 V4 Key 用于迁移
const STORAGE_KEY = 'MUSHROOM_HELPER_GLOBAL_V5';    // 升级为 V5
const TAB_STORAGE_KEY = 'MUSHROOM_HELPER_ACTIVE_TAB';
const ENC_ORDER_ACTIVE_KEY = 'MUSHROOM_HELPER_ENC_ORDER_ACTIVE';

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
        <div style={{ fontSize: '24px' }}>🍄</div>
        <div>正在加载图鉴...</div>
    </div>
);

function App() {
    // --- Global State ---
    const [globalData, setGlobalData] = useState<GlobalStorage>(() => {
        try {
            // 1. 尝试读取 V5 (最新版)
            const savedGlobal = localStorage.getItem(STORAGE_KEY);
            if (savedGlobal) {
                const parsed = JSON.parse(savedGlobal);
                parsed.profiles = parsed.profiles.map((p: any) => ({
                    ...p,
                    data: {
                        ...SAFE_INITIAL_DATA, // 兜底默认值
                        ...p.data,
                        // 再次确保字段存在 (防御性编程)
                        growing: p.data.growing || {},
                        actionHistory: p.data.actionHistory || [],
                        importHistory: p.data.importHistory || []
                    }
                }));
                if (!parsed.recentIds) parsed.recentIds = [];
                return parsed;
            }

            // 2. 向后兼容 V4 -> V5
            const savedV4 = localStorage.getItem(V4_STORAGE_KEY);
            if (savedV4) {
                const parsed = JSON.parse(savedV4);
                parsed.profiles = parsed.profiles.map((p: any) => ({
                    ...p,
                    data: {
                        ...SAFE_INITIAL_DATA,
                        ...p.data,
                        // V4 已有 growing，直接保留
                        // V4 没有 history，初始化为空数组
                        actionHistory: [],
                        importHistory: []
                    }
                }));
                // V4 已有 recentIds
                return { ...parsed, recentIds: parsed.recentIds || [] };
            }

            // 3. 向后兼容 V3 -> V5
            const savedV3 = localStorage.getItem(V3_STORAGE_KEY);
            if (savedV3) {
                const parsed = JSON.parse(savedV3);
                parsed.profiles = parsed.profiles.map((p: any) => ({
                    ...p,
                    data: {
                        ...SAFE_INITIAL_DATA,
                        ...p.data,
                        growing: {},       // V3 无 growing
                        actionHistory: [], // V3 无 history
                        importHistory: []
                    }
                }));
                return { ...parsed, recentIds: parsed.recentIds || [] };
            }

            // 4. 向后兼容 V2 -> V5
            const savedV2 = localStorage.getItem(V2_STORAGE_KEY);
            if (savedV2) {
                const parsed = JSON.parse(savedV2);
                parsed.profiles = parsed.profiles.map((p: any) => ({
                    ...p,
                    data: {
                        ...SAFE_INITIAL_DATA,
                        ...p.data,
                        growing: {},
                        actionHistory: [],
                        importHistory: []
                    }
                }));
                return { ...parsed, recentIds: [] };
            }

            // 5. 尝试读取更早的 V1 数据
            const savedOld = localStorage.getItem(OLD_STORAGE_KEY);
            if (savedOld) {
                const oldData = JSON.parse(savedOld);
                return {
                    activeProfileId: 'default',
                    profiles: [{ id: 'default', name: '默认存档', data: { ...SAFE_INITIAL_DATA, ...oldData } }],
                    recentIds: []
                };
            }
        } catch (e) {
            console.error("Load failed", e);
        }
        // 6. 默认初始化 (新用户)
        return {
            activeProfileId: 'default',
            profiles: [{ id: 'default', name: '默认存档', data: SAFE_INITIAL_DATA }],
            recentIds: []
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

    const [isEncOrderActive, setIsEncOrderActive] = useState<boolean>(() => {
        try {
            const val = localStorage.getItem(ENC_ORDER_ACTIVE_KEY);
            return val !== 'false';
        } catch {
            return true;
        }
    });

    const [filterIntent, setFilterIntent] = useState<FilterIntent | null>(null);

    // 将 PlanPanel 的筛选状态提升到 App 中管理
    const [planFilters, setPlanFilters] = useState({
        wood: 'all',
        status: 'all',
        orderIds: [] as string[]
    });

    const addToRecent = (ids: string | string[]) => {
        setGlobalData(prev => {
            const currentRecents = prev.recentIds || [];
            const newItems = Array.isArray(ids) ? ids : [ids];
            const filteredPrev = currentRecents.filter(pid => !newItems.includes(pid));
            const updatedList = [...newItems, ...filteredPrev].slice(0, RECENT_ID_COUNT);
            return { ...prev, recentIds: updatedList };
        });
    };

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

    useEffect(() => {
        localStorage.setItem(ENC_ORDER_ACTIVE_KEY, String(isEncOrderActive));
    }, [isEncOrderActive]);

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
                profiles: prev.profiles.map(p => p.id === activeId ? { ...p, data: newData } : p)
            };
        });
    };

    // 更新 growing 状态的帮助函数
    const updateGrowingCount = (id: string, delta: number) => {
        setData(prev => {
            const current = prev.growing?.[id] || 0;
            const newCount = Math.max(0, current + delta);
            return {
                ...prev,
                growing: { ...(prev.growing || {}), [id]: newCount }
            };
        });
    };

    // --- Logic for Encyclopedia Order ---
    const virtualEncyclopediaOrder: Order | null = useMemo(() => {
        const collectedSet = new Set(data.collectedMushrooms || []);
        const uncollectedItems = MUSHROOM_DB
            .filter(m => !collectedSet.has(m.id))
            .map(m => ({ mushroomId: m.id, count: 1 }));

        if (uncollectedItems.length === 0) return null;

        return {
            id: VIRTUAL_ORDER_ID,
            name: '图鉴补全计划',
            items: uncollectedItems,
            active: isEncOrderActive
        };
    }, [data.collectedMushrooms, isEncOrderActive]);

    // --- History & Collection Logic ---

    // 添加操作历史
    const addActionHistory = (id: string, type: 'collect' | 'uncollect') => {
        setData(prev => {
            const newRecord: ActionRecord = { mushroomId: id, type, timestamp: Date.now() };
            const currentHistory = prev.actionHistory || [];
            return { ...prev, actionHistory: [newRecord, ...currentHistory].slice(0, 10) };
        });
    };

    // Toggle Collection
    const toggleCollection = (id: string) => {
        const list = data.collectedMushrooms || [];
        const isCollected = list.includes(id);

        if (isCollected) {
            const currentStock = data.inventory[id] || 0;
            if (currentStock > 0) {
                if (!window.confirm(`⚠️ 该菌种库存还有 ${currentStock} 个。\n确认要取消“已收集”标记吗？\n(操作将仅移除图鉴标记，库存保留)`)) {
                    return;
                }
            }
            addActionHistory(id, 'uncollect');
            setData(prev => ({
                ...prev,
                collectedMushrooms: (prev.collectedMushrooms || []).filter(x => x !== id)
            }));
        } else {
            addActionHistory(id, 'collect');
            setData(prev => ({
                ...prev,
                collectedMushrooms: [...list, id]
            }));
        }
    };

    // 撤销单次操作
    const handleUndoAction = (record: ActionRecord) => {
        setData(prev => {
            const list = prev.collectedMushrooms || [];
            let newList = list;

            if (record.type === 'collect') {
                newList = list.filter(id => id !== record.mushroomId);
            } else {
                if (!list.includes(record.mushroomId)) newList = [...list, record.mushroomId];
            }

            const newHistory = (prev.actionHistory || []).filter(r => r !== record);

            return { ...prev, collectedMushrooms: newList, actionHistory: newHistory };
        });
    };

    // 批量导入图鉴（全量同步逻辑）
    const handleImportEncyclopediaText = (text: string) => {
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l);
        const recognizedIds = new Set<string>();
        const unrecognizedLines: string[] = [];

        lines.forEach(line => {
            if (CORRECTED_NAMES[line] != null) {
                line = CORRECTED_NAMES[line];
            }
            const m = MUSHROOM_DB.find(db => db.name === line);
            if (m) {
                recognizedIds.add(m.id);
            } else {
                unrecognizedLines.push(line);
            }
        });

        if (recognizedIds.size === 0 && lines.length > 0) {
            alert("⚠️ 未识别到任何有效菌种名称，请检查文件格式。");
            return;
        }

        const currentCollected = new Set(data.collectedMushrooms || []);
        const addedIds: string[] = [];
        const removedIds: string[] = [];

        MUSHROOM_DB.forEach(m => {
            const isCurrentlyCollected = currentCollected.has(m.id);
            const isInImport = recognizedIds.has(m.id);

            if (!isCurrentlyCollected && isInImport) {
                addedIds.push(m.id);
            } else if (isCurrentlyCollected && !isInImport) {
                removedIds.push(m.id);
            }
        });

        if (addedIds.length === 0 && removedIds.length === 0) {
            alert("✅ 图鉴状态已是最新，无变化。");
            return;
        }

        if (!window.confirm(`解析完成！\n即将更新图鉴状态：\n➕ 新增收集: ${addedIds.length} 个\n➖ 取消收集: ${removedIds.length} 个\n❓ 未识别行: ${unrecognizedLines.length} 行\n\n是否应用？`)) {
            return;
        }

        setData(prev => {
            const importRecord: ImportRecord = {
                id: Date.now().toString(),
                timestamp: Date.now(),
                addedIds,
                removedIds,
                unrecognized: unrecognizedLines
            };

            const newCollectedList = Array.from(recognizedIds);

            return {
                ...prev,
                collectedMushrooms: newCollectedList,
                importHistory: [importRecord, ...(prev.importHistory || [])].slice(0, 10)
            };
        });
    };

    // 撤销导入
    const handleUndoImport = (record: ImportRecord) => {
        if (!window.confirm('确定要撤销这次导入操作吗？图鉴状态将回滚。')) return;

        setData(prev => {
            const currentSet = new Set(prev.collectedMushrooms || []);
            record.addedIds.forEach(id => currentSet.delete(id));
            record.removedIds.forEach(id => currentSet.add(id));

            const newHistory = (prev.importHistory || []).filter(r => r.id !== record.id);

            return {
                ...prev,
                collectedMushrooms: Array.from(currentSet),
                importHistory: newHistory
            };
        });
    };

    // 删除导入记录
    const handleDeleteImportRecord = (recordId: string) => {
        if (!window.confirm('删除记录后将无法撤销此次操作，确认删除？')) return;
        setData(prev => ({
            ...prev,
            importHistory: (prev.importHistory || []).filter(r => r.id !== recordId)
        }));
    };

    const handleBatchCollect = (ids: string[]) => {
        if (ids.length === 0) return;
        addToRecent(ids);
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
            return { ...prev, collectedMushrooms: Array.from(currentSet) };
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
            ...prev,
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
                ...prev,
                activeProfileId: newActiveId,
                profiles: newProfiles
            };
        });
    };

    const handleSwitchProfile = (id: string) => {
        setGlobalData(prev => ({ ...prev, activeProfileId: id }));
        setEditingOrderIds(new Set());
    };

    const handleRenameProfile = (id: string, newName: string) => {
        setGlobalData(prev => ({
            ...prev,
            profiles: prev.profiles.map(p => p.id === id ? { ...p, name: newName } : p)
        }));
    };

    const handleExportCurrent = () => {
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
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
                // 检查必要的字段
                if (!json.orders || !json.inventory) {
                    throw new Error('文件格式不正确，缺少订单或库存数据');
                }
                const fileName = file.name.replace('.json', '');

                // 准备合并后的数据对象
                const mergedData = {
                    ...SAFE_INITIAL_DATA,
                    ...json,
                    // 显式保留历史记录，防止被覆盖为 undefined
                    actionHistory: json.actionHistory || [],
                    importHistory: json.importHistory || []
                };

                const userChoice = window.confirm(
                    `成功读取存档文件！\n\n【确定】-> 作为“新存档”导入\n【取消】-> 覆盖“当前存档”(${currentProfile.name})`
                );

                if (userChoice) {
                    const newId = Date.now().toString();
                    setGlobalData(prev => ({
                        ...prev,
                        activeProfileId: newId,
                        profiles: [...prev.profiles, {
                            id: newId,
                            name: `导入: ${fileName}`,
                            data: mergedData // 使用增强后的数据
                        }]
                    }));
                    alert(`✅ 已新建存档: 导入: ${fileName}`);
                } else {
                    if (window.confirm(`⚠️ 警告：这将完全覆盖当前存档 "${currentProfile.name}" 的所有数据。\n是否继续？`)) {
                        setData(mergedData); // 使用增强后的数据
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
        inventory: { ...p.inventory, [id]: Math.max(0, count) }
    }));

    const handleAddOne = (id: string) => {
        setData(p => ({
            ...p,
            inventory: { ...p.inventory, [id]: (p.inventory[id] || 0) + 1 }
        }));
    };

    const toggleEquipment = (type: 'wood' | 'light' | 'humidifier', value: string) => {
        setData(prev => {
            const mapKey = type === 'wood' ? 'unlockedWoods' : type === 'light' ? 'unlockedLights' : 'unlockedHumidifiers';
            const list = prev[mapKey] as string[];
            if (list.includes(value)) return { ...prev, [mapKey]: list.filter(x => x !== value) };
            return { ...prev, [mapKey]: [...list, value] };
        });
    };

    const handleCompleteTask = (task: PlanTask) => {
        if (window.confirm(`确认收取 ${task.countNeeded} 个 ${task.mushroom.name} 吗？\n\n(确认后将更新库存，该任务将因需求满足而从计划中移除)`)) {
            setData(prev => {
                const newInventory = { ...prev.inventory };
                const current = newInventory[task.mushroom.id] || 0;
                newInventory[task.mushroom.id] = current + task.countNeeded;
                return { ...prev, inventory: newInventory };
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
                        data: {
                            ...SAFE_INITIAL_DATA, // 1. 先铺垫默认值
                            ...p.data,            // 2. 覆盖备份数据
                            // 3. 强制兜底：确保历史记录字段存在（防止备份里的 null 覆盖默认空数组）
                            actionHistory: p.data.actionHistory || [],
                            importHistory: p.data.importHistory || []
                        }
                    }));
                    // 兼容旧备份：如果没有 recentIds，则补上空数组
                    if (!json.recentIds) json.recentIds = [];
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
        const blob = new Blob([JSON.stringify(globalData)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        const date = new Date().toISOString().split('T')[0];
        a.download = `mushroom_helper_backup_${date}.json`;
        a.click();
    };

    // --- Order CRUD Operations ---
    const addOrder = (nameOverride?: string, initialItems?: { mushroomId: string; count: number }[]) => {
        // 如果有 nameOverride，使用它；否则使用 input 里的 newOrderName
        const finalName = nameOverride || newOrderName;

        if (!finalName.trim()) return;

        const newId = Date.now().toString();

        setData(p => ({
            ...p,
            orders: [
                {
                    id: newId,
                    name: finalName,
                    // 使用传入的初始物品，如果没有则为空数组
                    items: initialItems || [],
                    active: true
                },
                ...p.orders
            ]
        }));

        setNewOrderName('');

        // 只有当没有初始物品时（即创建空订单时），才自动展开编辑模式
        // 如果是从“新建订单”面板创建并带有物品，通常不需要立即展开编辑
        if (!initialItems || initialItems.length === 0) {
            setEditingOrderIds(p => new Set(p).add(newId));
        }
    };
    const addItemToOrder = (oid: string, mid: string) => setData(p => ({
        ...p,
        orders: p.orders.map(o => o.id === oid ? {
            ...o,
            items: o.items.some(i => i.mushroomId === mid) ? o.items.map(i => i.mushroomId === mid ? {
                ...i,
                count: i.count + 1
            } : i) : [...o.items, { mushroomId: mid, count: 1 }]
        } : o)
    }));
    const updateItemCount = (oid: string, mid: string, count: number) => setData(p => ({
        ...p,
        orders: p.orders.map(o => o.id === oid ? {
            ...o,
            items: o.items.map(i => i.mushroomId === mid ? { ...i, count: Math.max(0, count) } : i)
        } : o)
    }));
    const removeItemFromOrder = (oid: string, mid: string) => setData(p => ({
        ...p,
        orders: p.orders.map(o => o.id === oid ? { ...o, items: o.items.filter(i => i.mushroomId !== mid) } : o)
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
        orders: p.orders.map(o => o.id === oid ? { ...o, active: !o.active } : o)
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
                const newInv = { ...prev.inventory };
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

    const allOrdersWithVirtual = useMemo(() => {
        const list = [...data.orders];
        if (virtualEncyclopediaOrder) {
            list.push(virtualEncyclopediaOrder);
        }
        return list;
    }, [data.orders, virtualEncyclopediaOrder]);

    const relevantMushrooms = useMemo(() => {
        const ids = new Set<string>();
        allOrdersWithVirtual.forEach(o => o.items.forEach(i => ids.add(i.mushroomId)));
        Object.keys(data.inventory).forEach(id => {
            if (data.inventory[id] > 0) ids.add(id);
        });
        return Array.from(ids).map(id => MUSHROOM_DB.find(m => m.id === id)).filter((m): m is MushroomDef => !!m).sort((a, b) => a.id.localeCompare(b.id));
    }, [allOrdersWithVirtual, data.inventory]);

    const activeDemandMap = useMemo(() => {
        const map = new Map<string, number>();
        allOrdersWithVirtual.forEach(o => {
            if (o.id === VIRTUAL_ORDER_ID) return;
            if (!o.active) return;
            o.items.forEach(i => {
                map.set(i.mushroomId, (map.get(i.mushroomId) || 0) + i.count);
            });
        });
        return map;
    }, [allOrdersWithVirtual]);

    const encyclopediaDemandMap = useMemo(() => {
        const map = new Map<string, number>();
        if (virtualEncyclopediaOrder && virtualEncyclopediaOrder.active) {
            virtualEncyclopediaOrder.items.forEach(i => map.set(i.mushroomId, i.count));
        }
        return map;
    }, [virtualEncyclopediaOrder]);

    const calculationResult = useMemo(() => {
        const computedData = {
            ...data,
            orders: allOrdersWithVirtual
        };
        return calculateOptimalRoute(computedData);
    }, [data, allOrdersWithVirtual, planVersion]);

    const promptAndCollect = (id: string) => {
        const isUncollected = !data.collectedMushrooms.includes(id);
        if (isUncollected) {
            if (window.confirm(`🎉 恭喜！这是你图鉴里未收集的菌种。\n是否要顺便标记为“已收集”？`)) {
                toggleCollection(id);
            }
        }
    }

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

            {activeTab === 'encyclopedia' ? (
                <Suspense fallback={<LoadingSpinner/>}>
                    <Encyclopedia
                        collectedIds={data.collectedMushrooms || []}
                        onToggleCollection={toggleCollection}
                        onBatchCollect={handleBatchCollect}
                        unlockedWoods={data.unlockedWoods as WoodType[]}
                        unlockedLights={data.unlockedLights as LightType[]}
                        unlockedHumidifiers={data.unlockedHumidifiers as HumidifierType[]}
                        inventory={data.inventory}
                        // 新增的 props
                        actionHistory={data.actionHistory || []}
                        onUndoAction={handleUndoAction}
                        importHistory={data.importHistory || []}
                        onImportText={handleImportEncyclopediaText}
                        onUndoImport={handleUndoImport}
                        onDeleteImportRecord={handleDeleteImportRecord}
                        growingCounts={data.growing || {}}
                    />
                </Suspense>
            ) : (
                <div className="main-layout">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div id="panel-equipment">
                            <EquipmentPanel unlockedWoods={data.unlockedWoods as WoodType[]}
                                            unlockedLights={data.unlockedLights as LightType[]}
                                            unlockedHumidifiers={data.unlockedHumidifiers as HumidifierType[]}
                                            onToggle={toggleEquipment}/>
                        </div>
                        <div id="panel-inventory">
                            <InventoryPanel
                                inventory={data.inventory}
                                relevantMushrooms={relevantMushrooms}
                                activeDemandMap={activeDemandMap}
                                encyclopediaDemandMap={encyclopediaDemandMap}
                                onUpdate={updateInventory}
                                growingCounts={data.growing || {}}
                            />
                        </div>
                        <div id="panel-orders">
                            <OrderPanel
                                orders={data.orders}
                                virtualOrder={virtualEncyclopediaOrder}
                                onToggleVirtualOrder={(active) => setIsEncOrderActive(active)}
                                newOrderName={newOrderName} onNewOrderNameChange={setNewOrderName}
                                growingCounts={data.growing || {}}
                                onAddOrder={addOrder}
                                editingOrderIds={editingOrderIds} onToggleEdit={toggleOrderEdit}
                                onDeleteOrder={deleteOrder}
                                onToggleActive={toggleOrderActive}
                                onArchiveOrder={handleArchiveOrder}
                                onAddItem={addItemToOrder} onUpdateItemCount={updateItemCount}
                                onRemoveItem={removeItemFromOrder}
                                unlockedWoods={data.unlockedWoods as WoodType[]}
                                unlockedLights={data.unlockedLights as LightType[]}
                                unlockedHumidifiers={data.unlockedHumidifiers as HumidifierType[]}
                                inventory={data.inventory}
                                onFilterIntentChange={setFilterIntent}
                                activeOrderIds={planFilters.orderIds}
                            />
                        </div>
                    </div>

                    <div id="panel-plan">
                        <PlanPanel
                            plan={calculationResult}
                            onCompleteTask={handleCompleteTask}
                            onRefresh={() => setPlanVersion(v => v + 1)}
                            orders={allOrdersWithVirtual}
                            inventory={data.inventory}
                            onAddOne={(id) => {
                                promptAndCollect(id);
                                handleAddOne(id);
                            }}
                            collectedIds={data.collectedMushrooms || []}
                            filterIntent={filterIntent}
                            filters={planFilters}
                            onUpdateFilters={setPlanFilters}
                            onConsumeFilterIntent={() => setFilterIntent(null)}
                            growingCounts={data.growing || {}}
                            onUpdateGrowing={updateGrowingCount}
                            onUpdateInventory={(id: string, count: number) => {
                                if (count > 0) {
                                    promptAndCollect(id);
                                }
                                updateInventory(id, count);
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;
