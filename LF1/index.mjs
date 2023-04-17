import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

const region = "us-east-1";
const ddbClient = new DynamoDBClient({ region });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

const handler = async (event) => {
  console.log("Received event:", JSON.stringify(event, null, 2));
  const { id } = event.pathParameters;

  if (!id || typeof id !== "string") {
    const response = {
      statusCode: 400,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({ message: "Invalid input data." }),
    };

    return response;
  }

  const params = {
    TableName: "Eventful-Events",
    Key: {
      id: id,
    },
  };

  try {
    const data = await ddbDocClient.send(new GetCommand(params));

    if (!data.Item) {
      const response = {
        statusCode: 404,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Credentials": true,
        },
        body: JSON.stringify({ message: "Event not found." }),
      };

      return response;
    }

    const response = {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify(data.Item),
    };

    return response;
  } catch (error) {
    console.error("Error fetching event:", error);

    const response = {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({ message: "Error fetching event." }),
    };

    return response;
  }
};

export { handler };
