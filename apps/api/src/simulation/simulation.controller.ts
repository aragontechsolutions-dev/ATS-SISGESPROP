import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Public } from '../auth/public.decorator.ts';
import { SimulateDto } from './simulate.dto.ts';
import { SimulationService, type SimulationResponse } from './simulation.service.ts';

@Controller('public/simulations')
export class SimulationController {
  constructor(private readonly simulations: SimulationService) {}

  /** Límite anti-abuso específico: 10 simulaciones por minuto por IP. */
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post()
  @HttpCode(200)
  simulate(@Body() dto: SimulateDto, @Req() req: Request): Promise<SimulationResponse> {
    return this.simulations.simulate(dto, req.ip);
  }
}
