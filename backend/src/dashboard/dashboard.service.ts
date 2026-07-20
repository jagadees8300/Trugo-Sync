import { Injectable } from '@nestjs/common';
import { TasksService } from '../tasks/tasks.service';
import { ProjectsService } from '../projects/projects.service';
import type { AuthUser } from '../auth/auth-user';

@Injectable()
export class DashboardService {
  constructor(
    private readonly tasksService: TasksService,
    private readonly projectsService: ProjectsService,
  ) {}

  getStats() {
    return this.tasksService.getStats();
  }

  getTeamStatus() {
    return this.tasksService.getTeamStatus();
  }

  getProjectProgress() {
    return this.tasksService.getProjectProgress();
  }

  getProjectDetail(projectId: string) {
    return this.tasksService.getProjectDetail(projectId);
  }

  getMyStats(requester: AuthUser) {
    return this.tasksService.getMyStats(requester);
  }

  async getUpcomingDeadlines() {
    const projects = await this.projectsService.findAll();
    return projects
      .filter((p: any) => p.deadline)
      .sort((a: any, b: any) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      .slice(0, 5)
      .map((p: any) => ({
        id: p._id,
        name: p.name,
        deadline: p.deadline,
      }));
  }
}
