/**
 * @assetflow/shared
 *
 * Framework-agnostic domain enums, constants and DTO/response contracts shared
 * between the API (Express) and the Web client (Vite/React). Keeping these in a
 * single source of truth prevents the enum/string drift that plagues systems
 * where the frontend re-declares backend constants.
 */
export * from './enums.js';
export * from './constants.js';
export * from './types/api.js';
export * from './rbac.js';
