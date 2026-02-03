import { Module } from '@nestjs/common';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { BullAdapter } from '@bull-board/api/bullAdapter';

@Module({
  imports: [
    BullBoardModule.forRoot({
      route: '/queues',
      adapter: ExpressAdapter,
    }),
  ],
})
export class BullBoardConfigModule {}
