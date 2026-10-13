#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { Tags } from 'aws-cdk-lib/core';
import { HarnessStack } from '../lib/harness-stack';
import { PipelineStack } from '../lib/pipeline-stack';
import { GuardrailsStack } from '../lib/guardrails-stack';

const app = new cdk.App();

new HarnessStack(app, 'HarnessStack');
new PipelineStack(app, 'PipelineStack')
new GuardrailsStack(app, 'GuardrailsStack')

Tags.of(app).add('project', 'agent-lab');
