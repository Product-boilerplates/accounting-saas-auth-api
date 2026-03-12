import { BaseService } from "../../core/base";

export class UserService extends BaseService {
  me = async (payload: { userId: string }) => {
    const { userId } = payload;

    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        status: true,
        created_at: true,
        two_fa_enabled: true,
        roles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
                permissions: {
                  select: {
                    permission: {
                      select: {
                        id: true,
                        resource: true,
                        action: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) return this.throwError("User not found.");

    // Transform for cleaner frontend response
    const formattedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      status: user.status,
      twoFaEnabled: user.two_fa_enabled,
      createdAt: user.created_at,

      roleName: user.roles[0].role.name,
      // Flattened permissions per user (merge all roles)
      permissions: user.roles.reduce(
        (acc, r) => {
          r.role.permissions.forEach((p) => {
            const resource = p.permission.resource;
            const action = p.permission.action;

            if (!acc[resource]) acc[resource] = [];
            if (!acc[resource].includes(action)) acc[resource].push(action);
          });
          return acc;
        },
        {} as Record<string, string[]>,
      ), // { user: ["CREATE","UPDATE","DELETE"], role: ["READ",...] }
    };

    return {
      success: true,
      statusCode: 200,
      message: "User found.",
      data: formattedUser,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  };

  getAllUsers = async (payload: { page?: number; size?: number }) => {
    const page = payload.page || 1;
    const size = payload.size || 20;
    const skip = (page - 1) * size;

    const users = await this.db.user.findMany({
      skip,
      take: size,
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        status: true,
        created_at: true,
        two_fa_enabled: true,
        roles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    const formattedUsers = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      status: user.status,
      twoFaEnabled: user.two_fa_enabled,
      createdAt: user.created_at,
      roleName: user.roles[0]?.role.name ?? null,
    }));

    const total = await this.db.user.count();

    return {
      success: true,
      statusCode: 200,
      message: "Users retrieved successfully",
      data: formattedUsers,
      meta: {
        page,
        size,
        total,
        totalPages: Math.ceil(total / size),
        timestamp: new Date().toISOString(),
      },
    };
  };
}
