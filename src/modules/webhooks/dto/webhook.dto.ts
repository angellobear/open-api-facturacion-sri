import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsUrl,
  IsNumber,
  Min,
  Max,
  ArrayNotEmpty,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { URL } from 'url';
import { isIP } from 'net';

export const WEBHOOK_EVENTS = [
  'comprobante.creado',
  'comprobante.autorizado',
  'comprobante.rechazado',
  'comprobante.anulado',
  'comprobante.enviado',
  'certificado.por_vencer',
  'certificado.vencido',
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

function IsPublicUrl(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isPublicUrl',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: string) {
          try {
            const parsed = new URL(value);
            const host = parsed.hostname.toLowerCase();
            if (host === 'localhost' || host === '0.0.0.0') return false;
            if (isIP(host)) {
              const parts = host.split('.');
              if (parts[0] === '10') return false;
              if (parts[0] === '127') return false;
              if (parts[0] === '169' && parts[1] === '254') return false;
              if (
                parts[0] === '172' &&
                parseInt(parts[1]) >= 16 &&
                parseInt(parts[1]) <= 31
              )
                return false;
              if (parts[0] === '192' && parts[1] === '168') return false;
            }
            return host !== '0.0.0.0';
          } catch {
            return false;
          }
        },
        defaultMessage: (args: ValidationArguments) =>
          `La URL "${args.value}" no es una URL pública válida. No se permiten direcciones de red interna.`,
      },
    });
  };
}

export class CreateWebhookDto {
  @ApiProperty({ description: 'Nombre identificador del webhook' })
  @IsString()
  nombre: string;

  @ApiProperty({ description: 'URL a la que se enviarán las notificaciones' })
  @IsUrl()
  @IsPublicUrl()
  url: string;

  @ApiProperty({
    description: 'Eventos a los que se suscribe',
    example: ['comprobante.autorizado', 'comprobante.rechazado'],
    enum: WEBHOOK_EVENTS,
    isArray: true,
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  eventos: WebhookEvent[];

  @ApiPropertyOptional({
    description: 'ID del emisor (opcional, para filtrar por emisor)',
  })
  @IsOptional()
  @IsString()
  emisorId?: string;

  @ApiPropertyOptional({
    description: 'Número máximo de reintentos',
    default: 3,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  reintentosMax?: number;
}

export class UpdateWebhookDto {
  @ApiPropertyOptional({ description: 'Nombre identificador del webhook' })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional({
    description: 'URL a la que se enviarán las notificaciones',
  })
  @IsOptional()
  @IsUrl()
  @IsPublicUrl()
  url?: string;

  @ApiPropertyOptional({
    description: 'Eventos a los que se suscribe',
    enum: WEBHOOK_EVENTS,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  eventos?: WebhookEvent[];

  @ApiPropertyOptional({ description: 'Activar/desactivar webhook' })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional({ description: 'Número máximo de reintentos' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  reintentosMax?: number;
}

export class WebhookResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  nombre: string;

  @ApiProperty()
  url: string;

  @ApiProperty({ type: [String] })
  eventos: string[];

  @ApiPropertyOptional()
  emisorId?: string;

  @ApiPropertyOptional()
  tenantId?: string;

  @ApiPropertyOptional({
    description:
      'Enmascarado en consultas, visible completo solo al crear o regenerar',
  })
  secreto?: string;

  @ApiProperty()
  activo: boolean;

  @ApiProperty()
  reintentosMax: number;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class WebhookCreatedResponseDto extends WebhookResponseDto {
  @ApiProperty()
  declare secreto: string;
}

export class WebhookLogResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  evento: string;

  @ApiProperty()
  payload: any;

  @ApiPropertyOptional()
  statusCode?: number;

  @ApiPropertyOptional()
  respuesta?: string;

  @ApiProperty()
  intento: number;

  @ApiProperty()
  exitoso: boolean;

  @ApiPropertyOptional()
  error?: string;

  @ApiPropertyOptional()
  tiempoRespuestaMs?: number;

  @ApiProperty()
  createdAt: string;
}
