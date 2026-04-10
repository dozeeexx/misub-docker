import yaml from 'js-yaml';
import { clashFix } from '../../../utils/format-utils.js';
import { normalizeUnifiedTemplateModel } from '../template-model.js';

function mapGroupType(type) {
    const normalized = String(type || '').trim().toLowerCase();
    if (normalized === 'url-test' || normalized === 'fallback' || normalized === 'load-balance' || normalized === 'relay' || normalized === 'select') {
        return normalized;
    }
    return 'select';
}

function mapRule(rule) {
    const type = String(rule.type || '').toUpperCase();
    if (!type) return null;
    if (type === 'MATCH') return `MATCH,${rule.policy}`;
    if (type === 'GEOIP') return `GEOIP,${rule.value || 'CN'},${rule.policy}`;
    if (type === 'RULE-SET') return `RULE-SET,${rule.value},${rule.policy}`;
    return `${type},${rule.value},${rule.policy}`;
}

export function renderClashFromTemplateModel(model) {
    const normalizedModel = normalizeUnifiedTemplateModel(model);
    const config = {
        'mixed-port': 7890,
        'allow-lan': true,
        'mode': 'rule',
        'log-level': 'info',
        'external-controller': ':9090',
        'proxies': normalizedModel.proxies,
        'proxy-groups': normalizedModel.groups
            .filter(group => Array.isArray(group.members) && group.members.length > 0)
            .map(group => ({
                name: group.name,
                type: mapGroupType(group.type),
                proxies: group.members,
                filter: Array.isArray(group.filters) && group.filters.length > 0 ? group.filters.join('|') : undefined,
                ...group.options
            })),
        'rules': normalizedModel.rules.map(mapRule).filter(Boolean),
        'profile': {
            'store-selected': true,
            'subscription-url': normalizedModel.settings.managedConfigUrl || ''
        }
    };

    let yamlStr = yaml.dump(config, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
        quotingType: '"',
        forceQuotes: false
    });
    yamlStr = clashFix(yamlStr);
    return yamlStr;
}
