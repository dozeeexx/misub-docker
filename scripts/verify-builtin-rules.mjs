#!/usr/bin/env node
import yaml from 'js-yaml';
import { TRANSFORM_ASSETS } from '../src/constants/transform-assets.js';
import { BUILTIN_TEMPLATE_REGISTRY, getBuiltinTemplate } from '../functions/modules/subscription/builtin-template-registry.js';
import { REMOTE_SOURCES } from '../functions/modules/subscription/builtin-rules-provider.js';
import {
    renderClashFromIniTemplate,
    renderSingboxFromIniTemplate,
    renderSurgeFromIniTemplate,
    renderLoonFromIniTemplate,
    renderQuanxFromIniTemplate,
    renderEgernFromIniTemplate
} from '../functions/modules/subscription/template-pipeline.js';
import { transformBuiltinSubscription } from '../functions/modules/subscription/transformer-factory.js';

const quiet = process.argv.includes('--quiet');
const errors = [];
const summaries = [];

const COUNTRY_GROUP_LABELS = [
    '🇭🇰 香港节点',
    '🇹🇼 台湾节点',
    '🇯🇵 日本节点',
    '🇸🇬 狮城节点',
    '🌍 狮城节点',
    '🇺🇸 美国节点',
    '🇺🇲 美国节点',
    '🇰🇷 韩国节点',
    '🇬🇧 英国节点'
];

const SPECIAL_TARGETS = new Set([
    'DIRECT',
    'direct',
    'REJECT',
    'reject',
    'REJECT-DROP',
    'REJECT-TINYGIF',
    'PASS',
    'GLOBAL',
    'COMPATIBLE'
]);

const SAMPLE_PROXIES = [
    { name: 'HK 01', type: 'ss', server: 'hk.example.com', port: 443, cipher: 'aes-128-gcm', password: 'x' },
    { name: 'JP 01', type: 'ss', server: 'jp.example.com', port: 443, cipher: 'aes-128-gcm', password: 'x' },
    { name: 'US 01', type: 'ss', server: 'us.example.com', port: 443, cipher: 'aes-128-gcm', password: 'x' },
    { name: 'SG 01', type: 'ss', server: 'sg.example.com', port: 443, cipher: 'aes-128-gcm', password: 'x' }
];

const NODE_LIST = [
    'trojan://password@1.2.3.4:443?sni=example.com#HK-01',
    'ss://YWVzLTEyOC1nY206cGFzc3dvcmQ=@1.2.3.5:8388#JP-01',
    'trojan://password@1.2.3.6:443?sni=example.com#US-01',
    'ss://YWVzLTEyOC1nY206cGFzc3dvcmQ=@1.2.3.7:8388#SG-01'
].join('\n');

function fail(message) {
    errors.push(message);
}

function isForbiddenCountryGroupName(value) {
    const text = String(value || '');
    return COUNTRY_GROUP_LABELS.some(label => text === label || text.includes(label));
}

function assertNoForbiddenCountryGroups(values, label) {
    const matches = Array.from(new Set(
        values
            .map(value => String(value || ''))
            .filter(Boolean)
            .filter(isForbiddenCountryGroupName)
    ));
    if (matches.length > 0) {
        fail(`${label} must not contain country/region auto node groups: ${matches.join(', ')}`);
    }
}

function assertUnique(values, label) {
    const seen = new Set();
    const duplicates = new Set();
    for (const value of values.filter(Boolean)) {
        if (seen.has(value)) duplicates.add(value);
        seen.add(value);
    }
    if (duplicates.size > 0) {
        fail(`${label} has duplicate names: ${Array.from(duplicates).join(', ')}`);
    }
}

function clashRuleTarget(rule) {
    if (typeof rule !== 'string') return '';
    const parts = rule.split(',').map(part => part.trim()).filter(Boolean);
    if (parts.length < 2) return '';
    return parts.at(-1)?.toLowerCase() === 'no-resolve' ? parts.at(-2) : parts.at(-1);
}

