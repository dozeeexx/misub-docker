
import { StorageFactory } from '../../storage-adapter.js';
import { KV_KEY_SETTINGS } from '../config.js';
import { renderDisguisePage, createDisguiseResponse } from '../disguise-page.js';
import { authMiddleware } from '../auth-middleware.js';

/**
 * Handle Disguise Logic for Root and SPA paths.
 * Returns a Response if disguise should be effective (block access),
 * or null if access should be allowed (proceed to next handler/static asset).
 * 
 * @param {Object} context 
 * @returns {Promise<Response|null>}
 */
export async function handleDisguiseRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);

    // 1. Get Settings
    const storageAdapter = StorageFactory.createAdapter(env, await StorageFactory.getStorageType(env));
    const settingsData = await storageAdapter.get(KV_KEY_SETTINGS);
    const settings = settingsData || {};
    const disguise = settings.disguise;

    // If disguise is not enabled, allow everything.
    if (!disguise || !disguise.enabled) {
        return null;
    }

    // 2. Check Authentication
    // If user is already logged in, they bypass disguise.
    const isAuthenticated = await authMiddleware(request, env);
    if (isAuthenticated) {
        return null; // Proceed
    }

    // 3. Disguise Logic
    // If we are here, User is NOT authenticated. we check if we should block the request.

    // [Public Page Logic]
    // If Public Page is enabled, we allow access to root '/' and '/login'.
    // Otherwise, they are blocked by Disguise.
    const isPublicAccessAllowed = settings.enablePublicPage && (url.pathname === '/' || url.pathname === '/login');
    if (isPublicAccessAllowed) {
        return null; // Allow access
    }

    // List of protected SPA routes that should be hidden/disguised
    const isProtectedPath = [
        '/',
        '/groups',
        '/nodes',
        '/subscriptions',
        '/settings',
        '/login',
        '/dashboard',
        '/profile'
    ].some(route => url.pathname === route || url.pathname.startsWith(route + '/'));

    if (isProtectedPath) {
        return createDisguiseResponse(disguise);
    }

    return null;
}
