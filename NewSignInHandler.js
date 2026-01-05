// handlers/SignInHandler.js
import { CognitoIdentityProviderClient, AdminInitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider";

const REGION = process.env.REGION;
const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID;
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;

const cognitoClient = new CognitoIdentityProviderClient({ region: REGION });

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { email, password } = body;

    const command = new AdminInitiateAuthCommand({
      UserPoolId: COGNITO_USER_POOL_ID,
      ClientId: COGNITO_CLIENT_ID,
      AuthFlow: "ADMIN_NO_SRP_AUTH",
      AuthParameters: { USERNAME: email, PASSWORD: password }
    });

    const authResult = await cognitoClient.send(command);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Sign-in successful",
        idToken: authResult.AuthenticationResult.IdToken,
        accessToken: authResult.AuthenticationResult.AccessToken,
        refreshToken: authResult.AuthenticationResult.RefreshToken,
        expiresIn: authResult.AuthenticationResult.ExpiresIn
      })
    };
  } catch (error) {
    console.error("SignInHandler error:", error);
    return { statusCode: 401, body: JSON.stringify({ message: "Invalid credentials", error: error.message }) };
  }
};