function checkClashConfig(rendered, label) {
    let parsed;
    try {
        parsed = yaml.load(rendered);
    } catch (error) {
        fail(`${label} Clash YAML parse failed: ${error.message}`);
        return;
    }

    const proxies = Array.isArray(parsed?.proxies) ? parsed.proxies : [];
    const groups = Array.isArray(parsed?.['proxy-groups']) ? parsed['proxy-groups'] : [];
    const rules = Array.isArray(parsed?.rules) ? parsed.rules : [];
    const providers = parsed?.['rule-providers'] && typeof parsed['rule-providers'] === 'object'
        ? parsed['rule-providers']
        : {};

    if (proxies.length === 0) fail(`${label} Clash config has no proxies.`);
    if (groups.length === 0) fail(`${label} Clash config has no proxy-groups.`);
    if (rules.length === 0) fail(`${label} Clash config has no rules.`);

    const proxyNames = new Set(proxies.map(proxy => proxy?.name).filter(Boolean));
    const groupNameList = groups.map(group => group?.name).filter(Boolean);
    const groupNames = new Set(groupNameList);
    assertUnique(groupNameList, `${label} Clash proxy-groups`);
    assertNoForbiddenCountryGroups(groupNameList, `${label} Clash proxy-group names`);

    for (const group of groups) {
        const name = group?.name || '<unnamed>';
        const members = Array.isArray(group?.proxies) ? group.proxies : [];
        if (members.length === 0) {
            fail(`${label} Clash group ${name} has no members.`);
            continue;
        }
        assertNoForbiddenCountryGroups(members, `${label} Clash group ${name} members`);
        for (const member of members) {
            if (!SPECIAL_TARGETS.has(member) && !proxyNames.has(member) && !groupNames.has(member)) {
                fail(`${label} Clash group ${name} references missing member: ${member}`);
            }
        }
    }

    for (const rawRule of rules) {
        const rule = String(rawRule || '');
        const parts = rule.split(',').map(part => part.trim());
        if (parts[0] === 'RULE-SET' && !providers[parts[1]]) {
            fail(`${label} Clash rule references missing rule-provider: ${parts[1]}`);
        }
        const target = clashRuleTarget(rule);
        if (target && !SPECIAL_TARGETS.has(target) && !groupNames.has(target)) {
            fail(`${label} Clash rule references missing policy group: ${target}`);
        }
    }
}

function checkSingboxConfig(rendered, label) {
    let parsed;
    try {
        parsed = JSON.parse(rendered);
    } catch (error) {
        fail(`${label} sing-box JSON parse failed: ${error.message}`);
        return;
    }

    const outbounds = Array.isArray(parsed?.outbounds) ? parsed.outbounds : [];
    const rules = Array.isArray(parsed?.route?.rules) ? parsed.route.rules : [];
    const ruleSets = Array.isArray(parsed?.route?.rule_set) ? parsed.route.rule_set : [];
    if (outbounds.length === 0) fail(`${label} sing-box config has no outbounds.`);
    if (!parsed?.route) fail(`${label} sing-box config has no route object.`);
    if (rules.length === 0) fail(`${label} sing-box config has no route rules.`);

    const outboundTagList = outbounds.map(outbound => outbound?.tag).filter(Boolean);
    const ruleSetTagList = ruleSets.map(ruleSet => ruleSet?.tag).filter(Boolean);
    const outboundTags = new Set(outboundTagList);
    const ruleSetTags = new Set(ruleSetTagList);
    assertUnique(outboundTagList, `${label} sing-box outbounds`);
    assertUnique(ruleSetTagList, `${label} sing-box rule sets`);
    assertNoForbiddenCountryGroups(outboundTagList, `${label} sing-box outbound tags`);

    for (const outbound of outbounds) {
        const tag = outbound?.tag || '<unnamed>';
        const members = Array.isArray(outbound?.outbounds) ? outbound.outbounds : [];
        if (['selector', 'urltest', 'fallback'].includes(outbound?.type) && members.length === 0) {
            fail(`${label} sing-box outbound ${tag} has no members.`);
        }
        assertNoForbiddenCountryGroups(members, `${label} sing-box outbound ${tag} members`);
        for (const member of members) {
            if (!outboundTags.has(member)) {
                fail(`${label} sing-box outbound ${tag} references missing outbound: ${member}`);
            }
        }
    }

    for (const rule of rules) {
        const outboundRefs = Array.isArray(rule?.outbound) ? rule.outbound : (rule?.outbound ? [rule.outbound] : []);
        for (const outbound of outboundRefs) {
            if (!outboundTags.has(outbound)) {
                fail(`${label} sing-box route rule references missing outbound: ${outbound}`);
            }
        }

        const ruleSetRefs = Array.isArray(rule?.rule_set) ? rule.rule_set : (rule?.rule_set ? [rule.rule_set] : []);
        for (const ruleSet of ruleSetRefs) {
            if (!ruleSetTags.has(ruleSet)) {
                fail(`${label} sing-box route rule references missing rule_set: ${ruleSet}`);
            }
        }
    }
}

