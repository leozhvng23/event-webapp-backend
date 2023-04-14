import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const region = "us-east-1";
const ddbClient = new DynamoDBClient({ region });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

const validateInput = (id, name, username, email, bio) => {
  const emailRegex = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;

  if (
    !id ||
    typeof id !== "string" ||
    !name ||
    typeof name !== "string" ||
    !username ||
    typeof username !== "string" ||
    !email ||
    typeof email !== "string" ||
    !emailRegex.test(email) ||
    (bio !== undefined && typeof bio !== "string")
  ) {
    return false;
  }

  return true;
};

const handler = async (event) => {
  console.log(event);
  const { id, name, username, email, bio } = event;

  if (!validateInput(id, name, username, email, bio)) {
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
    TableName: "Eventful-Users",
    Item: {
      id,
      name,
      username,
      email,
      bio: bio || "",
    },
  };

  try {
    await ddbDocClient.send(new PutCommand(params));

    const response = {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({ message: "User created successfully." }),
    };

    return response;
  } catch (error) {
    console.error("Error creating user:", error);

    const response = {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({ message: "Error creating user." }),
    };

    return response;
  }
};

export { handler };
