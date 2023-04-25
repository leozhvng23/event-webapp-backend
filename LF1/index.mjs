import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

const region = "us-east-1";
const ddbClient = new DynamoDBClient({ region });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Credentials": true,
};

const handler = async (event) => {
  console.log("Received event:", JSON.stringify(event, null, 2));
  const { id } = event.pathParameters;

  if (!id || typeof id !== "string") {
    const response = {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Invalid input data." }),
    };

    return response;
  }

  try {
    const eventParams = {
      TableName: "Eventful-Events",
      Key: {
        id: id,
      },
    };

    const eventData = await ddbDocClient.send(new GetCommand(eventParams));

    if (!eventData.Item) {
      const response = {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ message: "Event not found." }),
      };

      return response;
    }

    const userParams = {
      TableName: "Eventful-Users",
      Key: {
        id: eventData.Item.uid,
      },
    };

    const userData = await ddbDocClient.send(new GetCommand(userParams));

    if (!userData.Item) {
      const response = {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ message: "Host not found." }),
      };
      return response;
    }

    // add host name to event data
    eventData.Item.hostName = userData.Item.name;

    const response = {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(eventData.Item),
    };

    return response;
  } catch (error) {
    console.error("Error fetching event:", error);

    const response = {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Error fetching event." }),
    };

    return response;
  }
};

export { handler };