function assertTextConfig(rendered, label, requiredSections = []) {
    assertNoForbiddenCountryGroups(rendered.split(/\r?\n/), label);
    for (const section of requiredSections) {
        if (!rendered.includes(section)) {
            fail(`${label} missing required section ${section}.`);
        }
    }
}

function checkEgernConfig(rendered, label) {
    let parsed;
    try {
        parsed = yaml.load(rendered);
    } catch (error) {
        fail(`${label} Egern YAML parse failed: ${error.message}`);
        return;
    }
    if (!Array.isArray(parsed?.proxies) || parsed.proxies.length === 0) fail(`${label} Egern config has no proxies.`);
    if (!Array.isArray(parsed?.policy_groups) || parsed.policy_groups.length === 0) fail(`${label} Egern config has no policy_groups.`);
    if (!Array.isArray(parsed?.rules) || parsed.rules.length === 0) fail(`${label} Egern config has no rules.`);
    const groupNames = (parsed?.policy_groups || []).map(group => group?.name).filter(Boolean);
    assertNoForbiddenCountryGroups(groupNames, `${label} Egern policy group names`);
}

function verifyBuiltinRemoteSources() {
    if (REMOTE_SOURCES.ADS?.clash !== 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Providers/BanAD.yaml') {
        fail('REMOTE_SOURCES.ADS.clash must use the live ACL4SSR Clash/Providers/BanAD.yaml provider path.');
    }

    for (const [key, source] of Object.entries(REMOTE_SOURCES)) {
        for (const [format, url] of Object.entries(source)) {
            if (format === 'name' || typeof url !== 'string' || !url.startsWith('http')) continue;
            if (url === 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Providers/Ruleset/BanAD.yaml') {
                fail(`REMOTE_SOURCES.${key}.${format} uses removed ACL4SSR BanAD provider path: ${url}`);
            }
            if ((format === 'singbox' || format === 'sing-box') && !url.endsWith('.srs')) {
                fail(`REMOTE_SOURCES.${key}.${format} should use a binary .srs rule set: ${url}`);
            }
        }
    }
}

function verifyBuiltinPresetAssets() {
    const sublinkAssets = TRANSFORM_ASSETS.configs.filter(asset =>
        /sublink[-_ ]?worker/i.test(`${asset.name} ${asset.url} ${asset.description || ''}`)
    );
    if (sublinkAssets.length > 0) {
        fail(`Sublink Worker presets must stay removed; found assets: ${sublinkAssets.map(asset => asset.url).join(', ')}`);
    }

    const builtinAssets = TRANSFORM_ASSETS.configs.filter(asset => asset.sourceType === 'builtin-preset');
    const defaultAssets = builtinAssets.filter(asset => asset.is_default);
    if (defaultAssets.length !== 1 || defaultAssets[0]?.url !== 'builtin:clash_misub_minimal') {
        fail('Exactly one builtin preset must be default, and it must be builtin:clash_misub_minimal.');
    }

    for (const asset of builtinAssets) {
        const templateId = String(asset.url || '').replace(/^builtin:/, '');
        if (!asset.url?.startsWith('builtin:') || !getBuiltinTemplate(templateId)) {
            fail(`Builtin preset asset ${asset.name} references missing template: ${asset.url}`);
        }
    }
}

