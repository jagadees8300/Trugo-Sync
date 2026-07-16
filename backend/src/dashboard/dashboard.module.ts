import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { TasksModule } from '../tasks/tasks.module';
import { ProjectsModule } from '../projects/projects.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule, TasksModule, ProjectsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
