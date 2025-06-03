import { ConfigModule } from '@nestjs/config';
import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from '../DB/Entities/Payment';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      Payment
    ]),
  ],
  providers: [PaymentsService],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
