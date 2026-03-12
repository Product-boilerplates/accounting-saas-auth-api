"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.users = void 0;
var bcrypt_1 = require("bcrypt");
exports.users = [
    {
        name: "Super Admin",
        email: "super_admin@example.com",
        username: "super_admin",
        password_hash: (0, bcrypt_1.hashSync)("admin123", 12),
        status: "ACTIVE",
        roles: ["super_admin"],
    },
    {
        name: "Regular User",
        email: "user@example.com",
        username: "regularuser",
        password_hash: (0, bcrypt_1.hashSync)("user123", 12),
        status: "ACTIVE",
        roles: ["user"],
    },
    {
        name: "Content Moderator",
        email: "moderator@example.com",
        username: "moderator",
        password_hash: (0, bcrypt_1.hashSync)("mod123", 12),
        status: "ACTIVE",
        roles: ["moderator"],
    },
];
