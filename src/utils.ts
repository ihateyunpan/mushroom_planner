// src/utils.ts
import { HUMIDIFIER_INFO, LIGHT_INFO, WOOD_INFO } from './database';
import type { MissingItem } from './logic';
import {
    type HumidifierType,
    ItemRanks,
    type LightType,
    type MushroomDef,
    SpecialConditions,
    type SpecialConditionType,
    type WoodType
} from './types';

export const getMushroomImg = (id: string) => `/mushrooms/${id}.webp`;

export const getChildImg = (id: string, special: SpecialConditionType | undefined) => {
    let specialCode = '';
    switch (special) {
        case SpecialConditions.LESS:
            specialCode = '1';
            break;
        case SpecialConditions.MUCH:
            specialCode = '2';
            break;
        default:
            specialCode = '';
    }
    return `/mushroom_children/${id}${specialCode}.webp`;
};

export const getSourceInfo = (type: MissingItem['type'], value: string) => {
    if (type === 'wood') return WOOD_INFO[value as WoodType]?.source || '未知来源';
    if (type === 'light') return LIGHT_INFO[value as LightType]?.source || '未知来源';
    if (type === 'humidifier') return HUMIDIFIER_INFO[value as HumidifierType]?.source || '未知来源';
    return '';
};

export const getToolIcon = (type: MissingItem['type']) => {
    if (type === 'wood') return '🪵';
    if (type === 'light') return '💡';
    if (type === 'humidifier') return '💧';
    return '❓';
};

export const TOOL_INFO: Record<string, { name: string; img: string }> = {
    [SpecialConditions.LESS]: { name: '菇菇滋补汤', img: '/tools/tool1.webp' },
    [SpecialConditions.MUCH]: { name: '菇菇消食片', img: '/tools/tool2.webp' },
    [SpecialConditions.BUG]: { name: '虫虫驱散水', img: '/tools/tool3.webp' },
};

export const getSpecialStyle = (special: string) => {
    switch (special) {
        case SpecialConditions.BUG:
            return { bg: '#ffebee', color: '#c62828', icon: '☠️', border: '#ffcdd2' }; // 红：虫害
        case SpecialConditions.LESS:
            return { bg: '#e3f2fd', color: '#1565c0', icon: '🥀', border: '#bbdefb' }; // 蓝：营养不良
        case SpecialConditions.MUCH:
            return { bg: '#f3e5f5', color: '#6a1b9a', icon: '💊', border: '#e1bee7' }; // 紫：营养过剩
        default:
            return { bg: '#fff3e0', color: '#ef6c00', icon: '⚠️', border: '#ffe0b2' }; // 橙：默认
    }
};

export const PROTAGONISTS = ['刘辩', '傅融', '袁基', '左慈', '孙策'];

export const RECENT_ID_COUNT = 10;

// 新增：获取道具的排序 Key：先按品级(低到高)，再按列表顺序
export function getEquipmentSortKey(type: 'wood' | 'light' | 'humidifier', value: string): number {
    if (value === '任意') return 999999; // 任意排最后

    let rank = 0;
    let index = 0;

    if (type === 'wood') {
        const info = WOOD_INFO[value as WoodType];
        rank = info?.rank || 0;
        index = Object.keys(WOOD_INFO).indexOf(value);
    } else if (type === 'light') {
        const info = LIGHT_INFO[value as LightType];
        rank = info?.rank || 0;
        index = Object.keys(LIGHT_INFO).indexOf(value);
    } else if (type === 'humidifier') {
        const info = HUMIDIFIER_INFO[value as HumidifierType];
        rank = info?.rank || 0;
        index = Object.keys(HUMIDIFIER_INFO).indexOf(value);
    }

    // 构造一个数字: Rank * 1000 + Index
    // Rank 1 (Fan) -> 1000+
    // Rank 2 (Zhen) -> 2000+
    // Rank 3 (Xian) -> 3000+
    return rank * 1000 + index;
}

const UNKNOWN_RANK_WEIGHT = 5;
const RANK_WEIGHTS = {
    [ItemRanks.FAN]: 1,
    [ItemRanks.ZHEN]: 3,
    [ItemRanks.XIAN]: 10, // 仙品很难，权重给高点
};

// 辅助：获取某个菌种的综合难度分
export function getMushroomDifficultyScore(m: MushroomDef): number {
    let finalWeight = 1;

    const wRank = WOOD_INFO[m.wood as WoodType]?.rank;
    const lRank = LIGHT_INFO[m.light as LightType]?.rank;
    const hRank = HUMIDIFIER_INFO[m.humidifier as HumidifierType]?.rank;

    if (wRank != null) {
        finalWeight += RANK_WEIGHTS[wRank] ?? UNKNOWN_RANK_WEIGHT;
    }
    if (lRank != null) {
        finalWeight += RANK_WEIGHTS[lRank] ?? UNKNOWN_RANK_WEIGHT;
    }
    if (hRank != null) {
        finalWeight += RANK_WEIGHTS[hRank] ?? UNKNOWN_RANK_WEIGHT;
    }


    return finalWeight;
}

// 凡品(全1) -> 蓝; 珍品(含2无3) -> 紫; 仙品(含3) -> 黄
export function getMushroomRankColor(m: MushroomDef) {
    const ranks = [
        m.wood ? WOOD_INFO[m.wood]?.rank : ItemRanks.FAN,
        m.light ? LIGHT_INFO[m.light]?.rank : ItemRanks.FAN,
        m.humidifier ? HUMIDIFIER_INFO[m.humidifier]?.rank : ItemRanks.FAN,
    ].map(r => r || ItemRanks.FAN); // 默认凡品

    const maxRank = Math.max(...ranks);

    if (maxRank === ItemRanks.XIAN) {
        // 仙品 - 黄色
        return { background: '#fff9c4', border: '1px solid #fbc02d', color: '#f57f17' };
    } else if (maxRank === ItemRanks.ZHEN) {
        // 珍品 - 紫色
        return { background: '#f3e5f5', border: '1px solid #ba68c8', color: '#7b1fa2' };
    } else {
        // 凡品 - 蓝色
        return { background: '#e3f2fd', border: '1px solid #90caf9', color: '#1565c0' };
    }
}
