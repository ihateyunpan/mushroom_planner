// src/utils.ts
import { HUMIDIFIER_INFO, LIGHT_INFO, WOOD_INFO } from './database';
import type { MissingItem } from './logic';
import type { HumidifierType, LightType, SpecialConditionType, WoodType } from './types';
import { SpecialConditions } from './types';

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
