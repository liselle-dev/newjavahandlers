// handlers/TollNotificationHandler.js
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const REGION = process.env.REGION;
const TOLL_PASSES_TABLE = process.env.TOLL_PASSES_TABLE;
const NOTIFICATIONS_TABLE = process.env.NOTIFICATIONS_TABLE;
const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN;

const ddbClient = new DynamoDBClient({ region: REGION });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);
const snsClient = new SNSClient({ region: REGION });

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { userId, vehicleId, tollId } = body;
    const timestamp = new Date().toISOString();

    // 1️⃣ Save TollPass
    await ddbDocClient.send(new PutCommand({
      TableName: TOLL_PASSES_TABLE,
      Item: { vehicleId, timestamp, userId, tollId, paymentStatus: "Pending" }
    }));

    // 2️⃣ Send SNS Notification
    const message = `You have passed toll ${tollId} at ${timestamp}`;
    await snsClient.send(new PublishCommand({ TopicArn: SNS_TOPIC_ARN, Message: message, Subject: "Toll Pass Alert" }));

    // 3️⃣ Log Notification
    await ddbDocClient.send(new PutCommand({
      TableName: NOTIFICATIONS_TABLE,
      Item: { userId, timestamp, type: "TollPass", message }
    }));

    return { statusCode: 200, body: JSON.stringify({ message: "Toll pass recorded and notification sent" }) };
  } catch (error) {
    console.error("TollNotificationHandler error:", error);
    return { statusCode: 500, body: JSON.stringify({ message: "Failed to record toll pass", error: error.message }) };
  }
};