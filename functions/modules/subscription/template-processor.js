import { groupNodeLinesByRegion } from './region-groups.js';

/**
 * 解析并扩展策略组中的正则过滤器
 * @param {Object} model - 统一模板模型
 */
function resolveGroupFilters(model) {
    const proxyNames = model.proxies.map(p => p.name || p.tag).filter(Boolean);
    if (proxyNames.length === 0) return;

    model.groups.forEach(group => {
        if (!Array.isArray(group.filters) || group.filters.length === 0) return;

        group.members = group.members || [];
        const currentMembers = new Set(group.members);

        group.filters.forEach(filter => {
            if (filter === '.*') {
                proxyNames.forEach(name => currentMembers.add(name));
                return;
            }

            try {
                const regex = new RegExp(filter, 'i');
                proxyNames.forEach(name => {
                    if (regex.test(name)) {
                        currentMembers.add(name);
                    }
                });
            } catch (e) {
                console.warn(`[Template Processor] Invalid regex filter: ${filter}`, e);
            }
        });

        group.members = Array.from(currentMembers);
    });
}

/**
 * 递归修剪所有成员为空的策略组，并清理相关引用
 * @param {Object} model - 统一模板模型
 */
function pruneEmptyGroups(model) {
    let changed = true;
    while (changed) {
        changed = false;
        const emptyGroupNames = new Set(
            model.groups
                .filter(g => (!Array.isArray(g.members) || g.members.length === 0))
                .map(g => g.name)
        );

        if (emptyGroupNames.size === 0) break;

        // 1. 移除空组本身
        const initialCount = model.groups.length;
        model.groups = model.groups.filter(g => !emptyGroupNames.has(g.name));
        if (model.groups.length !== initialCount) changed = true;

        // 2. 从其它组的成员列表中移除对空组的引用
        model.groups.forEach(group => {
            if (Array.isArray(group.members)) {
                const newMembers = group.members.filter(m => !emptyGroupNames.has(m));
                if (newMembers.length !== group.members.length) {
                    group.members = newMembers;
                    changed = true;
                }
            }
        });

        // 3. 从规则列表中移除指向空组的规则
        const initialRuleCount = model.rules.length;
        model.rules = model.rules.filter(rule => !emptyGroupNames.has(rule.policy));
        if (model.rules.length !== initialRuleCount) changed = true;
    }
}

/**
 * 对模板模型进行智能化增强
 * 核心逻辑：在不破坏模板原有分流规则的前提下，注入自动生成的地区策略组
 * 
 * @param {Object} model - 统一模板模型 (TemplateModel)
 * @returns {Object} 增强后的模型
 */
export function applySmartModelOptimizations(model) {
    const { ruleLevel } = model.meta;
    
    // 1. 执行现有的正则过滤器解析
    resolveGroupFilters(model);

    // 2. 如果是精简版 (base)，则执行完正则解析和基础修剪后即可返回
    if (!ruleLevel || ruleLevel.toLowerCase() === 'base') {
        pruneEmptyGroups(model);
        return model;
    }

    // 3. 准备获取所有节点的名称，用于后续注入
    const proxyNames = model.proxies.map(p => p.name || p.tag).filter(Boolean);
    if (proxyNames.length === 0) {
        pruneEmptyGroups(model);
        return model;
    }

    // 4. 识别地区分组并注入（如果模板中没有对应名称的组）
    const nodeEntries = proxyNames.map(name => ({ tag: name }));
    const regions = groupNodeLinesByRegion(nodeEntries);
    
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

    // 5. 寻找目标“主选择器”进行注入
    if (newGroupNames.length > 0) {
        const mainGroupCandidates = model.groups.filter(g => 
            /选择|Proxy|Default|Global|Main|select/i.test(g.name)
        );
        const targetGroup = mainGroupCandidates.length > 0 ? mainGroupCandidates[0] : model.groups[0];

        if (targetGroup && Array.isArray(targetGroup.members)) {
            const autoSelectIdx = targetGroup.members.findIndex(m => /自动|优选|Auto|Best/i.test(m));
            const insertIdx = autoSelectIdx !== -1 ? autoSelectIdx + 1 : 0;
            targetGroup.members.splice(insertIdx, 0, ...newGroupNames);
        }
    }

    // 6. 最后进行一次全局修剪，确保所有空组（包括注入失败的）都被清理
    pruneEmptyGroups(model);

    return model;
}