function verifyRegistryTemplates() {
    for (const [templateId, template] of Object.entries(BUILTIN_TEMPLATE_REGISTRY)) {
        const label = `builtin template ${templateId}`;
        if (/sublink[-_ ]?worker/i.test(`${templateId} ${template.name} ${template.description || ''} ${template.content || ''}`)) {
            fail(`${label} must not contain Sublink Worker references.`);
        }

        checkClashConfig(renderClashFromIniTemplate(template.content, {
            proxies: SAMPLE_PROXIES,
            ruleLevel: 'std',
            targetFormat: 'clash'
        }), label);

        checkSingboxConfig(renderSingboxFromIniTemplate(template.content, {
            proxies: SAMPLE_PROXIES,
            ruleLevel: 'std',
            targetFormat: 'singbox'
        }), label);

        assertTextConfig(renderSurgeFromIniTemplate(template.content, {
            proxies: SAMPLE_PROXIES,
            ruleLevel: 'std',
            targetFormat: 'surge'
        }), `${label} Surge`, ['[Proxy]', '[Proxy Group]', '[Rule]']);

        assertTextConfig(renderLoonFromIniTemplate(template.content, {
            proxies: SAMPLE_PROXIES,
            ruleLevel: 'std',
            targetFormat: 'loon'
        }), `${label} Loon`, ['[Proxy]', '[Proxy Group]', '[Rule]']);

        assertTextConfig(renderQuanxFromIniTemplate(template.content, {
            proxies: SAMPLE_PROXIES,
            ruleLevel: 'std',
            targetFormat: 'quanx'
        }), `${label} Quantumult X`, ['[server_local]', '[policy]', '[filter_local]']);

        checkEgernConfig(renderEgernFromIniTemplate(template.content, {
            proxies: SAMPLE_PROXIES,
            ruleLevel: 'std',
            targetFormat: 'egern'
        }), label);

        summaries.push(`${templateId}: ok`);
    }
}

function verifyBuiltinTargets() {
    const targetChecks = [
        ['clash', rendered => checkClashConfig(rendered, 'builtin target clash')],
        ['singbox', rendered => checkSingboxConfig(rendered, 'builtin target singbox')],
        ['surge&ver=4', rendered => assertTextConfig(rendered, 'builtin target Surge', ['[Proxy]', '[Proxy Group]', '[Rule]'])],
        ['loon', rendered => assertTextConfig(rendered, 'builtin target Loon', ['[Proxy]', '[Proxy Group]', '[Rule]'])],
        ['quanx', rendered => assertTextConfig(rendered, 'builtin target Quantumult X', ['[server_local]', '[policy]', '[filter_local]'])],
        ['egern', rendered => checkEgernConfig(rendered, 'builtin target Egern')]
    ];

    for (const [target, check] of targetChecks) {
        const rendered = transformBuiltinSubscription(NODE_LIST, target, {
            fileName: `Rules Verify ${target}`,
            ruleLevel: 'std',
            addFlagEmoji: false,
            managedConfigUrl: `https://example.com/sub?target=${encodeURIComponent(target)}&builtin=1`
        });
        if (typeof rendered !== 'string' || rendered.length === 0) {
            fail(`builtin target ${target} rendered an empty config.`);
            continue;
        }
        check(rendered);
    }
}

verifyBuiltinPresetAssets();
verifyBuiltinRemoteSources();
verifyRegistryTemplates();
verifyBuiltinTargets();

if (errors.length > 0) {
    console.error('\nBuiltin rules verification failed:');
    for (const error of errors) {
        console.error(`- ${error}`);
    }
    process.exit(1);
}

if (!quiet) {
    console.info('Builtin rules verification passed.');
    console.info(`Verified ${summaries.length} built-in templates and all built-in target generators.`);
}
