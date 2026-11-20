import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  Min,
} from 'class-validator';
import { MonitorMethod } from '@pulsewatch/shared';

export class UpdateMonitorDto {
  @IsOptional()
  @IsString()
  @Length(2, 100, { message: 'Name must be between 2 and 100 characters' })
  name?: string;

  @IsOptional()
  @IsString()
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { message: 'URL must be a valid HTTP or HTTPS address' },
  )
  url?: string;

  @IsOptional()
  @IsEnum(MonitorMethod, { message: 'Method must be either GET or HEAD' })
  method?: MonitorMethod;

  @IsOptional()
  @IsInt()
  @Min(30, { message: 'Interval must be at least 30 seconds' })
  @Max(86400, { message: 'Interval cannot exceed 86400 seconds (24 hours)' })
  intervalSeconds?: number;

  @IsOptional()
  @IsInt()
  @Min(1000, { message: 'Timeout must be at least 1000ms' })
  @Max(30000, { message: 'Timeout cannot exceed 30000ms' })
  timeoutMs?: number;

  @IsOptional()
  @IsInt()
  @Min(100, { message: 'Status code must be >= 100' })
  @Max(599, { message: 'Status code must be <= 599' })
  expectedStatusCode?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
