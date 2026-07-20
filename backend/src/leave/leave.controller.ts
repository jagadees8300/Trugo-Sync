import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LeaveService } from './leave.service';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { UpdateLeaveBalanceDto } from './dto/update-leave-balance.dto';
import { DecideLeaveDto } from './dto/decide-leave.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import type { AuthUser } from '../auth/auth-user';

@ApiTags('leaves')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('leaves')
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Post()
  @ApiOperation({ summary: 'Create leave request' })
  create(@Body() dto: CreateLeaveDto, @Request() req: { user: AuthUser }) {
    return this.leaveService.create(dto, req.user);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get my leave requests' })
  findMine(@Request() req: { user: AuthUser }) {
    return this.leaveService.findMine(req.user.userId);
  }

  @Get('me/summary')
  @ApiOperation({ summary: 'Get my leave summary' })
  getMySummary(@Request() req: { user: AuthUser }) {
    return this.leaveService.getMySummary(req.user.userId);
  }

  @Get('me/calendar')
  @ApiOperation({ summary: 'Get my approved leave dates' })
  getMyCalendar(@Request() req: { user: AuthUser }) {
    return this.leaveService.getMyCalendar(req.user.userId);
  }

  @Get('balances/me')
  @ApiOperation({ summary: 'Get my leave balances' })
  getMyBalances(
    @Request() req: { user: AuthUser },
    @Query('year') year?: string,
  ) {
    return this.leaveService.getBalances(
      req.user.userId,
      year ? Number(year) : undefined,
    );
  }

  @Get('balances/:userId')
  @Roles('ADMIN', 'HR')
  @ApiOperation({ summary: 'Get leave balances for a user (HR)' })
  getUserBalances(
    @Param('userId') userId: string,
    @Query('year') year?: string,
  ) {
    return this.leaveService.getBalances(userId, year ? Number(year) : undefined);
  }

  @Patch('balances/:userId')
  @Roles('ADMIN', 'HR')
  @ApiOperation({ summary: 'Update leave allocation for a user (HR)' })
  updateBalance(
    @Param('userId') userId: string,
    @Body() dto: UpdateLeaveBalanceDto,
    @Query('year') year?: string,
  ) {
    return this.leaveService.updateBalance(
      userId,
      dto,
      year ? Number(year) : undefined,
    );
  }

  @Get('holidays')
  @ApiOperation({ summary: 'List holidays for a year' })
  listHolidays(@Query('year') year?: string) {
    return this.leaveService.listHolidays(year ? Number(year) : undefined);
  }

  @Post('holidays')
  @Roles('ADMIN', 'HR')
  @ApiOperation({ summary: 'Create holiday (HR)' })
  createHoliday(@Body() dto: CreateHolidayDto) {
    return this.leaveService.createHoliday(dto);
  }

  @Delete('holidays/:id')
  @Roles('ADMIN', 'HR')
  @ApiOperation({ summary: 'Delete holiday (HR)' })
  deleteHoliday(@Param('id') id: string) {
    return this.leaveService.deleteHoliday(id);
  }

  @Get()
  @Roles('ADMIN', 'HR')
  @ApiOperation({ summary: 'Get all leave requests (admin/HR)' })
  findAll() {
    return this.leaveService.findAll();
  }

  @Get('pending')
  @Roles('ADMIN', 'HR')
  @ApiOperation({ summary: 'Get pending leave requests (admin/HR)' })
  findPending() {
    return this.leaveService.findPending();
  }

  @Get('dashboard')
  @Roles('ADMIN', 'HR')
  @ApiOperation({ summary: 'Leave dashboard summary (admin/HR)' })
  getDashboard() {
    return this.leaveService.getDashboard();
  }

  @Get('attendance/:date')
  @Roles('ADMIN', 'HR')
  @ApiOperation({
    summary: 'Daily attendance: present vs on leave by date (admin/HR)',
  })
  getAttendanceByDate(@Param('date') date: string) {
    return this.leaveService.getAttendanceByDate(date);
  }

  @Get('date/:date')
  @Roles('ADMIN', 'HR')
  @ApiOperation({ summary: 'Employees on leave by date (admin/HR)' })
  getByDate(@Param('date') date: string) {
    return this.leaveService.getByDate(date);
  }

  @Get('employee/:employeeId')
  @ApiOperation({ summary: 'Employee leave history' })
  getEmployeeHistory(
    @Param('employeeId') employeeId: string,
    @Request() req: { user: AuthUser },
  ) {
    return this.leaveService.getEmployeeHistory(employeeId, req.user);
  }

  @Patch(':id/approve')
  @Roles('ADMIN', 'HR')
  @ApiOperation({ summary: 'Approve leave request (admin/HR)' })
  approve(
    @Param('id') id: string,
    @Body() dto: DecideLeaveDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.leaveService.approve(id, dto.reason, req.user);
  }

  @Patch(':id/reject')
  @Roles('ADMIN', 'HR')
  @ApiOperation({ summary: 'Reject leave request (admin/HR)' })
  reject(
    @Param('id') id: string,
    @Body() dto: DecideLeaveDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.leaveService.reject(id, dto.reason, req.user);
  }
}
