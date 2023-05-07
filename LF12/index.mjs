import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const region = "us-east-1";
const ddbClient = new DynamoDBClient({ region });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

const handler = async (event) => {
  const { id, eid, uid, content } = event;

  if (
    !id ||
    typeof id !== "string" ||
    !eid ||
    typeof eid !== "string" ||
    !uid ||
    typeof uid !== "string" ||
    !content ||
    typeof content !== "string"
  ) {
    console.log("Invalid input data");
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

  const timestamp = new Date().toISOString();

  const params = {
    TableName: "Eventful-Comments",
    Item: {
      id,
      eid,
      uid,
      content,
      timestamp,
    },
  };

  try {
    await ddbDocClient.send(new PutCommand(params));
    console.log("Comment added successfully");

    const response = {
      statusCode: 201,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({ message: "Comment added successfully." }),
    };

    return response;
  } catch (error) {
    console.error("Error adding comment:", error);

    const response = {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({ message: "Error adding comment." }),
    };

    return response;
  }
};

export { handler };
