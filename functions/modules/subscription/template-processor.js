import { groupNodeLinesByRegion } from './region-groups.js';

/**
 * 对模板模型进行智能化增强
 * 核心逻辑：在不破坏模板原有分流规则的前提下，注入自动生成的地区策略组
 * 
 * @param {Object} model - 统一模板模型 (TemplateModel)
 * @returns {Object} 增强后的模型
 */
export function applySmartModelOptimizations(model) {
    const { ruleLevel } = model.meta;
    
    // 如果是精简版 (base)，则不进行任何注入，保持模板原样
    if (!ruleLevel || ruleLevel.toLowerCase() === 'base') {
        return model;
    }

    // 1. 获取所有节点的名称
    const proxyNames = model.proxies.map(p => p.name || p.tag).filter(Boolean);
    if (proxyNames.length === 0) return model;

    // 2. 识别地区分组
    const nodeEntries = proxyNames.map(name => ({ tag: name }));
    const regions = groupNodeLinesByRegion(nodeEntries);
    if (regions.length === 0) return model;

    // 3. 将抽象地区数据转换为模板模型的分组格式
    const newGroupNames = [];
    regions.forEach(region => {
        // 避免重复定义已存在的同名分组
        if (model.groups.some(g => g.name === region.name)) return;

        model.groups.push({
            name: region.name,
            type: 'url-test',
            members: region.tags,
            options: {
                url: 'http://www.gstatic.com/generate_204',
                interval: '300',
                tolerance: '50'
            }
        });
        newGroupNames.push(region.name);
    });

    if (newGroupNames.length === 0) return model;

    // 4. 寻找目标“主选择器”进行注入
    // 逻辑：寻找名称中包含“选择”、“Proxy”、“Fallback”或是列表第一项的分组
    const mainGroupCandidates = model.groups.filter(g => 
        /选择|Proxy|Default|Global|Main|select/i.test(g.name)
    );

    // 如果没找到明确的，就取第一个（通常 INI 模板的第一项就是主入口）
    const targetGroup = mainGroupCandidates.length > 0 ? mainGroupCandidates[0] : model.groups[0];

    if (targetGroup && Array.isArray(targetGroup.members)) {
        // 将新生成的地区组注入到现有成员中（排在最前面，但位于可能的“自动/优选”组之后）
        const autoSelectIdx = targetGroup.members.findIndex(m => /自动|优选|Auto|Best/i.test(m));
        const insertIdx = autoSelectIdx !== -1 ? autoSelectIdx + 1 : 0;
        
        targetGroup.members.splice(insertIdx, 0, ...newGroupNames);
    }

    return model;
}
