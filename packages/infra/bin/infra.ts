#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { Tags } from 'aws-cdk-lib/core';
import { AgentStack } from '../lib/agent-stack';

const app = new cdk.App();
new AgentStack(app, 'AgentStack', {});

Tags.of(app).add('project', 'agent-lab');
