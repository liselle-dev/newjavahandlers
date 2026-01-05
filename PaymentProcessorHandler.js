// handlers/PaymentProcessorHandler.js
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const REGION = process.env.REGION;
const TOLL_PASSES_TABLE = process.env.TOLL_PASSES_TABLE;
const PAYMENT_METHODS_TABLE = process.env.PAYMENT_METHODS_TABLE;
const NOTIFICATIONS_TABLE = process.env.NOTIFICATIONS_TABLE;
const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN;

const ddbClient = new DynamoDBClient({ region: REGION });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);
const snsClient = new SNSClient({ region: REGION });

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { vehicleId, amount, paymentToken } = body;
    const timestamp = new Date().toISOString();

    // 1️⃣ Get TollPass
    const tollPass = await ddbDocClient.send(new GetCommand({
      TableName: TOLL_PASSES_TABLE,
      Key: { vehicleId, timestamp: paymentToken }
    }));
    const expectedAmount = tollPass.Item?.amount || amount;

    if (amount !== expectedAmount) throw new Error("Payment amount does not match expected toll amount");

    // 2️⃣ Process Payment (placeholder)
    const transactionId = "TXN-" + Date.now();
    const paymentStatus = "Paid";

    // 3️⃣ Update TollPass Table
    await ddbDocClient.send(new UpdateCommand({
      TableName: TOLL_PASSES_TABLE,
      Key: { vehicleId, timestamp: paymentToken },
      UpdateExpression: "SET paymentStatus = :status, paymentTransactionId = :txn",
      ExpressionAttributeValues: { ":status": paymentStatus, ":txn": transactionId }
    }));

    // 4️⃣ Save payment to PAYMENT_METHODS_TABLE
    await ddbDocClient.send(new PutCommand({
      TableName: PAYMENT_METHODS_TABLE,
      Item: { vehicleId, timestamp, paymentStatus, amount, transactionId }
    }));

    // 5️⃣ Send SNS Notification
    const message = `Payment ${paymentStatus} for vehicle ${vehicleId}. Amount: $${amount}, Transaction ID: ${transactionId}`;
    await snsClient.send(new PublishCommand({ TopicArn: SNS_TOPIC_ARN, Message: message, Subject: "Payment Status" }));

    // 6️⃣ Log Notification
    await ddbDocClient.send(new PutCommand({
      TableName: NOTIFICATIONS_TABLE,
      Item: { userId: vehicleId, timestamp, type: "Payment", message }
    }));

    return { statusCode: 200, body: JSON.stringify({ message: "Payment processed successfully", transactionId }) };
  } catch (error) {
    console.error("PaymentProcessorHandler error:", error);
    return { statusCode: 500, body: JSON.stringify({ message: "Payment processing failed", error: error.message }) };
  }
};