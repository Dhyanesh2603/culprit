import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { IncidentService } from '../services/incident.service';
import { DiscussionService } from '../services/discussion.service';
import { AuditService } from '../services/audit.service';
import { ApiResponse } from '../utils/apiResponse';

export class IncidentController {
  static async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { projectId } = req.params;
    const { status, severity, limit, skip } = req.query;

    const incidents = await IncidentService.listIncidents(projectId, {
      status: status as string,
      severity: severity as string,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      skip: skip ? parseInt(skip as string, 10) : undefined,
    });
    ApiResponse.success(res, incidents);
  }

  static async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const incident = await IncidentService.getIncident(id);
    if (!incident) {
      ApiResponse.notFound(res, 'Incident not found');
      return;
    }
    ApiResponse.success(res, incident);
  }

  static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    const result = await IncidentService.createIncident(req.body, {
      id: req.user?.id,
      email: req.user?.email,
      name: req.user?.name,
    });
    ApiResponse.created(res, result, 'Incident created and correlated');
  }

  static async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const updated = await IncidentService.updateIncident(id, req.body, {
        id: req.user?.id,
        email: req.user?.email,
        name: req.user?.name,
      });
      ApiResponse.success(res, updated, 'Incident updated successfully');
    } catch (err: any) {
      if (err.status === 409) {
        ApiResponse.conflict(res, err.message, { currentVersion: err.currentVersion });
        return;
      }
      if (err.status === 404) {
        ApiResponse.notFound(res, err.message);
        return;
      }
      throw err;
    }
  }

  static async assign(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { userIds } = req.body;
    const updated = await IncidentService.assignUsers(id, userIds, {
      id: req.user?.id,
      email: req.user?.email,
      name: req.user?.name,
    });
    ApiResponse.success(res, updated, 'Assigned engineers updated');
  }

  static async reanalyze(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { windowMinutes } = req.body || {};
    const result = await IncidentService.reanalyzeCorrelation(
      id,
      windowMinutes ? parseInt(windowMinutes, 10) : undefined
    );
    ApiResponse.success(res, result, 'Correlation recomputed');
  }

  static async addComment(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    if (!req.user) {
      ApiResponse.unauthorized(res);
      return;
    }

    const comment = await DiscussionService.addComment(id, req.body, {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
    });

    ApiResponse.created(res, comment, 'Comment added to incident');
  }

  static async getComments(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const comments = await DiscussionService.getComments(id);
    ApiResponse.success(res, comments);
  }

  static async getAudit(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const auditLogs = await AuditService.getEntityAudit('INCIDENT', id);
    ApiResponse.success(res, auditLogs);
  }

  /**
   * Export Incident Postmortem Report in Markdown format
   */
  static async exportPostmortem(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const incident = await IncidentService.getIncident(id);
    if (!incident) {
      ApiResponse.notFound(res, 'Incident not found');
      return;
    }

    const durationMins = incident.resolvedAt
      ? Math.round(
          (new Date(incident.resolvedAt).getTime() - new Date(incident.occurredAt).getTime()) /
            (60 * 1000)
        )
      : 'Ongoing';

    const assignees = incident.assignments.map((a) => `${a.user.name} (${a.user.email})`).join(', ') || 'Unassigned';

    const mdReport = `# Incident Postmortem: #${incident.incidentNumber} - ${incident.title}

**Project:** ${incident.project.name} (${incident.project.slug})  
**Severity:** ${incident.severity}  
**Status:** ${incident.status}  
**Occurred At:** ${new Date(incident.occurredAt).toUTCString()}  
**Resolved At:** ${incident.resolvedAt ? new Date(incident.resolvedAt).toUTCString() : 'Unresolved'}  
**Time to Resolve:** ${durationMins} minutes  
**Assigned Responders:** ${assignees}  

---

## 1. Executive Summary
${incident.description}

---

## 2. Who Broke The Build? (Relationship Correlation)
- **Suspected Deployment:** ${incident.suggestedDeployment ? `${incident.suggestedDeployment.version} (${incident.suggestedDeployment.commitHash})` : 'None identified'}
- **Suspected Commit:** ${incident.suggestedCommit ? `${incident.suggestedCommit.commitHash} by ${incident.suggestedCommit.authorName}` : 'None identified'}
- **Confidence Score:** ${(incident.confidenceScore ? incident.confidenceScore * 100 : 0).toFixed(0)}%
- **Correlation Rationale:** ${incident.correlationReason || 'No automated triggers recorded'}

---

## 3. Root Cause Analysis
${incident.rootCause || '_No root cause documented yet._'}

---

## 4. Resolution & Corrective Actions
${incident.resolution || '_No permanent resolution documented yet._'}

---

## 5. Investigation Timeline & Key Comments
${incident.comments.map((c) => `- **${new Date(c.createdAt).toISOString()}** [${c.user.name}]: ${c.content}`).join('\n')}

_Generated by Who Broke The Build on ${new Date().toUTCString()}_
`;

    if (req.query.format === 'raw') {
      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', `attachment; filename="incident-${incident.incidentNumber}-postmortem.md"`);
      res.send(mdReport);
      return;
    }

    ApiResponse.success(res, { markdown: mdReport, incident });
  }
}
