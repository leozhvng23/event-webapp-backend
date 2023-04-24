import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const region = "us-east-1";
const ddbClient = new DynamoDBClient({ region });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

const handler = async (event) => {
  console.log("Received event:", event);
  const { eid, uid } = event;

  if (!eid || !uid) {
    return {
      statusCode: 400,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({ message: "Invalid input data." }),
    };
  }

  const item = {
    eid,
    uid,
    invitationStatus: "PENDING",
  };

  try {
    await ddbDocClient.send(
      new PutCommand({
        TableName: "Eventful-User-Event",
        Item: item,
      })
    );

    const response = {
      statusCode: 201,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({ message: "Event created successfully." }),
    };

    return response;
  } catch (error) {
    console.error("Error creating invitation:", error);

    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({ message: "Error creating invitation." }),
    };
  }
};

export { handler };
