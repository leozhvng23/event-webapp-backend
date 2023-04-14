import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

const region = "us-east-1";
const ddbClient = new DynamoDBClient({ region });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

const handler = async (event) => {
  console.log(event);
  const { id } = event.pathParameters;

  if (!id || typeof id !== "string") {
    const response = {
      statusCode: 400,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({ message: "Invalid id format/type." }),
    };

    return response;
  }

  const params = {
    TableName: "Eventful-Users",
    Key: {
      id,
    },
  };

  try {
    const result = await ddbDocClient.send(new GetCommand(params));

    if (!result.Item) {
      const response = {
        statusCode: 404,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Credentials": true,
        },
        body: JSON.stringify({ message: "User not found." }),
      };

      return response;
    }

    const response = {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify(result.Item),
    };

    return response;
  } catch (error) {
    console.error("Error fetching user:", error);

    const response = {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({ message: "Error fetching user." }),
    };

    return response;
  }
};

export { handler };
