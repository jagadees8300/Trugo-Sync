import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { Project, ProjectSchema } from './schemas/project.schema';
import { ProjectFile, ProjectFileSchema } from './schemas/project-file.schema';
import { Milestone, MilestoneSchema } from './schemas/milestone.schema';
import { Task, TaskSchema } from '../tasks/schemas/task.schema';
import { TasksModule } from '../tasks/tasks.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    AuthModule,
    NotificationsModule,
    MongooseModule.forFeature([
      { name: Project.name, schema: ProjectSchema },
      { name: ProjectFile.name, schema: ProjectFileSchema },
      { name: Milestone.name, schema: MilestoneSchema },
      { name: Task.name, schema: TaskSchema },
    ]),
    TasksModule,
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
