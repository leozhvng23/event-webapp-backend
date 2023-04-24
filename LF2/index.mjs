import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const region = "us-east-1";
const ddbClient = new DynamoDBClient({ region });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

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

const validateEventInput = (
  id,
  uid,
  name,
  dateTime,
  description,
  detail,
  capacity,
  isPublic,
  createdAt,
  location,
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
    !detail ||
    typeof detail !== "string" ||
    typeof capacity !== "number" ||
    typeof isPublic !== "boolean" ||
    !createdAt ||
    typeof createdAt !== "string" ||
    !validateLocation(location) ||
    !image ||
    typeof image !== "string"
  ) {
    return false;
  }

  return true;
};

const handler = async (event) => {
  console.log("Received event:", event);

  const {
    id,
    uid,
    name,
    dateTime,
    description,
    detail,
    capacity,
    isPublic,
    createdAt,
    location,
    image,
  } = event;

  if (
    !validateEventInput(
      id,
      uid,
      name,
      dateTime,
      description,
      detail,
      capacity,
      isPublic,
      createdAt,
      location,
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
      detail,
      capacity,
      isPublic,
      createdAt,
      location,
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
//   postalCode: "98121n" // Optional string
//   street: "7th Ave" " // Optional string
//   region: "Washingto// Optional string
//   subRegion: "King County" // Optional string
// }
