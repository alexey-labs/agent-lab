import * as sns from "aws-cdk-lib/aws-sns";
import * as subs from "aws-cdk-lib/aws-sns-subscriptions";
import * as cdk from "aws-cdk-lib/core";
import * as budgets from "aws-cdk-lib/aws-budgets";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

export class GuardrailsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // SNS
    const emailAddress = new cdk.CfnParameter(this, "email-param");
    const smsNumber = new cdk.CfnParameter(this, "sms-param");

    const topic = new sns.Topic(this, "Topic", {
      displayName: "Agent Harness Usage",
    });
    topic.addSubscription(new subs.SmsSubscription(smsNumber.valueAsString));
    topic.addSubscription(new subs.EmailSubscription(emailAddress.valueAsString));

    // Budgets
    const budget = new budgets.CfnBudget(this, "Budget", {
      budget: {
        budgetName: "agent-guardrails",
        budgetLimit: { amount: 25, unit: "USD" },
        budgetType: "COST",
        costFilters: {
          TagKeyValue: ["user:project$agent-lab"],
        },
        timeUnit: "MONTHLY",
        timePeriod: {
          start: "2026-10-13T07:00:00-07:00",
          end: "2027-01-01T07:00:00-07:00",
        },
        // "FilterExpression": Expression,
        // "Metrics": [String, ... ],
      },
      notificationsWithSubscribers: [10, 40, 70, 90].map(value => {
        return {
          notification: {
            comparisonOperator: "GREATER_THAN",
            notificationType: "ACTUAL",
            threshold: value,
            thresholdType: "PERCENTAGE",
          },
          subscribers: [
            {
              address: topic.topicArn,
              subscriptionType: "SNS",
            },
          ],
        };
      }),
    });

    topic.grants.publish(
      new iam.ServicePrincipal("budgets.amazonaws.com", {
        conditions: {
          StringEquals: { "aws:SourceAccount": this.account },
          ArnLike: {
            "aws:SourceArn": `arn:aws:budgets::${this.account}:budget/agent-guardrails`,
          },
        },
      })
    );

    new cdk.CfnOutput(this, "buget-output", { value: budget.ref });
  }
}
