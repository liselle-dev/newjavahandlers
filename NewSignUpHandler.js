// SignUpHandler.js
import { CognitoIdentityProviderClient, SignUpCommand } from "@aws-sdk/client-cognito-identity-provider";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const REGION = process.env.REGION;
const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID;
const USERS_TABLE = process.env.USERS_TABLE;

const cognitoClient = new CognitoIdentityProviderClient({ region: REGION });
const ddbClient = new DynamoDBClient({ region: REGION });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { email, password, name } = body;
    const createdAt = new Date().toISOString();

    // Cognito Sign Up
    await cognitoClient.send(new SignUpCommand({
      ClientId: COGNITO_CLIENT_ID,
      Username: email,
      Password: password,
      UserAttributes: [{ Name: "email", Value: email }]
    }));

    // Save user in DynamoDB
    await ddbDocClient.send(new PutCommand({
      TableName: USERS_TABLE,
      Item: { userId: email, name, createdAt }
    }));

    return { statusCode: 201, body: JSON.stringify({ message: "User registration successful" }) };
  } catch (error) {
    console.error("SignUp error:", error);
    return { statusCode: 500, body: JSON.stringify({ message: "User registration failed", error: error.message }) };
  }
};