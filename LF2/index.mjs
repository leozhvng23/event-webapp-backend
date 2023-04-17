import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const region = "us-east-1";
const ddbClient = new DynamoDBClient({ region });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

const validateEventInput = (
  id,
  uid,
  name,
  dateTime,
  description,
  capacity,
  isPublic,
  createdAt,
  image
) => {
  if (
    !id ||
    typeof id !== "string" ||
    !uid ||
    typeof uid !== "string" ||
    !name ||
    typeof name !== "string" ||
    !dateTime ||
    typeof dateTime !== "string" ||
    !description ||
    typeof description !== "string" ||
    typeof capacity !== "number" ||
    typeof isPublic !== "boolean" ||
    !createdAt ||
    typeof createdAt !== "string" ||
    !image ||
    typeof image !== "string"
  ) {
    return false;
  }

  return true;
};

const handler = async (event) => {
  console.log("Received event:", event);

  const { id, uid, name, dateTime, description, capacity, isPublic, createdAt, image } =
    event;

  if (
    !validateEventInput(
      id,
      uid,
      name,
      dateTime,
      description,
      capacity,
      isPublic,
      createdAt,
      image
    )
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

  const params = {
    TableName: "Eventful-Events",
    Item: {
      id,
      uid,
      name,
      dateTime,
      description,
      capacity,
      isPublic,
      createdAt,
      image,
    },
  };

  try {
    await ddbDocClient.send(new PutCommand(params));
    console.log("Event created successfully");

    const response = {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({ message: "Event created successfully." }),
    };

    return response;
  } catch (error) {
    console.error("Error creating event:", error);

    const response = {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({ message: "Error creating event." }),
    };

    return response;
  }
};

export { handler };
