import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  Res,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateStageDto } from './dto/create-stage.dto';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import type { AuthUser } from '../auth/auth-user';

@ApiTags('projects')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @Roles('ADMIN', 'PROJECT_MANAGER')
  @ApiOperation({ summary: 'Create project' })
  create(
    @Body() createProjectDto: CreateProjectDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.projectsService.create(createProjectDto, req.user?.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get projects (scoped by role)' })
  findAll(@Request() req: { user: AuthUser }) {
    return this.projectsService.findAll(req.user);
  }

  @Post(':id/documents')
  @ApiOperation({ summary: 'Upload a project document' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  uploadDocument(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: { user: AuthUser },
  ) {
    return this.projectsService.uploadDocument(id, file, req.user);
  }

  @Get(':id/documents')
  @ApiOperation({ summary: 'List project documents' })
  listDocuments(@Param('id') id: string, @Request() req: { user: AuthUser }) {
    return this.projectsService.listDocuments(id, req.user);
  }

  @Get(':id/detail')
  @ApiOperation({ summary: 'Get project progress detail (admin or project members)' })
  getDetail(@Param('id') id: string, @Request() req: { user: AuthUser }) {
    return this.projectsService.getDetail(id, req.user);
  }

  @Get(':id/documents/:docId')
  @ApiOperation({ summary: 'View or download a project document' })
  async getDocument(
    @Param('id') id: string,
    @Param('docId') docId: string,
    @Query('disposition') disposition: string | undefined,
    @Request() req: { user: AuthUser },
    @Res({ passthrough: true }) res: Response,
  ) {
    const file = await this.projectsService.getDocumentFile(id, docId, req.user);
    const mode = disposition === 'inline' ? 'inline' : 'attachment';
    const safeName = file.originalName.replace(/"/g, '');
    res.set({
      'Content-Type': file.mimeType,
      'Content-Disposition': `${mode}; filename="${safeName}"`,
      'Content-Length': String(file.size),
    });
    return new StreamableFile(file.stream);
  }

  @Delete(':id/documents/:docId')
  @Roles('ADMIN', 'PROJECT_MANAGER')
  @ApiOperation({ summary: 'Delete a project document' })
  deleteDocument(
    @Param('id') id: string,
    @Param('docId') docId: string,
    @Request() req: { user: AuthUser },
  ) {
    return this.projectsService.deleteDocument(id, docId, req.user);
  }

  @Get(':id/milestones')
  @ApiOperation({ summary: 'List project milestones (any project member)' })
  listMilestones(@Param('id') id: string, @Request() req: { user: AuthUser }) {
    return this.projectsService.listMilestones(id, req.user);
  }

  @Post(':id/milestones')
  @Roles('ADMIN', 'PROJECT_MANAGER', 'TEAM_LEAD')
  @ApiOperation({ summary: 'Create project milestone' })
  createMilestone(
    @Param('id') id: string,
    @Body() dto: CreateMilestoneDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.projectsService.createMilestone(id, dto, req.user);
  }

  @Delete(':id/milestones/:milestoneId')
  @Roles('ADMIN', 'PROJECT_MANAGER')
  @ApiOperation({ summary: 'Delete project milestone' })
  deleteMilestone(
    @Param('id') id: string,
    @Param('milestoneId') milestoneId: string,
    @Request() req: { user: AuthUser },
  ) {
    return this.projectsService.deleteMilestone(id, milestoneId, req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project by id' })
  findOne(@Param('id') id: string, @Request() req: { user: AuthUser }) {
    return this.projectsService.findOne(id, req.user);
  }

  @Post(':id/stages')
  @Roles('ADMIN', 'PROJECT_MANAGER', 'TEAM_LEAD')
  @ApiOperation({ summary: 'Add a custom kanban stage' })
  addStage(@Param('id') id: string, @Body() dto: CreateStageDto) {
    return this.projectsService.addStage(id, dto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update project (admin only)' })
  update(@Param('id') id: string, @Body() updateProjectDto: UpdateProjectDto) {
    return this.projectsService.update(id, updateProjectDto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete project (admin only)' })
  remove(@Param('id') id: string) {
    return this.projectsService.remove(id);
  }
}
