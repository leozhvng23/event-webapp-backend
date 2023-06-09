import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

const region = "us-east-1";
const ddbClient = new DynamoDBClient({ region });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: { removeUndefinedValues: true },
});

const validateLocation = (location) => {
  if (!location || typeof location !== "object") {
    return false;
  }

  const { label, geometry } = location;

  if (!label || typeof label !== "string") {
    return false;
  }

  if (
    !geometry ||
    !geometry.point ||
    !Array.isArray(geometry.point) ||
    geometry.point.length !== 2
  ) {
    return false;
  }

  const [latitude, longitude] = geometry.point;

  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return false;
  }

  return true;
};

const validateEventInput = (attribute) => {
  const { key, value } = attribute;

  const attributeTypes = {
    uid: "string",
    name: "string",
    dateTime: "string",
    description: "string",
    detail: "string",
    capacity: "number",
    isPublic: "boolean",
    createdAt: "string",
    image: "string",
  };

  if (key === "location") {
    return validateLocation(value);
  }

  if (!value || typeof value !== attributeTypes[key]) {
    return false;
  }

  return true;
};

const handler = async (event) => {
  console.log("Received event:", event);

  const eventData = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
  const { id: uid } = event.pathParameters;
  const { eid } = event.pathParameters;

  // First, check if the event exists and belongs to the user
  const getParams = {
    TableName: "Eventful-Events",
    Key: { id: eid },
  };

  try {
    const eventData = await ddbDocClient.send(new GetCommand(getParams));
    if (!eventData.Item) {
      throw new Error("Event not found.");
    }

    if (eventData.Item.uid !== uid) {
      throw new Error("User does not have permission to edit the event.");
    }
  } catch (error) {
    console.error("Error:", error.message);

    const response = {
      statusCode: error.message === "Event not found." ? 404 : 403,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({ message: error.message }),
    };

    return response;
  }
  const {
    name,
    dateTime,
    description,
    detail,
    capacity,
    isPublic,
    createdAt,
    location,
    image,
  } = eventData;

  // Dynamic update parameters
  let updateExpression = "set";
  let expressionAttributeNames = {};
  let expressionAttributeValues = {};

  const attributesToUpdate = [
    { key: "name", value: name },
    { key: "dateTime", value: dateTime },
    { key: "description", value: description },
    { key: "detail", value: detail },
    { key: "capacity", value: capacity },
    { key: "isPublic", value: isPublic },
    { key: "createdAt", value: createdAt },
    { key: "location", value: location },
    { key: "image", value: image },
  ];

  for (const attribute of attributesToUpdate) {
    if (attribute.value !== undefined) {
      if (!validateEventInput(attribute)) {
        console.log(`Invalid input data for attribute: ${attribute.key}`);
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

      updateExpression += ` #${attribute.key} = :${attribute.key},`;
      expressionAttributeNames[`#${attribute.key}`] = attribute.key;
      expressionAttributeValues[`:${attribute.key}`] = attribute.value;
    }
  }

  // Remove trailing comma
  updateExpression = updateExpression.slice(0, -1);

  const params = {
    TableName: "Eventful-Events",
    Key: { id: eid },
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: "ALL_NEW",
  };

  try {
    await ddbDocClient.send(new UpdateCommand(params));
    console.log("Event updated successfully");

    const response = {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({ message: "Event updated successfully." }),
    };

    return response;
  } catch (error) {
    console.error("Error updating event:", error);

    const response = {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({ message: "Error updating event." }),
    };

    return response;
  }
};

export { handler };

// location:
// {
//   geometry: {
//     point:
//       [
//         -122.34014899999994, // Longitude point
//         47.61609000000004 // Latitude point
//       ],
//   },
//   addressNumber: "2131" // optional string for the address number alone
//   country: "USA" // optional Alpha-3 country code
//   label: "Amazon Go, 2131 7th Ave, Seattle, WA, 98121, USA" // Optional string
//   municipality: "Seattle" // Optional string
//   neighborhood: undefined // Optional string
//   postalCode: "98121" // Optional string
//   region: "Washington" // Optional string
//   street: "7th Ave" // Optional string
//   subRegion: "King County" // Optional string
// }
