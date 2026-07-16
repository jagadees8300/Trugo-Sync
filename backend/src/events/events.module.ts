import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { EventsGateway } from './events.gateway';

@Module({
  imports: [
    JwtModule.register({
      secret: 'super-secret',
    }),
  ],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class EventsModule {}
