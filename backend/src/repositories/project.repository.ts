import { prisma } from '../prisma/client';
import { CreateProjectDTO } from '../types/dtos';
import { UserRole } from '../config/constants';

export class ProjectRepository {
  static async findById(id: string) {
    return prisma.project.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: true,
          },
        },
        _count: {
          select: {
            deployments: true,
            incidents: true,
            commits: true,
          },
        },
      },
    });
  }

  static async findBySlug(slug: string) {
    return prisma.project.findUnique({
      where: { slug },
      include: {
        members: {
          include: { user: true },
        },
      },
    });
  }

  static async listAll() {
    return prisma.project.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        members: {
          include: { user: true },
        },
        _count: {
          select: {
            deployments: true,
            incidents: true,
            commits: true,
          },
        },
      },
    });
  }

  static async create(data: CreateProjectDTO, creatorUserId?: string) {
    return prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          name: data.name,
          slug: data.slug,
          description: data.description,
          repositoryUrl: data.repositoryUrl,
          defaultBranch: data.defaultBranch || 'main',
          environment: data.environment || 'production',
          correlationWindowMinutes: data.correlationWindowMinutes || 60,
        },
      });

      if (creatorUserId) {
        await tx.projectMember.create({
          data: {
            projectId: project.id,
            userId: creatorUserId,
            role: UserRole.ADMIN,
          },
        });
      }

      return project;
    });
  }

  static async update(id: string, data: Partial<CreateProjectDTO>) {
    return prisma.project.update({
      where: { id },
      data,
    });
  }

  static async delete(id: string) {
    return prisma.project.delete({
      where: { id },
    });
  }

  static async addMember(projectId: string, userId: string, role: UserRole = UserRole.DEVELOPER) {
    return prisma.projectMember.upsert({
      where: {
        projectId_userId: { projectId, userId },
      },
      update: { role },
      create: { projectId, userId, role },
    });
  }

  static async removeMember(projectId: string, userId: string) {
    return prisma.projectMember.delete({
      where: {
        projectId_userId: { projectId, userId },
      },
    });
  }
}
