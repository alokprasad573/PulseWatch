import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { prisma } from '@pulsewatch/database';
import { IncidentDto, IncidentStatus, PaginationMeta } from '@pulsewatch/shared';

@Injectable()
export class IncidentsService {
  private formatIncident(inc: any): IncidentDto {
    return {
      id: inc.id,
      monitorId: inc.monitorId,
      title: inc.title,
      description: inc.description,
      status: inc.status as IncidentStatus,
      startedAt: inc.startedAt.toISOString(),
      resolvedAt: inc.resolvedAt ? inc.resolvedAt.toISOString() : null,
      createdAt: inc.createdAt.toISOString(),
      updatedAt: inc.updatedAt.toISOString(),
      monitor: inc.monitor
        ? {
            id: inc.monitor.id,
            name: inc.monitor.name,
            url: inc.monitor.url,
          }
        : undefined,
      events: inc.events?.map((e: any) => ({
        id: e.id,
        incidentId: e.incidentId,
        eventType: e.eventType,
        message: e.message,
        metadata: e.metadata,
        createdAt: e.createdAt.toISOString(),
      })),
    };
  }

  async findAll(
    userId: string,
    page: number = 1,
    limit: number = 20,
    status?: IncidentStatus,
  ): Promise<{ data: IncidentDto[]; meta: PaginationMeta }> {
    const skip = (page - 1) * limit;

    const where: any = {
      monitor: {
        userId,
      },
      ...(status && { status }),
    };

    const [total, incidents] = await Promise.all([
      prisma.incident.count({ where }),
      prisma.incident.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startedAt: 'desc' },
        include: {
          monitor: {
            select: { id: true, name: true, url: true },
          },
          events: {
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
    ]);

    return {
      data: incidents.map((i) => this.formatIncident(i)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findOne(userId: string, id: string): Promise<IncidentDto> {
    const incident = await prisma.incident.findUnique({
      where: { id },
      include: {
        monitor: true,
        events: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!incident) {
      throw new NotFoundException('Incident not found');
    }

    if (incident.monitor.userId !== userId) {
      throw new ForbiddenException('Access denied to this incident');
    }

    return this.formatIncident(incident);
  }
}
