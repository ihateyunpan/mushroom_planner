// src/database.ts
import {
    Humidifiers,
    type HumidifierType,
    Lights,
    type LightType,
    type MushroomChild,
    type MushroomChildId,
    MushroomChildIds,
    type MushroomDef,
    SpecialConditions, TimeRanges,
    Woods,
    type WoodType
} from './types';

// ... (原有的 MUSHROOM_CHILD_DB 和 MUSHROOM_CHILDREN 保持不变)
const MUSHROOM_CHILD_DB: MushroomChild[] = [
    {id: MushroomChildIds.CAO, name: '草帽菌',},
    {id: MushroomChildIds.CI, name: '刺头菌',},
    {id: MushroomChildIds.MAO, name: '猫爪菌',},
    {id: MushroomChildIds.PAO, name: '泡泡菌',},
    {id: MushroomChildIds.PAO, name: '泡泡菌',},
    {id: MushroomChildIds.SHAN_HU, name: '珊瑚菌',},
    {id: MushroomChildIds.NIAO, name: '鸟巢菌',},
];

export const MUSHROOM_CHILDREN: Record<MushroomChildId, MushroomChild> = Object.fromEntries(MUSHROOM_CHILD_DB.map((m) => {
    return [m.id, m];
})) as Record<MushroomChildId, MushroomChild>;


// --- 新增：道具详情信息 (来源) ---

export const WOOD_INFO: Record<WoodType, { source: string }> = {
    [Woods.BO_MU]: {source: '初始'},
    [Woods.QIAN_NIU]: {source: '白龙1'},
    [Woods.FENG_MU]: {source: ''},
    [Woods.CHANG]: {source: '7级'},
};

export const LIGHT_INFO: Record<LightType, { source: string }> = {
    [Lights.HUO]: {source: '初始'},
    [Lights.YU_RONG]: {source: '白龙2'},
};

export const HUMIDIFIER_INFO: Record<HumidifierType, { source: string }> = {
    [Humidifiers.ZHU]: {source: '初始'},
    [Humidifiers.NIAO]: {source: '白龙1'},
};


