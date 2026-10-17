import { Router } from 'express';
import authRoutes from './auth.routes';
import projectRoutes from './project.routes';
import deploymentRoutes from './deployment.routes';
import commitRoutes from './commit.routes';
import incidentRoutes from './incident.routes';
import timelineRoutes from './timeline.routes';
import dashboardRoutes from './dashboard.routes';
import userRoutes from './user.routes';
import webhookRoutes from './webhook.routes';
import simulationRoutes from './simulation.routes';

const v1Router = Router();

v1Router.use('/auth', authRoutes);
v1Router.use('/projects', projectRoutes);
v1Router.use('/deployments', deploymentRoutes);
v1Router.use('/commits', commitRoutes);
v1Router.use('/incidents', incidentRoutes);
v1Router.use('/timeline', timelineRoutes);
v1Router.use('/dashboard', dashboardRoutes);
v1Router.use('/users', userRoutes);
v1Router.use('/webhooks', webhookRoutes);
v1Router.use('/demo', simulationRoutes);

export default v1Router;
