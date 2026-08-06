import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SafeUser } from '../auth/decorators/current-user.decorator';
import { AccessControlService } from '../rbac/access-control.service';

@Injectable()
export class DisposalService {
  constructor(private readonly prisma: PrismaService, private readonly access: AccessControlService) {}

  async findAll(user: SafeUser) {
    const orgIds = await this.access.getAccessibleOrganizationIds(user.id);
    const storeIds = await this.access.getAccessibleStoreIds(user.id);
    return this.prisma.disposalRecord.findMany({
      where: orgIds === 'ALL' ? {} : {
        OR: [{ storeId: { in: [...storeIds] } }, { store: { organizationId: { in: [...orgIds] } } }],
      },
      include: { asset: { include: { item: true } }, store: true, disposedBy: true, request: true },
      orderBy: { disposedAt: 'desc' },
    });
  }

  async getCertificate(id: string, user: SafeUser): Promise<{ filename: string; buffer: Buffer }> {
    const record = await this.prisma.disposalRecord.findUnique({
      where: { id }, include: { asset: { include: { item: true } }, store: true, disposedBy: true, request: { include: { requester: true } } },
    });
    if (!record) throw new NotFoundException(`Disposal record ${id} not found`);
    const allowed = await this.access.hasScopeAccess(user.id, {
      type: 'STORE', storeId: record.storeId, storeOrganizationId: record.store.organizationId,
    });
    if (!allowed) throw new ForbiddenException('You do not have access to this disposal record');
    const lines = [
      'ARBA MINCH UNIVERSITY',
      'ASSET DISPOSAL CERTIFICATE',
      '',
      `Certificate: ${record.certificateNumber}`,
      `Asset tag: ${record.asset.assetTag}`,
      `Item: ${record.asset.item.name}`,
      `Serial number: ${record.asset.serialNumber ?? 'N/A'}`,
      `Store: ${record.store.name}`,
      `Reason: ${record.reason}`,
      `Method: ${record.method}`,
      `Inspection: ${record.inspectionNotes ?? 'N/A'}`,
      `Disposed at: ${record.disposedAt.toISOString()}`,
      `Authorized by: ${record.disposedBy.fullName}`,
      `Requested by: ${record.request.requester.fullName}`,
      '',
      'This system-generated certificate is backed by the approval and inventory audit records.',
    ];
    return { filename: `${record.certificateNumber}.pdf`, buffer: this.createSimplePdf(lines) };
  }

  /** Produces a small standards-compliant one-page PDF without a heavyweight rendering dependency. */
  private createSimplePdf(lines: string[]): Buffer {
    const escape = (value: string) => value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    const text = lines.map((line, index) => `${index === 0 ? 'BT /F1 14 Tf 72 760 Td' : '0 -24 Td'} (${escape(line)}) Tj`).join('\n') + '\nET';
    const objects = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
      `<< /Length ${Buffer.byteLength(text)} >>\nstream\n${text}endstream`,
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    ];
    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    objects.forEach((object, index) => {
      offsets.push(Buffer.byteLength(pdf));
      pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });
    const xref = Buffer.byteLength(pdf);
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return Buffer.from(pdf);
  }
}
