export const SOCKET_EVENTS = {
  // Client -> Server
  JOIN_PROJECT: 'project:join',
  LEAVE_PROJECT: 'project:leave',
  JOIN_INCIDENT: 'incident:join',
  LEAVE_INCIDENT: 'incident:leave',

  // Server -> Client
  TIMELINE_EVENT: 'timeline:event',
  INCIDENT_CREATED: 'incident:created',
  INCIDENT_UPDATED: 'incident:updated',
  INCIDENT_ASSIGNED: 'incident:assigned',
  INCIDENT_COMMENT_ADDED: 'incident:comment_added',
  DEPLOYMENT_RECORDED: 'deployment:recorded',
  DEPLOYMENT_ROLLBACK: 'deployment:rollback',
  NOTIFICATION_RECEIVED: 'notification:received',
} as const;
