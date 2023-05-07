import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const region = "us-east-1";
const ddbClient = new DynamoDBClient({ region });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

const handler = async (event) => {
  console.log(event);
  const { id } = event.pathParameters;
  const page = parseInt(event.queryStringParameters.page) || 1;
  const limit = parseInt(event.queryStringParameters.limit) || 10;

  const params = {
    TableName: "Eventful-Events",
    IndexName: "uid",
    KeyConditionExpression: "uid = :uid",
    ExpressionAttributeValues: {
      ":uid": id,
    },
    Limit: limit,
  };

  // Calculate ExclusiveStartKey for pagination
  if (page > 1) {
    const startKeyIndex = (page - 1) * limit - 1;
    const startKey = await getStartKey(id, startKeyIndex);
    if (startKey) {
      params.ExclusiveStartKey = startKey;
    }
  }

  try {
    const data = await ddbDocClient.send(new QueryCommand(params));

    const response = {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify(data.Items),
    };

    return response;
  } catch (error) {
    console.error("Error fetching events:", error);

    const response = {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({ message: "Error fetching events." }),
    };

    return response;
  }
};

const getStartKey = async (uid, index) => {
  const params = {
    TableName: "Eventful-Events",
    IndexName: "uid",
    KeyConditionExpression: "uid = :uid",
    ExpressionAttributeValues: {
      ":uid": uid,
    },
    Limit: index + 1,
  };

  try {
    const data = await ddbDocClient.send(new QueryCommand(params));
    return data.Items[index]
      ? { uid: data.Items[index].uid, id: data.Items[index].id }
      : null;
  } catch (error) {
    console.error("Error getting start key:", error);
    return null;
  }
};

export { handler };
