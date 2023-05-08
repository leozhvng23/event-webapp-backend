import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  UpdateCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  CognitoIdentityProviderClient,
  AdminUpdateUserAttributesCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const region = "us-east-1";
const ddbClient = new DynamoDBClient({ region });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);
const cognitoClient = new CognitoIdentityProviderClient({ region });

const USER_POOL_ID = "us-east-1_TMehXsZZF";

const handler = async (event) => {
  const { id: username } = event.pathParameters;
  const { name, bio } = JSON.parse(event.body);

  try {
    // Update name attribute in Cognito User Pool
    const updateUserAttributesParams = {
      UserPoolId: USER_POOL_ID,
      Username: username,
      UserAttributes: [
        {
          Name: "name",
          Value: name,
        },
      ],
    };

    await cognitoClient.send(
      new AdminUpdateUserAttributesCommand(updateUserAttributesParams)
    );

    // Query the DynamoDB table to get the primary key for the item
    const queryDynamoDBParams = {
      TableName: "Eventful-Users",
      IndexName: "username-index",
      KeyConditionExpression: "username = :username",
      ExpressionAttributeValues: {
        ":username": username,
      },
    };

    const queryResult = await ddbDocClient.send(new QueryCommand(queryDynamoDBParams));
    const primaryKey = queryResult.Items[0].id;

    // Update name and bio attributes in DynamoDB
    const updateDynamoDBParams = {
      TableName: "Eventful-Users",
      Key: { id: primaryKey },
      UpdateExpression: "SET #name = :name, bio = :bio",
      ExpressionAttributeNames: {
        "#name": "name", // 'name' is a reserved keyword in DynamoDB
      },
      ExpressionAttributeValues: {
        ":name": name,
        ":bio": bio,
      },
    };

    await ddbDocClient.send(new UpdateCommand(updateDynamoDBParams));

    const response = {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({ message: "User attributes updated successfully." }),
    };

    return response;
  } catch (error) {
    console.error("Error updating user attributes:", error);

    const response = {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({ message: error.message }),
    };

    return response;
  }
};

export { handler };
