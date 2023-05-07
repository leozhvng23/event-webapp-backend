import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  BatchGetCommand,
} from "@aws-sdk/lib-dynamodb";

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

  try {
    const queryParams = {
      TableName: "Eventful-Comments",
      IndexName: "eid-timestamp-index",
      KeyConditionExpression: "eid = :eid",
      ExpressionAttributeValues: {
        ":eid": id,
      },
    };

    const commentsData = await ddbDocClient.send(new QueryCommand(queryParams));
    const userIds = [...new Set(commentsData.Items.map((comment) => comment.uid))];

    let usersData = { Responses: { "Eventful-Users": [] } };

    if (userIds.length > 0) {
      const batchGetParams = {
        RequestItems: {
          "Eventful-Users": {
            Keys: userIds.map((id) => ({ id })),
          },
        },
      };

      usersData = await ddbDocClient.send(new BatchGetCommand(batchGetParams));
    }
    const usersById = usersData.Responses["Eventful-Users"].reduce((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {});

    const commentsWithUserNames = commentsData.Items.map((comment) => {
      const user = usersById[comment.uid];
      return {
        id: comment.id,
        eid: comment.eid,
        uid: comment.uid,
        name: user ? user.name : "",
        content: comment.content,
        timestamp: comment.timestamp,
      };
    });

    const response = {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify(commentsWithUserNames),
    };

    return response;
  } catch (error) {
    console.error("Error fetching comments:", error);

    const response = {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({ message: "Error fetching comments." }),
    };

    return response;
  }
};

export { handler };
