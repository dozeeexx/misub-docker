/**
 * MiSub Cloudflare Pages Functions - 主入口文件
 * 负责路由分发和请求协调
 *
 * 模块化架构v2:
 * - utils.js: 工具函数
 * - auth-middleware.js: 认证中间件
 * - notifications.js: 通知功能
 * - subscription.js: 订阅处理
 * - subscription-handler.js: 订阅请求处理
 * - api-handler.js: API处理
 * - api-router.js: API路由
 * - handlers/: 功能处理器模块
 *   - subscription-handler.js: 订阅相关处理
 *   - node-handler.js: 节点相关处理
 *   - debug-handler.js: 调试相关处理
 * - utils/: 工具模块
 *   - geo-utils.js: 地理识别工具
 *   - node-parser.js: 节点解析工具
 */

import { handleMisubRequest } from './modules/subscription-handler.js';
import { handleApiRequest } from './modules/api-router.js';
import { createJsonResponse } from './modules/utils.js';

/**
 * 主要的请求处理函数
 * @param {Object} context - Cloudflare上下文对象
 * @returns {Promise<Response>} HTTP响应
 */
export async function onRequest(context) {
    const { request, env, next } = context;
    const url = new URL(request.url);

    try {
        // 路由分发
        if (url.pathname.startsWith('/api/')) {
            // API 路由
            return await handleApiRequest(request, env);
        } else if (url.pathname.startsWith('/sub/')) {
            // MiSub 订阅路由
            return await handleMisubRequest(context);
        } else if (url.pathname === '/cron') {
            // 定时任务路由 (需要认证)
            // 支持两种认证方式：Header 或 URL 参数
            const cronAuthHeader = request.headers.get('Authorization');
            const cronSecretParam = url.searchParams.get('secret');
            const isAuthorized =
                cronAuthHeader === `Bearer ${env.CRON_SECRET}` ||
                cronSecretParam === env.CRON_SECRET;

            if (!isAuthorized) {
                return createJsonResponse({ error: 'Unauthorized' }, 401);
            }

            const { handleCronTrigger } = await import('./modules/notifications.js');
            return await handleCronTrigger(env);
        } else {
            // 静态文件处理
            const isStaticAsset = /^\/(assets|@vite|src)\/./.test(url.pathname) || /\.\w+$/.test(url.pathname);

            // SPA 路由白名单：这些请求应该交由前端路由处理，而不是作为订阅请求
            // [修复] 增加更多可能的SPA路由，防止被误判为订阅请求
            const isSpaRoute = [
                '/groups',
                '/nodes',
                '/subscriptions',
                '/settings',
                '/login',
                '/dashboard',
                '/profile'
            ].some(route => url.pathname === route || url.pathname.startsWith(route + '/'));

            if (!isStaticAsset && !isSpaRoute && url.pathname !== '/') {
                // 如果是浏览器请求且看起来像是一个页面访问，优先尝试返回 SPA
                // fix: 解决经典模式下可能的路由冲突
                const acceptHeader = request.headers.get('Accept') || '';
                if (acceptHeader.includes('text/html')) {
                    // 既然它不是静态资源，也不是已知的SPA路由，但请求的是HTML
                    // 我们可以选择:
                    // 1. 仍然尝试作为订阅处理 (如果用户在浏览器直接访问 shortlink)
                    // 2. 返回 next() 让前端处理 404

                    // 这里保持现有逻辑，但添加注释备忘。
                    // 既然目前通过 ui.js 强制跳转回 / 解决了经典模式的问题，
                    // 这里我们可以保留对短链接的支持。
                    // return next(); 
                }
                return await handleMisubRequest(context);
            }

            // Route protection for SPA pages
            // If accessing a protected route without auth, redirect to login
            if (isSpaRoute && url.pathname !== '/login') {
                const { authMiddleware } = await import('./modules/auth-middleware.js');
                const isAuthenticated = await authMiddleware(request, env);
                if (!isAuthenticated) {
                    // Redirect to login page
                    return new Response(null, {
                        status: 302,
                        headers: { Location: '/login' }
                    });
                }
            }

            // Continue to static assets or root
            return next();
        }
    } catch (error) {
        // 全局错误处理
        console.error('[Main Handler Error]', error);
        return createJsonResponse({
            error: 'Internal Server Error',
            message: error.message
        }, 500);
    }
}

/**
 * 调试信息导出 (仅开发环境)
 */
export const debugInfo = {
    version: '2.0.0-modular-v2',
    modules: [
        'utils',
        'auth-middleware',
        'notifications',
        'subscription',
        'subscription-handler',
        'api-handler',
        'api-router',
        'handlers/subscription-handler',
        'handlers/node-handler',
        'handlers/debug-handler',
        'utils/geo-utils',
        'utils/node-parser'
    ],
    architecture: 'modular-refactor-v2-domain-split'
};