import {
  Controller,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../auth/auth-user';

@ApiTags('notifications')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('me')
  @ApiOperation({
    summary: 'List notifications for current user (message, sender, date)',
  })
  @ApiResponse({ status: 200, description: 'Notifications with sender name' })
  findMine(@Req() req: { user: AuthUser }) {
    return this.notificationsService.findForUser(req.user.userId, req.user);
  }

  @Get('me/unread-count')
  @ApiOperation({ summary: 'Unread notification count for current user' })
  unreadCount(@Req() req: { user: AuthUser }) {
    return this.notificationsService
      .countUnread(req.user.userId)
      .then((count) => ({ count }));
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get unread notifications for a user' })
  @ApiResponse({ status: 200, description: 'Unread notifications list' })
  findUnread(@Param('userId') userId: string) {
    return this.notificationsService.findUnreadByUser(userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked read' })
  markRead(@Param('id') id: string, @Req() req: { user: AuthUser }) {
    return this.notificationsService.markRead(id, req.user);
  }
}