export const MUSHROOM_DB: MushroomDef[] = [
    {
        id: 'ci0',
        name: '未能长大的刺头菌',
        pinyin: 'wnzddctj',
        starter: MushroomChildIds.CI,
        special: SpecialConditions.BUG,
        save: false,
    },
    {
        id: 'ci1',
        name: '中等善良刺头菌',
        pinyin: 'zdslctj',
        starter: MushroomChildIds.CI,
        wood: Woods.BO_MU,
        light: Lights.HUO,
    },
    {
        id: 'ci2',
        name: '中等邪恶刺头菌',
        pinyin: 'zdxectj',
        starter: MushroomChildIds.CI,
        wood: Woods.BO_MU,
        light: Lights.HUO,
        special: SpecialConditions.LESS,
        save: true
    },
    {
        id: 'ci3',
        name: '中等寒冰刺头菌',
        pinyin: 'zdhbctj',
        starter: MushroomChildIds.CI,
        wood: Woods.BO_MU,
        light: Lights.HUO,
        special: SpecialConditions.MUCH,
        save: true
    },
    {
        id: 'ci4',
        name: '袖珍邪恶刺头菌',
        pinyin: 'xzxectj',
        starter: MushroomChildIds.CI,
        wood: Woods.QIAN_NIU,
        light: Lights.YU_RONG,
        humidifier: Humidifiers.ZHU,
        time: TimeRanges.NIGHT,
    },
    {
        id: 'mao0',
        name: '未能长大的猫爪菌',
        pinyin: 'wnzddmzj',
        starter: MushroomChildIds.MAO,
        special: SpecialConditions.BUG,
        save: false,
    },
    {
        id: 'mao1',
        name: '一般傲娇猫爪菌',
        pinyin: 'ybajmzj',
        starter: MushroomChildIds.MAO,
        wood: Woods.BO_MU,
        light: Lights.HUO,
    },
    {
        id: 'mao2',
        name: '一般萌萌猫爪菌',
        pinyin: 'ybmmmzj',
        starter: MushroomChildIds.MAO,
        wood: Woods.BO_MU,
        light: Lights.HUO,
        special: SpecialConditions.LESS,
        save: true,
    },
    {
        id: 'mao3',
        name: '一般暗黑猫爪菌',
        pinyin: 'ybahmzj',
        starter: MushroomChildIds.MAO,
        wood: Woods.BO_MU,
        light: Lights.HUO,
        special: SpecialConditions.MUCH,
        save: true,
    },
    {
        id: 'pao0',
        name: '未能长大的泡泡菌',
        pinyin: 'wnzddppj',
        starter: MushroomChildIds.PAO,
        special: SpecialConditions.BUG,
        save: false,
    },
    {
        id: 'pao1',
        name: '常见实习泡泡菌',
        pinyin: 'cjsxppj',
        starter: MushroomChildIds.PAO,
        wood: Woods.BO_MU,
    },
    {
        id: 'pao2',
        name: '常见新手泡泡菌',
        pinyin: 'cjxsppj',
        starter: MushroomChildIds.PAO,
        wood: Woods.BO_MU,
        special: SpecialConditions.LESS,
        save: true,
    },
    {
        id: 'pao3',
        name: '常见菜色泡泡菌',
        pinyin: 'cjcsppj',
        starter: MushroomChildIds.PAO,
        wood: Woods.BO_MU,
        special: SpecialConditions.MUCH,
        save: true,
    },
    {
        id: 'cao0',
        name: '未能长大的草帽菌',
        pinyin: 'wnzddcmj',
        starter: MushroomChildIds.CAO,
        special: SpecialConditions.BUG,
        save: false,
    },
    {
        id: 'cao1',
        name: '普通老土草帽菌',
        pinyin: 'ptltcmj',
        starter: MushroomChildIds.CAO,
        wood: Woods.BO_MU,
    },
    {
        id: 'cao2',
        name: '普通洁癖草帽菌',
        pinyin: 'ptjpcmj',
        starter: MushroomChildIds.CAO,
        wood: Woods.BO_MU,
        special: SpecialConditions.LESS,
        save: true,
    },
    {
        id: 'cao3',
        name: '普通健美草帽菌',
        pinyin: 'ptjmcmj',
        starter: MushroomChildIds.CAO,
        wood: Woods.BO_MU,
        special: SpecialConditions.MUCH,
        save: true,
    },
    {
        id: 'shanhu0',
        name: '未能长大的珊瑚菌',
        pinyin: 'wnzddshj',
        starter: MushroomChildIds.SHAN_HU,
        special: SpecialConditions.BUG,
        save: false,
    },
    {
        id: 'shanhu1',
        name: '中级贾诩珊瑚菌',
        pinyin: 'zjjxshj',
        starter: MushroomChildIds.SHAN_HU,
        wood: Woods.FENG_MU,
    },
    {
        id: 'shanhu2',
        name: '中级公孙珊瑚菌',
        pinyin: 'zjgsshj',
        starter: MushroomChildIds.SHAN_HU,
        wood: Woods.FENG_MU,
        special: SpecialConditions.LESS,
        save: true,
    },
    {
        id: 'shanhu3',
        name: '中级董奉珊瑚菌',
        pinyin: 'zjdfshj',
        starter: MushroomChildIds.SHAN_HU,
        wood: Woods.FENG_MU,
        special: SpecialConditions.MUCH,
        save: true,
    },
    {
        id: 'niao3',
        name: '标准可燃鸟巢菌',
        pinyin: 'bzkrncj',
        starter: MushroomChildIds.NIAO,
        wood: Woods.CHANG,
        light: Lights.HUO,
        humidifier: Humidifiers.NIAO,
        special: SpecialConditions.MUCH,
        save: true,
    },
];