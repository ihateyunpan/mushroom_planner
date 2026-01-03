// src/types.ts

// --- 1. 基础常量定义 (代替 Enum) ---
export const MushroomChildIds = {
    CAO: 'cao',
    CI: 'ci',
    MAO: 'mao',
    PAO: 'pao',
    SHAN_HU: 'shanhu',
    LABA: 'laba',
    DI: 'di',
    DEER: 'deer',
    CAI: 'cai',
    GHOST: 'ghost',
    NIAO: 'niao',
    LING: 'ling',
    ZHU: 'zhu',
    RUBY: 'ruby',
    HOU: 'hou',
} as const;
export type MushroomChildId = typeof MushroomChildIds[keyof typeof MushroomChildIds];


export const Woods = {
    BAI: '柏木',
    FENG: '枫木',
    SONG: '松木',
    CHANG_CHUN: '常春',
    GE_TENG: '葛藤',
    JIAN_CI: '尖刺',
    JIAN_JING: '尖晶',
    LV_SONG: '绿松',
    GOLD: '黄金',
    LOVE: '爱心',
    QIAN_NIU: '牵牛',
    QING: '青金',
    YAN: '炎溶',
    MING: '名琴',
    SHU: '书案',
} as const;
export type WoodType = typeof Woods[keyof typeof Woods];

export const Lights = {
    HUO: '火炬',
    HUN: '魂魂',
    TONG: '铜盏',
    YU_RONG: '羽绒',
    DRAGON: '白龙',
} as const;
export type LightType = typeof Lights[keyof typeof Lights];

export const Humidifiers = {
    ZHU: '竹筒',
    LIAN: '莲蓬',
    TAO: '陶滴壶',
    NIAO: '小鸟',
    BLUE: '深蓝',
} as const;
export type HumidifierType = typeof Humidifiers[keyof typeof Humidifiers];

export const TimeRanges = {
    DAY: '白天',
    NIGHT: '夜晚',
} as const;
export type TimeType = typeof TimeRanges[keyof typeof TimeRanges];

export const SpecialConditions = {
    MUCH: '营养过剩',
    LESS: '营养不良',
    BUG: '虫害'
} as const;
export type SpecialConditionType = typeof SpecialConditions[keyof typeof SpecialConditions];

// 常量：虚拟图鉴订单ID
export const VIRTUAL_ORDER_ID = 'ENCYCLOPEDIA_VIRTUAL_ORDER';

// --- 2. 核心数据模型 ---
// 菌种定义 (数据库行)
export interface MushroomDef {
    id: string;
    name: string;
    pinyin: string;
    starter: MushroomChildId; // 初始菌种的id
    wood?: WoodType; // 如果未定义，表示兼容任何木头
    light?: LightType; // 如果未定义，表示兼容任何灯
    humidifier?: HumidifierType; // 如果未定义，表示兼容任何湿度
    time?: TimeType; // 如果未定义，表示兼容任何时间
    special?: SpecialConditionType; // 如果未定义，就是不需要特殊情况
    save?: boolean // 如果有特殊情况，要不要处理
}

// 订单
export interface Order {
    id: string;
    name: string;
    items: { mushroomId: string; count: number }[];
    active: boolean; // 是否要做这个订单
}

// 用户存档数据
export interface UserSaveData {
    orders: Order[];
    inventory: Record<string, number>; // mushroomId -> count (库存)
    unlockedWoods: WoodType[];
    unlockedLights: LightType[];
    unlockedHumidifiers: HumidifierType[];
    // 新增：已收集的菌种ID列表
    collectedMushrooms: string[];
}

export interface Profile {
    id: string;
    name: string;
    data: UserSaveData;
}

export interface GlobalStorage {
    activeProfileId: string;
    profiles: Profile[];
    // 新增：图鉴最近操作记录 (V3 版本加入)
    recentIds: string[];
}