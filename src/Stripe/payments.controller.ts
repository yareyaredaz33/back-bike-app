import {
  Body,
  Controller,
  Post,
  RawBodyRequest,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../Auth/Guards/jwt.auth.guards';
import { Request, Response } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { RideEntity } from '../DB/Entities/ride.entity';
import { Repository } from 'typeorm';
import { Payment } from '../DB/Entities/Payment';

@Controller('payments')
export class PaymentsController {
  constructor(
    private paymentsService: PaymentsService,
    @InjectRepository(Payment)
    private paymentEntityRepository: Repository<Payment>,
  ) {}

  @Post('create-payment-intent')
  @UseGuards(JwtAuthGuard)
  async createPaymentIntent(
    @Body() body: { amount: number; rideId: string },
    @Req() req: Request,
  ) {
    const paymentIntent = await this.paymentsService.createPaymentIntent(
      body.amount,
      'uah',
      {
        // @ts-ignore
        userId: req.user.userInfo.id,
        rideId: body.rideId,
      },
    );
    return { clientSecret: paymentIntent.client_secret };
  }

  @Post('create-checkout-session')
  async createCheckoutSession(@Body() body: { priceId: string }, @Req() req) {
    const origin = req.headers.origin || 'http://localhost:3000';
    const session = await this.paymentsService.createCheckoutSession(
      body.priceId,
      `${origin}/payment/success`,
      `${origin}/payment/cancel`,
    );
    return { sessionId: session.id, url: session.url };
  }

  @Post('webhook')
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ) {

    if (req.body.data.object.metadata) {
      const stripePaymentId = req.body.id;

      // Перевірка чи існує вже такий платіж
      const existingPayment = await this.paymentEntityRepository.findOne({
        where: { stripePaymentId }
      });

      // Якщо платіж вже існує, не створюємо дублікат
      if (existingPayment) {
        return res.send({ received: true });
      }

      // Створення нового запису про платіж
      const payment = this.paymentEntityRepository.create({
        stripePaymentId: stripePaymentId,
        amount: req.body.data.object.amount,
        currency: req.body.data.object.currency,
        status: req.body.data.object.status,
        user_id: req.body.data.object.metadata.userId,
        ride_id: req.body.data.object.metadata.rideId,
      });

      await this.paymentEntityRepository.save(payment);
      return res.send({ received: true });
    }

    return res.send({ received: true });
  }
}
