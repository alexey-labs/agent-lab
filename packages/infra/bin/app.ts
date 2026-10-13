#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { Tags } from 'aws-cdk-lib/core';
import { HarnessStack } from '../lib/harness-stack';
import { PipelineStack } from '../lib/pipeline-stack';
import { GuardrailsStack } from '../lib/guardrails-stack';
import { SecretsStack } from '../lib/secrets-stack';

const app = new cdk.App();

new SecretsStack(app, 'SecretsStack')
new GuardrailsStack(app, 'GuardrailsStack')
new HarnessStack(app, 'HarnessStack');
new PipelineStack(app, 'PipelineStack')

Tags.of(app).add('project', 'agent-lab');
