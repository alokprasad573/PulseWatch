import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  Min,
} from 'class-validator';
import { MonitorMethod } from '@pulsewatch/shared';

export class CreateMonitorDto {
  @IsString()
  @IsNotEmpty({ message: 'Monitor name is required' })
  @Length(2, 100, { message: 'Name must be between 2 and 100 characters' })
  name!: string;

  @IsString()
  @IsNotEmpty({ message: 'URL is required' })
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { message: 'URL must be a valid HTTP or HTTPS address' },
  )
  url!: string;

  @IsOptional()
  @IsEnum(MonitorMethod, { message: 'Method must be either GET or HEAD' })
  method?: MonitorMethod = MonitorMethod.GET;

  @IsOptional()
  @IsInt()
  @Min(30, { message: 'Interval must be at least 30 seconds' })
  @Max(86400, { message: 'Interval cannot exceed 86400 seconds (24 hours)' })
  intervalSeconds?: number = 60;

  @IsOptional()
  @IsInt()
  @Min(1000, { message: 'Timeout must be at least 1000ms' })
  @Max(30000, { message: 'Timeout cannot exceed 30000ms' })
  timeoutMs?: number = 10000;

  @IsOptional()
  @IsInt()
  @Min(100, { message: 'Status code must be >= 100' })
  @Max(599, { message: 'Status code must be <= 599' })
  expectedStatusCode?: number = 200;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean = true;
}
