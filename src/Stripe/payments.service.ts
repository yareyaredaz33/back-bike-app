import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(private configService: ConfigService) {
    this.stripe = new Stripe(this.configService.get('STRIPE_SECRET_KEY'), {});
  }

  async createPaymentIntent(
    amount: number,
    currency: string = 'uah',
    metadata: any,
  ) {
    return this.stripe.paymentIntents.create({
      amount, // в найменших одиницях валюти (копійки для UAH)
      currency,
      metadata
    });
  }

  async createCheckoutSession(
    priceId: string,
    successUrl: string,
    cancelUrl: string,
  ) {
    return this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
  }

  // Додаткові методи для роботи з webhook подіями, підписками і т.д.
}
