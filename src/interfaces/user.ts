import Workgroup from "@enums/workgroup.enum";

export interface IDBUser {
  user_id?: number;
  user_password?: string;
  username?: string;
  user_avatar?: string | null;
  user_email?: string;
  main_group?: Workgroup | number;
  secondary_group?: Workgroup;
}

export interface IUserData {
  id: number;
  username: string;
  avatar: string;
  main_group: number;
  secondary_group: number;
}

export interface IJwtPayload {
  id: number;
  username: string;
  main_group: Workgroup;
  permissions: Workgroup[];
};
