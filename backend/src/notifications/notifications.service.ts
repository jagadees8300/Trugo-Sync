import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Notification,
  NotificationDocument,
  NotificationType,
} from './schemas/notification.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import type { AuthUser, AppRole } from '../auth/auth-user';
import { isAdmin } from '../auth/auth-user';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private eventsGateway: EventsGateway,
  ) {}

  async create(data: {
    userId: string;
    message: string;
    type: NotificationType;
    senderId?: string;
    targetUserId?: string;
  }) {
    const payload: Record<string, unknown> = {
      userId: new Types.ObjectId(data.userId),
      message: data.message,
      type: data.type,
      readStatus: false,
    };
    if (data.senderId && Types.ObjectId.isValid(data.senderId)) {
      payload.senderId = new Types.ObjectId(data.senderId);
    }
    if (data.targetUserId && Types.ObjectId.isValid(data.targetUserId)) {
      payload.targetUserId = new Types.ObjectId(data.targetUserId);
    }
    const created = await this.notificationModel.create(payload);
    try {
      this.eventsGateway.emitNotification(data.userId, {
        _id: created._id.toString(),
        userId: data.userId,
        message: data.message,
        type: data.type,
        readStatus: false,
        senderId: data.senderId ?? null,
        targetUserId: data.targetUserId ?? null,
        createdAt: (created as any).createdAt ?? new Date(),
      });
    } catch {
      // live push is best-effort
    }
    return created;
  }

  /** Fan-out notification to all users with the given roles (skips excludeUserId). */
  async notifyRoles(
    roles: AppRole[],
    data: {
      message: string;
      type: NotificationType;
      senderId?: string;
      targetUserId?: string;
      excludeUserId?: string;
    },
  ) {
    if (!roles.length) return [];
    const users = await this.userModel
      .find({ role: { $in: roles } })
      .select('_id')
      .lean();
    const exclude = data.excludeUserId?.toString();
    const results: Awaited<ReturnType<NotificationsService['create']>>[] = [];
    for (const u of users) {
      const id = u._id.toString();
      if (exclude && id === exclude) continue;
      results.push(
        await this.create({
          userId: id,
          message: data.message,
          type: data.type,
          senderId: data.senderId,
          targetUserId: data.targetUserId,
        }),
      );
    }
    return results;
  }

  private formatUserRef(raw: unknown) {
    if (!raw) return { id: null as string | null, user: null as { _id: string; name: string; email?: string } | null };
    if (typeof raw === 'object' && raw !== null && '_id' in raw) {
      const s = raw as { _id: Types.ObjectId; name?: string; email?: string };
      const id = s._id?.toString?.() ?? String(s._id);
      return {
        id,
        user: { _id: id, name: s.name || 'Unknown', email: s.email },
      };
    }
    return { id: String(raw), user: null };
  }

  private formatNotification(doc: Record<string, unknown>) {
    const sender = this.formatUserRef(doc.senderId);
    const target = this.formatUserRef(doc.targetUserId);
    return {
      ...doc,
      _id: (doc._id as Types.ObjectId)?.toString?.() ?? doc._id,
      userId: (doc.userId as Types.ObjectId)?.toString?.() ?? doc.userId,
      senderId: sender.id,
      sender: sender.user,
      targetUserId: target.id,
      targetUser: target.user,
    };
  }

  async findForUser(userId: string, requester: AuthUser) {
    if (!isAdmin(requester) && requester.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }
    const docs = await this.notificationModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate('senderId', 'name email')
      .populate('targetUserId', 'name email')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()
      .exec();
    return docs.map((d) =>
      this.formatNotification(d as unknown as Record<string, unknown>),
    );
  }

  async findUnreadByUser(userId: string) {
    return this.notificationModel
      .find({ userId: new Types.ObjectId(userId), readStatus: false })
      .sort({ createdAt: -1 })
      .exec();
  }

  async countUnread(userId: string) {
    return this.notificationModel.countDocuments({
      userId: new Types.ObjectId(userId),
      readStatus: false,
    });
  }

  async markRead(id: string, requester?: AuthUser) {
    const notification = await this.notificationModel.findById(id).exec();
    if (!notification) throw new NotFoundException('Notification not found');
    if (
      requester &&
      !isAdmin(requester) &&
      notification.userId.toString() !== requester.userId
    ) {
      throw new ForbiddenException('Access denied');
    }
    notification.readStatus = true;
    return notification.save();
  }

  /** Owner can delete their own notification (admin and employee use the same rule). */
  async remove(id: string, requester: AuthUser) {
    const notification = await this.notificationModel.findById(id).exec();
    if (!notification) throw new NotFoundException('Notification not found');
    if (notification.userId.toString() !== requester.userId) {
      throw new ForbiddenException('Access denied');
    }
    await notification.deleteOne();
    return { message: 'Notification deleted', id };
  }

  async removeMany(ids: string[], requester: AuthUser) {
    const uniqueIds = [...new Set(ids.filter((id) => Types.ObjectId.isValid(id)))];
    if (uniqueIds.length === 0) {
      return { message: 'No notifications deleted', deletedCount: 0 };
    }
    const result = await this.notificationModel.deleteMany({
      _id: { $in: uniqueIds.map((id) => new Types.ObjectId(id)) },
      userId: new Types.ObjectId(requester.userId),
    });
    return {
      message: 'Notifications deleted',
      deletedCount: result.deletedCount ?? 0,
    };
  }
}
