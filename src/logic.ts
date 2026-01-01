// src/logic.ts
import { MUSHROOM_DB } from './database';
import type { HumidifierType, LightType, MushroomDef, TimeType, UserSaveData, WoodType } from './types';

// 新增：缺失物品的结构化定义
export interface MissingItem {
    type: 'wood' | 'light' | 'humidifier';
    value: string;
}

// 计划中的每一步（批次）
export interface PlanBatch {
    id: string; // 唯一key
    env: {
        wood: WoodType;
        // 以下属性可能是具体的，也可能是 '任意'
        light: LightType | '任意';
        humidifier: HumidifierType | '任意';
        time: TimeType | '任意';
    };
    tasks: {
        mushroom: MushroomDef;
        countNeeded: number;
    }[];
    // 修改：存储结构化的缺失信息
    missingEquipment: MissingItem[];
}

export interface CalculationResult {
    batches: PlanBatch[];
    // 修改：存储结构化的缺失信息
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

    // 2. 扣除库存，得到净需求
    const needToPlant: { mushroom: MushroomDef; countNeeded: number }[] = [];

    demandMap.forEach((totalNeeded, id) => {
        const inStock = userData.inventory[id] || 0;
        const netNeeded = totalNeeded - inStock;
        if (netNeeded > 0) {
            const def = MUSHROOM_DB.find(m => m.id === id);
            if (def) {
                needToPlant.push({mushroom: def, countNeeded: netNeeded});
            }
        }
    });

    if (needToPlant.length === 0) return {batches: [], missingSummary: []};

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

                const isLightCompat = isCompatible(batch.env.light, currentItem.mushroom.light);
                const isHumidCompat = isCompatible(batch.env.humidifier, currentItem.mushroom.humidifier);

                if (isLightCompat && isHumidCompat) {
                    bestBatchIndex = i;
                    break;
                }
            }

            if (bestBatchIndex !== -1) {
                const batch = batches[bestBatchIndex];
                batch.tasks.push(currentItem);
                batch.env.light = resolveConstraint(batch.env.light, currentItem.mushroom.light);
                batch.env.humidifier = resolveConstraint(batch.env.humidifier, currentItem.mushroom.humidifier);
            } else {
                batches.push({
                    id: `${currentWood}-${Date.now()}-${Math.random()}`,
                    env: {
                        wood: currentWood,
                        light: currentItem.mushroom.light || '任意',
                        humidifier: currentItem.mushroom.humidifier || '任意',
                        time: '任意',
                    },
                    tasks: [currentItem],
                    missingEquipment: []
                });
            }
        }
    }

    // 4. 计算缺失设备 (更新逻辑)
    // 使用 Map 进行去重，Key 为 "type-value"
    const allMissingMap = new Map<string, MissingItem>();

    batches.forEach(batch => {
        const missing: MissingItem[] = [];

        // 检查木头
        if (!userData.unlockedWoods.includes(batch.env.wood)) {
            const item: MissingItem = {type: 'wood', value: batch.env.wood};
            missing.push(item);
            allMissingMap.set(`wood-${batch.env.wood}`, item);
        }

        // 检查灯
        if (batch.env.light !== '任意') {
            if (!userData.unlockedLights.includes(batch.env.light)) {
                const item: MissingItem = {type: 'light', value: batch.env.light};
                missing.push(item);
                allMissingMap.set(`light-${batch.env.light}`, item);
            }
        }

        // 检查加湿器
        if (batch.env.humidifier !== '任意') {
            if (!userData.unlockedHumidifiers.includes(batch.env.humidifier)) {
                const item: MissingItem = {type: 'humidifier', value: batch.env.humidifier};
                missing.push(item);
                allMissingMap.set(`humidifier-${batch.env.humidifier}`, item);
            }
        }

        batch.missingEquipment = missing;
    });

    return {
        batches,
        missingSummary: Array.from(allMissingMap.values())
    };
}

// --- 辅助函数 ---

function groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, T[]> {
    return array.reduce((acc, item) => {
        const key = keyFn(item);
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
    }, {} as Record<string, T[]>);
}

function isCompatible(envProp: string | undefined | '任意', itemProp: string | undefined) {
    if (envProp === '任意' || envProp === undefined) return true;
    if (itemProp === undefined) return true;
    return envProp === itemProp;
}

function resolveConstraint(current: string | undefined | '任意', incoming: string | undefined): any {
    if (current !== '任意' && current !== undefined) return current;
    if (incoming !== undefined) return incoming;
    return '任意';
}