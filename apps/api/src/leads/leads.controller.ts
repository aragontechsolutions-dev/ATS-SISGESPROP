import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Public } from '../auth/public.decorator.ts';
import { CreateLeadDto } from './create-lead.dto.ts';
import { LeadsService } from './leads.service.ts';

@Controller('public/leads')
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  /** Formulario de diagnóstico: 5 envíos por minuto por IP, además de Turnstile. */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateLeadDto, @Req() req: Request): Promise<{ ok: true }> {
    return this.leads.create(dto, req.ip);
  }
}
