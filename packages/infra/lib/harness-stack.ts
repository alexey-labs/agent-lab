import { Platform } from "aws-cdk-lib/aws-ecr-assets";
import { ManagedPolicy, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Architecture, DockerImageCode, DockerImageFunction } from "aws-cdk-lib/aws-lambda";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as cdk from "aws-cdk-lib/core";
import { Construct } from "constructs";
import * as path from 'path';

interface HarnessProps extends cdk.StackProps {
  anthropicApi: string
}

export class HarnessStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: HarnessProps) {
    super(scope, id, props);

    const role = new Role(this, 'HarnessRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"),
      ],
    })

    const bucket = new s3.Bucket(this, 'HarnessTraces', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    })
    bucket.grantWrite(role)

    const dlq = new sqs.Queue(this, "HarnessDLQ", {
      retentionPeriod: cdk.Duration.days(4),
    });

    const queue = new sqs.Queue(this, "HarnessQueue", {
      visibilityTimeout: cdk.Duration.minutes(90), // about 6x the function timeout
      deadLetterQueue: { queue: dlq, maxReceiveCount: 2 },
    });

    const lambdaFn = new DockerImageFunction(this, 'HarnessFunction', {
      code: DockerImageCode.fromImageAsset(path.join(__dirname, "../../.."), {
        file: "packages/lambda/Dockerfile",
        platform: Platform.LINUX_ARM64,
      }),
      role,
      memorySize: 1024,
      timeout: cdk.Duration.minutes(15),
      environment: {
        TRACE_BUCKET: bucket.bucketName,
        ANTHROPIC_API_KEY: props.anthropicApi,
        HOME: "/tmp",
        TRACE_PATH: "/tmp/trace.jsonl"
      },
      architecture: Architecture.ARM_64,
    })

    lambdaFn.addEventSource(new SqsEventSource(queue, {
      batchSize: 1
    }))
  }
}
