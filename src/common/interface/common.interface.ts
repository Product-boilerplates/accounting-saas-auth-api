import { $Enums } from "../../../generated/prisma";

export interface IRequestUser {
  email: string;
  name: string | null;
  id: string;
  username: string;
  status: $Enums.UserStatus;
  roles: {
    role: {
      name: string;
      id: string;
      permissions: {
        permission: {
          resource: string;
          action: $Enums.PermissionAction;
        };
      }[];
    };
  }[];
}
