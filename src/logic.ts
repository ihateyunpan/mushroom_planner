// src/logic.ts
import { MUSHROOM_DB } from './database';
import type { HumidifierType, LightType, MushroomDef, TimeType, UserSaveData, WoodType } from './types';

// 缺失物品的结构化定义
export interface MissingItem {
    type: 'wood' | 'light' | 'humidifier';
    value: string;
}

// 任务定义（新增 isPassenger 字段）
export interface PlanTask {
    mushroom: MushroomDef;
    countNeeded: number;
    isPassenger?: boolean; // 标记是否为顺风车（复制过来的任务）
    originalBatchId?: string; // 标记它原本属于哪个核心批次
}

// 计划中的每一步（批次）
export interface PlanBatch {
    id: string; // 唯一key
    env: {
        wood: WoodType;
        light: LightType | '任意';
        humidifier: HumidifierType | '任意';
        time: TimeType | '任意';
    };
    tasks: PlanTask[];
    missingEquipment: MissingItem[];
    strictnessScore: number;
    totalCount: number;
}

export interface CalculationResult {
    batches: PlanBatch[];
    missingSummary: MissingItem[];
}

export function calculateOptimalRoute(userData: UserSaveData): CalculationResult {
    // 1. 统计总需求
    const demandMap = new Map<string, number>();

    userData.orders.forEach(order => {
        if (!order.active) return;
        order.items.forEach(item => {
            const current = demandMap.get(item.mushroomId) || 0;
            demandMap.set(item.mushroomId, current + item.count);
        });
    });

    // 2. 扣除库存
    const needToPlant: { mushroom: MushroomDef; countNeeded: number }[] = [];
    demandMap.forEach((totalNeeded, id) => {
        const inStock = userData.inventory[id] || 0;
        const netNeeded = totalNeeded - inStock;
        if (netNeeded > 0) {
            const def = MUSHROOM_DB.find(m => m.id === id);
            if (def) needToPlant.push({mushroom: def, countNeeded: netNeeded});
        }
    });

    if (needToPlant.length === 0) return {batches: [], missingSummary: []};

    // 排序：限制多的优先
    needToPlant.sort((a, b) => {
        const getScore = (m: MushroomDef) => {
            let s = 0;
            if (m.wood) s += 10;
            if (m.light) s += 5;
            if (m.humidifier) s += 5;
            if (m.time) s += 3;
            if (m.special) s += 1;
            return s;
        };
        return getScore(b.mushroom) - getScore(a.mushroom);
    });

    // 3. 分组算法
    const batches: PlanBatch[] = [];
    const byWood = groupBy(needToPlant, item => item.mushroom.wood || '任意木头');

    for (const [woodKey, items] of Object.entries(byWood)) {
        const currentWood = woodKey as WoodType;
        const unallocated = [...items];

        while (unallocated.length > 0) {
            const currentItem = unallocated.shift()!;
            let bestBatchIndex = -1;

            for (let i = 0; i < batches.length; i++) {
                const batch = batches[i];
                if (batch.env.wood !== currentWood) continue;

                // --- 修改点1：不再进行贪婪合并，只有严格匹配才合并 ---
                // 只有当批次环境设定与菌种需求一致（都是Specific或都是Any）时才合并
                // 这样可以确保宽松的菌种会建立自己独立的宽松批次
                const isStrictMatch = (batchVal: string | '任意', itemVal: string | undefined) => {
                    const b = batchVal === '任意' ? undefined : batchVal;
                    return b === itemVal;
                };

                const match = isStrictMatch(batch.env.light, currentItem.mushroom.light) &&
                    isStrictMatch(batch.env.humidifier, currentItem.mushroom.humidifier) &&
                    isStrictMatch(batch.env.time, currentItem.mushroom.time);

                if (match) {
                    bestBatchIndex = i;
                    break;
                }
            }

            if (bestBatchIndex !== -1) {
                const batch = batches[bestBatchIndex];
                batch.tasks.push({...currentItem, isPassenger: false});
                batch.totalCount += currentItem.countNeeded;
            } else {
                batches.push({
                    id: `${currentWood}-${Date.now()}-${Math.random()}`,
                    env: {
                        wood: currentWood,
                        light: currentItem.mushroom.light || '任意',
                        humidifier: currentItem.mushroom.humidifier || '任意',
                        time: currentItem.mushroom.time || '任意',
                    },
                    tasks: [{...currentItem, isPassenger: false}],
                    missingEquipment: [],
                    strictnessScore: 0,
                    totalCount: currentItem.countNeeded
                });
            }
        }
    }

    // 4. 计算属性 + 注入顺风车逻辑
    const allMissingMap = new Map<string, MissingItem>();

    batches.forEach(batch => {
        let score = 0;
        if (batch.env.wood) score += 1;
        if (batch.env.light !== '任意') score += 1;
        if (batch.env.humidifier !== '任意') score += 1;
        if (batch.env.time !== '任意') score += 1;
        batch.strictnessScore = score;

        // 缺失设备逻辑
        if (!userData.unlockedWoods.includes(batch.env.wood)) {
            const item: MissingItem = {type: 'wood', value: batch.env.wood};
            allMissingMap.set(`wood-${batch.env.wood}`, item);
            batch.missingEquipment.push(item);
        }
        if (batch.env.light !== '任意' && !userData.unlockedLights.includes(batch.env.light)) {
            const item: MissingItem = {type: 'light', value: batch.env.light};
            allMissingMap.set(`light-${batch.env.light}`, item);
            batch.missingEquipment.push(item);
        }
        if (batch.env.humidifier !== '任意' && !userData.unlockedHumidifiers.includes(batch.env.humidifier)) {
            const item: MissingItem = {type: 'humidifier', value: batch.env.humidifier};
            allMissingMap.set(`humidifier-${batch.env.humidifier}`, item);
            batch.missingEquipment.push(item);
        }
    });

    // --- 修改点2：交叉注入顺风车 ---
    // 遍历所有批次对，如果 Target 比 Source 严格且兼容，则把 Source 的任务作为“顺风车”显示在 Target 里
    batches.forEach(targetBatch => {
        batches.forEach(sourceBatch => {
            if (targetBatch === sourceBatch) return;
            if (targetBatch.env.wood !== sourceBatch.env.wood) return;

            // 只有当目标批次比源批次更严格（或至少环境包含了源批次的要求）时才注入
            // 简单判断：目标的环境能满足源批次里所有任务吗？
            // 因为我们在第1步已经按属性严格分组了，所以只要源批次是“任意”，目标是“具体”，就满足
            const isCompatible = (targetVal: string | '任意', sourceVal: string | '任意') => {
                if (sourceVal === '任意') return true; // 源是任意，目标是啥都行
                return targetVal === sourceVal; // 源是具体，目标必须一致
            };

            const compatible = isCompatible(targetBatch.env.light, sourceBatch.env.light) &&
                isCompatible(targetBatch.env.humidifier, sourceBatch.env.humidifier) &&
                isCompatible(targetBatch.env.time, sourceBatch.env.time);

            // 且必须是不同严格度的，避免相同批次互指（虽然Step1应该避免了相同批次）
            // 或者是 Target 严格度 > Source 严格度
            if (compatible && targetBatch.strictnessScore > sourceBatch.strictnessScore) {
                sourceBatch.tasks.forEach(task => {
                    // 防止重复添加
                    if (!targetBatch.tasks.find(t => t.mushroom.id === task.mushroom.id && t.isPassenger)) {
                        targetBatch.tasks.push({
                            ...task,
                            isPassenger: true,
                            originalBatchId: sourceBatch.id
                        });
                    }
                });
            }
        });
    });

    // 5. 排序
    batches.sort((a, b) => {
        if (b.strictnessScore !== a.strictnessScore) {
            return b.strictnessScore - a.strictnessScore; // 严格的在前
        }
        return b.totalCount - a.totalCount;
    });

    return {
        batches,
        missingSummary: Array.from(allMissingMap.values())
    };
}

// ... helper functions (groupBy etc)
function groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, T[]> {
    return array.reduce((acc, item) => {
        const key = keyFn(item);
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
    }, {} as Record<string, T[]>);
}