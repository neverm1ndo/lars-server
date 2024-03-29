export interface AdminUserData {
    user_id: number;
    username: string;
    user_avatar: string;
    main_group: number;
    secondary_group?: number;
    permissions: number[] | Set<number>;
    user_email?: string;
}

export interface LoginAdminUserData extends AdminUserData {
    user_password: string;
}