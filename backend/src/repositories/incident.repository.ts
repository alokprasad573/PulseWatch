import { prisma } from '@pulsewatch/database';
import { IncidentStatus } from '@pulsewatch/shared';
import { UpdateIncidentInput } from '../validators/incident.validator';

export class IncidentRepository {
  async count(userId: string, status?: IncidentStatus) {
    const where: any = {
      monitor: { userId },
      ...(status && { status }),
    };
    return prisma.incident.count({ where });
  }

  async findMany(userId: string, skip: number, take: number, status?: IncidentStatus) {
    const where: any = {
      monitor: { userId },
      ...(status && { status }),
    };

    return prisma.incident.findMany({
      where,
      skip,
      take,
      orderBy: { startedAt: 'desc' },
      include: {
        monitor: {
          select: { id: true, name: true, url: true },
        },
        events: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async findById(id: string) {
    return prisma.incident.findUnique({
      where: { id },
      include: {
        monitor: true,
        events: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async update(id: string, data: UpdateIncidentInput) {
    return prisma.incident.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description && { description: data.description }),
        ...(data.status && { status: data.status as any }),
      },
      include: {
        monitor: true,
        events: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }
}
