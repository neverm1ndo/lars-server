export interface AdminUserData {
    user_id: number;
    username: string;
    user_avatar: string;
    main_group: number;
    secondary_group: number;
    prefrences?: number[] | Set<number>;
}