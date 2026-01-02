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

                // 只有当批次环境设定与菌种需求一致（都是Specific或都是Any）时才合并
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
                // 修改点：生成稳定的ID
                const envId = [
                    currentWood,
                    currentItem.mushroom.light || '任意',
                    currentItem.mushroom.humidifier || '任意',
                    currentItem.mushroom.time || '任意'
                ].join('-');

                batches.push({
                    id: envId, // 使用环境组合作为ID，确保重新计算时ID不变
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

    // 交叉注入顺风车
    batches.forEach(targetBatch => {
        batches.forEach(sourceBatch => {
            if (targetBatch === sourceBatch) return;
            if (targetBatch.env.wood !== sourceBatch.env.wood) return;

            const isCompatible = (targetVal: string | '任意', sourceVal: string | '任意') => {
                if (sourceVal === '任意') return true;
                return targetVal === sourceVal;
            };

            const compatible = isCompatible(targetBatch.env.light, sourceBatch.env.light) &&
                isCompatible(targetBatch.env.humidifier, sourceBatch.env.humidifier) &&
                isCompatible(targetBatch.env.time, sourceBatch.env.time);

            if (compatible && targetBatch.strictnessScore > sourceBatch.strictnessScore) {
                sourceBatch.tasks.forEach(task => {
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
        // 1. 严格度优先 (高 -> 低)
        if (b.strictnessScore !== a.strictnessScore) {
            return b.strictnessScore - a.strictnessScore;
        }

        // 2. 当严格度相等时，优先显示可完成的（不缺道具）
        const aIsComplete = a.missingEquipment.length === 0;
        const bIsComplete = b.missingEquipment.length === 0;
        if (aIsComplete !== bIsComplete) {
            // true (可完成) 排在 false (缺道具) 前面
            return aIsComplete ? -1 : 1;
        }

        // 3. 数量优先 (多 -> 少)
        return b.totalCount - a.totalCount;
    });

    return {
        batches,
        missingSummary: Array.from(allMissingMap.values())
    };
}

function groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, T[]> {
    return array.reduce((acc, item) => {
        const key = keyFn(item);
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
    }, {} as Record<string, T[]>);
}