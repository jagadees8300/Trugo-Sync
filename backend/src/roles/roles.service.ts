import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role } from './schemas/role.schema';

@Injectable()
export class RolesService implements OnModuleInit {
  constructor(@InjectModel(Role.name) private roleModel: Model<Role>) {}

  async onModuleInit() {
    for (const name of ['ADMIN', 'HR', 'PROJECT_MANAGER', 'TEAM_LEAD', 'EMPLOYEE']) {
      const exists = await this.roleModel.findOne({ name });
      if (!exists) {
        await this.roleModel.create({ name });
      }
    }
  }

  async findByName(name: string) {
    return this.roleModel.findOne({ name });
  }
}
