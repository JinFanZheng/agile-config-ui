/**
 * 服务端权限码（1.13.2 实测 30 个；名称即 UI 分组依据前缀）。
 * fail-closed：无权限码 = 不渲染操作入口（真正防线在服务端 PermissionCheck）。
 */
export const PERMISSION = {
  AppRead: 'APP_READ',
  AppAdd: 'APP_ADD',
  AppEdit: 'APP_EDIT',
  AppDelete: 'APP_DELETE',
  AppAuth: 'APP_AUTH',
  ConfigRead: 'CONFIG_READ',
  ConfigAdd: 'CONFIG_ADD',
  ConfigEdit: 'CONFIG_EDIT',
  ConfigDelete: 'CONFIG_DELETE',
  ConfigPublish: 'CONFIG_PUBLISH',
  ConfigOffline: 'CONFIG_OFFLINE',
  NodeRead: 'NODE_READ',
  NodeAdd: 'NODE_ADD',
  NodeDelete: 'NODE_DELETE',
  ClientRead: 'CLIENT_READ',
  ClientRefresh: 'CLIENT_REFRESH',
  ClientDisconnect: 'CLIENT_DISCONNECT',
  UserRead: 'USER_READ',
  UserAdd: 'USER_ADD',
  UserEdit: 'USER_EDIT',
  UserDelete: 'USER_DELETE',
  RoleRead: 'ROLE_READ',
  RoleAdd: 'ROLE_ADD',
  RoleEdit: 'ROLE_EDIT',
  RoleDelete: 'ROLE_DELETE',
  ServiceRead: 'SERVICE_READ',
  ServiceAdd: 'SERVICE_ADD',
  ServiceDelete: 'SERVICE_DELETE',
  LogRead: 'LOG_READ',
} as const

export type PermissionCode = (typeof PERMISSION)[keyof typeof PERMISSION]
