import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { Role, RoleSchema } from './schemas/role.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Role.name, schema: RoleSchema }])],
  providers: [RolesService],
  controllers: [RolesController],
  exports: [MongooseModule]
})
export class RolesModule {}
