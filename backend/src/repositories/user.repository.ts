import { prisma } from '../prisma/client';
import { UserRole } from '../config/constants';

export class UserRepository {
  static async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        projectMembers: {
          include: { project: true },
        },
      },
    });
  }

  static async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  static async findByFirebaseUid(firebaseUid: string) {
    return prisma.user.findUnique({
      where: { firebaseUid },
    });
  }

  static async listAll() {
    return prisma.user.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { assignments: true, createdIncidents: true },
        },
      },
    });
  }

  static async upsertFirebaseUser(data: {
    email: string;
    name: string;
    firebaseUid: string;
    avatarUrl?: string;
    role?: UserRole;
  }) {
    const existingByUid = await prisma.user.findUnique({
      where: { firebaseUid: data.firebaseUid },
    });
    if (existingByUid) {
      return prisma.user.update({
        where: { id: existingByUid.id },
        data: {
          name: data.name,
          avatarUrl: data.avatarUrl || existingByUid.avatarUrl,
          ...(data.role ? { role: data.role } : {}),
        },
      });
    }

    const existingByEmail = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existingByEmail) {
      return prisma.user.update({
        where: { id: existingByEmail.id },
        data: {
          firebaseUid: data.firebaseUid,
          name: data.name,
          avatarUrl: data.avatarUrl || existingByEmail.avatarUrl,
          ...(data.role ? { role: data.role } : {}),
        },
      });
    }

    return prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        firebaseUid: data.firebaseUid,
        avatarUrl: data.avatarUrl,
        role: data.role || UserRole.DEVELOPER,
      },
    });
  }

  static async updateRole(id: string, role: UserRole) {
    return prisma.user.update({
      where: { id },
      data: { role },
    });
  }
}
