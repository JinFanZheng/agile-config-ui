import { apiGet, apiGetPage, apiPost, type Params } from '../lib/http'

/*
 * 权限域 API（ITER-07，15 端点，形状以 1.13.2 源码+实测为准）。
 * ⚠️ 实测事实：User/ResetPassword 重置为服务端写死的默认密码 "123456"（UI 必须明示）。
 */

// ---------- User ----------

export interface UserItem {
  id: string
  userName: string
  team?: string
  userRoleIds?: string[]
  userRoleNames?: string[]
}

export interface UserSearchParams extends Params {
  userName?: string
  team?: string
  current?: number
  pageSize?: number
}

export function searchUsers(params: UserSearchParams = {}) {
  return apiGetPage<UserItem>('/User/Search', params)
}

/** 新建用户（UserVM：userName/password/team/userRoleIds） */
export function addUser(input: {
  userName: string
  password: string
  team?: string
  userRoleIds: string[]
}) {
  return apiPost<void>('/User/Add', input)
}

/** 编辑用户（仅 team/userRoleIds 可改） */
export function editUser(input: { id: string; team?: string; userRoleIds: string[] }) {
  return apiPost<void>('/User/Edit', input)
}

/** 重置密码 → 固定默认密码 123456（源码 DefaultPassword 常量，UI 需明示） */
export function resetPassword(userId: string) {
  return apiPost<void>('/User/ResetPassword', undefined, { userId })
}

export function deleteUser(userId: string) {
  return apiPost<void>('/User/Delete', undefined, { userId })
}

/** 管理员用户（Id/UserName/Team） */
export function getAdminUsers() {
  return apiGet<UserItem[]>('/User/AdminUsers')
}

/** 全部活跃用户（应用授权选择器用） */
export function getAllUsers() {
  return apiGet<UserItem[]>('/User/AllUsers')
}

// ---------- Role ----------

export interface RoleItem {
  id: string
  name: string
  description?: string
  isSystem?: boolean
  functions: string[]
}

export function listRoles() {
  return apiGet<RoleItem[]>('/Role/List')
}

/** 系统支持的权限码清单（实测 30 个：APP、CONFIG、NODE、CLIENT、USER、ROLE、SERVICE、LOG 域） */
export function getSupportedPermissions() {
  return apiGet<string[]>('/Role/SupportedPermissions')
}

export function addRole(input: {
  id: string
  name: string
  description?: string
  functions: string[]
}) {
  return apiPost<void>('/Role/Add', input)
}

export function editRole(input: {
  id: string
  name: string
  description?: string
  functions: string[]
}) {
  return apiPost<void>('/Role/Edit', input)
}

export function deleteRole(id: string) {
  return apiPost<void>('/Role/Delete', undefined, { id })
}

// ---------- 应用授权 ----------

export function getUserAppAuth(appId: string) {
  return apiGet<{ appId: string; authorizedUsers: string[] }>('/App/GetUserAppAuth', { appId })
}

export function saveAppAuth(appId: string, authorizedUsers: string[]) {
  return apiPost<void>('/App/SaveAppAuth', { appId, authorizedUsers })
}
