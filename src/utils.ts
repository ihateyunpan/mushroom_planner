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
        case SpecialConditions.BUG:
            specialCode = '3';
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
    [SpecialConditions.LESS]: {name: '菇菇滋补汤', img: '/tools/tool1.webp'},
    [SpecialConditions.MUCH]: {name: '菇菇消食片', img: '/tools/tool2.webp'},
    [SpecialConditions.BUG]: {name: '虫虫驱散水', img: '/tools/tool3.webp'},
};

export const getSpecialStyle = (special: string) => {
    switch (special) {
        case SpecialConditions.BUG:
            return {bg: '#ffebee', color: '#c62828', icon: '🐛', border: '#ffcdd2'}; // 红：虫害
        case SpecialConditions.LESS:
            return {bg: '#e3f2fd', color: '#1565c0', icon: '🥀', border: '#bbdefb'}; // 蓝：营养不良
        case SpecialConditions.MUCH:
            return {bg: '#f3e5f5', color: '#6a1b9a', icon: '💊', border: '#e1bee7'}; // 紫：营养过剩
        default:
            return {bg: '#fff3e0', color: '#ef6c00', icon: '⚠️', border: '#ffe0b2'}; // 橙：默认
    }
};