import Workgroup from "@enums/workgroup.enum";


export const isWorkGroup = (group?: number | Workgroup): boolean => {
    if (!group) return false;

    return group >= 9 && group <= 13;
}