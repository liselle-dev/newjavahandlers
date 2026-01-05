// handlers/EditProfileHandler.js
import { CognitoIdentityProviderClient, AdminUpdateUserAttributesCommand } from "@aws-sdk/client-cognito-identity-provider";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const REGION = process.env.REGION;
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const USERS_TABLE = process.env.USERS_TABLE;

const cognitoClient = new CognitoIdentityProviderClient({ region: REGION });
const ddbClient = new DynamoDBClient({ region: REGION });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { email, name } = body;

    // Update Cognito
    await cognitoClient.send(new AdminUpdateUserAttributesCommand({
      UserPoolId: COGNITO_USER_POOL_ID,
      Username: email,
      UserAttributes: [{ Name: "name", Value: name }]
    }));

    // Update DynamoDB
    await ddbDocClient.send(new UpdateCommand({
      TableName: USERS_TABLE,
      Key: { userId: email },
      UpdateExpression: "SET #n = :name",
      ExpressionAttributeNames: { "#n": "name" },
      ExpressionAttributeValues: { ":name": name }
    }));

    return { statusCode: 200, body: JSON.stringify({ message: "Profile updated successfully" }) };
  } catch (error) {
    console.error("EditProfileHandler error:", error);
    return { statusCode: 500, body: JSON.stringify({ message: "Profile update failed", error: error.message }) };
  }
};