"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersService = exports.UsersService = void 0;
const data_source_1 = require("../../data-source");
const user_entity_1 = require("./user.entity");
const bcrypt_1 = __importDefault(require("bcrypt"));
const userRepo = data_source_1.AppDataSource.getRepository(user_entity_1.User);
class UsersService {
    async create(name, email, password, role = 'standard') {
        const hash = await bcrypt_1.default.hash(password, 10);
        const user = userRepo.create({ name, email, password_hash: hash, role });
        return userRepo.save(user);
    }
    async findByEmail(email) {
        return userRepo.findOneBy({ email });
    }
    async findById(id) {
        return userRepo.findOneBy({ id });
    }
}
exports.UsersService = UsersService;
exports.usersService = new UsersService();
