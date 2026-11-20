import { IncidentRepository } from '../repositories/incident.repository';
import { IncidentDto, IncidentStatus, PaginationMeta } from '@pulsewatch/shared';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { UpdateIncidentInput } from '../validators/incident.validator';

export class IncidentService {
  constructor(private incidentRepo: IncidentRepository = new IncidentRepository()) {}

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
    status?: IncidentStatus
  ): Promise<{ data: IncidentDto[]; meta: PaginationMeta }> {
    const skip = (page - 1) * limit;

    const [total, incidents] = await Promise.all([
      this.incidentRepo.count(userId, status),
      this.incidentRepo.findMany(userId, skip, limit, status),
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
    const incident = await this.incidentRepo.findById(id);

    if (!incident) {
      throw new NotFoundError('Incident not found');
    }

    if (incident.monitor.userId !== userId) {
      throw new ForbiddenError('Access denied to this incident');
    }

    return this.formatIncident(incident);
  }

  async update(userId: string, id: string, dto: UpdateIncidentInput): Promise<IncidentDto> {
    await this.findOne(userId, id);
    const updated = await this.incidentRepo.update(id, dto);
    return this.formatIncident(updated);
  }
}
