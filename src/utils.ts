// src/utils.ts
import { HUMIDIFIER_INFO, LIGHT_INFO, WOOD_INFO } from './database';
import type { MissingItem } from './logic';
import type { HumidifierType, LightType, SpecialConditionType, WoodType } from './types';
import { SpecialConditions } from './types';

export const getMushroomImg = (id: string) => `/mushrooms/${id}.png`;

export const getChildImg = (id: string, special: SpecialConditionType | undefined) => {
    let specialCode = '';
    switch (special) {
        case SpecialConditions.LESS:
            specialCode = '1';
            break;
        case SpecialConditions.MUCH:
            specialCode = '2';
            break;
        case SpecialConditions.BUG:
            specialCode = '3';
            break;
        default:
            specialCode = '';
    }
    return `/mushroom_children/${id}${specialCode}.png`;
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
    [SpecialConditions.LESS]: {name: '菇菇滋补汤', img: '/tools/tool1.png'},
    [SpecialConditions.MUCH]: {name: '菇菇消食片', img: '/tools/tool2.png'},
    [SpecialConditions.BUG]: {name: '虫虫驱散水', img: '/tools/tool3.png'},
};